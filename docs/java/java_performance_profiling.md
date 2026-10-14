---
title: "Mesurer et profiler : JFR, flamegraphs et méthode de diagnostic"
aliases: [profiling Java, JFR, Java Flight Recorder, async-profiler, flamegraph, benchmark JMH, diagnostic performance]
tags: [java, jvm, performance, profiling, jfr, diagnostic, benchmark]
domaine: java
niveau: avance
statut: draft
cree: 2026-10-14
sources: [JEP 328, Oracle JFR Docs, async-profiler, JMH, Java Performance - Scott Oaks]
---

# Mesurer et profiler : JFR, flamegraphs et méthode de diagnostic

> [!abstract] Ancre
> **On n'optimise pas ce qu'on n'a pas mesuré.** Cette note donne la **méthode** : quelle question poser, quel outil utiliser, et comment lire un **flamegraph** sans se tromper de cible. C'est la note qui manque le plus souvent — et celle qui distingue un senior d'un bricoleur.

---

## 🧒 Avant de commencer : de quoi on parle

> [!tip] En clair
> 🚗 **L'analogie du garagiste :**
>
> - Un **mauvais** garagiste **remplace des pièces au hasard** (« ça doit être la pompe »). Il facture, et le problème reste.
> - Un **bon** garagiste **branche la valise de diagnostic**, **lit les données**, et **sait** quelle pièce est en cause **avant** de démonter.
>
> 🔑 **Cette note, c'est la valise de diagnostic.** Les notes précédentes expliquaient **comment ça marche** ; celle-ci explique **comment savoir ce qui ne va pas**.

**Les mots à connaître pour cette note :**

| Mot technique | En clair |
|---|---|
| **profilage** | observer un programme **en train de tourner** pour voir **où passe le temps** |
| **sampling** | échantillonner la pile d'appels **périodiquement** (léger, statistique) |
| **instrumentation** | compter **chaque** appel (précis, mais lourd) |
| **flamegraph** | une **image** de la pile d'appels où la **largeur** = le temps passé |
| **JFR** *(Java Flight Recorder)* | l'enregistreur **intégré** à la JVM, très léger |
| **JMH** | le harnais **officiel** de micro-benchmark |
| **latence** | temps d'**une** requête |
| **débit** *(throughput)* | nombre de requêtes par seconde |
| **p99 / p999** | le **centile** : « 99 % des requêtes sont plus rapides que ça » |
| **bottleneck** | le **goulot d'étranglement** : ce qui limite tout le reste |

Voir aussi : [[java_jvm_architecture]] (warmup, JIT) et [[java_garbage_collection]] (pauses).

---

## La règle d'or : mesurer, pas deviner

> [!tip] En clair
> **La performance n'est pas intuitive.** Le code qui « a l'air lent » ne l'est presque jamais. La vraie lenteur est **presque toujours** ailleurs :
>
> - dans une **allocation** qui déclenche des GC ;
> - dans un **appel réseau** qu'on n'a pas vu ;
> - dans une **requête SQL** sans index ;
> - dans une **sérialisation** (JSON, XML) ;
> - dans une **synchronisation** sous contention ;
> - dans un **log** mal configuré.
>
> 🔑 **Le réflexe de senior :** devant « c'est lent », **ne pas toucher au code**. D'abord : *« lent comment ? mesuré comment ? dans quel scénario ? »*

> [!warning] Les trois questions avant TOUTE optimisation
> **1. Est-ce que ça compte ?** — le module lent est-il dans le chemin **critique**, ou appelé une fois par nuit ?
> **2. C'est mesuré comment ?** — un chrono maison ne vaut rien ([[java_jvm_architecture]]) ; il faut un **benchmark** ou un **profiler**.
> **3. Quel est le goulot ?** — optimiser une partie qui n'est **pas** le goulot ne change **rien** au résultat, et ajoute de la complexité.

**La loi d'Amdahl, en une phrase :**

