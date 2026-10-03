---
title: Prompts et contrôle de l'interaction
aliases: [prompt, prompt=none, prompt=login, login_hint, max_age, ui_locales, response_mode, contrôle de l'interaction, Prompts et contrôle de l'interaction]
tags: [oidc, oauth2, prompt, interaction, sso, parametres]
domaine: securite/oidc
niveau: intermediaire
statut: draft
cree: 2026-10-01
sources: [OpenID Connect Core 1.0, RFC 6749, RFC 9700, OpenID Connect Session Management 1.0]
---

# Prompts et contrôle de l'interaction

> [!abstract] Ancre
> Les paramètres de contrôle de l'interaction (`prompt`, `login_hint`, `max_age`, `ui_locales`, `response_mode`) permettent au client de décider **ce que l'utilisateur voit** — ou ne voit pas — pendant l'autorisation.

---

## 🧒 Avant de commencer : de quoi on parle

> [!tip] En clair
> Normalement, quand tu cliques « Se connecter avec Google », une **page s'affiche** : tu tapes ton mot de passe, tu coches « j'autorise », et ça repart.
>
> Mais parfois, l'application veut **piloter cette page** :
> - « Ne m'affiche **rien** : connecte-moi en douce si c'est possible. »
> - « **Force** l'utilisateur à se reconnecter, même s'il a déjà une session. »
> - « **Redemande** son consentement, je veux être sûr. »
> - « Pré-remplis son adresse, ça ira plus vite. »
>
> Ces consignes se donnent avec un paramètre appelé **`prompt`** (et quelques copains).

**Les mots à connaître pour cette note :**

| Mot technique | En clair |
|---|---|
| **`prompt`** | la consigne donnée au guichet pour la page d'interaction |
| **`prompt=none`** | « ne montre rien, débrouille-toi en silence » |
| **`prompt=login`** | « force-le à se reconnecter » |
| **`prompt=consent`** | « redemande-lui son accord » |
| **`login_hint`** | « pré-remplis son adresse » |
| **`max_age`** | « sa connexion ne doit pas être vieille de plus de X secondes » |
| **`ui_locales`** | « affiche la page dans cette langue » |
| **`response_mode`** | « comment je veux recevoir la réponse » |
| **SSO silencieux** | se connecter **sans** rien afficher à l'utilisateur |

Cette note complète la liste des paramètres de `/authorize` décrite dans [[authorization_code_flow]].

---

## Définition

> [!tip] En clair
> Ces paramètres sont **tous optionnels**. Ils ne changent rien à la **sécurité** du flow (c'est [[pkce]] et [[state_login_csrf]] qui s'en chargent) : ils changent **l'expérience** — ce que voit l'utilisateur, et quand.
>
> 🔧 **Le mot technique :** ils sont définis par **OpenID Connect Core §3.1.2.1** (pour `prompt`, `login_hint`, `max_age`, `ui_locales`) et par **RFC 6749 §4.1.1** (`state`, `scope`, etc.). `response_mode` vient de **OAuth 2.0 Multiple Response Type Encoding Practices**.

Les **paramètres de contrôle de l'interaction** sont des paramètres de la requête `/authorize` qui influencent le comportement du serveur d'autorisation vis-à-vis de l'utilisateur : afficher ou non une interface, forcer une réauthentification, redemander un consentement, pré-remplir un identifiant, choisir la langue, ou déterminer la modalité de retour de la réponse.

Ils constituent la couche **UX et politique** du flow, par-dessus la couche **sécurité** ([[pkce]], [[state_login_csrf]], `nonce`).

---

## Enjeux

> [!tip] En clair
> **Pourquoi ça compte ?** Parce que la plupart des applications ne veulent pas *imposer* une page de connexion à chaque interaction :
> - Si l'utilisateur est **déjà connecté** chez Google, on aimerait le laisser passer **sans rien afficher**.
> - Mais pour une opération sensible (changer un mot de passe, payer), on veut **au contraire** le forcer à se réauthentifier.
>
> Ces paramètres servent exactement à ça : **dosage** entre fluidité et exigence de sécurité.

