---
title: OIDC (MOC)
aliases: [MOC OIDC, Carte OIDC, Index OIDC, Map of Content OIDC]
tags: [oidc, moc, index, navigation]
domaine: securite/oidc
niveau: intermediaire
statut: draft
cree: 2026-10-01
sources: [OpenID Connect Core 1.0, RFC 6749, RFC 9700]
---

# OIDC (MOC)

> [!abstract] Ancre
> Carte d'entrée du domaine **sécurité / OIDC** : par où commencer, dans quel ordre lire, et où trouver chaque notion.

---

## 🧒 Avant de commencer : comment lire ce dossier

> [!tip] En clair
> Cette note est un **plan de lecture**, pas un cours. Elle te dit par où passer.
>
> Tu peux lire le domaine **dans l'ordre** (les quatre étapes ci-dessous), ou piocher directement la note qui t'intéresse — les notes se renvoient les unes aux autres.

---

## Parcours conseillé

### Étape 1 — Les fondations

1. [[OAuth 2.0]] — le socle : déléguer un accès sans donner son mot de passe.
2. [[Authorization Code Flow]] — le flux de référence, en deux temps (le ticket, puis le badge).

### Étape 2 — Sécuriser le flux

3. [[PKCE]] — le cadenas sur le ticket, pour les applications sans secret.
4. [[State (login CSRF)]] — le numéro de suivi, qui t'empêche d'atterrir dans le compte d'un autre.

### Étape 3 — Passer à l'identité

5. [[OpenID Connect]] — la couche qui ajoute l'identité par-dessus OAuth.
6. [[ID Token]] — la carte d'identité signée, et comment la vérifier.

### Étape 4 — Les outils transverses

7. [[JWT]] — le format d'enveloppe utilisé par l'ID Token.
8. [[OIDC Discovery et JWKS]] — comment l'application récupère les clés publiques pour vérifier la signature.
9. [[Sécurité OIDC et OAuth 2.1]] — les bonnes pratiques et les pièges d'ensemble.

### Étape 5 — Durcissement et usages avancés

10. [[mTLS]] — authentifier le client par certificat, lier le jeton à une clé.
11. [[DPoP]] — preuve de possession sans infrastructure.
12. [[Token Exchange]] — délégation d'identité dans les chaînes de services.
13. [[FAPI]] — le profil sectoriel qui assemble tout cela.

---

## Carte du domaine

### Autorisation (OAuth 2.0)

| Note | En une phrase |
|---|---|
| [[OAuth 2.0]] | Le cadre : déléguer un accès limité, sans jamais céder son mot de passe. |
| [[Authorization Code Flow]] | Le flux recommandé : un code jetable en public, les jetons en privé. |
| [[Client Credentials Flow]] | Un service agit en son nom, sans utilisateur. |
| [[Device Authorization Flow]] | Un appareil sans navigateur (TV, CLI) obtient un accès. |
| [[Access Token]] | Le badge : ce que l'application peut faire. |
| [[Refresh Token]] | Le duplicata : renouveler un badge expiré sans se reconnecter. |
| [[Comparatif des flows OIDC]] | Choisir le bon flux selon deux questions : utilisateur ? secret ? |

### Sécurité du flux

| Note | En une phrase |
|---|---|
| [[PKCE]] | Lie le code à un secret : un ticket volé ne sert à rien. |
| [[State (login CSRF)]] | Exige de retrouver son propre ticket : bloque l'injection de code. |
| [[Prompts et contrôle de l'interaction]] | Pilote ce que voit l'utilisateur : `prompt`, `login_hint`, `max_age`. |
| [[Authentification renforcée (acr_values, amr, auth_time)]] | Exiger et vérifier un niveau d'authentification (MFA). |

### Identité (OpenID Connect)

| Note | En une phrase |
|---|---|
| [[OpenID Connect]] | OAuth + une couche d'identité standardisée. |
| [[ID Token]] | La carte d'identité signée : qui est l'utilisateur. |
| [[Scopes et claims]] | Les permissions demandées et les informations reçues (et comment les exiger). |
| [[JWT]] | Le format d'enveloppe signée de l'ID Token. |

### Session et cycle de vie

| Note | En une phrase |
|---|---|
| [[Session SSO et consentement]] | Le cookie de session stateful chez l'OP, et la mémoire des consentements. |
| [[Déconnexion OIDC]] | Pourquoi un logout local ne déconnecte pas partout, et comment propager. |

### Vérification et durcissement

| Note | En une phrase |
|---|---|
| [[OIDC Discovery et JWKS]] | Les métadonnées et les clés publiques, récupérées automatiquement. |
| [[Sécurité OIDC et OAuth 2.1]] | Le bilan : ce qui est déprécié, ce qui est obligatoire. |
| [[mTLS]] | TLS bidirectionnel : authentifier le client et lier le jeton à un certificat. |
| [[DPoP]] | Lier le jeton à une paire de clés, signée à chaque requête. |
| [[Token Exchange]] | Échanger un jeton contre un autre entre services (délégation). |
| [[FAPI]] | Le profil sectoriel (finance) qui rend tout cela obligatoire. |

---

## Les 4 acteurs, partout les mêmes

> [!tip] En clair
> Quel que soit le flux, ce sont **toujours les mêmes personnages**. Une fois qu'ils sont clairs, tout le reste s'en déduit.

| Acteur | En clair | Aussi appelé |
|---|---|---|
| **Resource Owner** | toi | End-User, utilisateur |
| **Client** | l'application | Relying Party (RP) |
| **Authorization Server** | le guichet | OpenID Provider (OP), IdP |
| **Resource Server** | le serveur des données | l'API |

---

## Par où aller si…

| Tu veux… | Va voir |
|---|---|
| Comprendre pourquoi OAuth existe | [[OAuth 2.0]] |
| Voir le déroulé complet d'une connexion | [[Authorization Code Flow]] |
| Comprendre la différence PKCE / state | [[PKCE]] et [[State (login CSRF)]] |
| Savoir comment on sait *qui* est l'utilisateur | [[OpenID Connect]] puis [[ID Token]] |
| Comprendre ce qu'est un JWT | [[JWT]] |
| Savoir comment la signature est vérifiée | [[OIDC Discovery et JWKS]] |
| Choisir un flux pour un cas précis | [[Comparatif des flows OIDC]] |

---

## Voir aussi

- Toutes les notes du dossier sont listées ci-dessus ; le dossier vit dans `securite/oidc/`.
- [[Security (MOC)]] — la carte générale du domaine sécurité (oidc, saml, iam).

## Références

- OpenID Connect Core 1.0 — <https://openid.net/specs/openid-connect-core-1_0.html>
- RFC 6749 — *The OAuth 2.0 Authorization Framework*.
- RFC 9700 — *Best Current Practice for OAuth 2.0 Security*.
