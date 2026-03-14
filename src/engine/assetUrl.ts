/**
 * Asset URL resolution for Vite builds.
 * Vite serves public/ at root, so paths are simply /<path>.
 * This module is kept for backward compatibility with tests.
 */

/** No-op in Vite — base path is always root. */
export function getWebBasePath(): string {
  return '';
}

/** Resolve a web asset URL under a subdirectory (e.g. 'models', 'textures') */
export function getAssetUrl(subdir: string, filename?: string): string {
  const suffix = filename ? `${subdir}/${filename}` : `${subdir}/`;
  return `/${suffix}`;
}
