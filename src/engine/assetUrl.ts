/**
 * Asset URL resolution for Vite builds.
 *
 * On GitHub Pages the app is served from a subdirectory (/will-it-blow/),
 * so all public/ asset paths must be prefixed with the Vite base URL.
 * `import.meta.env.BASE_URL` is '/' in dev and '/will-it-blow/' on Pages.
 */

/** Return the Vite base path (e.g. '/' or '/will-it-blow/'). */
export function getWebBasePath(): string {
  return import.meta.env.BASE_URL;
}

/**
 * Resolve a public asset URL under a subdirectory (e.g. 'models', 'textures').
 * Handles the base path so assets work on both localhost and GitHub Pages.
 *
 * @example
 *   getAssetUrl('models', 'kitchen.glb')  // '/will-it-blow/models/kitchen.glb'
 *   getAssetUrl('audio', 'chop_1.ogg')    // '/will-it-blow/audio/chop_1.ogg'
 *   getAssetUrl('textures')               // '/will-it-blow/textures/'
 */
export function getAssetUrl(subdir: string, filename?: string): string {
  const base = import.meta.env.BASE_URL; // always ends with '/'
  const suffix = filename ? `${subdir}/${filename}` : `${subdir}/`;
  return `${base}${suffix}`;
}
