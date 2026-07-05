// ui.js — API estándar de UI + helpers offline-first
// window.UI expuesto globalmente
(function () {
  'use strict';

  if (typeof window.UI !== 'undefined') return;

  // ─── Toast ───────────────────────────────────────────
  function showToast(msg, tipo, duracion) {
    tipo = tipo || 'info';
    duracion = duracion || 4000;
    var colors = { success: 'alert-success', error: 'alert-error', warning: 'alert-warning', info: 'alert-info' };
    var icons = { success: 'bi-check-circle-fill', error: 'bi-x-circle-fill', warning: 'bi-exclamation-triangle-fill', info: 'bi-info-circle-fill' };
    var container = document.getElementById('toast-container');
    if (!container) return;

    var el = document.createElement('div');
    el.setAttribute('role', 'alert');
    el.className = 'alert ' + (colors[tipo] || 'alert-info') + ' shadow-lg animate__animated animate__fadeInRight';
    el.innerHTML = '<i class="bi ' + (icons[tipo] || icons.info) + '"></i><span>' + msg + '</span>';
    container.appendChild(el);

    setTimeout(function () {
      el.classList.remove('animate__fadeInRight');
      el.classList.add('animate__fadeOutRight');
      setTimeout(function () { if (el.parentNode) el.parentNode.removeChild(el); }, 400);
    }, duracion);
  }

  // ─── Confirm ─────────────────────────────────────────
  function showConfirm(msg, titulo) {
    titulo = titulo || 'Confirmar';
    return new Promise(function (resolve) {
      var dialog = document.createElement('dialog');
      dialog.className = 'modal modal-open';
      dialog.setAttribute('role', 'alertdialog');
      dialog.setAttribute('aria-labelledby', 'confirm-title');
      dialog.innerHTML =
        '<div class="modal-box">' +
          '<h3 id="confirm-title" class="text-lg font-bold mb-2">' + titulo + '</h3>' +
          '<p class="py-4">' + msg + '</p>' +
          '<div class="modal-action">' +
            '<button class="btn btn-ghost" data-cancel>' +
              '<i class="bi bi-x-lg"></i> Cancelar' +
            '</button>' +
            '<button class="btn btn-error" data-confirm>' +
              '<i class="bi bi-check-lg"></i> Confirmar' +
            '</button>' +
          '</div>' +
        '</div>' +
        '<div class="modal-backdrop" data-cancel></div>';
      document.body.appendChild(dialog);

      function cleanup(result) {
        dialog.classList.remove('modal-open');
        setTimeout(function () {
          if (dialog.parentNode) dialog.parentNode.removeChild(dialog);
          resolve(result);
        }, 200);
      }

      dialog.querySelector('[data-confirm]').addEventListener('click', function () { cleanup(true); });
      var cancels = dialog.querySelectorAll('[data-cancel]');
      for (var i = 0; i < cancels.length; i++) {
        cancels[i].addEventListener('click', function () { cleanup(false); });
      }
      dialog.addEventListener('close', function () { cleanup(false); });
    });
  }

  // ─── Modal Form ──────────────────────────────────────
  function showModalForm(titulo, html, onSave) {
    onSave = onSave || function () {};
    var dialog = document.createElement('dialog');
    dialog.className = 'modal modal-open';
    dialog.setAttribute('role', 'dialog');
    dialog.setAttribute('aria-labelledby', 'modal-title');
    dialog.innerHTML =
      '<div class="modal-box max-w-2xl">' +
        '<h3 id="modal-title" class="text-lg font-bold mb-4">' + titulo + '</h3>' +
        '<div id="modal-form-body" x-data="formData" x-init="init()">' + html + '</div>' +
        '<div class="modal-action">' +
          '<button class="btn btn-ghost" data-cancel>' +
            '<i class="bi bi-x-lg"></i> Cancelar' +
          '</button>' +
          '<button class="btn btn-primary" data-save>' +
            '<i class="bi bi-check-lg"></i> Guardar' +
          '</button>' +
        '</div>' +
      '</div>' +
      '<div class="modal-backdrop" data-cancel></div>';
    document.body.appendChild(dialog);

    window.formData = {
      form: {},
      errors: {},
      saving: false,
      init: function () { this.form = window._modalFormData || {}; },
      validate: function () {
        this.errors = {};
        var form = this.form;
        var inputs = dialog.querySelectorAll('[x-model]');
        for (var i = 0; i < inputs.length; i++) {
          var model = inputs[i].getAttribute('x-model');
          var name = model ? model.replace('form.', '') : '';
          var required = inputs[i].hasAttribute('required');
          if (required && !form[name]) {
            this.errors[name] = 'Campo requerido';
          }
        }
        return Object.keys(this.errors).length === 0;
      }
    };

    dialog.querySelector('[data-save]').addEventListener('click', function () {
      var saveBtn = this;
      if (window.formData && typeof window.formData.validate === 'function') {
        if (!window.formData.validate()) {
          showToast('Corrige los errores antes de guardar', 'warning');
          return;
        }
      }
      saveBtn.disabled = true;
      saveBtn.innerHTML = '<span class="loading loading-spinner loading-sm"></span> Guardando...';

      function doCleanup() {
        dialog.classList.remove('modal-open');
        setTimeout(function () {
          if (dialog.parentNode) dialog.parentNode.removeChild(dialog);
          delete window.formData;
          delete window._modalFormData;
        }, 200);
      }

      function doFinally() {
        saveBtn.disabled = false;
        saveBtn.innerHTML = '<i class="bi bi-check-lg"></i> Guardar';
      }

      try {
        var promise = onSave(window.formData.form);
        if (promise && typeof promise.then === 'function') {
          promise.then(function () { doCleanup(); doFinally(); }, function (e) {
            showToast(e && e.message || 'Error al guardar', 'error');
            doFinally();
          });
        } else {
          doCleanup();
          doFinally();
        }
      } catch (e) {
        showToast(e && e.message || 'Error al guardar', 'error');
        doFinally();
      }
    });

    var cancels = dialog.querySelectorAll('[data-cancel]');
    for (var i = 0; i < cancels.length; i++) {
      cancels[i].addEventListener('click', function () {
        dialog.classList.remove('modal-open');
        setTimeout(function () {
          if (dialog.parentNode) dialog.parentNode.removeChild(dialog);
          delete window.formData;
          delete window._modalFormData;
        }, 200);
      });
    }
  }

  // ─── Loading Overlay ─────────────────────────────────
  var loadingCount = 0;
  var loadingEl = null;

  function showLoading(show, msg, progress) {
    if (show) {
      loadingCount++;
      if (loadingCount > 1) return;
      var el = document.createElement('div');
      el.id = 'ui-loading-overlay';
      el.setAttribute('role', 'status');
      el.setAttribute('aria-live', 'polite');
      var inner;
      if (progress != null && typeof progress === 'number' && progress >= 0 && progress <= 1) {
        var pct = Math.round(progress * 100);
        inner = '<div class="flex flex-col items-center gap-3"><progress class="progress progress-primary w-56" value="' + pct + '" max="100"></progress><p class="text-sm text-base-content/60">' + (msg || 'Cargando...') + '</p></div>';
      } else {
        inner = '<div class="flex flex-col items-center gap-3"><span class="loading loading-spinner loading-lg text-primary"></span><p class="text-sm text-base-content/60">' + (msg || 'Cargando...') + '</p></div>';
      }
      el.className = 'fixed inset-0 z-[70] flex items-center justify-center bg-base-300/50 backdrop-blur-sm animate__animated animate__fadeIn';
      el.innerHTML = inner;
      document.body.appendChild(el);
      loadingEl = el;
    } else {
      loadingCount = Math.max(0, loadingCount - 1);
      if (loadingCount === 0 && loadingEl) {
        loadingEl.classList.add('animate__fadeOut');
        setTimeout(function () {
          if (loadingEl && loadingEl.parentNode) loadingEl.parentNode.removeChild(loadingEl);
          loadingEl = null;
        }, 200);
      }
    }
  }

  // ─── Formateo ─────────────────────────────────────────
  function formatDate(date) {
    if (!date) return '';
    var d = new Date(date);
    if (isNaN(d.getTime())) return String(date);
    var meses = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
    return d.getDate() + ' ' + meses[d.getMonth()] + ' ' + d.getFullYear();
  }

  function formatCurrency(n) {
    if (n === null || n === undefined || isNaN(n)) return '$0.00';
    return '$' + Number(n).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  function formatBytes(bytes) {
    if (!bytes || bytes === 0) return '0 B';
    var units = ['B', 'KB', 'MB', 'GB'];
    var i = Math.floor(Math.log(bytes) / Math.log(1024));
    return (bytes / Math.pow(1024, i)).toFixed(i > 0 ? 1 : 0) + ' ' + units[i];
  }

  function formatRelative(date) {
    if (!date) return '';
    var d = new Date(date);
    if (isNaN(d.getTime())) return '';
    var diff = Date.now() - d.getTime();
    var abs = Math.abs(diff);
    var seg = Math.floor(abs / 1000);
    var min = Math.floor(seg / 60);
    var hor = Math.floor(min / 60);
    var dia = Math.floor(hor / 24);
    var mes = Math.floor(dia / 30);

    if (seg < 10) return 'ahora';
    if (seg < 60) return 'hace ' + seg + ' segundos';
    if (min < 60) return 'hace ' + min + ' min';
    if (hor < 24) return 'hace ' + hor + ' h';
    if (dia < 30) return 'hace ' + dia + ' d\u00edas';
    if (mes < 12) return 'hace ' + mes + ' meses';
    return 'hace ' + Math.floor(mes / 12) + ' a\u00f1os';
  }

  function skeleton(lines, opts) {
    opts = opts || {};
    var count = lines || 3;
    var html = '';
    for (var i = 0; i < count; i++) {
      html += '<div class="skeleton h-' + (opts.height || 4) + ' w-full mb-' + (opts.gap || 2) + '"></div>';
    }
    return html;
  }

  // ─── Export ───────────────────────────────────────────
  window.UI = {
    toast: showToast,
    confirm: showConfirm,
    modalForm: showModalForm,
    loading: showLoading,
    formatDate: formatDate,
    formatCurrency: formatCurrency,
    formatBytes: formatBytes,
    formatRelative: formatRelative,
    skeleton: skeleton
  };

  // ─── Toast container ─────────────────────────────────
  (function ensureContainer() {
    if (!document.getElementById('toast-container')) {
      var c = document.createElement('div');
      c.id = 'toast-container';
      c.setAttribute('aria-live', 'polite');
      c.className = 'toast toast-end toast-bottom z-[80]';
      document.body.appendChild(c);
    }
  })();
})();
