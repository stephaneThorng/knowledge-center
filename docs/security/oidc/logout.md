---
title: Déconnexion OIDC
aliases: [Logout OIDC, Déconnexion, RP-Initiated Logout, Front-Channel Logout, Back-Channel Logout, end_session, id_token_hint, Déconnexion OIDC]
tags: [oidc, oauth2, logout, session, securite, sid]
domaine: securite/oidc
niveau: intermediaire
statut: draft
cree: 2026-10-01
sources: [OpenID Connect RP-Initiated Logout 1.0, OpenID Connect Front-Channel Logout 1.0, OpenID Connect Back-Channel Logout 1.0, OpenID Connect Session Management 1.0, RFC 7009]
---

# Déconnexion OIDC

> [!abstract] Ancre
> Une déconnexion locale n'éteint que l'application concernée : l'OpenID Provider doit **propager** l'événement, par le front-channel ou — de façon fiable — par le back-channel, pour que les autres applications ferment leur session.

---

## 🧒 Avant de commencer : de quoi on parle

> [!tip] En clair
> Tu te déconnectes sur un site, et tu penses être déconnecté **partout**. En réalité :
>
> - Le site en question t'a oublié. ✅
> - Mais **les autres sites n'en savent rien** — ils te croient encore connecté. ⚠️
>
> C'est **exactement** le problème que cette note résout. Et c'est un vrai enjeu de sécurité : sur un ordinateur partagé (cybercafé, hôpital, salle de classe), si tu crois t'être déconnecté mais qu'une autre application te garde ouverte, la personne suivante entre dans ton compte.

**Les mots à connaître pour cette note :**

| Mot technique | En clair |
|---|---|
| **logout local** | déconnection **de l'application seule** |
| **logout OP** | déconnexion **chez le fournisseur d'identité** (Google, Keycloak…) |
| **propagation** | prévenir **les autres applications** qu'il faut fermer |
| **front-channel** | propager **via le navigateur** (iframe) |
| **back-channel** | propager **serveur à serveur** (la méthode fiable) |
| **`id_token_hint`** | « voici mon jeton d'identité, tu sais donc qui je suis » |

Voir aussi : [[sso_session_and_consent]] (ce qui est détruit) et [[openid_connect]].

---

## Définition

> [!tip] En clair
> « Se déconnecter » recouvre **trois opérations différentes**, qu'il faut absolument distinguer :
>
> 1. **Oublier l'utilisateur dans l'application** (supprimer son cookie local).
> 2. **Détruire la session chez le fournisseur d'identité** (supprimer le `sid`).
> 3. **Prévenir les autres applications** qu'elles doivent fermer leur session.
>
> La plupart des bugs de sécurité viennent du fait qu'on ne fait que la n°1 en croyant avoir fait les trois.

La **déconnexion OIDC** couvre la fin de vie de la session, répartie sur plusieurs spécifications :

| Spécification | Ce qu'elle normalise |
|---|---|
| **RP-Initiated Logout 1.0** | l'application demande à l'OP de fermer la session (`end_session_endpoint`) |
| **Front-Channel Logout 1.0** | l'OP prévient les applications **via le navigateur** (iframes) |
| **Back-Channel Logout 1.0** | l'OP prévient les applications **serveur à serveur** (`logout_token`) |
| **Session Management 1.0** | l'application **détecte** la fin de session (`check_session_iframe`) |

---

## Enjeux

> [!tip] En clair
> **Pourquoi la déconnexion est-elle un sujet à part entière ?** Parce que le SSO crée un **effet de concentration** : une seule session ouvre plusieurs applications. Si la fermeture est incomplète, l'accès survit **là où on ne l'attend pas**.
>
> Le cas type : tu te déconnectes d'App1, tu pars, et App2 est toujours ouverte derrière toi.

- **Poste partagé** : le scénario le plus critique. Un logout incomplet laisse un compte accessible au suivant.
- **Le cookie appartient à l'OP** : une application ne **peut pas** supprimer la session de l'OP — elle ne peut que le **demander**.
- **Chaque application a sa propre session** : il n'y a pas de mécanisme « automatique » — il faut **propager**.
- **Fenêtre de faille** : sans propagation, l'application ne s'aperçoit de rien avant son prochain renouvellement de jeton ou sa prochaine vérification de session.
- **Cookies tiers** : les mécanismes reposant sur des iframes sont de plus en plus bloqués par les navigateurs → le back-channel devient la solution robuste.

