---
title: Sécurité OIDC et OAuth 2.1
aliases: [Sécurité OAuth, OAuth 2.1, RFC 9700, BCP 240, bonnes pratiques OAuth, Security BCP, Sécurité OIDC et OAuth 2.1]
tags: [oidc, oauth2, securite, rfc9700, oauth21, bonnes-pratiques]
domaine: securite/oidc
niveau: intermediaire
statut: draft
cree: 2026-10-01
sources: [RFC 9700, RFC 6819, RFC 8725, RFC 7636, OAuth 2.1 draft, OpenID Connect Core 1.0]
---

# Sécurité OIDC et OAuth 2.1

> [!abstract] Ancre
> OAuth 2.1 n'est pas un nouveau protocole : c'est OAuth 2.0 plus les bonnes pratiques accumulées (RFC 9700). Il supprime deux flows et impose PKCE, une redirection exacte et une validation stricte des jetons.

---

## 🧒 Avant de commencer : de quoi on parle

> [!tip] En clair
> Pendant des années, on a découvert des failles dans OAuth — non pas dans l'idée, mais dans **la façon dont on l'utilisait**. Chaque faille a donné une **règle**.
>
> Cette note est le **résumé de ces règles** : tout ce qu'on a appris à ne plus faire, et tout ce qu'on est maintenant **obligé** de faire.
>
> Et « **OAuth 2.1** », c'est simplement le nom qu'on donnera à « OAuth 2.0 **avec toutes ces règles appliquées** ». Pas un nouveau protocole : une mise à jour.

**Les mots à connaître pour cette note :**

| Mot technique | En clair |
|---|---|
| **RFC 9700 / BCP 240** | le document officiel des bonnes pratiques (2025) |
| **OAuth 2.1** | « OAuth 2.0 + les bonnes pratiques », en cours de finalisation |
| **déprécié** | officiellement déconseillé, à remplacer |
| **interdit** | on ne doit plus du tout l'utiliser |
| **défense en profondeur** | empiler plusieurs protections, pour qu'une seule faille ne suffise pas |

---

## Définition

> [!tip] En clair
> **OAuth 2.1** rassemble en un seul document ce qui était éparpillé dans des dizaines de correctifs et de « bonnes pratiques ». Retiens juste ça : **il n'invente rien, il nettoie**.
>
> Et le document de référence derrière tout ça s'appelle la **RFC 9700** (aussi nommée *BCP 240*).

**OAuth 2.1** (draft IETF) consolide [[oauth2]] et les bonnes pratiques de sécurité (RFC 9700 / BCP 240) en une spécification unique. La **RFC 9700** — *Best Current Practice for OAuth 2.0 Security* (janvier 2025) — est le document normatif de référence : elle **déprécie** deux flows, **impose** [[pkce]] aux clients publics et **durcit** la validation.

Le **RFC 6819** (*OAuth 2.0 Threat Model*) reste la taxonomie historique des menaces : utile pour comprendre **d'où viennent** ces règles.

---

## Enjeux

> [!tip] En clair
> OAuth 2.0 laissait beaucoup de choix ouverts. Or **un choix ouvert est une occasion d'erreur** — et une erreur sur un mécanisme d'authentification, c'est une faille chez des millions d'utilisateurs.
>
> La RFC 9700 ferme ces choix : elle dit ce qui est **obligatoire**, ce qui est **déconseillé**, et ce qui est **interdit**.

- **Réduire la surface de choix** : moins d'options, moins de configurations dangereuses.
- **Supprimer les flows dangereux** : ce qui fait transiter un jeton par le navigateur disparaît.
- **Uniformiser les vérifications** : une liste de contrôles à faire, pas des variantes par implémentation.
- **Rendre les erreurs visibles** : rotation, détection de réutilisation, épinglage de l'émetteur font remonter les attaques au lieu de les laisser silencieuses.
- **Défense en profondeur** : les protections se cumulent ([[pkce]] **et** `state` **et** redirection exacte), aucune ne remplace les autres.

---

## Fonctionnement détaillé

### Ce qui est supprimé

> [!tip] En clair
> Deux flows sont **retirés** du protocole. Si tu les croises, c'est un signe de code ancien.

| Flow | Statut | Pourquoi | Remplacement |
|---|---|---|---|
| **Implicit** | **déprécié** (RFC 9700 §2.1.2) | le jeton voyageait dans l'URL (historique, `Referer`, JS) | Authorization Code + [[pkce]] |
| **Password** | **interdit** (RFC 9700 §2.4) | le client voyait le mot de passe de l'utilisateur | Authorization Code + [[pkce]], ou migration |

