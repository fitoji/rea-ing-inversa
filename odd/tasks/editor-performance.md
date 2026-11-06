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
| T1 | Índices de `#` precomputados por parseo + memo `text → Project` por identidad de texto | S1 | inline | `c088faf` |
| T2 | Arrastre como estado transitorio de `Canvas`, `applyDrag`/`commit` una sola vez en `pointerup` | S2 | inline | `perf(ui): commit cable drag once on pointerup` |
| T3 | Clave de red con namespace de hoja y netlist construido por hoja | S3 | inline | `fix(sim): scope netlist keys per sheet` |
| T4 | Verificación en Chrome real por CDP: arrastre fluido y simulación por hoja | S1-S3 | inline | — |

## Log

- **L1** — «haz pull del repositorio , actualiza engram y dime como seguimos». Autoriza pull, refresh del export de Engram y reporte de estado.
- **L2** — Elección del humano: «P0: performance del editor (recomendado)» — «Parser lineal + memoización, arrastre con commit en pointerup, netlist por hoja. Hace demostrable el diferenciador.» Autoriza T1-T4.
- **L3** — Baseline al abrir la tanda: `node --test` en `app/` → **205 tests, 0 fallos**. `main` == `origin/main` en `9057f26`. Export de Engram refrescado a 65 obs / 11 sesiones / 84 prompts, 0 `sync_id` perdidos, commit `9dd6fee`.
- **L4** — T1 cerrado (`c088faf`). La premisa del audit sobre el tamaño no se reprodujo: `parse` del fixture real tarda **1,09 ms**, no 85,7 ms. La forma cuadrática sí se confirmó (duplicar el documento multiplicaba por 3,92). Arreglado: 4000 registros 87 → 1,25 ms, 8000 → 2,34 ms. Errata agregada a `docs/auditoria-v0.3.md`. Suite 207/207, `tsc --noEmit` limpio, `parse` idéntico en los 6 fixtures contra el commit base.
- **L5** — T3 cerrado. El mecanismo real de P0-3 no era el del diagnóstico: no hay puntos de cable compartidos entre hojas en el fixture. Lo que se mezclaba eran **3 bornes de la hoja 1** que caen en coordenadas de cables de la hoja 0 (`54,69`, `54,78`, `54,84`), más el **número de cable**, que no tenía hoja (el cable 4 "tenía" 6 tramos de dos páginas). Arreglado con `CadeRecordModel.sheet` y claves `"<hoja>|<x>,<y>"` / `"<hoja>:<cable>"`. Diferencial: los 5 archivos de una hoja conservan la partición exacta de redes; `inversion-giro-cej.cade` pasa de 51 a 54 redes (los 3 bornes dejan de fusionarse). Además `moveVertex` recibía la hoja por parámetro: sin eso la selección posterior al arrastre cruzaba páginas. Suite 213/213.
- **L6** — T2 (arrastre con commit en `pointerup`) **no se implementa**: medido en Chrome real por CDP sobre el fixture más pesado (12,9 KB, 136 cables), el arrastre sostiene 60 fps (mediana de fotograma 16,7 ms, p95 16,8 ms contra un reposo de 16,7 ms), con 2 long tasks de hasta 60 ms en el `pointerup`. La premisa de "~4 fps" del audit venía del valor de parseo equivocado (85,7 ms en vez de 1,09 ms). Sin beneficio demostrable, el refactor de la vista previa a `Canvas` queda fuera.