---

## Fonctionnement détaillé

### Le logout local : ce que l'application peut vraiment faire

> [!tip] En clair
> **Le point qui surprend :** une application **ne peut pas** supprimer la session de Google. Le cookie de session appartient au domaine de Google. Une application sur `app1.example.com` n'a **aucun accès** aux cookies de `auth.example.com`.
>
> Elle peut donc seulement :
> 1. **Supprimer sa propre session** (« je t'ai oublié »), et
> 2. **Demander** à l'OP de faire le reste.

C'est la règle de **même-origine** du navigateur : un site ne peut ni lire ni modifier les cookies d'un autre domaine. Le logout local est donc toujours **partiel** par construction.

> [!warning] Ne pas confondre avec le cookie partagé de même domaine
> Si App1 et App2 partagent le **même domaine parent** (`app1.example.com` et `app2.example.com` avec un cookie en `.example.com`), alors elles partagent **le même cookie** : détruire l'un détruit l'autre. Ce n'est **pas** de la propagation OIDC — c'est un cookie commun. La confusion entre les deux est une source classique de bugs.

### Le logout initié par l'application (`end_session_endpoint`)

> [!tip] En clair
> L'application redirige le navigateur vers une **adresse de déconnexion** de l'OP. C'est **le navigateur** qui y va, donc c'est **lui** qui présente le cookie de session de l'OP.
>
> C'est indispensable : sans ce détour par le navigateur, l'OP ne verrait pas le cookie et ne pourrait pas identifier la session à tuer.

```http
GET /end_session_endpoint
  ?id_token_hint=eyJhbGciOiJSUzI1NiIs...
  &post_logout_redirect_uri=https%3A%2F%2Fapp1.example.com%2Fbye
  &state=af0ifjsldkj
  &client_id=app1
HTTP/1.1
Host: auth.example.com
```

| Paramètre | Rôle | En clair |
|---|---|---|
| `id_token_hint` | le jeton d'identité obtenu à la connexion | « voici qui je suis, tu sais donc quelle session fermer » |
| `post_logout_redirect_uri` | où revenir après | doit être **pré-enregistrée** chez l'OP |
| `state` | corrélation | anti-CSRF sur le retour de déconnexion |
| `client_id` | identification du client | nécessaire si `id_token_hint` est absent |

**`id_token_hint` est essentiel** : il prouve à l'OP **quelle** session fermer, et **qui** demande. Sans lui (ou sans `client_id`), l'OP peut refuser ou demander une confirmation interactive à l'utilisateur.

L'OP peut aussi accepter une demande de déconnexion **sans** session à fermer (déjà déconnecté) : il faut alors décider d'un comportement — erreur, ou retour silencieux vers `post_logout_redirect_uri`.

### Propagation par le front-channel

> [!tip] En clair
> **Le principe :** pendant que l'OP affiche sa page de déconnexion, il fait charger, **dans le navigateur de l'utilisateur**, une petite `iframe` vers **chaque application** :

```html
<!-- page de logout de l'OP -->
<iframe src="https://app2.example.com/logout"></iframe>
<iframe src="https://app3.example.com/logout"></iframe>
```

Le navigateur visite ces URL en **emportant les cookies** d'App2 et App3 → chaque application détruit sa session locale.

| | |
|---|---|
| **Avantages** | fonctionne sans pré-enregistrement complexe ; l'utilisateur n'a rien à faire |
| **Faiblesses** | **cookies tiers bloqués** (Safari ITP, Chrome) → peut échouer **silencieusement** ; dépend du navigateur et de la page restant ouverte ; ordre de chargement non garanti |

> [!warning] La faiblesse moderne du front-channel
> Depuis le durcissement des navigateurs contre les cookies tiers, une iframe pointant vers un domaine différent peut **ne pas recevoir le cookie** de session de cette application. Le logout échoue alors **sans erreur visible**. C'est la raison principale pour laquelle le **back-channel** est préféré.

### Propagation par le back-channel (la méthode fiable)

> [!tip] En clair
> **Le principe :** l'OP appelle **directement**, en serveur à serveur, l'adresse de déconnexion de chaque application. **Aucun navigateur**, donc aucun problème de cookie tiers.

```http
POST /backchannel_logout HTTP/1.1
Host: app2.example.com
Content-Type: application/x-www-form-urlencoded

logout_token=eyJhbGciOiJSUzI1NiIsInR5cCI6... 
```

Le `logout_token` est un **JWT signé par l'OP** qui contient l'identifiant de la session à fermer :

```json
{
  "iss": "https://auth.example.com",
  "aud": "app2",
  "sub": "f3a9c1e2-88b4-...",
  "sid": "08a5019c-17e1-4977-8f42-65a12843ea02",
  "events": { "http://schemas.openid.net/event/backchannel-logout": {} },
  "jti": "b8f1c2...",
  "iat": 1759317000
}
```

App2 doit : **vérifier la signature** ([[discovery_and_jwks]]), vérifier `iss`, `aud`, la présence de l'événement `backchannel-logout`, et qu'il contient **soit `sid`, soit `sub`**. Puis fermer la session correspondante et répondre `200`.

| | |
|---|---|
| **Avantages** | **fiable** (pas de navigateur, pas de cookie tiers), quasi instantané, vérifiable cryptographiquement |
| **Faiblesses** | l'application doit être **enregistrée** avec son URL de back-channel et être **joignable** ; chaque appel est une requête serveur |

**`sid` ou `sub` ?** Si le jeton porte un `sid` ([[sso_session_and_consent]]), l'application ferme **cette session précise** — c'est le cas idéal. Si seul le `sub` est présent, elle doit fermer **toutes** les sessions de cet utilisateur : plus brutal, moins précis.

### `sid` : le chaînon manquant

> [!tip] En clair
> Comment l'application sait-elle **quelle** session fermer ? Grâce au claim **`sid`**, présent dans l'[[id_token]] et dans le `logout_token`.
>
> Sans `sid`, l'application ne peut que deviner (« ferme tout pour cet utilisateur »). Avec `sid`, elle ferme **exactement** la session concernée — ce qui permet à l'utilisateur de rester connecté ailleurs sur d'autres appareils.

Le claim `sid` (OpenID Connect Front-Channel / Back-Channel Logout) relie l'ID Token à la session de l'OP. Sa présence est **fortement recommandée** : c'est ce qui autorise une déconnexion **précise** plutôt qu'un massacre de toutes les sessions.

### Détection : quand l'application n'est pas prévenue

> [!tip] En clair
> Si aucune propagation n'est implémentée, une application ne « sait » la déconnexion qu'**indirectement**, au moment où elle retente quelque chose :
>
> - son **refresh token** échoue (`invalid_grant`) ;
> - son **`prompt=none`** renvoie `login_required`.

C'est la **fenêtre de faille** : entre le logout chez l'OP et cette tentative, l'application croit l'utilisateur connecté. D'où l'importance d'implémenter **activement** la propagation.

| Mécanisme | Réactivité | Fiabilité |
|---|---|---|
| Rien (attendre le prochain refresh) | **lente** (minutes-heures) | — |
| `prompt=none` à la volée | moyenne | dépend du timing |
| `check_session_iframe` | rapide | **fragile** (cookies tiers) |
| **Back-channel** | **quasi immédiate** | ⭐ **haute** |

### Révoquer les jetons : complément indispensable

> [!tip] En clair
> Fermer la session ne suffit pas à rendre les **jetons déjà émis** inutilisables. Un [[access_token]] encore valide reste utilisable jusqu'à son `exp`.
>
> D'où l'importance de la **rotation** et de la **révocation** : on coupe aussi le refresh token, sinon l'application peut se refaire des jetons.

- **RFC 7009** (`POST /revoke`) : invalider explicitement un access ou refresh token.
- **Refresh token rotatif** : son vol devient détectable ([[refresh_token]]).
- **Durées courtes** : un access token de 5 à 15 minutes limite la fenêtre résiduelle.
- Un logout **correct** invalide : la session OP, les sessions applicatives, **et** les refresh tokens.

---

## Exemple concret

> [!tip] En clair
> **Deux scénarios côte à côte** : la version qui laisse une faille, et la version propre.

### ❌ La version qui ne propage pas

```
1. Alice se connecte sur App1 (poste partagé) → session OP créée
2. Alice se connecte sur App2 → SSO, session locale App2 créée
3. Alice clique « Se déconnecter » sur App1
4. App1 détruit SA session locale + redirige vers l'OP
5. L'OP détruit sa session et efface son cookie
6. ✅ App1 : déconnectée
7. ⚠️ App2 : TOUJOURS CONNECTÉE — sa session locale n'a pas bougé
8. Alice part, rassurée
9. La personne suivante ouvre App2 → elle est DANS LE COMPTE D'ALICE
```

### ✅ La version avec back-channel

```
1-4. Identiques : Alice se déconnecte sur App1 → l'OP est prévenu
5. L'OP détruit sa session
6. L'OP émet un logout_token (sid=08a5019c…) pour CHAQUE client enregistré

   POST https://app1.example.com/backchannel_logout
   POST https://app2.example.com/backchannel_logout
   POST https://app3.example.com/backchannel_logout

7. Chaque application vérifie la signature, retrouve le sid,
   et détruit SA session locale
8. ✅ App1, App2, App3 : toutes déconnectées
9. L'OP redirige le navigateur vers post_logout_redirect_uri
```

**Résultat :** Alice est **réellement** déconnectée partout, en quelques dizaines de millisecondes.

### Requête de déconnexion complète (côté application)

```http
GET /end_session_endpoint
  ?id_token_hint=eyJhbGciOiJSUzI1NiIsImtpZCI6IjIwMjYtMDktMDEifQ...
  &post_logout_redirect_uri=https%3A%2F%2Fapp1.example.com%2Fdeconnexion-terminee
  &state=af0ifjsldkj
HTTP/1.1
Host: auth.example.com
```

Et côté OP, ce qui doit être fait pour que ce soit **correct** :

```
1. Vérifier que post_logout_redirect_uri est bien pré-enregistrée pour ce client
2. Identifier la session via id_token_hint (→ sid)
3. Détruire la session de l'OP
4. Supprimer le cookie de session de l'OP
5. Propager aux clients enregistrés (back-channel en priorité, front-channel en complément)
6. Révoquer les refresh tokens associés
7. Rediriger vers post_logout_redirect_uri avec state
```

Manquer l'étape **5** est l'erreur la plus répandue — et c'est celle qui crée la faille sur poste partagé.

---

## Pièges fréquents

> [!tip] En clair
> **Les 5 erreurs à retenir :**
> 1. **Croire qu'un logout local déconnecte partout** → c'est faux, il faut propager.
> 2. **Croire qu'une application peut supprimer la session de l'OP** → elle ne peut que le **demander** (cookie d'un autre domaine).
> 3. **Se reposer sur le front-channel seul** → les cookies tiers sont bloqués, ça échoue **silencieusement**.
> 4. **Oublier de révoquer les refresh tokens** → l'application peut se refabriquer des jetons.
> 5. **Ne pas utiliser `sid`** → impossible de fermer une session **précise**, on est obligé de tout fermer.

- **Logout local présenté comme un logout complet** — l'utilisateur croit être déconnecté partout, alors que les autres applications restent ouvertes. Réflexe : **toujours** appeler `end_session_endpoint` de l'OP, et implémenter la propagation.
- **Session locale d'application non fermée** — l'application reçoit l'information mais l'ignore, ou ne l'implémente pas. Réflexe : implémenter le endpoint `backchannel_logout`, vérifier le `logout_token`, fermer la session.
- **Front-channel sans back-channel** — dépendance aux cookies tiers : échec silencieux sur Safari/Chrome modernes. Réflexe : **back-channel prioritaire**, front-channel en complément.
- **`post_logout_redirect_uri` en wildcard ou non validée** — redirection ouverte, phishing post-déconnexion. Réflexe : correspondance **exacte** avec une URI pré-enregistrée.
- **`logout_token` non vérifié** — n'importe qui peut forger une déconnexion (déni de service), ou l'inverse : un faux OP peut fermer des sessions. Réflexe : vérifier la **signature** via JWKS, `iss`, `aud`, l'événement `backchannel-logout`, et la présence de `sid` **ou** `sub`.
- **Pas de contrôle de rejeu du `logout_token`** — un `logout_token` rejoué peut provoquer des déconnexions répétées. Réflexe : vérifier `jti` et `iat` (fenêtre courte), ne pas accepter deux fois le même jeton.
- **Refresh tokens non révoqués** — l'application se refait des access tokens après la déconnexion. Réflexe : révoquer côté AS (RFC 7009) et s'appuyer sur la rotation.
- **Absence de `sid` dans l'ID Token** — la propagation ne peut viser qu'un utilisateur entier, pas une session. Réflexe : émettre le `sid` et l'utiliser.
- **Pas de gestion du cas « déjà déconnecté »** — la demande de logout échoue, ou affiche une erreur à l'utilisateur. Réflexe : définir explicitement le comportement (retour silencieux vers `post_logout_redirect_uri`).
- **Confondre cookie partagé de même domaine et propagation** — des applications sous `.example.com` partagent un cookie : elles s'effacent mutuellement, ce qui masque le vrai besoin de propagation. Réflexe : distinguer les deux mécanismes.
- **Déconnexion sans CSRF** — un tiers peut forcer la déconnexion de l'utilisateur (déni de service léger) ou provoquer un enchaînement de redirections. Réflexe : `state` sur le retour de déconnexion ([[state_login_csrf]]).

---

## Rappel

> [!question] Question de rappel
> Alice se déconnecte sur App1 d'un ordinateur partagé. Pourquoi App2 reste-t-elle accessible, et comment corrige-t-on cela ?

> [!success]- Réponse
> Parce qu'**App1 ne peut détruire que sa propre session** : le cookie de session de l'OP appartient au domaine de l'OP, et la règle de même-origine interdit à App1 d'y toucher. App1 redirige le navigateur vers le `end_session_endpoint`, ce qui détruit la session **de l'OP** — mais **aucune autre application n'est prévenue**. App2 conserve donc sa session locale et continue de croire Alice connectée. Elle ne s'en apercevra qu'à son prochain **refresh de jeton** (`invalid_grant`) ou **`prompt=none`** (`login_required`) : c'est la **fenêtre de faille**, dangereuse sur un poste partagé. La correction est la **propagation de la déconnexion** : l'OP notifie chaque client enregistré, de préférence par **back-channel** (`logout_token` signé contenant le `sid`), éventuellement complété par le front-channel. Chaque application vérifie la signature, retrouve la session par son `sid` et la détruit. Il faut **aussi** révoquer les refresh tokens, sinon l'application peut se refabriquer des jetons.

### 🎯 Le résumé à retenir

> [!tip] Si tu ne retiens qu'une chose
> **Un logout local ne déconnecte que localement.** Pour déconnecter partout, il faut **propager**.
>
> - L'application **demande** (`end_session_endpoint` + `id_token_hint`), elle ne peut pas **imposer**.
> - **Back-channel** = fiable (serveur à serveur, `logout_token` signé, `sid`).
> - **Front-channel** = fragile (iframe, cookies tiers bloqués).
> - **Révoquer les refresh tokens**, sinon des jetons sont refabriqués.
>
> **Le scénario à garder en tête :** poste partagé + logout incomplet = compte ouvert pour la personne suivante.

---

## Voir aussi

- [[sso_session_and_consent]] — ce que la déconnexion détruit, et pourquoi le `sid` existe.
- [[openid_connect]] — la spécification qui définit le logout en quatre documents.
- [[id_token]] — le `sid` et le `sub` utilisés dans la propagation.
- [[refresh_token]] — révocation et rotation, indispensables après une déconnexion.
- [[discovery_and_jwks]] — la vérification de signature du `logout_token`.
- [[prompts_and_interaction]] — `prompt=none` comme détection de session morte.
- [[access_token]] — pourquoi un jeton reste valide jusqu'à son `exp`.
- [[index]] — carte d'entrée du dossier.

## Références

- OpenID Connect RP-Initiated Logout 1.0 — `end_session_endpoint`, `id_token_hint`, `post_logout_redirect_uri`, `state`.
- OpenID Connect Front-Channel Logout 1.0 — iframes de déconnexion, `sid`.
- OpenID Connect Back-Channel Logout 1.0 — `logout_token`, `events`, vérification obligatoire.
- OpenID Connect Session Management 1.0 — `check_session_iframe`, `session_state`, détection de fin de session.
- OpenID Connect Core 1.0 — §2 (`sid`), §3.1.3.7 (validation).
- RFC 7009 — *OAuth 2.0 Token Revocation*.
- RFC 9700 — *Best Current Practice for OAuth 2.0 Security*.
