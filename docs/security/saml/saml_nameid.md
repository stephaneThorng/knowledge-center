---
title: "Le NameID : politique et mapping"
aliases: [NameID, NameIDPolicy, NameID Mapper, Format NameID, unspecified, persistent, transient, emailAddress, Identifiant fédéré]
tags: [saml, federation, sso, nameid, mapper, identite, assertion, mapping]
domaine: securite/saml
niveau: intermediaire
statut: draft
cree: 2026-10-14
sources: [SAML 2.0 Core, SAML 2.0 Profiles, SAML 2.0 Metadata]
---

# Le NameID : politique et mapping

> [!abstract] Ancre
> Le `NameID` est **l'identifiant de l'utilisateur** dans une assertion SAML. Mais autour de lui vivent **deux mécanismes distincts** — la **politique** (quels formats on accepte) et le **mapping** (quelle valeur pour chaque format) — et **une règle de fer** : *la valeur est écrite par l'IdP, le SP ne fait que la ranger*.

---

## 🧒 Avant de commencer : de quoi on parle

> [!tip] En clair
> Dans l'assertion, l'utilisateur est désigné par **un seul champ** : le `NameID`. C'est **la clé d'identité** du document.
>
> 🔑 **L'analogie du colis :**
> - Le **`Format`** du NameID, c'est **l'étiquette** sur le colis : « ceci est un numéro de client », « ceci est une adresse e-mail ».
> - La **`valeur`** du NameID, c'est **ce qui est écrit sur l'étiquette**.
>
> **Et le point capital : l'expéditeur écrit l'étiquette ET choisit ce qu'il met dedans. Le destinataire ne peut que lire — pas réécrire.**

**Les mots à connaître pour cette note :**

