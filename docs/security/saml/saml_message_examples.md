---
title: Lire une trame SAML
aliases: [SAML Request, SAML Response, AuthnRequest, Trame SAML, Décoder SAML, Diagramme SAML, Diagnostic SAML, Lecture de trace SAML]
tags: [saml, federation, sso, xml, diagnostic, debug, trace, assertion]
domaine: securite/saml
niveau: intermediaire
statut: draft
cree: 2026-10-14
sources: [SAML 2.0 Core, SAML 2.0 Bindings, SAML 2.0 Profiles, SAML 2.0 Metadata]
---

# Lire une trame SAML

> [!abstract] Ancre
> Prendre une **capture réseau** (proxy, DevTools, HAR) et en extraire tout ce qu'il faut pour diagnostiquer : décoder les emballages, lire le `AuthnRequest` et la `Response` décodés, et suivre une **grille de contrôle ordonnée**.

---

## 🧒 Avant de commencer : de quoi on parle

> [!tip] En clair
> Tu es devant une interception HTTP. Tu vois passer deux choses :
>
> 1. une **URL bizarre** avec un gros paramètre `SAMLRequest=...` (quand l'utilisateur part vers l'IdP) ;
> 2. un **POST** vers une URL en `/acs` avec un paramètre `SAMLResponse=...` (au retour de l'IdP).
>
> Ces deux paramètres sont du **XML déguisé** — pas du chiffrement, juste des **emballages**.
>
> 🔑 **L'analogie :** c'est une **lettre officielle pliée dans une enveloppe, elle-même mise dans un colis**. Tu ne lis rien tant que tu n'as pas ouvert les trois couches. Une fois ouvert, c'est un document parfaitement lisible.

**Les mots à connaître pour cette note :**

| Mot technique | En clair |
|---|---|
| **`AuthnRequest`** | la **demande** de connexion écrite par l'application (le SP) |
| **`Response`** | la **réponse** écrite par l'IdP, qui porte l'assertion |
| **ACS** (*Assertion Consumer Service*) | l'**URL de réception** des assertions, côté application |
| **`SAMLRequest` / `SAMLResponse`** | les paramètres HTTP qui transportent ces documents |
| **DEFLATE** | compression (comme un zip), utilisée **seulement** pour la requête |
| **Base64** | encodage qui transforme du binaire en caractères texte |
| **URL-encoding** | transformation des caractères interdits dans une URL (`+` → `%2B`) |
| **`RelayState`** | un marqueur opaque que le SP envoie et **attend en retour** |

Voir aussi : [[saml2]] (le protocole), [[saml_nameid]] (le NameID en détail), [[saml_vs_oidc]] (le comparatif).

---

## Les emballages : pourquoi c'est illisible

> [!tip] En clair
> Le XML est **verbeux**. Pour le faire tenir dans une URL, on l'écrase ; pour qu'il ne casse pas l'URL, on le traduit en caractères sans danger. D'où les couches.

**Règle d'or — les deux messages ne s'emballent pas pareil :**

| Message | Binding | Couches appliquées (sens aller) | Sens inverse (décodage) |
|---|---|---|---|
| **`SAMLRequest`** | **HTTP-Redirect** | XML → **DEFLATE** → **Base64** → **URL-encoding** | URL-decode → Base64-decode → **INFLATE** |
| **`SAMLResponse`** | **HTTP-POST** | XML → **Base64** → *(form field)* | **Base64-decode seul** |

> [!warning] Les trois pièges qui font perdre des heures
> 1. **Ne jamais décompresser une `SAMLResponse`** : elle n'a jamais été compressée. Si `inflate` échoue sur une Response, **tu t'es trompé de chemin**, pas de bibliothèque.
> 2. **DEFLATE ≠ INFLATE** : c'est le *même* algorithme dans les deux sens. *DEFLATE* = compresser, *INFLATE* = décompresser.
> 3. **L'en-tête zlib** : certaines données ont un **en-tête zlib** (2 octets `0x78 0x9C`), d'autres sont du **raw deflate sans en-tête**. Si ça refuse de se décompresser, **essaie l'autre variante** — c'est la cause n°1 des échecs.
>
> Et un dernier, côté URL : un `+` **littéral** dans l'URL ne veut pas dire la même chose que `%2B`. Il faut convertir **avant** le Base64-decode.

---

## Le `AuthnRequest` — ce que l'application écrit

### La trame, avant décodage

```http
GET /sso?SAMLRequest=fZJBT8MwDIX%2FSqRTDm3TdpvUgzQNiQk0GNuA7Q5Iu3Torx8kR5rE%2Bf3s...&RelayState=xyz789&SigAlg=http%3A%2F%2Fwww.w3.org%2F2001%2F04%2Fxmldsig-more%23rsa-sha256&Signature=K7hL...
Host: idp.exemple.com
```

| Morceau | Ce que c'est | Ce que tu en déduis |
|---|---|---|
| `GET ...?SAMLRequest=` | binding **HTTP-Redirect** | la requête est **compressée** → 3 couches |
| `SAMLRequest=...` | le XML du SP, déflate + base64 + urlencodé | **c'est ce qu'il faut décoder** |
| `RelayState=xyz789` | l'état opaque du SP | l'IdP doit le **rendre tel quel** — sinon la session se perd |
| `SigAlg=` + `Signature=` | signature **de la requête** | signer la requête est **optionnel**, mais courant en entreprise |

**Premier réflexe de diagnostic :** la requête est-elle **signée** (`SigAlg` présent) ou non ? Beaucoup d'incidents « l'IdP refuse la demande » viennent de là.

### Le XML décodé

```xml
<samlp:AuthnRequest
    xmlns:samlp="urn:oasis:names:tc:SAML:2.0:protocol"
    ID="_req_a1b2c3d4"                              <!-- ① -->
    Version="2.0"
    IssueInstant="2026-10-14T09:12:00Z"             <!-- ② -->
    Destination="https://idp.exemple.com/sso"       <!-- ③ -->
    AssertionConsumerServiceURL="https://app.exemple.com/saml/acs"  <!-- ④ -->
    ProtocolBinding="urn:oasis:names:tc:SAML:2.0:bindings:HTTP-POST"> <!-- ⑤ -->

  <saml:Issuer>https://app.exemple.com</saml:Issuer>  <!-- ⑥ -->

  <samlp:NameIDPolicy
      Format="urn:oasis:names:tc:SAML:1.1:nameid-format:emailAddress"
      AllowCreate="true"/>                            <!-- ⑦ -->

  <samlp:RequestedAuthnContext Comparison="exact">
    <saml:AuthnContextClassRef>
      urn:oasis:names:tc:SAML:2.0:ac:classes:PasswordProtectedTransport
    </saml:AuthnContextClassRef>
  </samlp:RequestedAuthnContext>                      <!-- ⑧ -->

  <samlp:Scoping>
    <samlp:IDPList>
      <samlp:IDPEntry ProviderID="https://idp.exemple.com"/>  <!-- ⑨ -->
    </samlp:IDPList>
  </samlp:Scoping>
</samlp:AuthnRequest>
```

**Qui écrit quoi, et où ça ressort :**

| # | Élément | Écrit par | À quoi ça sert | Où ça ressort |
|---|---|---|---|---|
| ① | `ID` | **SP** | identifiant unique de la demande | ➜ revient en **`InResponseTo`** |
| ② | `IssueInstant` | SP | date d'émission | détection des écarts d'horloge |
| ③ | `Destination` | SP | **où** envoyer | doit matcher l'endpoint de l'IdP |
| ④ | `AssertionConsumerServiceURL` | SP | **où recevoir la réponse** | ➜ revient en **`Recipient`** |
| ⑤ | `ProtocolBinding` | SP | « réponds-moi en POST » | impose le binding de la réponse |
| ⑥ | `Issuer` | SP | « c'est **moi** » | l'IdP cherche cette EntityID dans ses confiances |
| ⑦ | `NameIDPolicy` | **SP** | ⭐ **le format de NameID demandé** | ➜ **la négociation se joue ici** — voir [[saml_nameid]] |
| ⑧ | `RequestedAuthnContext` | SP | le niveau d'authentification exigé | revient en `AuthnContextClassRef` |
| ⑨ | `IDPList` | SP | « va voir cet IdP précis » | utile en fédération multi-IdP |

> [!warning] Un cas à connaître : `NameIDPolicy` **sans** `Format`
> ```xml
> <samlp:NameIDPolicy AllowCreate="true" />
> ```
> Le `Format` est **absent**. Le défaut du standard est alors **`unspecified`** — c'est-à-dire « IdP, mets ce que tu veux ». **C'est le mode le plus permissif, et donc celui qui produit le plus de surprises** : c'est l'IdP qui décide seul de la valeur. Voir [[saml_nameid]].

---

## La `Response` — ce que l'IdP écrit

### La trame, avant décodage

```http
POST /saml/acs HTTP/1.1
Host: app.exemple.com
Content-Type: application/x-www-form-urlencoded

SAMLResponse=PHNhbWxwOlJlc3BvbnNlIHhtbG5zOnNhbWxwPSJ1cm46...&RelayState=xyz789
```

| Morceau | Ce que c'est | Ce que tu en déduis |
|---|---|---|
| `POST /saml/acs` | l'endpoint **ACS** du SP | si l'URL ne correspond pas à la config → rejet immédiat |
| `SAMLResponse=...` | le XML de l'IdP, **base64 seulement** | **pas de décompression** |
| `RelayState=xyz789` | doit être **identique** à celui de la requête | absent/changé → le SP perd le fil de la session |

### Le XML décodé

```xml
<samlp:Response
    xmlns:samlp="urn:oasis:names:tc:SAML:2.0:protocol"
    ID="_resp_9f8e7d6c"
    Version="2.0"
    IssueInstant="2026-10-14T09:12:07Z"
    Destination="https://app.exemple.com/saml/acs"
    InResponseTo="_req_a1b2c3d4">          <!-- ③ renvoie l'ID de la Request -->

  <saml:Issuer>https://idp.exemple.com</saml:Issuer>   <!-- ① -->

  <samlp:Status>
    <samlp:StatusCode Value="urn:oasis:names:tc:SAML:2.0:status:Success"/>
  </samlp:Status>                            <!-- ⓪ À REGARDER EN PREMIER -->

  <saml:Assertion ID="_assert_112233" IssueInstant="2026-10-14T09:12:07Z" Version="2.0">
    <saml:Issuer>https://idp.exemple.com</saml:Issuer>

    <ds:Signature xmlns:ds="http://www.w3.org/2000/09/xmldsig#">   <!-- 🔐 -->
      <ds:SignedInfo>
        <ds:CanonicalizationMethod Algorithm="http://www.w3.org/2001/10/xml-exc-c14n#"/>
        <ds:SignatureMethod Algorithm="http://www.w3.org/2001/04/xmldsig-more#rsa-sha256"/>
        <ds:Reference URI="#_assert_112233">                        <!-- ⬅️ QUEL nœud -->
          <ds:Transforms>
            <ds:Transform Algorithm="http://www.w3.org/2000/09/xmldsig#enveloped-signature"/>
            <ds:Transform Algorithm="http://www.w3.org/2001/10/xml-exc-c14n#"/>
          </ds:Transforms>
          <ds:DigestMethod Algorithm="http://www.w3.org/2001/04/xmlenc#sha256"/>
          <ds:DigestValue>MI1+9o59PyoOI4/5ETlb/QhYwEUb+nhbhRJxmnfujdM=</ds:DigestValue>
        </ds:Reference>
      </ds:SignedInfo>
      <ds:SignatureValue>ZGqNjIL4IoUH8Lk68BRLxWJ7U31...</ds:SignatureValue>
      <ds:KeyInfo>
        <ds:X509Data>
          <ds:X509Certificate>MIIGTzCCBDegAwIBAgIUNC93...</ds:X509Certificate>
        </ds:X509Data>
      </ds:KeyInfo>
    </ds:Signature>

    <saml:Subject>
      <saml:NameID Format="urn:oasis:names:tc:SAML:1.1:nameid-format:unspecified"
                   NameQualifier="https://idp.exemple.com"
                   SPNameQualifier="https://app.exemple.com/sp">   <!-- ④⑤ -->
        alice@exemple.com
      </saml:NameID>
      <saml:SubjectConfirmation Method="urn:oasis:names:tc:SAML:2.0:cm:bearer">
        <saml:SubjectConfirmationData InResponseTo="_req_a1b2c3d4"
                                      NotOnOrAfter="2026-10-14T09:17:07Z"
                                      Recipient="https://app.exemple.com/saml/acs"/>  <!-- ⑧ -->
      </saml:SubjectConfirmation>
    </saml:Subject>

    <saml:Conditions NotBefore="2026-10-14T09:12:07Z" NotOnOrAfter="2026-10-14T09:17:07Z"> <!-- ⑦ -->
      <saml:AudienceRestriction>
        <saml:Audience>https://app.exemple.com/sp</saml:Audience>   <!-- ⑥ -->
      </saml:AudienceRestriction>
    </saml:Conditions>

    <saml:AuthnStatement AuthnInstant="2026-10-14T09:12:05Z"
                         SessionIndex="s2a6a39045171f9f4d3062d796945f909524e4cd01"
                         SessionNotOnOrAfter="2026-10-14T17:12:07Z">
      <saml:AuthnContext>
        <saml:AuthnContextClassRef>
          urn:oasis:names:tc:SAML:2.0:ac:classes:PasswordProtectedTransport
        </saml:AuthnContextClassRef>                                <!-- ⑨ -->
      </saml:AuthnContext>
    </saml:AuthnStatement>

    <saml:AttributeStatement>                                     <!-- ⑩ -->
      <saml:Attribute Name="mail" NameFormat="urn:oasis:names:tc:SAML:2.0:attrname-format:basic">
        <saml:AttributeValue>alice@exemple.com</saml:AttributeValue>
      </saml:Attribute>
      <saml:Attribute Name="role">
        <saml:AttributeValue>APP_ADMIN</saml:AttributeValue>
      </saml:Attribute>
      <saml:Attribute Name="contactId">
        <saml:AttributeValue>12847</saml:AttributeValue>
      </saml:Attribute>
    </saml:AttributeStatement>
  </saml:Assertion>
</samlp:Response>
```

> [!tip] En clair — où se trouve la signature
> La `<ds:Signature>` est un **enfant direct du nœud qu'elle protège** (ici l'`Assertion`), et elle apparaît **en premier** dans ce nœud — juste après `<saml:Issuer>`.
>
> Elle peut se trouver à **deux endroits**, souvent les deux à la fois : dans la **`Response`** (signature de tout le document) et/ou dans l'**`Assertion`** (signature de la seule assertion). **Il n'est pas rare que seule l'assertion soit signée.**
>
> ⚠️ **Conséquence de diagnostic :** la question n'est pas *« y a-t-il une signature ? »* mais *« la signature porte-t-elle sur le nœud que le SP va lire ? »*. C'est exactement le terrain de l'attaque **XML Signature Wrapping** — voir [[saml2]].

