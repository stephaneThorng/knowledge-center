---
title: Les attributs SAML : émission et mapping
aliases: [AttributeStatement, Attribute Mapper, Attributs SAML, Mapping attributs, RequestedAttribute, memberOf, Attributs IdP, Surcharge par SP]
tags: [saml, federation, sso, attributs, mapper, mapping, autorisation, assertion]
domaine: securite/saml
niveau: intermediaire
statut: draft
cree: 2026-10-14
sources: [SAML 2.0 Core, SAML 2.0 Metadata, SAML 2.0 Profiles]
---

# Les attributs SAML : émission et mapping

> [!abstract] Ancre
> Au-delà du `NameID` (qui **identifie**), une assertion transporte un bloc d'**attributs** qui **décrivent** l'utilisateur : email, nom, rôles, groupes. Leur émission se configure à **deux niveaux côté IdP** — un mapping global, et une **surcharge par SP** — et le SP, lui, **ne demande rien** : il lit.

---

## 🧒 Avant de commencer : de quoi on parle

> [!tip] En clair
> Une assertion SAML a **deux canaux d'information**, distincts :
>
> - le **`NameID`** → **UNE** valeur → « **qui** es-tu ? »
> - l'**`AttributeStatement`** → **PLUSIEURS** valeurs → « **que sais-tu / à quoi as-tu droit ?** »
>
> 🔑 **L'analogie du badge d'accès :** le `NameID`, c'est **le numéro de badge**. Les attributs, c'est **tout ce qui est écrit dessus** : ton nom, ton service, ton niveau d'accès, ta couleur de badge. Le numéro dit **qui tu es** ; le reste dit **ce que tu peux faire**.

**Les mots à connaître pour cette note :**

| Mot technique | En clair |
|---|---|
| **`AttributeStatement`** | le **bloc d'attributs** dans l'assertion |
| **`Attribute`** | un attribut, avec un **nom** et **une ou plusieurs valeurs** |
| **`Name`** | le **nom** de l'attribut (`mail`, `role`, `memberOf`…) |
| **`NameFormat`** | la **convention de nommage** utilisée (souvent `basic`) |
| **Attribute Mapper** | la **règle** : « mon champ d'annuaire → je le nomme tel attribut » |
| **`RequestedAttribute`** | un attribut **déclaré comme souhaité** dans les métadonnées — **indicatif**, pas contraignant |
| **`memberOf`** | l'attribut classique des **groupes** dans un annuaire |

Voir aussi : [[saml_nameid]] (le canal identifiant), [[saml_message_examples]] (lire un `AttributeStatement` dans une trame).

---

## Les deux canaux de l'assertion

> [!tip] En clair
> Ne jamais confondre les deux : ils n'ont **ni le même rôle**, **ni la même importance**.

| | **`NameID`** | **`AttributeStatement`** |
|---|---|---|
| Combien de valeurs ? | **une seule** | **plusieurs** |
| Rôle | **identifie** l'utilisateur | **décrit** l'utilisateur |
| Si absent ? | ❌ l'assertion est **inutilisable** | ⚠️ ça **peut passer** — mais sans rôles |
| Le SP en a besoin pour | **trouver** le compte | **autoriser** l'accès |

```xml
<saml:Assertion>
  <saml:Subject>
    <saml:NameID Format="...unspecified">12847</saml:NameID>   <!-- QUI -->
  </saml:Subject>

  <saml:AttributeStatement>                                     <!-- QUOI / QUELS DROITS -->
    <saml:Attribute Name="mail" NameFormat="urn:oasis:names:tc:SAML:2.0:attrname-format:basic">
      <saml:AttributeValue>alice@exemple.com</saml:AttributeValue>
    </saml:Attribute>
    <saml:Attribute Name="role">
      <saml:AttributeValue>APP_ADMIN</saml:AttributeValue>
    </saml:Attribute>
  </saml:AttributeStatement>
</saml:Assertion>
```

> [!warning] Le point à retenir
> Le `NameID` est **obligatoire pour identifier**. Les attributs sont **optionnels** — mais **indispensables dès qu'il y a de l'autorisation**.
>
> ⚠️ Une assertion **sans aucun attribut** est **parfaitement valide** : l'utilisateur peut être connecté, mais **sans aucun rôle**. C'est un état silencieux, et donc une source d'incidents difficile à voir.

---

## Où ça se configure : les deux niveaux côté IdP

> [!tip] En clair
> L'émission des attributs se règle **côté IdP**, à **deux niveaux**. Comprendre cette hiérarchie, c'est comprendre tout le reste.