| Mot technique | En clair |
|---|---|
| **`NameID`** | l'**identifiant de l'utilisateur** dans l'assertion |
| **`Format`** | la **nature** de cet identifiant (email ? numéro ? identifiant opaque ?) |
| **`NameIDPolicy`** | la **liste des formats** qu'on accepte ou qu'on demande |
| **`NameID Mapper`** | la **règle** : « pour ce format, prends tel attribut » |
| **`specified` / `unspecified`** | le format est **contraint** / **laissé au choix de l'IdP** |
| **`persistent`** | un identifiant **opaque et stable** (équivalent d'un numéro de dossier) |
| **`transient`** | un identifiant **éphémère** (change à chaque connexion) |
| **`AttributeStatement`** | les **autres attributs** (rôle, groupe…) — une voie **distincte** du NameID |

Voir aussi : [[saml_message_examples]] (où l'on lit le NameID dans une trame), [[saml2]] (le protocole).

---

## Les deux mécanismes, à ne pas confondre

> [!tip] En clair
> Tout l'incident classique de NameID vient de la confusion entre ces deux choses. Ce ne sont **pas** la même chose, et elles ne se configurent **pas de la même façon**.

| Notion | Ce que c'est | Où ça se configure |
|---|---|---|
| **NameID Policy** | la **liste ordonnée de formats** qu'on accepte / qu'on demande | **côté demandeur ET côté émetteur** |
| **NameID Mapper** | la règle **« pour ce format, prends tel attribut »** | **côté demandeur ET côté émetteur**, une règle **par format** |

**Le couple :** la **policy** dit *quel langage on parle*, le **mapper** dit *comment on le traduit*. Les deux côtés en ont — et ils ne se parlent **jamais** directement.

---

## La politique : une liste ordonnée, pas une valeur unique

> [!tip] En clair
> On ne choisit **pas un** format. On déclare une **liste ordonnée** — et c'est une **négociation**.

**Côté IdP :** une liste ordonnée de formats **acceptés**, chacun avec **son mapping**. Le dernier recours est le **mapping par défaut du système**.

**Côté SP :** une liste ordonnée de formats **souhaités**, chacun avec **son mapping** également.

```
        CÔTÉ SP                                CÔTÉ IdP
   ─────────────────                    ─────────────────────
   Liste ordonnée du SP                 Liste ordonnée de l'IdP
   (par ordre de priorité)              (par ordre de priorité)

   1. unspecified → contactId           1. emailAddress → mail
   2. emailAddress → mail               2. unspecified   → mail
   3. persistent   → uid                3. transient     → (mapping par défaut)
```

> [!warning] Le format demandé = le format émis
> Quand le SP demande un format **que l'IdP a dans sa liste**, l'IdP **accepte**, et il **émet ce format-là**. C'est la cohérence de la négociation : si le format de sortie ne suivait pas le format demandé, négocier n'aurait aucun sens.
>
> Si l'IdP **n'a pas** ce format dans sa liste → refus, ou repli sur son défaut, **selon l'implémentation**. C'est là que les comportements divergent d'une plateforme à l'autre.

---

## Le mapping : une règle par format

> [!tip] En clair
> Le mapping n'est **pas global** : il est **défini pour chaque format**. C'est ce qui permet à deux systèmes aux annuaires complètement différents de se parler.

| Élément | Qui décide | Exemple |
|---|---|---|
| **Le format émis** | **l'IdP** | `unspecified` |
| **La valeur émise** | **l'IdP seul** (son mapping à lui, sur son annuaire à lui) | son champ `mail` → `alice@exemple.com` |
| **Le format reçu par le SP** | *(imposé par l'IdP)* | `unspecified` |
| **Ce que le SP en fait** | **le SP seul** (son mapping à lui) | il range la valeur dans son champ local |

**Le point crucial, et c'est le plus contre-intuitif :**

> [!warning] Aucun échange de données entre l'IdP et le SP
> Il n'y a **jamais** de connexion (LDAP, SQL, API) entre un IdP et un SP. **Jamais**, quel que soit l'administrateur, même si les deux systèmes sont dans la même organisation, même s'ils s'appuient en interne sur le **même annuaire**.
>
> **Ce qui circule entre eux : uniquement le document XML.** Rien d'autre.
>
> Et donc : quand l'IdP et le SP utilisent le **même nom de champ** (ex. `contactId`), **ce n'est pas un lien technique** — c'est une **coïncidence de configuration**, un **contrat humain** entre deux administrateurs. Deux systèmes distincts se sont mis d'accord sur *quel identifiant faire circuler*.

---

## La règle de fer : l'IdP écrit, le SP range

> [!warning] Le point qui explique la majorité des incidents
> **La valeur du NameID est écrite par l'IdP, et par lui seul. Le SP ne peut que dire où la ranger.**
>
> Un mapper — **de quelque côté qu'il soit** — associe **une valeur qui circule** à **un nom de champ local**. Il **ne transforme pas** la valeur. Il n'y a **aucun lookup caché**, aucune requête de « traduction » : **la valeur qui entre est la valeur utilisée**.

```
   ANNULAIRE de l'IdP              RÉSEAU                    LE SP
   ──────────────────              ──────                    ─────
   user.contactId = 12847
            │
            │  (l'IdP lit SON annuaire — c'est son travail à lui)
            ▼
   l'IdP applique SON mapping pour « unspecified »
   et écrit dans le document :
   <NameID Format="unspecified">12847</NameID>
            │
            └────► XML ────►  le SP reçoit "12847"
                                  │
                                  │  (le SP n'a AUCUN accès
                                  │   à l'annuaire de l'IdP)
                                  ▼
                        le SP applique SON mapping :
                        « unspecified → mon champ local »
                        et cherche "12847" CHEZ LUI
```

**Conséquence directe :** si le format reçu n'est **pas** dans la liste du SP, son **mapping par défaut** s'applique **silencieusement** — et c'est de là que naissent les « user not found » d'apparence inexplicable.

---

## Les formats courants

> [!tip] En clair
> Quelques formats à reconnaître, et ce qu'ils impliquent en pratique.

| Format | Contenu | Remarque |
|---|---|---|
| **`unspecified`** | l'IdP choisit | ⚠️ le plus **permissif** : aucune contrainte, donc **l'IdP seul décide** |
| **`emailAddress`** | une adresse e-mail | lisible, mais **c'est une donnée personnelle** — voir la section suivante |
| **`persistent`** | un identifiant **opaque et stable** | ✅ à privilégier : le SP peut suivre l'utilisateur sans rien apprendre sur lui |
| **`transient`** | un identifiant **éphémère** | change à chaque connexion — utile pour du « one-shot », inutilisable pour du suivi |
| **`entity`** | l'identifiant d'une **entité** (pas d'une personne) | cas particulier |
| **`X509SubjectName`** | un nom de sujet de certificat | cas particulier |

> [!warning] La question de la donnée personnelle
> Un NameID **n'est pas confidentiel par nature** : l'assertion transite **en clair (base64, pas chiffré)** via le navigateur, dans un POST, et peut être **journalisée** côté SP, côté proxy, côté navigateur.
>
> Donc mettre un **email** ou un nom dans le NameID, c'est **faire circuler une donnée personnelle** vers un tiers. Quand l'application destinataire est **externe à l'organisation** (un partenaire, un client, un fournisseur SaaS), c'est un sujet de **minimisation des données**.
>
> ✅ **Le bon réflexe : un identifiant opaque** — `persistent`, ou un identifiant interne non signifiant (un numéro de dossier, un identifiant de contact). Le SP peut l'utiliser comme clé **sans rien apprendre** sur la personne.

---

## Le piège de vocabulaire : « configurer le SP »

> [!warning] Le piège qui coûte le plus de temps
> Dans une **console d'administration d'IdP**, le terme « configurer le SP » désigne en réalité : **configurer ce que l'IdP sait de ce SP**.
>
> Ce n'est **pas** configurer l'application elle-même. C'est créer **l'entité de confiance** qui représente ce SP, côté IdP.

| Ce qu'on croit avoir fait | Ce qu'on a réellement fait |
|---|---|
| « j'ai configuré le SP » | j'ai configuré **l'IdP**, dans la section dédiée à ce SP partenaire |
| « j'ai changé le mapper du SP » | j'ai changé **l'émission de l'IdP** — le mapper d'émission → **la valeur qui sort a changé** ✅ |

**Et c'est une bonne nouvelle** : c'est **exactement** le bon geste quand on veut changer **ce qui est émis**. Mais il faut le nommer correctement, sinon on croit avoir touché l'application, alors qu'on a touché l'émetteur.

**Le vrai test :** où le mapper est-il **physiquement enregistré** ?
- Dans l'outil d'identité (l'IdP) → c'est un **mapper d'émission** : il change **la valeur émise**.
- Dans l'application (le SP) → c'est un **mapper de réception** : il change **le rangement local**.

---

## Quand on n'a pas la main sur le SP

> [!tip] En clair
> Cas très courant en fédération : **le SP appartient à un tiers** (un client, un partenaire, un fournisseur). On ne peut pas modifier sa configuration.

**Alors tout le levier est côté IdP**, et il faut connaître ses deux armes :

| Situation | Solution | Risque |
|---|---|---|
| **Mappers par entité de confiance** (par SP) | changer le mapper **de ce SP uniquement** — les autres SP sont intacts | ✅ **propre** |
| **Mappers globaux** | changer le mapper global → **impacte tous les SP** qui consomment ce format | ⚠️ **casse potentielle** |
| Le SP ne lit pas le NameID comme attendu | vérifier si le SP sait lire un **`AttributeStatement`** — la voie **attribut** est alors plus robuste | dépend du tiers |

> [!question] La question à poser **avant** toute modification
> **Sur mon IdP, les mappers de NameID sont-ils par SP (par entité de confiance), ou globaux ?**
>
> - **Par SP** → modification ciblée, aucun effet de bord. ✅
> - **Global** → il faut soit un format dédié, soit un attribut, soit l'accord de tous les autres consommateurs.

**En complément : éviter de retirer une donnée sans vérifier qu'elle n'est pas émise ailleurs.** Si un email est retiré du `NameID` mais continue d'être émis dans un attribut du `AttributeStatement`, **la fuite persiste**. Il faut le retirer **partout**.

---

## Le NameID et le reste de l'assertion

> [!tip] En clair
> Le `NameID` n'est **pas la seule voie** pour transporter des informations. L'assertion a **deux canaux** :

| Canal | Contenu | Rôle |
|---|---|---|
| **`Subject/NameID`** | **un** identifiant | ⭐ **la clé d'identification** |
| **`AttributeStatement`** | **plusieurs** attributs (nom, mail, rôle, groupe…) | le **contexte** : droits, profil |

**Et les deux sont indépendants.** Un attribut présent dans l'`AttributeStatement` **ne devient pas** la clé d'identification pour autant : c'est le `NameID` qui identifie. Les attributs, eux, **habillent** l'utilisateur.

> [!tip] L'observation utile en diagnostic
> Quand un même identifiant apparaît **à la fois** dans le `NameID` **et** dans un attribut → c'est le signe d'une configuration **robuste** : si le NameID varie (changement de format, de mapper…), le SP peut **retomber sur l'attribut**.
>
> À l'inverse, un `NameID` **sans attribut correspondant** = **aucun filet de sécurité** : toute variation de format casse l'identification. **C'est un point à signaler systématiquement dans un diagnostic.**

---

## Rappel

> [!question] Question de rappel
> Un SP reçoit une assertion dont le `NameID` a pour format `unspecified` et pour valeur `alice@exemple.com`. Le SP attend, lui, un identifiant numérique de contact. **Sa configuration de NameID Mapper est-elle suffisante pour corriger le problème ?**

> [!success]- Réponse
> **Non.** Et c'est précisément la confusion la plus fréquente.
>
> Le mapper du SP ne fait qu'**associer une valeur qui circule à un nom de champ local**. Il dit : « pour le format `unspecified`, range la valeur reçue dans mon champ X ». Il **ne peut pas produire une autre valeur** : il n'y a **aucun lookup caché**, aucune interrogation d'annuaire, aucune transformation. **La valeur qui entre est la valeur utilisée.**
>
> Ici la valeur qui circule est **un email**, parce que **l'IdP a décidé de l'émettre** — son mapping à lui, sur son annuaire à lui. Le SP, quelle que soit sa configuration, ne peut pas la remplacer.
>
> **Donc le correctif est côté IdP** : c'est là que se décide **ce qui est émis**. Concrètement, il faut que le mapper **d'émission** de l'IdP, **pour ce format et pour ce SP**, pointe sur l'identifiant désiré au lieu du mail.
>
> Et la question préalable est : **ce mapper est-il par SP, ou global ?** Si global, le changement impacte tous les SP qui consomment ce format — d'où l'intérêt des **mappers par entité de confiance**. Voir [[saml_message_examples]] pour repérer tout ça dans une trame réelle.

### 🎯 Le résumé à retenir

> [!tip] Si tu ne retiens qu'une chose
> **L'IdP écrit, le SP range.**
>
> - **`NameIDPolicy`** = la **liste ordonnée de formats** (une négociation, pas un choix).
> - **`NameID Mapper`** = **une règle par format** — de chaque côté, sans aucun échange entre eux.
> - **Le format demandé = le format émis.** Le format non prévu → **mapping par défaut silencieux**.
> - 🔑 **Aucun lookup, aucune transformation** : la valeur qui circule est **écrite par l'IdP** et **rangée par le SP**.
> - 🔑 **« Configurer le SP » dans une console d'IdP = configurer l'IdP.** Le mapper y est un mapper **d'émission**.
> - 🔑 **Pour ne rien faire fuiter : un identifiant opaque** (`persistent`, numéro interne), jamais un email vers un tiers.

---

## 🗣️ Les questions qu'on te posera

> [!tip] En clair
> Les questions classiques sur le sujet, et la réponse courte qui résume l'essentiel.

| Si on te demande… | Réponds… |
|---|---|
| **« C'est quoi un NameID ? »** | « L'**identifiant de l'utilisateur** dans l'assertion. Il a un **format** (email, persistent, unspecified…) et une **valeur**. **C'est l'IdP qui décide des deux.** » |
| **« Différence entre NameIDPolicy et NameID Mapper ? »** | « La **Policy**, c'est la **liste ordonnée de formats** acceptés — une **négociation**. Le **Mapper**, c'est **une règle par format** : « pour ce format, prends tel attribut ». » |
| **« Qui décide de la valeur du NameID ? »** | « **L'IdP seul.** Le SP ne peut pas la transformer : il n'y a **aucun lookup caché**. » |
| **« Le SP peut-il exiger un format ? »** | « Il peut le **demander** (`NameIDPolicy`), pas l'imposer. Si l'IdP n'a pas ce format dans sa liste → refus ou repli sur son défaut. » |
| **« Pourquoi éviter l'email comme NameID ? »** | « L'assertion transite **en clair** et peut être journalisée. Un email = **donnée personnelle** vers un tiers. → identifiant **opaque** (`persistent`, numéro interne). » |
| **« Que se passe-t-il si le format reçu n'est pas dans la liste du SP ? »** | « Le **mapping par défaut du système** s'applique **silencieusement** → « user not found » d'apparence inexplicable. » |

> [!tip] La phrase qui tue
> **« L'IdP écrit, le SP range : la valeur du NameID est décidée par l'IdP, le SP ne fait que dire dans quel champ local il la range — aucun échange de données entre eux, seulement un document XML. »**

---

## Voir aussi

- [[saml_message_examples]] — où l'on **voit** le NameID arriver dans une trame, et comment le lire.
- [[saml_attribute_mapping]] — l'autre canal : les attributs (`AttributeStatement`), leur émission et leur mapping.
- [[saml2]] — le protocole : acteurs, assertion, bindings, attaques.
- [[saml_vs_oidc]] — l'équivalent OIDC du `NameID` (`sub`), et pourquoi le sujet y est opaque par conception.
- [[scopes_and_claims]] — côté OIDC : les *claims*, équivalents du `AttributeStatement`.
- [[index]] — carte d'entrée du domaine SAML.

## Références

- OASIS SAML 2.0 — *Core* : `<NameID>`, `NameIDPolicy`, `Format`, `<AttributeStatement>`.
- OASIS SAML 2.0 — *Profiles* : formats de `NameID` (`unspecified`, `emailAddress`, `persistent`, `transient`, `entity`, `X509SubjectName`).
- OASIS SAML 2.0 — *Metadata* : déclaration des formats supportés, mappers par entité de confiance.
