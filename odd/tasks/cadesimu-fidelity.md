# cadesimu-fidelity — Calibración visual de símbolos CADe_SIMU sobre library.ts

**Objetivo:** subir la fidelidad visual de los símbolos piloto (8000, 8001, 9000, 9008, 1000)
refinando los `SymbolDef` existentes en `app/src/symbols/library.ts` contra la captura real
`docs/cadesimu-svg/reference/PR1_Rodolfo_Giusti_03.png`, con un harness de comparación.
NO se integra el prototipo `docs/cadesimu-svg/src/CadeSymbol.tsx` como ruta paralela.

**Branch:** `cadesimu-fidelity` · **Delivery:** single branch, commits por tarea (ask-on-risk)
**Runner:** `pnpm --filter electro-simulador test` (node:test)

## Specs

- S1: El harness de calibración renderiza los defs REALES de `library.ts` (mismo `shapes(w,h)`
  y labels que usa el lienzo) para los códigos 8000, 8001, 9000, 9008 y 1000, junto a un recorte
  de la captura de referencia para cada símbolo, en una página autocontenida comparable a escala fija.
- S2: Las correcciones de geometría se aplican a los `SymbolDef` de `library.ts` (o sus helpers en
  `draw.ts`); no se agrega geometría duplicada ni componentes paralelos.
- S3: "Que un contacto se dibuje igual abierto que cerrado" es inaceptable: los estados de
  simulación (`closed`, `live`, `lampColor`) se preservan y quedan cubiertos por tests.
- S4: Los bornes (`pins` con designadores 13/14, 11/12, A1/A2, etc.) no cambian de identidad;
  sólo su geometría puede ajustarse si la comparación lo justifica.
- S5: `docs/cadesimu-svg/README.md` se corrige: sus rutas de integración eran suposiciones
  (no había checkout inspeccionado); el README debe reflejar que la calibración va sobre
  `library.ts` y que el prototipo es material de referencia descartado.
- S6: La lectura/escritura de `.cad` no cambia (parser intocado).

## Tasks

- T1: Branch `cadesimu-fidelity` creado desde main. (commit: —)
- T2: Harness: `app/scripts/make-calibration.ts` → `docs/cadesimu-svg/calibration.html` con
  defs reales + recortes de referencia. Route: inline. (commit: e4ad856)
- T3: Calibrar 8000/8001 (pulsadores NA/NC) contra el recorte. Route: inline. (commit: ver Log L5)
- T4: Calibrar 9000 (bobina) y 9008 (piloto) contra el recorte. Route: inline. (commit: ver Log L6)
- T5: Calibrar 1000 (motor trifásico) contra el recorte. Route: inline. (commit: ver Log L7)
- T6: Tests de geometría que fijen las correcciones + suite completa verde. Route: inline.
- T7: S5 (README del prototipo corregido). Route: inline.

## Log

- L1 (pedido del usuario, verbatim): "revisa este informe: [...] y en @docs/cadesimu-svg/ hay
  prototipo con esas ideas, que te parece aplicarlo en un branch?"
- L2: Revisión contra el repo: la arquitectura del informe ya existe en gran parte
  (catalog.ts generado del binario, library.ts con shapes/pins/labels, SymbolGlyph con
  estados, parser lossless). El prototipo es un paso atrás (57 líneas, sin estados, bornes
  sin nombres). Decisión del usuario: calibración sobre library.ts (opción recomendada).
- L3: Los 5 códigos piloto están presentes en el .cad de referencia:
  *3*8000#, *4*8001#, *7*9000#, *11*8000#, *23/24/25*9008#, *30*1000#.
- L4: Dirección de giro de la paleta resuelta con evidencia numérica de las capturas
  `app/test_simu/*_simu_play*.png` (escala 4 px/u, misma que la referencia):
  NA en reposo punta a −3u del conductor (26.57°); NA accionado punta a −1u (~9.46°),
  pivote fijo en el conductor abajo — verificado en K1M-aux (play_03) y F0 (play_04);
  CADe sí anima las paletas y deja 1u visual al cerrar (no llega a tocar).
  NC presionado: sin captura directa; por espejo del mecanismo (carrier común mueve
  ambas puntas hacia el eje y frena a 1u) punta a +1u. Convención repo
  (`active = deg>0 ? closed : !closed`): 8000 → deg +17.1, 8001 → deg −17.1.
