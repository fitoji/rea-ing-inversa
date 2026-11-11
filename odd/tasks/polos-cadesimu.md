# Polos verticales y fidelidad CADeSimu

Redibujar los símbolos de aparamenta de `app/src/symbols/` con polos verticales, flujo
arriba→abajo y bornes sobre la grilla de 6 unidades de CADeSimu, preservando el juego de
nombres de borne de cada código. Criterio de aceptación: cada componente se ve como su PNG
de `data/samples/components_png/` y sus puntos de conexión caen en la grilla medida en
`docs/cade-format.md:177-196`.

## Specs

**S1.** Los símbolos de aparamenta de potencia se dibujan con polos **verticales**, flujo de
energía arriba→abajo. La cuchilla es oblicua desde arriba-izquierda hasta el pivote y el
conductor continúa vertical hacia abajo desde el pivote.

**S2.** Los **terminales dibujados** de cada símbolo coinciden con los puntos de conexión que
`attachPoints()` (`app/src/editor/pins.ts`) deriva de los cables: con la caja `(w, h)` del
`.cade`, un terminal dibujado cae en `x ∈ {0, 6, 12, 18…}` e `y ∈ {0, h − 3}`. La grilla ya
está medida y testeada (`test/pins.test.ts:41-67`); lo que falta es que el dibujo la respete.

**S2b.** No se cambia `attachPoints()`. Los bornes de un esquema importado siguen derivándose
de sus cables, que es lo que ya hace correcto a un archivo CADeSimu.

**S2c.** La caja declarada es la **grilla de conexión**, no el bbox del dibujo. El arte puede
desbordarla: el accionamiento manual va a la izquierda de `x = 0` y la punta de la cuchilla del
primer polo sale a `x < 0`. Ya era así en el repo: `app/src/symbols/templates.ts` declara el
guardamotor con offset `-21 -3 18 24`. Ninguna prueba debe exigir que el dibujo entre en la caja.

**S3.** La disposición de nacimiento por familia, tal como se midió en archivos reales
(`docs/cade-format.md:188-196`) y se verifica en `test/pins.test.ts`. Es la referencia que el
dibujo debe tocar:

| Componente | Caja `(w, h)` | Puntos de conexión |
|---|---|---|
| motor `1000` | `24, 24` | `(0,0) (6,0) (12,0) (18,0)` — una sola fila arriba |
| contactor `2001` | `18, 15` | `(0,0) (6,0) (12,0)` y `(0,12) (6,12) (12,12)` |
| térmico `6007` | `21, 15` | ídem contactor |
| fusible `6009` | `18, 24` | filas en `y = 0` y `y = 21` |
| pulsador `8000` | `6, 15` | `(0,0) (0,12)` |

**S4.** Los **nombres de borne no cambian**. Es el único contrato que el `.cade` guarda
(`docs/cade-format.md:179`): motor `U1 V1 W1 PE`; potencia `1 3 5` / `2 4 6`; auxiliares
`13 14` (NA), `11 12` (NC); bobinas `A1 A2`; térmico auxiliar `95 97 96 98`.

**S5.** Cada componente se ve como su PNG de referencia en `data/samples/components_png/`. PNG
de referencia: `motor trifasico.png`, `disyuntor trifasico.png`, `rele termico.png`,
`interruptor automatico de proteccion contra cortocircuitos y sobrecargas.png`,
`interruptor proteccion contra cortocircuitos monofasico.png`, `rele diferencial.png`,
`fusible monofasico.png`, `pulsador no.png`, `pulsador nc.png`,
`bobina rele de contactor.png`.

**S6.** Elementos gráficos hoy ausentes, que S5 exige: cuerpo con celdas y tabiques
compartidos; gancho térmico `⊐` por polo; triángulo magnético `▷` por polo; cuadrado relleno
sobre la cuchilla del automático y del contactor; toroide del diferencial; accionamiento
manual (cuadrado con cruz) con enlace mecánico discontinuo `4 3`; vástago y bracket del
pulsador; fusible como rectángulo vertical.

**S7.** Todos los códigos de protección tienen símbolo propio. Hoy `6000`–`6010` no tienen
`def()` en `families.ts` y caen al dibujo genérico.

**S8.** Los `.cade` viejos **no se migran**. Se acepta que esquemas guardados con la geometría
anterior queden con las conexiones corridas.

