// FileStore — Gestión de archivos para Lite (Dexie blobs)
// window.FileStore expuesto globalmente
(function () {
  'use strict';

  if (typeof window.FileStore !== 'undefined') return;

  var PERFIL = window.APP_CONFIG && window.APP_CONFIG.perfil || 'lite';
  var DIR = window.APP_CONFIG && window.APP_CONFIG.data && window.APP_CONFIG.data.dir || 'data/';
  var MAX_SIZE = window.APP_CONFIG && window.APP_CONFIG.data && window.APP_CONFIG.data.maxFileSize || 10485760;
  var _objectUrls = {};

  function revokeUrl(url) {
    if (url && url.startsWith('blob:') && _objectUrls[url]) {
      URL.revokeObjectURL(url);
      delete _objectUrls[url];
    }
  }

  async function hashBlob(blob) {
    if (!window.crypto || !window.crypto.subtle || !window.crypto.subtle.digest) return '';
    try {
      var buf = await blob.arrayBuffer();
      var hash = await crypto.subtle.digest('SHA-256', buf);
      var hex = '';
      var bytes = new Uint8Array(hash);
      for (var i = 0; i < bytes.length; i++) {
        hex += bytes[i].toString(16).padStart(2, '0');
      }
      return hex;
    } catch (e) { return ''; }
  }

  window.FileStore = {
    APP_DATA_DIR: DIR,

    async save(tipo, nombre, blob) {
      if (blob.size > MAX_SIZE) throw new Error('Archivo excede ' + Math.round(MAX_SIZE / 1024 / 1024) + 'MB');
      var ext = nombre.split('.').pop();
      var id = window.uuid();
      var path = tipo + '/' + id + '.' + ext;
      var hash = await hashBlob(blob);

      await db._files.put({
        path: path, tipo: tipo, nombre: nombre, mime: blob.type, size: blob.size, hash: hash,
        refCount: 0, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString()
      });

      if (PERFIL === 'lite') {
        try {
          await db._file_blobs.put({ path: path, blob: blob });
        } catch (e) {
          await db._files.delete(path);
          throw e;
        }
        var url = URL.createObjectURL(blob);
        _objectUrls[url] = true;
        return { path: path, hash: hash, url: url };
      }

      return { path: path, hash: hash, url: '/' + DIR + path };
    },

    async getURL(path) {
      if (!path) return null;
      if (PERFIL === 'lite') {
        var entry = await db._file_blobs.get(path);
        if (!entry || !entry.blob) return null;
        var url = URL.createObjectURL(entry.blob);
        _objectUrls[url] = true;
        return url;
      }
      return '/' + DIR + path;
    },

    async read(path) {
      if (!path) return null;
      if (PERFIL === 'lite') {
        var entry = await db._file_blobs.get(path);
        return entry ? entry.blob : null;
      }
      return null;
    },

    async delete(path) {
      if (!path) return;
      if (PERFIL === 'lite') {
        await db._file_blobs.delete(path);
      }
      await db._files.delete(path);
    },

    async meta(path) {
      return path ? db._files.get(path) : null;
    },

    async cleanOrphans() {
      var orphans = await db._files.where('refCount').equals(0).toArray();
      for (var i = 0; i < orphans.length; i++) {
        await this.delete(orphans[i].path);
      }
      return orphans.length;
    },

    avatarDefault() {
      return window.APP_CONFIG && window.APP_CONFIG.data && window.APP_CONFIG.data.avatars && window.APP_CONFIG.data.avatars.default || 'data/defaults/avatar.svg';
    },

    revokeAll() {
      for (var url in _objectUrls) {
        if (_objectUrls.hasOwnProperty(url)) {
          URL.revokeObjectURL(url);
        }
      }
      _objectUrls = {};
    }
  };
})();