> [!tip] En clair
> **Si tu optimises une partie qui représente 10 % du temps, ton gain maximal est de 10 %** — même si tu la rends **infiniment** rapide.
>
> 🔑 **Conséquence :** optimiser **la bonne partie** vaut 10 fois plus qu'optimiser **une partie au hasard**. C'est pour ça qu'on **profile d'abord**.

---

## Les deux familles d'outils

> [!tip] En clair
> | | **Échantillonnage** *(sampling)* | **Instrumentation** |
> |---|---|---|
> | Comment | on **photographie** la pile toutes les X ms | on **compte chaque appel** |
> | Précision | statistique (≈ suffisante) | exacte |
> | Coût | **très faible** (utilisable en prod) | élevé |
> | Biais | méthodes **courtes** sous-représentées | fausses pistes (surcoût) |
>
> ✅ **En production : toujours de l'échantillonnage.** L'instrumentation fausse ce qu'elle mesure.

**Les outils à connaître :**

| Outil | Type | Usage |
|---|---|---|
| **JFR** *(Java Flight Recorder)* | échantillonnage **intégré**, très léger | ⭐ **production** : CPU, allocation, GC, I/O, verrous |
| **async-profiler** | échantillonnage, inclut le **natif** | ⭐ **flamegraphs** précis, y compris hors JVM |
| **JMC** *(Mission Control)* | interface d'analyse de JFR | lire un enregistrement JFR |
| **JMH** | harnais de **micro-benchmark** | mesurer **une** méthode correctement |
| `jcmd` / `jmap` / `jstack` | inspection ponctuelle | heap, threads, état instantané |

> [!tip] Pourquoi JFR change la donne
> Avant, profiler en production était **impensable** (trop lourd). JFR tourne **en continu** avec un surcoût **~1 %** — on peut donc l'activer **en permanence**, et **remonter le temps** : quand un incident arrive, on a **déjà** les données.
>
> ✅ C'est **l'outil par défaut** à activer sur tout serveur Java de production.

---

## Lire un flamegraph (sans se tromper de cible)

> [!tip] En clair
> 🗺️ **Comment lire l'image — les 3 règles qui évitent 90 % des erreurs.**
>
> **① La largeur = le temps.** Une barre **large** = beaucoup de temps passé. Une barre **fine** = négligeable, **même si elle est tout en hauteur**.
>
> **② La hauteur ≠ la lenteur.** En haut = **plus profond** dans la pile d'appels. Une colonne **très haute** signifie juste une chaîne d'appels profonde — pas une lenteur.
>
> **③ On lit de haut en bas, et on cherche les barres LARGES.** La cible est **toujours** la barre large du **haut**.

```
                    ┌──── main ────────────────────────────────────┐
                    │                                             │
        ┌───────────┴──────────┐                ┌─────────────────┴─────┐
        │   traiterRequete     │                │      initialiser      │  ← 👀 LARGE = à optimiser
        │   (la vraie cible)   │                │      (~60% du temps)  │
        └───────────┬──────────┘                └───────────────────────┘
        ┌───────────┴───────────┐
        │     parserJson        │
        └───────────────────────┘
   ← la barre fine au-dessus = négligeable, NE PAS y toucher
```

> [!warning] Le piège classique du flamegraph
> **Une méthode au sommet d'une pile haute attire l'œil** — c'est **exactement** le piège. On optimise une méthode qui apparaît partout mais qui prend **0,2 %** du temps.
>
> ✅ **La règle :** cherche la **barre la plus large**, pas la **plus haute**. Et vérifie qu'elle est bien dans le **chemin critique**.

**Ce qu'un flamegraph **ne** dit pas :**

| Le flamegraph dit… | Le flamegraph **ne dit pas**… |
|---|---|
| où le **CPU** passe du temps | pourquoi une méthode **attend** (blocage I/O) |
| les **chemins** d'appels | combien de **mémoire** est allouée (⇒ profil d'allocation) |
| ce qui **chauffe** | le **temps réel** vs le temps **CPU** |

