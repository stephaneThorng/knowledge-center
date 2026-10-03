---
title: Authorization Code Flow
aliases: [Flow code d'autorisation, Authorization Code Grant, Code Flow]
tags: [oidc, oauth2, flow, pkce, securite]
domaine: securite/oidc
niveau: intermediaire
statut: draft
cree: 2026-10-01
sources: [RFC 6749, RFC 6750, RFC 7636, RFC 9700, RFC 6819, RFC 9207, OpenID Connect Core 1.0]
---

# Authorization Code Flow

> [!abstract] Ancre
> Le client reçoit un code à usage unique sur le front-channel, puis l'échange contre des tokens sur le back-channel authentifié.

---

## 🧒 Avant de commencer : de quoi on parle

> [!tip] En clair
> Tu veux entrer dans un club privé. Tu ne connais pas le videur, et le videur ne te connaît pas. Tu ne vas pas lui donner ta carte d'identité et ta carte bancaire (ce serait perdre le contrôle).
>
> Alors ça se passe en deux temps :
> 1. **Devant tout le monde** (dans ton navigateur) : tu récupères un **ticket de vestiaire** — un papier sans valeur, à usage unique. Tout le monde peut le voir, ça n'a aucune importance.
> 2. **À l'écart** (entre ton app et le guichet, dans un tuyau privé) : tu échanges ce ticket contre le **vrai badge**.
>
> C'est **exactement** le Authorization Code Flow. Et c'est le flow le plus utilisé au monde.

**Les mots à connaître pour cette note :**

| Mot technique | En clair |
|---|---|
| **User-Agent** | ton navigateur (Chrome, Firefox…) — c'est lui qui fait le voyage |
| **Client** | ton application (celle qui veut le badge) |
| **Authorization Server (AS)** | le guichet d'identité (Google, Keycloak…) |
| **code** | le ticket de vestiaire : sans valeur seul, à usage unique |
| **access_token** | le vrai badge : il ouvre les portes |
| **leg / canal avant** | le voyage public, dans le navigateur |
| **leg / canal arrière** | le tuyau privé, entre ton serveur et le guichet |

Voir aussi : [[State (login CSRF)]] (le numéro de suivi) et [[PKCE]] (le cadenas).

---

## Définition

> [!tip] En clair
> Au lieu de donner le badge directement (ce qui serait dangereux), le guichet donne d'abord un **ticket temporaire**. Ton application va ensuite porter ce ticket au guichet par une **porte de service** (un appel direct, sans navigateur), et là seulement elle reçoit le badge.
>
> Pourquoi faire compliqué ? Parce que le ticket est **sans valeur** : si quelqu'un le vole, il ne peut rien en faire.
>
> 🔧 **Le mot technique :** ce mécanisme s'appelle le **Authorization Code Flow** (*flow du code d'autorisation*).

