---
title: Refresh Token
aliases: [Jeton de rafraîchissement, Refresh Token OAuth, jeton de renouvellement]
tags: [oidc, oauth2, refresh-token, session, rotation]
domaine: securite/oidc
niveau: intermediaire
statut: draft
cree: 2026-10-01
sources: [RFC 6749, RFC 6819, RFC 7009, RFC 9700, OpenID Connect Core 1.0]
---

# Refresh Token

> [!abstract] Ancre
> Le refresh token est un secret de longue durée qui permet d'obtenir un nouvel access token sans réinteraction de l'utilisateur — à condition d'être rotatif, lié au client et stocké côté serveur.

---

## 🧒 Avant de commencer : de quoi on parle

> [!tip] En clair
> Le badge ([[access_token]]) **expire vite** — c'est voulu. Mais on ne va pas te redemander ton mot de passe toutes les cinq minutes.
>
> Alors le guichet remet un **duplicata** : le refresh token. Quand le badge est périmé, l'application présente le duplicata et reçoit un **nouveau badge**, sans que tu aies à refaire quoi que ce soit.
>
> **Différence essentielle :** le badge est **court** (minutes), le duplicata est **long** (jours, mois).

**Les mots à connaître pour cette note :**

| Mot technique | En clair |
|---|---|
| **Refresh Token** | le duplicata, pour refabriquer des badges |
| **rotation** | changer le duplicata à chaque usage |
| **scope `offline_access`** | la case à cocher « je veux un duplicata » |
| **révocation** | déchirer le duplicata pour couper l'accès |
| **client confidentiel** | une application qui a un serveur, donc un endroit sûr pour le ranger |

Voir aussi : [[access_token]] (le badge) et [[authorization_code_flow]] (où il est délivré).

---

## Définition

> [!tip] En clair
> Le refresh token est un **secret** donné à l'application en même temps que le badge. Sa seule fonction : **obtenir un nouveau badge** quand le premier a expiré.
>
> Il vit **beaucoup plus longtemps**, donc c'est la pièce la plus précieuse — et la plus dangereuse si elle fuite.
>
> 🔧 **Le mot technique :** il s'appelle le **refresh token** (RFC 6749 §1.5), et l'action de s'en servir est le *refresh token grant* (§1.5, §6).

Le **refresh token** est un credential de longue durée délivré par le serveur d'autorisation, utilisé par le client pour obtenir un nouvel [[access_token]] sans nouvelle authentification de l'utilisateur (RFC 6749 §1.5). En [[openid_connect]], son obtention est conditionnée au scope `offline_access`.

Il est réservé aux **clients confidentiels** — ou, pour un client public, soumis à des contraintes strictes (rotation, détection de réutilisation) : c'est un secret, donc il lui faut un endroit sûr pour vivre.

---

## Enjeux

> [!tip] En clair
> **Sans refresh token :** soit tu te reconnectes sans arrêt (pénible), soit on fait des badges qui durent très longtemps (dangereux).
>
> **Avec :** on garde des badges **courts** (donc un vol de badge est peu utile) et un duplicata **long** mais **bien gardé** et **révocable** (donc on peut couper l'accès pour de bon).
>
> C'est le compromis qui rend les sessions longue durée supportables **sans** renoncer à la sécurité.

- **Sessions longues sans mot de passe répété** : l'utilisateur reste connecté sans réauthentification.
- **Access tokens courts** : la fenêtre d'exploitation d'un badge volé reste étroite.
- **Contrepartie** : le refresh token est un secret durable — sa fuite donne un accès **prolongé**, d'où l'exigence de rotation et de stockage sûr.
- **Révocation** : c'est le point de contrôle de la session (RFC 7009) — couper le refresh token, c'est couper l'accès futur.

---

## Fonctionnement détaillé

### Le renouvellement, étape par étape

> [!tip] En clair
> L'application montre le duplicata **au guichet** (jamais à l'API, jamais dans le navigateur), et reçoit un nouveau badge en retour. Le navigateur n'est pas dans la conversation : c'est un échange direct et chiffré.

1. L'access token expire (ou est sur le point d'expirer).
2. Le client appelle le `/token` **en direct** (back-channel TLS, comme au [[authorization_code_flow|leg 2]]).
3. Il présente le refresh token et s'authentifie comme client.
4. L'AS vérifie le jeton : valide, non expiré, non révoqué, **lié à ce client**.
5. Il renvoie un nouvel `access_token` (souvent avec un **nouveau** refresh token si la rotation est active).

