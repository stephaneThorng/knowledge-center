---
title: "Concurrence Java en pratique : verrous, atomics et pièges"
aliases: [Concurrence Java, java.util.concurrent, verrous, locks, atomics, deadlock, ConcurrentHashMap, structures concurrentes]
tags: [java, jvm, concurrence, verrous, atomics, deadlock, theorie]
domaine: java
niveau: avance
statut: draft
cree: 2026-10-14
sources: [Java Concurrency in Practice, java.util.concurrent, JLS §17]
---

# Concurrence Java en pratique : verrous, atomics et pièges

> [!abstract] Ancre
> Une fois le modèle mémoire compris ([[java_memory_model]]), reste la **vraie** question : comment écrire du code concurrent **correct** et **qui ne s'effondre pas sous charge** ? Cette note couvre les outils de `java.util.concurrent` et les **pièges** qui coûtent le plus cher en production.

---

## 🧒 Avant de commencer : de quoi on parle

> [!tip] En clair
> Dans [[java_memory_model]], on a vu que **chaque thread garde des copies**. Ici, on parle du **deuxième** problème, indépendant du premier :
>
> **Et si deux threads modifient la même chose EN MÊME TEMPS ?**
>
> 🎫 **L'analogie de la caisse du cinéma :**
> - La **visibilité** (note précédente) = « est-ce que je vois combien de places il reste ? »
> - **L'atomicité** (cette note) = « et si deux guichets vendent la **même** place au même moment ? »
>
> Le premier problème est **voir**. Le second est **ne pas se marcher dessus**. Ce sont **deux** problèmes, et on a besoin de **deux** réponses.

**Les mots à connaître pour cette note :**

