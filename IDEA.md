# Knowledge Center

## Objectif

`knowledge-center` est une base de connaissances personnelle construite dans Obsidian.

Son objectif principal n'est pas de produire une documentation exhaustive ou professionnelle.

Son objectif principal est de faciliter :

* la compréhension ;
* l'apprentissage ;
* la mémorisation ;
* la mise en relation des concepts ;
* la réutilisation des connaissances.

Les documents Markdown sont utilisés comme des **nœuds de connaissance**.

Chaque note doit idéalement représenter une idée, un concept, une relation ou une question identifiable.

La base doit progressivement former un réseau de connaissances grâce aux liens Obsidian `[[wikilinks]]`.

---

## Principe fondamental

La documentation doit être construite progressivement avec l'utilisateur.

Le contenu ne doit pas être généré massivement en une seule fois.

Pour un sujet important, le système doit avancer par petites étapes :

1. comprendre le sujet à apprendre ;
2. identifier les concepts nécessaires ;
3. proposer une progression ;
4. étudier une notion ;
5. vérifier ou approfondir la compréhension ;
6. créer ou mettre à jour la note correspondante ;
7. créer les liens avec les autres concepts ;
8. passer progressivement à la notion suivante.

L'utilisateur doit rester impliqué dans le processus.

La base de connaissances doit être le résultat d'un processus d'apprentissage, et non simplement le résultat d'une génération automatique de documents.

---

## Philosophie des notes

Une note doit être considérée comme un **nœud mnémotechnique**.

Elle ne doit pas nécessairement contenir toute l'information disponible sur un sujet.

Elle doit surtout permettre de retrouver rapidement :

* ce qu'est le concept ;
* pourquoi il existe ;
* comment il fonctionne ;
* avec quels autres concepts il est lié ;
* ce qu'il faut retenir.

Une note courte et claire est préférable à une note longue et difficile à comprendre.

Il est préférable d'avoir :

```text
[[Thread]]
[[Thread Pool]]
[[ExecutorService]]
[[CompletableFuture]]
[[Virtual Thread]]
```

avec des liens entre ces notes, plutôt qu'une seule note de plusieurs pages expliquant toute la concurrence Java.

---

## Langage

Le langage doit être simple, direct et facilement compréhensible.

Éviter le jargon inutile.

Lorsqu'un terme technique est nécessaire :

1. conserver le terme technique officiel ;
2. expliquer immédiatement sa signification avec des mots simples ;
3. utiliser un exemple concret lorsque cela aide ;
4. relier le terme aux concepts déjà connus.

Ne jamais supposer automatiquement que l'utilisateur connaît un terme simplement parce qu'il est courant dans le domaine technique.

La précision technique reste importante.

"Simple" ne signifie pas "incorrect" ou "simpliste".

---

## Liens Obsidian

Les liens `[[wikilinks]]` constituent une partie essentielle du système.

Ils doivent permettre de naviguer entre les concepts et de comprendre leurs relations.

Exemple :

```text
[[Producer]] → envoie → [[Message]]
[[Message]] → appartient à → [[Topic]]
[[Topic]] → est divisé en → [[Partition]]
[[Consumer]] → lit → [[Message]]
```

Les liens doivent être utilisés lorsque le concept lié possède une importance réelle pour la compréhension.

Il ne faut pas créer artificiellement des liens pour chaque mot.

Le but est de construire un graphe de connaissances utile, pas de maximiser le nombre de liens.

---

## Progression pédagogique

La base doit pouvoir être construite progressivement.

Une session peut se concentrer sur une seule notion.

Exemple :

```text
Sujet :
Java Concurrency

Progression possible :

[[Processus]]
    ↓
[[Thread]]
    ↓
[[Concurrence]]
    ↓
[[Parallélisme]]
    ↓
[[Thread Pool]]
    ↓
[[ExecutorService]]
    ↓
[[CompletableFuture]]
    ↓
[[Virtual Thread]]
```

Cette progression n'est qu'un exemple.

La structure réelle doit dépendre des connaissances nécessaires pour comprendre le sujet.

---

## Contrôle utilisateur

L'utilisateur doit pouvoir :

* demander une explication ;
* demander une simplification ;
* demander un exemple ;
* demander une analogie ;
* poser une question ;
* revenir à un concept précédent ;
* modifier la progression ;
* demander une nouvelle note ;
* refuser une note proposée ;
* demander la modification d'une note existante ;
* demander le passage à la notion suivante.

Le bot ne doit jamais considérer qu'une demande générale signifie :

> "Génère toute la documentation."

---

## Périmètre du Project

Le Project `knowledge-center` constitue l'espace de travail de la base de connaissances.

Les fichiers de cet espace doivent être considérés comme faisant partie du Knowledge Center.

Les modifications doivent rester limitées à cet espace.

Ne pas modifier des fichiers extérieurs au Project sans demande explicite de l'utilisateur.

---

## Structure générale

La structure des dossiers peut évoluer avec le temps.

Elle doit rester simple.

Exemple :

```text
knowledge-center/
│
├── 00 - Index/
│
├── 01 - Fundamentals/
│
├── 02 - Java/
│
├── 03 - Spring/
│
├── 04 - Architecture/
│
├── 05 - Infrastructure/
│
└── ...
```

La structure des dossiers sert principalement à organiser les fichiers.

Les relations conceptuelles doivent principalement être exprimées par les `[[wikilinks]]`.

Un concept ne doit pas dépendre uniquement de son emplacement dans les dossiers pour être retrouvé.
