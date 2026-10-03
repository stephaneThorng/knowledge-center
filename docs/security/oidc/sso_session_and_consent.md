---
title: Session SSO et consentement
aliases: [Session SSO, Single Sign-On, cookie de session AS, sid, session stateful, consentement OIDC, Session SSO et consentement]
tags: [oidc, oauth2, session, sso, consentement, sid]
domaine: securite/oidc
niveau: intermediaire
statut: draft
cree: 2026-10-01
sources: [OpenID Connect Core 1.0, OpenID Connect Session Management 1.0, RFC 6749, RFC 9700]
---

# Session SSO et consentement

> [!abstract] Ancre
> La session de l'utilisateur chez l'OpenID Provider est **stateful** : un cookie ne porte qu'un identifiant (`sid`) qui pointe vers un état serveur. C'est elle qui produit le SSO, et c'est elle qui décide quand une réauthentification est nécessaire.

---

## 🧒 Avant de commencer : de quoi on parle

> [!tip] En clair
> Tu te connectes une fois sur Google. Ensuite, tu vas sur dix sites différents : **aucun ne te redemande ton mot de passe**. Pourquoi ?
>
> Parce que **Google se souvient de toi**. Il t'a donné un **bracelet de festival** : tu le portes, et à chaque nouvelle application, tu montres ton bracelet à Google, qui dit « c'est bon, je la connais ».
>
> Ce bracelet, c'est le **cookie de session** chez le fournisseur d'identité. Et le sujet de cette note, c'est **comment il fonctionne** — parce qu'il est plus subtil qu'il n'y paraît.

**Les mots à connaître pour cette note :**

| Mot technique | En clair |
|---|---|
| **session** | « Alice est connectée » — un état gardé **côté serveur** chez l'OP |
| **`sid`** | l'identifiant de cette session (ce que contient le cookie) |
| **stateful** | l'état est **stocké sur le serveur**, pas dans le cookie |
| **SSO** | *Single Sign-On* : une seule authentification pour plusieurs applications |
| **consentement** | « Alice a accepté que l'appli App1 voie son email » |
| **`acr` / `amr`** | le **niveau** d'authentification atteint (mot de passe ? MFA ? FIDO2 ?) — voir [[step_up_auth]] |

Voir aussi : [[prompts_and_interaction]] (`prompt`, `max_age`) et [[logout]].

---

## Définition

> [!tip] En clair
> Chez le fournisseur d'identité (Google, Keycloak…), après ton login, il crée une **fiche** : « Alice, connectée à 14h02, avec mot de passe + OTP, session n° X ».
>
> Il te donne un **cookie** qui contient juste le **numéro de la fiche** (`sid`). À chaque fois que tu retournes le voir, tu montres le numéro, il retrouve la fiche, et il sait que tu es déjà connecté.
>
> 🔧 **Le mot technique :** on dit que la session est **stateful** — l'état vit sur le serveur, le cookie ne porte qu'une référence.

La **session de l'OpenID Provider** est un état serveur associé à un utilisateur authentifié, référencé par un cookie déposé sur le domaine de l'OP (OpenID Connect Session Management 1.0). Le cookie contient un **`sid`** (session identifier) et non les données d'identité elles-mêmes. La session porte **qui** (le `sub`), **quand** (`auth_time`) et **comment** (`acr`, `amr`) l'utilisateur s'est authentifié — elle **ne porte pas** les scopes accordés.

Le **consentement** est un enregistrement distinct : la mémoire de ce que chaque client a été autorisé à obtenir, par l'utilisateur.

---

## Enjeux

> [!tip] En clair
> La session est **le cœur du SSO** : c'est elle qui évite de retaper son mot de passe partout. Mais c'est aussi un **point sensible** :
>
> - Si un attaquant vole le cookie, il **est** l'utilisateur.
> - Si la session ne se ferme pas proprement, l'accès survit (poste partagé).
> - Si le niveau d'authentification est mal compris, on croit exiger le MFA alors qu'on accepte un simple mot de passe.