**S9.** El SVG producido cumple las convenciones ya acordadas en
`data/simbolos-electricos-une-svg/SKILL.md:33-41`: `fill="none"`, `stroke="currentColor"`, un
solo grosor de trazo, sin `transform`, un `<g id>` por parte, nombre de archivo en kebab-case.

## Tasks

| ID | Specs | Ruta | Commit |
|---|---|---|---|
| T1 | S2 | Alinear los terminales **dibujados** a la grilla. `spread()` + `left`/`right` dejan de usarse en `poles()`: la posición sale de la caja declarada. Test: para cada código con caja, `pin.nx * w` cae en múltiplos de 6 y `pin.ny * h` en `{0, h−3}`. | `feat(symbols): alinear terminales dibujados a la grilla` |
| T2 | S1, S2 | `verticalPole()` en `draw.ts`: cuchilla oblicua, pivote, longitud de hueco (`SKILL.md:41`). Migrar `threePole()` a polos verticales. | `feat(symbols): primitiva de polo vertical` |
| T3 | S6 | Elementos faltantes en `draw.ts`: `filledSquareOnBlade`, `thermalHook`, `magneticTriangle`, `cellBody`, `torus`, `manualOperator`, `pushButton`. | `feat(symbols): elementos UNE del polo vertical` |
| T4 | S3, S4, S5, S7 | Redibujar `families.ts`: motores, protección 5000–5008 y 6000–6020, mando 8000/8100, bobinas 9000. | `feat(symbols): redibujar familias verticales CADeSimu` |
| T5 | S4, S5 | Verificación end-to-end: cada símbolo contra su PNG y su grilla de bornes. | `test(symbols): fidelidad de símbolos y bornes` |

## Delivery

Rama: `feat/simbolos-verticales-cadesimu` (desde `main`).

Límites de slice, en orden de commit:

- **Slice A** — este documento y `docs/futuro-catalogo-simbolos.md`. Commit `docs(odd)`.
- **Slice B** — la geometría: `app/src/symbols/draw.ts`, `families.ts`, `library.ts` y
  `app/test/symbol-grid.test.ts`. Commit `feat(symbols)`. Es una unidad aunque supere las 400
  líneas: los tests no existen sin las primitivas y las primitivas no tienen sentido sin ellos.
- **Slice C** — `docs/componentes.md` y `docs/img/componentes/**` regenerados. Commit
  `docs(components)`.
- **Slice D** — `shapesBounds()` y el `viewBox` de las miniaturas, más el resultado de la
  verificación T5. Commit `fix(docs)`.
- **Slice E** — export de Engram (`docs/engram/rea-ing-inversa.json`). Commit `docs(engram)`.
  Es el último: deja el conocimiento del proyecto en el repo para retomar desde otra máquina.
- **Pendiente** — T7 (precedencia de packs), toroide y pulsador, y el barrido visual con render
  real de los 10 PNG.

Para reanudar en otra máquina: `git checkout feat/simbolos-verticales-cadesimu`, importar
`docs/engram/rea-ing-inversa.json` si hace falta recuperar la memoria, y arrancar por T7.

Fuera de la feature: `app/test/visual.test.ts`, `lamp-color.test.ts`, `catalog.test.ts` y
`component-spec.test.ts` son trabajo del usuario sin commitear y no entran en ningún slice.

## Log

**L1** (pedido original, verbatim): «lo importante es mantener 100% compatibilidad con CADeSimu, no me importa que pasa con los cade viejos, quiero que los componentes se vean como en cadesimu»

**L2** (verbatim): «sigue con los 9 restantes»

**E1** Evidencia: los 10 PNG de `data/samples/components_png/` están correctos y los 10
símbolos de la app están mal. Causa única: todas las primitivas asumen flujo horizontal
izquierda→derecha. `contact()` (`app/src/symbols/draw.ts:74-81`), `poles()`
(`draw.ts:103-109`), `spread()` + `left`/`right`.

**E2** Evidencia: `poles(3)` asigna `1 3 5` a la izquierda y `2 4 6` a la derecha, con `1` y
`2` enfrentados a la misma altura — no `1 3 5` arriba y `2 4 6` abajo (`draw.ts:103-109`).

**E3** Evidencia: `SymbolPin.side` ya soporta `'top' | 'bottom'` (`app/src/symbols/library.ts:41`)
y el motor de `library.ts:93` los usa. El modelo lo permite; el helper no lo aprovecha.

