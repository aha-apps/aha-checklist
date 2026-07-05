// seed.js — Datos de ejemplo para AHA Checklist
(function () {
  'use strict';

  var seeded = localStorage.getItem('aha-checklist-seeded');
  if (seeded === 'true') return;

  window.cargarSeedData = async function () {
    try {
      // Esperar a que db esté listo
      if (!window.db) {
        setTimeout(window.cargarSeedData, 500);
        return;
      }

      var catCount = await db.categorias_plantillas.count();
      if (catCount > 0) {
        localStorage.setItem('aha-checklist-seeded', 'true');
        return;
      }

      // Categorías
      var cats = [
        { id: window.uuid(), nombre: 'Seguridad', createdAt: new Date(), updatedAt: new Date() },
        { id: window.uuid(), nombre: 'Limpieza', createdAt: new Date(), updatedAt: new Date() },
        { id: window.uuid(), nombre: 'Maquinaria', createdAt: new Date(), updatedAt: new Date() }
      ];
      await db.categorias_plantillas.bulkPut(cats);

      // Categoría IDs
      var catSeguridad = cats[0].id;
      var catLimpieza = cats[1].id;
      var catMaquinaria = cats[2].id;

      // Plantillas con items
      var plantillas = [
        {
          id: window.uuid(),
          nombre: 'Inspección de Seguridad General',
          categoriaId: catSeguridad,
          items: JSON.stringify([
            { id: 'i1', tipo: 'si_no', texto: 'Extintores visibles y accesibles', orden: 1 },
            { id: 'i2', tipo: 'si_no', texto: 'Salidas de emergencia despejadas', orden: 2 },
            { id: 'i3', tipo: 'si_no', texto: 'Señalización adecuada', orden: 3 },
            { id: 'i4', tipo: 'si_no', texto: 'Botiquín completo', orden: 4 },
            { id: 'i5', tipo: 'texto', texto: 'Observaciones adicionales', orden: 5 },
            { id: 'i6', tipo: 'foto', texto: 'Evidencia fotográfica', orden: 6 }
          ]),
          createdBy: 'seed',
          createdAt: new Date(),
          updatedAt: new Date()
        },
        {
          id: window.uuid(),
          nombre: 'Checklist de Limpieza Diaria',
          categoriaId: catLimpieza,
          items: JSON.stringify([
            { id: 'i1', tipo: 'si_no', texto: 'Pisos barridos y trapeados', orden: 1 },
            { id: 'i2', tipo: 'si_no', texto: 'Baños desinfectados', orden: 2 },
            { id: 'i3', tipo: 'si_no', texto: 'Superficies limpias', orden: 3 },
            { id: 'i4', tipo: 'si_no', texto: 'Basureros vaciados', orden: 4 },
            { id: 'i5', tipo: 'numerico', texto: 'Nivel de limpieza (1-5)', orden: 5 },
            { id: 'i6', tipo: 'foto', texto: 'Foto del área', orden: 6 }
          ]),
          createdBy: 'seed',
          createdAt: new Date(),
          updatedAt: new Date()
        },
        {
          id: window.uuid(),
          nombre: 'Revisión de Maquinaria',
          categoriaId: catMaquinaria,
          items: JSON.stringify([
            { id: 'i1', tipo: 'si_no', texto: 'Motor funciona correctamente', orden: 1 },
            { id: 'i2', tipo: 'numerico', texto: 'Temperatura de operación (°C)', orden: 2 },
            { id: 'i3', tipo: 'si_no', texto: 'Niveles de aceite adecuados', orden: 3 },
            { id: 'i4', tipo: 'si_no', texto: 'Fugas visibles', orden: 4 },
            { id: 'i5', tipo: 'texto', texto: 'Ruidos anormales detectados', orden: 5 },
            { id: 'i6', tipo: 'firma', texto: 'Firma del supervisor', orden: 6 }
          ]),
          createdBy: 'seed',
          createdAt: new Date(),
          updatedAt: new Date()
        }
      ];
      await db.plantillas.bulkPut(plantillas);

      // Ubicaciones
      var ubicaciones = [
        { id: window.uuid(), nombre: 'Edificio A - Planta Baja', area: 'Edificio A', createdBy: 'seed', createdAt: new Date(), updatedAt: new Date() },
        { id: window.uuid(), nombre: 'Edificio A - Planta Alta', area: 'Edificio A', createdBy: 'seed', createdAt: new Date(), updatedAt: new Date() },
        { id: window.uuid(), nombre: 'Taller de Mantenimiento', area: 'Taller', createdBy: 'seed', createdAt: new Date(), updatedAt: new Date() },
        { id: window.uuid(), nombre: 'Almacén General', area: 'Almacén', createdBy: 'seed', createdAt: new Date(), updatedAt: new Date() }
      ];
      await db.ubicaciones.bulkPut(ubicaciones);

      // Equipos
      var equipos = [
        { id: window.uuid(), nombre: 'Montacargas #1', codigo: 'MTG-001', ubicacionId: ubicaciones[2].id, frecuencia: 7, createdBy: 'seed', createdAt: new Date(), updatedAt: new Date() },
        { id: window.uuid(), nombre: 'Compresor Central', codigo: 'CMP-001', ubicacionId: ubicaciones[2].id, frecuencia: 30, createdBy: 'seed', createdAt: new Date(), updatedAt: new Date() },
        { id: window.uuid(), nombre: 'Sistema HVAC', codigo: 'HVAC-001', ubicacionId: ubicaciones[0].id, frecuencia: 90, createdBy: 'seed', createdAt: new Date(), updatedAt: new Date() }
      ];
      await db.equipos.bulkPut(equipos);

      // Inspecciones de ejemplo (la última rechazada para que el dashboard muestre fallas)
      var hoy = new Date();
      var items1 = JSON.parse(plantillas[0].items);
      var resultados1 = items1.map(function (it) {
        return { itemId: it.id, valor: it.tipo === 'si_no' ? (it.orden <= 3 ? 'si' : 'no') : '' };
      });
      var items2 = JSON.parse(plantillas[1].items);
      var resultados2 = items2.map(function (it) {
        return { itemId: it.id, valor: it.tipo === 'si_no' ? 'si' : (it.tipo === 'numerico' ? '4' : '') };
      });

      var inspecciones = [
        {
          id: window.uuid(),
          plantillaId: plantillas[0].id,
          ubicacionId: ubicaciones[0].id,
          equipoId: null,
          resultados: JSON.stringify(resultados1),
          fotos: null,
          firma: null,
          resultado: 'rechazado',
          createdBy: 'seed',
          createdAt: new Date(hoy.getTime() - 86400000),
          updatedAt: new Date()
        },
        {
          id: window.uuid(),
          plantillaId: plantillas[1].id,
          ubicacionId: ubicaciones[1].id,
          equipoId: null,
          resultados: JSON.stringify(resultados2),
          fotos: null,
          firma: null,
          resultado: 'aprobado',
          createdBy: 'seed',
          createdAt: hoy,
          updatedAt: new Date()
        },
        {
          id: window.uuid(),
          plantillaId: plantillas[2].id,
          ubicacionId: ubicaciones[2].id,
          equipoId: equipos[0].id,
          resultados: JSON.stringify(resultados2),
          fotos: null,
          firma: null,
          resultado: 'observado',
          createdBy: 'seed',
          createdAt: hoy,
          updatedAt: new Date()
        }
      ];
      await db.inspecciones.bulkPut(inspecciones);

      localStorage.setItem('aha-checklist-seeded', 'true');
      console.log('[seed] Datos de ejemplo cargados correctamente');
    } catch (e) {
      console.warn('[seed] Error al cargar datos:', e);
    }
  };
})();
