// main.js — Punto de entrada de AHA Checklist
(function () {
  'use strict';

  if (typeof window.app !== 'undefined') return;

  var APP = {
    version: window.APP_CONFIG && window.APP_CONFIG.app
      ? (window.APP_CONFIG.app.version || '1.0.0') : '1.0.0',
    startedAt: new Date().toISOString(),
    ready: false
  };

  function init() {
    try {
      if (!window.db) throw new Error('core/db.js no cargado');
      if (!window.cryptoHelpers) throw new Error('core/crypto.js no cargado');
      if (!window.UI) throw new Error('core/ui.js no cargado');
      if (!window.appRouter) throw new Error('core/app.js no cargado');

      // Seed data
      if (window.cargarSeedData) {
        window.cargarSeedData();
      }

      window.appRouter.init();

      if (!window.location.hash || window.location.hash === '#') {
        var defaultModule = null;
        if (window.APP_CONFIG && window.APP_CONFIG.modulosActivos && window.APP_CONFIG.modulosActivos.length > 0) {
          defaultModule = window.APP_CONFIG.modulosActivos[0];
        } else if (window.MODULES) {
          var keys = Object.keys(window.MODULES);
          if (keys.length > 0) defaultModule = keys[0];
        }
        if (defaultModule) {
          window.appRouter.navigate(defaultModule);
        }
      }

      APP.ready = true;
      console.log('[main] App iniciada en ' + APP.startedAt);
      window.dispatchEvent(new CustomEvent('app-ready', { detail: APP }));
    } catch (e) {
      console.error('[main] Error de inicializaci\u00f3n:', e);
      var content = document.getElementById('app-content');
      if (content) {
        content.innerHTML =
          '<div class="flex flex-col items-center justify-center min-h-[60vh] text-center p-8">' +
            '<i class="bi bi-exclamation-triangle text-6xl text-error mb-4"></i>' +
            '<h2 class="text-2xl font-bold mb-2">Error al iniciar</h2>' +
            '<p class="text-base-content/60 mb-4">' + e.message + '</p>' +
            '<button class="btn btn-primary" onclick="location.reload()">' +
              '<i class="bi bi-arrow-clockwise"></i> Reintentar' +
            '</button>' +
          '</div>';
      }
    }
  }

  window.addEventListener('error', function (e) {
    console.error('[main] Error global:', e.error || e.message);
    if (window.UI && window.UI.toast) {
      window.UI.toast('Error inesperado: ' + (e.error ? e.error.message : e.message), 'error');
    }
  });

  window.addEventListener('unhandledrejection', function (e) {
    console.error('[main] Promesa no manejada:', e.reason);
    if (window.UI && window.UI.toast) {
      window.UI.toast('Error inesperado: ' + (e.reason ? e.reason.message : e), 'error');
    }
  });

  window.app = APP;

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
