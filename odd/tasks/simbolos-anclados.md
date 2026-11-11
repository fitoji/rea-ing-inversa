# Símbolos anclados al origen (fidelidad CADeSimu)

Redibujar los símbolos **anclados al origen/bornes** del registro, como hace CADeSimu, en vez de
dibujarlos dentro de la caja declarada. La caja del `.cad` es la **grilla de conexión** (nominal),
no el bbox del dibujo: hoy eso deja los símbolos corridos respecto de CADeSimu (lámpara 4,5
unidades a la derecha del cable, automático 3 unidades, terminales 3 unidades).

Criterio de aceptación: `data/samples/tests01/test01.png` (captura real de CADeSimu) — el fixture
`data/samples/tests01/test01_termomag_lampara.cad` se dibuja igual en el lienzo. Rama: `main`.
Entrega: un work unit (fix visual). Runner: `npm test` en `app/` (node --test), `npx tsc --noEmit`.

## Specs

**S1.** Los símbolos se dibujan anclados al **origen del registro** (`geometry[8], geometry[9]`) y a
sus pines, con geometría intrínseca en unidades del archivo. La caja declarada deja de ser el
marco del dibujo: es la grilla de conexión.

**S2.** El mecanismo es opt-in y gradual: `SymbolDef.anchor?: 'box' | 'origin'`, con `'box'` como
default (el comportamiento actual de los ~220 símbolos ya migrados a la grilla de 6 unidades). Un
símbolo con `anchor: 'origin'` se dibuja en el origen del registro, sin el margen de la caja, y
sus formas se escriben en unidades absolutas del archivo.

**S3.** El **terminal de alimentación** `3000` (L) y `3001` (N) se dibujan como un círculo de
radio **1** unidad, **tangente por encima** del origen (el extremo del cable), con la letra `L` /
`N` encima del círculo. Hoy se dibujan como una barra vertical con la letra al lado, 3 unidades a
la derecha del cable.

**S4.** El **automático** `6001` ("Automático IN", dos polos) se dibuja con la geometría medida
en CADeSimu, en unidades relativas al origen (que es el borne 1 del primer polo):
- línea vertical del polo desde el origen hasta **+4**;
- cuchilla oblicua de **(−3, +3)** a **(0, +9)**;
- guion horizontal de **2 unidades** a **+5** de altura, cruzando la línea del polo;
- línea vertical del polo desde **+9** hasta **+12** (borne inferior);
- segundo polo **+6** en X, con la misma geometría;
- el **cuadrado negro de disparo sólo en el primer polo**, apoyado sobre la cuchilla, inclinado
  (no un rombo simétrico, no uno por polo).

**S5.** La **lámpara** `9008` se dibuja con un círculo de radio **2,83** unidades centrado en el
**medio de sus dos bornes** (el origen es el borne X1, X2 está a +12), con la X inscrita cuyas
puntas sobresalen ~0,25 unidades del círculo, y un hilo desde cada borne hasta el círculo.

**S6.** El lienzo rotula los **bornes** con su nombre (`1`, `3`, `2`, `4`, `X1`, `X2`), a la
derecha del borne, y el **designador** (`-F`, `-H`, `-X`) a la **izquierda** del símbolo, no
centrado encima de la caja. Hoy los pines no tienen rótulo visible y el designador va centrado
arriba.

**S7.** Los nombres de borne del archivo no cambian: son el contrato que guarda el `.cad`.

## Tasks

| ID | Specs | Ruta | Estado | Commit |
|---|---|---|---|---|
| T1 | S1, S2 | inline | hecho | commit de la feature |
| T2 | S3 | inline | hecho | ídem |
| T3 | S4 | inline | hecho | ídem |
| T4 | S5 | inline | hecho | ídem |
| T5 | S6 | inline | hecho | ídem |
| T6 | S1-S7 | inline | hecho | ídem |

## Log

**L1.** "en samples agregue un test01.png con la captura de pantalla de como se ve
test01_termomag_lampara.cad en cadesimu, revisa los componentes, aqui se ven muy diferentes!"

**L2.** Alcance elegido por el usuario: re-anclar la capa de símbolos al origen/bornes, empezando
por los 4 componentes de este fixture (3000, 3001, 6001, 9008), más rótulos de borne y designador
a la izquierda, con el mecanismo preparado para extenderlo al resto del catálogo.

