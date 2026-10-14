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
> ⚠️ **Commence par la note `SAML 2.0`** : elle fait le tour complet en une seule note, avec l'analogie qui porte tout le reste.
>
> Ensuite, selon ton besoin :
> - **tu dois diagnostiquer une trame** → va voir **`Lire une trame SAML`** ;
> - **tu dois changer un identifiant** (NameID, mapping) → va voir **`Le NameID`**.

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
2. **[[saml_message_examples]]** — **lire une trame** : décoder un `AuthnRequest` et une `Response`, et suivre la grille de diagnostic.
3. **[[saml_nameid]]** — **l'identifiant** : politique de format, mapping, et la règle « l'IdP écrit, le SP range ».
4. **[[saml_attribute_mapping]]** — **les attributs** : émission, surcharge par SP, autorisation.
5. **[[saml_slo]]** — **la déconnexion propagée** : `LogoutRequest`/`LogoutResponse`, back-channel, `SessionIndex`.
6. **[[saml_vs_oidc]]** — le comparatif : pourquoi OIDC a gagné pour le neuf, et pourquoi SAML survit.
7. *(à venir, si besoin)* — Bindings et métadonnées en détail.

---

## Carte du domaine

| Note | En une phrase |
|---|---|
| [[saml2]] | Le protocole de fédération : assertions XML signées, échangées via le navigateur. |
| [[saml_message_examples]] | Lire une capture réseau : emballages, `AuthnRequest`/`Response` décodés, grille de diagnostic. |
| [[saml_nameid]] | Le `NameID` : négociation du format, mapping par format, et qui décide de la valeur. |
| [[saml_attribute_mapping]] | Les attributs : deux niveaux d'émission côté IdP, la liste vide `[]`, et l'autorisation. |
| [[saml_slo]] | Le Single Logout : la déconnexion propagée à tous les SP, et ses pièges. |
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
