#!/usr/bin/env bash
# =============================================================================
# prepare-content.sh — Assemble le contenu du site pour un build LOCAL
#
# Reproduit exactement ce que fait le workflow GitHub Actions :
#   - copie la page d'accueil (index.md)
#   - copie TOUS les dossiers de domaines (detection automatique)
#   - sauf ceux de la liste d'exclusion
#
# Usage :
#   ./prepare-content.sh              # assemble le contenu
#   cd quartz && npx quartz build --serve   # puis lance le site en local
# =============================================================================

set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CONTENT="$ROOT/quartz/content"

echo "Preparation du contenu..."
rm -rf "$CONTENT"
mkdir -p "$CONTENT"

# Page d'accueil du site
cp "$ROOT/index.md" "$CONTENT/index.md"

# Dossiers exclus du site (moteur, outillage, notes internes, local)
EXCLUDE="^(quartz|\.git|\.github|\.obsidian|music_project|node_modules|public)$"

cd "$ROOT"
for d in */; do
  name="${d%/}"
  if [[ "$name" =~ $EXCLUDE ]]; then
    echo "  exclu    : $name"
    continue
  fi
  cp -r "$name" "$CONTENT/"
  echo "  publie   : $name"
done

echo "----------------------------------------"
echo "Fichiers Markdown publies : $(find "$CONTENT" -name '*.md' | wc -l)"
echo
echo "Pour lancer le site en local :"
echo "  cd quartz && node ./quartz/bootstrap-cli.mjs build --serve"
