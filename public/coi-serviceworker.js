/*! coi-serviceworker v0.1.7 - Guido Zuidhof and contributors, licensed under MIT */
/*
 * Cross-Origin Isolation Service Worker
 *
 * This service worker intercepts all fetch requests and adds the required
 * Cross-Origin-Opener-Policy (COOP) and Cross-Origin-Embedder-Policy (COEP)
 * headers so that SharedArrayBuffer (required by WASM-based libraries like
 * canvaskit and potentially Rapier physics) works on GitHub Pages where we
 * cannot set server headers directly.
 *
 * Register in index.html:
 *   <script>
 *     if ('serviceWorker' in navigator) {
 *       navigator.serviceWorker.register('/will-it-blow/coi-serviceworker.js');
 *     }
 *   </script>
 */
let coepCredentialless = false;

if (typeof window === 'undefined') {
  // Service worker context
  self.addEventListener('install', () => self.skipWaiting());
  self.addEventListener('activate', (event) => event.waitUntil(self.clients.claim()));

  self.addEventListener('fetch', function (event) {
    const r = event.request;
    if (r.cache === 'only-if-cached' && r.mode !== 'same-origin') {
      return;
    }

    const request =
      coepCredentialless && r.mode === 'no-cors'
        ? new Request(r, { credentials: 'omit' })
        : r;

    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response.status === 0) {
            return response;
          }

          const newHeaders = new Headers(response.headers);
          newHeaders.set('Cross-Origin-Embedder-Policy',
            coepCredentialless ? 'credentialless' : 'require-corp'
          );
          newHeaders.set('Cross-Origin-Opener-Policy', 'same-origin');

          return new Response(response.body, {
            status: response.status,
            statusText: response.statusText,
            headers: newHeaders,
          });
        })
        .catch((e) => console.error(e))
    );
  });
} else {
  // Window context — register the service worker
  (() => {
    const reloadedBySelf = window.sessionStorage.getItem('coiReloadedBySelf');
    window.sessionStorage.removeItem('coiReloadedBySelf');

    const coepDegrading = reloadedBySelf === 'coepdegrade';

    // If already cross-origin isolated, nothing to do
    if (window.crossOriginIsolated !== false || coepDegrading) {
      return;
    }

    if (!window.isSecureContext) {
      console.log(
        'COOP/COEP Service Worker: Not a secure context, skipping registration.'
      );
      return;
    }

    // In some environments the service worker may already be registered
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker
        .register(new URL(import.meta.url).pathname)
        .then(
          (registration) => {
            registration.addEventListener('updatefound', () => {
              // A new service worker is installing; reload once it activates
              const newWorker = registration.installing;
              if (newWorker) {
                newWorker.addEventListener('statechange', () => {
                  if (newWorker.state === 'activated') {
                    window.sessionStorage.setItem('coiReloadedBySelf', 'coiReload');
                    window.location.reload();
                  }
                });
              }
            });

            // If the worker is already active, reload once to get COOP/COEP headers
            if (registration.active && !navigator.serviceWorker.controller) {
              window.sessionStorage.setItem('coiReloadedBySelf', 'coiReload');
              window.location.reload();
            }
          },
          (err) => {
            console.error('COOP/COEP Service Worker registration failed:', err);
          }
        );
    }
  })();
}