- **SSO** : une authentification, N applications servies — sans nouvelle preuve d'identité.
- **Stateful par nature** : contrairement au [[jwt]] (auto-porteur, sans état), la session se **révoque instantanément** — c'est son grand avantage.
- **Cible de choix** : le cookie de session est le secret le plus précieux à voler (XSS, poste partagé, fixation de session).
- **Distinction identité/permissions** : la session ne contient **pas** les scopes — chaque jeton est filtré à la fabrication.
- **Le niveau est monotone** : il peut monter, jamais descendre (voir plus bas) — c'est ce qui rend le SSO sûr.

---

## Fonctionnement détaillé

### Le cookie ne contient qu'un identifiant

> [!tip] En clair
> Point crucial, souvent mal compris : **le cookie ne contient rien d'intéressant**.
>
> - Il ne contient **pas** ton nom, ton email, ton niveau d'authentification.
> - Il contient juste un **numéro** — comme un ticket de vestiaire.
>
> Tout le reste (qui, quand, comment) est **sur le serveur de l'OP**. Si le serveur supprime la fiche, le cookie devient un bout de papier sans valeur.

```json
// Ce que contient le cookie (simplifié)
{ "sid": "08a5019c-17e1-4977-8f42-65a12843ea02" }
```

```json
// Ce que contient la SESSION côté serveur — c'est ÇA qui compte
{
  "sid": "08a5019c-17e1-4977-8f42-65a12843ea02",
  "sub": "f3a9c1e2-88b4-4d77-9e01-5c2ab7d19f40",  // QUI
  "auth_time": 1759316000,                          // QUAND
  "acr": "urn:mace:incommon:iap:silver",            // COMMENT (niveau)
  "amr": ["pwd", "otp"],                            // les méthodes utilisées
  "expires_at": 1759319600,                         // fin de session
  "client_consents": {                              // le CONSENTEMENT, séparé
    "app1": ["openid", "email"],
    "app2": ["openid", "profile"]
  }
}
```

**Deux enseignements :**

1. **La session est stateful** — et c'est une force : l'OP peut la **tuer** à tout moment (logout, révocation, incident), et l'effet est **immédiat**. Un [[jwt]] ne peut pas être révoqué avant son `exp`.
2. **Les scopes ne sont pas dans l'identité.** Tu ne verras pas `"scope": "..."` dans l'état de session : les scopes vivent dans les **jetons**, pas dans la session.

### Le parcours SSO : ce qui se passe à la deuxième application

> [!tip] En clair
> **La question classique :** Alice se connecte à App1 avec le scope S1. Puis elle va sur App2, qui demande S2. Doit-elle se réauthentifier ?
>
> **Non.** L'OP la reconnaît grâce à **son** cookie de session. Elle ne verra qu'un éventuel écran de **consentement** pour S2 — jamais un écran de login.

1. Alice arrive sur **App2**, qui la redirige vers `/authorize?scope=openid S2`.
2. Le navigateur envoie le **cookie de session de l'OP** (même domaine : `auth.example.com`).
3. L'OP trouve la session valide → **pas de page de login**.
4. L'OP affiche (ou non) l'écran de **consentement** pour S2, selon ce qu'Alice a déjà accordé à App2.
5. L'OP émet un code → App2 l'échange → App2 reçoit **son propre** jeton, avec l'audience d'App2.

