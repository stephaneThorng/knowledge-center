---
title: Client Credentials Flow
aliases: [Client Credentials, Client Credentials Grant, flow machine-to-machine, M2M, Client Credentials Flow]
tags: [oidc, oauth2, flow, client-credentials, machine-to-machine]
domaine: securite/oidc
niveau: intermediaire
statut: draft
cree: 2026-10-01
sources: [RFC 6749, RFC 6819, RFC 9700, OAuth 2.1 draft]
---

# Client Credentials Flow

> [!abstract] Ancre
> Le flow *client credentials* permet à une application d'obtenir un jeton en son **propre nom**, sans aucun utilisateur : c'est le grant machine-to-machine.

---

## 🧒 Avant de commencer : de quoi on parle

> [!tip] En clair
> Jusqu'ici, il y avait **toujours un utilisateur** : toi, qui cliques « Autoriser ». Ici, **il n'y a personne**.
>
> C'est un **service qui parle à un autre service** : par exemple un serveur qui, chaque nuit, va chercher des données sur une autre API. Aucun humain n'est dans la boucle — donc pas de page de login, pas de consentement, pas de navigateur.
>
> L'application se présente **elle-même** au guichet, avec son identifiant et son mot de passe d'application, et reçoit un badge **à son nom**.

**Les mots à connaître pour cette note :**

| Mot technique | En clair |
|---|---|
| **Client Credentials** | le flow « je m'identifie moi-même, sans utilisateur » |
| **machine-to-machine (M2M)** | service à service, sans humain |
| **client_id / client_secret** | l'identifiant et le mot de passe **de l'application** |
| **`sub` = l'application** | ici, le badge est au nom du service, pas d'une personne |