> [!note] Le piège « temps CPU » vs « temps réel »
> Un thread qui **attend** une réponse réseau **ne consomme pas de CPU** — il n'apparaîtra donc **pas** sur un flamegraph CPU.
>
> 🔑 **Conséquence :** si ton application est **lente** mais que le flamegraph CPU est **plat**, le problème est un **attente** (I/O, verrou, pool saturé). Il faut alors regarder le **profil de latence** (JFR : *socket I/O*, *file I/O*, *monitor blocked*), **pas** le CPU.

---

## JFR : la boîte noire de la JVM

> [!tip] En clair
> ✈️ **L'analogie de la boîte noire d'avion :** elle n'est **pas** un outil d'atelier, elle enregistre **en permanence**, sans perturber le vol. Quand quelque chose se passe, on a **déjà** les données.
>
> 🔧 **JFR fait exactement ça pour la JVM.**

**Activer JFR en production :**

| Méthode | Commande / flag |
|---|---|
| **Au démarrage** | `-XX:StartFlightRecording=filename=app.jfr,duration=0,maxsize=512m` |
| **À chaud, sur une JVM qui tourne** | `jcmd <pid> JFR.start duration=5m filename=app.jfr` |
| **Arrêter / dumpler** | `jcmd <pid> JFR.dump filename=app.jfr` |
| **Analyser** | ouvrir dans **JDK Mission Control (JMC)** |

**Ce que JFR enregistre (les événements qui servent) :**

| Événement | Ce qu'il révèle |
|---|---|
| **Execution Sample** | où le **CPU** passe (⇒ flamegraph) |
| **Allocation in new TLAB** | **qui alloue** — la cause n°1 des problèmes de GC |
| **GC Phase / Heap Summary** | pauses, promotions, état du heap |
| **Socket Read / Write** | **attentes réseau** (invisibles au profiler CPU !) |
| **Monitor Blocked / Java Monitor Enter** | **contention** : qui attend un verrou |
| **Thread Park** | threads en **attente** (pools, `Future.get`) |
| **Exception Statistics** | exceptions **lancées en masse** (souvent un anti-pattern) |

> [!warning] Le profil d'ALLOCATION : l'angle mort du profiling CPU
> **Une allocation ne consomme presque pas de CPU.** Donc un profiler CPU **ne la voit pas**. Pourtant, c'est **souvent** la vraie cause : allocations massives → GC fréquents → pauses → latence.
>
> 🔑 **Réflexe :** dès qu'il y a des **pauses GC** importantes, regarder le **profil d'allocation JFR**, pas le CPU. Chercher **qui alloue le plus** (souvent : concaténation de chaînes, boxing, `stream` mal placés, sérialisation, copies de tableaux).

---

## La méthode de diagnostic, en 5 étapes

> [!tip] En clair
> 🧭 **La démarche, dans l'ordre.** C'est **la** compétence qu'on évalue.

```
① QUALIFIER le problème
   Quelle opération ? latence ou débit ? p50 ou p99 ? dans quel scénario ?

② MESURER proprement
   Benchmark (JMH) si c'est une méthode, JFR si c'est l'application.
   ⚠️ Application CHAUDE, charge réelle.

③ TROUVER le goulot
   Flamegraph CPU ? profil d'allocation ? attentes I/O ? contention ?
   ⚠️ Chercher la BARRE LARGE, pas la haute.

④ CORRIGER la vraie cause
   Une seule chose à la fois. Et MESURER après.

⑤ VÉRIFIER
   Le gain est-il réel ? Au prix de quoi (mémoire, complexité, lisibilité) ?
```

> [!warning] L'erreur la plus fréquente en étape ③
> Se précipiter sur un **flamegraph CPU** alors que le problème est une **attente**. Les symptômes de gêne :