| Élément | Où il vit | À qui il appartient |
|---|---|---|
| Session OP (cookie) | navigatrice, domaine de l'OP | **l'OP** |
| Jeton S1 | chez App1 (serveur d'App1) | **App1** |
| Jeton S2 | chez App2 | **App2** |
| Session locale App1 | cookie sur `app1.example.com` | **App1** |

**Rien ne s'écrase.** Le jeton S1 ne vit pas chez App2, et App2 ne peut pas hériter de S1 : chaque jeton porte l'`aud` de l'application pour qui il a été émis ([[access_token]]).

### Le consentement est une mémoire séparée

> [!tip] En clair
> L'OP garde une **deuxième** information, bien distincte de la session : « Alice a accepté que **telle application** voie **tels scopes** ».
>
> C'est grâce à ça qu'il peut **sauter** l'écran de consentement la deuxième fois — ou le réafficher si l'app demande un scope **nouveau**.

- Le consentement est enregistré **par couple (utilisateur, client)**.
- Un scope **jamais consenti** pour ce client → l'écran s'affiche.
- Tout scope déjà consenti → l'écran peut être **sauté** (comportement variable selon l'implémentation).
- **`prompt=consent`** force la redemande ([[prompts_and_interaction]]).
- **Retirer** un consentement (révocation d'app) coupe l'accès futur de ce client — sans toucher aux autres.

### Le niveau d'authentification est monotone

> [!tip] En clair
> **La règle d'or :** le niveau d'authentification d'une session est un **plancher**, jamais un plafond. Il peut **monter**, jamais **descendre**.
>
> Si Alice s'est authentifiée avec mot de passe **+ OTP**, la session est au niveau « MFA » — et elle **y reste**. Une application qui demande un niveau **plus bas** n'obtient rien de plus, et **ne change rien** pour les autres applications.

Pourquoi c'est ainsi :

1. **C'est un fait historique, pas un réglage.** « Alice a fourni un OTP à 14h02 » est vrai. On ne « dé-vérifie » pas un fait.
2. **Descendre serait une faille.** Si une application pouvait **dégrader** une session, n'importe quelle appli malveillante pourrait dire « considère cette session comme non authentifiée » puis obtenir des jetons sans mot de passe.
3. **`prompt=login` ne dégrade rien.** Il demande une **nouvelle** authentification ; le niveau résultant est celui **réellement fourni**, jamais inférieur au niveau déjà atteint.

| Situation | La session descend ? | Réauthentification ? |
|---|---|---|
| L'app demande un niveau **égal** | non | **non** |
| L'app demande un niveau **supérieur** | non — la session **monte** | **oui** (pour atteindre ce niveau) |
| L'app demande un niveau **inférieur** | **non** | **non** |
| L'app envoie `prompt=login` | selon implémentation : nouvelle session ou nouvelle trace | **oui** (c'est le but) |
| Session expirée / révoquée | la session **disparaît** | **oui** |

