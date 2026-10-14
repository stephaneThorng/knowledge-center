---
title: "Threads, pools et virtual threads"
aliases: [Threads Java, ExecutorService, Thread Pool, virtual threads, Loom, ForkJoinPool, CompletableFuture, programmation asynchrone]
tags: [java, jvm, threads, executor, loom, async, concurrence]
domaine: java
niveau: avance
statut: draft
cree: 2026-10-14
sources: [Java Concurrency in Practice, JEP 444, java.util.concurrent, Oracle Java Docs]
---

# Threads, pools et virtual threads

> [!abstract] Ancre
> Un thread coûte cher : **~1 Mo de pile** et un **thread du système d'exploitation** derrière. Un *pool* mutualise ce coût ; les **virtual threads** (Loom, Java 21) le font disparaître. Cette note couvre comment **créer**, **piloter** et **dimensionner** l'exécution concurrente.

---

## 🧒 Avant de commencer : de quoi on parle

> [!tip] En clair
> Imagine un **restaurant**.
>
> - Un **thread**, c'est un **serveur**. Il prend une commande, va en cuisine, revient servir. Un serveur = **un fil d'exécution**.
> - **Créer un thread**, c'est **embaucher quelqu'un** : il faut le recruter, le former, lui donner un casier. **C'est cher.**
> - Un **pool de threads**, c'est une **équipe permanente** : tu ne recrutes pas à chaque commande, tu **réutilises** les mêmes serveurs.
>
> 🔑 **Le principe du pool :** on ne crée pas un serveur par client — on a **N serveurs** qui traitent une **file de tickets**.

**Les mots à connaître pour cette note :**

| Mot technique | En clair |
|---|---|
| **thread** | un fil d'exécution (un « serveur ») |
| **pool** / `ExecutorService` | une **équipe de threads** réutilisables |
| **task** / `Runnable` / `Callable` | une **commande à traiter** |
| **`Future`** | un **ticket de retrait** : le résultat viendra plus tard |
| **`CompletableFuture`** | un ticket **chaînable** : « quand c'est prêt, fais ceci » |
| **virtual thread** | un thread **ultra-léger** (Java 21) — des millions possibles |
| **thread platform** | un thread « classique » = **un** thread d'OS |
| **backpressure** | refuser/ralentir quand la file déborde |

Voir aussi : [[java_memory_model]] (visibilité) et [[java_jmm_concurrency]] (verrous, atomics).

---

## Le coût d'un thread : pourquoi le pool existe

> [!tip] En clair
> **Ce que coûte un thread « classique » (platform thread) :**

| Coût | Ordre de grandeur |
|---|---|
| Mémoire de pile | **~512 Ko – 1 Mo** (réservé, même si non utilisée) |
| Création | **millisecondes** (parfois plus) |
| Coût côté OS | un **thread natif** par thread Java |
| **Changement de contexte** | microsecondes, mais **multiplié** par le nombre de threads |
| Limite pratique | **quelques milliers** — au-delà, la machine s'écroule |

> [!warning] Le calcul qui tue
> **10 000 threads × 1 Mo de pile = 10 Go de mémoire**, rien que pour les piles. Et avec 10 000 threads, le **planificateur de l'OS passe plus de temps à changer de thread qu'à exécuter du code**.
>
> 🎫 **L'image :** embaucher 10 000 serveurs pour 50 clients. Ils passent leur temps à se **croiser dans le couloir**, pas à servir.

**⇒ D'où le pool.** On crée **N** threads (souvent quelques dizaines à quelques centaines), et on leur **distribue** des tâches.

---

## `ExecutorService` : la bonne façon de créer des threads

> [!tip] En clair
> **Ne jamais faire `new Thread(...)` à la main dans du code applicatif.** On **délègue** à un `ExecutorService` : il gère la file, l'équipe, et l'arrêt propre.

```java
// ❌ À éviter dans une application
new Thread(() -> traiter(commande)).start();     // pas de limite, pas de suivi, pas d'arrêt

// ✅ Le bon modèle
ExecutorService equipe = Executors.newFixedThreadPool(8);
equipe.submit(() -> traiter(commande));
```

**Les fabriques standard — et ce qu'elles cachent :**

