#!/usr/bin/env bash
# =============================================================================
# prepare-content.sh — Assemble le contenu du site pour un build LOCAL
#
# Reproduit exactement ce que fait le workflow GitHub Actions :
#   tout ce qui est dans docs/ est publie (page d'accueil + un dossier
#   par domaine, detection automatique), sauf la liste d'exclusion.
#
# Usage :
#   ./prepare-content.sh
#   cd quartz && node ./quartz/bootstrap-cli.mjs build --serve
# =============================================================================

set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CONTENT="$ROOT/quartz/content"

echo "Preparation du contenu..."
rm -rf "$CONTENT"
mkdir -p "$CONTENT"

# Dossiers de docs/ non publies
EXCLUDE=(.obsidian .git private templates)

shopt -s dotglob nullglob
for f in "$ROOT"/docs/*; do
  name="$(basename "$f")"
  skip=0
  for x in "${EXCLUDE[@]}"; do [[ "$name" == "$x" ]] && skip=1; done
  if [[ $skip -eq 1 ]]; then
    echo "  exclu    : $name"
    continue
  fi
  cp -r "$f" "$CONTENT/"
  echo "  publie   : $name"
done

echo "----------------------------------------"
echo "Fichiers Markdown publies : $(find "$CONTENT" -name '*.md' | wc -l)"
echo
echo "Pour lancer le site en local :"
echo "  cd quartz && node ./quartz/bootstrap-cli.mjs build --serve"