```
   IDP — définition GLOBALE
   ┌────────────────────────────────────────┐
   │ mail     ← annuaire.mail               │  ← s'applique à TOUS les SP par défaut
   │ role     ← annuaire.memberOf           │
   │ dept     ← annuaire.department         │
   └────────────────┬───────────────────────┘
                    │
                    │  hérité par défaut…
                    ▼
   ┌────────────────────────────────────────┐
   │  CONFIG SPÉCIFIQUE — SP « PartenaireA »│
   │                                        │
   │  attributs = []                        │  ⬅️ la liste vide : TOUT EFFACÉ
   │                                        │
   │  puis on redéclare ce qu'on veut :     │
   │  attributs = [                         │
   │     contactId ← annuaire.contactId     │  ← SEULEMENT celui-ci
   │  ]                                     │
   └────────────────────────────────────────┘
                    │
                    ▼
   L'assertion pour PartenaireA contient UNIQUEMENT contactId
   (ni mail, ni role, ni dept — pourtant définis globalement)
```

| Niveau | Ce qu'on écrit | Effet |
|---|---|---|
| **① Global (IdP)** | `<nom du champ> = <source de données>` | le **mapping de base**, hérité par **tous** les SP |
| **② Par SP (surcharge)** | `<attribut côté SP> = <ma source de données>` | **remplace** la définition globale **pour ce SP uniquement** |
| **③ Liste vide `[]`** | `[]` | ⭐ **neutralise l'héritage global** : on repart de zéro |

> [!tip] En clair — le principe de la surcharge
> C'est le même patron que pour le `NameID` : **une configuration par entité de confiance**.
>
> Le niveau **global** dit « voici le comportement par défaut de mon IdP ». Le niveau **par SP** dit « pour *ce* partenaire, voici mes exceptions ». C'est **exactement** la logique qui permet de servir N applications sans les casser les unes les autres.

---

## La liste vide : un mécanisme de soustraction

> [!warning] Le `[]` — un outil puissant, et piégeux
> `attributs = []` signifie : **« les définitions globales ne s'appliquent pas à ce SP. Je repars de zéro. »**
>
> C'est un mécanisme de **soustraction** : on **retire** l'héritage, puis on **redéclare** précisément ce qu'on veut.

**Le patron propre :**

```
   attributs = []                       ⬅️ ① on efface tout (héritage global ignoré)
   attributs = [                        ⬅️ ② puis on redéclare précisément
       contactId ← annuaire.contactId,  ✅ identifiant opaque — remplace le NameID
       role      ← annuaire.memberOf,   ✅ indispensable à l'autorisation
       # mail    ← PAS remis             ✅ la donnée personnelle ne sort plus
   ]
```

> [!warning] Le piège : le `[]` trop large
> Vouloir retirer **une seule** donnée sensible en vidant tout la liste peut **casser l'autorisation** :
>
> - le client cesse de recevoir la donnée personnelle… ✅
> - mais il cesse **aussi** de recevoir `role` / `memberOf` → **il refuse l'accès** ❌
>
> **Réflexe : après un `[]`, on redéclare TOUJOURS les attributs nécessaires à l'autorisation** — en plus de ceux qu'on veut garder. On ne fait pas que retirer, on **reconstruit explicitement** ce qui doit sortir.

**Autre point de diagnostic :** une assertion **sans `AttributeStatement`** peut venir de **deux causes différentes**, qui se ressemblent dans le XML :

| Cause | Nature |
|---|---|
| Aucun mapping d'attributs défini | l'IdP n'a **rien à émettre** |
| `attributs = []` posé pour ce SP | ⭐ **quelqu'un a délibérément tout retiré** |

Les deux donnent le **même vide**, mais **pas la même intention** — c'est une distinction précieuse en diagnostic.

---

## Le SP peut-il demander des attributs ?

> [!tip] En clair
> Question naturelle : pour le `NameID`, le SP déclare un format via `<NameIDPolicy>`. Y a-t-il l'équivalent pour les attributs ?

**Non.** Et c'est une **différence structurelle** à connaître :

| | NameID | Attributs |
|---|---|---|
| Mécanisme de demande explicite | ✅ `<NameIDPolicy Format="...">` | ❌ **aucun équivalent** |
| Le SP « demande » ? | oui, un **format** | **non** — il lit ce qui arrive |
| Négociation dans le protocole | ✅ oui | ❌ non |

> [!warning] Il n'existe pas d'« AttributePolicy »
> SAML Core **ne définit pas** de bloc où le SP déclarerait « je veux `mail` et `role` ». **Le SP ne demande rien. Il lit.**

**Alors, comment le SP pèse-t-il quand même ?** Par des voies **hors** du protocole :