**E4** Evidencia: la grilla real de CADeSimu está medida en `docs/cade-format.md:183-196`.
Las filas son `y=0` y `y=alto−3`, no bordes geométricos.

**E5** Evidencia: el formato `.cade` no guarda coordenadas de borne
(`docs/cade-format.md:179`), pero sí guarda los extremos de los cables. Por eso la posición
del borne afecta la fidelidad visual de un esquema importado, aunque no la validez del archivo.

**E6** Evidencia que **retira** la necesidad de implementar la grilla: ya existe y está testeada.
`app/test/pins.test.ts:21-38` verifica los 4 bornes del motor en `[0, 6, 12, 18]` sobre el borde
superior; `:41-67` verifica contactor `2001` en `[0,0] [6,0] [12,0] [0,12] [6,12] [12,12]` con
`h − 3 = 12`; `:69-75` verifica el fusible `6009` con filas `[0, h−3]`. Los puntos salen de
`attachPoints()` (`app/src/editor/pins.ts`), derivados de los cables de `.cade` reales. Queda
sólo hacer que el **dibujo** toque esos puntos, que es T1 en su forma corregida.

**E7** Consecuencia de E6: el riesgo de romper `solver.ts` o los esquemas guardados queda
acotado. Un esquema importado no toma sus bornes de `library.ts`, los toma de sus cables. El
riesgo real se limita a componentes **nuevos** colocados desde la app y a la coincidencia
visual entre el terminal dibujado y el punto de conexión.

**D1** Decisión del usuario (S8): los `.cade` viejos no importan.

**D2** Decisión de diseño: no vectorizar los PNG. El PNG es referencia para decidir geometría,
nunca insumo de build (ver `docs/futuro-catalogo-simbolos.md`).

**D3** Decisión de diseño (S2c): la caja declarada es la grilla de bornes y el dibujo puede
desbordarla. Evidencia en `app/src/symbols/templates.ts` (guardamotor en `-21 -3 18 24`).
Consecuencia: el accionamiento manual se dibuja a la izquierda del cuerpo y el cuadrado relleno
puede salir por la izquierda; la prueba "todo relleno dentro de la caja" se reemplaza por un
invariante correcto, no se borra.

**E11** T3 entregado y verificado: `filledSquareOnBlade`, `thermalHook`, `magneticTriangle`,
`cellBody`, `manualOperator`. `app/test/symbol-grid.test.ts` 9/9, `tsc` limpio, suite 252/247/5
con las mismas 5 fallas WIP previas. Límites encontrados y resueltos por D3: el cuadrado no
entraba en los multipolares, el accionamiento no tenía margen y el `6018` de 12×15 no da altura
para dos filas. El cuadrado tampoco anima con la cuchilla: `SymbolGlyph` rota por regex de dos
puntos sobre el bbox y no puede rotar un polígono (fuera de alcance).

**E12** T4 entregado y verificado. `protectionDevice` cubre `6000`–`6010` con cajas medidas
(`6001` 12×15, `6002` 12×15, `6003` 18×15, `6007` 21×15, `6009` 18×24) y `polesInCadeOrder()`
respeta el orden del formato (`1 3 5 2 4 6`). `6009` lleva cuerpo de dos filas, gancho arriba y
triángulo abajo, con accionamiento a la izquierda. Motor `1000` corregido: `U1 V1 W1 PE` en una
sola fila superior en `x = 0, 6, 12, 18`, caja 24×24, `side: 'top'`. `tsc` limpio,
`symbol-grid.test.ts` 15/15, suite 258/253/5 (las mismas 5 fallas WIP). `pnpm componentes`
regenerado: 235 SVG dibujados, 47 en fallback.

**E13** Defecto abierto, sólo documentación: `app/scripts/make-component-docs.ts:110-112` calcula
`viewW`/`viewH` desde `sym.size`, así que las miniaturas recortan el arte que desborda la caja
(D3). En `docs/img/componentes/6009.svg` el `viewBox` va de `-1.5` a `19.5` y el accionamiento
manual está en `x = -11.38`: se corta. El **lienzo de la app no tiene el problema**:
`app/src/ui/SymbolGlyph.tsx` no declara `viewBox` y dibuja dentro del SVG grande del esquema.
Afecta sólo las miniaturas de `docs/img/componentes/`.