| Symptôme | Où chercher |
|---|---|
| **CPU bas**, application **lente** | **attentes** : I/O, verrou, pool, `Future.get` |
| **CPU à 100 %**, débit **bloqué** | boucle CAS qui échoue, livelock, algorithme inefficace |
| **Pauses régulières** | GC (⇒ [[java_garbage_collection]]) |
| **Latence p99 énorme, p50 correcte** | contention, files d'attente, GC |
| **Lenteur qui augmente avec la charge** | **contention**, ou aval saturé |

> [!tip] Le p99 : la métrique qui compte vraiment
> **La moyenne ment.** Une API à **10 ms de moyenne** mais **2 s au p99** paraît correcte en moyenne — et **détruit** l'expérience utilisateur.
>
> 🔑 **Toujours regarder p95 / p99 / p999**, jamais seulement la moyenne. Et **se méfier** d'un p50 parfait avec un p99 catastrophique : c'est la signature d'une **contention**, pas d'un algorithme lent.

---

## JMH : mesurer une méthode correctement

> [!tip] En clair
> 🧪 **JMH** est le harnais **officiel** (OpenJDK) pour micro-benchmarker. Il gère **tout** ce qui rend un benchmark maison faux : warmup, code mort, compilation en cours de mesure.

```java
@Benchmark
@BenchmarkMode(Mode.AverageTime)
@OutputTimeUnit(TimeUnit.MICROSECONDS)
@Warmup(iterations = 5, time = 1)      // ✅ laisse la JVM chauffer
@Measurement(iterations = 10, time = 1)
@Fork(2)                                // ✅ 2 JVM séparées (isolation)
@State(Scope.Thread)
public class MonBenchmark {

    private List<String> donnees;

    @Setup
    public void preparer() { donnees = generer(); }

    @Benchmark
    public int parcourir() {
        int total = 0;
        for (String s : donnees) total += s.length();
        return total;                   // ✅ le résultat est CONSOMMÉ (pas de code mort)
    }
}
```

**Ce que JMH gère pour toi :**

| Problème du benchmark maison | Ce que JMH fait |
|---|---|
| La JVM n'a pas chauffé | **warmup** explicite (5 itérations) |
| Le code mesuré est supprimé | **Blackhole** : le résultat est **consommé** |
| La compilation tombe pendant la mesure | itérations de **warmup** séparées |
| L'état est partagé entre benchmarks | `@State` + `Scope` |
| Une seule JVM fausse la mesure | **`@Fork`** : plusieurs JVM isolées |

> [!warning] Le piège du « j'ai optimisé, c'est 2× plus rapide »
> **Sans JMH, ce genre de conclusion est presque toujours fausse** — parce que :
> - la variance entre deux runs peut être de **30 %** ;
> - la JIT a pu optimiser **une** version et pas l'autre ;
> - le code « optimisé » n'a peut-être **jamais** été exécuté (supprimé comme code mort).
>
> ✅ **Réflexe :** une affirmation de performance sans **méthode de mesure** explicite n'est **pas** une donnée. C'est une impression.

---

## Exemple concret : « notre API est lente »

> [!tip] En clair
> **Le scénario le plus courant**, déroulé avec la méthode complète.

### Le ticket

> *« L'API `/commandes` est lente depuis la mise en production. Le CPU est à 15 %. »*

### Le piège immédiat

❗ **CPU à 15 %** ⇒ **ce n'est pas** un problème de calcul. Un flamegraph CPU ne montrera **rien**. Il faut chercher une **attente**.

### Étape ① — qualifier

```
Question : latence ou débit ?
Réponse  : les deux, mais surtout la LATENCE.
Mesure   : p50 = 40 ms (correct), p99 = 3 200 ms (catastrophique)
⇒ 1 % des requêtes prennent 80× plus de temps que la médiane.
```

