---
title: Knowledge Center
---

# Knowledge Center

> [!abstract] En clair
> Ce site est une **base de connaissances personnelle**, construite progressivement. Chaque note explique un concept avec des mots simples **et** le vocabulaire technique exact — pour comprendre d'abord, puis nommer correctement.

---

## 🧒 Comment lire ce site

> [!tip] En clair
> Chaque note suit toujours la même structure :
>
> 1. **🧒 Avant de commencer** — une analogie du quotidien, et un tableau « mot technique / en clair ».
> 2. **Le contenu technique** — avec, en tête de chaque section, un encadré **« En clair »** qui explique avant de nommer.
> 3. **⚠️ Les pièges fréquents** — ce qui casse en vrai, et le réflexe qui sauve.
> 4. **🎯 Le résumé à retenir** — l'idée unique à emporter.
> 5. **🗣️ Les questions qu'on te posera** — questions courtes, réponses courtes, et « la phrase qui tue ».
>
> Tu peux lire **dans l'ordre**, ou naviguer librement : les notes sont reliées entre elles.

---

## Les domaines

| Domaine | Notes | Ce que tu y trouves |
|---|---|---|
| **[🔐 Sécurité](security/index)** | **36** | Identité et accès : les protocoles (OIDC, SAML) et la gestion des identités (IAM). |
| **[☕ Java](java/index)** | **7** | La théorie **sous** le code : mémoire partagée, concurrence, JVM, ramasse-miettes, mesure. |

### 🔐 Sécurité

| Sous-domaine | Notes | Ce que tu y trouves |
|---|---|---|
| **[OIDC et OAuth 2.0](security/oidc/index)** | 25 | Les protocoles d'identité modernes : authentification fédérée, jetons, PKCE, mTLS, DPoP, FAPI. |
| **[SAML 2.0](security/saml/index)** | 7 | Le protocole de fédération historique, toujours massivement déployé en entreprise. |
| **[IAM](security/iam/index)** | 4 | La gestion des identités et des accès : workflows d'authentification, modèles d'autorisation, provisionnement. |

➡️ **Point d'entrée :** [Sécurité — vue d'ensemble](security/index)

### ☕ Java

| Sous-domaine | Notes | Ce que tu y trouves |
|---|---|---|
| **[Java](java/index)** | 7 | Ce qui se passe **vraiment** quand le code tourne : mémoire partagée, threads, compilation à la volée, ramasse-miettes, profilage. |

➡️ **Point d'entrée :** [Java — vue d'ensemble](java/index)

---

## 🚪 Entrer par une question

> [!tip] En clair
> Si tu ne sais pas **où** chercher, commence par la question. Chaque note se termine par une section **« Les questions qu'on te posera »**.

| La question que tu te poses… | Où aller |
|---|---|
| *« Quelle différence entre OAuth et OIDC ? »* | [OAuth 2.0](security/oidc/oauth2) · [OpenID Connect](security/oidc/openid_connect) |
| *« Comment lire une trame SAML capturée ? »* | [Lire une trame SAML](security/saml/saml_message_examples) |
| *« Pourquoi mon compteur perd des incréments ? »* | [Modèle mémoire Java](java/java_memory_model) |
| *« L'application est lente mais le CPU est bas ? »* | [Mesurer et profiler](java/java_performance_profiling) |
| *« Pourquoi la mémoire monte sans redescendre ? »* | [Garbage Collection](java/java_garbage_collection) |
| *« Comment propager une déconnexion SSO ? »* | [Logout OIDC](security/oidc/logout) · [Single Logout SAML](security/saml/saml_slo) |
| *« Pool de threads : quelle taille ? »* | [Threads, pools et virtual threads](java/java_threads_executors) |

---

## Les principes de ce site

> [!tip] En clair
> Trois règles guident la construction de cette documentation.

- **Comprendre avant de nommer.** Chaque terme technique est introduit par une explication en mots simples.
- **Un concept, une note.** Une note = une notion identifiable, reliée aux autres.
- **Progressif.** Le contenu se construit par étapes, jamais en masse.