> [!warning] Le comportement exact varie selon l'implémentation
> Selon le serveur (Keycloak, Auth0, Entra ID…), un `prompt=login` peut créer une **nouvelle session** (remplaçant l'ancienne) ou ajouter une **nouvelle entrée d'authentification** dans la session existante. Si une nouvelle session est créée avec un niveau inférieur, c'est **l'ancienne session qui disparaît** — ce n'est pas « le niveau qui baisse ». La nuance est importante : dans tous les cas, **le niveau n'est jamais rétrogradé**.

### « Attribuer des jetons à volonté » : oui, mais filtré

> [!tip] En clair
> Une session valide permet effectivement d'obtenir des jetons auprès de **plusieurs** applications sans retaper son mot de passe. C'est le but du SSO.
>
> Mais « à volonté » ne veut pas dire « n'importe quoi » : le SSO évite la **répétition de la preuve d'identité**, il ne donne pas un blanc-seing sur les **données**.

| Garde-fou | Ce qu'il empêche |
|---|---|
| **Consentement par application** | obtenir un scope jamais accepté pour ce client |
| **Audience (`aud`)** | réutiliser le jeton d'App1 auprès d'App2 |
| **Scope demandé** | hériter des droits d'une autre application |
| **Durée de session (`expires_at`)** | prolonger indéfiniment le SSO |
| **Révocation du `sid`** | obtenir de nouveaux jetons après un logout |

### Vérification de session : comment un client sait-il que la session est morte ?

> [!tip] En clair
> **Le problème :** App2 a créé sa **propre** session locale. Si Alice se déconnecte chez l'OP, App2 n'en sait **rien** — elle continue de la croire connectée.
>
> Pour combler ce trou, OIDC fournit une **vérification de session** : App2 peut demander à l'OP, en arrière-plan, si la session est toujours vivante — sans que l'utilisateur voie quoi que ce soit.

- **`check_session_iframe`** (OpenID Connect Session Management 1.0) : App2 charge une iframe de l'OP et l'interroge par `postMessage` pour connaître l'état de la session (modifiée ou non).
- **`prompt=none`** : technique plus simple — une tentative silencieuse ; si l'OP répond `login_required`, la session a disparu ([[prompts_and_interaction]]).
- **Limite moderne** : les iframes tierces sont de plus en plus bloquées (cookies tiers). Ces mécanismes sont donc **fragiles** — d'où la montée en puissance du logout **back-channel** ([[logout]]).

---

## Exemple concret

> [!tip] En clair
> **Trois applications, une seule authentification.** Suis bien quand l'écran de login apparaît — et surtout quand il **n'apparaît pas**.

**Alice se connecte à App1 (scope S1) — première fois :**

```
1. App1 → /authorize?...&scope=openid email
2. OP : pas de session → AFFICHE LE LOGIN
3. Alice : mot de passe + OTP
4. OP : crée la session sid=08a5019c… (sub=alice, acr=silver, amr=[pwd, otp])
   et enregistre le consentement : app1 → [openid, email]
5. OP → code → App1 → App1 reçoit un jeton S1
```

**Alice va sur App2 (scope S2) — deuxième fois :**

```
6. App2 → /authorize?...&scope=openid profile
7. Navigateur envoie le cookie sid=08a5019c…
8. OP : session VALIDE → PAS DE LOGIN
9. OP : app2 n'a pas encore de consentement → écran de consentement pour profile
10. Alice accepte → OP enregistre : app2 → [openid, profile]
11. OP → code → App2 → App2 reçoit SON jeton S2 (aud=app2)
```

**Alice va sur App3 (scope S1, déjà consenti ailleurs) — troisième fois :**

```
12. App3 → /authorize?...&scope=openid email
13. OP : session valide → PAS DE LOGIN
14. OP : app3 n'a JAMAIS consenti → écran de consentement
    ⚠️ Le consentement d'App1 ne vaut PAS pour App3 !
15. Alice accepte → App3 reçoit son propre jeton
```

**Alice revient sur App1 :**

```
16. App1 → /authorize?...&scope=openid email
17. OP : session valide + consentement app1 déjà enregistré
    → NI login, NI consentement : SILENCIEUX
18. Code → App1
```

**Ce qu'Alice a vécu :** un seul login (étape 3), et deux écrans de consentement (étapes 9 et 14). Jamais de second mot de passe.

---

## Pièges fréquents

> [!tip] En clair
> **Les 5 erreurs à retenir :**
> 1. **Croire que le cookie contient les données** → il ne contient qu'un identifiant.
> 2. **Croire que le scope est dans la session** → il est dans les **jetons**.
> 3. **Croire qu'un consentement vaut pour toutes les apps** → il vaut pour **un couple (utilisateur, client)**.
> 4. **Croire que le niveau peut baisser** → il est **monotone**.
> 5. **Croire que la session d'App2 meurt quand l'OP se déconnecte** → non, il faut le [[logout|logout propagé]].

- **Cookie de session contenant des données d'identité** — au lieu d'un simple `sid`, on y met le `sub`, l'email, le niveau : toute donnée devient modifiable et fuit avec le cookie. Réflexe : **`sid` uniquement**, l'état côté serveur.
- **Session sans expiration absolue** — une session qui ne meurt jamais rend le SSO éternel. Réflexe : `expires_at` **et** inactivité maximale, plus un `max_age` côté client ([[prompts_and_interaction]]).
- **Cookie sans `HttpOnly` / `Secure` / `SameSite`** — vol par XSS ou CSRF. Réflexe : les trois attributs systématiquement.
- **Confondre session et consentement** — croire que « connecté » implique « autorisé ». Réflexe : ce sont **deux** enregistrements distincts ; l'utilisateur peut révoquer un consentement sans se déconnecter.
- **Croire que le consentement d'App1 couvre App2** — chaque couple (utilisateur, client) a son propre enregistrement. Réflexe : ne jamais réutiliser un consentement inter-applications.
- **Niveau d'authentification supposé « rétrogradable »** — concevoir une logique qui dépend d'une baisse de niveau. Réflexe : traiter le niveau comme **monotone** ; pour exiger plus, demander une **élévation** via `acr_values` ([[step_up_auth]]).
- **Session du client non invalidée après logout OP** — la session locale d'App2 survit. Réflexe : implémenter la propagation de déconnexion ([[logout]]).
- **Vérification de session par iframe tierce** — dépend de cookies tiers, souvent bloqués : la vérification échoue **silencieusement**. Réflexe : prévoir le back-channel, ne pas se reposer uniquement sur l'iframe.
- **Négliger l'expiration pendant l'inactivité** — session longue = risque accru sur poste partagé. Réflexe : TTL d'inactivité court, réauthentification pour les actions sensibles.
- **Session partagée entre applications de même domaine** — un cookie en `.example.com` est commun à `app1.example.com` et `app2.example.com` : détruire l'un détruit l'autre. Réflexe : conscience explicite de ce partage, sinon sessions indépendantes.

---

## Rappel

> [!question] Question de rappel
> Alice se connecte à App1 (scope S1), puis va sur App2 qui demande S2. Doit-elle se réauthentifier ? Que contient exactement la session de l'OP, et que contient le cookie ?

> [!success]- Réponse
> **Non** : l'OP la reconnaît grâce à **son propre cookie de session** (déposé sur le domaine de l'OP), qui reste valide. Elle ne verra qu'un éventuel écran de **consentement** pour S2, si App2 n'a pas déjà reçu son accord — jamais un écran de login. Le **cookie** ne contient qu'un identifiant de session (`sid`) : pas de nom, pas d'email, pas de niveau. La **session côté serveur** contient `sub` (qui), `auth_time` (quand), `acr`/`amr` (comment), l'expiration, et la mémoire des **consentements par client** — mais **pas les scopes** : ceux-ci vivent dans les jetons, fabriqués séparément pour App1 (`aud=app1`, S1) et App2 (`aud=app2`, S2). Enfin, le **niveau d'authentification est monotone** : l'arrivée d'App2 ne peut que laisser le niveau inchangé ou l'élever, jamais le réduire.