**T6** (nueva) — S2c | Calcular el `viewBox` de las miniaturas desde el bbox de las formas, no
desde `size`. Ruta: `app/src/symbols/draw.ts` (helper `shapesBounds`) +
`app/scripts/make-component-docs.ts`. | `fix(docs): miniaturas sin recorte del arte`

**E14** T5 verificación sobre los 10 PNG, consultando `resolveSymbol()` por código (caja, grilla,
orientación de bornes):

| Código | PNG | Caja | Grilla | Veredicto |
|---|---|---|---|---|
| `1000` | motor trifásico | 24×24 | sí, fila superior | ✅ |
| `6009` | disyuntor trifásico | 18×24 | sí | ✅ |
| `6007` | relé térmico | 21×15 | sí | ✅ |
| `6003` | automático tripolar | 18×15 | sí | ✅ |
| `6000` | protección cortocircuito mono | 12×15 | sí | ✅ |
| `6018` | relé diferencial | 12×15 | sí | ◐ falta el toroide (fuera de alcance) |
| `5000` | fusible monofásico | **6×24** | **no**, bornes en `y=24` | ✗ |
| `8000` | pulsador NO | **14×24** | **no** | ✗ dos terminales, diferido |
| `8001` | pulsador NC | **sin caja** | — | ✗ cae al genérico |
| `9000` | bobina de contactor | **24×24** | **no** | ✗ dos terminales, diferido |

**E15** Causa raíz de las cuatro ✗: **precedencia de packs**. Para `5000`, `8000`, `8001` y `9000`,
`resolveSymbol()` **no** devuelve el `SymbolDef` de `families.ts`: devuelve geometría de otro
conjunto con su propia caja (`5000` 6×24 en vez de 12×15, `9000` 24×24 en vez de 15×15, `8000`
14×24 en vez de 6×15). Por eso el redibujo de `families.ts` queda **bypasseado** en esos códigos,
y por eso sus bornes siguen fuera de la grilla (en `5000` caen en `y=24`, el borde, no en `h−3=21`).
No es un defecto del dibujo: es del orden de resolución en `library.ts`.

**T7** (nueva) — S2, S3, S4 | Resolver la precedencia de `resolveSymbol()` para que el dibujo
propio gane donde corresponde, y que ningún símbolo quede con caja sin declarar. Cubre `5000`,
`8000`, `8001`, `9000`. | `fix(symbols): precedencia de packs y cajas sin declarar`

**R1** ~~Riesgo abierto~~ **Resuelto por E8.** La "anomalía" del pulsador `8000` con ambos bornes
en `x=0` se explica porque su caja mide 6 de ancho: hay una sola columna de grilla. No era una
regla distinta.

**E8** Medición de los tres fixtures (`arranque-paro-motor-3f.cad`, `ej0def.cad`,
`inversion-giro-cej.cade`) por código, caja y puntos de conexión. Confirma filas `0` y `alto−3`.
Corrige dos supuestos propios: la caja **no** es `6 × polos` (`6007` mide 21 de ancho, `9000` 9,
`8018` 15), y la tabla de `docs/cade-format.md` etiqueta mal algún código (llama "fusible `Q1`"
a `6009`, que mide 18×24 con seis bornes `1 3 5 2 4 6`: es tripolar). También revela que
`attachPoints()` es **parcial**: solo devuelve los bornes que tienen cable, así que la medición
es una cota inferior, no el juego completo de bornes.

**E9** Alcance acordado con el usuario ("dale"): se implementa la aparamenta de potencia
(`2000`–`2099`, `5000`–`5099`, `6000`–`6099`) y se dejan los de dos terminales para el final.

**E10** Conflicto con trabajo en curso: `app/test/visual.test.ts`, `lamp-color.test.ts`,
`catalog.test.ts` y `component-spec.test.ts` estaban **modificados sin commitear** antes de esta
tarea. La suite queda en 240 pasan / 5 fallan. Las 5 fallas son de esos tests WIP y no las causa
este cambio: `visualStateOf` (`app/src/sim/visual.ts:82`) decide solo por conjuntos de códigos y
nunca inspecciona formas, así que la geometría no lo afecta.

