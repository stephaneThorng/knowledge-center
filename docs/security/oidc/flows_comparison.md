---
title: Comparatif des flows OIDC
aliases: [Comparatif des flows, Comparaison des grants, Choisir un flow, Liste des flows OAuth, Comparatif des flows OIDC]
tags: [oidc, oauth2, flow, comparatif, deprecation]
domaine: securite/oidc
niveau: intermediaire
statut: draft
cree: 2026-10-01
sources: [RFC 6749, RFC 8628, RFC 9700, RFC 7636, OAuth 2.1 draft, OpenID Connect Core 1.0]
---

# Comparatif des flows OIDC

> [!abstract] Ancre
> Il n'existe qu'un petit nombre de flows : un seul est recommandé dans presque tous les cas (Authorization Code + PKCE), deux couvrent des cas particuliers (client credentials, device), et deux sont morts (implicit, password).

---

## 🧒 Avant de commencer : de quoi on parle

> [!tip] En clair
> Un « **flow** » (ou *grant*), c'est juste **la façon dont l'application obtient son badge**. Il n'y en a pas cinquante : **cinq**, dont **deux sont morts**.
>
> Et pour choisir, il suffit de répondre à **deux questions** :
>
> 1. **Y a-t-il un utilisateur** qui se connecte ? (oui / non)
> 2. **L'application peut-elle garder un secret ?** (oui / non)
>
> Ces deux réponses déterminent **tout le reste**.

**Les mots à connaître pour cette note :**

| Mot technique | En clair |
|---|---|
| **flow / grant** | la façon d'obtenir le badge |
| **utilisateur présent ?** | est-ce qu'un humain clique « Autoriser » ? |
| **client confidentiel** | l'application peut garder un secret (elle a un serveur) |
| **client public** | l'application ne peut rien garder (navigateur, téléphone) |
| **déprécié** | à ne plus utiliser (mais encore vu dans de vieux tutos) |

---

## La table de décision

> [!tip] En clair
> **Le raccourci ultime :** en cas de doute, c'est **Authorization Code + PKCE**. C'est le bon choix dans la quasi-totalité des cas.
>
> Les autres ne servent que dans des situations bien précises.

| Flow | Utilisateur ? | Secret ? | Usage | Statut |
|---|---|---|---|---|
| **[[authorization_code_flow]]** | oui | oui (ou [[pkce]]) | web, mobile, SPA, desktop | ✅ **recommandé** |
| **[[client_credentials_flow]]** | **non** | oui | service à service (M2M) | ✅ |
| **[[device_authorization_flow]]** | oui | non | TV, CLI, objets connectés | ✅ |
| ~~Implicit~~ | oui | non | SPA (autrefois) | ❌ **déprécié** |
| ~~Password~~ | oui | — | login direct | ❌ **interdit** |

---

## Détail des flows vivants

### Authorization Code Flow (+ PKCE)

> [!tip] En clair
> **Le flow de référence.** Ton navigateur va chercher un **ticket sans valeur**, l'application l'échange par une **porte de service** contre le vrai badge. C'est celui qu'on utilise quand il y a un utilisateur.

- **Quand** : web, SPA, mobile, desktop — dès qu'un utilisateur se connecte.
- **Pourquoi** : les jetons ne traversent **jamais** le navigateur ; seul un code jetable y circule.
- **Pour les clients publics** : [[pkce]] est **obligatoire** (RFC 9700), en `S256`.
- **Détail** : [[authorization_code_flow]].

### Client Credentials Flow

> [!tip] En clair
> **Pas d'utilisateur du tout.** C'est l'application elle-même qui se présente, avec son propre mot de passe, et reçoit un badge **à son nom**.

- **Quand** : un microservice appelle une API, un job nocturne, un pipeline CI/CD.
- **Le piège** : le badge représente **l'application**, jamais une personne.
- **Détail** : [[client_credentials_flow]].

### Device Authorization Flow

> [!tip] En clair
> **L'appareil n'a pas de navigateur utilisable** (TV, console, CLI). Il affiche un code court, tu te connectes sur ton téléphone, et l'appareil attend son badge.

- **Quand** : TV, CLI, consoles, objets connectés.
- **L'astuce** : la saisie sensible se fait sur un appareil confortable, jamais sur l'appareil limité.
- **Détail** : [[device_authorization_flow]].

---

## Les flows morts

### Implicit Flow — ❌ déprécié

