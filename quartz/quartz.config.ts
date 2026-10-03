import { QuartzConfig } from "./quartz/cfg"
import * as Plugin from "./quartz/plugins"

/**
 * Quartz 4 — Configuration du Knowledge Center
 *
 * Voir https://quartz.jzhao.xyz/configuration pour la référence complète.
 */
const config: QuartzConfig = {
  configuration: {
    pageTitle: "Knowledge Center",
    pageTitleSuffix: "",
    enableSPA: true,
    enablePopovers: true,
    analytics: null,
    locale: "fr-FR",
    // Domaine de publication (GitHub Pages, site de projet)
    baseUrl: "stephaneThorng.github.io/knowledge-center",
    // Fichiers/dossiers ignorés par le build
    ignorePatterns: ["private", "templates", ".obsidian", "node_modules"],
    defaultDateType: "modified",
    theme: {
      fontOrigin: "googleFonts",
      cdnCaching: true,
      typography: {
        header: "Schibsted Grotesk",
        body: "Source Sans Pro",
        code: "IBM Plex Mono",
      },
      // ---------------------------------------------------------------------
      // Theme : Catppuccin  (https://catppuccin.com/palette)
      //   mode clair  = Latte
      //   mode sombre = Mocha
      // Voir le bloc PALETTES en fin de fichier pour changer de saveur.
      // ---------------------------------------------------------------------
      colors: {
        lightMode: {
          light: "#eff1f5", // Latte base      (fond)
          lightgray: "#ccd0da", // Latte surface0  (bordures)
          gray: "#9ca0b0", // Latte overlay0  (liens du graphe)
          darkgray: "#5c5f77", // Latte subtext1  (texte courant)
          dark: "#4c4f69", // Latte text      (titres)
          secondary: "#8839ef", // Latte mauve     (liens)
          tertiary: "#1e66f5", // Latte blue      (survol)
          highlight: "rgba(136, 57, 239, 0.10)",
          textHighlight: "#df8e1d55", // Latte yellow    (marqueur)
        },
        darkMode: {
          light: "#1e1e2e", // Mocha base
          lightgray: "#313244", // Mocha surface0
          gray: "#6c7086", // Mocha overlay0
          darkgray: "#a6adc8", // Mocha subtext0
          dark: "#cdd6f4", // Mocha text
          secondary: "#cba6f7", // Mocha mauve
          tertiary: "#89b4fa", // Mocha blue
          highlight: "rgba(203, 166, 247, 0.12)",
          textHighlight: "#f9e2af55", // Mocha yellow
        },
      },
    },
  },
  plugins: {
    transformers: [
      Plugin.FrontMatter(),
      Plugin.CreatedModifiedDate({
        priority: ["frontmatter", "git", "filesystem"],
      }),
      Plugin.SyntaxHighlighting({
        theme: {
          light: "github-light",
          dark: "github-dark",
        },
        keepBackground: false,
      }),
      // Gère les [[wikilinks]] et les callouts Obsidian > [!tip]
      Plugin.ObsidianFlavoredMarkdown({ enableInHtmlEmbed: false }),
      Plugin.GitHubFlavoredMarkdown(),
      Plugin.TableOfContents(),
      Plugin.CrawlLinks({ markdownLinkResolution: "shortest" }),
      Plugin.Description(),
      Plugin.Latex({ renderEngine: "katex" }),
    ],
    filters: [Plugin.RemoveDrafts()],
    emitters: [
      Plugin.AliasRedirects(),
      Plugin.ComponentResources(),
      Plugin.ContentPage(),
      Plugin.FolderPage(),
      Plugin.TagPage(),
      Plugin.ContentIndex({
        enableSiteMap: true,
        enableRSS: true,
      }),
      Plugin.Assets(),
      Plugin.Static(),
      Plugin.Favicon(),
      Plugin.NotFoundPage(),
      // Désactivé : ralentit fortement le build
      // Plugin.CustomOgImages(),
    ],
  },
}

export default config

// =============================================================================
// PALETTES CATPPUCCIN — reference
// https://catppuccin.com/palette
//
// Pour changer de saveur : remplacer les valeurs du bloc `colors` ci-dessus
// par celles de la variante voulue (garder la meme structure de 9 cles).
// =============================================================================
//
// --- LATTE (clair) — utilisee pour lightMode --------------------------------
//   light      base      #eff1f5
//   lightgray  surface0  #ccd0da
//   gray       overlay0  #9ca0b0
//   darkgray   subtext1  #5c5f77
//   dark       text      #4c4f69
//   secondary  mauve     #8839ef
//   tertiary   blue      #1e66f5
//
// --- MOCHA (sombre) — utilisee pour darkMode --------------------------------
//   light      base      #1e1e2e
//   lightgray  surface0  #313244
//   gray       overlay0  #6c7086
//   darkgray   subtext0  #a6adc8
//   dark       text      #cdd6f4
//   secondary  mauve     #cba6f7
//   tertiary   blue      #89b4fa
//
// --- FRAPPE (sombre, plus doux) ---------------------------------------------
//   base #303446 | surface0 #414559 | overlay0 #737994
//   subtext0 #a5adce | text #c6d0f5 | mauve #ca9ee6 | blue #8caaee
//
// --- MACCHIATO (sombre) -----------------------------------------------------
//   base #24273a | surface0 #363a4f | overlay0 #6e738d
//   subtext0 #a5adcb | text #cad3f5 | mauve #c6a0f6 | blue #8aadf4
//
// --- Autres accents Catppuccin (Mocha), pour varier --------------------------
//   lavender #b4befe   sapphire #74c7ec   sky #89dceb     teal #94e2d5
//   green #a6e3a1      yellow #f9e2af     peach #fab387    red #f38ba8
//   maroon #eba0ac     pink #f5c2e7       flamingo #f2cdcd rosewater #f5e0dc
