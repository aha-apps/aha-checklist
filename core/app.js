// app.js — Router hash-based + carga de módulos
// window.appRouter expuesto globalmente
(function () {
  'use strict';

  if (typeof window.appRouter !== 'undefined') return;

  var currentModulo = null;
  var currentHash = '';
  var contentEl = null;
  var sidebarLinks = null;
  var initialized = false;

  function init() {
    if (initialized) return;
    initialized = true;

    contentEl = document.getElementById('app-content');
    if (!contentEl) {
      console.warn('[app] #app-content no encontrado');
      return;
    }

    sidebarLinks = document.querySelectorAll('[data-module]');
    for (var i = 0; i < sidebarLinks.length; i++) {
      sidebarLinks[i].addEventListener('click', function (e) {
        var id = this.getAttribute('data-module');
        if (id) navigate(id);
      });
    }

    window.addEventListener('hashchange', onHashChange);
    onHashChange();

    // PWA
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('./sw.js?v=' + (window.DB_VERSION || 1))
        .then(function (reg) { console.log('[SW] Registrado:', reg.scope); })
        .catch(function (err) { console.warn('[SW] Error:', err); });
    }

    // Online/Offline
    window.addEventListener('online', function () {
      document.body.classList.remove('offline');
      var badge = document.getElementById('offline-badge');
      if (badge) badge.classList.add('hidden');
    });
    window.addEventListener('offline', function () {
      document.body.classList.add('offline');
      var badge = document.getElementById('offline-badge');
      if (badge) badge.classList.remove('hidden');
    });
    if (!navigator.onLine) {
      document.body.classList.add('offline');
    }
  }

  function navigate(moduloId, params) {
    params = params || {};
    var hash = '#/' + moduloId;
    if (Object.keys(params).length > 0) {
      hash += '?' + new URLSearchParams(params).toString();
    }
    if (window.location.hash !== hash) {
      window.location.hash = hash;
    } else {
      loadModule(moduloId, params);
    }
  }

  function onHashChange() {
    var hash = window.location.hash || '#/';
    var match = hash.match(/^#\/([^?]+)(?:\?(.*))?/);
    var moduleId = match ? match[1] : '';
    var params = {};
    if (match && match[2]) {
      try {
        params = Object.fromEntries(new URLSearchParams(match[2]));
      } catch (e) {}
    }
    if (moduleId !== currentHash) {
      currentHash = moduleId;
      loadModule(moduleId, params);
    }
  }

  function loadModule(moduloId, params) {
    params = params || {};
    if (currentModulo && currentModulo.destroy) {
      try { currentModulo.destroy(); } catch (e) { console.warn('[app] destroy error:', e); }
    }
    currentModulo = null;

    if (sidebarLinks) {
      for (var i = 0; i < sidebarLinks.length; i++) {
        sidebarLinks[i].classList.toggle('active', sidebarLinks[i].getAttribute('data-module') === moduloId);
      }
    }

    // Dashboard page
    if (!moduloId) {
      loadDashboard();
      return;
    }

    var mod = window.MODULES && window.MODULES[moduloId];
    if (!mod) {
      contentEl.innerHTML =
        '<div class="flex flex-col items-center justify-center py-20 text-base-content/50">' +
          '<i class="bi bi-box-seam text-6xl mb-4"></i>' +
          '<p class="text-lg">M\u00f3dulo no encontrado</p>' +
          '<p class="text-sm mt-1">' + moduloId + '</p>' +
        '</div>';
      return;
    }

    try {
      if (mod.render) {
        contentEl.innerHTML = '<div class="animate__animated animate__fadeIn">' + mod.render(params) + '</div>';
      } else {
        contentEl.innerHTML = '<p class="text-base-content/50">M\u00f3dulo sin vista</p>';
      }
      if (mod.init) mod.init();
      currentModulo = mod;
    } catch (e) {
      contentEl.innerHTML =
        '<div class="alert alert-error shadow-lg mt-4">' +
          '<i class="bi bi-exclamation-triangle"></i>' +
          '<span>Error al cargar: ' + e.message + '</span>' +
        '</div>';
      console.error('[app] Error loading ' + moduloId + ':', e);
    }
  }

  function loadDashboard() {
    if (!contentEl) return;
    contentEl.innerHTML =
      '<div class="animate__animated animate__fadeIn">' +
        '<div class="flex items-center justify-between mb-6">' +
          '<h2 class="text-2xl font-bold flex items-center gap-2"><i class="bi bi-speedometer2 text-primary"></i> Dashboard</h2>' +
          '<span id="offline-badge" class="badge badge-error gap-1 hidden"><i class="bi bi-wifi-off"></i> Sin conexi\u00f3n</span>' +
        '</div>' +
        '<div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6" x-data="dashboardStats()" x-init="init()">' +
          '<div class="stat bg-base-100 rounded-xl shadow-sm border border-base-200 p-4">' +
            '<div class="stat-figure text-primary"><i class="bi bi-collection text-3xl"></i></div>' +
            '<div class="stat-title text-sm">Plantillas</div>' +
            '<div class="stat-value text-2xl text-primary" x-text="stats.plantillas || \'...\'"></div>' +
          '</div>' +
          '<div class="stat bg-base-100 rounded-xl shadow-sm border border-base-200 p-4">' +
            '<div class="stat-figure text-secondary"><i class="bi bi-clipboard-check text-3xl"></i></div>' +
            '<div class="stat-title text-sm">Inspecciones Hoy</div>' +
            '<div class="stat-value text-2xl text-secondary" x-text="stats.inspeccionesHoy || \'...\'"></div>' +
          '</div>' +
          '<div class="stat bg-base-100 rounded-xl shadow-sm border border-base-200 p-4">' +
            '<div class="stat-figure text-accent"><i class="bi bi-geo-alt text-3xl"></i></div>' +
            '<div class="stat-title text-sm">Ubicaciones</div>' +
            '<div class="stat-value text-2xl text-accent" x-text="stats.ubicaciones || \'...\'"></div>' +
          '</div>' +
          '<div class="stat bg-base-100 rounded-xl shadow-sm border border-base-200 p-4">' +
            '<div class="stat-figure text-warning"><i class="bi bi-exclamation-triangle text-3xl"></i></div>' +
            '<div class="stat-title text-sm">Con Fallas</div>' +
            '<div class="stat-value text-2xl text-warning" x-text="stats.conFallos || \'...\'"></div>' +
          '</div>' +
        '</div>' +
      '</div>';

    // Init dashboard stats Alpine
    (function () {
      if (typeof Alpine === 'undefined') return;
      Alpine.data('dashboardStats', function () {
        return {
          stats: { plantillas: '...', inspeccionesHoy: '...', ubicaciones: '...', conFallos: '...' },
          async init() {
            try {
              var hoy = new Date();
              hoy.setHours(0, 0, 0, 0);
              var manana = new Date(hoy);
              manana.setDate(manana.getDate() + 1);
              var p = db.plantillas ? await db.plantillas.count() : 0;
              var i = db.inspecciones ? await db.inspecciones.where('createdAt').above(hoy.toISOString()).count() : 0;
              var u = db.ubicaciones ? await db.ubicaciones.count() : 0;
              var f = db.inspecciones ? await db.inspecciones.where('resultado').equals('rechazado').count() : 0;
              this.stats = { plantillas: p, inspeccionesHoy: i, ubicaciones: u, conFallos: f };
            } catch (e) { console.error('Dashboard stats error:', e); }
          }
        };
      });
    })();
  }

  window.appRouter = {
    init: init,
    navigate: navigate,
    getCurrent: function () { return currentHash; },
    getModulo: function () { return currentModulo; },
    isOnline: function () { return navigator.onLine; }
  };

  document.addEventListener('DOMContentLoaded', function () {
    setTimeout(init, 100);
  });

  console.log('[app] Router listo');
})();
