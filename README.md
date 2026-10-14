# Knowledge Center

> 📖 **Site publié : <https://stephanethorng.github.io/knowledge-center/>**

Base de connaissances personnelle, construite progressivement et publiée automatiquement sur GitHub Pages.

---

## 🌐 Consulter le site

**➡️ <https://stephanethorng.github.io/knowledge-center/>**

Le site est reconstruit **automatiquement** à chaque `push` sur `main` (GitHub Action + Quartz).

---

## 🗂️ Contenu

Le contenu publié vit dans **`docs/`** — tout ce qui s'y trouve est publié.

| Dossier | Sujet | Notes |
|---|---|---|
| `docs/security/oidc/` | OAuth 2.0 et OpenID Connect | 26 |
| `docs/security/saml/` | SAML 2.0 (fédération historique) | 7 |
| `docs/security/iam/` | Gestion des identités et des accès | 5 |

Hors du dépôt et hors du site : `IDEA.md`, `music_project/`, `.obsidian/`.

---

## ✍️ Ajouter du contenu

1. Créer le fichier `.md` dans `docs/<domaine>/`.
2. Nom de fichier en **`snake_case`** ASCII (`[a-z0-9_]`).
3. Renseigner le **frontmatter** :

```yaml
---
title: "Titre affiché en français"
aliases: [Ancien nom, Synonyme]
tags: [domaine, theme]
domaine: securite/oidc
niveau: intermediaire
statut: draft
cree: 2026-10-14
sources: [Reference 1, Reference 2]
---
```

> ⚠️ **Toujours quoter le `title` s'il contient un `:`** — sinon le frontmatter YAML casse le build.
> ✅ `title: "Le NameID : politique et mapping"` · ❌ `title: Le NameID : politique et mapping`

4. Ajouter les liens `[[wikilinks]]` vers les notes liées, et référencer la nouvelle note dans le `index.md` du domaine.

---

## 🧱 Structure des notes

Chaque note suit le même gabarit :

1. 🧒 **Avant de commencer** — analogie du quotidien + tableau « mot technique / en clair ».
2. **Le contenu technique** — un encadré `> [!tip] En clair` en tête de chaque section.
3. **⚠️ Pièges fréquents** — 3 à 5 points.
4. 🎯 **Le résumé à retenir** — l'idée unique à emporter.
5. 🗣️ **Les questions qu'on te posera** — questions courtes, réponses courtes, « la phrase qui tue ».

---

## 🛠️ Technique

| Élément | Rôle |
|---|---|
| `quartz/` | moteur de rendu (Quartz 4) |
| `prepare-content.sh` | prépare le contenu avant le build |
| `.github/workflows/deploy.yml` | build + déploiement sur GitHub Pages |

Le site se redéploie à chaque `push` sur `main`.
