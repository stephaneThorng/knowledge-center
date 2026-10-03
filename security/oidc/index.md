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

1. [[oauth2]] — le socle : déléguer un accès sans donner son mot de passe.
2. [[authorization_code_flow]] — le flux de référence, en deux temps (le ticket, puis le badge).

### Étape 2 — Sécuriser le flux

3. [[pkce]] — le cadenas sur le ticket, pour les applications sans secret.
4. [[state_login_csrf]] — le numéro de suivi, qui t'empêche d'atterrir dans le compte d'un autre.

### Étape 3 — Passer à l'identité

5. [[openid_connect]] — la couche qui ajoute l'identité par-dessus OAuth.
6. [[id_token]] — la carte d'identité signée, et comment la vérifier.

### Étape 4 — Les outils transverses

7. [[jwt]] — le format d'enveloppe utilisé par l'ID Token.
8. [[discovery_and_jwks]] — comment l'application récupère les clés publiques pour vérifier la signature.
9. [[security_oauth21]] — les bonnes pratiques et les pièges d'ensemble.

### Étape 5 — Durcissement et usages avancés

10. [[mtls]] — authentifier le client par certificat, lier le jeton à une clé.
11. [[dpop]] — preuve de possession sans infrastructure.
12. [[token_exchange]] — délégation d'identité dans les chaînes de services.
13. [[fapi]] — le profil sectoriel qui assemble tout cela.

---

## Carte du domaine

### Autorisation (OAuth 2.0)

| Note | En une phrase |
|---|---|
| [[oauth2]] | Le cadre : déléguer un accès limité, sans jamais céder son mot de passe. |
| [[authorization_code_flow]] | Le flux recommandé : un code jetable en public, les jetons en privé. |
| [[client_credentials_flow]] | Un service agit en son nom, sans utilisateur. |
| [[device_authorization_flow]] | Un appareil sans navigateur (TV, CLI) obtient un accès. |
| [[access_token]] | Le badge : ce que l'application peut faire. |
| [[refresh_token]] | Le duplicata : renouveler un badge expiré sans se reconnecter. |
| [[flows_comparison]] | Choisir le bon flux selon deux questions : utilisateur ? secret ? |

### Sécurité du flux

| Note | En une phrase |
|---|---|
| [[pkce]] | Lie le code à un secret : un ticket volé ne sert à rien. |
| [[state_login_csrf]] | Exige de retrouver son propre ticket : bloque l'injection de code. |
| [[prompts_and_interaction]] | Pilote ce que voit l'utilisateur : `prompt`, `login_hint`, `max_age`. |
| [[step_up_auth]] | Exiger et vérifier un niveau d'authentification (MFA). |

### Identité (OpenID Connect)

| Note | En une phrase |
|---|---|
| [[openid_connect]] | OAuth + une couche d'identité standardisée. |
| [[id_token]] | La carte d'identité signée : qui est l'utilisateur. |
| [[scopes_and_claims]] | Les permissions demandées et les informations reçues (et comment les exiger). |
| [[jwt]] | Le format d'enveloppe signée de l'ID Token. |

### Session et cycle de vie

| Note | En une phrase |
|---|---|
| [[sso_session_and_consent]] | Le cookie de session stateful chez l'OP, et la mémoire des consentements. |
| [[logout]] | Pourquoi un logout local ne déconnecte pas partout, et comment propager. |

### Vérification et durcissement

| Note | En une phrase |
|---|---|
| [[discovery_and_jwks]] | Les métadonnées et les clés publiques, récupérées automatiquement. |
| [[security_oauth21]] | Le bilan : ce qui est déprécié, ce qui est obligatoire. |
| [[mtls]] | TLS bidirectionnel : authentifier le client et lier le jeton à un certificat. |
| [[dpop]] | Lier le jeton à une paire de clés, signée à chaque requête. |
| [[token_exchange]] | Échanger un jeton contre un autre entre services (délégation). |
| [[fapi]] | Le profil sectoriel (finance) qui rend tout cela obligatoire. |

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
| Comprendre pourquoi OAuth existe | [[oauth2]] |
| Voir le déroulé complet d'une connexion | [[authorization_code_flow]] |
| Comprendre la différence PKCE / state | [[pkce]] et [[state_login_csrf]] |
| Savoir comment on sait *qui* est l'utilisateur | [[openid_connect]] puis [[id_token]] |
| Comprendre ce qu'est un JWT | [[jwt]] |
| Savoir comment la signature est vérifiée | [[discovery_and_jwks]] |
| Choisir un flux pour un cas précis | [[flows_comparison]] |

---

## Voir aussi

- Toutes les notes du dossier sont listées ci-dessus ; le dossier vit dans `securite/oidc/`.
- [[../index]] — la carte générale du domaine sécurité (oidc, saml, iam).

## Références

- OpenID Connect Core 1.0 — <https://openid.net/specs/openid-connect-core-1_0.html>
- RFC 6749 — *The OAuth 2.0 Authorization Framework*.
- RFC 9700 — *Best Current Practice for OAuth 2.0 Security*.
