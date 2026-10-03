---
title: IAM (MOC)
aliases: [MOC IAM, Carte IAM, Index IAM, Identity and Access Management]
tags: [iam, moc, index, navigation, identite, autorisation]
domaine: securite/iam
niveau: intermediaire
statut: draft
cree: 2026-10-01
sources: [NIST SP 800-63, NIST SP 800-162, OASIS SCIM 2.0, OASIS SAML 2.0, OpenID Connect Core 1.0]
---

# IAM (MOC)

> [!abstract] Ancre
> Carte d'entrée du domaine **IAM** (*Identity and Access Management*) : gérer les identités et leurs accès — bien au-delà du protocole d'authentification.

---

## 🧒 Avant de commencer : de quoi on parle

> [!tip] En clair
> **OIDC et SAML, ce sont des protocoles.** Ils répondent à une question précise : *« comment une application apprend-elle qui est l'utilisateur ? »*
>
> **L'IAM, c'est le domaine entier.** Il répond à beaucoup plus de questions :
> - **Qui** a un compte ? (annuaire, cycle de vie)
> - **Comment** se connecte-t-il ? (protocoles, facteurs, workflows)
> - **À quoi** a-t-il droit ? (rôles, attributs, permissions)
> - **Comment** ses droits évoluent-ils quand il change de poste, puis part ? (provisioning, JML)
>
> 🔑 **L'analogie :** le protocole, c'est **la serrure de ta porte**. L'IAM, c'est **tout le service de sécurité de l'immeuble** : les badges, les registres, les niveaux d'accès, les arrivées et les départs, les caméras.

**Les mots à connaître pour cette MOC :**

| Mot technique | En clair |
|---|---|
| **IAM** | *Identity and Access Management* : gérer identités **et** accès |
| **identité** | ce qu'on sait d'une personne (ou d'une machine) |
| **authentification** | **prouver** qui on est |
| **autorisation** | décider **à quoi** on a droit |
| **annuaire** | le répertoire des comptes (LDAP, Active Directory…) |
| **provisioning** | **créer / modifier / supprimer** les comptes automatiquement |

---

## Les cinq grandes familles de l'IAM

> [!tip] En clair
> Voilà la carte du domaine. **Chaque famille répond à une question différente** — et c'est ce découpage qui te permettra de t'y retrouver.

### 1. 🔐 Authentification — *prouver qui on est*

C'est la partie qu'on a déjà beaucoup couverte avec OIDC.

| Notion | En clair |
|---|---|
| Facteurs (mot de passe, OTP, clé, biométrie) | **avec quoi** on prouve |
| Protocoles ([[OpenID Connect]], [[SAML 2.0]]) | **comment** on transmet la preuve |
| **[[Workflows d'authentification]]** | **assembler** plusieurs étapes et facteurs |
| Niveau de garantie ([[Authentification renforcée (acr_values, amr, auth_time)]]) | **quelle force** de preuve |

### 2. 🎫 Autorisation — *décider à quoi on a droit*

| Notion | En clair |
|---|---|
| **[[RBAC, ABAC et ReBAC]]** | les modèles de permissions (rôles, attributs, relations) |
| PDP / PEP / PIP | les **composants** qui prennent la décision |
| Scopes ([[Scopes et claims]]) | la version OAuth de la permission |

### 3. 👥 Gestion du cycle de vie — *qui a un compte, et jusqu'à quand*

| Notion | En clair |
|---|---|
| **[[SCIM]]** | le **standard** pour provisionner automatiquement |
| JML (*Joiner, Mover, Leaver*) | arrivée, changement de poste, départ |
| Annuaire (LDAP, AD) | la **source de vérité** des comptes |
| Liste de contrôle | mettre à jour ce tableau au fur et à mesure des nouvelles notes |

### 4. 🤝 Fédération — *faire confiance à l'extérieur*

| Notion | En clair |
|---|---|
| Fédération d'identité | accepter l'identité d'une **autre** organisation |
| IdP-initiated SSO | le SSO démarré depuis le portail de l'IdP |
| Confiance inter-domaines | qui certifie qui |

### 5. 🏗️ Architecture et exploitation

| Notion | En clair |
|---|---|
| **Zero Trust** | ne rien supposer de sûr, tout vérifier |
| MFA / résistance au phishing | les facteurs modernes |
| Audit et observabilité | tracer, détecter, répondre |

---

## Parcours conseillé

1. **[[Workflows d'authentification]]** — assembler des étapes et des facteurs. *Le plus proche de la pratique.*
2. **[[RBAC, ABAC et ReBAC]]** — comment on modélise les permissions.
3. **[[SCIM]]** — le provisionnement automatique des comptes.
4. *(à venir)* — cycle de vie des identités (JML), Zero Trust, annuaires.

---

## Le lien avec le reste du vault

> [!tip] En clair
> **L'IAM contient le protocole, mais ne s'y réduit pas.** Voilà où se situent les dossiers :

```
securite/
  oidc/   ← le protocole OIDC/OAuth (23 notes) : authentification fédérée moderne
  saml/   ← le protocole SAML 2.0 : authentification fédérée historique
  iam/    ← CE dossier : le domaine complet
```

**Les protocoles (`oidc/`, `saml/`) répondent à « comment transmettre une preuve d'identité ».**
**L'IAM (`iam/`) répond à « comment gérer les identités et leurs accès, en entier ».**

- [[OpenID Connect]] — le protocole moderne, une **brique** de l'IAM.
- [[SAML 2.0]] — le protocole historique, une **autre brique**.
- [[SAML vs OIDC]] — comment choisir, et pourquoi les deux coexistent.
- [[OIDC (MOC)]] — carte d'entrée du domaine protocole moderne.
- [[SAML (MOC)]] — carte d'entrée du domaine protocole historique.
- [[Security (MOC)]] — la carte générale du domaine sécurité.

## Références

- NIST SP 800-63 — *Digital Identity Guidelines* (authentification, niveaux de garantie).
- NIST SP 800-162 — *Guide to Attribute Based Access Control (ABAC)*.
- NIST SP 800-207 — *Zero Trust Architecture*.
- OASIS SCIM 2.0 — *System for Cross-domain Identity Management*.
- OASIS SAML 2.0 — *Core*, *Profiles*.
- OpenID Connect Core 1.0.
