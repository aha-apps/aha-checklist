// module.js — Módulo de Inspecciones para AHA Checklist
(function () {
  'use strict';

  var Inspecciones = {
    id: 'inspecciones',
    titulo: 'Inspecciones',
    icono: 'bi bi-clipboard-check',

    init: function () {
      console.log('[inspecciones] Inicializado');
    },

    render: function (params) {
      return document.getElementById('inspecciones-template').innerHTML;
    },

    destroy: function () {}
  };

  window.MODULES = window.MODULES || {};
  window.MODULES.inspecciones = Inspecciones;

  // ─── Alpine Data ──────────────────────────────────────
  document.addEventListener('alpine:init', function () {
    if (typeof Alpine === 'undefined') return;

    Alpine.data('inspeccionesData', function () {
      return {
        items: [],
        plantillas: [],
        ubicaciones: [],
        equipos: [],
        busqueda: '',
        cargando: true,
        filtroEstado: '',

        get filtrados() {
          var q = this.busqueda.toLowerCase().trim();
          var f = this.filtroEstado;
          return this.items.filter(function (i) {
            if (f && i.resultado !== f) return false;
            if (!q) return true;
            return i.id.toLowerCase().indexOf(q) !== -1;
          });
        },

        getPlantillaName: function (id) {
          for (var i = 0; i < this.plantillas.length; i++) {
            if (this.plantillas[i].id === id) return this.plantillas[i].nombre;
          }
          return '---';
        },

        getUbicacionName: function (id) {
          for (var i = 0; i < this.ubicaciones.length; i++) {
            if (this.ubicaciones[i].id === id) return this.ubicaciones[i].nombre;
          }
          return '---';
        },

        getEquipoName: function (id) {
          if (!id) return '---';
          for (var i = 0; i < this.equipos.length; i++) {
            if (this.equipos[i].id === id) return this.equipos[i].nombre;
          }
          return '---';
        },

        badgeClass: function (r) {
          if (r === 'aprobado') return 'badge-success';
          if (r === 'rechazado') return 'badge-error';
          if (r === 'observado') return 'badge-warning';
          return 'badge-ghost';
        },

        async init() {
          this.cargando = true;
          await Promise.all([
            this.cargarPlantillas(),
            this.cargarUbicaciones(),
            this.cargarEquipos()
          ]);
          await this.cargarDatos();
          this.cargando = false;
        },

        async cargarPlantillas() {
          try { this.plantillas = await db.plantillas.toArray(); } catch (e) {}
        },

        async cargarUbicaciones() {
          try { this.ubicaciones = await db.ubicaciones.toArray(); } catch (e) {}
        },

        async cargarEquipos() {
          try { this.equipos = await db.equipos.toArray(); } catch (e) {}
        },

        async cargarDatos() {
          try {
            this.items = await db.inspecciones.toArray();
          } catch (e) {
            UI.toast('Error al cargar inspecciones', 'error');
          }
        },

        // ─── Nueva Inspección ──────────────────────────
        async nuevaInspeccion() {
          if (!this.plantillas.length) {
            UI.toast('Crea una plantilla primero', 'warning');
            return;
          }
          if (!this.ubicaciones.length) {
            UI.toast('Crea una ubicaci\u00f3n primero', 'warning');
            return;
          }

          var plantillaOpts = this.plantillas.map(function (p) {
            return '<option value="' + p.id + '">' + p.nombre + '</option>';
          }).join('');
          var ubicacionOpts = this.ubicaciones.map(function (u) {
            return '<option value="' + u.id + '">' + u.nombre + '</option>';
          }).join('');
          var equiposOpts = '<option value="">Sin equipo</option>' + this.equipos.map(function (e) {
            return '<option value="' + e.id + '">' + e.nombre + ' (' + e.codigo + ')</option>';
          }).join('');

          window._modalFormData = {
            plantillaId: this.plantillas[0].id,
            ubicacionId: this.ubicaciones[0].id,
            equipoId: '',
            proximaFecha: ''
          };

          var html =
            '<div class="space-y-4">' +
              '<label class="form-control w-full">' +
                '<span class="label-text">Plantilla</span>' +
                '<select x-model="form.plantillaId" class="select select-bordered w-full" required>' +
                  plantillaOpts +
                '</select>' +
              '</label>' +
              '<label class="form-control w-full">' +
                '<span class="label-text">Ubicaci\u00f3n</span>' +
                '<select x-model="form.ubicacionId" class="select select-bordered w-full" required>' +
                  ubicacionOpts +
                '</select>' +
              '</label>' +
              '<label class="form-control w-full">' +
                '<span class="label-text">Equipo (opcional)</span>' +
                '<select x-model="form.equipoId" class="select select-bordered w-full">' +
                  equiposOpts +
                '</select>' +
              '</label>' +
              '<label class="form-control w-full">' +
                '<span class="label-text">Pr\u00f3xima inspecci\u00f3n</span>' +
                '<input type="date" x-model="form.proximaFecha" class="input input-bordered w-full" />' +
              '</label>' +
            '</div>';

          await UI.modalForm(
            'Nueva Inspecci\u00f3n',
            html,
            async function (data) {
              if (!data.plantillaId || !data.ubicacionId) {
                UI.toast('Selecciona plantilla y ubicaci\u00f3n', 'warning');
                throw new Error('Campos requeridos');
              }

              // Cargar items de la plantilla seleccionada
              var plantilla = await db.plantillas.get(data.plantillaId);
              if (!plantilla) { UI.toast('Plantilla no encontrada', 'error'); return; }

              var items;
              try { items = typeof plantilla.items === 'string' ? JSON.parse(plantilla.items) : plantilla.items || []; }
              catch (e) { items = []; }

              var resultados = items.map(function (it) {
                var valorInicial = '';
                if (it.tipo === 'si_no') valorInicial = '';
                else if (it.tipo === 'numerico') valorInicial = '';
                else if (it.tipo === 'texto') valorInicial = '';
                return { itemId: it.id, valor: valorInicial };
              });

              var id = window.uuid();
              var ahora = new Date();
              await db.inspecciones.put({
                id: id,
                plantillaId: data.plantillaId,
                ubicacionId: data.ubicacionId,
                equipoId: data.equipoId || null,
                resultados: JSON.stringify(resultados),
                fotos: null,
                firma: null,
                resultado: 'pendiente',
                createdBy: APP_CONFIG && APP_CONFIG.usuarioActual || 'anon',
                createdAt: ahora,
                updatedAt: ahora
              });

              // Programar próxima si se especificó
              if (data.proximaFecha) {
                var prog = {
                  id: window.uuid(),
                  ubicacionId: data.ubicacionId,
                  equipoId: data.equipoId || null,
                  plantillaId: data.plantillaId,
                  frecuencia: null,
                  proximaFecha: data.proximaFecha,
                  ultimaFecha: ahora,
                  createdBy: APP_CONFIG && APP_CONFIG.usuarioActual || 'anon',
                  createdAt: ahora,
                  updatedAt: ahora
                };
                await db.programacion.put(prog);
              }

              UI.toast('Inspecci\u00f3n creada. Completa los resultados.', 'success');

              // Abrir para llenar resultados
              var ctx = Alpine.$data(document.querySelector('[x-data="inspeccionesData()"]'));
              if (ctx) { await ctx.cargarDatos(); }

              // Navegar a la inspección para llenar resultados
              setTimeout(function () {
                ctx && ctx.llenarResultados(id);
              }, 300);
            }
          );
        },

        // ─── Llenar Resultados ─────────────────────────
        async llenarResultados(inspeccionId) {
          var inspeccion = await db.inspecciones.get(inspeccionId);
          if (!inspeccion) { UI.toast('Inspecci\u00f3n no encontrada', 'error'); return; }

          var plantilla = await db.plantillas.get(inspeccion.plantillaId);
          if (!plantilla) { UI.toast('Plantilla no encontrada', 'error'); return; }

          var items;
          try { items = typeof plantilla.items === 'string' ? JSON.parse(plantilla.items) : plantilla.items || []; }
          catch (e) { items = []; }

          var resultados;
          try { resultados = typeof inspeccion.resultados === 'string' ? JSON.parse(inspeccion.resultados) : inspeccion.resultados || []; }
          catch (e) { resultados = []; }

          window._modalFormData = {};

          // Generar HTML dinámico para cada item
          var itemsHtml = items.map(function (item, idx) {
            var resultItem = null;
            for (var r = 0; r < resultados.length; r++) {
              if (resultados[r].itemId === item.id) { resultItem = resultados[r]; break; }
            }
            var valor = resultItem ? resultItem.valor : '';

            var inputHtml = '';
            if (item.tipo === 'si_no') {
              inputHtml =
                '<div class="flex gap-3 mt-1">' +
                  '<label class="flex items-center gap-1 cursor-pointer">' +
                    '<input type="radio" name="item_' + idx + '" value="si" class="radio radio-success radio-sm" ' + (valor === 'si' ? 'checked' : '') + ' /> S\u00ed' +
                  '</label>' +
                  '<label class="flex items-center gap-1 cursor-pointer">' +
                    '<input type="radio" name="item_' + idx + '" value="no" class="radio radio-error radio-sm" ' + (valor === 'no' ? 'checked' : '') + ' /> No' +
                  '</label>' +
                  '<label class="flex items-center gap-1 cursor-pointer">' +
                    '<input type="radio" name="item_' + idx + '" value="na" class="radio radio-ghost radio-sm" ' + (valor === 'na' ? 'checked' : '') + ' /> N/A' +
                  '</label>' +
                '</div>';
            } else if (item.tipo === 'numerico') {
              inputHtml = '<input type="number" class="item-valor input input-bordered input-sm w-24" data-idx="' + idx + '" value="' + valor + '" step="0.1" />';
            } else if (item.tipo === 'texto') {
              inputHtml = '<textarea class="item-valor textarea textarea-bordered textarea-sm w-full" data-idx="' + idx + '" rows="2">' + valor + '</textarea>';
            } else if (item.tipo === 'foto') {
              inputHtml =
                '<div class="flex items-center gap-2">' +
                  '<input type="file" class="item-foto file-input file-input-bordered file-input-sm w-full max-w-xs" accept="image/*" data-idx="' + idx + '" ' + (valor ? '' : '') + ' />' +
                  (valor ? '<span class="badge badge-success badge-sm">Foto tomada</span>' : '') +
                '</div>';
            } else if (item.tipo === 'firma') {
              inputHtml =
                '<div class="flex items-center gap-2">' +
                  '<button type="button" class="btn btn-outline btn-sm" onclick="alert(\'Usa un dispositivo t\u00e1ctil para firmar\')">' +
                    '<i class="bi bi-pen"></i> Firmar' +
                  '</button>' +
                  (valor ? '<span class="badge badge-success badge-sm">Firmado</span>' : '') +
                  '<input type="hidden" class="item-valor" data-idx="' + idx + '" value="' + valor + '" />' +
                '</div>';
            }

            return (
              '<div class="p-3 bg-base-200 rounded-lg">' +
                '<div class="flex items-start gap-2">' +
                  '<span class="badge badge-primary badge-sm mt-0.5 shrink-0">' + (idx + 1) + '</span>' +
                  '<div class="flex-1">' +
                    '<p class="text-sm font-medium mb-1">' + item.texto + '</p>' +
                    '<span class="badge badge-ghost badge-xs mb-1">' + item.tipo.replace('si_no', 'S\u00ed/No').replace('numerico', 'Num\u00e9rico') + '</span>' +
                    inputHtml +
                  '</div>' +
                '</div>' +
              '</div>'
            );
          }).join('');

          var html =
            '<div class="space-y-3">' +
              '<div class="bg-base-300 p-3 rounded-lg mb-3">' +
                '<p class="text-sm"><strong>Plantilla:</strong> ' + plantilla.nombre + '</p>' +
              '</div>' +
              '<div class="space-y-2 max-h-96 overflow-y-auto">' + itemsHtml + '</div>' +
              '<div class="divider"></div>' +
              '<label class="form-control w-full">' +
                '<span class="label-text">Resultado general</span>' +
                '<select id="resultado-general" class="select select-bordered w-full">' +
                  '<option value="aprobado"' + (inspeccion.resultado === 'aprobado' ? ' selected' : '') + '>Aprobado</option>' +
                  '<option value="observado"' + (inspeccion.resultado === 'observado' ? ' selected' : '') + '>Observado</option>' +
                  '<option value="rechazado"' + (inspeccion.resultado === 'rechazado' ? ' selected' : '') + '>Rechazado</option>' +
                '</select>' +
              '</label>' +
            '</div>';

          await UI.modalForm(
            'Resultados: ' + plantilla.nombre,
            html,
            async function (data) {
              // Recolectar valores de los inputs en el modal
              var modalBody = document.getElementById('modal-form-body');
              if (!modalBody) { UI.toast('Error al guardar', 'error'); return; }

              var nuevosResultados = [];
              var inputsTexto = modalBody.querySelectorAll('.item-valor');
              for (var i = 0; i < inputsTexto.length; i++) {
                var inp = inputsTexto[i];
                var idx = parseInt(inp.getAttribute('data-idx'));
                nuevosResultados.push({ itemId: items[idx] ? items[idx].id : 'i' + (idx + 1), valor: inp.value || '' });
              }

              // Check radios
              var radios = modalBody.querySelectorAll('input[type="radio"]:checked');
              for (var r = 0; r < radios.length; r++) {
                var radio = radios[r];
                var name = radio.getAttribute('name');
                if (name) {
                  var radioIdx = parseInt(name.replace('item_', ''));
                  for (var nr = 0; nr < nuevosResultados.length; nr++) {
                    if (nuevosResultados[nr].itemId === items[radioIdx].id) {
                      nuevosResultados[nr].valor = radio.value;
                      break;
                    }
                  }
                }
              }

              var resultadoGeneral = document.getElementById('resultado-general');
              var resGeneral = resultadoGeneral ? resultadoGeneral.value : 'aprobado';

              inspeccion.resultados = JSON.stringify(nuevosResultados);
              inspeccion.resultado = resGeneral;
              inspeccion.updatedAt = new Date();
              await db.inspecciones.put(inspeccion);

              UI.toast('Resultados guardados', 'success');
              var ctx = Alpine.$data(document.querySelector('[x-data="inspeccionesData()"]'));
              if (ctx) { await ctx.cargarDatos(); }
            }
          );
        },

        // ─── Ver Detalle ────────────────────────────────
        async verDetalle(inspeccion) {
          var plantilla = await db.plantillas.get(inspeccion.plantillaId);
          var ubicacion = await db.ubicaciones.get(inspeccion.ubicacionId);
          var items = [];
          if (plantilla) {
            try { items = typeof plantilla.items === 'string' ? JSON.parse(plantilla.items) : (plantilla.items || []); }
            catch (e) { items = []; }
          }
          var resultados = [];
          try { resultados = typeof inspeccion.resultados === 'string' ? JSON.parse(inspeccion.resultados) : (inspeccion.resultados || []); }
          catch (e) { resultados = []; }

          var badges = {
            'aprobado': '<span class="badge badge-success gap-1"><i class="bi bi-check-circle"></i> Aprobado</span>',
            'rechazado': '<span class="badge badge-error gap-1"><i class="bi bi-x-circle"></i> Rechazado</span>',
            'observado': '<span class="badge badge-warning gap-1"><i class="bi bi-exclamation-triangle"></i> Observado</span>',
            'pendiente': '<span class="badge badge-ghost gap-1"><i class="bi bi-clock"></i> Pendiente</span>'
          };

          var resultadosHtml = items.map(function (item) {
            var val = '';
            for (var ri = 0; ri < resultados.length; ri++) {
              if (resultados[ri].itemId === item.id) { val = resultados[ri].valor; break; }
            }
            var valDisplay = '';
            if (item.tipo === 'si_no') {
              if (val === 'si') valDisplay = '<span class="badge badge-success badge-sm">S\u00ed</span>';
              else if (val === 'no') valDisplay = '<span class="badge badge-error badge-sm">No</span>';
              else if (val === 'na') valDisplay = '<span class="badge badge-ghost badge-sm">N/A</span>';
              else valDisplay = '<span class="text-base-content/40">--</span>';
            } else {
              valDisplay = val || '<span class="text-base-content/40">--</span>';
            }
            return (
              '<div class="flex items-start gap-2 p-2 border-b border-base-200 last:border-0">' +
                '<span class="badge badge-primary badge-xs mt-1">' + item.orden + '</span>' +
                '<div class="flex-1">' +
                  '<p class="text-sm">' + item.texto + '</p>' +
                  '<p class="text-xs text-base-content/50">' + item.tipo.replace('si_no', 'S\u00ed/No').replace('numerico', 'Num\u00e9rico') + '</p>' +
                '</div>' +
                '<div class="text-sm font-medium">' + valDisplay + '</div>' +
              '</div>'
            );
          }).join('');

          UI.modalForm(
            'Detalle de Inspecci\u00f3n',
            '<div class="space-y-3">' +
              '<div class="grid grid-cols-2 gap-2 text-sm">' +
                '<div><span class="text-base-content/50">Plantilla:</span> ' + (plantilla ? plantilla.nombre : '---') + '</div>' +
                '<div><span class="text-base-content/50">Resultado:</span> ' + (badges[inspeccion.resultado] || badges.pendiente) + '</div>' +
                '<div><span class="text-base-content/50">Ubicaci\u00f3n:</span> ' + (ubicacion ? ubicacion.nombre : '---') + '</div>' +
                '<div><span class="text-base-content/50">Fecha:</span> ' + UI.formatDate(inspeccion.createdAt) + '</div>' +
              '</div>' +
              '<div class="divider my-2"></div>' +
              '<p class="font-medium text-sm mb-2">Resultados:</p>' +
              '<div class="space-y-1 max-h-64 overflow-y-auto">' + resultadosHtml + '</div>' +
            '</div>',
            async function () {}
          );
        },

        // ─── Eliminar ──────────────────────────────────
        async eliminar(item) {
          var ok = await UI.confirm('Eliminar esta inspecci\u00f3n?');
          if (!ok) return;
          try {
            await db.inspecciones.delete(item.id);
            UI.toast('Inspecci\u00f3n eliminada', 'success');
            await this.cargarDatos();
          } catch (e) {
            UI.toast('Error: ' + e.message, 'error');
          }
        }
      };
    });
  });
})();