> [!tip] En clair
> **L'ancienne méthode :** le badge arrivait **directement dans l'URL**, sans échange. Résultat : il traînait dans l'historique, les logs et le `Referer`.
>
> C'est exactement le risque que tout le reste du protocole sert à éviter. **À ne jamais utiliser.** Si tu le vois dans un vieux tutoriel, c'est un tutoriel périmé.

L'`access_token` (voire l'`id_token`) était rendu dans le **fragment** de l'URL de redirection, sans échange back-channel. Le jeton se retrouvait exposé à l'historique du navigateur, à `Referer`, au JavaScript de la page et aux extensions. Son ancien argument — l'absence de back-channel sur une SPA — est résolu par **Authorization Code + PKCE**. Déprécié par la RFC 9700 §2.1.2 et supprimé d'OAuth 2.1.

### Password Grant — ❌ interdit

> [!tip] En clair
> **L'ancienne méthode :** l'application affichait son **propre** formulaire de login, collectait ton mot de passe, et l'envoyait au guichet.
>
> Le problème est évident : l'application **voit ton mot de passe**. C'est précisément ce qu'OAuth a été inventé pour éviter. Interdit par la RFC 9700 §2.4 et par OAuth 2.1.

Le client collectait directement les identifiants de l'utilisateur (login/mot de passe) et les présentait au `/token`. Le client voit donc le mot de passe, contourne le consentement et le contrôle des scopes, et casse la séparation des rôles. Aucun usage résiduel légitime : remplacer par Authorization Code + PKCE, ou par une migration d'authentification.

### Hybrid Flow — cas avancé

> [!tip] En clair
> **Ni mort, ni courant.** Il renvoie **en même temps** un code et un jeton d'identité dans la redirection. Réservé à des cas de sécurité avancés, et toujours avec un code pour la partie sensible.
>
> En pratique, on ne le croise presque jamais.

Le **Hybrid Flow** (OIDC Core §3.3) retourne depuis l'authorization endpoint à la fois un `code` et un `id_token` (voire un `token`), selon la valeur de `response_type` (`code id_token`, `code token`, `code id_token token`). Il sert notamment à afficher immédiatement une identité avant l'échange, mais exige une validation rigoureuse (`c_hash`, `at_hash`) et reste un cas avancé. La variante contenant `token` est à éviter (jeton en front-channel).

---

## L'ordre de préférence

> [!tip] En clair
> Si tu dois retenir un ordre, c'est celui-là :
> 1. **Il y a un utilisateur ?** → Authorization Code **+ PKCE**. Point final.
> 2. **Pas d'utilisateur ?** → Client Credentials.
> 3. **Utilisateur mais appareil sans navigateur ?** → Device.
>
> Le reste : soit mort, soit avancé.

1. **Authorization Code + PKCE** — par défaut, dès qu'il y a un utilisateur.
2. **Client Credentials** — machine-to-machine, sans utilisateur.
3. **Device** — utilisateur présent, appareil sans navigateur utilisable.
4. **Hybrid** — cas avancés uniquement, avec validation renforcée.
5. **Implicit / Password** — **jamais**.

---

## Ce que ça change, côté sécurité

> [!tip] En clair
> La tendance est claire : on **supprime tout ce qui fait passer un jeton par le navigateur**, et on **impose PKCE** partout où un code circule.

| Règle | Source | En clair |
|---|---|---|
| Code flow par défaut | RFC 9700 §2.1.1 | on échange toujours le code contre un jeton |
| **PKCE obligatoire** pour les clients publics | RFC 9700 §2.1 | les applications sans secret doivent utiliser PKCE |
| `S256` seule méthode | RFC 9700 §2.1 | `plain` doit être refusé |
| Implicit déprécié | RFC 9700 §2.1.2 | plus de jeton dans l'URL |
| Password interdit | RFC 9700 §2.4 | plus de mot de passe collecté par l'application |
| `redirect_uri` exacte | RFC 9700 §2.1, §4.1 | pas de correspondance partielle ni de wildcard |

Voir [[security_oauth21]] pour le détail, et [[pkce]] pour la protection centrale.

---

## Exemple concret

> [!tip] En clair
> **Quatre situations, quatre réponses.** C'est un exercice de réflexe.

| Situation | Flow à choisir |
|---|---|
| Une application web avec back-end | Authorization Code (+ PKCE, recommandé) |
| Une SPA sans back-end | Authorization Code + **PKCE** (obligatoire) |
| Une application mobile | Authorization Code + **PKCE** (obligatoire) |
| Un microservice qui appelle une API | **Client Credentials** |
| Une Smart TV / console | **Device Authorization** |
| Un CLI (`gh auth login`) | **Device Authorization** |
| Un vieux tuto propose Implicit | ❌ **ne pas suivre** |
| Une appli qui veut ton mot de passe | ❌ **refuser** |

