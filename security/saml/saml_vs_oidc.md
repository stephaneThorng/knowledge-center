---
title: SAML vs OIDC
aliases: [SAML vs OIDC, comparatif SAML OIDC, SAML ou OIDC, différence SAML OIDC]
tags: [saml, oidc, comparatif, federation, sso, migration]
domaine: securite/saml
niveau: intermediaire
statut: draft
cree: 2026-10-01
sources: [SAML 2.0 Core, SAML 2.0 Profiles, OpenID Connect Core 1.0, RFC 9700]
---

# SAML vs OIDC

> [!abstract] Ancre
> SAML et OIDC résolvent **le même problème** — fédérer une identité entre une application et un fournisseur — avec deux philosophies opposées : XML et tout-navigateur d'un côté, JSON et architecture à deux jambes de l'autre.

---

## 🧒 Avant de commencer : de quoi on parle

> [!tip] En clair
> Deux protocoles, **un seul but** : *« cette application veut savoir qui je suis, et c'est un autre système qui le sait. »*
>
> 🚗 **L'analogie :** imagine deux façons de prouver ton identité pour entrer quelque part.
> - **SAML** : un **huissier** rédige un **document officiel**, le tamponne, te le donne. Tu le portes toi-même. C'est formel, verbeux, solennel — et **ça marche partout depuis 20 ans**.
> - **OIDC** : on te donne un **numéro de ticket**. Tu vas le montrer au **guichet arrière**, où l'échange se fait à l'abri des regards.
>
> **Les deux sont valables.** La question n'est pas « lequel est le meilleur » mais **« lequel pour quel contexte »**.

**Les mots à connaître pour cette note :**

| Mot technique | En clair |
|---|---|
| **SAML** | le protocole **ancien**, en **XML**, partout en entreprise |
| **OIDC** | le protocole **moderne**, en **JSON**, choisi pour le neuf |
| **fédération** | faire confiance à un annuaire **externe** sans créer de compte local |
| **legacy** | ce qui existe déjà et qu'on ne remplace pas |
| **greenfield** | un projet neuf, sans contrainte d'existant |

Voir aussi : [[saml2]] et [[openid_connect]].

---

## Définition

> [!tip] En clair
> Les deux protocoles font de la **fédération d'identité** et du **SSO**. Ce qui change, c'est **comment** :
>
> - **SAML** : un **document XML signé** qui traverse le navigateur.
> - **OIDC** : un **code** qui traverse le navigateur, échangé ensuite contre des **jetons JSON**.

**SAML 2.0** (OASIS, 2005) : protocole de fédération, format **XML**, architecture où l'**assertion signée** circule **par le navigateur**.

**OpenID Connect 1.0** (OpenID Foundation, 2014) : couche d'identité bâtie **sur [[oauth2]]**, format **JSON/JWT**, architecture à **deux canaux** (le code en public, les jetons en privé).

---

## Enjeux

> [!tip] En clair
> **Le vrai sujet n'est pas technique, il est pratique :**
>
> - Dans une **grande organisation avec un parc existant**, on ne remplace pas SAML : trop d'applications, trop de fédérations, trop de contrats. On **gravite autour**.
> - Dans un **projet neuf** sans contrainte, on choisit **OIDC** — quasi systématiquement.
>
> Comprendre cette dynamique, c'est comprendre **pourquoi les deux coexistent** aujourd'hui.

- **Rien ne se remplace par plaisir** : un SSO SAML en production est **audité**, **certifié**, **documenté**. Le changer coûte cher sans bénéfice immédiat.
- **Les nouveaux usages sont mobiles et API-first** : là où SAML est mal à l'aise, OIDC est natif.
- **La fédération B2B reste souvent SAML** : les fédérations inter-entreprises et sectorielles (universités, santé, banque) sont largement bâties sur SAML.
- **Les deux peuvent coexister** : un même fournisseur d'identité expose souvent **les deux** (SAML pour les vieilles applis, OIDC pour les nouvelles).

---

## Fonctionnement détaillé

### Le tableau comparatif complet

> [!tip] En clair
> **Voilà la note en un tableau.** Si tu ne retiens qu'une chose de ce dossier, c'est celle-ci.

