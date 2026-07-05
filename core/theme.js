// theme.js — Inyección de CSS variables DaisyUI desde APP_CONFIG
// window.themeStore expuesto globalmente
(function () {
  'use strict';

  if (typeof window.themeStore !== 'undefined') return;

  var DAISYUI_MAP = {
    primary: '--p',
    secondary: '--s',
    accent: '--a',
    neutral: '--n',
    'base-100': '--b1',
    'base-200': '--b2',
    'base-300': '--b3',
    info: '--in',
    success: '--su',
    warning: '--wa',
    error: '--er'
  };

  function parseColor(hex) {
    hex = hex.replace('#', '');
    if (hex.length === 3) hex = hex[0] + hex[0] + hex[1] + hex[1] + hex[2] + hex[2];
    var r = parseInt(hex.substring(0, 2), 16);
    var g = parseInt(hex.substring(2, 4), 16);
    var b = parseInt(hex.substring(4, 6), 16);
    if (isNaN(r) || isNaN(g) || isNaN(b)) return null;
    return { r: r, g: g, b: b };
  }

  function hexToOklch(hex) {
    var c = parseColor(hex);
    if (!c) return null;
    var r = c.r / 255, g = c.g / 255, b = c.b / 255;
    r = r > 0.04045 ? Math.pow((r + 0.055) / 1.055, 2.4) : r / 12.92;
    g = g > 0.04045 ? Math.pow((g + 0.055) / 1.055, 2.4) : g / 12.92;
    b = b > 0.04045 ? Math.pow((b + 0.055) / 1.055, 2.4) : b / 12.92;
    var l = 0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b;
    var m = 0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b;
    var s = 0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b;
    l = Math.cbrt(l); m = Math.cbrt(m); s = Math.cbrt(s);
    var L = 0.2104542553 * l + 0.7936177850 * m - 0.0040720468 * s;
    var a = 1.9779984951 * l - 2.4285922050 * m + 0.4505937099 * s;
    var bChroma = 0.0259040371 * l + 0.7827717662 * m - 0.8086757660 * s;
    var C = Math.sqrt(a * a + bChroma * bChroma);
    var H = Math.atan2(bChroma, a) * (180 / Math.PI);
    if (H < 0) H += 360;
    L = Math.round(L * 100) / 100;
    C = Math.round(C * 100) / 100;
    H = Math.round(H * 100) / 100;
    if (isNaN(H)) H = 0;
    return L + ' ' + C + ' ' + H;
  }

  function getConfig() {
    var tema = window.APP_CONFIG && window.APP_CONFIG.tema;
    if (!tema) return null;
    return tema;
  }

  function applyTheme() {
    var config = getConfig();
    if (!config || !config.colores) return;
    var root = document.documentElement;
    var colores = config.colores;

    for (var key in colores) {
      if (colores.hasOwnProperty(key)) {
        var cssVar = DAISYUI_MAP[key];
        if (cssVar) {
          var hex = colores[key];
          var oklch = hexToOklch(hex);
          if (oklch) root.style.setProperty(cssVar, oklch);
        }
      }
    }
    if (config.tipografia && config.tipografia.familia) {
      root.style.setProperty('--font-family', config.tipografia.familia);
    }
    if (config.radius) root.style.setProperty('--radius-box', config.radius);

    if (config.modo === 'dark') {
      root.setAttribute('data-theme', 'dark');
      document.documentElement.classList.add('dark');
    } else {
      root.setAttribute('data-theme', 'light');
      document.documentElement.classList.remove('dark');
    }
  }

  window.themeStore = {
    config: getConfig(),
    apply: applyTheme,
    toggle: function () {
      var current = document.documentElement.getAttribute('data-theme');
      var next = current === 'dark' ? 'light' : 'dark';
      document.documentElement.setAttribute('data-theme', next);
      document.documentElement.classList.toggle('dark', next === 'dark');
      if (window.APP_CONFIG && window.APP_CONFIG.tema) {
        window.APP_CONFIG.tema.modo = next;
      }
    }
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', applyTheme);
  } else {
    applyTheme();
  }

  console.log('[theme] Inicializado');
})();
