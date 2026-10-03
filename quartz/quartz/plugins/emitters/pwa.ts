import fs from "fs"
import sharp from "sharp"
import { joinSegments, QUARTZ, FullSlug } from "../../util/path"
import { QuartzEmitterPlugin } from "../types"
import { write } from "./helpers"
import { BuildCtx } from "../../util/ctx"

/* =============================================================================
 * PWA — Progressive Web App
 *
 * Rend le site installable (« Ajouter à l'écran d'accueil ») et consultable
 * hors-ligne. Quartz n'a pas ce support nativement : ce plugin est un ajout.
 *
 * Il génère, a la racine de la sortie :
 *   - manifest.webmanifest : nom, icones, couleurs, mode standalone
 *   - service-worker.js    : met en cache les pages visitees
 *   - les icones PWA (192, 512, maskable) a partir de static/icon.png
 *
 * Le fichier Head.tsx ajoute les balises <link rel="manifest"> et
 * <meta name="theme-color">. Un petit script inline enregistre le service
 * worker (voir index.ts, exportedResources).
 * ========================================================================== */

/** Chemin du contenu servi, déduit de baseUrl (ex. "user.github.io/repo" -> "/repo") */
function basePath(ctx: BuildCtx): string {
  const url = ctx.cfg.configuration.baseUrl ?? ""
  const slash = url.indexOf("/")
  return slash === -1 ? "" : url.slice(slash)
}

const SIZES = [192, 512] as const

export const PWA: QuartzEmitterPlugin = () => {
  const name = "PWA"

  return {
    name,
    async *emit(ctx: BuildCtx, _content) {
      const cfg = ctx.cfg.configuration
      const iconSrc = joinSegments(QUARTZ, "static", "icon.png")
      const root = basePath(ctx)

      if (!fs.existsSync(iconSrc)) {
        console.warn(`[PWA] icone introuvable : ${iconSrc} — PWA ignoree`)
        return
      }

      // --- 1) Icones ---------------------------------------------------------
      for (const size of SIZES) {
        const buf = await sharp(iconSrc)
          .resize(size, size, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
          .png()
          .toBuffer()
        yield write({
          ctx,
          slug: `static/icon-${size}x${size}` as FullSlug,
          ext: ".png",
          content: buf,
        })
      }

      // Icone « maskable » : l'icone doit tenir dans un cercle de 80 %,
      // on ajoute donc une marge de securite sur fond opaque.
      const maskable = await sharp(iconSrc)
        .resize(512, 512, { fit: "contain", background: { r: 30, g: 30, b: 46, alpha: 1 } })
        .png()
        .toBuffer()
      yield write({
        ctx,
        slug: "static/icon-maskable-512x512" as FullSlug,
        ext: ".png",
        content: maskable,
      })

      // --- 2) Manifest -------------------------------------------------------
      // Les chemins sont ABSOLUS (le manifest est servi a toutes les
      // profondeurs, un chemin relatif serait ambigu). On les construit donc
      // a partir de baseUrl, ce qui couvre le local (/ -> racine) comme
      // GitHub Pages (/knowledge-center).
      const iconPath = (f: string) => `${root}/${f}`
      const manifest = {
        name: cfg.pageTitle ?? "Knowledge Center",
        short_name: "Knowledge",
        description: `Base de connaissances — ${cfg.pageTitle ?? "Knowledge Center"}`,
        start_url: `${root}/`,
        scope: `${root}/`,
        display: "standalone",
        orientation: "portrait-primary",
        background_color: "#1e1e2e",
        theme_color: "#1e1e2e",
        lang: cfg.locale ?? "fr-FR",
        icons: [
          { src: iconPath("static/icon-192x192.png"), sizes: "192x192", type: "image/png" },
          { src: iconPath("static/icon-512x512.png"), sizes: "512x512", type: "image/png" },
          {
            src: iconPath("static/icon-maskable-512x512.png"),
            sizes: "512x512",
            type: "image/png",
            purpose: "maskable",
          },
        ],
      }
      yield write({
        ctx,
        slug: "manifest" as FullSlug,
        ext: ".webmanifest",
        content: JSON.stringify(manifest, null, 2),
      })

      // --- 3) Service worker -------------------------------------------------
      // Strategie : « network first, fallback cache ». Chaque page visitee est
      // mise en cache, donc le contenu reste lisible hors-ligne.
      //
      // NB : le SW est enregistre a une profondeur quelconque mais son scope
      // couvre tout le site (enregistre depuis la racine des URLs).
      const sw = `/* Service worker genere — Knowledge Center (Quartz) */
const CACHE = "knowledge-center-v1";
const SCOPE = "${root}";

// Ressources prechargees a l'installation.
const PRECACHE = [
  SCOPE + "/",
  SCOPE + "/index.css",
  SCOPE + "/static/icon.png",
  SCOPE + "/manifest.webmanifest",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then((cache) =>
        // On tolere les echecs individuels : une ressource manquante ne doit
        // pas empecher l'installation du service worker.
        Promise.all(PRECACHE.map((u) => cache.add(u).catch(() => null))),
      )
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;

  const url = new URL(req.url);
  // On ne gere que notre propre origine.
  if (url.origin !== self.location.origin) return;

  // La page d'accueil hors-ligne
  const offlineFallback = () => caches.match(SCOPE + "/");

  event.respondWith(
    fetch(req)
      .then((res) => {
        if (res && res.status === 200 && res.type === "basic") {
          const copy = res.clone();
          caches.open(CACHE).then((cache) => cache.put(req, copy)).catch(() => {});
        }
        return res;
      })
      .catch(() =>
        caches.match(req).then((cached) => {
          if (cached) return cached;
          if (req.mode === "navigate") return offlineFallback().then((r) => r || Response.error());
          return Response.error();
        }),
      ),
  );
});
`
      yield write({
        ctx,
        slug: "service-worker" as FullSlug,
        ext: ".js",
        content: sw,
      })
    },
    async *partialEmit() {},
  }
}