> [!tip] Ce que le profil de latence nous dit déjà
> Un **p50 correct avec un p99 énorme** est la **signature** d'une **contention** ou d'une **file d'attente** — pas d'un algorithme lent (qui ralentirait **tout le monde**).
>
> 🔑 **C'est déjà une hypothèse forte, avant même d'ouvrir un profiler.**

### Étape ② — mesurer (JFR en production)

```
jcmd <pid> JFR.start duration=5m filename=prod.jfr
```

### Étape ③ — trouver le goulot

Dans **JMC**, en regardant les événements :

| Événement JFR | Observation |
|---|---|
| **Execution Sample (CPU)** | plat — **aucune** méthode ne consomme de CPU ✅ (cohérent avec 15 %) |
| **Socket Read** | 40 ms en médiane… **mais jusqu'à 3 s au maximum** |
| **Thread Park** | des dizaines de threads parkés, en attente |
| **GC Phase** | **pauses de 2,8 s** toutes les ~30 minutes |

**⇒ Deux causes identifiées, et ce n'est pas le code métier :**

```
CAUSE A : pauses GC de 2,8 s
  → un Full GC survient périodiquement
  → pendant ce temps, TOUTES les requêtes en cours prennent +2,8 s
  → ✅ explique parfaitement le p99 catastrophique

CAUSE B : appels socket jusqu'à 3 s
  → une dépendance externe lente (ou un pool de connexions saturé)
```

### Étape ④ — corriger

| Cause | Correctif |
|---|---|
| **Full GC** | profil d'allocation → **cache non borné** qui remplit le Old → **borner le cache** (voir [[java_garbage_collection]]) |
| **Appels socket lents** | vérifier le **pool HTTP** (taille, timeouts), et poser un **timeout** côté client |

> [!warning] Ce que ça démontre
> **Le réflexe aurait été d'optimiser le code métier** — et ça n'aurait **rien** changé : il ne consommait **pas** de CPU, et le problème était **hors de lui**.
>
> 🔑 **La leçon :** *« CPU bas + latence haute = attente, pas calcul »*. C'est **la** règle de tri qui oriente tout le diagnostic.

### Étape ⑤ — vérifier

```
AVANT : p50 = 40 ms   p99 = 3 200 ms
APRÈS : p50 = 38 ms   p99 = 95 ms      ✅ p99 divisé par 33, p50 inchangé

⇒ Confirme l'hypothèse : on a corrigé l'attente,
  pas le calcul (le p50 n'a pas bougé — normal).
```

---

## Pièges fréquents

> [!tip] En clair
> **Les 6 erreurs à retenir :**
> 1. **Optimiser sans mesurer** → on optimise la mauvaise partie.
> 2. **Benchmark maison** → la JIT fausse tout, ou supprime le code.
> 3. **Regarder la moyenne** → le p99 est ce qui fait mal.
> 4. **Optimiser une barre fine du flamegraph** → 0,2 % du temps, pour rien.
> 5. **Profiler le CPU alors que c'est une attente** → flamegraph plat, aucune piste.
> 6. **Ignorer le profil d'allocation** → les allocations ne coûtent pas de CPU, mais déclenchent les GC.

