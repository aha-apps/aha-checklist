// module.js — Módulo de Ubicaciones y Equipos para AHA Checklist
(function () {
  'use strict';

  var Ubicaciones = {
    id: 'ubicaciones',
    titulo: 'Ubicaciones y Equipos',
    icono: 'bi bi-geo-alt',

    init: function () {
      console.log('[ubicaciones] Inicializado');
    },

    render: function (params) {
      return document.getElementById('ubicaciones-template').innerHTML;
    },

    destroy: function () {}
  };

  window.MODULES = window.MODULES || {};
  window.MODULES.ubicaciones = Ubicaciones;

  // ─── Alpine Data ──────────────────────────────────────
  document.addEventListener('alpine:init', function () {
    if (typeof Alpine === 'undefined') return;

    Alpine.data('ubicacionesData', function () {
      return {
        items: [],       // ubicaciones
        equipos: [],     // todos los equipos
        busqueda: '',
        cargando: true,
        tab: 'ubicaciones',  // 'ubicaciones' | 'equipos'
        equipoHistorial: null,

        get filtrados() {
          var q = this.busqueda.toLowerCase().trim();
          if (this.tab === 'ubicaciones') {
            if (!q) return this.items;
            return this.items.filter(function (i) {
              return i.nombre.toLowerCase().indexOf(q) !== -1 ||
                     (i.area || '').toLowerCase().indexOf(q) !== -1;
            });
          } else {
            if (!q) return this.equipos;
            return this.equipos.filter(function (i) {
              return i.nombre.toLowerCase().indexOf(q) !== -1 ||
                     (i.codigo || '').toLowerCase().indexOf(q) !== -1;
            });
          }
        },

        getUbicacionName: function (id) {
          if (!id) return '---';
          for (var i = 0; i < this.items.length; i++) {
            if (this.items[i].id === id) return this.items[i].nombre;
          }
          return '---';
        },

        async init() {
          this.cargando = true;
          await this.cargarDatos();
          this.cargando = false;
        },

        async cargarDatos() {
          try {
            this.items = await db.ubicaciones.toArray();
            this.equipos = await db.equipos.toArray();
          } catch (e) {
            UI.toast('Error al cargar datos', 'error');
          }
        },

        // ─── CRUD Ubicaciones ──────────────────────────
        async abrirFormUbicacion(ubicacion) {
          var editando = !!ubicacion;
          window._modalFormData = {
            nombre: ubicacion ? ubicacion.nombre : '',
            area: ubicacion ? ubicacion.area : ''
          };

          var html =
            '<div class="space-y-4">' +
              '<label class="form-control w-full">' +
                '<span class="label-text">Nombre de la ubicaci\u00f3n</span>' +
                '<input type="text" x-model="form.nombre" required class="input input-bordered w-full" placeholder="Ej: Edificio A - Planta Baja" />' +
              '</label>' +
              '<label class="form-control w-full">' +
                '<span class="label-text">\u00c1rea / Zona</span>' +
                '<input type="text" x-model="form.area" class="input input-bordered w-full" placeholder="Ej: Edificio A, Taller, Almac\u00e9n" />' +
              '</label>' +
            '</div>';

          await UI.modalForm(
            editando ? 'Editar Ubicaci\u00f3n' : 'Nueva Ubicaci\u00f3n',
            html,
            async function (data) {
              if (!data.nombre || !data.nombre.trim()) {
                UI.toast('El nombre es requerido', 'warning');
                throw new Error('Nombre requerido');
              }
              var registro = {
                id: ubicacion ? ubicacion.id : window.uuid(),
                nombre: data.nombre.trim(),
                area: data.area ? data.area.trim() : '',
                createdBy: APP_CONFIG && APP_CONFIG.usuarioActual || 'anon',
                createdAt: ubicacion ? ubicacion.createdAt : new Date(),
                updatedAt: new Date()
              };
              await db.ubicaciones.put(registro);
              UI.toast(editando ? 'Ubicaci\u00f3n actualizada' : 'Ubicaci\u00f3n creada', 'success');
              var ctx = Alpine.$data(document.querySelector('[x-data="ubicacionesData()"]'));
              if (ctx) { await ctx.cargarDatos(); }
            }
          );
        },

        async eliminarUbicacion(ubicacion) {
          var equiposEnUbicacion = this.equipos.filter(function (e) { return e.ubicacionId === ubicacion.id; });
          var msg = 'Eliminar "' + ubicacion.nombre + '"?';
          if (equiposEnUbicacion.length) {
            msg += ' Tambi\u00e9n se eliminar\u00e1n ' + equiposEnUbicacion.length + ' equipo(s) asociado(s).';
          }
          var ok = await UI.confirm(msg);
          if (!ok) return;
          try {
            // Eliminar equipos asociados
            for (var i = 0; i < equiposEnUbicacion.length; i++) {
              await db.equipos.delete(equiposEnUbicacion[i].id);
            }
            await db.ubicaciones.delete(ubicacion.id);
            UI.toast('Ubicaci\u00f3n eliminada', 'success');
            await this.cargarDatos();
          } catch (e) {
            UI.toast('Error: ' + e.message, 'error');
          }
        },

        // ─── CRUD Equipos ──────────────────────────────
        async abrirFormEquipo(equipo) {
          var editando = !!equipo;
          var ubicacionOpts = this.items.map(function (u) {
            return '<option value="' + u.id + '"' + (equipo && equipo.ubicacionId === u.id ? ' selected' : '') + '>' + u.nombre + '</option>';
          }).join('');

          window._modalFormData = {
            nombre: equipo ? equipo.nombre : '',
            codigo: equipo ? equipo.codigo : '',
            ubicacionId: equipo ? equipo.ubicacionId : (this.items.length ? this.items[0].id : ''),
            frecuencia: equipo ? equipo.frecuencia : 30
          };

          var html =
            '<div class="space-y-4">' +
              '<label class="form-control w-full">' +
                '<span class="label-text">Nombre del equipo</span>' +
                '<input type="text" x-model="form.nombre" required class="input input-bordered w-full" placeholder="Ej: Montacargas #1" />' +
              '</label>' +
              '<label class="form-control w-full">' +
                '<span class="label-text">C\u00f3digo</span>' +
                '<input type="text" x-model="form.codigo" required class="input input-bordered w-full" placeholder="Ej: MTG-001" />' +
              '</label>' +
              '<label class="form-control w-full">' +
                '<span class="label-text">Ubicaci\u00f3n</span>' +
                '<select x-model="form.ubicacionId" class="select select-bordered w-full">' +
                  ubicacionOpts +
                '</select>' +
              '</label>' +
              '<label class="form-control w-full">' +
                '<span class="label-text">Frecuencia de inspecci\u00f3n (d\u00edas)</span>' +
                '<input type="number" x-model="form.frecuencia" class="input input-bordered w-full" min="1" />' +
              '</label>' +
            '</div>';

          await UI.modalForm(
            editando ? 'Editar Equipo' : 'Nuevo Equipo',
            html,
            async function (data) {
              if (!data.nombre || !data.nombre.trim() || !data.codigo || !data.codigo.trim()) {
                UI.toast('Nombre y c\u00f3digo son requeridos', 'warning');
                throw new Error('Campos requeridos');
              }
              var registro = {
                id: equipo ? equipo.id : window.uuid(),
                nombre: data.nombre.trim(),
                codigo: data.codigo.trim(),
                ubicacionId: data.ubicacionId,
                frecuencia: parseInt(data.frecuencia) || 30,
                createdBy: APP_CONFIG && APP_CONFIG.usuarioActual || 'anon',
                createdAt: equipo ? equipo.createdAt : new Date(),
                updatedAt: new Date()
              };
              await db.equipos.put(registro);
              UI.toast(editando ? 'Equipo actualizado' : 'Equipo creado', 'success');
              var ctx = Alpine.$data(document.querySelector('[x-data="ubicacionesData()"]'));
              if (ctx) { await ctx.cargarDatos(); }
            }
          );
        },

        async eliminarEquipo(equipo) {
          var ok = await UI.confirm('Eliminar equipo "' + equipo.nombre + '" (' + equipo.codigo + ')?');
          if (!ok) return;
          try {
            await db.equipos.delete(equipo.id);
            UI.toast('Equipo eliminado', 'success');
            await this.cargarDatos();
          } catch (e) {
            UI.toast('Error: ' + e.message, 'error');
          }
        },

        // ─── Historial por equipo ──────────────────────
        async verHistorial(equipo) {
          this.equipoHistorial = equipo;
          var inspecciones = [];
          try {
            inspecciones = await db.inspecciones.where('equipoId').equals(equipo.id).toArray();
          } catch (e) {}

          var rows = inspecciones.map(function (ins) {
            var badges = {
              'aprobado': '<span class="badge badge-success badge-sm">Aprobado</span>',
              'rechazado': '<span class="badge badge-error badge-sm">Rechazado</span>',
              'observado': '<span class="badge badge-warning badge-sm">Observado</span>',
              'pendiente': '<span class="badge badge-ghost badge-sm">Pendiente</span>'
            };
            return (
              '<div class="flex items-center justify-between p-2 border-b border-base-200 last:border-0">' +
                '<div>' +
                  '<p class="text-sm">' + UI.formatDate(ins.createdAt) + '</p>' +
                '</div>' +
                '<div>' + (badges[ins.resultado] || badges.pendiente) + '</div>' +
              '</div>'
            );
          }).join('') || '<p class="text-sm text-base-content/40 py-4 text-center">Sin inspecciones registradas</p>';

          var html =
            '<div class="space-y-3">' +
              '<div class="bg-base-200 p-3 rounded-lg">' +
                '<p class="font-medium">' + equipo.nombre + '</p>' +
                '<p class="text-xs text-base-content/50">C\u00f3digo: ' + equipo.codigo + ' | Ubicaci\u00f3n: ' + this.getUbicacionName(equipo.ubicacionId) + ' | Frecuencia: cada ' + equipo.frecuencia + ' d\u00edas</p>' +
              '</div>' +
              '<p class="font-medium text-sm">Historial de inspecciones</p>' +
              '<div class="max-h-64 overflow-y-auto">' + rows + '</div>' +
            '</div>';

          var self = this;
          UI.modalForm(
            'Historial: ' + equipo.nombre,
            html,
            async function () { self.equipoHistorial = null; }
          );
        }
      };
    });
  });
})();