Le **Authorization Code Flow** (flow « code d'autorisation ») est le mode d'obtention de tokens défini par [[OAuth 2.0]] (RFC 6749 §4.1) où le client obtient d'abord un **code d'autorisation** opaque et de courte durée, qu'il échange ensuite contre des tokens sur un canal direct avec le serveur d'autorisation. C'est le flow sous-jacent de [[OpenID Connect]] : l'ID Token ne peut être délivré que par ce chemin ou par le Device Authorization Flow (vue d'ensemble du domaine : [[OIDC (MOC)]]).

---

## Enjeux

> [!tip] En clair
> Le problème de base : **trois personnes qui ne se font pas confiance** doivent se passer un badge. Le navigateur, sur lequel tu n'as aucun contrôle, est un lieu public — n'importe quoi peut y regarder (extensions, historique, logs).
>
> La solution : **ne jamais faire passer le badge par le lieu public.** On n'y fait passer qu'un ticket sans valeur.
>
> C'est ça, tout l'enjeu : **séparer ce qui circule en public de ce qui circule en privé.**

C'est **le flow de référence** : OAuth 2.1 et la RFC 9700 le recommandent par défaut, tandis que le flow implicite et le flow password sont dépréciés (voir [[Comparatif des flows OIDC]]). Ses enjeux portent sur la manière dont les tokens sont transmis entre trois acteurs qui ne se font pas tous confiance.

- **Confidentialité des tokens** : ils n'apparaissent jamais dans l'historique du navigateur, un `Referer` ou un log de proxy, car ils transitent uniquement sur le back-channel TLS.
- **Authenticité du client** : le serveur d'autorisation peut authentifier le client avant de lui remettre les tokens, impossible avec le flow implicite.
- **Isolation des legs** : le code visible dans le navigateur est inexploitable seul, sans le second appel.

---

## Fonctionnement détaillé

### Vue d'ensemble : deux legs, deux canaux

> [!tip] En clair
> **Les deux voyages du flow :**
>
> 🚶 **Voyage 1 — en public, dans ton navigateur.** Tu vas voir le guichet, tu prouves qui tu es (login), tu dis « j'autorise cette app », et le guichet te donne un **ticket**. Ce voyage-là, tout le monde peut le suivre des yeux. Pas grave : le ticket ne vaut rien tout seul.
>
> 🚪 **Voyage 2 — en privé, par la porte de service.** Ton application apporte le ticket **plus sa preuve d'identité** directement au guichet, sans passer par le navigateur. C'est là qu'elle reçoit le **badge**. Ce voyage, personne ne peut l'espionner.

1. **Leg avant (front-channel)** : le User-Agent est redirigé vers `/authorize`; après authentification et consentement, le serveur redirige l'agent vers le `redirect_uri` du client avec un `code` en query string.
2. **Leg arrière (back-channel)** : le client appelle directement `/token` en HTTPS, sans navigateur, en présentant le `code` et sa preuve d'identité (secret et/ou `code_verifier` PKCE), et reçoit `access_token`, `token_type`, `expires_in`, éventuellement `refresh_token` et `id_token`.

Cette séparation est le **cœur de la sécurité** : le leg avant, exposé (historique, logs, extensions), ne transporte qu'un code opaque, à usage unique, lié au client et au `redirect_uri`; le leg arrière, qui porte les tokens, est protégé par TLS et l'authentification du client. Aucune observation unique ne suffit à voler un token — défense en profondeur décrite dans la RFC 6819 et renforcée par [[PKCE]].

### Diagramme de séquence

> [!tip] En clair
> Lis le schéma comme une **conversation**. Repère bien les deux moments :
> - étapes 4 à 9 → **le voyage public** (le navigateur est au milieu)
> - étapes 11 à 13 → **le voyage privé** (le navigateur n'est plus là du tout)

```mermaid
sequenceDiagram
    autonumber
    participant UA as User-Agent (navigateur)
    participant C as Client (+ /callback = redirect_uri)
    participant AS as Authorization Server

    UA->>C: 1. L'utilisateur clique sur « Se connecter »
    C->>C: 2. Génère state, nonce, code_verifier
    C->>UA: 3. Redirection (302) vers /authorize
    UA->>AS: 4. GET /authorize?response_type=code&client_id=...
    AS->>UA: 5. Page de login (si pas de session)
    UA->>AS: 6. Authentification + consentement
    AS->>AS: 7. Émet un code à usage unique (TTL ~60s)
    AS->>UA: 8. Redirection vers redirect_uri?code=...&state=...
    UA->>C: 9. GET /callback?code=...&state=...
    C->>C: 10. Vérifie que state == valeur stockée
    C->>AS: 11. POST /token (grant_type=authorization_code, code, code_verifier)
    AS->>AS: 12. Valide code, client, redirect_uri, code_verifier
    AS->>C: 13. JSON : access_token, id_token, refresh_token, expires_in
    C->>C: 14. Valide l'id_token (signature JWKS, iss, aud, exp, nonce)
    C->>UA: 15. Session applicative (cookie de session)
```

### Paramètres de la requête `/authorize`

> [!tip] En clair
> C'est la **liste de courses** que ton navigateur apporte au guichet. Ne t'inquiète pas des détails : les quatre premières lignes suffisent à comprendre un flow. Les autres sont des options (forcer le login, choisir la langue…).

Requête émise par le User-Agent sur le front-channel (RFC 6749 §4.1.1, OIDC Core §3.1.2.1) :

| Paramètre | Rôle | Obligatoire |
|---|---|---|
| `response_type` | Type de réponse attendu; `code` pour ce flow | **Oui** |
| `client_id` | Identifiant public du client enregistré | **Oui** |
| `redirect_uri` | URI de retour; doit correspondre **exactement** à celle enregistrée | **Oui** (si plusieurs URIs enregistrées) |
| `scope` | Permissions demandées; doit contenir `openid` pour OIDC | **Oui** pour OIDC |
| `state` | Valeur opaque anti-CSRF renvoyée telle quelle | **Oui** (recommandé, RFC 9700) |
| `nonce` | Valeur opaque liant l'ID Token à la session courante | **Oui** en OIDC implicite/hybride, fortement recommandé ici |
| `code_challenge` | Empreinte du `code_verifier` (PKCE, RFC 7636) | **Oui** pour clients publics |
| `code_challenge_method` | `S256` (recommandé) ou `plain` | **Oui** si `code_challenge` présent |
| `prompt` | `none`, `login`, `consent`, `select_account` : force ou interdit l'interaction | Non |
| `login_hint` | Pré-remplit l'identifiant (email, sub) | Non |
| `max_age` | Durée maximale depuis l'authentification; force `auth_time` récent | Non |
| `acr_values` | Niveau d'authentification exigé (MFA, FIDO2, LoA) | Non |
| `ui_locales` | Langues préférées de l'interface | Non |
| `response_mode` | `query`, `fragment`, `form_post` : transport de la réponse | Non |

Ces paramètres pilotent **l'expérience** (ce que voit l'utilisateur), par opposition à `state`, `nonce` et `code_challenge` qui portent la **sécurité** : détail dans [[Prompts et contrôle de l'interaction]]. `acr_values`, qui **exige** un niveau d'authentification (vérifié ensuite via le claim `acr`), est traité dans [[Authentification renforcée (acr_values, amr, auth_time)]].

### Paramètres de la requête `/token`

> [!tip] En clair
> Ici, on est **par la porte de service**. L'application apporte le ticket (`code`) plus sa preuve qu'elle est bien celle qui l'a demandé (`code_verifier` ou `client_secret`). Le navigateur n'existe plus dans cette conversation.

Requête serveur-à-serveur, jamais transitée par le navigateur (RFC 6749 §4.1.3) :

| Paramètre | Rôle | Obligatoire |
|---|---|---|
| `grant_type` | Fixé à `authorization_code` | **Oui** |
| `code` | Code reçu au leg 1 | **Oui** |
| `redirect_uri` | Identique à celle du leg 1 (anti-substitution) | **Oui** si présente au leg 1 |
| `client_id` / `client_secret` | Authentification du client confidentiel | **Oui** pour client confidentiel |
| `code_verifier` | Preuve PKCE : le secret dont `code_challenge` est l'empreinte | **Oui** si PKCE utilisé |

L'authentification du client se fait soit en HTTP **Basic** (`Authorization: Basic base64(client_id:client_secret)`, recommandé), soit en paramètres POST du corps `application/x-www-form-urlencoded` (RFC 6749 §2.3.1). Ne jamais mélanger les deux méthodes dans une même requête.

### Requêtes HTTP réelles

> [!tip] En clair
> Voilà à quoi ça ressemble pour de vrai. Ne cherche pas à tout lire : repère juste que **la 1ʳᵉ requête est un `GET`** (on demande, dans le navigateur) et **la 2ᵉ est un `POST`** (on apporte, par la porte de service).

**Leg 1 — redirection du navigateur vers `/authorize` :**

```http
GET /authorize?response_type=code
  &client_id=s6BhdRkqt3
  &redirect_uri=https%3A%2F%2Fapp.example.com%2Fcallback
  &scope=openid%20profile%20email
  &state=af0ifjsldkj
  &nonce=n-0S6_WzA2Mj
  &code_challenge=E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM
  &code_challenge_method=S256
  &prompt=login
  &acr_values=urn:mace:incommon:iap:silver
  &ui_locales=fr-FR
HTTP/1.1
Host: auth.example.com
```

**Réponse du serveur d'autorisation (redirection vers le client) :**

```http
HTTP/1.1 302 Found
Location: https://app.example.com/callback?code=SplxlOBeZQQYbYS6WxSbIA&state=af0ifjsldkj
```

**Leg 2 — échange du code sur le back-channel :**

```http
POST /token HTTP/1.1
Host: auth.example.com
Content-Type: application/x-www-form-urlencoded
Authorization: Basic czZCaGRSa3F0MzpnWDFmQmF0M2JW

grant_type=authorization_code
&code=SplxlOBeZQQYbYS6WxSbIA
&redirect_uri=https%3A%2F%2Fapp.example.com%2Fcallback
&code_verifier=dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk
```

**Réponse JSON du `/token` :**

```json
{
  "access_token": "eyJhbGciOiJSUzI1NiIsImtpZCI6IjIwMjYtMDEifQ...",
  "token_type": "Bearer",
  "expires_in": 3600,
  "refresh_token": "8xLOxBtZp8",
  "id_token": "eyJhbGciOiJSUzI1NiIsImtpZCI6IjIwMjYtMDEifQ.eyJpc3MiOiJodHRwczovL2F1dGguZXhhbXBsZS5jb20i...",
  "scope": "openid profile email"
}
```

L'`access_token` et le `refresh_token` sont des secrets porteurs : jamais dans une URL, jamais dans un log applicatif. Le stockage attendu est le [[Refresh Token]] en base côté serveur (rotation incluse), ou une mémoire de page côté SPA.

### Variantes : confidentiel vs public

> [!tip] En clair
> Il y a deux types d'applications :
> - **Celle qui a une porte de service et un coffre** (un serveur) : elle peut garder un **mot de passe secret**. On l'appelle *client confidentiel*.
> - **Celle qui vit dans le navigateur ou dans ton téléphone** : elle n'a **aucun endroit** où cacher quoi que ce soit — tout est lisible. On l'appelle *client public*.
>
> Le client public ne peut pas prouver son identité par un secret → il utilise **PKCE** à la place (le cadenas). C'est même **obligatoire** pour lui.

| | Client confidentiel (web serveur) | Client public (SPA, mobile, CLI) |
|---|---|---|
| Secret | Oui, stocké côté serveur | **Aucun** secret possible (code lisible) |
| PKCE | Recommandé | **Obligatoire** (RFC 9700) |
| Authentification `/token` | Basic ou POST | `client_id` seul + `code_verifier` |
| Risque principal | Fuite du secret | Interception du code |

Un client public ne peut pas garder de secret : tout ce que le navigateur contient est lisible. PKCE remplace donc le secret par un défi à usage unique. Si le code est intercepté sans le `code_verifier`, l'échange échoue — c'est la protection des deux legs : l'attaquant qui capture le leg 1 ne peut pas forger le leg 2 (appel TLS direct depuis le client légitime), et un code fuité reste inutilisable car le `redirect_uri` du leg 2 doit correspondre exactement.

Pour un client confidentiel qui veut aller plus loin que le secret partagé, deux mécanismes d'authentification forte existent : [[mTLS]] (certificat client) et `private_key_jwt` — voir [[FAPI]] pour leur usage combiné.

Les autres grants sortent du périmètre : le [[Client Credentials Flow]] sert le machine-to-machine sans utilisateur, le [[Device Authorization Flow]] les appareils sans navigateur — aucun des deux ne passe par un `redirect_uri` ni par `/authorize` de la même façon.

### Sécurité : le `state` et l'injection de code

> [!tip] En clair
> Le `code` doit **revenir** à ton application. Mais comment être sûr que ce code est bien **celui que tu as demandé**, et pas un code fabriqué par quelqu'un d'autre ?
>
> C'est là qu'intervient le **numéro de suivi** (`state`) : ton application le pose au départ et exige de le retrouver. Sans ce contrôle, on peut te faire utiliser le code de quelqu'un d'autre et te connecter **dans son compte à lui**.
>
> 🔧 **Le détail complet :** voir [[State (login CSRF)]].

Au leg 2, le client exige de retrouver le `state` qu'il a posé au leg 1. Sans ce contrôle, un code d'autorisation **légitime mais émis pour un autre compte** peut être consommé par la victime : l'attaquant parcourt le tunnel avec son propre compte, puis fait charger l'URL de retour — porteuse de son code — par le navigateur de la victime. Le client échange alors ce code et connecte la victime **dans la session de l'attaquant**, qui récupère tout ce qu'elle y dépose (documents, moyens de paiement). C'est le **login CSRF**, ou *injection de code*, décrit dans [[State (login CSRF)]].

Le point clé : [[PKCE]] ne couvre **pas** ce vecteur, car l'attaquant détient le `code_verifier` de son propre flow. Le `state` est la seule protection de corrélation vérifiée par le client, qui ne voit revenir que `code` et `state` — jamais le challenge, lequel reste stocké chez le serveur d'autorisation.

### Ce que l'ID Token change

> [!tip] En clair
> Jusqu'ici, l'application a un badge pour **agir** (lire tes fichiers, par exemple). Mais elle ne sait toujours pas **qui tu es**.
>
> OIDC ajoute donc un second objet : une **carte d'identité signée** (`id_token`), qui dit « voici qui est cet utilisateur ». Mais attention : une carte ne vaut que si on **vérifie la signature** — sinon n'importe qui peut en fabriquer une.

Avec [[OpenID Connect]], l'`id_token` retourné doit être validé avant toute confiance : signature via les clés de [[OIDC Discovery et JWKS]], puis `iss`, `aud` (= `client_id`), `exp`, `iat` et `nonce` (la valeur envoyée au leg 1). Sans cette vérification, le client accepte un [[JWT]] arbitraire — voir [[Sécurité OIDC et OAuth 2.1]].

---

## Exemple concret

> [!tip] En clair
> Une histoire complète, du début à la fin, avec Keycloak comme guichet. Suis les 8 étapes comme si tu suivais un personnage dans un film. Les détails techniques sont là, mais l'important est le **mouvement** : demander → obtenir le ticket → échanger → recevoir le badge.

Application web `app.example.com` avec un IdP Keycloak sur `auth.example.com`.

1. L'utilisateur ouvre `https://app.example.com` et clique « Se connecter avec SSO ».
2. Le serveur génère `state=a1b2c3`, `nonce=x9y8z7` et `code_verifier=dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk`, stocke les deux premiers en session et calcule `code_challenge=SHA256(code_verifier)` en base64url.
3. Redirection vers `/authorize?response_type=code&client_id=app-front&redirect_uri=https%3A%2F%2Fapp.example.com%2Fcallback&scope=openid%20profile%20email&state=a1b2c3&nonce=x9y8z7&code_challenge=...&code_challenge_method=S256&prompt=login&ui_locales=fr-FR`.
4. L'IdP affiche le login, l'utilisateur s'authentifie (mot de passe + TOTP) et consent à partager `profile` et `email`.
5. Redirection vers `https://app.example.com/callback?code=SplxlOBeZQQYbYS6WxSbIA&state=a1b2c3`. Le serveur vérifie `state` : OK, sinon rejet immédiat.
6. `POST https://auth.example.com/token` avec `grant_type=authorization_code`, `code` et `code_verifier` en clair. L'IdP recalcule l'empreinte, la compare au `code_challenge`, vérifie le `redirect_uri`, que le code n'a pas déjà été consommé et qu'il a moins de 60 secondes.
7. Réponse : `access_token` (1 h), `refresh_token` (30 j, rotatif), `id_token` signé. Le serveur valide l'`id_token` (`iss=https://auth.example.com`, `aud=app-front`, `nonce=x9y8z7`), crée la session locale avec un cookie `HttpOnly; Secure; SameSite=Lax`.
8. Le code est marqué consommé : toute seconde utilisation renvoie `invalid_grant`, et un rejeu détecté fait révoquer les tokens déjà émis pour ce code.

## Pièges fréquents

> [!tip] En clair
> **Les 5 erreurs qui reviennent tout le temps :**
> 1. Oublier le numéro de suivi (`state`) → on peut te connecter au compte d'un autre.
> 2. Accepter une adresse de retour « presque pareille » → un attaquant y détourne tout.
> 3. Laisser un ticket (`code`) resservir deux fois → il faut le brûler après usage.
> 4. Laisser traîner le badge dans l'URL → il finit dans l'historique et les logs.
> 5. Croire une carte d'identité (`id_token`) sans vérifier la signature → n'importe qui peut en fabriquer une.

- **`state` absent** : pas de protection CSRF; un attaquant peut faire connecter la victime sur son propre compte (login CSRF). Réflexe : générer un `state` aléatoire par requête, le comparer strictement au retour, l'invalider ensuite. Détail de l'attaque et du mécanisme : [[State (login CSRF)]].
- **`redirect_uri` ouverte ou correspondance partielle** : si le serveur accepte préfixes ou sous-chemins, un attaquant exploite `https://app.example.com.evil.com/callback` ou une redirection ouverte. Réflexe : **comparaison exacte** caractère par caractère sur une URI pré-enregistrée, HTTPS obligatoire sauf localhost.
- **`code` rejoué** : un code capturé dans l'historique ou un log proxy ne doit jamais servir deux fois. Réflexe : usage unique, TTL de 30 à 60 s, révocation des tokens émis si un rejeu est détecté.
- **`code_verifier` absent côté client public** : sans PKCE, un code intercepté sur mobile ou SPA est directement échangeable. Réflexe : PKCE systématique en `S256` — voir [[PKCE]].
- **Token dans le fragment d'URL** : faute typique du flow implicite, où l'`access_token` reste dans l'historique et fuit par `Referer` ou JavaScript. Réflexe : seuls `code` et `state` en query string; les tokens arrivent en JSON sur le back-channel.
- **`id_token` décodé sans validation** : lire le JWT en base64 et faire confiance au contenu (signature, `iss`, `aud`, `exp`, `nonce` non vérifiés) revient à accepter un token forgé. Réflexe : vérifier la signature via les clés JWKS avant toute lecture.
- **`nonce` absent en OIDC** : l'ID Token peut être rejoué d'une session à l'autre. Réflexe : envoyer un `nonce` et le comparer à celui de l'`id_token`.
- **Basic et POST mélangés** : la RFC 6749 interdit les deux méthodes simultanément; certains serveurs rejettent la requête ou retiennent la plus faible. Réflexe : une seule méthode, `client_secret_basic` en priorité, ou PKCE pour un client public.

## Rappel

> [!question] Question de rappel
> Pourquoi le Authorization Code Flow est-il plus sûr que le flow implicite, alors que le code transite lui aussi dans le navigateur ?

> [!success]- Réponse
> Parce que ce qui transite dans le navigateur n'est pas le token mais un **code opaque, à usage unique et de très courte durée**, lié au `client_id` et à la `redirect_uri`, échangeable uniquement sur un back-channel TLS où le client s'authentifie (secret ou `code_verifier` PKCE). Un attaquant qui intercepte la redirection n'obtient donc aucun token, contrairement au flow implicite où l'`access_token` arriverait dans le fragment d'URL, exposé à l'historique et au `Referer`.

### 🎯 Le résumé à retenir

> [!tip] Si tu ne retiens qu'une chose
> **Le flux se fait en deux temps, jamais un seul.**
> 1. Dans le navigateur : on récupère un **ticket sans valeur** (le `code`).
> 2. Par la porte de service : on échange ce ticket contre le **vrai badge** (le token).
>
> **Pourquoi c'est génial :** même si quelqu'un voit tout ce qui passe dans le navigateur, il ne voit qu'un ticket inutilisable. Le badge, lui, n'apparaît **jamais** en public.

---

## Voir aussi

- [[OAuth 2.0]] — le protocole-cadre et ses quatre grants fondateurs.
- [[OpenID Connect]] — la couche identité qui ajoute `id_token` et `nonce` à ce flow.
- [[PKCE]] — extension obligatoire pour les clients publics, cœur de la protection du leg 2.
- [[State (login CSRF)]] — la corrélation de session et l'attaque d'injection de code, que PKCE ne couvre pas.
- [[Prompts et contrôle de l'interaction]] — `prompt`, `login_hint`, `max_age`, `ui_locales` : piloter ce que voit l'utilisateur.
- [[Authentification renforcée (acr_values, amr, auth_time)]] — exiger et vérifier un niveau d'authentification (MFA).
- [[mTLS]] — authentification forte du client et jeton lié au certificat.
- [[DPoP]] — jeton lié à une paire de clés, signé à chaque requête.
- [[FAPI]] — le profil qui impose ces protections pour la finance.
- [[ID Token]] — le JWT d'identité délivré uniquement par ce flow côté OIDC.
- [[Access Token]] — le credential d'autorisation livré avec l'`id_token`.
- [[Refresh Token]] — la prolongation de session après expiration de l'`access_token`.
- [[Comparatif des flows OIDC]] — où voir implicit et password désormais dépréciés.
- [[Sécurité OIDC et OAuth 2.1]] — le détail des mitigations RFC 9700 et RFC 6819.

## Références

- RFC 6749 — *The OAuth 2.0 Authorization Framework*, §4.1 (Authorization Code Grant) et §2.3 (Client Authentication).
- RFC 6750 — *The OAuth 2.0 Bearer Token Usage*.
- RFC 7636 — *Proof Key for Code Exchange by OAuth Public Clients* (PKCE).
- RFC 6819 — *OAuth 2.0 Threat Model and Security Considerations*.
- RFC 9207 — *OAuth 2.0 Authorization Server Issuer Identification* (`iss` dans la réponse d'autorisation).
- RFC 9700 — *Best Current Practice for OAuth 2.0 Security* (recommandation du code flow par défaut, dépréciation d'implicit et password).
- OpenID Connect Core 1.0 — §3.1 (Authentication using the Authorization Code Flow).