| Méthode | Ce qu'elle fait | ⚠️ Piège |
|---|---|---|
| `newFixedThreadPool(n)` | **n** threads fixes | file d'attente **non bornée** → mémoire ! |
| `newCachedThreadPool()` | crée à la demande, recycle après 60 s | **aucune borne haute** → explosion sous charge |
| `newSingleThreadExecutor()` | **1** thread | sérialise tout, file non bornée |
| `newScheduledThreadPool(n)` | tâches **différées / périodiques** | dérive si une tâche dépasse la période |
| `newVirtualThreadPerTaskExecutor()` | un **virtual thread par tâche** (Java 21) | ⚠️ **pas** pour du CPU-intensif |

> [!warning] Le piège des fabriques `Executors.*`
> `newFixedThreadPool` et `newCachedThreadPool` utilisent une file **non bornée** (`LinkedBlockingQueue`) : sous forte charge, les tâches s'accumulent **en mémoire** jusqu'à l'`OutOfMemoryError`.
>
> ✅ **En production : construire le pool explicitement**, avec une file **bornée** et une politique de rejet claire :
>
> ```java
> ThreadPoolExecutor pool = new ThreadPoolExecutor(
>     8,                                   // taille de base
>     16,                                  // taille max
>     60L, TimeUnit.SECONDS,               // durée de vie des threads en trop
>     new ArrayBlockingQueue<>(1000),      // ✅ file BORNÉE
>     new ThreadFactoryBuilder().setNameFormat("traitement-%d").build(),  // ✅ threads nommés
>     new ThreadPoolExecutor.CallerRunsPolicy()   // ✅ politique de rejet explicite
> );
> ```

**Les 4 politiques de rejet** (à connaître, c'est une question d'entretien) :

| Politique | Comportement |
|---|---|
| `AbortPolicy` *(défaut)* | lance `RejectedExecutionException` |
| `CallerRunsPolicy` | l'appelant **exécute la tâche lui-même** → **backpressure** naturel ✅ |
| `DiscardPolicy` | abandonne **silencieusement** ⚠️ (perte de données) |
| `DiscardOldestPolicy` | jette la **plus ancienne** de la file, ajoute la nouvelle |

> [!tip] L'image du `CallerRunsPolicy`
> Quand la file est pleine, ce n'est plus le serveur qui prend la commande : **c'est le client qui va la préparer lui-même**. Résultat : le client **ralentit** — et donc la file **ne grossit plus**. C'est de la **pression en retour** (*backpressure*), exactement ce qu'on veut.

### Nommer ses threads : le détail qui sauve en production

> [!tip] En clair
> 🔍 **L'image :** dans un thread dump, tous tes threads s'appellent `pool-3-thread-7`. **Aucune idée** de quel composant a un problème.
>
> ✅ Nomme-les : `paiement-0`, `import-csv-3`… Un thread dump devient **lisible en 10 secondes**.

```java
ThreadFactory tf = r -> {
    Thread t = new Thread(r);
    t.setName("paiement-" + compteur.incrementAndGet());
    t.setDaemon(false);              // true = ne bloque pas l'arrêt de la JVM
    return t;
};
```

---

## `Future` : le ticket de retrait

> [!tip] In clair
> 🎫 **L'analogie du pressing :** tu déposes ton manteau, on te donne **un ticket**. Tu peux **continuer à faire autre chose** et revenir chercher le manteau plus tard. Le `Future`, c'est le ticket.

```java
ExecutorService equipe = Executors.newFixedThreadPool(4);

Future<Integer> calc = equipe.submit(() -> calculLong());
// ← on peut faire autre chose ici, pendant que ça calcule

Integer resultat = calc.get();          // ⛔ BLOQUE jusqu'à ce que ce soit prêt
```

**Les opérations du `Future` :**