```http
POST /token HTTP/1.1
Host: auth.example.com
Content-Type: application/x-www-form-urlencoded
Authorization: Basic czZCaG...M2JW

grant_type=refresh_token
&refresh_token=8xLOxBtZp8
&scope=read:contacts
```

Le paramètre `scope` est optionnel : il ne peut que **restreindre** la portée initiale, jamais l'étendre. C'est une garantie de moindre privilège — un client ne peut pas s'attribuer des droits supplémentaires au renouvellement.

### La rotation : le cœur du durcissement

> [!tip] En clair
> **L'idée :** à chaque utilisation, on **déchire** l'ancien duplicata et on en donne un **neuf**. Comme ça, s'il y en a un qui circule, il ne sert qu'une fois.
>
> **Et la détection :** si un **ancien** duplicata réapparaît, c'est la preuve qu'il a été volé. Réflexe immédiat : **tout révoquer** pour cet utilisateur.

- **À chaque refresh**, l'AS émet un **nouveau** refresh token et invalide l'ancien (usage unique).
- Si un **ancien** jeton est présenté, l'AS en déduit un vol et **révoque l'ensemble** des jetons de la famille (*refresh token reuse detection*).
- La rotation transforme donc un vol silencieux en **incident détectable**.

C'est l'une des recommandations centrales de la RFC 9700 : un refresh token sans rotation reste exploitable indéfiniment en cas de fuite.

### Où le stocker (et où ne pas le stocker)

> [!tip] En clair
> Le duplicata est un secret : il doit vivre là où **personne d'autre** ne peut le lire.
>
> - **Serveur** → parfait : base chiffrée, hors de portée du navigateur.
> - **Navigateur ou téléphone** → mauvais : tout y est lisible ou extractible.

| Contexte | Stockage attendu |
|---|---|
| Client confidentiel (back-end) | Base de données serveur, chiffrée, liée à la session |
| SPA | Éviter le refresh token — préférer un cookie `HttpOnly` géré par un back-end (*BFF*) |
| Application mobile | Stockage sécurisé de l'OS (Keychain / Keystore) |
| **À éviter** | `localStorage`, `sessionStorage`, URL, logs, variables d'environnement partagées |

Le refresh token ne transite **jamais** par le navigateur au-delà du back-channel, jamais dans une URL, et n'est jamais journalisé.

### Révocation

> [!tip] En clair
> Pour couper un accès durablement, on **révoque** le duplicata (RFC 7009). Sans ça, un attaquant garde un accès indéfini — même si tu changes ton mot de passe.

- **RFC 7009** : `POST /revoke` avec le jeton et un `token_type_hint=refresh_token`.
- La révocation du refresh token doit invalider les access tokens associés, ou au minimum empêcher leur renouvellement.
- Cas d'usage : déconnexion, changement de mot de passe, détection de réutilisation, incident de sécurité, retrait d'une application.

### En OIDC : `offline_access`

> [!tip] En clair
> Par défaut, OIDC **ne donne pas** de duplicata. Il faut le **demander explicitement** avec le scope `offline_access`.
>
> Cela permet au guichet de tracer précisément **quelle application** conserve un accès durable — et de le lui retirer.

En [[openid_connect]], le refresh token nécessite le scope `offline_access`. L'OP peut le refuser (politique, absence de consentement), et le traiter comme un droit distinct à auditer : c'est l'accès « hors ligne », qui survit à la fermeture de l'onglet.

---

## Exemple concret

> [!tip] En clair
> Un cycle complet : on demande le duplicata, le badge expire, on l'échange, on reçoit un duplicata **neuf**.