### 🎯 Le résumé à retenir

> [!tip] Si tu ne retiens qu'une chose
> **Le cookie ne contient qu'un numéro. Tout le reste est côté serveur.**
>
> - **Session valide** = pas de nouvelle authentification → c'est le **SSO**.
> - **Scopes ≠ session** : ils vivent dans les jetons, chacun avec son audience.
> - **Niveau monotone** : il monte, il ne descend **jamais**.
> - **Consentement** = une mémoire **par application**, séparée de la session.
>
> **Et le trou à combler :** la session locale d'une application ne meurt pas quand l'OP se déconnecte — voir [[logout]].

---

## Voir aussi

- [[logout]] — la fin de vie de la session, et sa propagation aux applications.
- [[prompts_and_interaction]] — `prompt`, `max_age` : quand redemander une authentification.
- [[step_up_auth]] — exiger un niveau (MFA) et le vérifier.
- [[id_token]] — les claims `auth_time`, `acr`, `amr`, `sid` que la session alimente.
- [[authorization_code_flow]] — le flow qui crée la session applicative.
- [[access_token]] — pourquoi les jetons ne s'écrasent pas entre applications (`aud`).
- [[scopes_and_claims]] — ce que le consentement autorise exactement.
- [[openid_connect]] — la couche qui définit session et consentement.
- [[index]] — carte d'entrée du dossier.

## Références

- OpenID Connect Session Management 1.0 — session de l'OP, `check_session_iframe`, `session_state`.
- OpenID Connect Core 1.0 — §2 (`sub`, `auth_time`), §3.1.2.1 (`prompt`, `max_age`, `acr_values`), §11 (consentement, `offline_access`).
- OpenID Connect Front-Channel Logout 1.0 et Back-Channel Logout 1.0 — propagation de la déconnexion.
- RFC 6749 — *The OAuth 2.0 Authorization Framework*, §4.1 (flux et session).
- RFC 9700 — *Best Current Practice for OAuth 2.0 Security* — durée de vie, invalidation.