---

## La grille de diagnostic, dans l'ordre

> [!tip] En clair
> Voilà **l'ordre dans lequel lire une assertion** sur un ticket. **On ne commence jamais par le bas.**

| Ordre | Élément | Ce qu'on vérifie | Où ça casse |
|---|---|---|---|
| **⓪** | `Status/StatusCode` | `Success` ? | `Requester`/`Responder` → l'IdP a refusé, tout le reste est inutile |
| **①** | `Issuer` | est-ce bien **mon** IdP ? | mauvais IdP → le SP refuse |
| **②** | `Destination` | = l'URL ACS attendue ? | mismatch → rejet |
| **③** | `InResponseTo` | = l'ID de **ma** requête ? | absent/≠ → rejeu, ou flux IdP-initiated |
| **④** | `NameID` **`Format`** | un format **dans la liste du SP** ? | pas dans la liste → **mapping par défaut silencieux** |
| **⑤** | `NameID` **valeur** | correspond-elle à un compte local ? | « user not found » |
| **⑥** | `Conditions/Audience` | = mon EntityID ? | assertion destinée à un autre SP → **rejet** |
| **⑦** | `NotBefore` / `NotOnOrAfter` | dans la fenêtre ? tolérance horloge courte ? | trop large → faille ; décalage → rejet |
| **⑧** | `SubjectConfirmationData/Recipient` | = l'ACS attendue ? | « Recipient mismatch » |
| **⑨** | `AuthnContextClassRef` | ≥ le niveau demandé ? | SP refuse si insuffisant |
| **⑩** | `AttributeStatement` | les attributs attendus sont là ? | rôle vide → autorisation refusée |
| **🔐** | **la Signature** *(transversal)* | valide, **et sur LE BON NŒUD** | XSW — sans ça, rien d'autre ne compte |