- **Fluidité** : `prompt=none` et `login_hint` réduisent les frictions (SSO transparent, formulaire pré-rempli).
- **Exigence** : `prompt=login` et `max_age` garantissent une authentification **fraîche** pour les actions sensibles.
- **Conformité** : `prompt=consent` permet de re-recueillir un consentement explicite (RGPD, périmètre élargi).
- **Localisation** : `ui_locales` adapte l'interface à l'utilisateur.
- **Contrat de retour** : `response_mode` détermine **comment** la réponse arrive — et donc ce qui peut fuiter.
- **Point de vigilance** : mal utilisés, ils **cassent** le flux (une erreur à la place d'une page) — c'est le piège principal de `prompt=none`.

---

## Fonctionnement détaillé

### `prompt` : la consigne d'interaction

> [!tip] En clair
> `prompt` répond à une seule question : **« est-ce que tu as le droit de montrer quelque chose à l'utilisateur ? »**
>
> Quatre valeurs possibles, et on peut en **combiner** plusieurs (séparées par un espace).

| Valeur | En clair | Effet |
|---|---|---|
| `none` | « ne montre **rien** » | Aucune interface ; si une interaction est nécessaire → **erreur** |
| `login` | « **force** la reconnexion » | L'OP réauthentifie l'utilisateur, même avec une session active |
| `consent` | « **redemande** l'accord » | L'OP réaffiche l'écran de consentement |
| `select_account` | « fais-le **choisir** son compte » | L'OP affiche le sélecteur de comptes (« lequel ? ») |

Les valeurs se **combinent** en les séparant par un espace (`prompt=login consent`), RFC 6749 §4.1.1 / OIDC Core §3.1.2.1. Un OP qui ne reconnaît pas une valeur peut soit l'ignorer, soit renvoyer une erreur — comportement à vérifier dans sa documentation.

**Le point crucial sur `none`.** `prompt=none` **interdit toute interface**. C'est le mode « SSO silencieux » : le client demande « si l'utilisateur a déjà une session valide, donne-moi un code **sans rien afficher** ». Si une interaction serait nécessaire, l'OP **ne montre pas** de page : il **renvoie une erreur**.

### `prompt=none` : le SSO silencieux, et ses erreurs

> [!tip] En clair
> C'est **le paramètre le plus piégeux** de la note. Il ne dit pas « connecte-moi en silence » : il dit **« ne m'affiche rien — et si tu ne peux pas, échoue »**.
>
> Le piège classique : un développeur met `prompt=none` en pensant « SSO discret », et découvre que **son application ne marche plus du tout** pour un utilisateur non connecté. Elle reçoit une **erreur** au lieu d'une page de connexion.

Erreurs retournées dans l'URL de redirection (OIDC Core §3.1.2.6) :

| Erreur | En clair | Ce qui s'est passé |
|---|---|---|
| `login_required` | « il faut se connecter » | L'utilisateur n'a **pas** de session chez l'OP |
| `interaction_required` | « il faut lui montrer quelque chose » | Une interaction est nécessaire (consentement, choix de compte…) |
| `consent_required` | « il faut son accord » | Le consentement n'a pas encore été donné |
| `account_selection_required` | « il faut qu'il choisisse un compte » | Plusieurs comptes, aucun sélectionné |
| `session_selection_required` | « il faut choisir une session » | Plusieurs sessions possibles |

**Le bon usage** de `prompt=none` : c'est une **tentative**, pas une commande. Le client doit **gérer l'erreur** et relancer un flow normal (avec interface) :

```
1. Tentative : /authorize?...&prompt=none
2. Si 200 + code          → SSO silencieux réussi, on continue.
3. Si error=login_required → relancer /authorize SANS prompt=none
                             (l'utilisateur verra la page de connexion)
```

C'est exactement ce que fait un SSO transparent côté portail : on **essaie** en silence, et on **retombe** sur l'interface si ça échoue. Un client qui ne gère pas ces erreurs produit une application cassée.

> [!warning] L'erreur à ne pas commettre
> `prompt=none` **ne remplace pas** une vérification de session. Ce n'est pas un moyen de « vérifier si l'utilisateur est connecté » de façon fiable, et ce n'est **pas** une protection : aucune vérification cryptographique ne s'y attache. C'est une **optimisation d'expérience**.

### `login_hint` : pré-remplir l'identifiant

> [!tip] En clair
> Une **suggestion** : « je crois que l'utilisateur est `alice@exemple.com`, pré-remplis le champ ».
>
> L'utilisateur peut **toujours changer** la valeur. Et si le compte est déjà connecté, `login_hint` peut servir à **choisir lequel** utiliser.

`login_hint` (OIDC Core §3.1.2.1) pré-remplit le champ d'identification de la page de connexion. La valeur peut être un `email`, un `sub`, ou tout identifiant compris par l'OP. Usage typique : un portail d'entreprise qui connaît déjà l'adresse de l'utilisateur.

- **Ce n'est pas une authentification** : la valeur n'est pas vérifiée, c'est un confort de saisie.
- **Combiné à `prompt=none`** : peut servir d'indice pour réutiliser une session correspondante.
- **Signal de pistage possible** : l'OP voit l'identifiant proposé — dans un contexte multi-tenant, préférer le domaine (`@exemple.com`) à l'adresse nominative quand c'est suffisant.
- **Ne jamais y mettre de donnée sensible** : le paramètre voyage dans l'URL au leg 1, donc dans l'historique et les logs.

### `max_age` : exiger une authentification fraîche

> [!tip] En clair
> « Sa connexion ne doit pas dater de plus de **X secondes**. Si elle est plus vieille, redemande-lui son mot de passe. »
>
> C'est la **ceinture de sécurité** des opérations sensibles : payer, changer un mot de passe, modifier des droits.
>
> Elle s'accompagne d'un contrôle : le guichet renvoie **quand** l'utilisateur s'est vraiment connecté (le claim `auth_time`), et l'application **vérifie** que ça respecte son exigence.

`max_age` (OIDC Core §3.1.2.1) exprime une durée maximale, en secondes, depuis la **dernière authentification active** de l'utilisateur. Si l'écart dépasse `max_age`, l'OP **doit** réauthentifier l'utilisateur avant d'émettre l'`id_token`.

La chaîne complète — c'est là que ça devient intéressant :

1. Le client envoie `max_age=300`.
2. L'OP vérifie l'âge de la session ; si nécessaire, il **redemande** les identifiants.
3. L'OP place dans l'[[id_token]] le claim **`auth_time`** : l'instant **réel** de l'authentification.
4. Le client **vérifie** que `auth_time` respecte bien son exigence.

| Point de confusion | En clair |
|---|---|
| `auth_time` vs `iat` | `iat` = quand le **jeton** a été émis ; `auth_time` = quand l'**utilisateur** s'est connecté. En SSO, le jeton peut être neuf alors que la connexion date de la veille. |
| `max_age` vs `exp` | `max_age` porte sur l'**authentification** de l'utilisateur ; `exp` sur la **validité du jeton**. Deux choses différentes. |
| `max_age=0` | Force une réauthentification : équivalent pratique à `prompt=login`. |

`max_age` est **le seul** de ces paramètres qui possède une contrepartie **vérifiable** dans le jeton : c'est ce qui en fait un outil de sécurité, pas seulement d'UX. Voir [[id_token]] pour `auth_time` et `acr`/`amr` (`acr_values` et `amr` sont traités dans une note dédiée à l'authentification renforcée).

### `ui_locales` : la langue de l'interface

> [!tip] En clair
> « Affiche la page dans **cette** langue » : une **préférence**, exprimée comme dans un navigateur (`fr-FR`, `de`, `en-US`).
>
> Le guichet peut l'ignorer (il a ses propres langues) — et peut renvoyer la langue réellement utilisée dans `ui_locales` du document de découverte.

`ui_locales` (OIDC Core §3.1.2.1) liste, par ordre de préférence, les langues souhaitées pour l'interface d'authentification. Valeur au format BCP 47 (`fr-FR de en`). L'OP reste maître : les langues qu'il supporte sont annoncées dans le document de découverte ([[discovery_and_jwks]]), et les préférences effectives peuvent apparaître dans la réponse si le paramètre `claims` les sollicite.

Bon à savoir : `ui_locales` **n'est pas une garantie**. Un OP peut n'offrir qu'une langue, ou décider de suivre son propre réglage de compte.

### `response_mode` : comment revient la réponse

> [!tip] En clair
> Une question simple : **« la réponse (le code, ou des jetons), tu me l'envoies comment ? »**
>
> - Dans les paramètres d'URL classiques (`?code=...`) → `query`.
> - Après le `#` de l'URL → `fragment` (usage historique d'Implicit).
> - Par un envoi discret de formulaire **POST** → `form_post`.
>
> Pour un flow normal ([[authorization_code_flow]]), c'est `query`. `form_post` est utile quand l'URL est trop longue ou qu'on veut éviter que des données apparaissent dans l'URL.

| `response_mode` | Transport | Quand |
|---|---|---|
| `query` | `?code=…&state=…` | Défaut du code flow ; le plus courant |
| `fragment` | `#code=…` | Historique (Implicit) ; **à éviter** |
| `form_post` | POST auto-soumis | Paramètres/URL trop longs, éviter l'exposition en URL |

OAuth 2.0 *Multiple Response Type Encoding Practices* définit `form_post`. Les valeurs interdites sont précisées par la RFC 9700 : `fragment` ne doit **pas** être utilisé pour transmettre des jetons (implicit est déprécié, voir [[flows_comparison]]).

---

## Exemple concret

> [!tip] En clair
> **Trois scénarios concrets**, chacun avec la requête exacte. C'est le cœur pratique de la note.

### Scénario 1 — SSO silencieux (application portail)

L'utilisateur arrive sur le portail. On veut le connecter **sans rien afficher** s'il a déjà une session.

**Tentative silencieuse :**

```http
GET /authorize?response_type=code
  &client_id=portail-123
  &redirect_uri=https%3A%2F%2Fportail.example.com%2Fcallback
  &scope=openid%20profile
  &state=af0ifjsldkj
  &nonce=n-0S6_WzA2Mj
  &code_challenge=E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM
  &code_challenge_method=S256
  &prompt=none
HTTP/1.1
Host: auth.example.com
```

**Cas A — l'utilisateur a une session** → `302` avec `code` → on continue normalement. **Aucune page affichée.**

**Cas B — il n'a pas de session** → `302` vers le callback avec une erreur, **sans page de connexion** :

```http
HTTP/1.1 302 Found
Location: https://portail.example.com/callback?error=login_required&state=af0ifjsldkj
```

**Le client relance alors SANS `prompt=none`** — et là seulement, l'utilisateur voit le formulaire :

```http
GET /authorize?response_type=code
  &client_id=portail-123
  &redirect_uri=https%3A%2F%2Fportail.example.com%2Fcallback
  &scope=openid%20profile
  &state=af0ifjsldkj
  &nonce=n-0S6_WzA2Mj
  &code_challenge=E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM
  &code_challenge_method=S256
HTTP/1.1
Host: auth.example.com
```

> [!tip] En clair
> **Le réflexe à retenir :** `prompt=none` est une **tentative**, suivie d'un **plan B obligatoire**. Sans ce plan B, l'application est cassée pour tout utilisateur non déjà connecté.

### Scénario 2 — opération sensible (authentification fraîche)

L'utilisateur veut changer son mot de passe : on exige une connexion **de moins de 5 minutes**.

```http
GET /authorize?response_type=code
  &client_id=portail-123
  &redirect_uri=https%3A%2F%2Fportail.example.com%2Fcallback
  &scope=openid
  &state=a1b2c3
  &nonce=x9y8z7
  &max_age=300
  &prompt=login
  &code_challenge=E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM
  &code_challenge_method=S256
HTTP/1.1
Host: auth.example.com
```

À la réception, le client **vérifie** `auth_time` dans l'[[id_token]] :

```
auth_time reçu : 1759316000
maintenant     : 1759316120   → écart = 120 s ≤ 300 s → OK
```

Si l'écart dépassait `max_age`, **le client rejette** : l'exigence n'a pas été respectée.

### Scénario 3 — choix du compte + consentement renouvelé

```http
GET /authorize?response_type=code
  &client_id=crm-42
  &redirect_uri=https%3A%2F%2Fcrm.example.fr%2Fcallback
  &scope=openid%20email
  &state=xyz123
  &nonce=n-0S6_WzA2Mj
  &prompt=select_account%20consent
  &login_hint=alice@exemple.com
  &ui_locales=fr-FR
  &code_challenge=...
  &code_challenge_method=S256
HTTP/1.1
Host: auth.example.com
```

L'utilisateur voit : **le sélecteur de comptes**, champ **pré-rempli** avec `alice@exemple.com`, page **en français**, puis l'écran de **consentement**.

---

## Pièges fréquents

> [!tip] En clair
> **Les 6 erreurs à retenir :**
> 1. **`prompt=none` sans plan B** → l'application est cassée dès qu'il faut se connecter.
> 2. **Croire que `prompt=none` est une protection** → ce n'est qu'un confort d'expérience.
> 3. **Oublier de vérifier `auth_time`** après un `max_age` → la garantie est purement déclarative.
> 4. **Mettre `prompt=login` partout** → tu casses le SSO et tu exaspères l'utilisateur.
> 5. **Confondre `auth_time` et `iat`** → en SSO, le jeton est neuf mais la connexion est ancienne.
> 6. **Utiliser `response_mode=fragment`** pour un jeton → c'est le retour du risque d'Implicit.

- **`prompt=none` sans gestion des erreurs** — le client reçoit `login_required` ou `interaction_required` et ne sait pas quoi en faire : le flux s'arrête au lieu de retomber sur l'interface. Réflexe : **toujours** prévoir la relance sans `prompt=none`.
- **`prompt=none` comme mécanisme de sécurité** — aucun contrôle cryptographique ne s'y attache. Réflexe : le traiter comme une **optimisation UX**, jamais comme une vérification.
- **`max_age` sans contrôle de `auth_time`** — l'OP est censé réauthentifier, mais le client ne vérifie rien : si l'OP est laxiste ou mal configuré, l'exigence tombe silencieusement. Réflexe : **toujours** comparer `auth_time` à son exigence côté client.
- **Confusion `auth_time` / `iat`** — en SSO silencieux, `iat` est récent alors que l'authentification peut dater de plusieurs heures. Réflexe : utiliser `auth_time` pour toute exigence de fraîcheur.
- **`prompt=login` systématique** — chaque connexion redemande le mot de passe : le SSO perd tout son intérêt, et l'utilisateur s'habitue à saisir ses identifiants (mauvais réflexe de sécurité). Réflexe : `prompt=login` (ou `max_age`) uniquement sur les **opérations sensibles**.
- **`login_hint` avec des données sensibles** — le paramètre voyage dans l'URL (historique, logs, `Referer`). Réflexe : jamais de secret ni de donnée personnelle inutile ; préférer le domaine quand c'est suffisant.
- **Valeurs de `prompt` inconnues non testées** — un OP peut ignorer ou rejeter une valeur : le comportement est propre à chaque implémentation. Réflexe : vérifier le comportement de l'OP utilisé et ne pas supposer une conformité uniforme.
- **`response_mode=fragment` avec un jeton** — le jeton se retrouve dans le fragment d'URL, exposé comme en Implicit. Réflexe : `query` pour le code, `form_post` si l'URL est un problème, jamais de jeton en `fragment`.
- **`ui_locales` pris pour une garantie** — l'OP peut l'ignorer ou ne supporter qu'une langue. Réflexe : vérifier les langues réellement supportées, ne pas bâtir une logique dessus.
- **Combinaison `prompt` non testée** — `prompt=login consent` peut produire un écran supplémentaire inattendu, ou une erreur selon l'OP. Réflexe : tester chaque combinaison sur l'OP cible.

---

## Rappel

> [!question] Question de rappel
> On vous demande d'implémenter un SSO « transparent » : l'utilisateur ne doit voir aucune page s'il est déjà connecté, et la page de connexion doit s'afficher sinon. Comment procédez-vous avec `prompt`, et pourquoi `prompt=none` seul ne suffit-il pas ?

> [!success]- Réponse
> On lance **une tentative silencieuse** avec `prompt=none` : si l'utilisateur possède une session valide, l'OP renvoie directement un `code` sans afficher d'interface. En l'absence de session, l'OP **ne montre pas** de page — il renvoie une **erreur** (`login_required`, `interaction_required`, `consent_required`…) dans l'URL de redirection. Le client doit donc **intercepter cette erreur et relancer** la même requête `/authorize` **sans** `prompt=none` : c'est **ce second appel** qui affiche la page de connexion. `prompt=none` seul ne suffit pas parce qu'il **interdit** toute interaction au lieu de la « rendre discrète » : sans le plan B, l'application échoue pour tout utilisateur non déjà connecté. Et ce mécanisme reste une **optimisation d'expérience**, pas une protection : aucune vérification de sécurité ne s'y attache.

### 🎯 Le résumé à retenir

> [!tip] Si tu ne retiens qu'une chose
> **Ces paramètres pilotent l'interface, pas la sécurité.**
>
> - **`prompt=none`** = « ne montre rien, sinon échoue » → **toujours** un plan B sans `prompt=none`.
> - **`prompt=login` / `max_age`** = « authentification fraîche » → et on **vérifie `auth_time`**.
> - **`login_hint`, `ui_locales`** = du confort, jamais des garanties.
>
> **Le seul qui porte une vraie garantie vérifiable : `max_age`, grâce à `auth_time`.**

---

## Voir aussi

- [[authorization_code_flow]] — la liste complète des paramètres de `/authorize`.
- [[step_up_auth]] — exiger un niveau d'authentification (MFA) et le vérifier.
- [[id_token]] — les claims `auth_time`, `acr`, `amr`, et leur validation.
- [[oauth2]] — le cadre et les paramètres fondateurs.
- [[openid_connect]] — la spécification qui définit ces paramètres.
- [[pkce]] — la vraie protection du flux (que ces paramètres ne remplacent pas).
- [[state_login_csrf]] — la protection de corrélation, indépendante de `prompt`.
- [[flows_comparison]] — pourquoi `response_mode=fragment` renvoie à Implicit.
- [[index]] — carte d'entrée du dossier.

## Références

- OpenID Connect Core 1.0 — §3.1.2.1 (`prompt`, `login_hint`, `max_age`, `ui_locales`), §3.1.2.6 (erreurs d'authentification : `login_required`, `interaction_required`, `consent_required`, `account_selection_required`, `session_selection_required`).
- RFC 6749 — *The OAuth 2.0 Authorization Framework*, §4.1.1 (paramètres de la requête d'autorisation) et §4.1.2.1 (réponses d'erreur).
- OAuth 2.0 Multiple Response Type Encoding Practices — `response_mode` (`query`, `fragment`, `form_post`).
- RFC 9700 — *Best Current Practice for OAuth 2.0 Security* — usage de `fragment`, dépréciation d'Implicit.
- OpenID Connect Session Management 1.0 — vérification de session et `prompt=none`.
