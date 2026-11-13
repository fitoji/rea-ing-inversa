# Revisión: propuesta de arquitectura de cableado

**Alcance:** contrastación de `docs/WIRING_ARCHITECTURE.md` contra el código real del repo.
**Fecha:** 2026-11-13
**Veredicto:** la arquitectura por capas (geometría / conectividad / interacción / persistencia) es correcta y el plan de migración incremental es sensato. Dos premisas del doc necesitan corrección antes de implementar en serio, y sobreestima cuánto falta por construir.

## 1. Lo que la propuesta verifica bien

Las rutas que lista la tabla (sección 6) existen todas tal cual, relativas a `app/`:

- `src/editor/state.ts` — estado del editor, historial y operaciones de cable.
- `src/editor/network.ts` — grafo de conectividad y validaciones.
- `src/editor/pins.ts` — bornes de componentes (`attachPoints`).
- `src/model/project.ts` — modelo persistente parseado.
- `src/sim/netlist.ts`, `src/sim/flow.ts` — consumidores de `buildNetwork`.

Hechos verificados con evidencia:

- **Historial = snapshots de texto.** `commit()` guarda el texto anterior en `past` con guarda de cordura contra ediciones corruptas (`app/src/editor/state.ts:81-91`), límite de 100.
- **Un solo commit por gesto ya existe.** `applyDrag` aplica `move` / `vertex` / `bend` con un único `commit` (`app/src/editor/state.ts:821-825`). El preview durante el arrastre vive en estado React y nunca toca `state.text` en `pointermove` (`app/src/ui/App.tsx:462-469`). Dos requisitos de la sección 2 del doc ya están cumplidos.
- **Serialización diferencial ya existe.** `serializeWith(project, edits)` edita `raw` por índice: es exactamente el patrón "exportar solo los cambios necesarios" que el doc propone como `exportWiringChanges`.
- **La conectividad actual es puramente geométrica.** `buildNetwork` deriva los nodos por clave de coordenada redondeada (TOL 0.01), bornes por proximidad, uniones por registro 4001 y proyección de puntos sobre el interior de tramos (`app/src/editor/network.ts:109-200`).

## 2. Gap 1: la conectividad explícita no puede persistirse en CADe_SIMU

El formato guarda geometría pura: un cable son registros 4xxx con `x1,y1,x2,y2` y número de cable en `geometry[21]` (`CABLE_NUMBER_INDEX = 21`, `app/src/editor/network.ts:26`). **No hay anclas en el archivo.**

El doc propone `Anchor { kind: 'pin', componentId, pinId }` como modelo con "mapeo estable a registros fuente", pero no hay nada estable a lo que mapear: la conectividad hay que re-derivarla geométricamente en cada import. Reencuadre necesario:

> "Conectividad explícita" solo puede ser un **invariante del editor durante gestos** (nunca soltar un extremo sin engancharlo), no un modelo persistido. Al confirmar, los comandos escriben registros 4xxx/4001 y las anclas vuelven a derivarse.

Si alguien implementa el `WiringDocument` del doc como modelo duradero con anclas, el archivo se las borra al guardar.

## 3. Gap 2: el modelo intermedio paralelo es doble contabilidad

`Project` ya es una vista inmutable parseada con memo (`projectCache`, `app/src/editor/state.ts:72-79`). Un segundo documento (`paths`/`junctions` en Maps) más un adapter de ida y vuelta por gesto duplica el estado. Mantener el texto/registros como fuente de verdad y hacer del dominio de wiring una **vista derivada + draft transitorio de gesto**, con comandos que emiten ediciones de registros vía `serializeWith`, reduce el adapter a casi nada y deja la compatibilidad protegida por `app/test/compat.test.ts`.

## 4. Dónde el código actual pide el refactor

- `bendCable` encadena `insertVertex` + `moveVertex` limpiando `past`/`future` a mano (`app/src/editor/state.ts:808-814`): es el hack que la capa de commands/transactions eliminaría. Mejor argumento a favor del doc.
- `moveVertex` re-implementa lógica de ortogonalidad y partir-en-codo dentro de una función larga (`app/src/editor/state.ts:455+`): pide `geometry.ts` puro con tests.
- Snap solo cuadrícula (`snapPoint` en `app/src/ui/Canvas.tsx`): sin prioridad pin → junction → segmento apto para derivación; no hay T derivada durante arrastre.
- Hit-testing ad-hoc con `target.closest('[data-endpoint]')` en el Canvas: sin capa de prioridades tipada.

## 5. Qué cortar del alcance del doc

- El `WiringDocument` persistente con Maps y el adapter completo de import/export (gap 2). Con vista derivada + draft no hacen falta.
- Crédito por undo/preview: ya resuelto; el valor real de la capa de comandos es eliminar el hack de `bendCable`.

## 6. Plan acordado (fases, cada una con tests)

1. **PR1 — dominio y geometría pura:** `src/editor/wiring/types.ts` + `geometry.ts`, tests de normalización ortogonal y cruces, sin tocar el formato ni la UI. (Esta revisión + PR1 se hicieron juntos.)
2. **PR2 — snap priorizado + hitTest puro** consumidos por el Canvas actual.
3. **PR3 — controller tipado + commands**, reemplazando el hack de `bendCable` y el `DragOp` actual.
4. En cada fase: comparar netlists antes/después (`app/test/netlist.test.ts`, `app/test/cables.test.ts`) y mantener verde `compat.test.ts`.

Runner de tests: `node --test` (no vitest).
