// project.config.js — Configuración de AHA Checklist
window.APP_CONFIG = {
  app: {
    id: 'aha-checklist',
    nombre: 'AHA Checklist',
    version: '1.0.0',
    tipo: 'checklist',
    descripcion: 'Inspecciones y checklists técnicos offline'
  },
  perfil: 'lite',
  plan: 'lite',
  modulosActivos: ['plantillas', 'inspecciones', 'ubicaciones', 'reportes'],
  tema: {
    modo: 'light',
    colores: {
      primary: '#eab308',
      secondary: '#854d0e',
      accent: '#fef08a',
      neutral: '#292524',
      'base-100': '#ffffff',
      'base-200': '#fefce8',
      'base-300': '#fef9c3',
      info: '#3b82f6',
      success: '#22c55e',
      warning: '#eab308',
      error: '#ef4444'
    },
    tipografia: {
      familia: 'Inter, system-ui, sans-serif',
      escala: {
        h1: '2.25rem',
        h2: '1.5rem',
        h3: '1.25rem',
        base: '1rem',
        small: '0.875rem',
        xs: '0.75rem'
      }
    },
    radius: '1rem',
    sombra: '0 4px 6px -1px rgb(0 0 0 / 0.1)'
  },
  cifrado: {
    camposSensibles: ['notas', 'observaciones'],
    storageKey: 'aha-checklist-crypto-key'
  },
  iaJutia: {
    perfil: false
  },
  modulos: {
    plantillas: { titulo: 'Plantillas', icono: 'bi bi-collection', activo: true },
    inspecciones: { titulo: 'Inspecciones', icono: 'bi bi-clipboard-check', activo: true },
    ubicaciones: { titulo: 'Ubicaciones y Equipos', icono: 'bi bi-geo-alt', activo: true },
    reportes: { titulo: 'Reportes', icono: 'bi bi-bar-chart', activo: true }
  },
  data: {
    dir: 'data/',
    maxFileSize: 10485760,
    tipos: ['avatar', 'foto', 'doc', 'logo', 'backup'],
    avatars: {
      default: 'data/defaults/avatar.svg',
      size: 200,
      calidad: 0.8
    }
  },
  sync: {
    primaryFormat: 'json',
    secondaryFormats: [],
    includeFiles: true,
    encrypt: true,
    maxExportSize: 52428800
  },
  ui: {
    formsMode: 'modal',
    alerts: 'toast',
    confirmDelete: true,
    avatars: false,
    avatarDefault: 'data/defaults/avatar.svg'
  },
  cliente: null
};