> [!warning] Le réflexe en une ligne
> **D'abord `Status`, puis la Signature, puis `NameID.Format`, puis le reste.** Ces trois-là expliquent à eux seuls la grande majorité des incidents.

---

## Exemple concret : d'une capture à un diagnostic

> [!tip] En clair
> Le déroulé, de la trace brute à la conclusion. Tout est anonymisé.

**Situation :** l'application renvoie « utilisateur inconnu » alors que l'authentification réussit.

```
① Capture : POST /saml/acs  →  SAMLResponse=<base64>     (pas de compression)
② Décodage : base64 -d  →  XML lisible
③ Grille de lecture :

  ⓪ StatusCode ......... Success          ✅ l'IdP a bien répondu
  🔐 Signature ......... présente, URI pointe sur l'Assertion  ✅
  ① Issuer ............. idp.exemple.com  ✅ connu
  ③ InResponseTo ....... = l'ID de la Request  ✅ pas de rejeu
  ④ NameID Format ...... unspecified      ⚠️ PAS de contrainte de format
  ⑤ NameID valeur ...... alice@exemple.com
  ⑩ AttributeStatement . <Attribute Name="mail">alice@exemple.com</Attribute>
                          <Attribute Name="role">APP_ADMIN</Attribute>
  ⑥ Audience ........... app.exemple.com/sp  ✅
  ⑧ Recipient .......... app.exemple.com/saml/acs  ✅

④ Conclusion :
   L'IdP émet un NameID de format « unspecified » dont la VALEUR est un mail.
   Le SP cherche à identifier l'utilisateur d'après cette valeur.
   → Le désaccord porte sur la VALEUR émise, pas sur la configuration du SP.
   → Le levier est côté IdP. Voir [[saml_nameid]].
```

