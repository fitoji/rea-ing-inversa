---
name: cadesimu-calibration
description: "Trigger: calibrar símbolo CADe, fidelidad CADe_SIMU, originPins, anclar al origen, library.ts, verificación raster, overlay diff. Calibrar SymbolDef de app/src/symbols/library.ts contra la captura real de CADe_SIMU."
license: Apache-2.0
metadata:
  author: fitoji
  version: "1.0"
---

# Calibración de símbolos CADe_SIMU sobre library.ts

## Activation Contract

- Se pide calibrar, migrar o verificar la fidelidad de un código de componente de CADe_SIMU en `app/src/symbols/library.ts`, o comparar un `SymbolDef` contra una captura de referencia.

## Hard Rules

- Editar sólo `SymbolDef` en `app/src/symbols/library.ts` o sus helpers en `src/symbols/draw.ts`. Nada de componentes paralelos ni del prototipo `docs/cadesimu-svg/src/` (material descartado).
- La identidad de los bornes (`U1`/`V1`, `A1`/`A2`, `13`/`14`…) no cambia; sólo la geometría.
- A los defs sólo entra tinta del símbolo: el texto overlay de la captura (rótulos de bornes, designadores) lo pinta el lienzo.
- Los defs migrados van `anchor: 'origin'` con `originPins` sobre la fila del registro donde atan los cables. Eliminar en `families.ts` los overrides que lo pisaban (`BY_CODE`: gana el último de `ALL`) y los aliases duplicados.
- Estados de simulación (`closed`, `live`, `lampColor`) preservados y cubiertos por tests.
- No se declara fidelidad sin evidencia px observada (raster + tests).

## Decision Gates

| Situación | Acción |
|---|---|
| Captura nueva (no `PR1_Rodolfo_Giusti_03.png`) | Re-medir S/OX/OY desde dos puntos conocidos antes de usar px↔cad |
| Def ya migrado con override en `families.ts` | Borrar el override, no el def de library |
| Bordes/curvas en la medición | Sondear filas/columnas exactas en px; los mapas muestreados erran ±0,125u |

## Execution Steps

1. Ubicar el registro en el `.cad`: `*N*CODIGO#...` con posición en los campos `*X*Y`; los wires `*N*4000#...` terminan en los puntos de conexión.
2. Medir la tinta sobre el PNG: negro puro = `mx<120 && mx-mn<30`; wires oscuros `mx<150`; núcleos brillantes invisibles en mapas de tinta.
3. Reescribir el def en unidades del archivo: gaps visuales ~0,15u, `round()` redondea medio punto lejos de cero (usar strings redondeados en asserts).
4. Test RED en `app/test/symbol-anchors.test.ts` (anchor, originPins, bbox de tinta, strings de `d`, sin fills) → GREEN con `pnpm test` desde `app/`; actualizar tests del grid que fijen la geometría vieja; differential: extraer `app/src/symbols` del commit base a scratch (`git archive`) y comparar `symbolList()` def por def — sólo el código objetivo puede diferir.
5. Verificar raster: `node assets/overlay-diff.ts <png> <code> <ox> <oy> [S OX OY]` desde la raíz del repo. Aceptable con `stray=0` y `refOnly` = texto overlay + anillo antialias del trazo. Regenerar `docs/cadesimu-svg/calibration.html` (`pnpm --filter electro-simulador` no aplica: correr `node scripts/make-calibration.ts` desde `app/`).

## Output Contract

- Por código calibrado: commit, stats raster (`ref/overlap/refOnly/stray`), resultado de suite, y línea `Risk:` del cambio.

## References

- `docs/cade-format.md` — formato de registros y unidades.
- `odd/tasks/cadesimu-fidelity.md` — Log L5–L7: geometrías medidas (8000, 8001, 9000, 1000) y método.
- `app/scripts/make-calibration.ts` — decodificador PNG del repo y mapeo px↔cad de la referencia.
- `app/test/symbol-anchors.test.ts` — forma canónica de los tests de anclaje.
