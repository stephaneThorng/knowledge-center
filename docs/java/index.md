---
title: Java
aliases: [Index Java, Java index, Java avance]
tags: [java, jvm, moc, index, navigation, concurrence]
domaine: java
niveau: avance
statut: draft
cree: 2026-10-14
sources: [JLS, JSR-133, JVM Specification, Java Concurrency in Practice]
---

# Java

> [!abstract] Ancre
> Carte d'entrée du domaine **Java** : la théorie qui se cache **sous** le code qu'on écrit tous les jours — modèle mémoire, concurrence, JVM, ramasse-miettes.

---

## 🧒 Avant de commencer : comment lire ce dossier

> [!tip] En clair
> Ce dossier n'est **pas** un cours de langage. Il ne parle pas de syntaxe ni de collections de base.
>
> Il répond à une autre question : **« qu'est-ce qui se passe vraiment quand je lance mon programme ? »**
>
> C'est la théorie qu'on n'apprend pas en « pompier » sur un projet — et c'est exactement celle qui fait la différence en entretien **senior**.

**Pourquoi ce dossier existe :**

> [!tip] En clair
> On peut écrire du Java **pendant 15 ans** sans jamais comprendre :
> - pourquoi un bug concurrent **ne se reproduit jamais** en test ;
> - pourquoi `volatile` ne suffit **pas** à incrémenter un compteur ;
> - pourquoi la JVM **chauffe** (et ce que fait la JIT pendant ce temps) ;
> - où part la mémoire, et pourquoi il y a des **pauses**.
>
> **Chaque note de ce dossier répond à une de ces questions — avec des images, pas seulement des formules.**

---

## Parcours conseillé

1. **[[java_memory_model]]** — ⭐ **commence ici** : heap, stack, et la règle `happens-before`. **Débloque tout le reste.**
2. **[[java_jmm_concurrency]]** — le modèle mémoire **appliqué** : atomics, verrous, deadlocks, collections concurrentes.
3. **[[java_threads_executors]]** — threads, pools, **virtual threads** (Loom), `CompletableFuture`.
4. **[[java_jvm_architecture]]** — chargement des classes, **JIT**, ce qui se passe au lancement.
5. **[[java_garbage_collection]]** — générations, G1/ZGC, **comment diagnostiquer une fuite**.
6. **[[java_performance_profiling]]** — JFR, async-profiler, **méthode de diagnostic**.

---

## Carte du domaine

| Note | En une phrase |
|---|---|
| [[java_memory_model]] | Le contrat de visibilité entre threads : heap/stack, `happens-before`, `volatile`. |
| [[java_jmm_concurrency]] | Le JMM en pratique : atomicité, verrous, deadlocks, structures concurrentes. |
| [[java_threads_executors]] | Créer, piloter et dimensionner l'exécution concurrente. |
| [[java_jvm_architecture]] | Comment la JVM charge, compile (JIT) et exécute votre code. |
| [[java_garbage_collection]] | Le ramasse-miettes : générations, collecteurs, fuites mémoire. |
| [[java_performance_profiling]] | Mesurer avant d'optimiser : profiler, JFR, flamegraphs. |

---

## Les idées transverses

> [!tip] En clair
> Certaines idées reviennent dans **plusieurs** notes. Les voici, pour ne pas les redécouvrir à chaque fois.

| Idée | Où on la retrouve |
|---|---|
| **Le thread garde des copies** | [[java_memory_model]], [[java_jmm_concurrency]] |
| **Le coût de l'atomicité** | [[java_jmm_concurrency]], [[java_performance_profiling]] |
| **L'allocation est le vrai coût** | [[java_garbage_collection]], [[java_performance_profiling]] |
| **La JIT change le comportement dans le temps** | [[java_jvm_architecture]], [[java_performance_profiling]] |
| **La concurrence est un problème de *contrat*, pas de code** | [[java_memory_model]], [[java_jmm_concurrency]] |

---

## Voir aussi

- [[../security/index]] — l'autre grand domaine du vault (identité, protocoles, IAM).
- [[index]] — accueil du site.

## Références

- JLS — *Java Language Specification* (en particulier §17, *Threads and Locks*).
- JSR-133 — *Java Memory Model and Thread Specification*.
- JVMS — *Java Virtual Machine Specification*.
- Brian Goetz et al. — *Java Concurrency in Practice*.
- Scott Oaks — *Java Performance: The Definitive Guide*.