Voir aussi : [[oauth2]] (les autres grants) et [[pkce]] (qui **ne s'applique pas** ici).

---

## Définition

> [!tip] En clair
> Le *Client Credentials Flow* (RFC 6749 §4.4) est le mode d'obtention de jeton où **le client s'authentifie auprès du serveur d'autorisation avec ses propres identifiants**, sans intervention d'un resource owner. Le jeton obtenu représente **l'application elle-même**.

Le **Client Credentials Flow** est le grant OAuth 2.0 (RFC 6749 §4.4) destiné aux accès **machine-to-machine** : le client obtient un [[access_token]] en présentant ses seuls identifiants (`client_id` et `client_secret`, ou une authentification plus forte), sans utilisateur, sans navigateur, sans `redirect_uri`.

---

## Enjeux

> [!tip] En clair
> **Le cas d'usage :** un service a besoin de parler à une API **pour son propre compte** — pas pour un utilisateur. Il n'y a donc ni consentement à recueillir, ni identité à représenter.
>
> **Le piège à comprendre tout de suite :** le badge obtenu est au nom de **l'application**, pas d'une personne. Il ne dit **rien** sur un utilisateur. Ne jamais l'utiliser comme s'il y en avait un.

- **Sans utilisateur** : pas de consentement, pas de session, pas de navigateur — la surface d'attaque se réduit.
- **Identité = l'application** : `sub` désigne le client, jamais une personne.
- **Secret critique** : c'est le `client_secret` (ou la clé) qui est l'unique barrière ; sa gestion devient le point sensible.
- **Moindre privilège** : un scope minimal par service, et une audience restreinte par API.

---

## Fonctionnement détaillé

### Un seul appel, pas de redirection

> [!tip] En clair
> Il n'y a **qu'une seule étape** : l'application se présente au guichet avec son mot de passe et demande un badge. Pas de redirection, pas de code, pas de navigateur.

1. Le client s'authentifie auprès du `/token` (HTTP Basic recommandé, ou paramètres POST).
2. Il indique `grant_type=client_credentials` et éventuellement un `scope`.
3. Le serveur d'autorisation vérifie **ses propres** identifiants.
4. Il renvoie un [[access_token]] (aucun refresh token : l'accès est renouvelable à volonté par le client lui-même).

```http
POST /token HTTP/1.1
Host: auth.example.com
Content-Type: application/x-www-form-urlencoded
Authorization: Basic czZCaG...M2JW

grant_type=client_credentials
&scope=read:invoices
```

**Réponse :**

```json
{
  "access_token": "eyJhbGci...",
  "token_type": "Bearer",
  "expires_in": 3600,
  "scope": "read:invoices"
}
```

Un client confidentiel peut demander un scope **inférieur** à ce qui lui est accordé, jamais supérieur : la réponse indique toujours le périmètre réellement octroyé.

### Ni PKCE, ni refresh token

> [!tip] En clair
> Deux absences qui surprennent souvent, et qui s'expliquent par la même raison : **il n'y a rien à protéger dans un navigateur.**
>
> - **Pas de [[pkce]]** : PKCE protège un **code** qui voyage dans un navigateur. Ici, aucun code, aucun navigateur — PKCE n'aurait rien à protéger.
> - **Pas de refresh token** : le client connaît déjà son propre secret. Il peut redemander un badge **quand il veut**, sans rien demander à personne.

Le grant ne délivre pas de [[refresh_token]] par défaut : le client, disposant de ses propres identifiants, peut réémettre un jeton à tout moment. L'ajout d'un refresh token est possible mais sans intérêt dans la plupart des cas.

### Le secret devient le point critique

> [!tip] En clair
> Puisqu'il n'y a **qu'une seule barrière** (le mot de passe de l'application), tout l'enjeu de sécurité se déplace là : **le garder secret et le changer régulièrement**.
>
> Et comme un service ne peut pas « se méfier » d'une requête, la véritable défense est **ailleurs** : cloisonner ce que ce service a le droit de faire.

Les bonnes pratiques portent sur la gestion du secret plutôt que sur le protocole :

| Mesure | En clair |
|---|---|
| Stockage en coffre-fort de secrets | ne jamais mettre le secret dans le code ou dans un dépôt Git |
| Rotation périodique | changer le secret sans interrompre le service |
| Authentification forte du client | `private_key_jwt` ou mTLS plutôt qu'un secret partagé |
| Scope minimal | un service = les droits strictement nécessaires |
| Audience restreinte | le jeton n'est valable que pour l'API visée |
| Journalisation | tracer quel service a demandé quoi, et quand |

L'authentification par **clé asymétrique** (`private_key_jwt`, mTLS) est préférable au `client_secret` : le client signe une assertion avec sa clé privée, aucune valeur secrète ne circule. Détail de mTLS : [[mtls]] ; usage combiné et exigences sectorielles : [[fapi]].

---

## Exemple concret

> [!tip] En clair
> Un service de facturation interroge une API interne toutes les heures. Aucun utilisateur n'est impliqué.

Un service `billing-worker` doit lire les factures de l'API `api.finance.example.com`.

**1. Le service demande un jeton :**

```http
POST /token HTTP/1.1
Host: auth.example.com
Content-Type: application/x-www-form-urlencoded
Authorization: Basic YmlsbGluZy13b3JrZXI6...

grant_type=client_credentials
&scope=read:invoices
```

**2. Il reçoit un jeton à son nom :**

```json
{
  "access_token": "eyJhbGci...",
  "token_type": "Bearer",
  "expires_in": 3600,
  "scope": "read:invoices"
}
```

**3. Le jeton décodé :**

```json
{
  "iss": "https://auth.example.com",
  "aud": "https://api.finance.example.com",
  "sub": "billing-worker",        // ← l'APPLICATION, pas un utilisateur
  "scope": "read:invoices",
  "exp": 1759316420,
  "typ": "at+jwt"
}
```

**4. Appel de l'API :**

```http
GET /invoices HTTP/1.1
Host: api.finance.example.com
Authorization: Bearer eyJhbGci...
```

L'API vérifie la signature, l'audience et le scope. Elle sait que l'appelant est `billing-worker` — **elle ne sait pas, et ne peut pas savoir, pour quel utilisateur**.

---

## Pièges fréquents

> [!tip] En clair
> **Les 5 erreurs à retenir :**
> 1. **Croire qu'il y a un utilisateur** → `sub` désigne l'application, pas une personne.
> 2. **Laisser le secret dans le code ou Git** → le secret est la seule barrière.
> 3. **Mettre [[pkce]]** → ça n'a aucun sens ici, il n'y a pas de code.
> 4. **Utiliser ce jeton comme identité d'un utilisateur** → c'est une confusion grave.
> 5. **Accorder trop de droits au service** → un service compromis devient très puissant.

- **`sub` interprété comme un utilisateur** — le jeton identifie l'**application**. Réflexe : ne jamais créer une session utilisateur à partir d'un jeton *client credentials*.
- **Secret exposé** — secret en dur dans le code, committé, ou dans un fichier de configuration partagé. Réflexe : coffre-fort de secrets, injection à l'exécution, rotation.
- **PKCE attendu ou exigé** — PKCE protège un code en transit dans un navigateur ; ici, ni code, ni navigateur. Réflexe : ne pas appliquer PKCE à ce grant ([[pkce]]).
- **Scope trop large** — un service compromis ou détourné obtient tous les droits demandés. Réflexe : un scope minimal par service, revu régulièrement.
- **Aucune restriction d'audience** — le jeton devient utilisable contre n'importe quelle API de l'écosystème. Réflexe : `aud` strict, vérifié par chaque API.
- **Secret partagé entre plusieurs services** — impossible de révoquer l'un sans casser les autres, et l'attribution est floue. Réflexe : **un client par service**.
- **Absence de rotation** — un secret ancien, jamais changé, est un secret probablement divulgué. Réflexe : rotation planifiée et automatisée.
- **Journalisation du secret** — l'en-tête d'authentification apparaît en clair dans les logs. Réflexe : masquage systématique.

---

## Rappel

> [!question] Question de rappel
> Pourquoi le Client Credentials Flow ne délivre-t-il ni code d'autorisation, ni refresh token, et pourquoi PKCE n'y a-t-il aucun sens ?

> [!success]- Réponse
> Parce qu'il **n'y a pas d'utilisateur** : aucune redirection, aucun navigateur, aucune interaction. Le client s'authentifie directement auprès du `/token`, il n'y a donc **aucun code** à faire transiter et à protéger — l'objet même de PKCE (et du `state`) est absent. Le refresh token est inutile parce que le client détient déjà ses propres identifiants : il peut demander un nouveau jeton à tout moment, sans le secours d'aucun autre secret. L'enjeu de sécurité se déplace entièrement sur la **gestion du `client_secret`** (ou de la clé privée) et sur le **scope** accordé.

### 🎯 Le résumé à retenir

> [!tip] Si tu ne retiens qu'une chose
> **Client Credentials = un service qui agit en son propre nom, sans utilisateur.**
> Un seul appel au guichet, avec le mot de passe de l'application. Pas de navigateur, pas de code, donc **pas de PKCE**.
>
> **Le vrai sujet de sécurité ici n'est pas le protocole : c'est la garde du secret.** Coffre-fort, rotation, scope minimal.

---

## Voir aussi

- [[oauth2]] — le cadre et la liste des grants.
- [[authorization_code_flow]] — le contraste : un utilisateur, un navigateur, un code.
- [[pkce]] — explicitement hors périmètre de ce grant.
- [[access_token]] — le jeton délivré, marqué `typ: at+jwt`.
- [[flows_comparison]] — situer ce grant parmi les autres.
- [[security_oauth21]] — gestion des secrets, `private_key_jwt`, mTLS.
- [[mtls]] — authentification du client par certificat, sans secret partagé.
- [[fapi]] — le profil qui l'impose pour les échanges financiers.
- [[index]] — carte d'entrée du dossier.

## Références

- RFC 6749 — *The OAuth 2.0 Authorization Framework*, §4.4 (Client Credentials Grant) et §2.3 (Client Authentication).
- RFC 6819 — *OAuth 2.0 Threat Model and Security Considerations*.
- RFC 8705 — *OAuth 2.0 Mutual-TLS Client Authentication*.
- RFC 9700 — *Best Current Practice for OAuth 2.0 Security* — authentification des clients, secrets.
- RFC 9068 — *JWT Profile for OAuth 2.0 Access Tokens* (`typ: at+jwt`).
- draft-ietf-oauth-v2-1 — *The OAuth 2.1 Authorization Framework*.
