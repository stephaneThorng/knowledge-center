---
title: ID Token
aliases: [ID Token, Jeton d'identité, ID Token OIDC, Jeton d'identification]
tags: [oidc, oauth2, id-token, jwt, authentification]
domaine: securite/oidc
niveau: intermediaire
statut: draft
cree: 2026-10-01
sources: [OpenID Connect Core 1.0, RFC 7519, RFC 8725, RFC 9068]
---

# ID Token

> [!abstract] Ancre
> L'ID Token prouve *qui* est l'utilisateur au client ; il ne donne accès à aucune API.

---

## 🧒 Avant de commencer : de quoi on parle

> [!tip] En clair
> On a deux papiers qui se ressemblent mais qui n'ont **pas du tout** le même usage :
>
> - **L'access token** = le **badge**. Tu le montres à une porte pour **faire** quelque chose.
> - **L'ID Token** = la **carte d'identité**. Tu la montres à l'application pour qu'elle sache **qui tu es**.
>
> Tu ne montres **jamais** ta carte d'identité pour ouvrir une porte, et tu ne montres **jamais** ton badge pour prouver ton nom. Confondre les deux est l'erreur la plus fréquente d'OIDC.

**Les mots à connaître pour cette note :**

| Mot technique | En clair |
|---|---|
| **ID Token** | la carte d'identité signée par le guichet |
| **claim** | une ligne de la carte (`sub` = identifiant, `email` = adresse…) |
| **`sub`** | ton identifiant stable chez le guichet (ne change jamais) |
| **`aud`** | « à qui cette carte est destinée » — doit être l'application |
| **`iss`** | « qui a émis cette carte » — le guichet |
| **`exp`** | « jusqu'à quand la carte est valable » |
| **signature** | le cachet du guichet : ce qui rend la carte infalsifiable |

Voir aussi : [[openid_connect]] (le protocole) et [[jwt]] (le format de la carte).

---

## Définition

> [!tip] En clair
> L'ID Token est un **petit document signé** que le guichet remet à l'application, à la fin de la connexion. Il dit : « cet utilisateur, c'est celui-là, et il s'est bien connecté à telle heure ».
>
> Le **cachet** (la signature) est essentiel : sans lui, n'importe qui pourrait fabriquer un faux document. Le contenu seul ne vaut rien.
>
> 🔧 **Le mot technique :** ce document s'appelle l'**ID Token**. Il est au format [[jwt]].

L'ID Token est un [[jwt]] signé (JWS) émis par l'OpenID Provider à l'issue de l'authentification — [[oauth2]] fournit le transport, [[openid_connect]] ajoute l'identité. Il atteste, pour le client (RP), l'identité de l'utilisateur et l'instant de son authentification. Ce n'est **pas** un [[access_token]] : il ne s'utilise jamais contre une API.

---

## Enjeux

> [!tip] En clair
> L'ID Token est **la pièce la plus importante d'OIDC** : c'est en la lisant que l'application décide « ok, je te connais, j'ouvre ta session ».
>
> **Mais attention** : une carte d'identité que personne ne vérifie ne vaut **rien**. Si l'application se contente de lire le contenu sans contrôler le cachet, un escroc peut lui présenter une carte fabriquée à la maison. C'est tout l'enjeu : **la vérification**.

L'ID Token est le cœur d'[[openid_connect]] : c'est la pièce que le RP inspecte pour ouvrir une session locale. Sa valeur tient entièrement à la **vérification** faite par le client — un jeton non validé vaut zéro.

- **Preuve d'authentification, pas d'autorisation** : « cet utilisateur s'est authentifié à telle heure », jamais « il a le droit d'appeler `/factures` ».
- **Destinataire unique** : `aud` désigne le client, pas le resource server — frontière stricte avec le [[access_token]].
- **Durée très courte** : quelques minutes, consommé une fois pour ouvrir la session ([[authorization_code_flow]], [[pkce]]) ; la continuité passe par un [[refresh_token]] ou un cookie côté serveur, jamais par l'ID Token.
- **Surface d'attaque** : signature non vérifiée, `alg` manipulé, `aud` ignoré, `nonce` absent — les erreurs qui transforment une brique d'identité en usurpation ([[security_oauth21]]).

---

## Fonctionnement détaillé

### ID Token vs Access Token : ne jamais les confondre