---

## Les pièges de lecture

> [!tip] En clair
> **Les 5 erreurs de lecture les plus fréquentes :**

- **Confondre le sens du flux** — la `Response` est écrite par **l'IdP**, jamais par le SP. Les deux messages sont **toujours émis par un serveur à destination du navigateur** : le navigateur **porte**, il n'écrit pas.
- **Chercher la signature au mauvais endroit** — elle est **dans le nœud qu'elle protège**, pas forcément au niveau de la `Response`.
- **Décompresser une `SAMLResponse`** — elle n'est **jamais** compressée (binding POST). Seule la requête l'est (binding Redirect).
- **Lire la valeur du `NameID` avant son `Format`** — c'est le `Format` qui détermine **quelle règle de mapping** s'applique côté SP. Inverser l'ordre fait manquer la cause.
- **Croire que `RelayState` est optionnel** — s'il ne revient pas identique, le SP peut perdre la corrélation de session même si l'assertion est valide.

---

## Rappel

> [!question] Question de rappel
> Dans une capture, tu vois une `SAMLResponse` avec `StatusCode=Success`, une signature valide, un `InResponseTo` correct, et un `NameID Format="unspecified"` valant `alice@exemple.com`. L'application refuse l'utilisateur.
>
> **Où chercher, et pourquoi le SP ne peut-il pas corriger lui-même ?**

