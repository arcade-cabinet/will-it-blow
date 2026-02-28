import {Platform} from 'react-native';

/**
 * Derive the Expo web base path from the HTML document.
 * Checks for a <base> tag first, then falls back to extracting the path
 * prefix from Expo's script tags (which are reliably prefixed with
 * experiments.baseUrl from app.json).
 *
 * Returns '' when running on native or when no base path is detected
 * (i.e. deployed at the domain root).
 */
export function getWebBasePath(): string {
  if (typeof document === 'undefined') return '';
  // 1. Honour <base> tag if present
  const base = document.querySelector('base');
  if (base?.href) return new URL(base.href).pathname.replace(/\/$/, '');
  // 2. Fallback: Expo prefixes <script src> with experiments.baseUrl
  const script = document.querySelector('script[src*="/_expo/"]');
  const src = script?.getAttribute('src') ?? '';
  if (!src) return '';
  // Handle both absolute (https://...) and root-relative (/will-it-blow/...) src values
  const url = src.startsWith('http') ? new URL(src) : new URL(src, document.baseURI);
  // Strip the /_expo/... suffix to get just the base path
  const basePath = url.pathname.replace(/\/_expo\/.*$/, '');
  return basePath.replace(/\/$/, '');
}

/** Resolve a web asset URL under a subdirectory (e.g. 'models', 'textures') */
export function getAssetUrl(subdir: string, filename?: string): string {
  const basePath = Platform.OS === 'web' ? getWebBasePath() : '';
  const suffix = filename ? `${subdir}/${filename}` : `${subdir}/`;
  return `${basePath}/${suffix}`;
}
