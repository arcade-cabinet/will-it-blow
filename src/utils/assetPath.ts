/** Prefix asset path with Vite's base URL for GitHub Pages compatibility. */
export function asset(path: string): string {
  const base = import.meta.env.BASE_URL;
  // Remove leading slash from path since base already ends with /
  const cleanPath = path.startsWith('/') ? path.slice(1) : path;
  return base + cleanPath;
}
