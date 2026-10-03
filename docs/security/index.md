---
title: Security
aliases: [Index sécurité]
tags: [securite, moc, index, navigation]
domaine: securite
niveau: intermediaire
statut: draft
cree: 2026-10-01
sources: [NIST SP 800-63, NIST SP 800-207, OASIS SAML 2.0, OpenID Connect Core 1.0]
---

# Security
> [!abstract] Ancre
> Carte d'entrée du domaine **sécurité**, organisée en trois dossiers : les protocoles d'identité modernes (`oidc/`), le protocole historique (`saml/`), et le domaine complet de gestion des identités (`iam/`).

---

## 🧒 Avant de commencer : comment s'orienter

> [!tip] En clair
> Ce vault est organisé en **trois dossiers complémentaires**. Voilà comment choisir où aller :

| Si tu veux… | Va dans |
|---|---|
| comprendre l'authentification **moderne** (OAuth, OIDC, jetons, PKCE…) | **[[oidc/index]]** → `oidc/` |
| comprendre l'**ancien** protocole, encore partout en entreprise | **[[saml/index]]** → `saml/` |
| comprendre la **gestion des identités** au sens large (rôles, comptes, cycle de vie) | **[[iam/index]]** → `iam/` |

---

## Les trois dossiers

### 🔑 `oidc/` — Protocoles d'identité modernes

> [!tip] En clair
> **24 notes.** Le cœur du vault : OAuth 2.0, OpenID Connect, tous les flows, les jetons, la session, la sécurité, et le durcissement avancé.

**C'est le dossier le plus complet** — il couvre un protocole de bout en bout, des fondations jusqu'aux usages avancés ([[mtls]], [[dpop]], [[fapi]], [[token_exchange]]).

➡️ **Point d'entrée : [[oidc/index]]**

### 🏛️ `saml/` — Le protocole historique

> [!tip] En clair
> **3 notes.** SAML 2.0 : le protocole de fédération le plus déployé en entreprise, son fonctionnement, ses attaques, et sa comparaison avec OIDC.

**Pourquoi c'est utile** : les grandes organisations l'ont massivement déployé, et on ne remplace pas ce qui fonctionne — on **gravite autour**.

➡️ **Point d'entrée : [[saml/index]]**

### 👥 `iam/` — Gestion des identités et des accès

> [!tip] En clair
> **4 notes.** Le domaine **complet** : au-delà du protocole, comment on **gère** les identités — workflows d'authentification, modèles d'autorisation, provisionnement des comptes.

**C'est le dossier à faire grandir** : il couvre des familles entières (fédération, cycle de vie, architecture) encore incomplètes.

➡️ **Point d'entrée : [[iam/index]]**

---

## Comment les trois se répondent

> [!tip] En clair
> **Les protocoles répondent à « comment transmettre une preuve d'identité ». L'IAM répond à « comment gérer les identités et leurs accès, en entier. »**

```
                    ┌─────────────────────────────┐
                    │        IAM  (domaine)       │
                    │  workflows, rôles, comptes  │
                    └──────────────┬──────────────┘
                                   │ contient
                    ┌──────────────┴──────────────┐
                    │                             │
              ┌─────▼─────┐                 ┌─────▼─────┐
              │   oidc/   │                 │   saml/   │
              │  moderne  │                 │ historique│
              └───────────┘                 └───────────┘
```

**Un exemple qui traverse les trois dossiers :**

| Étape | Où c'est traité |
|---|---|
| Un compte est **créé** automatiquement | [[scim]] (iam) |
| L'utilisateur **se connecte** — comment on transmet la preuve | [[openid_connect]] (oidc) ou [[saml2]] (saml) |
| Un **workflow** décide quels facteurs demander | [[auth_workflows]] (iam) |
| Le **niveau** d'authentification est exigé et vérifié | [[step_up_auth]] (oidc) |
| On décide **à quoi il a droit** | [[rbac_abac_rebac]] (iam) |
| Au **départ**, on coupe l'accès | [[scim]] + [[logout]] |

**C'est le cycle de vie complet d'une identité** — et il traverse les trois dossiers.

---

## Les concepts transverses

> [!tip] En clair
> Certains concepts apparaissent dans **plusieurs** dossiers. Voilà la table de correspondance.

| Concept | oidc/ | saml/ | iam/ |
|---|---|---|---|
| **Fournisseur d'identité** | OpenID Provider (OP) | Identity Provider (IdP) | IdP / annuaire |
| **Application** | Relying Party (RP) | Service Provider (SP) | application cible |
| **Preuve d'identité** | [[id_token]] | Assertion | — |
| **Niveau d'authentification** | `acr_values` / `acr` | `AuthnContextClassRef` | [[auth_workflows]] |
| **Corrélation** | `state` / `nonce` | `RelayState` / `InResponseTo` | — |
| **Permissions** | [[scopes_and_claims]] | `<AttributeStatement>` | [[rbac_abac_rebac]] |
| **Provisionnement** | — | — | [[scim]] |
| **Preuve de possession** | [[mtls]], [[dpop]] | (certificat client) | — |

**La ligne à retenir :** le vocabulaire change, **les rôles restent les mêmes**.

---

## Sujets ouverts

> [!tip] En clair
> Ces sujets ne sont pas encore couverts — à traiter si le besoin se présente. La liste sert de rappel.

**Dans `oidc/`** — usages avancés :
- PAR, JAR, JARM (cités dans [[fapi]], pas encore détaillés)
- CIBA (authentification découplée)
- Dynamic Client Registration
- Token Introspection (RFC 7662) — cité, jamais détaillé
- WebAuthn / passkeys

**Dans `saml/`** :
- Single Logout (SLO)
- Bindings et métadonnées en détail

**Dans `iam/`** — familles entières :
- Cycle de vie des identités (JML) : *Joiner, Mover, Leaver*
- Zero Trust (architecture)
- Annuaires : LDAP, Active Directory
- Fédération inter-organisations et IdP-initiated SSO
- MFA et facteurs résistants au phishing
- Audit et observabilité des événements d'identité

---

## Voir aussi

- [[oidc/index]] — carte du dossier `oidc/` (protocoles modernes).
- [[saml/index]] — carte du dossier `saml/` (protocole historique).
- [[iam/index]] — carte du dossier `iam/` (domaine complet).

## Références

- NIST SP 800-63 — *Digital Identity Guidelines*.
- NIST SP 800-207 — *Zero Trust Architecture*.
- OASIS SAML 2.0 — *Core*, *Profiles*.
- OpenID Connect Core 1.0 — <https://openid.net/specs/openid-connect-core-1_0.html>
- RFC 9700 — *Best Current Practice for OAuth 2.0 Security*.