| Critère | **SAML 2.0** | **OIDC** |
|---|---|---|
| **Année** | 2005 (OASIS) | 2014 (OpenID Foundation) |
| **Format** | **XML** (verbeux, formel) | **JSON / JWT** (compact) |
| **Bâti sur** | un standard autonome | **OAuth 2.0** (solutionne l'autorisation *en plus*) |
| **Ce qui circule dans le navigateur** | **l'assertion signée** (la preuve complète) | un **code opaque** (sans valeur seule) |
| **Canaux** | **tout par le navigateur** | **deux canaux** : public (code) + privé (jetons) |
| **Rôles** | 2 : IdP, SP | 4 : OP, RP, End-User, Resource Server |
| **Jeton d'identité** | **Assertion** XML | **ID Token** (JWT) |
| **Signature** | XML Signature (DSig) — complexe | JWS (JSON) — simple |
| **Découverte** | **Metadata** (fichier statique échangé) | **Discovery** (URL interrogée) + JWKS |
| **Rotation des clés** | **manuelle, coordonnée** (source d'incidents) | **automatique** (JWKS) |
| **Accès aux API** | non couvert (SAML ne fait que l'identité) | **couvert** (access token OAuth) |
| **Mobile / SPA** | mal adapté | **natif** |
| **Niveau d'authentification** | `AuthnContextClassRef` | `acr_values` / `acr` / `amr` |
| **Corrélation** | `RelayState` / `InResponseTo` | `state` / `nonce` |
| **Logout** | Single Logout (SLO) — réputé fragile | Front/Back-channel Logout |
| **Où c'est déployé** | **entreprise**, fédérations B2B, institutions | **neuf**, mobile, API, grand public |
| **Complexité d'implémentation** | élevée (XML, DSig, profils) | modérée (JSON, bibliothèques matures) |
| **Surface d'attaque** | large (XSW, XXE, rejeu d'assertion) | plus étroite (architecture à deux jambes) |

### Les trois différences qui expliquent tout

> [!tip] En clair
> Trois choix de conception séparent vraiment les deux protocoles. Le reste en découle.

**1. Ce qui traverse le navigateur**

> [!tip] En clair
> **SAML** : le navigateur transporte **l'assertion signée** — la **preuve d'identité complète**.
> **OIDC** : le navigateur transporte un **code sans valeur**.
>
> C'est **la** différence fondamentale. Elle explique pourquoi OIDC a une architecture à deux jambes : on fait transiter en public **ce qui ne sert à rien seul**.

**2. La découverte et les clés**

> [!tip] En clair
> **SAML** : IdP et SP échangent des **fichiers de métadonnées**. Quand l'IdP change de certificat, il faut **prévenir tous les SP** — et s'il en oublie un, **son SSO tombe**.
>
> **OIDC** : le client pose **une question à une URL** (Discovery) et récupère les clés automatiquement (JWKS), avec **rotation** gérée. Plus d'échange manuel.

**3. Le périmètre**

> [!tip] En clair
> **SAML ne fait que de l'identité.** Il ne dit rien sur « quelle API puis-je appeler ».
>
> **OIDC est posé sur OAuth 2.0** : il fait l'identité **et**, grâce au socle OAuth, l'**autorisation d'accès aux API** (l'access token, les scopes). C'est un avantage décisif dans un monde d'API et de microservices.

### Le mapping des concepts, terme à terme

> [!tip] En clair
> **Table de traduction SAML ↔ OIDC.** Très utile quand tu passes d'un monde à l'autre : tout ce que tu sais dans l'un a un équivalent dans l'autre.

| SAML 2.0 | OIDC | Rôle |
|---|---|---|
| Identity Provider (IdP) | OpenID Provider (OP) | qui **sait** qui tu es |
| Service Provider (SP) | Relying Party (RP) | qui **veut savoir** |
| Assertion | ID Token | la preuve d'identité |
| `<Issuer>` | `iss` | qui a émis |
| `<NameID>` | `sub` | qui est l'utilisateur |
| `<Audience>` | `aud` | à qui c'est destiné |
| `NotOnOrAfter` | `exp` | expiration |
| `RelayState` | `state` | corrélation de session |
| `InResponseTo` | *(pas d'équivalent direct)* | anti-rejeu de la requête |
| `AuthnContextClassRef` | `acr_values` / `acr` | niveau d'authentification |
| `<AttributeStatement>` | claims | attributs (email, rôle…) |
| Metadata | Discovery + JWKS | informations techniques |
| HTTP-Redirect / HTTP-POST | `response_mode` | transport |
| Single Logout (SLO) | Front/Back-channel Logout | déconnexion propagée |

### Quand choisir quoi

> [!tip] En clair
> **La règle est simple, en pratique.**

| Situation | Choix |
|---|---|
| Projet **neuf** | **OIDC** — sans hésiter |
| Application **mobile** ou **SPA** | **OIDC** |
| Besoin d'appeler des **API** | **OIDC** (+ OAuth access token) |
| **Fédération déjà en place** en SAML | **on la garde**, on gravite autour |
| Partenaire **impose** SAML | SAML (contraint) |
| Secteur/institution avec **fédération SAML** | SAML (contraint) |
| IdP ancien qui **ne parle pas** OIDC | SAML, ou **passerelle** SAML↔OIDC |

**Le cas des passerelles :** quand une application moderne veut se connecter à un IdP qui ne fait que du SAML, on interpose un **pont** qui traduit SAML en OIDC (ou l'inverse). C'est une pratique courante pour moderniser **sans toucher** à l'existant.

### Migrer de SAML vers OIDC : ce que ça implique

> [!tip] En clair
> **On ne migre pas « par principe ».** On migre quand il y a une raison : nouvelles fonctionnalités, mobile, API, ou coût de maintenance devenu trop élevé.
>
> Et on migre application **par application**, jamais d'un bloc.

**Ce qui est gagné :**

| Gagné | En clair |
|---|---|
| Formats simples | JSON au lieu de XML → moins de failles de parsing |
| Rotation automatique | plus d'incident « certificat expiré » |
| Mobile et API | nativement supportés |
| Support des jetons d'accès | on peut appeler des API |
| Bibliothèques modernes | plus jeunes, plus activement maintenues |

**Ce qui coûte :**

| Coût | En clair |
|---|---|
| Reprise des configurations | chaque SP SAML doit être reconfiguré en client OIDC |
| Reprise des fédérations | les contrats et échanges de métadonnées à refaire |
| Attributs à remapper | les `AttributeStatement` à traduire en *claims* |
| Formation des équipes | les réflexes SAML ne se transposent pas tels quels |
| Risque de régression | le SSO existant marche : toute migration est un risque |

**La stratégie réaliste :** coexistence. L'IdP expose **SAML** pour l'existant et **OIDC** pour les nouveaux usages. On migre progressivement, en commençant par les applications à fort besoin (mobile, API), et on laisse les applications stables tranquilles.

---

## Exemple concret

> [!tip] En clair
> **Le même scénario, les deux protocoles**, côte à côte. Tu vois immédiatement le contraste.

### SAML — tout passe par le navigateur

```
1. GET https://app.example.com                      → pas de session
2. → Redirect vers :  https://idp.example.com/sso?SAMLRequest=<XML compressé>&RelayState=xyz
3. → login chez l'IdP (+ MFA selon la politique)
4. → POST auto-soumis vers https://app.example.com/saml/acs
     SAMLResponse=<ASSERTION XML SIGNÉE>   ← la PREUVE complète traverse le navigateur
     RelayState=xyz
5. → Le SP vérifie : signature (quel nœud ?), Issuer, Audience, fenêtre, InResponseTo
6. → session locale
```

### OIDC — deux canaux

```
1. GET https://app.example.com                      → pas de session
2. → Redirect vers :  https://op.example.com/authorize?...&state=a1b2c3
3. → login chez l'OP
4. → Redirect vers https://app.example.com/callback?code=SplxlOBeZQQYbYS6WxSbIA&state=a1b2c3
     code                                  ← un CODE sans valeur traverse le navigateur
5. → POST /token  (canal privé, serveur à serveur)   ← les JETONS arrivent ici
6. → Le RP vérifie l'id_token, crée la session locale
```

### Ce que la comparaison révèle

| | SAML | OIDC |
|---|---|---|
| Étape 4 | **la preuve signée** dans le navigateur | un **code inutile seul** dans le navigateur |
| Étape 5 | vérification de la signature **du document** | échange **à l'abri** contre des jetons |
| Ce qu'un attaquant obtient à l'étape 4 | une **preuve d'identité** exploitable | un **code** inexploitable sans le verifier/secret |

**Conclusion immédiate :** en OIDC, **la cible de l'attaque est déplacée**. L'attaquant doit viser le **canal privé** (bien plus difficile) au lieu du **navigateur** (exposé). C'est exactement la raison pour laquelle OIDC a été conçu ainsi — et pourquoi SAML demande une validation si rigoureuse.

---

## Pièges fréquents

> [!tip] En clair
> **Les 5 erreurs à retenir :**
> 1. **Croire qu'OIDC est « juste SAML en mieux »** → ce sont deux philosophies différentes, avec des forces différentes.
> 2. **Migrer du SAML « pour moderniser » sans raison** → on casse ce qui marchait.
> 3. **Transposer les réflexes SAML vers OIDC** → les modèles de menace ne sont pas les mêmes.
> 4. **Transposer les réflexes OIDC vers SAML** → l'assertion doit être validée **beaucoup plus** rigoureusement.
> 5. **Oublier les passerelles** → dans la réalité, les deux coexistent et se traduisent.

- **« OIDC remplace SAML »** — faux en pratique : SAML reste massivement déployé et **ne disparaîtra pas** à court terme. Réflexe : apprendre les deux, s'attendre à coexister.
- **Migration « pour être moderne »** — sans besoin fonctionnel (mobile, API), la migration coûte cher et apporte un risque de régression. Réflexe : ne migrer que pour une **raison**.
- **Sous-estimer la complexité XML** — les failles SAML (XSW, XXE) viennent du parsing et de la signature XML, mal comprises par les développeurs venus d'OIDC. Réflexe : bibliothèque éprouvée, validation documentée, veille sur les CVE.
- **Réutiliser les règles OIDC en SAML** — croire que « vérifier la signature » suffit alors qu'en SAML il faut aussi **savoir quel nœud est signé**. Réflexe : respecter les recommandations SAML propres (XSW).
- **Attendre une rotation automatique en SAML** — il n'y a pas de JWKS : les certificats s'échangent **manuellement** via les métadonnées. Réflexe : **coordonner** la rotation, publier les deux certificats pendant la transition.
- **Oublier l'IdP-initiated** — dans un parc existant, il est souvent **activé** (portail interne) et rarement sécurisé. Réflexe : vérifier explicitement, et le désactiver si possible.
- **Comparer les « duretés » sans contexte** — « SAML est plus sûr » ou « OIDC est plus sûr » n'ont pas de sens hors contexte. Réflexe : raisonner en **modèle de menace + parc existant**.
- **Ignorer les fédérations sectorielles** — certaines fédérations (éducation, santé, administration) imposent **SAML** avec des règles propres. Réflexe : lire le **règlement de la fédération**, pas seulement le protocole.
- **Passerelle mal configurée** — un pont SAML↔OIDC mal configuré peut **affaiblir** la sécurité (assertion acceptée sans validation, attributs non contrôlés). Réflexe : traiter la passerelle comme un **composant de sécurité critique**, et l'auditer.

---

## Rappel

> [!question] Question de rappel
> Un client reçoit une assertion SAML signée par l'IdP, et un autre client reçoit un `code` OIDC. Les deux transits passent par le navigateur. Pourquoi le `code` est-il intrinsèquement moins dangereux à intercepter ? Que faut-il vérifier en plus dans le cas SAML ?

> [!success]- Réponse
> Le `code` OIDC est **opaque et sans valeur propre** : il ne contient **aucune** information d'identité, et il n'est échangeable que sur le **canal arrière**, où le client doit prouver son identité (`client_secret`) ou sa possession du secret PKCE (`code_verifier`). Un attaquant qui l'intercepte obtient un ticket **inexploitable**. À l'inverse, l'assertion SAML **est** la preuve d'identité complète : elle est signée par l'IdP, elle contient le `NameID` et les attributs (email, rôles), et le SP la **croit** sur la seule base de la signature. Interceptée dans sa fenêtre de validité, elle est **directement utilisable** auprès du SP. Il faut donc, en SAML, vérifier **davantage** : la signature **et le nœud exact sur lequel elle porte** (contre le *XML Signature Wrapping*, où l'attaquant déplace le nœud signé et injecte ses propres données ailleurs), ainsi que `Issuer`, `Audience`, `Recipient`, la fenêtre temporelle (`NotBefore`/`NotOnOrAfter`), et `InResponseTo` contre le rejeu. Ces contrôles supplémentaires sont la contrepartie du choix architectural de SAML — faire transiter la preuve elle-même sur un canal exposé.

### 🎯 Le résumé à retenir

> [!tip] Si tu ne retiens qu'une chose
> **Même problème, deux philosophies.**
>
> - **SAML** → XML, **tout par le navigateur**, la preuve circule. Verbeux, complexe, **partout en entreprise**.
> - **OIDC** → JSON, **deux canaux**, un code inutile en public. Moderne, simple, **choisi pour le neuf**.
>
> **En pratique :**
> - Projet neuf → **OIDC**.
> - Parc existant → **on garde SAML** et on **gravite autour**.
> - Les deux **coexistent**, souvent chez le même fournisseur d'identité.
>
> **Et le réflexe de traduction :** IdP↔OP, SP↔RP, assertion↔ID Token, `NameID`↔`sub`, Metadata↔Discovery. Une fois cette table en tête, tu passes d'un monde à l'autre sans être perdu.

---

## Voir aussi

- [[saml2]] — le protocole en détail.
- [[openid_connect]] — le protocole moderne équivalent.
- [[authorization_code_flow]] — l'architecture à deux jambes, cœur de la différence.
- [[id_token]] — l'équivalent JSON de l'assertion.
- [[state_login_csrf]] — ce que `RelayState` joue côté SAML.
- [[step_up_auth]] — l'équivalent de `AuthnContextClassRef`.
- [[flows_comparison]] — le choix des flows, côté OIDC.
- [[saml/index]] — carte d'entrée du domaine.

## Références

- OASIS SAML 2.0 — *Core*, *Bindings*, *Profiles*, *Metadata*.
- OpenID Connect Core 1.0 — <https://openid.net/specs/openid-connect-core-1_0.html>
- RFC 9700 — *Best Current Practice for OAuth 2.0 Security*.
- RFC 7636 — *Proof Key for Code Exchange* (PKCE) — la protection du code côté client public.
