# Editor performance — desbloquear P0 de la auditoría v0.3

Objetivo: hacer demostrable el diferenciador del producto (edición de cables) sobre archivos reales.
Fuente: `docs/auditoria-v0.3.md`, sección «Orden de trabajo recomendado», P0.

## Specs

- **S1** — «Parser lineal + memoización `text → Project` (85 ms → <1 ms).» Hoy `app/src/format/cade.ts:86` copia todo el resto del documento por cada candidato a registro y escanea buscando `#`; `parse` corre dos veces por edición (`editor/state.ts:69-71` en `projectOf` y `:78` en la guarda de `commit`).
- **S2** — «Arrastre como transformación transitoria; commit en `pointerup`.» Hoy `ui/App.tsx:198` recalcula `projectOf(applyDrag(state, preview))` en cada `pointermove` y `ui/Canvas.tsx` lo emite sin throttle.
- **S3** — «Netlist con namespace de hoja.» Hoy `editor/network.ts:79` arma la clave de red solo con `x,y`, así que dos hojas que reusan el mismo origen de coordenadas comparten nets: simulación silenciosamente incorrecta en archivos multi-hoja.

## Tasks

| ID | Tarea | Spec | Ruta | Commit |
|---|---|---|---|---|
| T1 | Índices de `#` precomputados por parseo + memo `text → Project` por identidad de texto | S1 | inline | `perf(format): linear record scan and memoized project parse` |
| T2 | Arrastre como estado transitorio de `Canvas`, `applyDrag`/`commit` una sola vez en `pointerup` | S2 | inline | `perf(ui): commit cable drag once on pointerup` |
| T3 | Clave de red con namespace de hoja y netlist construido por hoja | S3 | inline | `fix(sim): scope netlist keys per sheet` |
| T4 | Verificación en Chrome real por CDP: arrastre fluido y simulación por hoja | S1-S3 | inline | — |

## Log

- **L1** — «haz pull del repositorio , actualiza engram y dime como seguimos». Autoriza pull, refresh del export de Engram y reporte de estado.
- **L2** — Elección del humano: «P0: performance del editor (recomendado)» — «Parser lineal + memoización, arrastre con commit en pointerup, netlist por hoja. Hace demostrable el diferenciador.» Autoriza T1-T4.
- **L3** — Baseline al abrir la tanda: `node --test` en `app/` → **205 tests, 0 fallos**. `main` == `origin/main` en `9057f26`. Export de Engram refrescado a 65 obs / 11 sesiones / 84 prompts, 0 `sync_id` perdidos, commit `9dd6fee`.