| Mot technique | En clair |
|---|---|
| **atomicité** | « tout ou rien » : l'opération ne peut pas être coupée en deux |
| **section critique** | le bout de code où **un seul** thread doit passer |
| **verrou** / **lock** | la clé de la section critique |
| **CAS** *(compare-and-swap)* | instruction CPU : « échange **si** la valeur est encore celle que j'ai lue » |
| **deadlock** | deux threads s'attendent **mutuellement**, pour toujours |
| **livelock** | ils bougent, mais **aucun ne progresse** |
| **starvation** | un thread **n'obtient jamais** son tour |
| **contention** | trop de threads se disputent la même ressource (la perf s'effondre) |

Voir aussi : [[java_memory_model]] (le prérequis) et [[java_threads_executors]] (qui exécute tout ça).

---

## Atomicité vs visibilité : deux bugs distincts

> [!tip] En clair
> **Le tableau à garder en tête, il évite la moitié des confusions.**

| | **Visibilité** | **Atomicité** |
|---|---|---|
| Question | « est-ce que je vois la dernière valeur ? » | « deux threads peuvent-ils s'écraser ? » |
| Symptôme | je reste bloqué sur une valeur **ancienne** | je **perds** des mises à jour |
| Cause | cache du cœur / réordonnancement | `lire → modifier → écrire` non protégé |
| Remède | `volatile` | `synchronized`, `Atomic*`, verrous |

> [!warning] Le piège numéro un
> **`volatile` ne règle PAS l'atomicité.** Un compteur `volatile int` incrémenté par plusieurs threads **perd toujours** des incréments. C'est la confusion la plus fréquente, et elle est **silencieuse**.

---

## Le verrou : `synchronized` et sa mécanique

> [!tip] En clair
> 🚪 **L'image : la porte de la cuisine.**
>
> - **Entrer** = prendre la clé (et **vider son plan de travail** : on relit la mémoire partagée).
> - **Sortir** = rendre la clé (et **recopier ce qu'on a fait** dans le frigo : tout devient visible aux autres).
>
> Un seul chef à la fois. **Et** tout ce qu'il a fait devient visible à celui qui entre ensuite.

```java
public class Portefeuille {
    private int solde = 0;

    public synchronized void deposer(int montant) {
        solde += montant;          // lire-modifier-écrire, protégé
    }

    public synchronized int consulter() {
        return solde;
    }
}
```

**Ce que le verrou apporte, et ce qu'il coûte :**

| ✅ Apporte | ❌ Coûte |
|---|---|
| **atomicité** du bloc | contention : les threads **attendent** |
| **visibilité** (`happens-before` à l'entrée/sortie) | risque de **deadlock** |
| simplicité de raisonnement | granularité : trop large = perf effondrée |

### Ce sur quoi on verrouille (et le piège)

> [!warning] Le piège du verrou mal ciblé
> ```java
> private final Object verrouA = new Object();
> private final Object verrouB = new Object();
>
> public void depenser()  { synchronized (verrouA) { solde -= 10; } }
> public void crediter()  { synchronized (verrouB) { solde += 10; } }   // ❌ verrou DIFFÉRENT
> ```
> **Deux verrous différents ne protègent rien.** Les deux méthodes modifient `solde` sans exclusion mutuelle — le bug est **exactement** celui qu'on voulait éviter.
>
> 🔑 **Règle : un verrou par invariant, toujours le même, et on documente lequel.**

**Et le piège du verrou sur `this` :**

```java
public synchronized void faireChose() { ... }   // verrouille sur 'this'
```

⚠️ Si du code **extérieur** fait `synchronized (monObjet)`, il prend **le même** verrou — et peut te bloquer, ou être bloqué par toi. **Préférable :** un objet verrou **privé et `final`**.

```java
private final Object verrou = new Object();     // ✅ personne d'autre ne le voit
public void faireChose() { synchronized (verrou) { ... } }
```

---

## Les verrous explicites : `ReentrantLock`

> [!tip] En clair
> `synchronized` est un **verrou automatique** : on le prend en entrant, on le rend en sortant, même en cas d'exception. Bien pratique.
>
> `ReentrantLock` est un **verrou manuel** (`lock()` / `unlock()`) — plus verbeux, mais il **peut faire des choses que `synchronized` ne sait pas faire**.

| Capacité | `synchronized` | `ReentrantLock` |
|---|---|---|
| Prise automatique | ✅ | ❌ (à faire à la main, dans un `try/finally`) |
| **Timeout** à l'acquisition | ❌ | ✅ `tryLock(1, SECONDS)` |
| **Interruption** pendant l'attente | ❌ | ✅ `lockInterruptibly()` |
| **Équité** (ordre d'arrivée) | ❌ | ✅ `new ReentrantLock(true)` |
| **Plusieurs conditions** (`await`/`signal`) | ✅ (une seule via `wait`/`notify`) | ✅ (autant qu'on veut) |
| Lire/écrire séparés | ❌ | ✅ `ReentrantReadWriteLock` |

> [!warning] Le piège mortel du verrou manuel
> ```java
> lock.lock();
> faireQuelqueChose();     // si ça lance une exception…
> lock.unlock();           // ❌ …jamais exécuté → VERROU JAMAIS RENDU
> ```
> Le verrou reste pris **pour toujours**. Tous les autres threads attendent. **L'application est morte.**
>
> ✅ **Toujours :**
> ```java
> lock.lock();
> try {
>     faireQuelqueChose();
> } finally {
>     lock.unlock();
> }
> ```

> [!tip] L'image du verrou manuel
> C'est comme **emprunter la clé d'un local technique** : il faut **penser à la rendre**, même si un problème t'a fait sortir plus tôt que prévu. `synchronized`, c'est un **portier automatique** qui reprend la clé à la sortie, quoi qu'il arrive.

### `ReadWriteLock` : quand on lit beaucoup

> [!tip] En clair
> 🍽️ **L'analogie :** une **salle de réunion avec une présentation**.
> - **Plusieurs personnes peuvent lire** le tableau en même temps — ça ne pose aucun problème.
> - Mais si **quelqu'un efface le tableau**, tout le monde doit sortir.
>
> ⇒ **Lire** peut se faire à plusieurs ; **écrire** doit être **seul**.

```java
private final ReadWriteLock rw = new ReentrantReadWriteLock();

public String lire(String cle) {
    rw.readLock().lock();
    try { return cache.get(cle); }
    finally { rw.readLock().unlock(); }
}

public void ecrire(String cle, String val) {
    rw.writeLock().lock();
    try { cache.put(cle, val); }
    finally { rw.writeLock().unlock(); }
}
```

**Le gain :** des **milliers** de lectures parallèles au lieu d'une à la fois. **Le coût :** plus complexe, et il faut **lire beaucoup / écrire peu** pour que ce soit rentable.

---

## Les atomics : sans verrou

> [!tip] En clair
> 🔢 **L'image : un compteur mécanique à bras tournant.** Personne ne « réserve » le compteur — mais quel que soit le nombre de personnes qui appuient en même temps, **le total est juste**.
>
> 🔧 **La technique :** *compare-and-swap* (CAS). Une instruction CPU qui dit : **« échange la valeur, mais seulement si elle est encore celle que je viens de lire — sinon refuse, et je recommence »**.

```java
private final AtomicInteger compteur = new AtomicInteger(0);

public void incrementer() {
    compteur.incrementAndGet();      // ✅ atomique, sans verrou
}
```

**La boucle CAS, démontée :**

```
Thread A : lit 5000  →  calcule 5001  →  CAS (5000 → 5001)  ✅ réussi
Thread B : lit 5000  →  calcule 5001  →  CAS (5000 → 5001)  ❌ ÉCHEC (déjà 5001)
                                        └─► relit 5001, calcule 5002, retente ✅

⇒ Aucun incrément perdu. Aucun verrou pris.
```

> [!warning] Le piège du débat : quand le CAS devient plus lent que le verrou
> Sous **très forte** contention, les CAS **échouent en boucle** et se retentent sans cesse → on brûle du CPU pour rien.
>
> **C'est exactement pour ça que `LongAdder` existe** : il **éclate** le compteur en plusieurs cellules (une par thread en pratique) et fait la somme à la lecture.
>
> 🔑 **Le trade-off à citer :** `LongAdder` → écriture **très** rapide, lecture **un peu** plus lente. `AtomicLong` → lecture immédiate, mais écriture qui souffre sous contention.

**Les classes du paquet :**

| Classe | Usage |
|---|---|
| `AtomicInteger` / `AtomicLong` | compteurs, accumulateurs |
| `AtomicReference<V>` | **remplacer une référence** de façon atomique (publier un objet) |
| `AtomicBoolean` | flag d'arrêt, `compareAndSet(false, true)` |
| `LongAdder` / `DoubleAdder` | compteurs **à très forte** contention (métriques) |
| `AtomicIntegerFieldUpdater` | atomique sur un champ d'un objet existant (sans encapsuler) |

> [!tip] Le pattern qui sert partout : `compareAndSet` comme « qui arrive le premier »
> ```java
> private final AtomicBoolean initialise = new AtomicBoolean(false);
>
> public void initialiser() {
>     if (initialise.compareAndSet(false, true)) {
>         // ← UN SEUL thread entre ici, même si 50 appellent en même temps
>         chargerLesDonnees();
>     }
> }
> ```
> C'est le **verrou sans verrou** : pas de blocage, juste « j'ai posé ma main le premier ».

---

## Les structures concurrentes : ne réinvente pas

> [!tip] En clair
> **Le principe :** une `HashMap` partagée **sans protection** peut se corrompre (boucle infinie dans l'ancienne implémentation, données perdues, `ConcurrentModificationException`). Ne bricole pas : **utilise les classes prévues**.

| Besoin | À utiliser | ⚠️ Piège |
|---|---|---|
| Map partagée | **`ConcurrentHashMap`** | les opérations **composées** (`get` puis `put`) restent à sécuriser |
| Compteur par clé | `ConcurrentHashMap` + `merge` / `compute` | ne pas faire `get` puis `put` |
| File producteur/consommateur | **`ArrayBlockingQueue`** / `LinkedBlockingQueue` | jamais une `ArrayList` bricolée |
| File sans attente | `ConcurrentLinkedQueue` | pas de `take()` bloquant |
| Ensemble partagé | `ConcurrentHashMap.newKeySet()` | `Collections.synchronizedSet` est plus lent |
| Copie-à-l'écriture | `CopyOnWriteArrayList` | ✅ si **lecture** massive, ⚠️ sinon catastrophique |

### Le piège de l'opération composée

> [!warning] Le faux sentiment de sécurité
> ```java
> Map<String, Integer> compteurs = new ConcurrentHashMap<>();
>
> // ❌ PAS atomique, MALGRÉ ConcurrentHashMap !
> compteurs.put(cle, compteurs.getOrDefault(cle, 0) + 1);
> ```
> Chaque opération **prise seule** est atomique — mais le **`get` puis `put`** est une **séquence**. Deux threads peuvent lire 5, et écrire 6 tous les deux.
>
> ✅ **Correct — utilise les opérations atomiques intégrées :**
> ```java
> compteurs.merge(cle, 1, Integer::sum);                 // ✅ atomique
> compteurs.compute(cle, (k, v) -> v == null ? 1 : v+1); // ✅ atomique
> ```

> [!tip] `CopyOnWriteArrayList` : le journal d'affichage
> 📋 **L'image :** à chaque modification, on **réimprime tout le journal** et on distribue la nouvelle édition. Les lecteurs gardent leur ancienne copie tant qu'ils la lisent.
>
> - **Parfait** quand on **lit en boucle** et qu'on **écrit rarement** (liste d'écouteurs d'événements).
> - **Catastrophique** si on écrit souvent : chaque `add` **recopie tout** le tableau.

---

## Les pièges qui coûtent le plus cher

### Deadlock — « chacun attend l'autre »

> [!tip] En clair
> 🔀 **L'image du couloir étroit :** Alice tient la poignée gauche de la porte, Bob tient la droite. Aucun ne lâche. **Ils restent là pour toujours.**
>
> 🔧 **Techniquement :** le thread 1 tient le verrou A et attend B ; le thread 2 tient B et attend A.

```java
// ❌ Le deadlock classique
public void transferer(Compte de, Compte vers, int montant) {
    synchronized (de) {
        synchronized (vers) {          // si un autre appel fait vers→de…
            de.retirer(montant);       // …DEADLOCK
            vers.ajouter(montant);
        }
    }
}
```

> [!warning] Les 4 conditions du deadlock (pour le citer en entretien)
> 1. **Exclusion mutuelle** — la ressource n'est utilisable que par un thread.
> 2. **Détention + attente** — un thread tient une ressource et en attend une autre.
> 3. **Pas de préemption** — on ne peut pas lui retirer de force.
> 4. **Attente circulaire** — un cycle d'attente se forme.
>
> **Casser une seule** de ces 4 conditions suffit à éliminer le deadlock.

**Les remèdes concrets :**

| Remède | Comment |
|---|---|
| **Ordre global des verrous** | toujours verrouiller A puis B, **jamais** B puis A |
| **Un seul verrou** | protéger les deux comptes par un verrou commun (plus grossier, plus simple) |
| **`tryLock` avec timeout** | renoncer au bout d'un temps, relâcher, retenter |
| **Éviter les verrous imbriqués** | réduire les sections critiques, ne pas tenir de verrou pendant un appel I/O |

```java
// ✅ Ordre global : on compare une clé stable pour décider l'ordre
Compte premier  = de.id < vers.id ? de : vers;
Compte second   = de.id < vers.id ? vers : de;
synchronized (premier) {
    synchronized (second) { ... }
}
```

### Livelock et starvation

> [!tip] En clair
> - **Livelock** 🤝 — deux personnes se croisent dans un couloir : chacun s'écarte **du même côté** au même moment. **Elles bougent**, mais **aucune ne passe**.
> - **Starvation** 🍽️ — un thread **n'obtient jamais** son tour : à chaque fois qu'il arrive, un autre passe avant. Il attend indéfiniment, **sans être bloqué**.
>
> ⚠️ **Le piège du livelock :** on le **confond avec le deadlock** parce que l'application semble figée. Sauf que le **CPU, lui, tourne à 100 %** — c'est le signe distinctif.

### Contention : le poison silencieux de la performance

> [!tip] En clair
> 🎟️ **L'image du guichet unique :** 200 personnes pour **un seul** guichet → la file s'allonge, et **99 % du temps est passé à attendre**, pas à travailler.
>
> 🔧 **En Java :** plus de threads se disputent le **même** verrou, **moins** la machine est efficace. Au-delà d'un seuil, **ajouter des threads ralentit** l'application.

| Symptôme | Cause probable |
|---|---|
| CPU bas mais application lente | **contention** (les threads attendent) |
| CPU à 100 % mais débit bloqué | **livelock**, ou boucles CAS qui échouent |
| Lenteur qui **empire** avec plus de threads | section critique trop large |

---

## Exemple concret : le réservoir de places

> [!tip] En clair
> **Le même besoin, en trois versions.** Tu vois exactement le coût de chaque choix.

### Le besoin

Un cinéma vend des places. **50 threads** vendent en même temps. Il y a **1000 places**. On veut : **jamais** plus de 1000 vendues, et le plus vite possible.

### ❌ Version 1 — la version « qui marche en test »

```java
public class Caisse {
    private int placesRestantes = 1000;      // ❌ ni volatile, ni atomique

    public boolean vendre() {
        if (placesRestantes > 0) {           // ❌ lire
            placesRestantes--;               // ❌ modifier + écrire
            return true;
        }
        return false;
    }
}
```

```
Résultat observé : 1000 places vendues… mais aussi parfois 1016,
                  et parfois des ventes REFUSÉES à tort.
Cause : 50 threads lisent « > 0 » en même temps, et s'écrasent.
```

### ✅ Version 2 — CAS, sans verrou

```java
public class Caisse {
    private final AtomicInteger places = new AtomicInteger(1000);

    public boolean vendre() {
        int actuelles;
        do {
            actuelles = places.get();
            if (actuelles <= 0) return false;
        } while (!places.compareAndSet(actuelles, actuelles - 1));   // ✅ retente si quelqu'un a bougé
        return true;
    }
}
```

**Comment ça marche :** je lis le nombre, je vérifie qu'il reste des places, et je **tente** de décrémenter — **mais seulement si personne n'a modifié entre-temps**. Sinon, je **relis et je recommence**.

> [!tip] Le détail qui a son importance
> La **vérification `> 0` est DANS la boucle**. C'est **essentiel** : si elle était dehors, on pourrait dépasser 1000 (le fameux « *limite franchie* »). En entretien, c'est **exactement** le genre de détail qu'on regarde.

### ✅ Version 3 — verrou, version « simple et lisible »

```java
public class Caisse {
    private final ReentrantLock verrou = new ReentrantLock();
    private int placesRestantes = 1000;

    public boolean vendre() {
        verrou.lock();
        try {
            if (placesRestantes > 0) {
                placesRestantes--;
                return true;
            }
            return false;
        } finally {
            verrou.unlock();          // ✅ TOUJOURS dans un finally
        }
    }
}
```

**Quel choix ?**

| Contexte | Choix |
|---|---|
| Compteur simple, forte contention | **`AtomicInteger`** (+ retente) |
| Plusieurs invariants à protéger ensemble | **verrou** |
| Lecture massive, écriture rare | **`ReadWriteLock`** |
| Le plus simple à relire et auditer | **`synchronized`** |

> [!warning] Le piège du choix « par défaut »
> Beaucoup choisissent `synchronized` **par réflexe** — c'est souvent **le bon** choix (lisible, sûr). Mais dans un **hot path** à forte contention, un `AtomicInteger` bien placé peut diviser le temps par **dix**. Et inversement : un `Atomic*` mal utilisé **au lieu** d'un verrou fait **perdre** la correction. **Le choix se fait sur l'invariant à protéger, jamais sur la mode.**

---

## Pièges fréquents

> [!tip] En clair
> **Les 6 erreurs à retenir :**
> 1. **`volatile` pour protéger une opération** → il ne donne **pas** l'atomicité.
> 2. **Deux verrous différents pour la même donnée** → aucune protection.
> 3. **`unlock()` hors du `finally`** → verrou jamais rendu, application figée.
> 4. **`get` puis `put` sur une `ConcurrentHashMap`** → la structure est concurrente, pas **ta séquence**.
> 5. **Deadlock par ordre de verrous incohérent** → corriger par un **ordre global**.
> 6. **Section critique trop large** (I/O dedans) → la contention tue les performances.

- **`volatile` pris pour un verrou** — visibilité ≠ atomicité. Réflexe : dès qu'il y a lecture *et* écriture, `Atomic*` ou verrou.
- **Verrou incohérent** — deux objets verrous pour un même invariant. Réflexe : **un** verrou par invariant, `private final`, documenté.
- **`unlock` non protégé par `finally`** — une exception laisse le verrou pris à vie. Réflexe : **toujours** `try { … } finally { unlock(); }`.
- **Opérations composées sur structure concurrente** — `if (!map.contains(k)) map.put(k, v)` n'est pas atomique (⚠️ *check-then-act*). Réflexe : `putIfAbsent`, `computeIfAbsent`, `merge`.
- **Tenir un verrou pendant une I/O** — un appel réseau sous verrou bloque **tous** les threads. Réflexe : lire sous verrou, **agir** dehors.
- **Vérifier une condition `if` au lieu de `while`** avec `wait()/await()` — réveil « fantôme » (`spurious wakeup`) : la condition peut ne plus être vraie. Réflexe : **toujours** `while (!condition) wait();`.
- **Deadlock par ordre inversé** — `transferer(A,B)` et `transferer(B,A)` simultanés. Réflexe : **ordre global** sur un identifiant stable (voir l'exemple).
- **Confondre deadlock et livelock** — le premier **ne consomme rien**, le second **consomme 100 %** du CPU. Réflexe : regarder l'usage CPU pour distinguer.
- **`Thread.stop()` / `suspend()`** — **interdits** depuis Java 8+ (état laissé incohérent). Réflexe : `interrupt()` + vérification coopérative du flag.
- **Croire qu'`interrupt()` arrête le thread** — non : il **pose un drapeau**. Un thread qui ignore `InterruptedException` ne s'arrêtera **jamais**.
- **Attendre un `notify()` qui ne viendra pas** — notifier sans détenteurs du verrou, ou notifier un **autre** verrou. Réflexe : `notifyAll()` plutôt que `notify()` quand plusieurs conditions sont possibles.
- **`synchronized` sur un objet non `final`** — si la référence change, les threads ne partagent plus le même verrou. Réflexe : verrou `final`, jamais réassigné.
- **Réutiliser un `CompletableFuture` comme « cache »** — un future **déjà complété** renvoie toujours le **même** résultat. Réflexe : vérifier l'état avant réutilisation.
- **Optimiser avant de mesurer** — ajouter des verrous « au cas où » peut **ralentir** et **créer** des blocages. Réflexe : [[java_performance_profiling]] avant d'optimiser.

---

## Rappel

> [!question] Question de rappel
> Deux threads exécutent ce code sur une carte partagée. Y a-t-il un problème, et pourquoi la structure « concurrente » ne protège-t-elle pas la logique ?
>
> ```java
> ConcurrentHashMap<String, List<String>> cache = new ConcurrentHashMap<>();
>
> public void ajouter(String cle, String valeur) {
>     if (!cache.containsKey(cle)) {
>         cache.put(cle, new ArrayList<>());
>     }
>     cache.get(cle).add(valeur);
> }
> ```

> [!success]- Réponse
> **Oui, trois problèmes.** ① **`check-then-act`** : `containsKey` puis `put` n'est **pas** atomique — deux threads peuvent tous deux constater l'absence, et l'un **écrase** l'entrée de l'autre (perte silencieuse). ② **La liste est non sûre** : `ArrayList` n'est pas thread-safe ; deux `add` simultanés peuvent **corrompre** la structure interne ou perdre un élément. ③ **La résolution du problème dépend du besoin** : si l'on veut une liste partagée, il faut une structure **concurrente** (`ConcurrentLinkedQueue`, `CopyOnWriteArrayList`) **et** une **création atomique** de l'entrée. **La correction :**
> ```java
> cache.computeIfAbsent(cle, k -> new CopyOnWriteArrayList<>()).add(valeur);
> ```
> `computeIfAbsent` est **atomique** sur la map (le mapping n'est calculé qu'une fois), et la liste est elle-même **sûre**. **La leçon générale :** une structure concurrente protège **ses propres opérations** — jamais **votre séquence** de plusieurs opérations. Dès qu'il y a un `if` suivi d'une modification, il faut une opération **composée** fournie (`computeIfAbsent`, `merge`, `putIfAbsent`) ou un verrou.

### 🎯 Le résumé à retenir

> [!tip] Si tu ne retiens qu'une chose
> **Deux problèmes distincts : voir (visibilité) et se marcher dessus (atomicité).** Deux réponses distinctes.
>
> - **`synchronized`** → atomicité + visibilité, verrou automatique. Le choix **lisible par défaut**.
> - **`ReentrantLock`** → quand il faut un **timeout**, une **interruption** ou l'**équité**. ⚠️ `unlock()` **toujours** dans un `finally`.
> - **`Atomic*` / `LongAdder`** → compteurs sans verrou. `LongAdder` quand l'**écriture** domine.
> - **`ConcurrentHashMap`** → la map est sûre, **ta séquence ne l'est pas** : utiliser `computeIfAbsent` / `merge`.
> - **Deadlock** : verrous en ordre **global**, ou `tryLock`. **Livelock** : CPU à 100 %. **Starvation** : un thread passe **jamais**.
>
> **Le réflexe qui sauve :** d'abord identifier **l'invariant** à protéger (« ce qui doit rester vrai »), ensuite choisir l'outil. Jamais l'inverse.

---

## 🗣️ Les questions qu'on te posera

> [!tip] En clair
> Les questions classiques sur le sujet, et la réponse courte qui résume l'essentiel.

| Si on te demande… | Réponds… |
|---|---|
| **« Visibilité ou atomicité ? »** | « Deux problèmes **distincts** : *voir* la dernière valeur (`volatile`) et *ne pas se marcher dessus* (`synchronized`, `Atomic*`). » |
| **« `synchronized` ou `ReentrantLock` ? »** | « `synchronized` par défaut : automatique, lisible. `ReentrantLock` quand il faut **timeout**, **interruption**, **équité** ou **plusieurs conditions**. » |
| **« Comment éviter un deadlock ? »** | « **Ordre global** des verrous, ou `tryLock` avec timeout. Casser **une** des 4 conditions suffit. » |
| **« Deadlock ou livelock ? »** | « **Deadlock** : CPU **bas**, tout est figé. **Livelock** : CPU à **100 %**, ils bougent mais ne progressent pas. » |
| **« `ConcurrentHashMap` suffit-il ? »** | « Pour **ses** opérations, oui. Pour **votre** séquence `get`-puis-`put`, non → `computeIfAbsent`, `merge`, `putIfAbsent`. » |
| **« `AtomicLong` ou `LongAdder` ? »** | « **Écriture dominante** → `LongAdder` (cellules éclatées, moins de contention CAS). **Lecture immédiate** → `AtomicLong`. » |
| **« Pourquoi `try/finally` sur `unlock` ? »** | « Sinon une exception laisse le verrou pris **à vie** → tous les threads bloqués. » |

> [!tip] La phrase qui tue
> **« Une structure concurrente protège ses opérations, jamais votre séquence : dès qu'il y a un `if` suivi d'une écriture, il faut une opération composée ou un verrou. »**

---

## Voir aussi

- [[java_memory_model]] — le prérequis : visibilité, `happens-before`, `volatile`.
- [[java_threads_executors]] — qui exécute tout ça : pools, virtual threads, `CompletableFuture`.
- [[java_jvm_architecture]] — ce que la JIT fait de votre code concurrent (et les pièges de mesure).
- [[java_performance_profiling]] — diagnostiquer contention et blocages en production.
- [[index]] — carte d'entrée du domaine Java.

## Références

- Brian Goetz et al. — *Java Concurrency in Practice* (la référence : chapitres 2, 4, 5, 10, 11).
- `java.util.concurrent` — Javadoc (les algorithmes et garanties par classe).
- JLS §17 — *Threads and Locks* (mémoire, `wait`/`notify`, interruptions).
- Doug Lea — *Concurrent Programming in Java* (design des structures concurrentes).
- JEP 193 / 266 — *Variable Handles*, *More Concurrency Updates* (`LongAdder`, `VarHandle`).