- **Optimiser sans mesurer** — « ça a l'air lent ici ». Réflexe : **JMH** ou **JFR** **avant** toute modification.
- **Benchmark sans `@Fork` / sans warmup** — la JIT n'a pas optimisé, ou a optimisé une seule version. Réflexe : **JMH**, jamais `nanoTime()` maison ([[java_jvm_architecture]]).
- **Se fier à la moyenne** — une moyenne de 10 ms peut cacher un p99 à 3 s. Réflexe : **p50 / p95 / p99 / p999**, toujours.
- **Chercher la barre haute du flamegraph** — c'est le piège visuel n°1. Réflexe : la **plus large**.
- **Oublier le temps d'attente** — un profiler **CPU** ne voit pas les blocages I/O, verrous, `Future.get`. Réflexe : croiser avec **Thread Park**, **Socket Read**, **Monitor Blocked** (JFR).
- **Confondre temps CPU et temps réel** — 50 % de CPU ne veut pas dire 50 % de capacité utilisée. Réflexe : mesurer la **latence**, pas seulement le CPU.
- **Oublier les allocations** — elles ne coûtent presque **pas** de CPU, mais remplissent le heap. Réflexe : **profil d'allocation JFR** dès qu'il y a des pauses GC.
- **Optimiser hors du chemin critique** — améliorer un code appelé **une fois par nuit**. Réflexe : **vérifier** que le code chaud est bien **appelé** dans ton scénario.
- **Micro-optimiser avant l'architecture** — gagner 5 % sur une méthode quand l'algorithme est **O(n²)**. Réflexe : regarder d'abord la **complexité** et le **nombre d'appels** (N+1 en base !).
- **Le problème « N+1 requêtes »** — 1 requête pour la liste, puis 1 par élément. **Souvent invisible en profiler CPU**, mais **catastrophique** en latence. Réflexe : compter les **requêtes SQL**, pas seulement le CPU.
- **Ne pas profiler en production** — les charges de test **ne reproduisent pas** la réalité (données, caches, contention). Réflexe : **JFR en continu** (~1 % de surcoût) pour avoir les données **au moment de l'incident**.
- **Tuner les JVM flags au hasard** — 15 flags copiés d'un blog de 2013. Réflexe : **mesurer**, changer **une** chose, re-mesurer.
- **Oublier de vérifier le gain** — « ça devrait être plus rapide ». Réflexe : **re-mesurer après**, et **comparer** p50 **et** p99.
- **Ajouter un cache comme premier réflexe** — masque le symptôme, ajoute de la complexité, et introduit des bugs de fraîcheur. Réflexe : comprendre **d'abord** la cause du temps passé.

---

## Rappel

> [!question] Question de rappel
> Une API présente un CPU à 15 % et un p50 de 40 ms, mais un p99 de 3 200 ms. Un développeur propose d'optimiser l'algorithme de calcul du total de la commande. **Est-ce la bonne piste ?** Quelle démarche suit-on, et quelle hypothèse le profil de latence suggère-t-il **avant même** de profiler ?

> [!success]- Réponse
> **Non, ce n'est probablement pas la bonne piste — et le profil de latence le suggère déjà.** Trois signaux convergent : ① le **CPU est bas (15 %)** ⇒ le temps n'est **pas** passé en calcul, donc optimiser du calcul ne peut **rien** apporter ; ② le **p50 est correct** ⇒ l'algorithme se comporte bien dans **99 %** des cas (s'il était lent, **toutes** les requêtes seraient lentes) ; ③ le **p99 est 80 fois le p50** ⇒ c'est la **signature d'une contention ou d'une attente ponctuelle** : un verrou disputé, une file qui se remplit, des pauses GC, ou une dépendance externe lente pendant un pic. **La démarche :** ① **qualifier** (latence ou débit ? sur quelle opération ?) ; ② **mesurer** avec **JFR en production** (pas en test — la contention ne se reproduit pas à faible charge) ; ③ **chercher** dans les événements : *GC Phase* (pauses), *Socket Read* (attentes réseau), *Monitor Blocked* / *Thread Park* (contention, pools) ; ④ **corriger la cause identifiée**, une seule chose à la fois ; ⑤ **re-mesurer** et **comparer le p99**. **Le point clé :** un **profiler CPU** ne montrera **rien** ici — puisque le temps passé n'est **pas** du CPU. C'est exactement l'erreur à ne pas commettre : *« CPU bas + latence haute = attente, pas calcul »*. Si l'on optimisait le calcul du total, le p99 ne bougerait **pas** — et le développeur concluerait à tort que « l'optimisation n'a servi à rien ».

### 🎯 Le résumé à retenir