Dans Implicit, l'`access_token` arrivait dans le **fragment** de l'URL de redirection, donc exposé à l'historique, à `Referer` et au JavaScript de la page. Dans Password, le client collectait lui-même les identifiants : consentement contourné, scopes non contrôlés, séparation des rôles cassée. Les deux sont inconciliables avec le modèle de sécurité : ils partent.

Voir [[flows_comparison]] pour la liste complète.

### Ce qui devient obligatoire

> [!tip] En clair
> Voilà les **règles non négociables** aujourd'hui. Si une seule manque, l'implémentation est à corriger.

| Règle | Source | En clair |
|---|---|---|
| **PKCE obligatoire** pour les clients publics | RFC 9700 §2.1 | une SPA ou une appli mobile **doit** utiliser PKCE |
| **`S256`** seule méthode acceptée | RFC 9700 §2.1 | `plain` doit être **refusé** |
| Authorization Code par défaut | RFC 9700 §2.1.1 | le code flow est le choix normal |
| **`redirect_uri` en correspondance exacte** | RFC 9700 §2.1, §4.1 | pas de wildcard, pas de préfixe, pas de sous-chemin |
| **`state`** pour les clients qui l'utilisent | RFC 9700 §2.1, §4.5 | protection contre l'injection de code |
| HTTPS obligatoire | RFC 9700 §2.1, §4.1 | sauf `localhost` en développement |
| Jetons jamais dans l'URL | RFC 6750 | uniquement l'en-tête `Authorization` |

Détail de chaque protection : [[pkce]] (le code), [[state_login_csrf]] (la corrélation), [[authorization_code_flow]] (la redirection).

### Les attaques couvertes, une par une

> [!tip] En clair
> **Chaque règle vient d'une attaque réelle.** C'est le tableau le plus instructif de la note : à gauche, ce qu'un attaquant tente ; à droite, ce qui l'arrête.

| Attaque | En clair | Contre-mesure |
|---|---|---|
| **Code interception** | voler le code dans le navigateur | [[pkce]] — le verifier manque au voleur |
| **Code injection / login CSRF** | faire consommer *son* code à la victime | [[state_login_csrf]] — le state ne correspond pas |
| **`redirect_uri` ouverte** | détourner la redirection vers un domaine voisin | correspondance **exacte** (RFC 9700 §4.1) |
| **Token leakage par `Referer`** | le jeton fuit via l'URL | jetons jamais dans l'URL, uniquement `Authorization` |
| **Mix-up attack** | faire croire qu'un AS en est un autre | épingler l'`issuer`, vérifier `iss` (RFC 9207) |
| **Token substitution** | faire accepter un jeton émis pour une autre appli | vérifier `aud`, et `azp` si multi-audience |
| **Algorithm confusion** | forcer `none` ou HMAC avec la clé publique | liste blanche d'algorithmes (RFC 8725) |
| **ID Token replay** | rejouer une carte d'identité capturée | `nonce` + `exp` court |
| **JWT forgé** | fabriquer un jeton non signé ou mal signé | **vérifier la signature** ([[discovery_and_jwks]]) |
| **Jeton porteur volé** | rejouer un jeton intercepté | jeton *sender-constrained* : [[mtls]] ou [[dpop]] |
| **Jeton réutilisé hors de son audience** | propager un jeton de service en service | [[token_exchange]] : un jeton par audience |
| **Refresh token volé** | garder un accès durable | rotation + détection de réutilisation |
| **CSRF sur le logout / la session** | forcer une déconnexion ou une reconnexion | `state`, cookies `SameSite` |
| **Downgrade PKCE** | serveur acceptant un code sans challenge | lier le challenge au code (RFC 9700 §4.5.3.1) |

### Les vérifications côté client

> [!tip] En clair
> **La checklist minimale** avant de faire confiance à un ID Token. Les trois premières sont celles qu'on oublie le plus.