> [!tip] En clair
> Le tableau ci-dessous est **le plus important de la note**. Si tu ne retiens qu'une ligne : **le badge s'adresse à l'API, la carte s'adresse à l'application.**

| Critère | ID Token | [[access_token]] |
|---|---|---|
| Destinataire (`aud`) | Le **client** (`client_id`) | Le **resource server** (API) |
| Rôle | Prouver l'identité | Autoriser l'accès à une ressource |
| Format | Toujours un [[jwt]] signé | Opaque ou JWT (RFC 9068, `typ: at+jwt`) |
| Qui le lit / vérifie | Le client | L'API |
| Usage | Une fois, pour créer la session | À chaque appel, jusqu'à expiration |
| Transmis à une API ? | **Jamais** | Oui, en `Authorization: Bearer *** |

L'ID Token est un **acte de naissance** présenté au guichet ; l'access token est le **badge** qui ouvre les portes. Présenter l'un à la place de l'autre est une erreur de modèle, pas un détail d'implémentation.

### Claims : obligatoires et additionnels

> [!tip] En clair
> Chaque ligne de la carte s'appelle un **claim**. Il y en a qu'on est **obligé** de mettre (les 6 ci-dessous), et d'autres qu'on ajoute si besoin.
>
> Retiens surtout les trois noms à surveiller : **`iss`** (qui a émis), **`sub`** (qui tu es), **`aud`** (à qui c'est destiné).

Catalogue complet des claims, de leur fiabilité et de la façon de les demander : [[scopes_and_claims]].

Claims **obligatoires** ([[jwt|RFC 7519]] + OIDC Core §2) :

| Claim | Sens | Requis | Piège |
|---|---|---|---|
| `iss` | Émetteur (URL de l'OP) | Oui | Comparer **exactement** : casse et slash final compris |
| `sub` | Identifiant local de l'utilisateur | Oui | Stable, contrairement à `email` |
| `aud` | Audience = `client_id` du RP | Oui | Souvent un tableau : vérifier la **présence** du bon `client_id` |
| `exp` | Expiration | Oui | Quelques minutes ; tolérance d'horloge |
| `iat` | Émis à | Oui | Sert à juger la fraîcheur |
| `nonce` | Anti-rejeu | Oui si jeton rendu par l'authorization endpoint | Doit être **identique** à celui envoyé |

Claims **OIDC additionnels** (OIDC Core §2, §5.1) :

| Claim | Sens | Requis quand | Piège |
|---|---|---|---|
| `auth_time` | Instant d'authentification réelle | `max_age` demandé | Distinct de `iat` (SSO silencieux) |
| `acr` | Contexte d'authentification (niveau MFA) | Politique de sécurité | Déclaré par l'OP, pas par le client — voir [[step_up_auth]] |
| `amr` | Méthodes utilisées (`pwd`, `mfa`, `otp`) | Souhaité | Tableau de chaînes sensibles à la casse |
| `azp` | Partie autorisée à qui le jeton a été émis | Multi-audience | `aud` multiple sans `azp` → **rejeter** |
| `at_hash` | Empreinte du [[access_token]] associé | Jeton rendu par l'authorization endpoint | Bloque la substitution de jeton |
| `c_hash` | Empreinte du `code` | Flow hybride | Uniquement en `code id_token` |
| `sid` | Identifiant de session | Déconnexion globale | Utile à `end_session` |
| `sub_jwk` | Clé publique du sujet | Self-issued OP | `iss` = `sub` dans ce cas |
| `email` / `email_verified` | Adresse électronique | Scope `email` | Ne jamais croire `email` sans `email_verified` |

### Validation côté RP : les étapes obligatoires (OIDC Core §3.1.3.7)

> [!tip] En clair
> C'est la **checklist de sécurité** : tout ce que l'application DOIT faire avant de faire confiance à la carte. Les trois contrôles les plus importants en premier :
> 1. **Le cachet est-il authentique ?** (la signature)
> 2. **La carte est-elle pour moi ?** (`aud`)
> 3. **Est-ce bien la carte de MA session ?** (`nonce`)
>
> Sans ces trois-là, tout le reste ne sert à rien.

À la réception, le client **MUST** :

1. **Vérifier la signature** avec la clé publique de l'OP récupérée via [[discovery_and_jwks]] (`jwks_uri`), sélectionnée par `kid`. Sans cette étape, tout le reste est décoratif : un jeton forgé passe.
2. **Vérifier `alg`** contre une **liste blanche** (`RS256`, `ES256`…). Refuser `none` et un `HS256` inattendu : c'est la **confusion d'algorithme** (HMAC signé avec la clé publique RSA).
3. **`iss` strictement égal** à l'émetteur attendu.
4. **`aud` contient le `client_id`** du RP ; si plusieurs audiences, exiger **`azp` égal** au `client_id` et rejeter les audiences non fiables.
5. **Fenêtre temporelle** : `exp` non dépassé, `nbf` non futur, `iat` cohérent, avec **tolérance d'horloge** explicite (≈ 60 s) pour éviter les faux rejets.
6. **`nonce` identique** à celui envoyé (obligatoire quand le jeton vient du authorization endpoint) : défense anti-rejeu.
7. **`at_hash`** si présent : recalculer l'empreinte de l'access token reçu et comparer.
8. **`c_hash`** si présent : même contrôle sur le `code`.
9. **`auth_time`** comparé à `max_age` si une durée maximale de session a été demandée.
10. **`kid` absent ou introuvable** : recharger le JWKS (rotation), puis échouer — jamais de confiance par défaut.

```mermaid
sequenceDiagram
    participant RP as Client (RP)
    participant OP as OpenID Provider
    RP->>OP: Authorization Request (nonce, state, PKCE)
    OP-->>RP: code
    RP->>OP: Token Request (code + verifier)
    OP-->>RP: id_token (JWS) + access_token
    RP->>OP: GET jwks_uri
    OP-->>RP: clés publiques (kid)
    Note over RP: signature, iss, aud, azp, exp, nonce, at_hash, alg
    RP->>RP: Créer la session locale (cookie)
