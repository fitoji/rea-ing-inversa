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

- [x] T1 (S2,S5): medir S/OX/OY de `componentes01.png` y `componentes02.png`.
  - comp01: `S=4, OX=-17, OY=-101` (`px=cad*4+(-17,-101)`), verificado stray=0 en 3000/3001.
  - comp02: `S=4, OX=-2, OY=-60` verificado stray=0 en 3000; 6001/2001 no cierran con defs actuales (requiere revisión).
- [x] T2 lote 1 (S4,S5,S6): 9009 anclada (commit `504cc58`, stray=0).
- [~] T3 lote 2 contactos auxiliares/conmutadores: 7000,7001 anclados (commit `ede08c3`, stray=0). 7002,8018 anclados (comp01 S=4,-17,-101, stray=0). 7003,8015,8017,8014 pendientes.
- [ ] T4 alimentaciones 3002-3005,3011.
- [ ] T5 bobinas 9001,9002; resistencias 1050,1051.
- [ ] T6 contactores 2000,2006.
- [ ] T7 fusibles 5000-5004.
- [ ] T8 protección 6000,6002,6003,6005,6006,6008,6009,6010.
- [ ] T9 restantes comp01/comp02: 7003,8014,8015,8017 y exclusivos/cruzados (2006,5001,5003,6000,6002,6003,6009,8014, resto comp02).
- [ ] T10 verificación comp02, diferencial, suite, tsc, push.

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

- L5: 7000/7001 anclados y cerrados con gate stray=0 sobre componentes01 (commit `ede08c3`). 7000: ref=50 overlap=48 refOnly=2 stray=0 (114,33). 7001: ref=70 overlap=62 refOnly=8 stray=0 (114,54).
- L6 (mapeo comp02): `componentes02.png` mapeo `S=4, OX=-2, OY=-60` verificado con 3000 (stray=0, 15,36). 6001/2001 no cierran con ese mapeo usando defs actuales; requiere verificación por símbolo.
- L7 (estado): pendientes 30 códigos: 7002,7003,8014,8015,8017,8018,3002-3005,3011,1050,1051,2000,2006,5000-5004,6000,6002,6003,6005,6006,6008,6009,6010,9001,9002. Comp02-exclusivos: 2006,5001,5003,6000,6002,6003,6009,8014. TSC limpio en último chequeo. Push pendiente.
- L8: 7002 (aux NA-NC, 93,75 comp01) y 8018 (conmutador 2 posiciones, 144,90 comp01) anclados en `app/src/symbols/library.ts` con stray=0 (gates ref=189/211 overlap=162/172). Tests de anclaje añadidos; imports no usados removidos. 7003,8015,8017 intentados pero sin stray=0 y revertidos (siguen pendientes).