1. **La signature** — via les clés publiques de [[discovery_and_jwks]]. *(sans ça, tout le reste est inutile)*
2. **`aud`** — le jeton est-il bien destiné à **moi** ?
3. **`nonce`** — est-ce bien **ma** session ?
4. **`iss`** — l'émetteur est-il exactement celui attendu ?
5. **`exp` / `iat`** — est-il encore valable (avec une tolérance d'horloge) ?
6. **`alg`** — dans une liste blanche, jamais déduit du jeton.

Détail complet : [[id_token]]. Validation d'une signature : [[jwt]].

### Les vérifications côté serveur

> [!tip] En clair
> Côté guichet et côté API, les mêmes principes : ne rien prendre pour acquis, tout vérifier, et **limiter** systématiquement.

| Contrôle | En clair |
|---|---|
| Code à usage unique, TTL court (30-60 s) | un code ne resserv jamais |
| `code` lié au `client_id` et à la `redirect_uri` | un code ne se transvase pas d'un client à l'autre |
| `redirect_uri` en correspondance exacte | pas de détour vers un domaine voisin |
| Détection de rejeu de code | un code rejoué révoque les jetons émis |
| Refresh token rotatif + détection de réutilisation | un vol devient détectable |
| `aud` vérifiée par chaque API | un jeton de l'API A ne vaut pas pour l'API B |
| `scope` vérifié par opération | moindre privilège appliqué réellement |
| Secrets dans un coffre-fort, rotation | pas de secret dans le code ou Git |
| Masquage des jetons dans les logs | un jeton journalisé est un accès offert |

---

## Exemple concret

> [!tip] En clair
> Une configuration **conforme** et une configuration **à jeter**, côte à côte. La comparaison rend les règles concrètes.

**❌ Configuration à ne jamais faire :**

```
response_type=token                        ← Implicit : déprécié (jeton dans l'URL)
redirect_uri=https://app.example.com/*     ← wildcard : redirection ouverte
scope=read write delete                    ← scope maximal : viole le moindre privilège
(aucun code_challenge)                     ← pas de PKCE : code interceptable
(aucun state)                              ← pas de protection contre l'injection
Authorization: Bearer eyJ...               ← jeton dans l'URL au lieu de l'en-tête
vérification : décodage du JWT sans       ← signature jamais vérifiée
```

**✅ Configuration conforme (RFC 9700) :**

```
response_type=code                              ← code flow : recommandé
client_id=app-front
redirect_uri=https://app.example.com/callback   ← exacte, enregistrée
scope=openid profile read:contacts              ← scope minimal
state=af0ifjsldkj                               ← anti-injection de code
nonce=n-0S6_WzA2Mj                              ← anti-rejeu de l'ID Token
code_challenge=E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM
code_challenge_method=S256                      ← PKCE, S256 uniquement
```

Puis, côté client : **signature vérifiée** via la JWKS de l'`issuer` épinglé, **`iss` exact**, **`aud` = `client_id`**, **`exp` valide**, **`nonce` identique**, **`alg`** dans la liste blanche. Un jeton qui échoue à **un seul** de ces contrôles est **rejeté**, jamais « accepté avec un avertissement ».

---

## Pièges fréquents

> [!tip] En clair
> **Les 6 erreurs les plus graves, par ordre de dangerosité :**
> 1. **Ne pas vérifier la signature** d'un ID Token → n'importe qui forge une identité.
> 2. **Accepter une `redirect_uri` approximative** → le code part chez un attaquant.
> 3. **Ne pas vérifier `aud`** → un jeton émis pour une autre appli ouvre ta session.
> 4. **Utiliser Implicit ou Password** → bannis, sans exception.
> 5. **Ne pas tourner les refresh tokens** → un vol donne un accès permanent.
> 6. **Mettre un jeton dans une URL ou un log** → il est déjà à moitié fuité.

- **Signature non vérifiée** — l'erreur la plus grave : tout le reste devient décoratif ([[jwt]], [[discovery_and_jwks]]). Réflexe : **signature d'abord**, champs ensuite.
- **`aud` ignorée** — un ID Token émis pour une application voisine ouvre votre session (*token substitution*, *confused deputy*). Réflexe : exiger son `client_id`, et `azp` en multi-audience.
- **`redirect_uri` approximative** — wildcard, préfixe ou sous-chemin acceptés : un attaquant exploite `https://app.example.com.evil.com/callback`. Réflexe : correspondance **exacte**, HTTPS obligatoire, `localhost` toléré en développement.
- **`state` absent ou non vérifié** — la victime peut être connectée au compte d'un attaquant ([[state_login_csrf]]). Réflexe : `state` aléatoire par requête, comparé **avant** l'échange, invalidé ensuite.
- **Pas de [[pkce]] sur un client public** — un code intercepté est directement échangeable. Réflexe : PKCE `S256`, obligatoire.
- **`alg` déduit du jeton** — `none` ou confusion RS256/HS256 (RFC 8725). Réflexe : liste blanche côté serveur, jamais de confiance dans le header.
- **Refresh token sans rotation** — un vol reste exploitable indéfiniment ([[refresh_token]]). Réflexe : rotation à chaque usage, détection de réutilisation, révocation de la famille.
- **Jetons dans les logs / URL** — fuite par l'observabilité, l'historique, `Referer`. Réflexe : en-tête `Authorization` uniquement, masquage des secrets.
- **Implicit toujours en production** — jeton exposé en front-channel. Réflexe : migrer vers code + PKCE.
- **Password grant encore présent** — le client voit le mot de passe. Réflexe : bannir, migrer.
- **Épinglage d'`issuer` absent** — les jetons d'un autre serveur peuvent être acceptés (*mix-up*). Réflexe : comparer `iss` **exactement** à la valeur de la Discovery de l'issuer épinglé.
- **Session RP survivant au logout OP** — faille sur un poste partagé. Réflexe : logout front-channel **et** back-channel.
- **Rotation des clés non gérée** — `kid` inconnu mal traité : soit rejet à tort, soit confiance accordée à une clé non validée. Réflexe : recharger la JWKS, puis échouer si le `kid` reste introuvable.

---

## Rappel

> [!question] Question de rappel
> Un client public (SPA) utilise Authorization Code + PKCE + `state`, avec une `redirect_uri` exacte, et valide correctement l'ID Token. Est-il pour autant conforme aux bonnes pratiques actuelles ? Que manque-t-il éventuellement ?

> [!success]- Réponse
> Les protections **essentielles** sont en place : ligne de conduite conforme à la RFC 9700 sur le flow, la redirection et la validation du jeton. Ce qui peut encore manquer relève des points **transverses** : (1) la **gestion des refresh tokens** — un client public ne devrait pas en conserver, ou seulement via un back-end (*BFF*) avec rotation et détection de réutilisation ; (2) le **stockage** — pas de jeton en `localStorage`, mais en mémoire ou en cookie `HttpOnly`; (3) la **constance du `nonce`** et la tolérance d'horloge explicite ; (4) l'**absence de jeton dans les logs** et de fuite par `Referer`; (5) la **déconnexion** (front-channel **et** back-channel) ; (6) l'**épinglage de l'`issuer`** et la gestion de la rotation des clés. Autrement dit : le flow est bon, mais la sécurité est un **ensemble** — [[pkce]] et `state` ne couvrent pas le stockage, la révocation ni le logout.

### 🎯 Le résumé à retenir

> [!tip] Si tu ne retiens qu'une chose
> **OAuth 2.1 = OAuth 2.0 + les bonnes pratiques. Pas un nouveau protocole.**
>
> Les trois règles qui comptent le plus :
> 1. **PKCE obligatoire** dès qu'il n'y a pas de secret (SPA, mobile).
> 2. **Redirection exacte** — jamais de wildcard.
> 3. **Vérifier la signature** de tout jeton avant de le lire.
>
> Et les deux flows à bannir sans réfléchir : **Implicit** et **Password**.

---

## Voir aussi

- [[pkce]] — la protection centrale imposée par la RFC 9700.
- [[state_login_csrf]] — l'autre protection obligatoire du callback.
- [[authorization_code_flow]] — le flow recommandé par défaut.
- [[id_token]] — les contrôles obligatoires à la réception.
- [[jwt]] — les pièges d'algorithmes et la validation.
- [[discovery_and_jwks]] — la vérification de signature et la rotation des clés.
- [[refresh_token]] — rotation et détection de réutilisation.
- [[mtls]] — authentification forte du client et jetons liés au certificat.
- [[dpop]] — jetons à preuve de possession, sans infrastructure.
- [[fapi]] — le profil sectoriel qui combine ces protections.
- [[token_exchange]] — la délégation d'identité entre services.
- [[flows_comparison]] — les dépréciations, flow par flow.
- [[oauth2]] — le socle, et son historique vers 2.1.
- [[openid_connect]] — les pièges propres à la couche identité.
- [[oidc/index]] — carte d'entrée du dossier.

## Références

- RFC 9700 (BCP 240) — *Best Current Practice for OAuth 2.0 Security*, janvier 2025 : §2.1 (PKCE, dépréciation d'Implicit), §2.4 (Password), §4.1 (`redirect_uri`), §4.5.3.1 (anti-downgrade), §4.5 (`state`).
- RFC 6819 — *OAuth 2.0 Threat Model and Security Considerations* — taxonomie des menaces.
- RFC 8725 (BCP 225) — *JSON Web Token Best Current Practices* (`alg: none`, confusion d'algorithmes).
- RFC 7636 — *Proof Key for Code Exchange* (PKCE).
- RFC 9207 — *OAuth 2.0 Authorization Server Issuer Identification* (`iss`).
- RFC 6750 — *The OAuth 2.0 Authorization Framework: Bearer Token Usage*.
- draft-ietf-oauth-v2-1 — *The OAuth 2.1 Authorization Framework*.
- OpenID Connect Core 1.0 — §3.1.3.7 (ID Token Validation), §5 (Claims), Session Management 1.0 (logout).