```

## Exemple concret

> [!tip] En clair
> Voici une vraie carte d'identité, décodée. Repère surtout **`iss`** (c'est bien mon guichet ?), **`aud`** (c'est bien ma carte ?), **`sub`** (c'est bien moi ?) et **`exp`** (elle est encore valable ?).
>
> Le `header` (partie 1) dit **comment** vérifier le cachet ; le `payload` (partie 2) contient les **informations**.

ID Token typique d'un SSO d'entreprise (RP `app-portail`, OP `auth.exemple.com`), décodé :

```json
// Header
{
  "alg": "RS256",              // asymétrique : le RP vérifie avec la clé publique
  "kid": "2026-09-01-a1b2",    // identifie la clé dans le JWKS → rotation
  "typ": "JWT"                 // un access token OIDC porterait "at+jwt" (RFC 9068)
}
```

```json
// Payload
{
  "iss": "https://auth.exemple.com",   // doit correspondre EXACTEMENT à l'issuer de discovery
  "sub": "f3a9c1e2-88b4-4d77-9e01-5c2ab7d19f40",  // identité stable côté OP (jamais l'email)
  "aud": "app-portail",                 // le CLIENT, pas l'API
  "azp": "app-portail",                 // partie autorisée (explicite si multi-audience)
  "exp": 1759316420,                    // valide 5 minutes seulement
  "iat": 1759316120,
  "auth_time": 1759316000,              // authentification réelle 2 min avant l'émission
  "nonce": "n-0S6_WzA2Mj",             // identique à celui envoyé par le RP
  "acr": "urn:mace:incommon:iap:silver",
  "amr": ["pwd", "otp"],                // mot de passe + OTP : le MFA est visible
  "at_hash": "77QmUPtjPfzWtF2AnpK9RQ",  // empreinte de l'access token (anti-substitution)
  "sid": "08a5019c-17e1-4977-8f42-65a12843ea02",
  "email": "alice@exemple.com",
  "email_verified": true                // à contrôler AVANT d'utiliser email
}
```

Avec `alg` et `kid`, le RP sait quelle clé demander à `jwks_uri` ; avec `aud`, que le jeton lui est destiné ; avec `nonce` et `at_hash`, qu'il n'est ni rejoué ni substitué. Les trois vérifications les plus souvent sautées sont justement signature, `aud` et `nonce`.

## Pièges fréquents

> [!tip] En clair
> **Les 4 erreurs à retenir avant tout :**
> 1. Lire la carte **sans vérifier le cachet** → n'importe qui peut en fabriquer une.
> 2. Oublier de vérifier **à qui** elle est destinée (`aud`) → une carte émise pour une autre appli ouvre ta session.
> 3. Oublier le `nonce` → une carte capturée peut être rejouée.
> 4. Envoyer la carte d'identité à une **API** en pensant que c'est un badge → faille majeure.

- **Décoder sans vérifier la signature** → n'importe qui forge une identité. Réflexe : signature d'abord, champs ensuite ([[jwt]]).
- **Oublier `aud`** → un jeton émis pour une application voisine ouvre votre session (*token substitution*). Réflexe : exiger son `client_id`, et `azp` si multi-audience.
- **Accepter `alg: none`** ou faire confiance au `alg` du header → jeton non signé accepté, ou confusion RS256/HS256. Réflexe : liste blanche côté serveur (RFC 8725 §3.1).
- **Ignorer `nonce`** → rejeu d'un ID Token capturé. Réflexe : nonce imprévisible par requête, comparé à l'identique ([[security_oauth21]]).
- **Confondre `id_token` et `access_token`** → ID Token envoyé en `Bearer` à une API : une application cliente peut usurper n'importe quel utilisateur. Réflexe : l'API n'accepte que des access tokens (RFC 9068).
- **Utiliser `email` sans `email_verified`** → prise de compte via un email non vérifié. Réflexe : clé d'identité = `sub`.
- **Aucune tolérance d'horloge** → sessions refusées en apparence au hasard. Réflexe : ± 60 s documentée.
- **Stocker l'ID Token longtemps** → un JWT est lisible et non révocable. Réflexe : usage unique, cookie de session serveur, rien de persistant.

## Rappel

> [!question] Question de rappel
> Pourquoi ne pas passer l'ID Token en `Authorization: Bearer` à une API interne, pour économiser un appel ?

> [!success]- Réponse
> L'ID Token est destiné au **client** (`aud = client_id`), pas au resource server : l'API n'est pas l'audience légitime et ne devrait pas l'accepter. L'accepter permet à n'importe quelle application cliente de forger un jeton pour n'importe quel utilisateur — l'authentification devient autorisation. Il ne porte d'ailleurs aucune permission. Solution : un [[access_token]] dédié ([[client_credentials_flow]] ou échange de jeton), validé par l'API sur son propre `aud`/`iss`.

### 🎯 Le résumé à retenir

> [!tip] Si tu ne retiens qu'une chose
> **L'ID Token est une carte d'identité ; l'access token est un badge.**
> On montre la carte **à l'application** (pour qu'elle sache qui tu es), le badge **à l'API** (pour agir). Jamais l'inverse.
>
> **Et le réflexe vital :** une carte ne vaut **que si on vérifie le cachet** (la signature). Contenu sans vérification = zéro.

## Voir aussi
- [[openid_connect]] — le protocole qui définit et transporte l'ID Token.
- [[jwt]] — format, signature JWS et claims sous-jacents.
- [[scopes_and_claims]] — comment demander les claims (scopes, paramètre `claims`) et le rôle de `/userinfo`.
- [[prompts_and_interaction]] — `max_age`, `prompt` et le contrôle de `auth_time`.
- [[sso_session_and_consent]] — la session stateful de l'OP, source de `auth_time`, `acr` et `sid`.
- [[step_up_auth]] — exiger un niveau (MFA) et le vérifier.
- [[logout]] — le `sid` utilisé pour propager la déconnexion.
- [[access_token]] — la frontière à ne jamais franchir.
- [[discovery_and_jwks]] — clés de vérification et rotation.
- [[authorization_code_flow]] — flow principal de délivrance.
- [[pkce]] — protège le `code`, donc l'ID Token qui en découle.
- [[security_oauth21]] — bonnes pratiques de validation.
- [[index]] — carte d'ensemble du domaine.

## Références
- OpenID Connect Core 1.0 — §2 (ID Token), §3.1.3.6, §3.1.3.7 (ID Token Validation), §5.1 (Standard Claims).
- RFC 7519 — JSON Web Token (JWT).
- RFC 8725 — JWT Best Current Practices (algorithmes, validation).
- RFC 9068 — JWT Profile for OAuth 2.0 Access Tokens (`typ: at+jwt`).
