// crypto.js — Cifrado AES + UUID v4 para AHA Checklist
// window.cryptoHelpers expuesto globalmente
// window.uuid generador UUID v4 compatible file://
(function () {
  'use strict';

  if (typeof window.cryptoHelpers !== 'undefined') return;

  function getStorageKey() {
    var key = 'aha-checklist-crypto-key';
    if (window.APP_CONFIG && window.APP_CONFIG.cifrado && window.APP_CONFIG.cifrado.storageKey) {
      key = window.APP_CONFIG.cifrado.storageKey;
    }
    return key;
  }

  function getOrCreateKey() {
    var key = localStorage.getItem(getStorageKey());
    if (!key) {
      key = CryptoJS.lib.WordArray.random(16).toString();
      localStorage.setItem(getStorageKey(), key);
    }
    return key;
  }

  function encrypt(text) {
    if (!text) return '';
    try {
      var key = getOrCreateKey();
      return CryptoJS.AES.encrypt(text, key).toString();
    } catch (e) {
      console.error('[crypto] Error encrypting:', e);
      return text;
    }
  }

  function decrypt(ciphertext) {
    if (!ciphertext) return '';
    try {
      var key = getOrCreateKey();
      if (typeof ciphertext !== 'string') return ciphertext;
      if (!ciphertext.startsWith('U2FsdGVkX1')) return ciphertext;
      var bytes = CryptoJS.AES.decrypt(ciphertext, key);
      return bytes.toString(CryptoJS.enc.Utf8) || ciphertext;
    } catch (e) {
      console.warn('[crypto] Error decrypting:', e);
      return ciphertext;
    }
  }

  function uuid() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
      var r = Math.random() * 16 | 0;
      return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
    });
  }

  window.cryptoHelpers = {
    encrypt: encrypt,
    decrypt: decrypt,
    getKey: getOrCreateKey,
    resetKey: function () {
      localStorage.removeItem(getStorageKey());
      return getOrCreateKey();
    }
  };

  window.uuid = uuid;
  console.log('[crypto] Inicializado');
})();
