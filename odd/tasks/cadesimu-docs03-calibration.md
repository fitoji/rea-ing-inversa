# cadesimu-docs03-calibration — Calibración de componentes de docs/03

Objetivo: calibrar contra las capturas de `docs/03/` los componentes que
todavía no están anclados al origen, llevando sus defs a la app con evidencia
px (gate raster stray=0, tests, tsc y suite verde).
Branch: `main`. Test runner: `pnpm test` desde `app/`.

## Specs

- S1 (pedido verbatim): "con las skills que tienes empieza a tomar los
  componentes y llevalos a nuestra app , bien calibrados"
- S2 (material): dos pares CAD texto + captura PNG en `docs/03/`:
  - `componentes01` ↔ `componentes01.png` (903×489, 30 comps): contiene
    1050,1051,2000,2001,3000,3001,3002,3003,3004,3005,3011,5000,5002,5004,6005,6006,6008,6010,7000,7001,7002,7003,8015,8016,8017,8018,8019,9000,9001,9002,9009.
  - `componentes02.cad` ↔ `componentes02.png` (757×478, 32 comps): contiene
    2000,2001,2006,3000,3001,3003,3004,3005,3011,5000,5001,5002,5003,5004,6000,6001,6002,6003,6005,6006,6008,6009,6010,8014,8015,8016,8017,8018,8019,9000,9001,9002,9009.
  `componentes01.cad` es un PNG mal nombrado (no es CAD de texto). Las capturas
  se copiaron a `docs/cadesimu-svg/reference/` para el verificador.
- S3 (ya anclados, no recalibrar salvo desvío): 1000,2001,3000,3001,6001,7016,
  8000-8005,8016,9000,9003,9004,9008.
- S4 (unión sin anclar en docs/03, 33): 1050,1051,2000,2006,3002,3003,3004,3005,
  3011,5000,5001,5002,5003,5004,6000,6002,6003,6005,6006,6008,6009,6010,7000,
  7001,7002,7003,8014,8015,8017,8018,9001,9002,9009.
- S5 (método, por skill cadesimu-calibration): medir S/OX/OY por captura desde
  puntos conocidos; reescribir defs en `app/src/symbols/library.ts` con
  `anchor:'origin'` y `originPins` en las filas de conexión (cables en filas 0
  y alto-3/12 del registro según convención), quitar overrides en `families.ts`
  que los pisen; no cambiar identidad de bornes; tinta del símbolo solamente.
- S6 (evidencia por lote): test RED→GREEN en `app/test/symbol-anchors.test.ts`,
  `node .agents/skills/cadesimu-calibration/assets/overlay-diff.ts` con stray=0
  (refOnly = overlay de texto/anillo), `pnpm test` + `npx tsc --noEmit` verdes,
  differential base-vs-árbol con solo los códigos objetivo cambiados.
- S7 (alcance de esta sesión): empezar por lotes prioritarios y verificables;
  no declarar completado lo no medido. Prioridad inicial: 9009 (hermana de
  9008, alta frecuencia), 7000/7001/7002/7003 (auxiliares), 3002-3005/3011
  (alimentaciones), 8017/8018 (contacto térmico/conmutador), 2000/2006
  (contactores), 5000-5004 y 6000/6002/6003/6005/6006/6008/6009/6010
  (protección), 8014/8015, 9001/9002, 1050/1051.

## Tasks

- T1 (S2,S5): medir S/OX/OY de `componentes01.png` y `componentes02.png` desde
  anclajes conocidos; documentar en Log. Route: inline.
- T2 (S4,S5,S6): calibrar lote 1 (a definir tras T1, prioridad alta) con tests,
  gate raster y differential. Route: inline.
- T3+: lotes siguientes según avance y evidencia. Route: inline.

## Log

- L1 (pedido verbatim): "con las skills que tienes empieza a tomar los
  componentes y llevalos a nuestra app , bien calibrados"
- L2: inventario docs/03: `componentes01`+`componentes01.png` y
  `componentes02.cad`+`componentes02.png` son pares CAD/captura; `componentes01.cad`
  es PNG mal nombrado. 33 códigos sin anclar presentes en unión (ver S4).

- L3 (T1 parcial): mapeo de `componentes01.png` medido desde anclajes
  conocidos (3000/3001 verificados con stray=0): **S=4, OX=-17, OY=-101**
  (`px = cad*4 + (-17,-101)`). La 8016/9000/2001 no dan stray=0 con este
  mapeo contra sus defs actuales, pero 3000/3001 sí; el mapeo es consistente
  con las posiciones de los stems medidos. Mapeo de `componentes02.png`
  pendiente de cierre (escala/offset distinto al de componentes01).
- L4 (T2, lote 1 — 9009): `Señalización óptica intermitente` anclada al origen
  (X1 en 0,0; X2 en 0,12) con la base `cadesimuLamp()` + destello medido en px
  sobre `componentes01.png`. Gate raster: ref=149 overlap=140 stray=0
  (componentes01.png, 9009 en 135,36, S=4 OX=-17 OY=-101). Test de anclaje
  GREEN; tsc limpio. Quitado `lampDevice(9009,...)` de `families.ts`.