**Estado** T1 y T2 cerrados: `poles()` deriva de la caja y `verticalPole()`/`verticalPoles()`
dibujan el polo vertical con su metadata `blade`. Tests nuevos en `app/test/symbol-grid.test.ts`,
2/2 en verde, `tsc --noEmit` limpio. Pendiente: elemento gráfico por polo (T3), motor `1000` y
los códigos `6000`–`6010` sin `def()` (T4), verificación contra los PNG (T5). Nota latente: el
`resistor` unipolar tiene caja de 18 de ancho y `poles()` lo centra en `x=9`, que no es múltiplo
de 6; queda fuera del alcance y sin test que lo cubra.
- **L3** (2026-11-11, rama `feat/parity-cadesimu`) — **T7 cerrado** con `dd2f192`:
  la precedencia de packs se resuelve en `library.ts`: una definición propia con
  caja declarada gana sobre el elemento QET; QET sólo pisa definiciones viejas
  sin caja. Con eso los redibujos de la feature quedan visibles (`5000`, `2006`,
  `6010/6017/6019/6020`, `8100`, `9010/9012`, `3012/3013`, `7018`). Además se
  redibujan los códigos medidos que la geometría vieja tenía horizontales:
  `2001` (18×15, `contactorPoles`, orden `1 3 5 2 4 6`), `8000`/`8001` (6×15,
  `pushDevice` con operación `E` nueva `pushOperator()` en `draw.ts`) y las
  bobinas `9000`/`7018` (9×15, `coilVertical`, A1 arriba/A2 abajo). Todas las
  cajas y bornes salen de los fixtures reales (`arranque-paro-motor-3f.cad`).
  Test nuevo en `symbol-grid.test.ts` que fija caja + bornes + orden del CAD.
  **2002 no se redibuja**: «Contactor IIII» serían 8 bornes y el registro guarda
  7 como máximo (lo probó el sintetizador en `catalog.test.ts`); no hay fixture
  real de `2002`, queda bloqueado por datos REA. Evidencia: suite 260/260
  estable (10 corridas), `tsc` limpio.
- **L4** (2026-11-11) — Flake de `parse-perf.test.ts` detectado y estabilizado
  (`622ca7d`): medianas de 5 corridas con ~2,5 ms absolutos daban ratios >2.8
  por jitter del disco; ahora 9 corridas y umbral 3.2 (cuadrático sigue en ~4.0).
  No lo causó el cambio de símbolos: el parser no se tocó.
- **L5** (2026-11-11) — **T8 (toroide + vástago + barrido visual) cerrado** con
  `3677389` y `99f458f`. Toroide del diferencial (`torus()` en `draw.ts`): cápsula
  horizontal fina cruzando el tramo inferior de los polos, r=GRID·0.25 y
  cy=gridBottom−GRID·0.45, medido contra `rele diferencial.png` con recorte
  ampliado (`sips`): la primera versión (r=0.42, cy=−0.55) se superponía con la
  zona de cuchillas y quedó corregida. Disparador (`differentialTrip()`): bracket
  `⊢` + línea a la altura de la cuchilla atravesando una caja de dos celdas +
  conector discontinuo en `L` hasta el extremo izquierdo del toroide — el PNG lo
  muestra horizontal, no como los dos cuadraditos apilados del borrador. 6005/6006
  van con `{ torus, trip }` sin cuerpo ni botón de ensayo (fidelidad S5); el test
  de tabiques dejó de exigir cuerpo en 6005.
  Vástago del pulsador: contra los PNG reales (`pulsador no.png`/`nc.png`) el NA
  **no** lleva varilla superior (eso era el tramo superior del propio polo) —
  `pushOperator()` quedó con bracket pegado al polo, enlace sólido en NA y
  discontinuo en NC con tick vertical en la punta; el NC cuelga la cuchilla de un
  tope en `L` (`pushDevice` dibuja su polo propio, pivote en h·0.55, rotación al
  cerrar por metadata `blade`). Bobinas 9000/7018: la conductora ahora es completa
  (A1 arriba, A2 abajo) y el rectángulo la cruza en el tramo medio, como
  `bobina rele de contactor.png`; el dibujo anterior dejaba el borne A2 sin
  conductor. Barrido visual con miniaturas rasterizadas (`qlmanage`): verificados
  1000, 2001, 5000, 6000/6003, 6005/6006, 6007, 6009, 7016, 7018, 8000/8001/8004,
  9000/9004/9005, 3012/3013, 9010/9012, 1050/1051 — sin diferencias estructurales
  contra los 10 PNG de `data/samples/components_png/`. Evidencia: suite 260/260,
  `tsc` limpio, miniaturas regeneradas (`docs/img/componentes/`, 240 SVG).