---

## Pièges fréquents

> [!tip] En clair
> **Les 5 erreurs à retenir :**
> 1. **Suivre un tuto qui utilise Implicit** → déprécié, jeton exposé.
> 2. **Utiliser Client Credentials pour un utilisateur** → le badge ne représente personne.
> 3. **Oublier PKCE** sur une SPA ou un mobile → c'est obligatoire.
> 4. **Choisir à la main un « flow exotique »** → en cas de doute, c'est Code + PKCE.
> 5. **Croire qu'un flow délivre l'identité** → seul le code flow + OIDC le fait.

- **Implicit encore utilisé** — jeton exposé dans l'URL, historique et `Referer`. Réflexe : migrer vers Authorization Code + PKCE (RFC 9700 §2.1.2).
- **Password grant encore présent** — le client voit le mot de passe. Réflexe : bannir (RFC 9700 §2.4), migrer.
- **PKCE omis sur un client public** — un code intercepté devient échangeable. Réflexe : PKCE `S256` **obligatoire**.
- **Client Credentials pour un utilisateur** — aucune identité utilisateur, `sub` = l'application. Réflexe : Authorization Code dès qu'il y a un utilisateur.
- **Device flow sans PKCE** — échange de code déguisé non protégé. Réflexe : PKCE sur les clients non confidentiels (RFC 8628 §5.6).
- **Hybrid avec `token`** — jeton renvoyé en front-channel. Réflexe : préférer `code` ou `code id_token`, et valider `c_hash`/`at_hash`.
- **`redirect_uri` approximative** — correspondance partielle ou wildcard exploitable. Réflexe : correspondance **exacte** (RFC 9700 §2.1).
- **Croire qu'un flow « suffit » à authentifier** — aucun flow ne prouve l'identité sans [[id_token]] validé. Réflexe : [[openid_connect]] + validation complète.

---

## Rappel

> [!question] Question de rappel
> On vous demande de choisir un flow pour une application mobile sans back-end. Que proposez-vous, et pourquoi les deux autres options sont-elles exclues ?

> [!success]- Réponse
> **Authorization Code + PKCE.** Le client est **public** (aucun secret ne peut être conservé sur un mobile) : PKCE est donc **obligatoire**, et le code flow garantit que les jetons n'apparaissent jamais dans le navigateur ou l'OS. L'**Implicit** est exclu car déprécié (jeton exposé en front-channel) ; le **Client Credentials** est exclu car il n'y a **aucune identité** à représenter — ce grant sert un service agissant en son propre nom, pas un utilisateur qui se connecte.

### 🎯 Le résumé à retenir

> [!tip] Si tu ne retiens qu'une chose
> **Deux questions suffisent : y a-t-il un utilisateur ? l'appli peut-elle garder un secret ?**
>
> - Utilisateur → **Authorization Code (+ PKCE obligatoire si client public)**
> - Pas d'utilisateur → **Client Credentials**
> - Appareil sans navigateur → **Device**
>
> Et **Implicit** / **Password** : jamais. Ce sont les deux seuls à bannir sans réfléchir.

---

## Voir aussi

- [[authorization_code_flow]] — le flow recommandé, de bout en bout.
- [[pkce]] — l'extension obligatoire des clients publics.
- [[client_credentials_flow]] — le grant machine-to-machine.
- [[device_authorization_flow]] — le grant des appareils sans navigateur.
- [[oauth2]] — le cadre et ses quatre grants fondateurs.
- [[security_oauth21]] — les dépréciations et les exigences actuelles.
- [[openid_connect]] — le flow qui délivre l'identité.
- [[index]] — carte d'entrée du dossier.

## Références

- RFC 6749 — *The OAuth 2.0 Authorization Framework*, §1.3 (grant types), §4.1 à §4.4.
- RFC 8628 — *OAuth 2.0 Device Authorization Grant*.
- RFC 7636 — *Proof Key for Code Exchange* (PKCE).
- RFC 9700 (BCP 240) — *Best Current Practice for OAuth 2.0 Security*, §2.1 (dépréciation d'Implicit), §2.4 (Password), §4.1 (`redirect_uri`).
- draft-ietf-oauth-v2-1 — *The OAuth 2.1 Authorization Framework*.
- OpenID Connect Core 1.0 — §3.3 (Hybrid Flow).