- L5 (T3): 8000/8001 migrados a `anchor: 'origin'` con `originPins` 13/14 y 11/12 en
  (0,0)/(0,12), geometría medida rel primer borne: NA = stub (0,−6)→(0,−3.25), paleta
  (0,3)→(−3,−3) pivote (0,3), stub (0,3)→(0,5.75), guion (−3,0)→(−1.5,0), corchete E
  (x=−6, brazo central (−6,0)→(−4.25,0)); NC = stub (0,−6)→(0,−2.5), barra (0,−2.5)→(3.25,−2.5),
  paleta espejo (0,3)→(3,−3), stub (0,3)→(0,5.75), dos guiones y=0 (0..1.5 y −3..−1.25),
  mismo corchete E. Stubs y paleta sin `thin`; corchete y guiones `thin`.
  DESCUBRIMIENTO: `families.ts` genera defs para 8000/8001 (`pushDevice`) que pisaban
  los de `library.ts` en `BY_CODE`; eliminado el override y `pushOperator` (quedó
  huérfano). Los tests que fijaban la geometría vieja actualizados (symbol-grid T10
  retirado, lista "no migrados" sin 8000). Verificación raster (overlaydiff): NA
  81/81 px de tinta cubiertos, 0 fuera; NC 104/111, los 7 restantes son glifos de
  texto overlay (rótulos de bornes), no geometría. Suite completa 311/311 verde.
  Dato para T4: `coilVertical(9000)` en families.ts también pisa la bobina de library.
- L6 (T4): 9000 migrado a `anchor: 'origin'` (originPins A1@(0,0), A2@(0,12)); shapes
  medidas: conductora continua `M0 -5.87L0 5.88` (el tramo hasta A2 lo dibuja el
  ruteador) y rectángulo `M-4 -2H4V2H-4Z`, sin labels (los rótulos los pone el lienzo).
  Confirmado en el ASCII map (K1M en 66,141): rect 62..70 × 139..143, stubs hasta
  ±5,75, letra del cuerpo ausente. families.ts: eliminado `coilVertical(9000)` (pisaba
  library; queda para 7018). Tests actualizados: symbol-grid pierde 9000 de la lista
  de caja y el test del rectángulo viejo (−4.7..+4.7 × 3.5..8); symbol-anchors suma
  tests de 9000 y de 9008-inalterada (S6: la lámpara ya estaba calibrada y no se toca).
  Raster: ref 143 px, overlap 126, los 17 restantes son rótulos A1/A2 overlay. Suite
  312/312 verde. Pendiente T5 (motor 1000).
- L7 (T5): 1000 (motor trifásico) migrado a `anchor: 'origin'` con `originPins`
  U1@(0,0), V1@(6,0), W1@(12,0), PE@(18,0) — los bornes caen sobre la fila del
  registro (los wires del .cad terminan en y=168 = posición del registro *29 en
  cad (183,168)) y la tinta empieza 6u arriba tapando el cable, igual que CADe.
  Geometría medida con rowprobe/px exactos sobre M1 en (183,168): círculo r=9
  centrado en rel (6,6) (el "+6.5" de T2 era un error de muestreo a 0,25u);
  stubs U1→−0.375, V1→−2.875 (borde en el apex), W1→−0.875, cada uno a ~0,15u
  del borde del círculo (hueco visual de CADe); PE: stub (18,−6)→(18,6), gancho
  (18,6)→(15.5,6), terminal = arco concéntrico al cuerpo r=9,75 de (15.55,4) a
  (15.55,8) — NO es una marca de tierra: el arco de tierra del def viejo se
  eliminó, y la "barra izquierda" de los mapas es el propio borde casi
  vertical del círculo. Labels: M en rel (6,3) tamaño 2,8 y "3~" en rel
  (6,7.5) tamaño 2,5 (overlay rojo en CADe; la app pinta los suyos). Borrado
  el alias duplicado `motor3f` (`{...motor, code: 1000}`) y `motor` entra al
  `ALL` en su lugar; import `round` de library.ts quedó huérfano y se quitó.
  Test RED→GREEN en symbol-anchors (assert del bbox: el sobreenvolvente de
  arcos de `shapesBounds` es conservador para el arco del PE, caja hasta
  x=25,3 con tinta real hasta x=18 — documentado en el comentario del test).
  Raster (overlaydiff, extendido con rasterizado paramétrico de arcos `a`):
  ref 366 px, overlap 317 (87%), stray=0 (cada px dibujado tiene tinta CADe a
  ≤2px), refOnly=49 = rótulos de bornes + glifos M/3~ + anillo AA del trazo.
  Suite 313/313 verde. Pendiente T6 (differential + suite) y T7 (README).
