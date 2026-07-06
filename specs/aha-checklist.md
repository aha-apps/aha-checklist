# AHA Checklist — Especificación Funcional

## Identidad

- **Nombre:** AHA Checklist
- **Tagline:** Checklists inteligentes para inspecciones y auditorías
- **Perfil:** Lite (file://, doble clic)
- **Stack:** Alpine.js 3 + Dexie 3 + DaisyUI 4 + Tailwind Play CDN + Bootstrap Icons
- **Tema:** #f59e0b (amber-500)
- **Branch:** master

## Propósito

Aplicación offline-first para crear y ejecutar checklists de inspección, auditoría y control de calidad. Soporta plantillas reutilizables, fotos, firmas y reportes de resultados.

## DB Schema (Dexie)

```
checklists: ++id, nombre, *categoria, *createdBy, createdAt, updatedAt
plantillas: ++id, nombre, *categoria, *createdBy, createdAt, updatedAt
items_plantilla: ++id, *plantillaId, texto, *tipoRespuesta, *requiereFoto, *requiereFirma, *orden, createdAt
ejecuciones: ++id, *checklistId, *plantillaId, *fecha, *inspector, *estado, *createdBy, createdAt, updatedAt
respuestas: ++id, *ejecucionId, *itemPlantillaId, *valor, *foto, *firma, createdAt
```

### Indexes adicionales

- plantillas: `&nombre` (unique)
- items_plantilla: `*plantillaId`, `*orden`
- ejecuciones: `*estado`, `*fecha`
- respuestas: `*ejecucionId`

## Módulos

### 1. Checklists (`#/checklists`)
- Lista de checklists creados desde plantillas
- Filtrar por categoría y estado
- Iniciar nueva ejecución desde una plantilla
- Historial de ejecuciones por checklist

### 2. Ejecución (`#/ejecucion`)
- Wizard paso a paso por cada item de la plantilla
- Tipos de respuesta: sí/no, texto, numérico, opción múltiple, foto, firma
- Captura de foto vía cámara (input file)
- Captura de firma en canvas táctil
- Barra de progreso visual
- Al finalizar: resumen y opción de exportar PDF

### 3. Plantillas (`#/plantillas`)
- CRUD de plantillas
- Agregar items con tipo de respuesta y orden
- Categorizar plantillas
- Duplicar plantilla existente
- Previsualizar antes de usar

### 4. Reportes (`#/reportes`)
- Checklists completados vs pendientes (dona)
- Resultados por categoría (barras apiladas)
- Tasa de aprobación por plantilla
- Exportar ejecución individual como JSON

## Reglas de Negocio

- Una plantilla debe tener al menos un item
- No se puede modificar una plantilla si ya tiene ejecuciones
- Una ejecución no se puede reabrir una vez completada
- Las fotos se almacenan como base64 en IndexedDB
- Las firmas se capturan en canvas y se almacenan como base64 PNG
