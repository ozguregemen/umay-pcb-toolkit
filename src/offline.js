// Registers the service worker (sw.js) and, at most once a day, fetches every
// calculator and lesson in the background so the whole app works offline
// after the first visit. Failures are silent: offline use is an extra.

import { TOOLS } from './registry.js';
import { LESSONS } from './learn/index.js';

const STAMP = 'umay.offlineAt';
const DAY_MS = 24 * 3600 * 1000;

const idle = () => new Promise((resolve) => {
  if ('requestIdleCallback' in window) requestIdleCallback(() => resolve(), { timeout: 4000 });
  else setTimeout(resolve, 1500);
});

async function fillCache() {
  // Files this page has loaded already (most of them before the worker took
  // control), the shell, and every lesson: plain fetches the worker stores.
  const loaded = performance.getEntriesByType('resource').map((e) => e.name).filter((u) => u.startsWith(location.origin));
  const urls = new Set([
    ...loaded,
    new URL('./', location.href).href,
    new URL('index.html', location.href).href,
    new URL('manifest.webmanifest', location.href).href,
    ...LESSONS.map((l) => new URL(`src/learn/lessons/${l.id}.js`, location.href).href),
  ]);
  for (const url of urls) {
    await fetch(url).catch(() => {});
  }
  // Calculators: importing a page also pulls in the engine files it needs.
  for (const tool of TOOLS) {
    await idle();
    await tool.load().catch(() => {});
  }
}

export function initOffline() {
  if (!('serviceWorker' in navigator) || location.protocol === 'file:') return;
  window.addEventListener('load', async () => {
    try {
      await navigator.serviceWorker.register('sw.js');
      await navigator.serviceWorker.ready;
      if (!navigator.serviceWorker.controller) {
        await new Promise((resolve) => { navigator.serviceWorker.addEventListener('controllerchange', resolve, { once: true }); });
      }
      let last = 0;
      try { last = Number(localStorage.getItem(STAMP)) || 0; } catch { /* storage unavailable */ }
      if (Date.now() - last < DAY_MS) return;
      await idle();
      await fillCache();
      try { localStorage.setItem(STAMP, String(Date.now())); } catch { /* ignore */ }
    } catch { /* no offline support in this browser/context */ }
  });
}