> [!success]- Réponse
> Le premier contrôle à faire n'est **pas** sur le format — il est sur **`NameID.Format` *puis* sa valeur**, dans cet ordre. Ici le format est `unspecified` : c'est le format le plus permissif, celui où **c'est l'IdP qui décide seul de la valeur**. Aucune contrainte n'a été posée par le demandeur.
>
> Le SP, lui, **ne peut pas transformer cette valeur**. Son mapping de NameID ne fait que dire **dans quel champ local ranger la valeur reçue** — il n'a **aucun moyen d'aller chercher une autre valeur ailleurs**. Il n'y a **pas de lookup caché** : la valeur qui entre est la valeur utilisée.
>
> Donc si la valeur ne correspond à aucun compte local, le correctif est **côté IdP** : c'est là que se décide **ce qui est émis**. Le SP n'a qu'un rôle de **réception et d'interprétation**.
>
> Le réflexe complet : `Status` → signature (et sur quel nœud !) → `NameID.Format` → `NameID` valeur → `Audience` → fenêtre temporelle → `Recipient` → attributs. Voir [[saml_nameid]] pour la mécanique de négociation et de mapping.

### 🎯 Le résumé à retenir

> [!tip] Si tu ne retiens qu'une chose
> **Deux messages, deux emballages, un sens de circulation.**
>
> - **`AuthnRequest`** (SP → navigateur → IdP) : **compressé** → URL-decode, base64-decode, **inflate**.
> - **`SAMLResponse`** (IdP → navigateur → SP) : **non compressé** → **base64-decode seul**.
> - **Le navigateur porte, il n'écrit jamais.** L'IdP écrit la réponse, le SP la lit.
>
> **Et le réflexe qui sauve :** `Status` d'abord, puis **la signature *et sur quel nœud* elle porte**, puis **`NameID.Format` avant sa valeur**, puis le reste.

