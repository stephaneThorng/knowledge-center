---
title: OAuth 2.0
aliases: [OAuth2, OAuth 2.0 Framework, RFC 6749]
tags: [oidc, oauth2, autorisation, delegation, framework]
domaine: securite/oidc
niveau: intermediaire
statut: draft
cree: 2026-10-01
sources: ["RFC 6749", "RFC 6750", "RFC 7009", "RFC 7662", "RFC 9700"]
---

# OAuth 2.0

> [!abstract] Ancre
> OAuth 2.0 est un cadre de **délégation d'accès** : il permet à une application d'obtenir un jeton limité pour agir sur une API, sans jamais manipuler le mot de passe de l'utilisateur.

---

## 🧒 Avant de commencer : de quoi on parle

> [!tip] En clair
> Tu veux que quelqu'un aille chercher tes enfants à l'école. Tu ne lui donnes **pas** ta carte d'identité ni tes clés de maison — tu lui donnes juste **une autorisation précise** : « cette personne peut récupérer mes enfants, aujourd'hui, à cette école ».
>
> C'est ça, OAuth : **autoriser quelqu'un à faire une chose précise, en ton nom, sans lui donner ton mot de passe.**

**Les 4 personnages à connaître (ils reviennent dans toutes les notes) :**

| Mot technique | En clair |
|---|---|
| **Resource Owner** | toi : tu possèdes les données |
| **Client** | l'application qui veut y accéder |
| **Authorization Server (AS)** | le guichet qui délivre les autorisations (Google, Keycloak…) |
| **Resource Server (RS)** | le serveur qui garde les données (l'API) |

**Et les 2 objets :**

| Mot technique | En clair |
|---|---|
| **Access Token** | le badge : il ouvre les portes |
| **scope** | le périmètre : quelles portes exactement |

---

## Définition

> [!tip] En clair
> OAuth est un **cadre d'autorisation**, pas d'authentification. Autrement dit : il répond à la question « **qu'est-ce que cette application a le droit de faire ?** », et **pas** à « **qui est cet utilisateur ?** ».
>
> Cette distinction est la source de la confusion la plus répandue au monde sur OAuth. Retiens-la bien : **l'autorisation et l'identité sont deux choses séparées** (l'identité, c'est le travail d'[[openid_connect]]).

OAuth 2.0 est un cadre d'**autorisation** (RFC 6749) qui permet à un client d'obtenir un accès délégué et limité à une ressource protégée, au nom d'un *resource owner*, via l'émission de jetons par un serveur d'autorisation.
Ce n'est **pas** un protocole d'authentification : il ne dit pas *qui* est l'utilisateur, mais *à quoi* le client est autorisé.

---

## Enjeux

> [!tip] En clair
> **Le problème avant OAuth :** pour qu'une app accède à tes contacts, tu devais lui donner ton **mot de passe**. Elle le rangeait quelque part, elle pouvait tout faire (pas seulement lire tes contacts), et pour lui retirer l'accès il fallait… changer ton mot de passe partout.
>
> **La solution OAuth :** tu ne donnes jamais ton mot de passe. Tu donnes un **badge limité dans le temps et dans les droits**, et révocable à tout moment.

Avant OAuth, un client tiers devait stocker les identifiants de l'utilisateur pour agir sur son compte : secret partagé, périmètre illimité, révocation impossible sans changer le mot de passe. OAuth introduit une délégation où l'utilisateur ne cède jamais son mot de passe :

- le client obtient un **jeton** ([[access_token]]), pas un secret durable ;
- ce jeton porte un **périmètre** (*scope*) et une **durée de vie** : il est limité et révocable ;
- la révocation et l'audit sont centralisés sur le serveur d'autorisation, décrit dans [[discovery_and_jwks]].

Les faiblesses réelles (fuite de code, *mix-up*, jetons volés) sont traitées dans [[security_oauth21]].

**Historique.** OAuth 1.0/1.0a signait chaque requête (HMAC-SHA1) : sûr mais complexe. [[oauth2]] (RFC 6749, 2012) simplifie via TLS et distingue les *flows* par type de client. Les attaques accumulées ont produit le Security BCP (RFC 9700, 2025) puis **OAuth 2.1** (draft), qui intègre ces règles dans une RFC unique : suppression de l'*implicit* et du *password grant*, [[pkce]] obligatoire pour les clients publics, redirection stricte. OAuth 2.1 n'est donc pas un nouveau protocole, mais « OAuth 2.0 + les bonnes pratiques ».

---

## Fonctionnement détaillé

### Les quatre rôles (RFC 6749 §1.1)

> [!tip] En clair
> Reprends la métaphore : **toi** (tu déléguerais), la **personne de confiance** (l'app), le **guichet** qui délivre l'autorisation, et la **maison** où sont les choses à faire.

1. **Resource Owner** — l'utilisateur qui possède les données et peut déléguer.
2. **Client** — l'application qui demande l'accès ; identifiée par un `client_id`.
3. **Authorization Server (AS)** — authentifie le resource owner, recueille le consentement et émet les jetons (lié à [[openid_connect]] quand il ajoute l'authentification).
4. **Resource Server (RS)** — l'API protégée, qui valide les [[access_token]] reçus.

### Types de clients (RFC 6749 §2.1)

> [!tip] En clair
> Deux types d'applications, et tout le reste en découle :
> - **Celle qui peut garder un secret** (elle a un serveur à elle) → *confidentielle*.
> - **Celle qui ne peut rien garder** (elle vit dans ton navigateur ou ton téléphone) → *publique*. Pour elle, [[pkce]] est **obligatoire**.

- **Confidential** : peut garder un secret (`client_secret` ou clé privée) — back-end ; échange le code contre un jeton côté serveur.
- **Public** : ne peut garder aucun secret — SPA, mobile, desktop. Le [[pkce]] (RFC 7636) y est **obligatoire**, sinon un code intercepté peut être échangé.

### Les grants

> [!tip] En clair
> Un « grant », c'est juste **une façon d'obtenir le badge**. Il y en a plusieurs, selon la situation :
> - Il y a un utilisateur qui clique ? → *Authorization Code*.
> - Pas d'utilisateur, juste deux machines ? → *Client Credentials*.
> - L'appareil n'a pas de navigateur (TV, console) ? → *Device*.
>
> Et deux sont **morts** (Implicit, Password) : ne les utilise jamais.

| Grant | Spec | Usage | Note dédiée |
|---|---|---|---|
| Authorization Code | RFC 6749 §4.1 | Web/SPA/mobile, avec utilisateur | [[authorization_code_flow]] |
| Client Credentials | RFC 6749 §4.4 | Machine-to-machine, sans utilisateur | [[client_credentials_flow]] |
| Device Authorization | RFC 8628 | TV, CLI, appareils sans navigateur | [[device_authorization_flow]] |
| Refresh Token | RFC 6749 §1.5 | Renouveler un accès expiré | [[refresh_token]] |
| ~~Implicit~~ | RFC 6749 §4.2 | **Déprécié** (RFC 9700 §2.1.2) | — |
| ~~Password~~ | RFC 6749 §4.3 | **Interdit** (RFC 9700 §2.4) | — |

Le choix dépend de deux axes : y a-t-il un utilisateur, et le client peut-il garder un secret. Synthèse dans [[flows_comparison]].

### Endpoints standards

> [!tip] En clair
> Ce sont les **guichets** du serveur d'autorisation. Deux sont essentiels :
> - `/authorize` = je **demande** l'autorisation (dans le navigateur).
> - `/token` = j'**échange** contre le badge (par la porte de service).
>
> Les autres servent à vérifier ou annuler un badge.

- `GET /authorize` — entrée navigateur (`response_type`, `client_id`, `redirect_uri`, `scope`, `state`) ; renvoie un `code`.
- `POST /token` — échange `grant_type` contre des jetons ; émet aussi le [[refresh_token]].
- `POST /introspect` — **RFC 7662** : le RS demande à l'AS si un jeton est actif (`scope`, `sub`, `exp`). Indispensable pour les jetons opaques.
- `POST /revoke` — **RFC 7009** : invalide un access ou refresh token (`token_type_hint`).

Métadonnées : `/.well-known/oauth-authorization-server` (RFC 8414) et `/.well-known/oauth-protected-resource` (RFC 9728), découvertes via [[discovery_and_jwks]].

### Les jetons

> [!tip] En clair
> Trois objets, trois rôles :
> - **Access Token** = le badge. Il ouvre les portes. Court dans le temps.
> - **Refresh Token** = le **duplicata** du badge. Il sert à en refabriquer un quand le premier expire, sans te redemander ton mot de passe.
> - **Bearer** = la **règle du jeu** : « celui qui montre le badge passe ». Simple, mais **dangereux** — si quelqu'un le vole, il passe aussi.

- **[[access_token]]** : preuve d'autorisation présentée au RS, **opaque** (validé par introspection) ou **JWT** (RFC 9068, vérifiable hors-ligne via JWKS — voir [[jwt]]).
- **[[refresh_token]]** : secret de longue durée, stocké côté client confidentiel, il délivre un nouvel access token sans réinteraction ; à *roter* et à lier au client.
- **Bearer (RFC 6750)** : le porteur est réputé autorisé — simple mais **dangereux** : tout vol (log, historique, `Referer`) permet le rejeu. Remèdes : aucun jeton en URL, restriction d'`aud`, jetons *sender-constrained* via [[mtls]] (RFC 8705) ou [[dpop]] (RFC 9449).

### Les scopes

> [!tip] En clair
> Le **scope** est le **périmètre** : il dit ce que le badge autorise précisément (« lire tes contacts », mais pas « tout modifier »). Le principe : **toujours demander le minimum nécessaire**.

Un **scope** (`read contacts`) est demandé par le client et accordé par l'AS ; il décrit une capacité, pas une identité, et borne la portée du jeton. Moindre privilège oblige : demander le minimum, et le RS vérifie le `scope` du jeton, jamais le client.

Côté OIDC, les scopes standard (`openid`, `profile`, `email`, `address`, `phone`, `offline_access`) et le catalogue des claims associés sont détaillés dans [[scopes_and_claims]].

### Diagramme de haut niveau

> [!tip] En clair
> Tout le monde au complet, une fois, de bout en bout. Si ce schéma est clair, tu as compris OAuth.

```mermaid
sequenceDiagram
    autonumber
    participant RO as Resource Owner
    participant C as Client
    participant AS as Authorization Server
    participant RS as Resource Server
    RO->>C: veut utiliser l'app
    C->>AS: GET /authorize (client_id, scope, PKCE)
    AS->>RO: authentification + consentement
    RO->>AS: approuve les scopes
    AS-->>C: redirect_uri?code=...&state=...
    C->>AS: POST /token (code + code_verifier)
    AS-->>C: access_token (+ refresh_token)
    C->>RS: GET /api (Authorization: Bearer <access_token>)
    RS->>RS: valide le jeton (JWKS ou /introspect)
    RS-->>C: 200 (ressource protégée)
```

## Exemple concret

> [!tip] En clair
> Un petit aller-retour complet, en langage machine. Trois temps : **je demande** (requête 1), **j'échange** (requête 2), **j'utilise le badge** (requête 3).

Redirection vers le serveur d'autorisation :
```http
GET /authorize?response_type=code
    &client_id=s6BhdRkqt3
    &redirect_uri=https%3A%2F%2Fclient.example.org%2Fcb
    &scope=read%20write
    &state=xyz123
    &code_challenge=E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM
    &code_challenge_method=S256
Host: auth.example.com
```
Échange du code (client confidentiel, `code_verifier` du [[pkce]]) :
```bash
curl -X POST https://auth.example.com/token \
  -u "s6BhdRkqt3:secret" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "grant_type=authorization_code" \
  -d "code=SplxlOBeZQQYbYS6WxSbIA" \
  -d "redirect_uri=https://client.example.org/cb" \
  -d "code_verifier=dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk"
```
Réponse de l'AS :
```json
{
  "access_token": "2YotnFZFEjr1zCsicMWpAA",
  "token_type": "Bearer",
  "expires_in": 3600,
  "refresh_token": "tGzv3JOkF0XG5Qx2TlKWIA",
  "scope": "read write"
}
```
Appel de l'API : `GET https://api.example.com/contacts` avec l'en-tête `Authorization: Bearer 2YotnFZFEjr1zCsicMWpAA`.

## Pièges fréquents

> [!tip] En clair
> **Les 4 erreurs à retenir avant tout :**
> 1. Croire qu'OAuth dit **qui** tu es → non, il dit seulement **ce que tu peux faire** (l'identité, c'est [[openid_connect]]).
> 2. Accepter une adresse de retour « presque pareille » → un attaquant y détourne le code.
> 3. Laisser traîner un badge dans l'URL → il finit dans les logs et l'historique.
> 4. Utiliser Implicit ou Password → **bannis**, jamais.

- **Croire qu'OAuth authentifie** : un access token n'est pas un [[id_token]] ; le client ignore *qui* est l'utilisateur → utiliser [[openid_connect]].
- **`redirect_uri` en wildcard** (RFC 9700 §2.1) : un domaine voisin vole le code → correspondance exacte.
- **Ni `state` ni PKCE** : CSRF sur le callback, injection de code → `state` lié à la session, [[pkce]] systématique.
- **Jeton en query string** : fuite par logs, historique, `Referer` → uniquement l'en-tête `Authorization`.
- **Implicit / password grant** : jeton exposé au navigateur, mot de passe partagé → bannis, préférer code + [[pkce]].
- **Confondre auth du client et de l'utilisateur** : `client_credentials` identifie l'app, pas l'utilisateur.
- **Refresh token sans rotation** : un vol donne un accès permanent → rotation, détection de réutilisation, stockage chiffré.
- **Décoder un JWT sans vérifier la signature** : `alg: none` accepté → valider signature (JWKS), `iss`, `aud`, `exp`.

## Rappel
> [!question] Question de rappel
> Pourquoi un access token OAuth valide ne suffit-il pas à authentifier un utilisateur auprès d'une application ?

> [!success]- Réponse
> Parce qu'OAuth 2.0 est un cadre d'**autorisation** : le jeton prouve une délégation d'accès, pas l'identité du sujet. Le client ne reçoit aucun `sub` garanti, et un jeton destiné à une API n'est pas un jeton destiné au client. L'authentification fédérée exige [[openid_connect]] et son [[id_token]].

### 🎯 Le résumé à retenir

> [!tip] Si tu ne retiens qu'une chose
> **OAuth = déléguer un accès, sans donner son mot de passe.**
> On donne un **badge limité** (périmètre + durée), révocable à tout moment.
>
> **Et surtout :** OAuth dit **ce que** l'app peut faire — **jamais qui** tu es. Pour l'identité, il faut [[openid_connect]], qui vient se poser **par-dessus**.

---

## Voir aussi
- [[oidc/index]] — point d'entrée de la thématique sécurité/OIDC.
- [[openid_connect]] — couche d'authentification au-dessus d'OAuth 2.0.
- [[authorization_code_flow]] — le grant de référence avec utilisateur.
- [[pkce]] — extension obligatoire pour les clients publics.
- [[client_credentials_flow]] — accès machine-to-machine.
- [[refresh_token]] — renouvellement et rotation de l'accès.
- [[access_token]] — opaque vs JWT, validation côté RS.
- [[scopes_and_claims]] — les périmètres d'autorisation et les données d'identité associées.
- [[flows_comparison]] — choisir le bon grant.

## Références
- RFC 6749 — *The OAuth 2.0 Authorization Framework*.
- RFC 6750 — *The OAuth 2.0 Authorization Framework: Bearer Token Usage*.
- RFC 7009 — *OAuth 2.0 Token Revocation*.
- RFC 7636 — *Proof Key for Code Exchange by OAuth Public Clients* (PKCE).
- RFC 7662 — *OAuth 2.0 Token Introspection*.
- RFC 8414 — *OAuth 2.0 Authorization Server Metadata*.
- RFC 8628 — *OAuth 2.0 Device Authorization Grant*.
- RFC 9068 — *JWT Profile for OAuth 2.0 Access Tokens*.
- RFC 9700 (BCP 240) — *Best Current Practice for OAuth 2.0 Security*.
- RFC 9728 — *OAuth 2.0 Protected Resource Metadata*.
- draft-ietf-oauth-v2-1 — *The OAuth 2.1 Authorization Framework*.
