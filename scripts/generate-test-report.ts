/**
 * Walks `test-results/browser/` and produces a single HTML report
 * grouping screenshots by layer → feature → viewport.
 *
 *   test-results/browser/{layer}/{feature}/{viewport}[_step].png
 *     ↓
 *   test-results/browser/report.html
 *
 * Run: `pnpm report:browser`
 *
 * Designed to be opened directly in a browser. No build step, no
 * external assets — every screenshot is referenced via a relative
 * path so the report is portable to any zip / artifact upload.
 */
import {readdirSync, statSync, writeFileSync, existsSync} from 'node:fs';
import {join, relative, sep} from 'node:path';

const ROOT = join(process.cwd(), 'test-results', 'browser');
const OUTPUT = join(ROOT, 'report.html');

interface ScreenshotEntry {
  layer: string;
  feature: string;
  /** PNG filename basename, e.g. `desktop-1280.png` or `mobile-390_00-init.png`. */
  file: string;
  /** Path relative to the report HTML's location. */
  href: string;
}

function walk(dir: string, files: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    const st = statSync(full);
    if (st.isDirectory()) walk(full, files);
    else if (entry.endsWith('.png')) files.push(full);
  }
  return files;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function collectScreenshots(): ScreenshotEntry[] {
  if (!existsSync(ROOT)) return [];
  return walk(ROOT)
    .map(abs => {
      const rel = relative(ROOT, abs);
      const parts = rel.split(sep);
      if (parts.length < 3) return null;
      const [layer, feature, file] = parts;
      return {
        layer,
        feature,
        file,
        href: rel.split(sep).join('/'),
      } satisfies ScreenshotEntry;
    })
    .filter((x): x is ScreenshotEntry => x !== null && x.file !== 'report.html');
}

function groupBy<T, K extends string>(items: T[], key: (item: T) => K): Record<K, T[]> {
  const out = {} as Record<K, T[]>;
  for (const item of items) {
    const k = key(item);
    (out[k] ??= []).push(item);
  }
  return out;
}

function renderHtml(entries: ScreenshotEntry[]): string {
  const byLayer = groupBy(entries, e => e.layer);
  const layerOrder = ['unit', 'micro', 'meso', 'macro'];
  const sortedLayers = Object.keys(byLayer).sort(
    (a, b) => layerOrder.indexOf(a) - layerOrder.indexOf(b),
  );

  const layerSections = sortedLayers
    .map(layer => {
      const features = groupBy(byLayer[layer], e => e.feature);
      const featureSections = Object.keys(features)
        .sort()
        .map(feature => {
          const shots = features[feature].sort((a, b) => a.file.localeCompare(b.file));
          const cards = shots
            .map(
              s => `
        <figure class="shot">
          <a href="${escapeHtml(s.href)}" target="_blank" rel="noreferrer">
            <img loading="lazy" src="${escapeHtml(s.href)}" alt="${escapeHtml(s.file)}">
          </a>
          <figcaption>${escapeHtml(s.file.replace(/\.png$/, ''))}</figcaption>
        </figure>`,
            )
            .join('');
          return `
      <section class="feature">
        <h3>${escapeHtml(feature)}</h3>
        <div class="shots">${cards}</div>
      </section>`;
        })
        .join('');
      return `
    <section class="layer" id="layer-${escapeHtml(layer)}">
      <h2>${escapeHtml(layer)} <small>(${features ? Object.keys(features).length : 0} features, ${byLayer[layer].length} screenshots)</small></h2>
      ${featureSections}
    </section>`;
    })
    .join('');

  const totalShots = entries.length;
  const totalLayers = sortedLayers.length;

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>Will It Blow? — Browser Validation Report</title>
  <style>
    :root {
      color-scheme: dark;
      --bg: #0a0a0a;
      --panel: #1a1a1a;
      --border: #2a2a2a;
      --accent: #ff1744;
      --text: #f5f5f5;
      --muted: #888;
    }
    * { box-sizing: border-box; }
    body {
      font-family: 'Bangers', system-ui, sans-serif;
      background: var(--bg);
      color: var(--text);
      margin: 0;
      padding: 32px;
    }
    header {
      border-bottom: 4px solid var(--accent);
      padding-bottom: 16px;
      margin-bottom: 32px;
    }
    header h1 {
      font-size: 48px;
      margin: 0;
      letter-spacing: 4px;
      color: var(--accent);
      text-shadow: 0 0 12px rgba(255, 23, 68, 0.4);
    }
    header p {
      color: var(--muted);
      margin: 4px 0 0;
      font-family: system-ui, sans-serif;
    }
    .layer { margin-bottom: 48px; }
    .layer h2 {
      font-size: 32px;
      letter-spacing: 2px;
      color: var(--accent);
      border-left: 6px solid var(--accent);
      padding-left: 12px;
    }
    .layer h2 small {
      color: var(--muted);
      font-size: 14px;
      font-family: system-ui, sans-serif;
    }
    .feature {
      background: var(--panel);
      border: 1px solid var(--border);
      border-radius: 8px;
      padding: 16px;
      margin-bottom: 16px;
    }
    .feature h3 {
      margin: 0 0 12px;
      font-family: system-ui, sans-serif;
      font-size: 18px;
      color: var(--text);
    }
    .shots {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
      gap: 12px;
    }
    .shot {
      margin: 0;
      background: #000;
      border: 1px solid var(--border);
      border-radius: 4px;
      overflow: hidden;
      transition: border-color 0.15s, transform 0.15s;
    }
    .shot:hover {
      border-color: var(--accent);
      transform: scale(1.02);
    }
    .shot img {
      width: 100%;
      height: auto;
      display: block;
      background: #000;
    }
    .shot figcaption {
      font-family: 'JetBrains Mono', monospace;
      font-size: 11px;
      color: var(--muted);
      padding: 6px 8px;
    }
  </style>
</head>
<body>
  <header>
    <h1>WILL IT BLOW? — BROWSER VALIDATION REPORT</h1>
    <p>${totalShots} screenshots across ${totalLayers} layer${totalLayers === 1 ? '' : 's'} ·
       generated ${new Date().toISOString()}</p>
  </header>
  ${layerSections || '<p>No screenshots found. Run `pnpm test:browser` first.</p>'}
</body>
</html>
`;
}

function main(): void {
  const entries = collectScreenshots();
  const html = renderHtml(entries);
  writeFileSync(OUTPUT, html, 'utf8');
  console.log(`✔ wrote ${OUTPUT}`);
  console.log(`  ${entries.length} screenshot${entries.length === 1 ? '' : 's'}`);
  const layers = new Set(entries.map(e => e.layer));
  for (const layer of layers) {
    const count = entries.filter(e => e.layer === layer).length;
    console.log(`    ${layer}: ${count}`);
  }
}

main();
