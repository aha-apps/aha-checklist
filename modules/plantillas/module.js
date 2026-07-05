// module.js — Módulo de Plantillas para AHA Checklist
(function () {
  'use strict';

  var Plantillas = {
    id: 'plantillas',
    titulo: 'Plantillas',
    icono: 'bi bi-collection',
    _items: [],

    init: function () {
      console.log('[plantillas] Inicializado');
    },

    render: function (params) {
      return document.getElementById('plantillas-template').innerHTML;
    },

    destroy: function () {
      this._items = [];
    }
  };

  window.MODULES = window.MODULES || {};
  window.MODULES.plantillas = Plantillas;

  // ─── Alpine Data ──────────────────────────────────────
  document.addEventListener('alpine:init', function () {
    if (typeof Alpine === 'undefined') return;

    Alpine.data('plantillasData', function () {
      return {
        items: [],
        busqueda: '',
        cargando: true,
        categorias: [],
        showCategoriaForm: false,
        nuevaCategoria: '',

        get filtrados() {
          var q = this.busqueda.toLowerCase().trim();
          if (!q) return this.items;
          return this.items.filter(function (i) {
            return i.nombre.toLowerCase().indexOf(q) !== -1;
          });
        },

        getItemsLength: function (itemsJson) {
          try { return JSON.parse(itemsJson).length; } catch (e) { return 0; }
        },

        getCatName: function (catId) {
          for (var i = 0; i < this.categorias.length; i++) {
            if (this.categorias[i].id === catId) return this.categorias[i].nombre;
          }
          return 'Sin categor\u00eda';
        },

        async init() {
          this.cargando = true;
          await this.cargarCategorias();
          await this.cargarDatos();
          this.cargando = false;
        },

        async cargarCategorias() {
          try {
            this.categorias = await db.categorias_plantillas.toArray();
          } catch (e) {
            UI.toast('Error al cargar categor\u00edas', 'error');
          }
        },

        async cargarDatos() {
          try {
            this.items = await db.plantillas.toArray();
          } catch (e) {
            UI.toast('Error al cargar plantillas', 'error');
          }
        },

        // ─── Formulario Plantilla ─────────────────────
        async abrirForm(item) {
          var editando = !!item;
          var categorias = this.categorias;
          var catsOptions = categorias.map(function (c) {
            return '<option value="' + c.id + '">' + c.nombre + '</option>';
          }).join('');

          window._modalFormData = {
            nombre: item ? item.nombre : '',
            categoriaId: item ? item.categoriaId : (categorias.length ? categorias[0].id : '')
          };

          var html =
            '<div class="space-y-4">' +
              '<label class="form-control w-full">' +
                '<span class="label-text">Nombre de la plantilla</span>' +
                '<input type="text" x-model="form.nombre" required class="input input-bordered w-full" placeholder="Ej: Inspecci\u00f3n de seguridad" />' +
              '</label>' +
              '<label class="form-control w-full">' +
                '<span class="label-text">Categor\u00eda</span>' +
                '<select x-model="form.categoriaId" class="select select-bordered w-full">' +
                  catsOptions +
                '</select>' +
              '</label>' +
              '<label class="form-control w-full">' +
                '<span class="label-text">Items</span>' +
                '<p class="text-xs text-base-content/50">Los items se configurar\u00e1n al guardar la plantilla.</p>' +
              '</label>' +
            '</div>';

          await UI.modalForm(
            editando ? 'Editar Plantilla' : 'Nueva Plantilla',
            html,
            async function (data) {
              if (!data.nombre || !data.nombre.trim()) {
                UI.toast('El nombre es requerido', 'warning');
                throw new Error('Nombre requerido');
              }

              var items = item && item.items ? (typeof item.items === 'string' ? JSON.parse(item.items) : item.items) : [];
              var registro = {
                id: item ? item.id : window.uuid(),
                nombre: data.nombre.trim(),
                categoriaId: data.categoriaId,
                items: JSON.stringify(items),
                createdBy: APP_CONFIG && APP_CONFIG.usuarioActual || 'anon',
                createdAt: item ? item.createdAt : new Date(),
                updatedAt: new Date()
              };

              if (editando) {
                await db.plantillas.put(registro);
                UI.toast('Plantilla actualizada', 'success');
              } else {
                await db.plantillas.put(registro);
                UI.toast('Plantilla creada', 'success');
              }
              // Recargar
              var dataCtx = Alpine.$data(document.querySelector('[x-data="plantillasData()"]'));
              if (dataCtx) { await dataCtx.cargarDatos(); }
            }
          );
        },

        // ─── Configurar Items ──────────────────────────
        async configurarItems(plantilla) {
          var items = [];
          try {
            items = typeof plantilla.items === 'string' ? JSON.parse(plantilla.items) : (plantilla.items || []);
          } catch (e) { items = []; }

          window._modalFormData = {};

          var itemRows = items.map(function (it, idx) {
            return (
              '<div class="flex items-center gap-2 p-2 bg-base-200 rounded-lg item-row">' +
                '<i class="bi bi-grip-vertical text-base-content/30 cursor-grab"></i>' +
                '<input type="text" class="item-text input input-bordered input-sm flex-1" value="' + (it.texto || '') + '" placeholder="Texto del item" data-idx="' + idx + '" />' +
                '<select class="item-tipo select select-bordered select-sm w-28" data-idx="' + idx + '">' +
                  '<option value="si_no"' + (it.tipo === 'si_no' ? ' selected' : '') + '>S\u00ed / No</option>' +
                  '<option value="numerico"' + (it.tipo === 'numerico' ? ' selected' : '') + '>Num\u00e9rico</option>' +
                  '<option value="texto"' + (it.tipo === 'texto' ? ' selected' : '') + '>Texto</option>' +
                  '<option value="foto"' + (it.tipo === 'foto' ? ' selected' : '') + '>Foto</option>' +
                  '<option value="firma"' + (it.tipo === 'firma' ? ' selected' : '') + '>Firma</option>' +
                '</select>' +
                '<button type="button" class="btn btn-ghost btn-xs btn-square text-error" onclick="this.closest(\'.item-row\').remove()">' +
                  '<i class="bi bi-trash"></i>' +
                '</button>' +
              '</div>'
            );
          }).join('');

          var html =
            '<div class="space-y-3">' +
              '<div class="flex items-center justify-between">' +
                '<span class="font-medium text-sm">Items de: ' + plantilla.nombre + '</span>' +
                '<button type="button" class="btn btn-primary btn-xs" onclick="' +
                  "var c=this.closest('.modal-box').querySelector('#items-container');" +
                  "var d=document.createElement('div');" +
                  "d.className='flex items-center gap-2 p-2 bg-base-200 rounded-lg item-row';" +
                  "var idx=c.children.length;" +
                  "d.innerHTML='" +
                    "<i class=\"bi bi-grip-vertical text-base-content/30 cursor-grab\"><\/i>" +
                    "<input type=\"text\" class=\"item-text input input-bordered input-sm flex-1\" placeholder=\"Texto del item\" data-idx=\"' + idx + '\" \/>" +
                    "<select class=\"item-tipo select select-bordered select-sm w-28\" data-idx=\"' + idx + '\">" +
                      "<option value=\"si_no\">S\u00ed \/ No<\/option>" +
                      "<option value=\"numerico\">Num\u00e9rico<\/option>" +
                      "<option value=\"texto\">Texto<\/option>" +
                      "<option value=\"foto\">Foto<\/option>" +
                      "<option value=\"firma\">Firma<\/option>" +
                    "<\/select>" +
                    "<button type=\"button\" class=\"btn btn-ghost btn-xs btn-square text-error\" onclick=\"this.closest('.item-row').remove()\">" +
                      "<i class=\"bi bi-trash\"><\/i>" +
                    "<\/button>" +
                  "';c.appendChild(d);" +
                  '"' +
                '>' +
                  '<i class="bi bi-plus-lg"></i> Agregar item' +
                '</button>' +
              '</div>' +
              '<div id="items-container" class="space-y-2">' + itemRows + '</div>' +
            '</div>';

          await UI.modalForm(
            'Configurar Items: ' + plantilla.nombre,
            html,
            async function (data) {
              var container = document.getElementById('items-container');
              if (!container) { UI.toast('Error al guardar items', 'error'); return; }
              var rows = container.querySelectorAll('.item-row');
              var itemsGuardar = [];
              for (var i = 0; i < rows.length; i++) {
                var r = rows[i];
                var texto = r.querySelector('.item-text');
                var tipo = r.querySelector('.item-tipo');
                if (texto && texto.value.trim()) {
                  itemsGuardar.push({
                    id: 'i' + (i + 1),
                    tipo: tipo ? tipo.value : 'si_no',
                    texto: texto.value.trim(),
                    orden: i + 1
                  });
                }
              }
              if (!itemsGuardar.length) {
                UI.toast('Agrega al menos un item', 'warning');
                throw new Error('No items');
              }
              var existente = await db.plantillas.get(plantilla.id);
              if (existente) {
                existente.items = JSON.stringify(itemsGuardar);
                existente.updatedAt = new Date();
                await db.plantillas.put(existente);
                UI.toast('Items guardados (' + itemsGuardar.length + ')', 'success');
              }
              var dataCtx = Alpine.$data(document.querySelector('[x-data="plantillasData()"]'));
              if (dataCtx) { await dataCtx.cargarDatos(); }
            }
          );
        },

        // ─── Eliminar ──────────────────────────────────
        async eliminar(item) {
          var ok = await UI.confirm('Eliminar la plantilla "' + item.nombre + '"?');
          if (!ok) return;
          try {
            await db.plantillas.delete(item.id);
            UI.toast('Plantilla eliminada', 'success');
            await this.cargarDatos();
          } catch (e) {
            UI.toast('Error al eliminar: ' + e.message, 'error');
          }
        },

        // ─── Categorías ─────────────────────────────────
        toggleCategoriaForm: function () {
          this.showCategoriaForm = !this.showCategoriaForm;
          this.nuevaCategoria = '';
        },

        async guardarCategoria() {
          if (!this.nuevaCategoria.trim()) { UI.toast('El nombre es requerido', 'warning'); return; }
          try {
            await db.categorias_plantillas.put({
              id: window.uuid(),
              nombre: this.nuevaCategoria.trim(),
              createdAt: new Date(),
              updatedAt: new Date()
            });
            UI.toast('Categor\u00eda creada', 'success');
            this.nuevaCategoria = '';
            this.showCategoriaForm = false;
            await this.cargarCategorias();
          } catch (e) {
            UI.toast('Error: ' + e.message, 'error');
          }
        },

        async eliminarCategoria(catId) {
          var cat = this.categorias.find(function (c) { return c.id === catId; });
          if (!cat) return;
          var ok = await UI.confirm('Eliminar categor\u00eda "' + cat.nombre + '"?');
          if (!ok) return;
          try {
            await db.categorias_plantillas.delete(catId);
            UI.toast('Categor\u00eda eliminada', 'success');
            await this.cargarCategorias();
          } catch (e) {
            UI.toast('Error: ' + e.message, 'error');
          }
        }
      };
    });
  });
})();