| Méthode | Ce qu'elle fait |
|---|---|
| `get()` | **attend** et renvoie le résultat (bloquant) |
| `get(timeout, unit)` | attend **au plus** X — lève `TimeoutException` |
| `isDone()` | le travail est-il fini ? |
| `cancel(true)` | **interrompt** si possible (`true` = envoie l'interruption) |

> [!warning] Le piège du `get()` sans timeout
> `get()` **sans timeout** peut **bloquer indéfiniment** si la tâche se bloque (I/O qui ne répond pas, deadlock). Résultat : ton thread applicatif **ne revient jamais**.
>
> ✅ Réflexe : **toujours** `get(30, TimeUnit.SECONDS)` sur du code qui parle au réseau.

> [!tip] Le piège du résultat perdu
> **Un `Future` que personne n'appelle ne sert à rien.** Soumettre une tâche et **ignorer** le `Future` signifie : « si cette tâche échoue, **personne ne le saura jamais** » — l'exception est **avalée**.
>
> ✅ Réflexe : soit tu récupères (`get`) le résultat, soit tu **journalises** l'échec dans la tâche elle-même. Ne jamais « lancer et oublier » sans trace.

---

## `CompletableFuture` : la composition

> [!tip] En clair
> `Future` sait **attendre**. `CompletableFuture` sait **enchaîner** — c'est la différence majeure.
>
> 🍔 **L'image de la chaîne de montage :** « quand le pain est grillé, **alors** mets la viande ; quand la viande est cuite, **alors** ajoute la sauce ». **Personne n'attend personne** : chaque étape se déclenche quand la précédente est prête.

```java
CompletableFuture
    .supplyAsync(() -> chercherClient(id), equipe)          // étape 1
    .thenApply(client -> client.adresse())                   // étape 2 (transforme)
    .thenCompose(adresse -> chercherLivraison(adresse))      // étape 3 (enchaîne un autre future)
    .thenAccept(livraison -> notifier(livraison))            // étape 4 (consomme, ne renvoie rien)
    .exceptionally(ex -> {
        journaliser("échec du parcours commande", ex);       // ✅ gestion d'erreur
        return null;
    });
```

**Le vocabulaire, en une ligne chacun :**

| Méthode | En clair |
|---|---|
| `supplyAsync` | lance un calcul **en retournant** un résultat |
| `runAsync` | lance un traitement **sans** résultat |
| `thenApply` | **transforme** le résultat (`Function`) |
| `thenAccept` | **consomme** le résultat, ne renvoie rien (`Consumer`) |
| `thenCompose` | enchaîne une étape qui renvoie **elle-même** un `CompletableFuture` |
| `thenCombine` | **fusionne** deux résultats indépendants |
| `allOf` | attend **toutes** les tâches |
| `anyOf` | attend **la première** qui finit |
| `exceptionally` / `handle` | rattrape l'erreur |

> [!warning] Les pièges de `CompletableFuture`
> **1. Le pool par défaut (`ForkJoinPool.commonPool`)** — utilisé si tu ne passes pas d'exécuteur. Sa taille = **cœurs − 1**. Sur du code **bloquant** (I/O), il **sature** vite et pénalise **toute** la JVM.
> ✅ Réflexe : **toujours** passer un exécuteur dédié pour les tâches bloquantes.
>
> **2. `.join()` en cascade** — appeler `join()` dans une étape **re-bloque** et annule l'intérêt du chaînage.
>
> **3. `thenApply` sur du code bloquant** — le `then*` s'exécute souvent sur le thread qui termine l'étape précédente. Si ça bloque, tu bloques ce thread.
>
> **4. Les erreurs avalées** — sans `exceptionally`/`handle` en fin de chaîne, une exception peut **disparaître** (et ne remonter qu'à un `join` tardif, voire jamais).

### `Future` vs `CompletableFuture` : le tableau

| | `Future` | `CompletableFuture` |
|---|---|---|
| Attendre un résultat | ✅ | ✅ |
| **Enchaîner** des étapes | ❌ (il faut bloquer) | ✅ (`thenApply`, `thenCompose`) |
| **Combiner** plusieurs tâches | ❌ | ✅ (`thenCombine`, `allOf`) |
| **Gérer l'erreur** proprement | ❌ | ✅ (`exceptionally`, `handle`) |
| **Compléter manuellement** | ❌ | ✅ (`complete()`) |
| Usage | tâche isolée | **pipeline** asynchrone |

---

## Les virtual threads (Java 21) : le changement de modèle

> [!tip] En clair
> 🎭 **L'analogie :** un **thread platform**, c'est un **serveur avec sa table attitrée** — il reste bloqué si le client hésite. Un **virtual thread**, c'est un serveur **virtuel** : pendant que le client réfléchit, le serveur **disparaît** (il ne consomme rien), et **un autre** prend la table.
>
> Quand le client est prêt, **la JVM remet un serveur virtuel sur la table**. Pour le client, **rien n'a changé** : c'est toujours le même service.

**Ce qui change concrètement :**

| | Thread platform | Virtual thread |
|---|---|---|
| Support | **1 thread d'OS** | **géré par la JVM** (en espace utilisateur) |
| Mémoire | ~1 Mo de pile | **quelques Ko**, extensible |
| Combien ? | **milliers** au max | **millions** |
| Coût de création | millisecondes | quasi **gratuit** |
| Code | identique | **identique** ✅ |
| Idéal pour | CPU-intensif | **I/O-intensif** (attentes réseau, BD) |

```java
// Java 21 : un virtual thread par tâche
try (var executor = Executors.newVirtualThreadPerTaskExecutor()) {
    for (var commande : commandes) {
        executor.submit(() -> traiter(commande));   // ← des MILLIONS possibles
    }
}   // fermeture = attente de la fin de toutes les tâches
```

> [!tip] La magie : aucune réécriture
> Tu n'as **rien** à changer à ton code. Ton `appelApi()` **bloquant** reste bloquant — sauf que pendant qu'il est bloqué, **la JVM libère le thread d'OS** pour quelqu'un d'autre.
>
> ⚠️ C'est le point **contre-intuitif** : le code **bloque toujours** du point de vue du développeur (`Thread.sleep`, `InputStream.read`…), mais **ne consomme plus** de thread système.

> [!warning] Les pièges des virtual threads (à citer, c'est discriminant en entretien)
> **1. 🔴 `synchronized` bloque le thread porteur (*pinning*).** Un virtual thread qui entre dans un bloc `synchronized` et s'y **bloque** **épingle** (pinning) le thread d'OS sous-jacent — et on **perd tout le bénéfice**. La solution : utiliser **`ReentrantLock`** au lieu de `synchronized` dans le code qui bloque. *(Ce défaut est largement corrigé depuis Java 24, mais reste un sujet d'entretien classique.)*
>
> **2. Aucun gain sur du CPU-intensif.** Un virtual thread n'accélère **pas** un calcul. Pour du CPU pur : `ForkJoinPool`, ou le **parallel stream**. Réserver les virtual threads aux tâches qui **attendent**.
>
> **3. `ThreadLocal` coûteux à l'échelle.** Un `ThreadLocal` par virtuel thread × 1 million = beaucoup de mémoire. Java 21 introduit les **Scoped Values** (JEP 429/446) pour ça.
>
> **4. Ne pas les mettre en pool.** Un pool de virtual threads **n'a aucun sens** : ils sont jetables. Crée-en un **par tâche**.
>
> **5. La mémoire de pile reste utilisable.** Un virtuel thread peut **croître** jusqu'à ses besoins réels ; si tu **récurses** profondément, tu atteindras la limite comme avant.

**Quand utiliser quoi ?**

| Charge | Choix |
|---|---|
| **I/O** massif (appels HTTP, BD, fichiers) | **virtual threads** ✅ |
| **CPU** intensif (calcul, traitement d'image) | **`ForkJoinPool`** / pool borné ✅ |
| Mélange, code legacy | pool **explicite** + file bornée |
| Tâches très courtes et nombreuses | virtual threads |

> [!tip] `ForkJoinPool` en deux lignes
> C'est le pool **spécialisé CPU** : il utilise le **vol de travail** (*work-stealing*) — un thread qui a fini **vole** la moitié du travail d'un thread surchargé. C'est ce qui alimente les **parallel streams** (`list.parallelStream()`). ⚠️ À **ne pas** utiliser pour du code **bloquant**.

---

## Dimensionner un pool : la question qui piège

> [!tip] En clair
> **La question classique : « quelle taille de pool ? »** La réponse naïve — « le nombre de cœurs » — est **fausse** dès qu'il y a des attentes.

**La formule (Brian Goetz), à connaître :**

```
N_threads = N_cpu × U_cpu × (1 + W/C)

  N_cpu = nombre de cœurs
  U_cpu = taux d'utilisation CPU visé (0 à 1)
  W/C   = temps d'attente ÷ temps de calcul
```

**En pratique, deux cas nets :**

| Charge | Taille du pool |
|---|---|
| **CPU-intensif** (`W/C ≈ 0`) | **= N_cpu** (parfois +1). Au-delà, on ne fait que s'entredéranger. |
| **I/O-intensif** (`W/C` élevé, ex. 10) | **≫ N_cpu** — on peut monter à `N_cpu × (1 + W/C)` |
| **I/O avec virtual threads** | **pas de pool** : un par tâche |
| File d'attente | **bornée**, avec `CallerRunsPolicy` |

> [!warning] Le piège du « plus de threads = plus rapide »
> Pour du **CPU** : au-delà de `N_cpu + 1` threads, **les performances baissent** (changements de contexte, caches froids). Pour de l'**I/O** : plus de threads aident… **jusqu'à** saturer la ressource en aval (la BD, l'API). **Le bon chiffre est celui qui sature la ressource, pas celui qu'on devine.** ⇒ **Mesurer** ([[java_performance_profiling]]).

---

## Exemple concret : l'import de 50 000 lignes

> [!tip] En clair
> **Le même besoin, trois générations de solutions.** Tu vois l'évolution du modèle Java.

### Le besoin

Importer un CSV de 50 000 lignes. Chaque ligne appelle une API (≈ 200 ms de **latence réseau**, quasi **aucun** CPU).

### Génération 1 — un thread par ligne (❌)

```java
for (Ligne ligne : lignes) {
    new Thread(() -> importer(ligne)).start();     // ❌ 50 000 threads
}
```
**Résultat :** `OutOfMemoryError` (50 000 × ~1 Mo de pile ≈ 50 Go) ou effondrement de la machine.

### Génération 2 — pool borné + file bornée (✅ toujours valable)

```java
ThreadPoolExecutor pool = new ThreadPoolExecutor(
    100, 100, 0L, TimeUnit.SECONDS,               // 100 threads : la latence réseau domine
    new ArrayBlockingQueue<>(5000),               // ✅ file bornée
    tf, new ThreadPoolExecutor.CallerRunsPolicy() // ✅ backpressure
);

for (Ligne ligne : lignes) pool.submit(() -> importer(ligne));

pool.shutdown();
pool.awaitTermination(1, TimeUnit.HOURS);
```
**Résultat :** maîtrisé, mémoire stable, la file ne grossit pas sans fin. **≈ quelques minutes.**

### Génération 3 — virtual threads (✅ Java 21)

```java
try (var executor = Executors.newVirtualThreadPerTaskExecutor()) {
    for (Ligne ligne : lignes) {
        executor.submit(() -> importer(ligne));    // ✅ 50 000 virtual threads : ok
    }
}
```
**Résultat :** le code le plus **simple**, ~100 Ko de pile par virtual thread, et la JVM réutilise les threads d'OS **pendant les 200 ms d'attente réseau**.

> [!warning] Le piège de la génération 3
> **50 000 appels simultanés, c'est 50 000 requêtes en vol.** Le goulot d'étranglement ne disparaît pas : il se **déplace** vers **l'API appelée** (qui, elle, tombera). Sans virtual threads, la file bornée **protégeait** naturellement l'aval.
>
> ✅ Réflexe : avec des virtual threads, il faut souvent un **`Semaphore`** pour **borner la concurrence** :
> ```java
> Semaphore limite = new Semaphore(200);          // 200 appels en vol maximum
> try (var executor = Executors.newVirtualThreadPerTaskExecutor()) {
>     for (Ligne ligne : lignes) {
>         executor.submit(() -> {
>             limite.acquire();
>             try { importer(ligne); } finally { limite.release(); }
>         });
>     }
> }
> ```
> 🔑 **La leçon :** les virtual threads suppriment le coût **des threads**, pas le besoin de **limiter la pression** sur ce qui est en aval.

---

## Pièges fréquents

> [!tip] En clair
> **Les 6 erreurs à retenir :**
> 1. **`new Thread()` dans du code applicatif** → pas de limite, pas de suivi. Utiliser un pool.
> 2. **File d'attente non bornée** → `OutOfMemoryError` sous charge.
> 3. **`get()` sans timeout** → blocage indéfini.
> 4. **`CompletableFuture` sur le pool commun avec du code bloquant** → sature toute la JVM.
> 5. **Virtual threads pour du CPU** → aucun gain, et confusion.
> 6. **Virtual threads sans `Semaphore`** → tu noies l'aval au lieu de le protéger.

- **Fabriques `Executors.*` en production** — file non bornée, threads non nommés. Réflexe : `ThreadPoolExecutor` explicite, **file bornée**, `ThreadFactory` qui **nomme**, politique de rejet décidée.
- **`Future` ignoré** — l'exception dans la tâche est **avalée** silencieusement. Réflexe : récupérer le résultat, ou journaliser dans la tâche.
- **`get()` sans timeout** — un thread applicatif bloqué pour toujours. Réflexe : **toujours** `get(timeout, unit)` dès qu'il y a de l'I/O.
- **Pool commun de `CompletableFuture`** — `ForkJoinPool.commonPool` a `N_cpu − 1` threads : 8 cœurs → 7 threads pour **toute** la JVM. Un appel bloquant et **tout** est bloqué. Réflexe : **exécuteur dédié**.
- **`thenApply` sur du code bloquant** — bloque le thread qui termine l'étape. Réflexe : `thenApplyAsync(..., monExecuteur)` pour le code bloquant.
- **Chaîne `CompletableFuture` sans `exceptionally`** — l'échec disparaît. Réflexe : **toujours** terminer par une gestion d'erreur explicite.
- **Virtual thread + `synchronized` bloquant** — *pinning* : le thread d'OS reste attaché, le bénéfice disparaît. Réflexe : **`ReentrantLock`** dans le code bloquant.
- **Pool de virtual threads** — inutile et contre-productif : ils sont jetables. Réflexe : **un par tâche**.
- **`ThreadLocal` massif** — avec des millions de virtual threads, la mémoire explose. Réflexe : **Scoped Values**, ou supprimer le `ThreadLocal` après usage.
- **Dimensionner « au feeling »** — trop de threads en CPU-intensif = **moins** de performance. Réflexe : formule **N_cpu × U × (1 + W/C)**, puis **mesurer**.
- **Ne pas arrêter le pool** — `shutdown()` + `awaitTermination()` sinon la JVM ne sort pas. Réflexe : arrêt propre (ou `try-with-resources` avec un exécuteur `AutoCloseable`).
- **`shutdownNow()` sans gérer l'interruption** — les tâches en cours sont **interrompues** mais peuvent ne pas s'arrêter. Réflexe : code **coopératif** vis-à-vis de `InterruptedException`.
- **Confondre `submit` et `execute`** — `execute` ne renvoie pas de `Future` : l'échec est **invisible**. Réflexe : `submit` dès qu'on veut suivre l'exécution.
- **Tâche périodique qui dépasse sa période** (`scheduleAtFixedRate`) — les exécutions **s'empilent**. Réflexe : `scheduleWithFixedDelay` si la durée est variable.

---

## Rappel

> [!question] Question de rappel
> Une application traite des appels HTTP (200 ms de latence, quasi aucun CPU) avec un `Executors.newFixedThreadPool(8)`. Le débit plafonne, alors que le CPU est à 5 %. Pourquoi ? Que change-t-on avec les virtual threads, et quel **nouveau** problème faut-il alors anticiper ?

> [!success]- Réponse
> **Pourquoi ça plafonne :** les threads sont **bloqués en attente réseau**, pas en calcul. Avec 8 threads et 200 ms de latence, le débit maximal est d'environ **40 requêtes/seconde**, quelle que soit la puissance de la machine — le CPU reste à 5 % parce qu'il ne fait **rien** d'autre qu'attendre. Le pool est **trop petit pour une charge I/O** : la formule `N_cpu × U × (1 + W/C)` donne, avec `W/C ≈ 200`, un ordre de grandeur de **plusieurs centaines** de threads légitimes. **Avec les virtual threads :** chaque tâche obtient son propre virtual thread ; pendant les 200 ms d'attente, la JVM **libère le thread d'OS** pour une autre tâche. Le même matériel peut alors soutenir des dizaines de milliers de requêtes en vol, avec un code **identique**. **Le nouveau problème :** les virtual threads suppriment le coût **des threads**, pas la **capacité de l'aval**. Avec 50 000 tâches lancées, on envoie 50 000 requêtes simultanées à l'API distante — qui **tombe**, ou applique du *rate limiting*. Il faut donc **borner la concurrence** explicitement, typiquement avec un **`Semaphore`** (ou un limiteur de débit), pour retrouver la protection que la **file bornée** du pool fournissait naturellement. **La leçon :** les virtual threads déplacent le goulot d'étranglement de **la machine locale** vers **la ressource appelée** — et c'est là qu'il faut désormais poser la limite.

### 🎯 Le résumé à retenir

> [!tip] Si tu ne retiens qu'une chose
> **Un thread coûte cher : un pool le mutualise, les virtual threads le rendent jetable.**
>
> - **Jamais `new Thread()`** dans du code applicatif → `ExecutorService`.
> - **`ThreadPoolExecutor` explicite** : file **bornée**, threads **nommés**, rejet décidé.
> - **`Future`** = attendre · **`CompletableFuture`** = enchaîner. Toujours un `exceptionally`.
> - **`get()` avec timeout**, jamais sans.
> - **Virtual threads** : ✅ pour l'**I/O**, ❌ pour le **CPU**, ⚠️ jamais de **pool**, ⚠️ `Semaphore` pour **borner l'aval**.
> - **Dimensionner** : `N_cpu × U × (1 + W/C)` — puis **mesurer**.
>
> **Et le réflexe :** un pool, c'est une **limite**. Avant d'augmenter le nombre de threads, se demander **ce qui est en aval** — et si c'est lui qu'on va noyer.

---

## 🗣️ Les questions qu'on te posera

> [!tip] En clair
> Les questions classiques sur le sujet, et la réponse courte qui résume l'essentiel.

| Si on te demande… | Réponds… |
|---|---|
| **« Pourquoi un pool de threads ? »** | « Un thread coûte ~1 Mo de pile et un thread d'OS. Le pool **réutilise** N threads au lieu d'en créer un par tâche. » |
| **« Quelle taille de pool ? »** | « `N_cpu × U × (1 + W/C)`. **CPU-intensif** ≈ `N_cpu` ; **I/O-intensif** ≫ (l'attente domine). Puis **mesurer**. » |
| **« `Future` ou `CompletableFuture` ? »** | « `Future` = **attendre**. `CompletableFuture` = **enchaîner, combiner, gérer l'erreur** — un pipeline asynchrone. » |
| **« C'est quoi un virtual thread ? »** | « Un thread **géré par la JVM** (pas 1:1 avec l'OS), quelques Ko de pile → des **millions**. Idéal pour l'**I/O**. » |
| **« Les virtual threads accélèrent-ils le calcul ? »** | « **Non** : aucun gain sur du CPU. Ils suppriment le **coût d'attente**, pas le coût de calcul. » |
| **« Le piège des virtual threads ? »** | « Le **pinning** (`synchronized` bloquant), et ils **noyent l'aval** s'ils ne sont pas bornés par un `Semaphore`. » |
| **« Pourquoi nommer les threads ? »** | « Pour rendre les **thread dumps** lisibles : `pool-3-thread-7` ne dit rien, `paiement-3` identifie le composant. » |

> [!tip] La phrase qui tue
> **« Un pool est une limite ; les virtual threads suppriment le coût des threads, pas le besoin de limiter la pression sur ce qui est en aval. »**

---

## Voir aussi

- [[java_memory_model]] — visibilité, `happens-before` (le prérequis).
- [[java_jmm_concurrency]] — verrous, atomics, structures concurrentes.
- [[java_jvm_architecture]] — comment la JVM planifie et exécute.
- [[java_performance_profiling]] — mesurer contention, blocages et temps d'attente.
- [[index]] — carte d'entrée du domaine Java.

## Références

- Brian Goetz et al. — *Java Concurrency in Practice* (chapitres 6 à 8 : exécution de tâches, pools).
- JEP 444 — *Virtual Threads* (Java 21, final). JEP 425/436 — previews.
- JEP 446 / 429 — *Scoped Values* (alternative aux `ThreadLocal`).
- `java.util.concurrent` — Javadoc (`ExecutorService`, `ThreadPoolExecutor`, `CompletableFuture`).
- Doug Lea — *A Java Fork/Join Framework* (work-stealing).