| Levier du SP | Comment ça pèse |
|---|---|
| **Métadonnées** (`RequestedAttribute`) | faculté de **déclarer** des attributs souhaités — mais c'est **indicatif**, pas contraignant |
| **Contrat humain** | les deux administrateurs se mettent d'accord sur les **noms** d'attributs |
| **La pratique** | si le SP ne trouve pas ce qu'il attend → **ça ne marche pas** → l'incident remonte → on ajuste l'IdP |

**Donc la règle :**

> **L'IdP émet (et lui seul). Le SP lit (et ne demande rien formellement).** Ce qui ressemble à de la négociation est en réalité **contractuel** — un accord entre deux administrateurs, matérialisé en configuration de chaque côté.

---

## Que fait le SP quand un attribut manque ?

> [!tip] En clair
> **Ce n'est PAS le protocole qui décide — c'est le SP.** SAML dit seulement « voici les attributs que j'émets ». Il **ne dit pas** ce qu'un SP doit faire s'il en manque un.

| # | Comportement du SP | Quand | Effet visible |
|---|---|---|---|
| **A** | **il ignore** (l'attribut est facultatif) | l'attribut n'est **pas requis** | connexion OK, mais **fonctionnalité absente** |
| **B** | **il refuse la connexion** | l'attribut est **requis** par sa config | « accès refusé » / « non autorisé » |
| **C** | **il applique une valeur par défaut** | un défaut est configuré | connecté, avec un niveau **minimum** |

**En pratique, selon le type d'attribut :**

| Attribut manquant | Comportement typique |
|---|---|
| `mail`, `displayName` (cosmétique) | → **A. ignoré** — l'application vit sans |
| `role`, `group`, `memberOf` (**autorisation**) | → **B. refus** ou **C. accès dégradé** ⬅️ **c'est là que ça casse** |

> [!warning] Deux niveaux d'échec à ne pas confondre
> - **L'assertion invalide** (signature, `Audience`, fenêtre temporelle…) → **rejet total**, rien n'est exploité.
> - **Un attribut attendu manquant** → l'assertion est **acceptée** (elle est valide !), et le SP décide **localement** quoi faire.
>
> Un attribut manquant **ne rend jamais l'assertion invalide**. C'est une **politique locale du SP**, pas une règle du protocole.

---

## Le désaccord de nom : le cas le plus fréquent

> [!tip] En clair
> Le scénario type : l'IdP émet `role`, le SP attend `group`. **Que se passe-t-il ?**

```xml
<!-- L'IdP émet ceci -->
<saml:Attribute Name="role"><AttributeValue>APP_ADMIN</AttributeValue></saml:Attribute>

<!-- Le SP attendait un attribut nommé "group" → il ne trouve RIEN -->
```

| Réponse possible | Est-ce ce qui se passe ? |
|---|---|
| Le SP fait la traduction lui-même | ❌ **Non** — il n'y a **pas de lookup caché** |
| Le SP ne trouve rien → pas de rôle (ou refus) | ✅ **Oui** — c'est **exactement** ce qui se produit |

> [!warning] La règle de fer, la même que pour le NameID
> **Le SP ne peut pas transformer ce qui n'est pas là.** Il lit ce que l'IdP a émis, sous le nom que l'IdP a choisi. Il n'y a aucune correspondance automatique de vocabulaire.

**Donc, où corriger ?** ⬅️ Toujours la même réponse :

| À corriger | Où | Pourquoi |
|---|---|---|
| Le **nom** de l'attribut émis | **côté IdP** | c'est l'IdP qui choisit le nom de sortie |
| Le **niveau** à utiliser | **② par SP** si le nom diffère selon les partenaires | ne casse pas les autres SP |

**Et c'est là que la config par SP prend tout son sens :** chaque partenaire a ses conventions. Le mapping par entité de confiance te permet de parler **le bon dialecte à chacun**, sans compromis global.

---

## Rappel

> [!question] Question de rappel
> L'IdP émet, pour ce SP, un `NameID` correct **et aucun `AttributeStatement`**. L'authentification réussit, mais l'application renvoie « access denied ». **Que s'est-il passé, et où faut-il regarder ?**

> [!success]- Réponse
> L'assertion est **parfaitement valide** : le `NameID` identifie l'utilisateur, donc l'authentification passe. Mais l'application a besoin d'un attribut d'**autorisation** (`role`, `group`, `memberOf`) pour décider **à quoi** l'utilisateur a droit — et **il n'est pas là**.
>
> Ici, le comportement du SP est le **B** (refus) ou le **C** (accès dégradé) : c'est **sa politique locale**, pas une règle du protocole. SAML ne dit rien sur ce cas.
>
> **Où regarder.** D'abord vérifier si l'assertion contient **vraiment** un `AttributeStatement` (capture réseau, voir [[saml_message_examples]]). Ensuite, chercher laquelle des **deux causes** s'applique :
> 1. **aucun mapping d'attributs** n'est défini → l'IdP n'a rien à émettre ;
> 2. **`attributs = []`** a été posé pour ce SP → quelqu'un a délibérément tout retiré.
>
> Et le **piège classique** : si l'intention était de retirer **une seule** donnée sensible, un `[]` trop large a **aussi** supprimé les attributs d'autorisation. Le correctif est **côté IdP**, au **niveau par SP** : après le `[]`, **redéclarer explicitement** les attributs nécessaires — identifiant opaque **et** rôles — en laissant dehors la donnée personnelle.

### 🎯 Le résumé à retenir

> [!tip] Si tu ne retiens qu'une chose
> **L'IdP émet, le SP lit — et il n'y a pas de demande formelle.**
>
> - **Deux canaux :** le `NameID` **identifie** (une valeur, obligatoire) ; l'`AttributeStatement` **décrit** (plusieurs valeurs, optionnelles mais vitales pour l'autorisation).
> - **Deux niveaux de config, côté IdP :** **① global** (hérité par tous les SP) et **② par SP** (la surcharge) — même patron que le `NameID`.
> - **`[]` = soustraction** : neutralise l'héritage global. ⚠️ **Trop large, il casse l'autorisation** → après un `[]`, **redéclarer** ce qui doit sortir.
> - **Pas d'`AttributePolicy`** : le SP ne demande rien, il lit. Le « contrat » est **humain**, pas protocolaire.
> - **Attribut manquant → l'assertion reste valide.** C'est le **SP** qui décide : ignorer, refuser, ou défaut.
> - **Désaccord de nom → corriger côté IdP**, au **niveau par SP**.

