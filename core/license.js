// license.js — Sistema de licencias AHA (modo dev siempre abierto)
(function () {
  'use strict';

  if (typeof window.licenseLoaded !== 'undefined') return;
  window.licenseLoaded = true;

  window.APP_CONFIG = window.APP_CONFIG || {
    plan: 'lite',
    maxRecords: 30,
    canExport: false,
    iaTier: 'lite',
    canWhiteLabel: false,
    customer: null
  };

  window.APP_ID = 'aha-checklist';

  window.checkLicense = function () {
    if (typeof ENV === 'undefined' || ENV === 'development') {
      window.APP_CONFIG.plan = 'enterprise';
      window.APP_CONFIG.maxRecords = Infinity;
      window.APP_CONFIG.canExport = true;
      window.APP_CONFIG.iaTier = 'full';
      window.APP_CONFIG.canWhiteLabel = true;
      window.APP_CONFIG.customer = { name: 'DEV', business: 'Modo Desarrollo' };
      return Promise.resolve(true);
    }
    return Promise.resolve(true);
  };

  window.cargarLicencia = function () {
    return new Promise(function (resolve) {
      var input = document.createElement('input');
      input.type = 'file';
      input.accept = '.aha';
      input.onchange = function () {
        resolve(true);
      };
      input.click();
    });
  };
})();
