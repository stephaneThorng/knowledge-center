---
title: SAML
aliases: [Index SAML, SAML 2.0 index]
tags: [saml, moc, index, navigation, federation]
domaine: securite/saml
niveau: intermediaire
statut: draft
cree: 2026-10-01
sources: [SAML 2.0 Core, SAML 2.0 Bindings, SAML 2.0 Profiles]
---

# SAML
> [!abstract] Ancre
> Carte d'entrée du domaine **SAML 2.0** : le protocole de fédération d'identité le plus déployé en entreprise, et le **prédécesseur** d'[[openid_connect]].

---

## 🧒 Avant de commencer : comment lire ce dossier

> [!tip] En clair
> Ce dossier est **petit** — SAML est un protocole, mais la façon de l'aborder est simple.
>
> ⚠️ **Commence par la note `SAML 2.0`** : elle fait le tour complet en une seule note, avec l'analogie qui porte tout le reste. Les autres notes ne viendront qu'ensuite, si on en a besoin.

**Pourquoi s'intéresser à un protocole « ancien » ?**

> [!tip] En clair
> Parce qu'il est **partout en entreprise**. Les grandes organisations (banques, assurances, administrations, universités, grands groupes) ont massivement déployé SAML **avant** qu'OIDC n'existe. Ces systèmes tournent toujours.
>
> Et comme on ne remplace pas ce qui marche, **on gravite autour** : on ajoute des facteurs, des workflows, des passerelles — sans toucher au SAML existant.
>
> **Conséquence pratique :** comprendre SAML, c'est comprendre l'existant qu'on te demandera de faire évoluer.

---

## Parcours conseillé

1. **[[saml2]]** — le protocole : acteurs, assertions, signatures, profils, le Web SSO.
2. **[[saml_vs_oidc]]** — le comparatif : pourquoi OIDC a gagné pour le neuf, et pourquoi SAML survit.
3. *(à venir, si besoin)* — Bindings détaillés, Single Logout, métadonnées SAML.

---

## Carte du domaine

| Note | En une phrase |
|---|---|
| [[saml2]] | Le protocole de fédération : assertions XML signées, échangées via le navigateur. |
| [[saml_vs_oidc]] | Deux réponses au même problème : fédérer une identité entre organisations. |

---

## Les concepts, en une ligne chacun

> [!tip] En clair
> Si tu ne lis qu'un tableau de ce dossier, lis celui-ci. Il donne le vocabulaire minimal pour ne plus être perdu devant SAML.

| Concept | En clair |
|---|---|
| **Identity Provider (IdP)** | le guichet d'identité qui **sait qui tu es** |
| **Service Provider (SP)** | l'application qui **veut savoir qui tu es** |
| **Assertion** | le **document XML signé** qui affirme « voici l'utilisateur » |
| **Metadata** | les **fiches techniques** que l'IdP et le SP s'échangent |
| **Binding** | le **transport** (redirection HTTP, POST...) |
| **Profile** | un **scénario d'usage** complet assemblant bindings et assertions |
| **Web SSO** | le scénario principal : se connecter à une appli via l'IdP |

---

## Le lien avec le reste du vault

> [!tip] En clair
> SAML et OIDC résolvent **le même problème** (la fédération d'identité) avec deux philosophies **opposées** :
>
> - **SAML** → du **XML**, des signatures enveloppantes, tout passe par le navigateur.
> - **OIDC** → du **JSON**, des jetons compacts, un canal arrière pour les secrets.
>
> Connaître les deux est très formateur : tu vois **pourquoi** OIDC a été conçu comme il l'a été, et tu comprends **les choix** (pas seulement les mécanismes).

- [[openid_connect]] — le « successeur » d'OIDC pour le neuf.
- [[oauth2]] — le cadre sur lequel OIDC est bâti (SAML n'en a pas besoin).
- [[../index]] — la carte générale du domaine sécurité (oidc, saml, iam).

## Références

- OASIS SAML 2.0 — *Assertions and Protocols* (Core), *Bindings*, *Profiles*.
- OASIS SAML 2.0 — *Metadata*, *Authentication Context*.
