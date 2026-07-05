// module.js — Módulo de Reportes para AHA Checklist
(function () {
  'use strict';

  var Reportes = {
    id: 'reportes',
    titulo: 'Reportes',
    icono: 'bi bi-bar-chart',

    init: function () {
      console.log('[reportes] Inicializado');
    },

    render: function (params) {
      return document.getElementById('reportes-template').innerHTML;
    },

    destroy: function () {
      // Destroy Chart.js instances
      var charts = ['chartCumplimiento', 'chartResultados', 'chartTendencia'];
      for (var i = 0; i < charts.length; i++) {
        if (window[charts[i]]) {
          window[charts[i]].destroy();
          window[charts[i]] = null;
        }
      }
    }
  };

  window.MODULES = window.MODULES || {};
  window.MODULES.reportes = Reportes;

  // ─── Alpine Data ──────────────────────────────────────
  document.addEventListener('alpine:init', function () {
    if (typeof Alpine === 'undefined') return;

    Alpine.data('reportesData', function () {
      return {
        cargando: true,
        stats: {
          totalInspecciones: 0,
          aprobadas: 0,
          rechazadas: 0,
          observadas: 0,
          pendientes: 0,
          porcentajeCumplimiento: 0,
          inspeccionesHoy: 0,
          totalEquipos: 0,
          equiposConFallas: 0,
          totalPlantillas: 0,
          totalUbicaciones: 0
        },
        inspeccionesRecientes: [],

        async init() {
          this.cargando = true;
          await this.calcularStats();
          this.cargando = false;
          // Chart.js se renderiza después de que Alpine procesa el DOM
          setTimeout(function () {
            window.renderCharts && window.renderCharts();
          }, 300);
        },

        async calcularStats() {
          try {
            var todas = await db.inspecciones.toArray();
            var hoy = new Date();
            hoy.setHours(0, 0, 0, 0);
            var manana = new Date(hoy);
            manana.setDate(manana.getDate() + 1);

            var total = todas.length;
            var aprobadas = todas.filter(function (i) { return i.resultado === 'aprobado'; }).length;
            var rechazadas = todas.filter(function (i) { return i.resultado === 'rechazado'; }).length;
            var observadas = todas.filter(function (i) { return i.resultado === 'observado'; }).length;
            var pendientes = todas.filter(function (i) { return i.resultado === 'pendiente' || !i.resultado; }).length;

            var hoyCount = todas.filter(function (i) {
              var d = new Date(i.createdAt);
              return d >= hoy && d < manana;
            }).length;

            var equipos = await db.equipos.count();
            var plantillas = await db.plantillas.count();
            var ubicaciones = await db.ubicaciones.count();

            var pct = total > 0 ? Math.round((aprobadas / total) * 100) : 0;

            this.stats = {
              totalInspecciones: total,
              aprobadas: aprobadas,
              rechazadas: rechazadas,
              observadas: observadas,
              pendientes: pendientes,
              porcentajeCumplimiento: pct,
              inspeccionesHoy: hoyCount,
              totalEquipos: equipos,
              equiposConFallas: rechazadas,
              totalPlantillas: plantillas,
              totalUbicaciones: ubicaciones
            };

            // Últimas 5 inspecciones
            this.inspeccionesRecientes = todas.sort(function (a, b) {
              return new Date(b.createdAt) - new Date(a.createdAt);
            }).slice(0, 5);

          } catch (e) {
            console.error('[reportes] Error:', e);
          }
        }
      };
    });
  });

  // ─── Chart.js Rendering (separado para control) ──────
  window.renderCharts = function () {
    if (typeof Chart === 'undefined') return;

    var charts = ['chartCumplimiento', 'chartResultados', 'chartTendencia'];
    for (var i = 0; i < charts.length; i++) {
      if (window[charts[i]]) {
        window[charts[i]].destroy();
        window[charts[i]] = null;
      }
    }

    var data;
    try {
      data = Alpine.$data(document.querySelector('[x-data="reportesData()"]'));
    } catch (e) { return; }
    if (!data) return;

    // 1. Anillo de cumplimiento
    var ctx1 = document.getElementById('chartCumplimiento');
    if (ctx1) {
      window.chartCumplimiento = new Chart(ctx1, {
        type: 'doughnut',
        data: {
          labels: ['Aprobadas', 'Rechazadas', 'Observadas', 'Pendientes'],
          datasets: [{
            data: [data.stats.aprobadas, data.stats.rechazadas, data.stats.observadas, data.stats.pendientes],
            backgroundColor: ['#22c55e', '#ef4444', '#eab308', '#d1d5db'],
            borderWidth: 2,
            borderColor: '#ffffff'
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          cutout: '70%',
          plugins: {
            legend: { position: 'bottom', labels: { padding: 12, usePointStyle: true, font: { size: 11 } } }
          }
        }
      });
    }

    // 2. Barras de resultados
    var ctx2 = document.getElementById('chartResultados');
    if (ctx2) {
      window.chartResultados = new Chart(ctx2, {
        type: 'bar',
        data: {
          labels: ['Aprobadas', 'Rechazadas', 'Observadas', 'Pendientes'],
          datasets: [{
            label: 'Inspecciones',
            data: [data.stats.aprobadas, data.stats.rechazadas, data.stats.observadas, data.stats.pendientes],
            backgroundColor: ['#22c55e', '#ef4444', '#eab308', '#d1d5db'],
            borderRadius: 6
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { display: false }
          },
          scales: {
            y: { beginAtZero: true, ticks: { stepSize: 1 } }
          }
        }
      });
    }

    // 3. Tendencia (últimos 7 días)
    var ctx3 = document.getElementById('chartTendencia');
    if (ctx3) {
      (async function () {
        var inspecciones = await db.inspecciones.toArray();
        var dias = [];
        var hoy = new Date();
        for (var d = 6; d >= 0; d--) {
          var fecha = new Date(hoy);
          fecha.setDate(fecha.getDate() - d);
          var fechaStr = fecha.toISOString().slice(0, 10);
          var label = fecha.toLocaleDateString('es-MX', { weekday: 'short' });
          var count = inspecciones.filter(function (i) {
            var d2 = new Date(i.createdAt).toISOString().slice(0, 10);
            return d2 === fechaStr;
          }).length;
          dias.push({ label: label, count: count });
        }

        window.chartTendencia = new Chart(ctx3, {
          type: 'line',
          data: {
            labels: dias.map(function (d) { return d.label; }),
            datasets: [{
              label: 'Inspecciones',
              data: dias.map(function (d) { return d.count; }),
              borderColor: '#eab308',
              backgroundColor: 'rgba(234, 179, 8, 0.1)',
              fill: true,
              tension: 0.4,
              pointBackgroundColor: '#eab308',
              pointRadius: 4,
              borderWidth: 2
            }]
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
              legend: { display: false }
            },
            scales: {
              y: { beginAtZero: true, ticks: { stepSize: 1 } }
            }
          }
        });
      })();
    }
  };

  // ─── Export CSV ──────────────────────────────────────
  window.exportarReporteCSV = async function () {
    try {
      UI.toast('Generando reporte...', 'info');
      var inspecciones = await db.inspecciones.toArray();
      var plantillas = await db.plantillas.toArray();
      var ubicaciones = await db.ubicaciones.toArray();

      var plantillaMap = {};
      for (var i = 0; i < plantillas.length; i++) {
        plantillaMap[plantillas[i].id] = plantillas[i].nombre;
      }
      var ubicacionMap = {};
      for (var i = 0; i < ubicaciones.length; i++) {
        ubicacionMap[ubicaciones[i].id] = ubicaciones[i].nombre;
      }

      var encabezados = ['ID', 'Plantilla', 'Ubicaci\u00f3n', 'Resultado', 'Fecha'];
      var filas = inspecciones.map(function (ins) {
        return [
          ins.id,
          plantillaMap[ins.plantillaId] || '---',
          ubicacionMap[ins.ubicacionId] || '---',
          ins.resultado || 'pendiente',
          ins.createdAt ? new Date(ins.createdAt).toISOString().slice(0, 10) : ''
        ];
      });

      var csvContent = '\uFEFF' + encabezados.join(',') + '\n' +
        filas.map(function (f) {
          return f.map(function (v) {
            return '"' + String(v).replace(/"/g, '""') + '"';
          }).join(',');
        }).join('\n');

      var blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      var url = URL.createObjectURL(blob);
      var a = document.createElement('a');
      a.href = url;
      a.download = 'reporte-inspecciones-' + new Date().toISOString().slice(0, 10) + '.csv';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      UI.toast('Reporte CSV descargado', 'success');
    } catch (e) {
      UI.toast('Error al exportar: ' + e.message, 'error');
    }
  };
})();
