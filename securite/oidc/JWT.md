---
title: JWT (JSON Web Token)
aliases: [JWT, JSON Web Token, Jeton JWT, RFC 7519]
tags: [oidc, oauth2, jwt, jose, crypto]
domaine: securite/oidc
niveau: intermediaire
statut: draft
cree: 2026-10-01
sources: [RFC 7519, RFC 7515, RFC 7516, RFC 7517, RFC 7518, RFC 8725]
---

# JWT (JSON Web Token)

> [!abstract] Ancre
> Un JWT est un conteneur JSON signé, lisible par tous : la signature prouve l'intégrité, jamais la confidentialité.

---

## 🧒 Avant de commencer : de quoi on parle

> [!tip] En clair
> Un JWT, c'est une **enveloppe avec trois parties** :
> 1. **L'étiquette** — comment vérifier le cachet.
> 2. **Le contenu** — les informations (qui, quoi, jusqu'à quand).
> 3. **Le cachet** — la signature qui prouve que personne n'a modifié le contenu.
>
> **Le piège à comprendre tout de suite :** le contenu n'est **pas caché**. C'est juste **écrit dans un alphabet bizarre**, mais n'importe qui peut le relire. Le cachet empêche de **modifier**, pas de **lire**.

**Les mots à connaître pour cette note :**

| Mot technique | En clair |
|---|---|
| **JWT** | le format d'enveloppe à 3 parties |
| **header** | l'étiquette : quel cachet, quelle clé |
| **payload** | le contenu : les informations (« claims ») |
| **signature** | le cachet : prouve que rien n'a été modifié |
| **base64url** | l'« alphabet bizarre » — **réversible sans clé**, donc pas un secret |
| **claims** | les informations rangées dans le contenu |

---

## Définition

> [!tip] En clair
> Un JWT n'est **pas un protocole** et **pas un mécanisme de session**. C'est juste un **format** : une façon d'écrire des informations dans une enveloppe signée.
>
> Tout seul, il ne sert à rien. C'est [[OpenID Connect]] ou [[OAuth 2.0]] qui lui donnent un sens (l'ID Token et l'access token sont souvent des JWT).
>
> 🔧 **Le mot technique :** ce format s'appelle **JWT** (*JSON Web Token*).

Un JWT (JSON Web Token, RFC 7519) est un **format de jeton** compact : des claims JSON sérialisées en `header.payload.signature`. Ce n'est **ni un protocole, ni un mécanisme de session**, ni un chiffrement. Ce sont les protocoles qui l'utilisent ([[OpenID Connect]], [[OAuth 2.0]]) qui lui donnent sens.

---

## Enjeux

> [!tip] En clair
> L'avantage : le serveur n'a **rien à stocker**. Il vérifie le cachet, lit le contenu, et c'est fini. C'est ce qu'on appelle « auto-porteur ».
>
> Le revers de la même médaille : puisqu'on ne stocke rien, **on ne peut pas annuler** un jeton déjà émis. D'où deux conséquences :
> - Les jetons ont une **durée très courte**.
> - Et comme il est **lisible par tout le monde**, on n'y met **jamais** de secret.

Le JWT est **auto-porteur** : le serveur vérifie la signature et lit les claims sans état serveur. C'est aussi sa faiblesse.

- **Sans état** : un jeton émis ne se révoque pas — d'où les durées courtes et le [[Refresh Token]]. Corollaire : **lisible par conception**.
- **Confiance déléguée** : qui détient la clé signe n'importe quel jeton ; gérer les clés est critique ([[OIDC Discovery et JWKS]]).
- **Interopérabilité fragile** : bibliothèques historiquement trouées — d'où la RFC 8725.

---

## Fonctionnement détaillé

### Structure : trois segments

> [!tip] En clair
> Trois morceaux collés par des points : **étiquette.contenu.cachet**.
>
> Le grand classique : on regarde les trois points et on croit que c'est du chiffrement. **Non.** C'est juste de l'encodage — un simple `base64 -d` redonne le texte en clair, **sans aucune clé**.

```
<base64url(header)>.<base64url(payload)>.<base64url(signature)>
```

Header et payload sont en **base64url** (base64 sans `+`, `/`, `=`). **Piège fondamental : base64url n'est pas du chiffrement.** `base64 -d` restitue le JSON en clair, sans clé : tout JWT croisé dans un navigateur ou un log est lisible. Seule la signature dépend d'une clé, et elle protège l'intégrité, pas la confidentialité.

### JWS, JWE, JWT : qui fait quoi

> [!tip] En clair
> Trois sigles qui se ressemblent, à ne pas mélanger :
> - **JWS** = « signé » → lisible par tous, mais **non modifiable**.
> - **JWE** = « chiffré » → vraiment illisible (rare).
> - **JWT** = le vocabulaire des informations, transportées par l'un ou l'autre.
>
> En pratique, quand on dit « JWT », c'est presque toujours un **JWS** (signé, lisible).

Famille JOSE : **JWS** (RFC 7515) *signe* un contenu — lisible mais intègre ; **JWE** (RFC 7516) le *chiffre* — illisible, 5 segments ; **JWT** (7519) ne définit que les *claims*, transportées par l'un ou l'autre ; **JWK/JWKS** (7517) publient les clés ; **JWA** (7518) nomme les algorithmes (`RS256`, `ES256`, `HS256`…).

Un « JWT » est donc presque toujours un **JWS à payload JWT**. Le JWT *non signé* (`alg: none`) est une anomalie ; le JWT *chiffré* est un JWE, rare.

### Header : les métadonnées

> [!tip] En clair
> L'étiquette dit **comment vérifier le cachet**. Attention : `alg` est écrit **dans le jeton lui-même** — donc un attaquant peut essayer de le falsifier. Règle d'or : **ne jamais faire confiance à `alg`**, on impose soi-même l'algorithme attendu.

- `alg` — algorithme de signature. **La valeur que l'attaquant contrôle : ne jamais la croire aveuglément.**
- `kid` — identifiant de la clé, permet la rotation ([[OIDC Discovery et JWKS]]).
- `typ` — type JOSE : `JWT`, ou `at+jwt` pour un [[Access Token]] (RFC 9068).

### Payload : claims réservés et privés

> [!tip] En clair
> Le contenu, c'est une liste d'informations. Certaines sont **standardisées** (tout le monde utilise les mêmes noms), d'autres sont **libres**.
>
> Le nom le plus utile à retenir : **`sub`** = qui est concerné. Et **`aud`** = à qui c'est destiné.

Claims **réservés** (RFC 7519 §4.1) :

| Claim | Sens |
|---|---|
| `iss` | Émetteur |
| `sub` | Sujet — l'identité de l'utilisateur |
| `aud` | Destinataire : un jeton de l'API A ne vaut pas pour l'API B |
| `exp` | Expiration (timestamp UNIX) |
| `iat` / `nbf` | Émis à / invalide avant |
| `jti` | Identifiant unique : anti-rejeu, révocation |

Les claims **privés** (`email`, `roles`, `nonce`, `at_hash`…) sont libres : le format est **extensible**. OIDC en normalise plusieurs pour l'[[ID Token]] ; préférer des URIs aux noms courts.

### Algorithmes : symétrique vs asymétrique

> [!tip] En clair
> Deux familles de cachets, et c'est **le cœur de la sécurité JWT** :
>
> - **Symétrique (HS256)** : **la même clé** sert à signer et à vérifier. Problème : celui qui vérifie peut donc **aussi fabriquer**. Mauvais pour OIDC.
> - **Asymétrique (RS256, ES256)** : le guichet signe avec une **clé privée** qu'il garde, et tout le monde vérifie avec une **clé publique**. Personne ne peut fabriquer un faux cachet. **C'est le bon modèle.**

- **HS256/384/512** (HMAC) : **symétrique**, la même clé secrète signe et vérifie. **Inadapté à OIDC** : le vérificateur détiendrait la clé de signature, donc pourrait forger — un client compromis **fuite la clé de tout l'écosystème**. Réservé au cas où signataire et vérificateur sont la même partie de confiance.
- **RS256** (RSA PKCS#1 v1.5), **PS256** (RSA-PSS), **ES256** (ECDSA P-256) : **asymétriques**. La clé privée signe chez l'émetteur, la clé **publique** suffit à vérifier : le client ne peut jamais forger. C'est le modèle d'[[OpenID Connect]] : `RS256` par défaut, `none` refusé. ES256 donne les jetons les plus courts ; RS256 reste le plus universel.

### Validation d'une signature

> [!tip] En clair
> Comment vérifier le cachet ? On le **recalcule** soi-même et on compare. Pour ça, il faut la **clé publique** du guichet — que l'on récupère automatiquement via son adresse publique (le JWKS).
>
> Le `kid` sert à choisir la bonne clé quand le guichet en a plusieurs.

Le vérificateur recalcule la signature sur `header + "." + payload`, avec l'algorithme imposé et la clé désignée par `kid`, tirée du **JWKS** de l'émetteur (`/.well-known/openid-configuration`) — voir [[OIDC Discovery et JWKS]].

---

## Exemple concret

> [!tip] En clair
> À gauche le `header` (comment vérifier), au milieu le `payload` (les infos), à droite la signature. **Regarde bien** : rien n'est caché — `sub` et `email` sont en clair, lisibles par n'importe qui. C'est voulu, et c'est exactement pourquoi on n'y met jamais un mot de passe.

[[ID Token]] réel (RS256), tronqué :

```
eyJhbGciOiJSUzI1NiIsImtpZCI6IjIwMjYtMTAtMDEtYTNmOSIsInR5cCI6IkpXVCJ9.
eyJpc3MiOiJodHRwczovL2lkcC5leGVtcGxlLmNvbSIsInN1YiI6ImFiYzEyMyIsImF1ZCI6ImNsaWVudC1hcHAi...
```

**Header décodé**
```json
{
  "alg": "RS256",              // RSA : le client ne peut que vérifier
  "kid": "2026-10-01-a3f9",    // clé à utiliser dans le JWKS (rotation)
  "typ": "JWT"                 // type de contenu JOSE
}
```

**Payload décodé**
```json
{
  "iss": "https://idp.exemple.com",   // QUI a émis : comparer à la config cliente
  "sub": "abc123",                    // QUI : identifiant stable chez l'IdP
  "aud": "client-app",                // POUR QUI : doit égaler le client_id
  "exp": 1790860800,                  // expire le 2026-10-01T14:00:00Z
  "iat": 1790857200,                  // émis à 13:00, mesure la fraîcheur
  "nonce": "n-0S6_WzA2Mj",            // anti-rejeu : égaler le nonce envoyé ([[Authorization Code Flow]], [[PKCE]])
  "email": "alice@exemple.com",       // claim privé : lisible par tous
  "auth_time": 1790857000,            // instant réel d'authentification
  "at_hash": "77QmUPtjPfzWtF2AnpK9RQ" // empreinte de l'[[Access Token]] reçu
}
```

Rien n'est chiffré : `sub` et `email` seraient en clair dans un log. Les [[Client Credentials Flow]] et [[Device Authorization Flow]] émettent des jetons identiques.

## Pièges fréquents

> [!tip] En clair
> **Les 4 erreurs à retenir avant tout :**
> 1. Croire que le contenu est **chiffré** → il est juste encodé, lisible par tous.
> 2. Faire confiance à l'algorithme écrit **dans** le jeton (`alg: none`) → jeton non signé accepté.
> 3. Ne vérifier **que** le cachet, sans regarder les infos (`exp`, `aud`, `iss`) → un jeton périmé ou destiné à une autre appli passe.
> 4. Mettre un JWT dans le `localStorage` d'un navigateur → n'importe quel script malveillant peut le voler.

- **`alg: none`** — header réécrit en « non signé » : un vérificateur naïf accepte un jeton forgé. Réflexe : liste blanche d'algorithmes (RFC 8725).
- **Confusion RS256 → HS256** — l'attaquant passe en HMAC ; le serveur prend la **clé publique**, publique, comme secret HMAC et valide la forgerie : usurpation totale. Réflexe : imposer l'algorithme, ne pas le déduire du header.
- **Claims non vérifiés** — contrôler la signature seule laisse passer un jeton expiré ou destiné à une autre app. Réflexe : valider `iss`, `aud`, `exp`, `nbf`.
- **`aud` trop large** — un [[Access Token]] émis pour l'API A accepté par l'API B laisse un service mineur appeler ses voisins. Réflexe : chaque API exige son audience.
- **JWKS mal mis en cache** — après une rotation, l'ancien JWKS reste en mémoire ; le recharger à chaque requête ajoute latence et dépendance. Réflexe : cache à TTL, rafraîchissement forcé sur `kid` inconnu.
- **JWT en `localStorage`** — exfiltrable par toute XSS, persistant à la fermeture de l'onglet. Réflexe : cookie `HttpOnly` + `Secure` + `SameSite`.
- **Durée de vie trop longue** — un JWT ne se révoque pas : 30 jours d'`exp` valent 30 jours d'accès volé. Réflexe : 5 à 15 minutes, plus un [[Refresh Token]] révocable.

## Rappel
> [!question] Question de rappel
> « Le payload est encodé donc illisible : on peut y mettre un numéro de sécurité sociale. »

> [!success]- Réponse
> Faux. base64url est réversible **sans clé** : `base64 -d` restitue le JSON. Un JWS garantit l'intégrité, pas la confidentialité ; seul un JWE (RFC 7516) chiffre, et il reste rare.

### 🎯 Le résumé à retenir

> [!tip] Si tu ne retiens qu'une chose
> **Un JWT, c'est une enveloppe signée — pas un coffre-fort.**
> Le contenu est **lisible par tout le monde** (alphabet bizarre, pas chiffrement). Le cachet garantit seulement que **personne ne l'a modifié**.
>
> **Conséquence pratique :** on n'y met **jamais** de secret, et on vérifie **toujours** le cachet avant de lire.

## Voir aussi
- [[OIDC Discovery et JWKS]] — clé publique, `kid`, rotation.
- [[ID Token]] et [[PKCE]] — le JWT normalisé d'OIDC, l'anti-vol de code.
- [[Access Token]] — souvent un JWT (RFC 9068) porté en `Bearer`.
- [[Refresh Token]] — le pendant opaque et révocable du JWT court.
- [[Sécurité OIDC et OAuth 2.1]] — les pratiques d'ensemble.
- [[DPoP]] — un JWT de preuve (`dpop+jwt`) signé à chaque requête.
- [[mTLS]] — le claim `cnf` (`x5t#S256`) qui lie un jeton à un certificat.
- [[Comparatif des flows OIDC]] — quels flows émettent des JWT.
- [[OIDC (MOC)]] — carte d'entrée du dossier.

## Références
- **RFC 7519** — JSON Web Token (JWT), M. Jones et al., 2015.
- **RFC 7515** (JWS) · **RFC 7516** (JWE) · **RFC 7517** (JWK) · **RFC 7518** (JWA).
- **RFC 8725 / BCP 225** — JWT Best Current Practices (2020) : `alg: none`, confusion d'algorithmes.
- **RFC 9068** — JWT Profile for Access Tokens. · **OpenID Connect Core 1.0** — claims des [[ID Token]], algorithmes asymétriques.