---

## 🗣️ Les questions qu'on te posera

> [!tip] En clair
> Les questions classiques sur le sujet, et la réponse courte qui résume l'essentiel.

| Si on te demande… | Réponds… |
|---|---|
| **« Différence entre NameID et attributs ? »** | « Le `NameID` **identifie** (une valeur, obligatoire). Les **attributs** **décrivent** : rôles, groupes, profil (plusieurs valeurs, optionnels mais vitaux pour l'**autorisation**). » |
| **« Où se configure l'émission des attributs ? »** | « **Côté IdP**, à **deux niveaux** : un **mapping global** hérité par tous les SP, et une **surcharge par SP** (par entité de confiance). » |
| **« Le SP peut-il demander des attributs précis ? »** | « **Non** — il n'existe pas d'`AttributePolicy` en SAML. Le SP **lit** ce qui arrive. `RequestedAttribute` dans les métadonnées est **indicatif**, pas contraignant. » |
| **« Que fait le SP si un attribut requis manque ? »** | « **L'assertion reste valide** — c'est une **politique locale du SP** : il **ignore** (attribut facultatif), **refuse** l'accès, ou applique une **valeur par défaut**. Le protocole ne tranche pas. » |
| **« C'est quoi la liste vide `[]` ? »** | « Un mécanisme de **soustraction** : `attributs = []` neutralise l'héritage global pour ce SP. ⚠️ **Trop large, il casse l'autorisation** → après un `[]`, il faut **redéclarer** explicitement ce qui doit sortir. » |
| **« Comment retirer une donnée sensible d'un flux SSO ? »** | « **Côté IdP**, au **niveau par SP** : `[]` puis redéclarer **uniquement** l'identifiant opaque et les rôles — vérifier qu'elle n'est **pas émise ailleurs** (attributs). » |

> [!tip] La phrase qui tue
> **« L'IdP émet, le SP lit — et il n'y a aucune demande formelle : le contrat d'attributs est humain, pas protocolaire. »**

---

## Voir aussi

- [[saml_nameid]] — l'autre canal : l'identification, la politique de format et le mapping.
- [[saml_message_examples]] — où lire un `AttributeStatement` dans une trame réelle.
- [[saml2]] — le protocole : acteurs, assertion, bindings, attaques.
- [[scopes_and_claims]] — côté OIDC : les *claims*, équivalents fonctionnels des attributs.
- [[rbac_abac_rebac]] — ce que le SP **fait** ensuite des attributs (modèles d'autorisation).
- [[scim]] — le provisionnement : quand les attributs sont poussés **avant** la connexion.
- [[index]] — carte d'entrée du domaine SAML.

## Références

- OASIS SAML 2.0 — *Core* : `<AttributeStatement>`, `<Attribute>`, `Name`, `NameFormat`, `AttributeValue`.
- OASIS SAML 2.0 — *Metadata* : `RequestedAttribute` (déclaration indicative).
- OASIS SAML 2.0 — *Profiles* : attributs dans le profil Web Browser SSO.
