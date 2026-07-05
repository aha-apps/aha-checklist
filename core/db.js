// db.js — Inicialización Dexie con tablas de AHA Checklist
// window.db expuesto globalmente
// window.DB_VERSION auto-gestionado
(function () {
  'use strict';

  if (typeof window.db !== 'undefined') return;

  var DB_NAME = 'aha-checklist';
  var SCHEMA = {};

  // Tablas de sistema
  SCHEMA._sync_log = 'id, *tabla, *operacion, *idRegistro, *estado, *fecha, *createdBy, createdAt';
  SCHEMA._ia_chats = 'id, *titulo, *modelo, *createdBy, createdAt, updatedAt';
  SCHEMA._ia_messages = 'id, *chatId, *rol, contenido, *createdBy, createdAt';
  SCHEMA._files = '&path, tipo, nombre, mime, size, hash, refCount, createdAt, updatedAt';
  SCHEMA._analytics = 'id, *page, *category, *action, *synced, *timestamp, createdAt';
  SCHEMA._file_blobs = '&path';

  // Tablas de negocio
  SCHEMA.plantillas = 'id, nombre, *categoriaId, *items, *createdBy, createdAt, updatedAt';
  SCHEMA.categorias_plantillas = 'id, nombre, createdAt, updatedAt';
  SCHEMA.ubicaciones = 'id, nombre, *area, *createdBy, createdAt, updatedAt';
  SCHEMA.equipos = 'id, nombre, *codigo, *ubicacionId, frecuencia, *createdBy, createdAt, updatedAt';
  SCHEMA.inspecciones = 'id, *plantillaId, *ubicacionId, *equipoId, *resultados, *fotos, *firma, resultado, *createdBy, createdAt, updatedAt';
  SCHEMA.programacion = 'id, *ubicacionId, *equipoId, *plantillaId, frecuencia, *proximaFecha, *ultimaFecha, *createdBy, createdAt, updatedAt';

  var db = new Dexie(DB_NAME);
  window.DB_VERSION = 1;
  db.version(window.DB_VERSION).stores(SCHEMA);

  window.db = db;
  console.log('[db] Inicializado: ' + DB_NAME);
})();