---

## 🗣️ Révision entretien

> [!tip] En clair
> Les questions qui tombent, et la réponse courte qui fait mouche.

| Si on te demande… | Réponds… |
|---|---|
| **« Comment circule une assertion SAML ? »** | « Par le **navigateur de l'utilisateur** : l'IdP renvoie un formulaire HTML auto-soumis (binding **HTTP-POST**) vers l'ACS du SP. Le navigateur **porte** la preuve signée — il ne l'écrit jamais. » |
| **« Où se trouve la signature ? »** | « Dans le nœud qu'elle protège — **Response et/ou Assertion** — et **en premier** dans ce nœud. Seule l'assertion peut être signée : le SP doit savoir **où** chercher. » |
| **« Pourquoi SAML est-il critiqué côté sécurité ? »** | « Parce que ce qui traverse le navigateur n'est pas un code opaque mais **la preuve d'identité complète**. D'où : XSW (signature valide sur un **autre** nœud), rejeu d'assertion, XXE. » |
| **« C'est quoi l'ACS ? »** | « L'**Assertion Consumer Service** : l'endpoint du SP où arrive la Response. Une URL ACS mal configurée → rejet immédiat (`Recipient mismatch`). » |
| **« IdP-initiated, pourquoi c'est risqué ? »** | « Pas d'`InResponseTo` : le SP reçoit une assertion **sans avoir rien demandé**, donc aucune corrélation possible → **injection / rejeu** d'assertion. » |

> [!tip] La phrase qui tue
> **« SAML fait transiter la preuve elle-même sur le canal exposé — c'est ce qui explique sa surface d'attaque, et ce qu'OIDC a corrigé avec son architecture à deux jambes. »**

---

## Voir aussi

- [[saml2]] — le protocole : acteurs, assertion, bindings, Web SSO, attaques.
- [[saml_nameid]] — la négociation du format et le mapping : le cœur du diagnostic `NameID`.
- [[saml_attribute_mapping]] — les attributs (`AttributeStatement`) : émission, surcharge par SP, et autorisation.
- [[saml_vs_oidc]] — le comparatif : pourquoi OIDC a fait d'autres choix.
- [[state_login_csrf]] — le rôle de corrélation (`RelayState` / `InResponseTo`), côté OIDC.
- [[index]] — carte d'entrée du domaine SAML.

## Références

- OASIS SAML 2.0 — *Assertions and Protocols* (Core) : `AuthnRequest`, `Response`, `Assertion`.
- OASIS SAML 2.0 — *Bindings* : HTTP-Redirect (DEFLATE + Base64), HTTP-POST (Base64).
- OASIS SAML 2.0 — *Profiles* : Web Browser SSO, ACS.
- OASIS SAML 2.0 — *Metadata* : EntityID, endpoints, certificats.