**L3.** Medición sobre `data/samples/tests01/test01.png` (600×430 px, **6 px por unidad** del
archivo; anclaje horizontal: px 165 = x 111, px 201 = x 117; vertical: py 113 = y 51):

| Componente | Medición en CADeSimu |
|---|---|
| terminal 3001 | círculo x 84-97, y 35-46 px → centro (98,6 / 40), r ≈ 1 unidad; letra `N` en x 71-80, y 25-31; designador `-X` en x 66-80, y 34-45 |
| automático 6001 |Stub del polo en px 165 y 201 (x 111 y 117); línea del polo 113→137 px (y 51→55); cuchilla de (183,131) a (201,167) px = (114,54) a (117,60); guion horizontal de 12 px en y 149 px = y 56, x 156-167 px (x 110,5-112,5) y x 181-192 px (x 115,7-118,7); cuadrado negro px 141-155 × 138-150 = x 107,7-110,8, y 55,8-58,3 |
| lámpara 9008 | círculo px 183-217 × 257-292 → centro (200, 274,5) px = (117, 78), r ≈ 2,83; X inscrita cruzando en el centro; puntas en py 242 y 291 |

**L4.** Corrección del modelo con la medición: el círculo de la lámpara está en el **medio de los
bornes** (78 = (72+84)/2), no en el origen; el terminal tiene el círculo **por encima** del
origen (tangente). Cada símbolo tiene su propia disposición intrínseca respecto del origen.

**L5.** En los 7 fixtures del repo, el **100%** de los componentes tiene el centro de pines fuera
del centro de la caja (offset típico −3, −1,5). Es estructural, no un caso puntual: el anclaje
nuevo es el mecanismo general y cada símbolo se migra cuando se mide su referencia.

**L6.** La geometría de T8 para el automático (cuchilla 22°, recorrido 5,25 unidades) **no** coincide
con CADeSimu: el PNG canónico `interruptor proteccion contra cortocircuitos monofasico.png` y el
tripolar dan 3 unidades de desplazamiento horizontal, y la captura de la hoja también. Se corrigió
el 6001 con la geometría medida (cuchilla de (−3, +3,6) a (0, +9,7), guion a +5, cuadrado
inclinado de media diagonal 1,55 con vértices a 18°).

**L7.** Las definiciones que rigen son las de `app/src/symbols/families.ts`, NO las de
`library.ts`: la tabla de familias se aplica al final y pisa a las definiciones propias. El 6001 y
el 9008 se migraron en la familia; el terminal (3000/3001) y la lámpara 8016, en `library.ts`.

**L8.** `shapesBounds()` leía un número de más en los arcos (`a rx ry rot flags x y` son 7
números, no 8) y además expandía la envolvente por el radio en ambos ejes. Con eso, el marco de
los símbolos anclados quedaba descentrado. Corregido: la envolvente del arco es la cuerda más
los dos extremos del arco.

**L9.** El `inset` de 2,2 unidades con el que el lienzo dibujaba los símbolos era el error de
anclaje de TODOS los símbolos: la grilla de 6 unidades cuenta desde el origen del registro (el
primer borne), no desde un marco con margen. Al sacarlo, los símbolos no migrados también
quedan sobre sus cables.

**L10.** Los rótulos de borne y la posición del designador se calculan en `app/src/ui/labels.ts`
para que se puedan verificar con un test (el lienzo no se renderiza en los tests).

**L11.** Verificación: 269/269 tests (6 nuevos en `test/symbol-anchors.test.ts`), `tsc` limpio,
build OK, catálogo regenerado (238 SVG). Comparación pixel a pixel con la captura de CADeSimu:
los símbolos caen en los mismos píxeles (el automático, la lámpara y los terminales).

**L12.** Pendiente para la próxima tanda:
- El **color de los cables**: CADeSimu colorea por conductor (el 4009 azul, el 4000 negro/rojo) y
  nosotros los dibujamos todos en gris.
- La familia de protecciones (6000, 6002, 6003, 6004, 6007) todavía usa la cuchilla de T8 (22°,
  5,25) y el cuadrado como rombo simétrico; la geometría medida es la del 6001.
- El resto del catálogo (contactor, térmico, motor, pulsadores) sigue con la geometría de caja,
  que ya cae sobre sus bornes, pero sin la validación visual contra CADeSimu.
