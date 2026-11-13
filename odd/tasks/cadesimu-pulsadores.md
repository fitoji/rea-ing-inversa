# cadesimu-pulsadores — Calibración de los pulsadores 8002/8003/8004/8005

Objetivo: calibrar contra `docs/02/pulsadores.png` (captura CADe_SIMU) los
pulsadores que todavía usan geometría vieja: 8002 (NA-NC), 8003 (conmutado),
8004 y 8005 (seta NA/NC, dibujadas como cúpula + vástago). 8000 y 8001 ya
están anclados y se verifican sin cambios.
Branch: `main` local. Test runner: `pnpm test` desde `app/`.

## Specs

- S1 (pedido verbatim): "despues en la misma carpeta tenemos capturas y .cad
  para calibrar otros componentes".
- S2 (mapeo): `docs/02/pulsadores.png` es 1119×430 RGB, escala **9 px/u**
  (δ designadores 189 px / 21 u), mapeo `px = cad*9 + OX(-66)`,
  `py = cad*9 + OY(-180)`. Orígenes: 8000 (21,42)→(123,198); 8001
  (42,42)→(312,198); 8002 (66,42)→(528,198); 8003 (96,42)→(798,198); 8004
  (123,30)→(1041,90); 8005 (123,51)→(1041,279).
- S3: 8000 y 8001 no cambian: el gate raster sobre esta captura da stray=0
  para ambos (la geometría medida en PR1 es la misma).
- S4 (8002, caja 15×15, bornes del archivo 11-13-12-14): NC en la columna 0
  (conductor (0,−6)→(0,−2,5), barra fija (0,−2,5)→(3,5,−2,5), paleta
  (0,3)→(3,−3), conductor (0,3)→(0,5,75)); NO en la columna 9 (conductor
  (9,−6)→(9,−3), paleta (9,3)→(6,−3), conductor (9,3)→(9,5,75)); enlace
  mecánico discontinuo en y=0: (−3,−1), (0,2), (3,5), (6,7,5), thin; corchete
  del operador en x=−6 como el 8000.
- S5 (8003, caja 12×15, bornes del archivo 11-12-14): común arriba en x=3
  (conductor (3,−6)→(3,−3), paleta (3,−3)→(0,5,3)); contactos abajo en x=0
  (conductor (0,2,33)→(0,5,75), barra (0,2,33)→(1,2,2,33)) y x=6 (conductor
  (6,2,33)→(6,5,75), barra (4,78,2,33)→(6,2,33)); guiones en y=0: (−3,−1) y
  (0,2), thin; corchete del operador en x=−6. Se quita
  `contactDevice(8003,'CO','senalizacion')` de `FAMILY_SYMBOLS` para que la
  def anclada gane el Map `BY_CODE`.
- S6 (8004/8005, caja 6×15): actuador de seta = semicírculo de radio 2 con el
  lado plano en x=−6 (de (−6,−2) a (−6,2) pasando por (−8,0)) + vástago
  (−6,0)→(−4,1,0). El contacto es el del 8000 para el 8004 y el del 8001 para
  el 8005 (paleta, guiones y conductores medidos idénticos).
- S7 (originPins): 8002 → 11 (0,0), 13 (9,0), 12 (0,12), 14 (9,12); 8003 →
  11 (3,0), 12 (0,12), 14 (6,12); 8004 → 13 (0,0), 14 (0,12); 8005 → 11 (0,0),
  12 (0,12). Los cables de CADe conectan en las filas 0 y 12 del registro
  (verificado con los cables reales de S1/8000 en PR1) aunque la tinta se
  dibuje en −6..5,75.
- S8 (gate): cada símbolo da stray=0 con
  `overlay-diff.ts pulsadores.png <code> <x> 42|30|51 9 -66 -180`; los refOnly
  esperados son los rótulos de bornes (p. ej. "13"/"14").
- S9 (tests): el test de anclajes cubre anchor/originPins y la tinta de los
  cuatro (segmentos y bbox). Suite completa verde y `npx tsc --noEmit` limpio.
- S10 (differential): ningún otro símbolo ni salida existente cambia; solo se
  tocan los defs 8002/8003/8004/8005 (y la familia del 8003).

## Tasks

- T1 (S4-S7): reescribir los defs en `app/src/symbols/library.ts`. Route:
  inline. DONE.
- T2 (S5): quitar el 8003 de `FAMILY_SYMBOLS` en `families.ts`. Route: inline.
  DONE.
- T3 (S9): test RED → GREEN en `app/test/symbol-anchors.test.ts`. Route:
  inline. DONE (RED en anchor; suite completa 367/367; tsc limpio).
- T4 (S8): gate raster de los cuatro (stray=0). Route: inline. DONE — los
  seis (8000/8001 incluidos) dan stray=0.
- T5 (S10): differential def por def. Route: inline. DONE (223 defs,
  changed=4: solo 8002/8003/8004/8005).
- T6: regenerar `calibration.html`. Route: inline. NO APLICA — la página usa
  la captura PR1 y su lista `PILOT`; los pulsadores viven en otra captura
  (`docs/02/pulsadores.png`, copiada a `reference/` para el gate) y no
  aparecen en PR1. Se deja la página como está.

## Log

- L1: pedido verbatim: "despues en la misma carpeta tenemos capturas y .cad
  para calibrar otros componentes". La carpeta es `docs/02/`: captura del menú
  de color de la señalización óptica (implementado antes en el mismo turno:
  picker en el Inspector + `setLampColor`), `pulsadores.cad` (6 pulsadores sin
  cables) y `pulsadores.png`.
- L2: medición: 8000/8001 ya calzan (stray=0) con S=9 y OX/OY medidos. Los
  cuatro restantes son verticales con la tinta en −6..5,75 y los bornes en las
  filas 0/12 (convención confirmada con los cables reales de S1 en PR1:
  extremos en (0,−12)…(0,18) con nodos en 0 y 12). 8002: columnas 0 y 9.
  8003: común arriba en 3 y tiros abajo en 0 y 6. 8004/8005: cúpula de radio 2
  con lado plano en −6 y vástago hasta −4,1 (es la seta vista de perfil; el
  catálogo ya las llamaba seta).
- L3: ajustes de forma medidos, no teóricos: el 8002 lleva cuatro tramos de
  enlace (−3,−1), (0,2), (3,5), (6,7,5); el 8003 apoya la cuchilla en el tiro
  NC con las barras cortas apuntando hacia ella; la cúpula de la seta no es un
  círculo (CADe la aplana cerca del lado plano y llega a −8 en el medio), así
  que se dibuja como polilínea con los puntos medidos y el lado plano
  (−6,−2)→(−6,2). Un arco circular dejaba 7 px de stray; la polilínea, 0.
- L4: evidencia de verificación: test de anclajes 15/15, suite 367/367, tsc
  limpio, gate raster stray=0 en los seis pulsadores, differential changed=4.
- L5: la captura se guardó como `docs/cadesimu-svg/reference/pulsadores.png`
  (el verificador resuelve los PNG ahí); `docs/02/` sigue sin tocar ni
  commitear.