**1. Obtention (fin du flow d'autorisation)** — le scope `offline_access` a été demandé :

```json
{
  "access_token": "eyJhbGci...",
  "token_type": "Bearer",
  "expires_in": 3600,
  "refresh_token": "8xLOxBtZp8",
  "scope": "openid offline_access read:contacts"
}
```

**2. Une heure plus tard, le badge est expiré — renouvellement :**

```http
POST /token HTTP/1.1
Host: auth.example.com
Content-Type: application/x-www-form-urlencoded
Authorization: Basic czZCaG...M2JW

grant_type=refresh_token
&refresh_token=8xLOxBtZp8
```

**3. Réponse (rotation active) :**

```json
{
  "access_token": "eyJhbGci...NOUVEAU",
  "token_type": "Bearer",
  "expires_in": 3600,
  "refresh_token": "tGzv3JOkF0XG5Qx2TlKWIA",
  "scope": "openid offline_access read:contacts"
}
```

L'ancien `8xLOxBtZp8` est désormais **invalide**. S'il réapparaît un jour, l'AS le détecte comme un rejeu et révoque toute la famille de jetons.

---

## Pièges fréquents

> [!tip] En clair
> **Les 5 erreurs à retenir :**
> 1. **Pas de rotation** → un duplicata volé reste utilisable pour toujours.
> 2. **Le laisser dans le navigateur** (`localStorage`) → extractible par n'importe quel script.
> 3. **Le laisser dans les logs** → il fuite par l'observabilité.
> 4. **Ne pas détecter la réutilisation** → on ne sait jamais qu'il a été volé.
> 5. **Élargir le scope au renouvellement** → une application s'attribue des droits qu'elle n'avait pas.

- **Refresh token sans rotation** — un vol donne un accès permanent. Réflexe : rotation à chaque usage, détection de réutilisation, révocation de la famille.
- **Stockage côté navigateur** — `localStorage` / `sessionStorage` sont lisibles par toute XSS. Réflexe : côté serveur, ou cookie `HttpOnly; Secure; SameSite`.
- **Jeton journalisé** — présent dans les traces applicatives ou les outils d'APM. Réflexe : masquage systématique, jamais de jeton en clair dans les logs.
- **Non lié au client** — un refresh token d'un client accepté par un autre permet l'escalade. Réflexe : lier le jeton au `client_id` (et à l'authentification du client au renouvellement).
- **Scope élargi au refresh** — demander plus de droits qu'à l'émission initiale. Réflexe : n'autoriser que la **restriction** du scope, jamais l'extension.
- **Révocation incomplète** — révoquer le refresh token sans invalider les access tokens déjà émis. Réflexe : invalider la famille entière.
- **Durée illimitée** — un refresh token sans `exp` vit indéfiniment. Réflexe : durée maximale absolue, réauthentification périodique.
- **Traitement comme un client public** — un refresh token dans une SPA sans back-end équivaut à un secret publié. Réflexe : BFF, ou renoncer au refresh token.

---

## Rappel

> [!question] Question de rappel
> Un refresh token est volé. Comment la rotation permet-elle de transformer ce vol silencieux en incident détecté, et quelles en sont les limites ?

> [!success]- Réponse
> Avec la rotation, chaque utilisation émet un nouveau refresh token et invalide l'ancien. Si l'attaquant utilise le jeton volé, l'ancien est présenté une seconde fois : l'AS détecte la **réutilisation** et révoque toute la famille, ce qui coupe aussi l'accès du client légitime — le vol devient visible. Limites : si l'attaquant agit **avant** le client légitime, c'est le client qui déclenche la détection (et se retrouve déconnecté) ; et la rotation ne protège pas d'un vol au moment même de l'émission, ni d'un stockage non chiffré, ni d'un jeton révocable mais non révoqué.

### 🎯 Le résumé à retenir

> [!tip] Si tu ne retiens qu'une chose
> **Le refresh token est le duplicata du badge.**
> Badge court (minutes), duplicata long (jours) — et il ne vit **que côté serveur**.
>
> **La règle d'or :** on le **change** à chaque usage (rotation) et on **révoque toute la famille** si un ancien réapparaît. C'est ce qui transforme un vol discret en incident détecté.

---

## Voir aussi

- [[access_token]] — le badge que le refresh token sert à renouveler.
- [[authorization_code_flow]] — le flux qui délivre le refresh token.
- [[oauth2]] — le cadre, et le *refresh token grant* (RFC 6749 §1.5, §6).
- [[openid_connect]] — `offline_access` et le consentement associé.
- [[security_oauth21]] — rotation, réutilisation, durcissements RFC 9700.
- [[logout]] — révocation indispensable après une déconnexion.
- [[flows_comparison]] — quels flux peuvent en émettre.
- [[index]] — carte d'entrée du dossier.

## Références

- RFC 6749 — *The OAuth 2.0 Authorization Framework*, §1.5 (Refresh Token) et §6 (Refreshing an Access Token).
- RFC 6819 — *OAuth 2.0 Threat Model and Security Considerations*, §4.5.2 (refresh token leakage).
- RFC 7009 — *OAuth 2.0 Token Revocation*.
- RFC 9700 — *Best Current Practice for OAuth 2.0 Security* — rotation et détection de réutilisation.
- OpenID Connect Core 1.0 — §11 (`offline_access`).
