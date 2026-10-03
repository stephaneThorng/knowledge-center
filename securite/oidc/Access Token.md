---
title: Access Token
aliases: [Jeton d'accès, Access Token OAuth, Bearer token]
tags: [oidc, oauth2, access-token, bearer, autorisation]
domaine: securite/oidc
niveau: intermediaire
statut: draft
cree: 2026-10-01
sources: [RFC 6749, RFC 6750, RFC 9068, RFC 7662, RFC 8705, RFC 9449, RFC 9700]
---

# Access Token

> [!abstract] Ancre
> L'access token est la preuve d'autorisation présentée au resource server : il dit *ce que le client peut faire*, jamais *qui est l'utilisateur*.

---

## 🧒 Avant de commencer : de quoi on parle

> [!tip] En clair
> L'access token, c'est le **badge**. Tu le montres à une porte pour qu'elle s'ouvre.
>
> Deux choses à ne pas oublier :
> - Le badge dit **ce que tu peux faire**, pas **qui tu es**. La porte ne sait pas ton nom — elle sait juste que le badge a le droit de passer.
> - Le badge est **limité** : il n'ouvre que certaines portes (le *scope*), et il **expire** après un moment.

**Les mots à connaître pour cette note :**

| Mot technique | En clair |
|---|---|
| **Access Token** | le badge |
| **Bearer** | la règle « celui qui le montre passe » |
| **scope** | les portes que ce badge peut ouvrir |
| **expires_in** | dans combien de temps le badge expire |
| **resource server (RS)** | la porte / l'API qui vérifie le badge |
| **introspection** | demander au guichet : « ce badge est-il encore valide ? » |

Voir aussi : [[ID Token]] (la carte d'identité — à ne pas confondre) et [[Refresh Token]] (le duplicata).

---

## Définition

> [!tip] En clair
> À la fin du flow, le guichet remet à l'application un **badge** qui dit : « avec ça, tu peux faire *telles et telles choses*, pendant *un certain temps* ».
>
> Chaque fois que l'application veut faire quelque chose, elle montre ce badge à l'API.
>
> 🔧 **Le mot technique :** ce badge s'appelle l'**access token** (RFC 6749 §1.4).

L'**access token** est un credential délivré par le serveur d'autorisation au client, qui l'utilise pour accéder à une ressource protégée ([[Authorization Code Flow]], RFC 6749 §1.4). Il porte une **portée** (*scope*) et une **durée de vie**. Sa présentation au resource server suit le profil **Bearer** (RFC 6750) : son seul porteur est réputé autorisé.

Ce n'est **pas** une preuve d'identité : c'est l'affaire de l'[[ID Token]] ([[OpenID Connect]]).

---

## Enjeux

> [!tip] En clair
> Le badge est **beaucoup plus sûr** qu'un mot de passe partagé :
> - il est **limité** (seulement certaines actions),
> - il **expire** tout seul,
> - on peut le **révoquer** sans changer le mot de passe.
>
> Mais « celui qui le montre passe » a un revers : si quelqu'un le **vole**, il peut s'en servir comme toi. D'où les précautions qui remplissent la suite de cette note.

- **Délégation sûre** : le client agit sans jamais connaître le mot de passe de l'utilisateur.
- **Portée limitée** : le *scope* borne ce que le jeton autorise.
- **Durée courte** : quelques minutes à quelques heures, pour limiter la fenêtre d'un vol.
- **Réversible** : l'[[OAuth 2.0|endpoint de révocation]] (RFC 7009) l'invalide côté serveur.
- **Risque principal** : le *Bearer* est un secret porteur — tout vol (log, historique, `Referer`) autorise le rejeu, d'où les remèdes *sender-constrained* détaillés dans [[mTLS]] (certificat), [[DPoP]] (paire de clés) et assemblés par [[FAPI]].

---

## Fonctionnement détaillé

### Opaque ou JWT : deux formats

> [!tip] En clair
> Un badge peut être de deux sortes :
> - **Opaque** : une simple suite de caractères qui **ne veut rien dire** toute seule. Pour savoir ce qu'elle autorise, il faut **demander au guichet**.
> - **JWT** : un badge qui **porte ses informations** (voir [[JWT]]). L'API peut le lire toute seule, sans appeler le guichet.

| | Opaque | JWT (RFC 9068) |
|---|---|---|
| Ce que l'API en sait seule | rien | claims (`scope`, `exp`, `aud`…) |
| Vérification | appel `/introspect` (RFC 7662) | signature via [[OIDC Discovery et JWKS]] |
| Révocation | immédiate (état serveur) | impossible avant `exp` |
| Coût par appel | un appel réseau | local |

Les deux modèles coexistent : l'opaque centralise le contrôle, le JWT évite un aller-retour par requête. Un access token JWT porte `typ: at+jwt` (RFC 9068) — précisément pour qu'on ne le confonde pas avec un [[ID Token]] (`typ: JWT`).

### Le profil Bearer (RFC 6750)

> [!tip] En clair
> « Bearer » signifie **porteur**. La règle est brutale : si tu montres le badge, tu passes. Aucune autre preuve n'est demandée.
>
> Conséquence directe : **un badge volé est un badge utilisable**. C'est pour ça qu'on ne le met jamais dans une URL.

Il se transmet dans l'en-tête `Authorization` :

```http
GET /contacts HTTP/1.1
Host: api.example.com
Authorization: Bearer 2YotnFZFEjr1zCsicMWpAA
```

Jamais en query string : l'URL finit dans l'historique du navigateur, les logs de proxy et l'en-tête `Referer`. Un jeton dans une URL est un jeton déjà à moitié fuité.

### Validation côté resource server

> [!tip] En clair
> Comment l'API sait-elle que le badge est valide ? Deux méthodes :
> - **Appeler le guichet** pour lui demander (introspection) — sûr, mais coûteux.
> - **Vérifier elle-même** si c'est un JWT — rapide, mais sans révocation immédiate.
>
> Dans les deux cas, elle contrôle aussi que le badge est **destiné à elle** (`aud`) et qu'il n'est **pas périmé** (`exp`).

Le RS doit vérifier :

| Contrôle | Pourquoi |
|---|---|
| Signature (JWT) ou `/introspect` | Prouver que le jeton vient bien de l'AS |
| `exp` / `nbf` | Refuser un jeton périmé ou pas encore valide |
| `aud` | Refuser un jeton émis pour **une autre** API |
| `scope` | Vérifier l'autorisation sur **cette** opération précise |
| `iss` | Refuser un jeton d'un autre émetteur |

C'est le *scope* qui décide au final : le RS vérifie la permission du **jeton**, jamais le client ni son rôle supposé. Principe de moindre privilège : demander le minimum, accorder le minimum.

### Aller plus loin que le Bearer simple

> [!tip] En clair
> Le Bearer simple a un défaut : **le badge seul suffit**. Si on le vole, on passe.
>
> Les remèdes « à preuve de vol » : lier le badge à une **clé** que l'attaquant n'a pas.
> - **mTLS** : le client montre aussi son certificat (une autre clé).
> - **DPoP** : le client signe chaque requête avec une clé privée qu'il garde.

- **mTLS** (RFC 8705) : le jeton est lié au certificat du client (*certificate-bound*).
- **DPoP** (RFC 9449) : le client signe chaque requête avec une clé privée locale — un jeton volé est inutilisable sans cette clé.
- **Restriction d'`aud`** : limiter l'audience pour qu'un service mineur ne puisse pas rejouer le jeton ailleurs.

Ces remèdes sont détaillés dans [[mTLS]] (certificat) et [[DPoP]] (paire de clés) — et assemblés par [[FAPI]] pour le secteur financier.

---

## Exemple concret

> [!tip] En clair
> Le guichet remet le badge, l'application l'utilise sur l'API, l'API répond. C'est tout.

**Réponse du `/token` :**

```json
{
  "access_token": "eyJhbGciOiJSUzI1NiIsImtpZCI6IjIwMjYtMDktMDEifQ...",
  "token_type": "Bearer",
  "expires_in": 3600,
  "scope": "read:contacts",
  "refresh_token": "8xLOxBtZp8"
}
```

**Utilisation :**

```http
GET /contacts HTTP/1.1
Host: api.example.com
Authorization: Bearer eyJhbGciOiJSUzI1NiIsImtpZCI6IjIwMjYtMDktMDEifQ...
```

**Ce que contient le jeton (s'il est un JWT) :**

```json
{
  "iss": "https://auth.example.com",
  "aud": "https://api.example.com",   // l'API, pas le client
  "sub": "f3a9c1e2-88b4-4d77-9e01-5c2ab7d19f40",
  "scope": "read:contacts",
  "exp": 1759316420,
  "typ": "at+jwt"                      // le marqueur d'un access token
}
```

L'API vérifie la signature (JWKS de l'issuer), puis `aud == https://api.example.com`, `exp` non dépassé, et `scope` contenant le droit demandé. Si le jeton est opaque, elle appelle `/introspect`.

---

## Pièges fréquents

> [!tip] En clair
> **Les 5 erreurs à retenir :**
> 1. Mettre le badge **dans l'URL** → il finit dans les logs et l'historique.
> 2. Confondre **badge et carte d'identité** → l'API prendrait un [[ID Token]] pour une autorisation.
> 3. Ne pas vérifier **la destination** (`aud`) → un badge émis pour une autre API est accepté.
> 4. Un badge qui **vit trop longtemps** → plus la fenêtre de vol est large.
> 5. Croire que **le badge dit qui tu es** → il ne le dit pas, et c'est voulu.

- **Jeton en query string** — fuit par l'historique, les logs et `Referer`. Réflexe : uniquement l'en-tête `Authorization: Bearer`.
- **`aud` trop large ou absent** — un jeton émis pour l'API A est accepté par l'API B (*confused deputy*). Réflexe : chaque API exige **sa** propre audience. Pour propager l'identité d'un service à l'autre, utiliser [[Token Exchange]] plutôt que transmettre le jeton.
- **Confusion avec l'[[ID Token]]** — envoyer l'ID Token en Bearer à une API, ou lire l'identité dans l'access token. Réflexe : le badge pour l'API, la carte pour le client.
- **Durée de vie excessive** — un Bearer volé reste utilisable jusqu'à `exp`. Réflexe : 5 à 15 minutes, plus un [[Refresh Token]] révocable.
- **Révocation impossible** — un access token JWT ne se révoque pas avant expiration. Réflexe : durées courtes, ou format opaque + introspection quand la révocation immédiate est requise.
- **`scope` non vérifié par le RS** — le jeton est validé globalement, sans contrôle de la permission demandée. Réflexe : vérifier le scope **par opération**.
- **`alg` du jeton cru aveuglément** — un JWT accepté sur son propre `alg` ouvre `none` et la confusion HMAC ([[JWT]]). Réflexe : liste blanche d'algorithmes côté RS.
- **Jeton journalisé** — un access token écrit en clair dans un log applicatif ou un outil d'observabilité est un accès offert. Réflexe : masquer systématiquement les en-têtes `Authorization`.

---

## Rappel

> [!question] Question de rappel
> Un access token valide a été intercepté. Qu'est-ce que l'attaquant peut en faire, et que ne peut-il **pas** faire ?

> [!success]- Réponse
> Il peut **rejouer** le jeton tel quel jusqu'à son expiration, en `Bearer`, pour les opérations autorisées par son `scope` — mais uniquement auprès de l'audience `aud` pour laquelle il a été émis. Il ne peut en revanche **pas** apprendre l'identité de l'utilisateur de façon fiable (ce n'est pas un [[ID Token]]), ni l'utiliser au-delà de son `exp`, ni l'utiliser contre une autre API si `aud` est correctement vérifié. Sans `exp` court ni restriction d'audience, la portée du vol devient bien plus large.

### 🎯 Le résumé à retenir

> [!tip] Si tu ne retiens qu'une chose
> **L'access token est un badge.** Il dit **ce que** l'application peut faire, pas **qui** tu es.
>
> Il est **limité** (le scope) et **temporaire** (expiration) — et « celui qui le montre passe », donc on ne le met **jamais** dans une URL.

---

## Voir aussi

- [[OAuth 2.0]] — le cadre qui définit l'access token et ses grants.
- [[ID Token]] — la frontière stricte : identité contre autorisation.
- [[Refresh Token]] — renouveler un access token expiré sans réinteraction.
- [[Authorization Code Flow]] — le flux qui le délivre.
- [[Client Credentials Flow]] — un access token émis **sans** utilisateur.
- [[JWT]] — le format possible du jeton, et sa validation.
- [[OIDC Discovery et JWKS]] — les clés qui vérifient un access token JWT.
- [[Sécurité OIDC et OAuth 2.1]] — Bearer durci, mTLS, DPoP, bonnes pratiques.
- [[mTLS]] — lier le jeton à un certificat client (`cnf.x5t#S256`).
- [[DPoP]] — lier le jeton à une paire de clés (`cnf.jkt`), signée à chaque requête.
- [[FAPI]] — le profil sectoriel qui impose une preuve de possession.
- [[Token Exchange]] — obtenir un jeton destiné à l'API suivante (chaîne de services).
- [[OIDC (MOC)]] — carte d'entrée du dossier.

## Références

- RFC 6749 — *The OAuth 2.0 Authorization Framework*, §1.4 (Access Token).
- RFC 6750 — *The OAuth 2.0 Authorization Framework: Bearer Token Usage*.
- RFC 7662 — *OAuth 2.0 Token Introspection*.
- RFC 9068 — *JWT Profile for OAuth 2.0 Access Tokens* (`typ: at+jwt`).
- RFC 8705 — *OAuth 2.0 Mutual-TLS Client Authentication and Certificate-Bound Access Tokens*.
- RFC 9449 — *OAuth 2.0 Demonstrating Proof of Possession (DPoP)*.
- RFC 9700 — *Best Current Practice for OAuth 2.0 Security*.