> [!tip] Si tu ne retiens qu'une chose
> **On ne devine pas la performance : on la mesure.**
>
> - **Devant « c'est lent »** : ne pas toucher au code. Demander *« lent comment, mesuré comment ? »*
> - **CPU bas + latence haute = attente, pas calcul** ⇐ *la règle de tri.*
> - **JFR en production** : ~1 % de coût, tourne en continu → les données sont là **avant** l'incident.
> - **Flamegraph** : chercher la barre **LARGE**, pas la **haute**. La hauteur n'est que la profondeur des appels.
> - **Le p99 est la vraie métrique.** La moyenne ment.
> - **Le profil d'allocation** est l'angle mort du profiling CPU — et la cause fréquente des pauses.
> - **JMH** pour les micro-benchmarks. **Jamais** de `nanoTime()` maison.
> - **Un gain n'est prouvé que re-mesuré.**
>
> **Et la loi d'Amdahl :** optimiser 10 % du temps donne **au mieux** 10 % de gain. D'où la nécessité de trouver **le bon** goulot.

---

## 🗣️ Les questions qu'on te posera

> [!tip] En clair
> Les questions classiques sur le sujet, et la réponse courte qui résume l'essentiel.

| Si on te demande… | Réponds… |
|---|---|
| **« Comment tu diagnostiques une lenteur ? »** | « Je **qualifie** (latence ou débit, quel scénario), je **mesure** avec JFR, je cherche le **goulot**, je corrige **une** cause, je **re-mesure**. » |
| **« L'application est lente mais le CPU est bas ? »** | « ⇒ Ce n'est **pas** du calcul : c'est une **attente** (I/O, verrou, pool, GC). Un profiler CPU ne montrera **rien**. » |
| **« Comment lire un flamegraph ? »** | « La **largeur** = le temps. La **hauteur** = la profondeur des appels, pas la lenteur. Chercher la barre **large**, pas la haute. » |
| **« Moyenne ou p99 ? »** | « Le **p99** : la moyenne masque les pics — une API à 10 ms de moyenne et 2 s au p99 détruit l'expérience. » |
| **« C'est quoi JFR ? »** | « L'enregistreur **intégré** à la JVM, ~1 % de surcoût : CPU, allocation, GC, I/O, verrous. Utilisable **en production**, en continu. » |
| **« Pourquoi JMH ? »** | « Un benchmark maison est faux : la JIT n'a pas chauffé, ou **supprime le code mesuré**. JMH gère warmup, code mort et forks. » |
| **« Où est le piège du profiling CPU ? »** | « Les **allocations** ne coûtent presque **pas** de CPU, mais **remplissent le heap** → pauses GC. D'où le **profil d'allocation** JFR. » |

> [!tip] La phrase qui tue
> **« CPU bas + latence haute = attente, pas calcul — et optimiser une partie qui n'est pas le goulot ne change rien au résultat. »**

---

## Voir aussi

- [[java_jvm_architecture]] — warmup, JIT : pourquoi un benchmark naïf ment.
- [[java_garbage_collection]] — pauses, fuites, heap dump : le diagnostic mémoire.
- [[java_threads_executors]] — pools saturés, contention, `Future.get` bloquant.
- [[java_jmm_concurrency]] — verrous et contention : ce que *Monitor Blocked* révèle.
- [[index]] — carte d'entrée du domaine Java.

## Références

- JEP 328 — *Flight Recorder* (JFR intégré à OpenJDK depuis Java 11).
- Oracle — *JDK Flight Recorder* et *JDK Mission Control* (documentation et tutoriels `jcmd`).
- async-profiler — profiler à faible surcoût, flamegraphs incluant le code natif.
- **JMH** — *Java Microbenchmark Harness* (OpenJDK), la référence pour mesurer.
- Scott Oaks — *Java Performance: The Definitive Guide* (méthode de diagnostic, JFR, JMH).
- Brendan Gregg — *Flame Graphs* et *Systems Performance* (lecture des profilages).
