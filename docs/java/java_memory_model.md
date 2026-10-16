---
title: "JMM en profondeur : happens-before et les 3 remèdes"
aliases: [Java Memory Model, JMM, Modèle mémoire Java, happens-before, safe publication, réordonnancement, volatile, synchronized, AtomicInteger]
tags: [java, jvm, memoire, concurrence, theorie, visibilite]
domaine: java
niveau: avance
statut: draft
cree: 2026-10-14
sources: [JLS §17 Threads and Locks, JSR-133, Java Concurrency in Practice]
---

# JMM en profondeur : happens-before et les 3 remèdes

> [!abstract] Ancre
> Le **Java Memory Model** (JMM) est le **contrat** qui dit *quand une écriture faite par un thread devient visible pour un autre*. C'est lui qui explique pourquoi un programme concurrent « correct » peut se comporter de façon absurde — et pourquoi `volatile` et `synchronized` existent.

---

## 🧒 Avant de commencer : de quoi on parle

> [!tip] En clair
> Imagine **deux chefs cuisiniers** dans la **même cuisine**, mais chacun avec **son propre plan de travail**.
>
> - La **cuisine commune** (le frigo, les placards partagés) = la **heap**.
> - Le **plan de travail de chacun** (petit, privé, rapide d'accès) = le **plan local du thread**.
>
> 👨🍳 **Le drame :** le chef A met du beurre dans le frigo. Le chef B, lui, a mis du beurre **sur son plan de travail** il y a 5 minutes — et il continue de l'utiliser **sans jamais relire le frigo**. Il ne verra **pas** le beurre frais de A.
>
> **Il n'y a pas de bug dans le code. Le problème, c'est que chacun travaille sur une copie.**
>
> C'est **exactement** ça, un problème de **visibilité** en Java. Et `volatile`, `synchronized`, ce sont les **règles de cuisine** qui disent : « avant de toucher au frigo, tu reposes ce que tu as sur ton plan et tu relis ».
>
> 🔑 **La phrase à garder :** *en Java, quand tu écris dans une variable, tu ne la « partages » pas automatiquement. Tu en fais une copie locale qui peut vivre longtemps.*

**Les mots à connaître pour cette note :**

| Mot technique | En clair |
|---|---|
| **heap** | la **mémoire partagée** entre tous les threads (les objets qui vivent « chez tout le monde ») |
| **stack** | la **mémoire privée d'un thread** (ses variables locales, ses appels de méthode) |
| **thread** | un fil d'exécution : **un chef cuisinier** |
| **visibilité** | « est-ce que je vois la dernière version écrite par un autre ? » |
| **`happens-before`** | la **règle** qui dit si une écriture est garantie visible |
| **réordonnancement** | le compilateur/CPU **change l'ordre** des instructions pour aller plus vite |
| **`volatile`** | « cette variable : jamais de copie locale, toujours le frigo » |
| **`synchronized`** | « une seule personne à la fois, et je vide mon plan avant / après » |
| **race condition** | deux threads se marchent dessus sur la même donnée |

Voir aussi : [[java_jmm_concurrency]] (le JMM appliqué), [[java_threads_executors]] (pools et virtual threads).

---

## Les deux mémoires, physiquement

> [!tip] En clair
> **L'image qui débloque tout :**
>
> ```
>        ┌─────────────────── HEAP (partagée) ───────────────────┐
>        │  objet User { name = "Alice" }                        │
>        │  objet Compteur { total = 42 }                        │
>        │  Chaque thread PEUT la voir — mais PAS tout de suite  │
>        └───────────────────────────────────────────────────────┘
>              ▲                    ▲                    ▲
>              │                    │                    │
>     ┌────────┴────────┐  ┌────────┴────────┐  ┌────────┴────────┐
>     │  THREAD 1       │  │  THREAD 2       │  │  THREAD 3       │
>     │  ┌───────────┐  │  │  ┌───────────┐  │  │  ┌───────────┐  │
>     │  │  STACK    │  │  │  │  STACK    │  │  │  │  STACK    │  │
>     │  │ (privée)  │  │  │  │ (privée)  │  │  │  │ (privée)  │  │
>     │  │           │  │  │  │           │  │  │  │           │  │
>     │  │ int i=5   │  │  │  │ int j=7   │  │  │  │ int k=9   │  │
>     │  └───────────┘  │  │  └───────────┘  │  │  └───────────┘  │
>     └─────────────────┘  └─────────────────┘  └─────────────────┘
> ```

| Où vit quoi ? | Heap | Stack |
|---|---|---|
| **Les objets** (`new User()`) | ✅ ici | ❌ |
| **Les champs d'un objet** (`user.name`) | ✅ ici | ❌ |
| **Les variables locales** (primitives d'une méthode) | ❌ | ✅ ici |
| **Les paramètres de méthode** | ❌ | ✅ ici |
| **La référence** vers un objet | ❌ (la *variable* est locale) | ✅ ici — mais elle **pointe** vers la heap |

> [!warning] Le piège de lecture
> `user.name` n'est **pas** « dans le stack de mon thread ». `user` est une **référence locale** (dans le stack), mais `name` est **un champ dans la heap**. Le thread ne lit pas la heap directement à chaque fois : **il peut en garder une copie**.
>
> 🔑 **C'est là que naît 100 % des problèmes de visibilité.**

---

## Le cœur du sujet : `happens-before`

> [!tip] En clair
> **Le mot le plus important de toute la concurrence Java.**
>
> `A happens-before B` se lit : **« tout ce que le thread a fait avant A est visible pour le thread qui exécute B »**.
>
> 🍽️ **L'analogie du restaurant :**
> Le serveur a **dressé la table** (écritures) et **planté le panneau « Service ouvert »** (l'action qui crée la relation). Le client qui lit le panneau et **voit « ouvert »** est **garanti** de voir la table dressée. **Sans le panneau**, rien ne garantit que le client ne voie pas une table vide — même si elle a été dressée !

**Les règles `happens-before` à connaître (les 4 qui servent) :**

| # | Règle | En clair |
|---|---|---|
| 1 | **Programme** | dans **un même** thread, les instructions gardent leur ordre logique |
| 2 | **Verrou (monitor)** | tout ce qui précède un `unlock` est visible après le `lock` correspondant |
| 3 | **`volatile`** | une **écriture** volatile précède toute **lecture** volatile de la même variable |
| 4 | **Démarrage / fin de thread** | `thread.start()` rend visibles les écritures précédentes ; `join()` idem |

> [!warning] Le point qui fait mal
> **Entre deux threads qui ne se synchronisent pas, il n'y a AUCUN `happens-before`.**
>
> Ce n'est **pas** « il y a un délai ». C'est **« il n'y a aucune garantie du tout »**. Le thread B peut voir une valeur **ancienne**, une valeur **partielle**, ou une valeur **qui n'a jamais existé** (réordonnancement). Et le programme peut très bien **fonctionner 10 000 fois** en test, puis casser en production.

---

## Le bug qui n'existe pas : visibilité et réordonnancement

> [!tip] En clair
> Le code suivant a l'air **parfaitement correct**. Il ne l'est pas. Et c'est **impossible à voir à l'œil nu** — d'où le besoin de comprendre le modèle.

```java
public class TicketDeCaisse {
    private boolean ouvert = false;      // ❌ pas volatile
    private int totalEncaisse = 0;

    // Le chef de rang
    public void dresserLaTable() {
        totalEncaisse = 42;              // ① écrit la donnée
        ouvert = true;                   // ② lève le panneau
    }

    // Le serveur (un AUTRE thread)
    public void servir() {
        if (ouvert) {                    // ③ lit le panneau
            System.out.println(totalEncaisse);  // ④ lit la donnée
        }
    }
}
```

**Ce qui peut se passer en vrai :**

| Scénario | Ce que le CPU/compilateur peut faire | Résultat |
|---|---|---|
| **Visibilité** | le thread `servir` lit `ouvert` depuis **sa copie locale en cache** (`false`), alors que la vraie valeur est `true` | le serveur **ne sert jamais** — boucle infinie |
| **Visibilité inverse** | il lit `ouvert = true` mais `totalEncaisse` depuis une **copie ancienne** | il affiche **0** au lieu de **42** |
| **Réordonnancement** | le CPU écrit `ouvert = true` **avant** `totalEncaisse = 42` (il a le droit !) | le serveur voit « ouvert » mais affiche **0** |

> [!warning] Pourquoi le CPU se croit autorisé
> **1.** Le **compilateur** et le **CPU** réordonnent les instructions pour aller plus vite (pipelining, caches). Entre deux threads **non synchronisés**, ils sont **autorisés** à le faire — le JMM dit juste « je ne garantis rien ».
>
> **2.** Chaque **cœur de CPU a son propre cache** (L1/L2). Une valeur écrite par le cœur A peut rester **des heures** invisible au cœur B, sans qu'aucune ligne de code ne soit fautive.

**Et le pire :** en test, sur ta machine, ça **marche**. En production, sur une machine à 32 cœurs sous charge → **ça casse une fois par mois**, sans stacktrace. **C'est le bug le plus coûteux du métier.**

---

## Les trois remèdes, et quand les utiliser

> [!tip] En clair
> Trois outils, du plus léger au plus lourd. **Le choix dépend de ce que tu dois protéger.**

### ① `volatile` — « le panneau lumineux »

```java
private volatile boolean ouvert = false;   // ✅
```

> [!tip] En clair
> **L'analogie :** un **panneau lumineux** branché directement sur le secteur. Chaque fois que quelqu'un le touche, **tous les autres le voient instantanément** — pas de copie locale, pas de cache.
>
> **Ce que ça garantit :** chaque **écriture** est immédiatement visible, et **tout ce qui a été écrit avant** (dans le même thread) devient visible aussi.

| ✅ Fait | ❌ Ne fait PAS |
|---|---|
| garantit la **visibilité** | ne rend **pas** une opération composite atomique |
| empêche le **réordonnancement** autour de lui | ne protège **pas** de deux écrivains simultanés |
| cheap, sans verrou | ne remplace **pas** `synchronized` |

> [!warning] Le piège classique du `volatile`
> ```java
> private volatile int compteur = 0;
> public void incrementer() { compteur++; }   // ❌ PAS atomique !
> ```
> `compteur++` = **lire → ajouter → écrire** (3 étapes). Deux threads peuvent lire la même valeur et s'écraser mutuellement. **`volatile` protège la vue, pas l'opération.**
>
> ✅ **Correct :** `AtomicInteger`, ou `synchronized`.

### ② `synchronized` — « un seul dans la cuisine »

```java
public synchronized void dresserLaTable() {
    totalEncaisse = 42;
    ouvert = true;
}
```

> [!tip] En clair
> **L'analogie :** la **porte de la cuisine**. Un seul chef à la fois à l'intérieur, et **en entrant** il vide son plan de travail, **en sortant** il le renote **dans le frigo**.
>
> **Ce que ça garantit :** **exclusion mutuelle** (un seul à la fois) **et** visibilité (**tout** ce qui précède le `unlock` est visible après le `lock`).

| ✅ Fait | Prix |
|---|---|
| **atomicité** d'un bloc entier | plus lourd (contention, mise en attente) |
| garantit la **visibilité** des écritures antérieures | risque de **deadlock** si mal ordonné |
| établit un **`happens-before`** fort | granularité : trop large = tue la performance |

### ③ `AtomicInteger` & co. — « le compteur à bras tournant »

```java
private final AtomicInteger compteur = new AtomicInteger(0);
public void incrementer() { compteur.incrementAndGet(); }   // ✅ atomique, sans verrou
```

> [!tip] En clair
> **L'analogie :** un compteur mécanique qui **incrémente toujours correctement**, même si 50 personnes appuient en même temps. Il utilise des instructions CPU spéciales (« compare-and-swap ») au lieu d'un verrou.

**Le tableau de choix :**

| Besoin | Outil |
|---|---|
| « je veux juste **voir** la dernière valeur » | **`volatile`** |
| « je veux **protéger plusieurs variables ensemble** » | **`synchronized`** |
| « je veux **un compteur / un accumulateur** » | **`Atomic*`** (`AtomicInteger`, `AtomicLong`, `LongAdder`) |
| « je veux publier **un objet** entre threads » | **`volatile`** + `final` (voir plus bas), ou `synchronized` |

---

## Le cas le plus sous-estimé : la *safe publication*

> [!tip] En clair
> **Publier** un objet = le rendre visible aux autres threads. Mal fait, un autre thread peut voir un **objet à moitié construit**.
>
> 🏗️ **L'analogie du déménagement :** tu montes les meubles dans l'appartement (les champs). Si tu **ouvres la porte avant d'avoir fini**, le visiteur voit un chaos — un canapé **sans pieds**. C'est exactement ça : un objet dont les champs ne sont **pas encore initialisés**.

```java
public class Configuration {
    private Map<String, String> parametres;   // ❌ pas final, pas volatile
    private int timeout;

    public Configuration() {
        parametres = charger();               // ①
        timeout = 30;                         // ②
    }
}
```

**Un autre thread peut obtenir une référence vers cet objet et voir `parametres == null` ou `timeout == 0`** — un objet **partiellement construit** (un fameux « *unsafe publication* »).

**Les 3 remèdes :**

| Remède | Comment |
|---|---|
| **`final` sur les champs immuables** | ✅ **garantie par le JMM** : un champ `final` est visible **initialisé** à quiconque voit la référence |
| **Publier via `volatile`** | la référence devient une barrière de visibilité |
| **Publier via `synchronized`** | l'objet est construit **sous verrou**, et lu sous le même verrou |

> [!tip] L'image du `final`
> Un champ **`final`** est comme une pièce montée **soudée avant l'ouverture** : le JMM garantit qu'aucun thread ne verra l'objet « sans la pièce ». C'est **la** raison pour laquelle on recommande **l'immutabilité** : un objet immuable (tous champs `final`) est **`safe` par construction**.

---

## Exemple concret : le compteur qui perd des clients

> [!tip] En clair
> Le **même scénario**, raconté deux fois : la version qui « marche en test », la version correcte.

### ❌ La version qui perd des données

```java
public class CompteurDeVisites {
    private int total = 0;                  // ❌ pas volatile, pas synchronisé

    public void visiter() {
        total++;                            // ❌ lire-modifier-écrire
    }

    public int lire() { return total; }     // ❌ visibilité non garantie
}
```

```
2 threads, 10 000 visites chacun → attendu : 20 000
Résultat observé : 17 431  (les autres sont PERDUES)
```

**Pourquoi :** deux threads lisent `total = 5000` **en même temps**, chacun ajoute 1, chacun écrit `5001`. **Un incrément a disparu.** Et rien n'est signalé : pas d'exception, pas de log.

> [!warning] Le vrai problème en production
> Ce n'est pas « perdre 2500 visites ». C'est que le **même bug** dans un contexte métier (débit d'un compte, compteur de stock, quota) produit une **incohérence silencieuse** — et qu'il ne se manifeste **que sous charge**, donc **jamais en test unitaire**.

### ✅ La version correcte (3 options)

| Option | Code | Quand l'utiliser |
|---|---|---|
| **Atomique** | `private final AtomicInteger total = new AtomicInteger(0);`<br>`total.incrementAndGet();` | compteurs, accumulateurs — **le plus léger** |
| **Synchronized** | `public synchronized void visiter() { total++; }` | plusieurs variables à protéger **ensemble** |
| **`LongAdder`** | `private final LongAdder total = new LongAdder();`<br>`total.increment();` | **très forte** contention (metrics, compteurs à haute fréquence) |

> [!tip] Pourquoi `LongAdder` existe
> Sous **très forte** contention, `AtomicInteger` fait tourner tous les threads sur **la même** variable → beaucoup de « compare-and-swap » échoués et retentés. `LongAdder` **éclate le compteur en plusieurs cellules** (une par thread en pratique) et additionne à la lecture.
>
> 🔑 **Le trade-off** : écriture **beaucoup** plus rapide, lecture **un peu** plus lente. À savoir citer en entretien : *« `LongAdder` quand l'écriture domine, `AtomicLong` quand la lecture doit être immédiate »*.

---

## Pièges fréquents

> [!tip] En clair
> **Les 5 erreurs à retenir :**
> 1. **Croire qu'un `volatile` rend une opération atomique** → il protège la **vue**, pas l'opération.
> 2. **Penser que « ça a marché en test » ⇒ « c'est correct »** → la visibilité ne se manifeste **pas** sur une machine peu chargée.
> 3. **Utiliser un objet publié sans `final` ni synchronisation** → objet à moitié construit.
> 4. **Confondre `synchronized` (les deux threads sur le même verrou)** → deux verrous différents = aucune protection.
> 5. **Écrire un singleton « double-checked » sans `volatile`** → le cas d'école, et il est **réel**.

- **`volatile` pris pour un verrou** — `volatile` garantit la visibilité et l'ordre, **jamais** l'atomicité d'une séquence. Réflexe : dès qu'une opération se lit *et* s'écrit (`++`, `+=`, `if-x-then-y`), il faut `Atomic*` ou `synchronized`.
- **« Ça marche chez moi »** — la visibilité se manifeste **sous charge**, sur **plusieurs cœurs**. Un test unitaire mono-thread ne prouvera **jamais** rien. Réflexe : tester avec `jcstress`, ou raisonner avec `happens-before`.
- **Publication non sûre** — l'objet est visible avant la fin de son constructeur. Réflexe : champs `final` quand c'est possible, sinon publier via `volatile` ou sous verrou.
- **Singleton double-checked sans `volatile`** — le classique : `if (instance == null) { synchronized(...) { if (instance == null) instance = new Singleton(); } }` — **sans `volatile`**, un thread peut voir une référence non nulle vers un objet **partiellement construit**. Réflexe : `private static volatile Singleton instance;` (ou, mieux, un *holder* statique).
- **Deux verrous différents pour la même donnée** — protéger la donnée avec `synchronized(a)` ici et `synchronized(b)` là ne protège **rien**. Réflexe : **un** verrou par invariant, et documenter lequel.
- **Verrou trop large** — `synchronized` sur toute une méthode qui fait de l'I/O bloque tous les threads. Réflexe : réduire la section critique, sortir les appels réseau du verrou.
- **`hashCode`/`equals` sur un objet mutable partagé** — une clé de `HashMap` modifiée entre-temps devient introuvable. Réflexe : clés **immuables**, champs `final`.
- **`static` mutable non protégé** — l'état partagé global est le pire cas : accessible partout, protégé nulle part. Réflexe : éviter l'état `static` mutable, ou le confiner.
- **Croire que `synchronized` empêche tout réordonnancement** — il établit un `happens-before` **à l'entrée et à la sortie**, rien de plus. À l'intérieur, le CPU peut réordonner. Réflexe : raisonner en **barrières**, pas en « gel du CPU ».
- **Oublier les barrières de `start()` / `join()`** — souvent on croit devoir synchroniser là où `start()` ou `join()` suffit déjà (`happens-before` implicite). Réflexe : connaître les 4 règles plutôt que sur-synchroniser.

---

## Rappel

> [!question] Question de rappel
> Un thread A écrit `data = 42` puis `pret = true`. Un thread B boucle sur `while (!pret) {}` puis lit `data`. Les deux champs sont-ils déclarés `volatile` ? Que se passe-t-il si **aucun** ne l'est, et pourquoi le programme peut-il très bien fonctionner pendant des mois avant d'échouer ?

> [!success]- Réponse
> **Tel quel, rien ne garantit que B voie quoi que ce soit.** Sans `volatile` sur `pret`, le thread B peut lire `pret` depuis **son cache de cœur**, rester bloqué à `false` **indéfiniment** malgré l'écriture de A. Et même s'il voyait `pret = true`, **rien ne garantit** qu'il voie `data = 42` : sans relation `happens-before`, le compilateur et le CPU ont le droit de **réordonner** les deux écritures de A (écrire `pret = true` avant `data = 42`), et le thread B peut lire un `data` **périmé** (0) — voire une valeur jamais écrite. **Avec `volatile` sur `pret`** : l'écriture de `pret` crée une barrière — tout ce qui précède (dont `data = 42`) devient visible pour quiconque lit `pret` et voit `true`. C'est le pattern dit du « *flag* » ou du « *one-time publication* ». **Pourquoi ça marche longtemps avant d'échouer :** sur une machine peu chargée, un seul cœur ou un cache bien synchronisé peut donner l'illusion de la cohérence ; dès que la charge augmente, que les cœurs se multiplient ou que la JIT optimise différemment, le défaut apparaît — **sans stacktrace**, de façon **non reproductible**. C'est la signature des bugs de concurrence, et la raison exacte pour laquelle on **raisonne** en `happens-before` au lieu de tester.

### 🎯 Le résumé à retenir

> [!tip] Si tu ne retiens qu'une chose
> **En Java, écrire dans une variable ne la « partage » pas : chaque thread peut en garder une copie.** Le JMM est le **contrat** qui dit quand cette copie doit être rafraîchie.
>
> - **heap** = partagée · **stack** = privée. Le problème naît du **cache du thread** sur la heap.
> - **`happens-before`** = la seule chose qui **garantit** la visibilité. Entre deux threads non synchronisés : **aucune garantie**.
> - **`volatile`** → visibilité + ordre, **pas** atomicité.
> - **`synchronized`** → atomicité **et** visibilité, mais lourd.
> - **`Atomic*` / `LongAdder`** → compteurs sans verrou.
> - **`final`** → la pièce soudée avant l'ouverture : publication sûre **sans verrou**.
>
> **Et le réflexe qui sauve :** ne jamais se dire « ça a marché en test ». Se demander : **« quel `happens-before` relie ces deux threads ? »** S'il n'y en a pas, il y a un bug dormant.

---

## 🗣️ Les questions qu'on te posera

> [!tip] En clair
> Les questions classiques sur le sujet, et la réponse courte qui résume l'essentiel.

| Si on te demande… | Réponds… |
|---|---|
| **« C'est quoi le Java Memory Model ? »** | « Le **contrat** qui définit quand une écriture d'un thread devient **visible** pour un autre. Sans lui, aucun raisonnement concurrent n'est possible. » |
| **« `volatile` vs `synchronized` ? »** | « `volatile` = **visibilité + ordre**, pas d'atomicité, pas de verrou. `synchronized` = **exclusion mutuelle + visibilité**. » |
| **« `i++` sur un `volatile int`, atomique ? »** | « **Non** : c'est lire-modifier-écrire. `volatile` protège la **vue**, pas l'opération → `AtomicInteger`. » |
| **« C'est quoi `happens-before` ? »** | « La garantie que ce qu'un thread écrit avant A est **visible** au thread qui exécute après B. C'est **la** relation qui rend le code concurrent correct. » |
| **« Pourquoi un bug concurrent ne se reproduit-il pas en test ? »** | « La visibilité dépend du **cache du cœur** et de la charge. Peu de cœurs, peu de charge → l'illusion de cohérence. Sous charge → le défaut apparaît, **sans stacktrace**. » |
| **« Pourquoi `final` aide-t-il en concurrence ? »** | « Le JMM garantit qu'un champ `final` est **initialisé** pour quiconque voit la référence → publication sûre **sans verrou**. » |
| **« `AtomicLong` ou `LongAdder` ? »** | « **Écriture dominante** → `LongAdder` (cellules éclatées, moins de contention). **Lecture immédiate requise** → `AtomicLong`. » |

> [!tip] La phrase qui tue
> **« En Java, écrire dans une variable ne la partage pas : chaque thread peut en garder une copie — le JMM dit seulement quand cette copie doit être rafraîchie, et sans `happens-before` il n'y a aucune garantie. »**

---

---

## 🔗 Si tu débutes sur le sujet

> [!tip] En clair
> Cette note entre dans le **détail technique**. Si tu veux d'abord **la vue d'ensemble** — pourquoi le problème existe, les deux problèmes à ne jamais confondre, et la carte des notes — commence ici :
>
> ➡️ **[[java_memoire_partagee|Mémoire Java : ce qui est partagé entre threads]]**

## Voir aussi

- [[java_jmm_concurrency]] — le modèle mémoire **appliqué** : atomics, deadlocks, structures concurrentes.
- [[java_threads_executors]] — threads, pools, virtual threads, `CompletableFuture`.
- [[java_jvm_architecture]] — où vivent réellement heap et stack dans la JVM.
- [[java_garbage_collection]] — ce qui se passe quand la heap se remplit.
- [[index]] — carte d'entrée du domaine Java.

## Références

- JLS — *Java Language Specification*, §17 *Threads and Locks* (le JMM normatif).
- JSR-133 — *Java Memory Model and Thread Specification* (la refonte de Java 5).
- Brian Goetz et al. — *Java Concurrency in Practice* (le chapitre 3, « Sharing Objects », est la référence pratique).
- OpenJDK — *jcstress* (harnais de test pour les cas limites du JMM).
