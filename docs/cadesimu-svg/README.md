# Prototipo de símbolos CADe_SIMU (React + TypeScript + SVG)

Incluye cinco símbolos iniciales: 8000, 8001, 9000, 9008 y 1000, y sus terminales en coordenadas locales.

**Estado:** material de referencia DESCARTADO para integración. Este prototipo fue el punto de
partida del informe de fidelidad, pero la calibración finalmente se aplicó directamente sobre
los `SymbolDef` de `app/src/symbols/library.ts` (branch `cadesimu-fidelity`), no como una ruta
paralela. Los `SymbolDef` migrados usan `anchor: 'origin'` con los bornes sobre la fila del
registro, y su geometría está medida contra la captura
`reference/PR1_Rodolfo_Giusti_03.png`. Quedan pendientes de calibrar los códigos 2001 y 6007.

## Dónde está la calibración real

- `app/src/symbols/library.ts`: los defs calibrados (8000, 8001, 9000, 1000; 9008 ya coincidía).
- `app/scripts/make-calibration.ts` → `calibration.html`: harness que renderiza los defs REALES
  de `library.ts` junto a los recortes de la captura de referencia, a escala fija (S=4).
- `app/test/symbol-anchors.test.ts`: tests que fijan el anclaje al origen y la geometría medida.
- `app/src/symbols/families.ts`: los overrides de familia que pisaban los defs calibrados
  (`pushDevice` para 8000/8001, `coilVertical(9000)`) se eliminaron.

## Notas del prototipo (por si se revisa como referencia)

- Los terminales de `terminals` eran preliminares; los valores finales viven en los
  `originPins` de `library.ts`.
- El `.cad` se incluye como referencia; el parser real del repositorio lo lee sin cambios.
- La orientación, el tamaño, las etiquetas y la simbología exacta de CADe_SIMU se tomaron de
  la captura, no de este prototipo.
- No editar `templates.ts` ni `qet.ts` si se generan automáticamente.
