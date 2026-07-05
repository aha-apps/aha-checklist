// sw.js — Service Worker offline-first para AHA Checklist
var CACHE = 'aha-checklist-v1';
var ASSETS = [
  '/',
  'index.html',
  'manifest.json',
  'core/env.js',
  'core/db.js',
  'core/crypto.js',
  'core/ui.js',
  'core/theme.js',
  'core/app.js',
  'core/file-store.js',
  'core/sync.js',
  'core/license.js',
  'core/main.js',
  'data/seed.js',
  'data/defaults/avatar.svg',
  'data/defaults/placeholder.svg',
  'modules/plantillas/module.js',
  'modules/plantillas/module.html',
  'modules/inspecciones/module.js',
  'modules/inspecciones/module.html',
  'modules/ubicaciones/module.js',
  'modules/ubicaciones/module.html',
  'modules/reportes/module.js',
  'modules/reportes/module.html'
];

self.addEventListener('install', function (e) {
  e.waitUntil(
    caches.open(CACHE).then(function (c) {
      return c.addAll(ASSETS);
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', function (e) {
  e.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(
        keys.filter(function (k) { return k !== CACHE; }).map(function (k) { return caches.delete(k); })
      );
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', function (e) {
  var req = e.request;
  if (req.mode === 'navigate') {
    e.respondWith(
      fetch(req).catch(function () { return caches.match('index.html'); })
    );
    return;
  }
  e.respondWith(
    caches.match(req).then(function (r) { return r || fetch(req); })
  );
});
