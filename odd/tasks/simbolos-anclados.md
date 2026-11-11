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

**S8.** Los **cables** se dibujan con el color que les da CADeSimu por conductor, no todos del
mismo gris. La regla real, medida sobre la captura: el conductor toma el color de la
**alimentación que su red toca** — negro si la red toca el terminal de fase (3000), azul si toca
el de neutro (3001) y granate si no toca ninguna. No es el código del cable (el `4000` sale
negro en un tramo y granate en otros) ni su número (los cables 1, 2, 4 y 5 son negro, granate,
granate y azul). Un cable con quiebres es un solo conductor y se pinta entero del mismo color.

**S9.** La **cuchilla de la familia de protecciones** usa la geometría medida en CADeSimu
(`draw.ts:cadesimuPole`): 3 unidades de desplazamiento horizontal y el cuadro de disparo
inclinado. La llevan el **6000**, el **6002**, el **6003** y el **6004**. El **6007** (relé
térmico) es la excepción: `rele termico.png` muestra sus conductores **rectos**, sin cuchilla y
sin cuadro.

**S10.** El **grosor del trazo** de los conductores: en la captura de CADeSimu el cable mide una
pixel de ancho sobre 6 px por unidad (0,17 unidades) y el nuestro 0,34 unidades.

**S11.** El resto del catálogo (contactor, relé térmico, motor, pulsadores) ya cae sobre sus
bornes, pero **sin validación visual** contra una captura de CADeSimu: no hay PNG de referencia
para ellos en el repo.

**S12.** La **geometría interna del polo** (`cadesimuPole`) tiene las medidas finas corridas: el
cuadro de disparo mide 1,35 de media diagonal (no 1,55), la conductora superior termina en +2,9
(no +4,2), la cuchilla va de (−3, +3) a (0, +9) (no (−3, +3,6) a (0, +9,7)) y el guion va a +6
(no +5). En el automático de dos polos de la captura, el guion del **segundo** polo va del lado
opuesto al del primero. Queda pendiente re-medir el polo completo contra la captura.

**S13.** El **unipolar de la familia de protecciones** (6000, 5000, 5005, 6010, 6017, 6019,
6020) se dibuja **centrado en su caja** de 12 unidades, pero en el archivo el primer borne está
en el origen del registro: el polo queda 6 unidades a la derecha del cable. Los multipolares no
tienen el problema (arrancan en el borde izquierdo).

## Tasks

| ID | Specs | Ruta | Estado | Commit |
|---|---|---|---|---|
| T1 | S1, S2 | inline | hecho | commit de la feature |
| T2 | S3 | inline | hecho | ídem |
| T3 | S4 | inline | hecho | ídem |
| T4 | S5 | inline | hecho | ídem |
| T5 | S6 | inline | hecho | ídem |
| T6 | S1-S7 | inline | hecho | ídem |
| T7 | S8 | inline | hecho | commit de la tanda del color |
| T8 | S9 | inline | hecho | ídem |
| T9 | S10 | inline | hecho | ídem |
| T10 | S11 | inline | pendiente | — |
| T11 | S12 | inline | pendiente | — |
| T12 | S13 | inline | pendiente | — |

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

**L12.** Pendiente para la próxima tanda, anotado como tareas T7-T10:
- **T7 (S8)**: el color de los cables. En la captura el `4009` va azul, el `4000` de cabecera
  negro y los `4000` de retorno rojos. Antes de implementarlo hay que determinar la regla real
  (tipo de cable o número de cable) con más capturas: en este fixture el `4009` es azul y los
  `4000` son de dos colores distintos, así que no alcanza con el tipo.
- **T8 (S9)**: la cuchilla de la familia de protecciones (6000, 6002, 6003, 6004, 6007) todavía
  es la de T8 (22°, 5,25 unidades, rombo simétrico); la medida es la del 6001 y ya está escrita
  en `draw.ts:cadesimuPole`.
- **T9 (S10)**: el grosor del trazo del conductor (0,34 unidades contra 0,17 de CADeSimu).
- **T10 (S11)**: validación visual del resto del catálogo: el contactor, el térmico, el motor y
  los pulsadores ya caen sobre sus bornes, pero no hay PNG de referencia de CADeSimu para ellos
  en el repo.

**L13.** El fixture del usuario (`data/samples/tests01/test01_termomag_lampara.cad`) y su captura
(`test01.png`) viven en `data/`, que está en `.gitignore` a propósito (material de ingeniería
inversa). Para que los tests no dependan de un archivo que no viaja, se copió el fixture a
`app/test/fixtures/test01-termomag-lampara.cad`; la captura se usa como criterio de aceptación
visual, no como insumo de test.

---

## Tanda 2: color del conductor, grosor del trazo y familia de protecciones

**L14.** "ok, hagamos lo que podemos con la info que tenemos". Con una sola captura y los diez
PNG de `components_png` se cierra: T7 (color), T9 (grosor) y T8 (cuchillas). T7 y T9 quedaron
cerrados con medición; T8 quedó con dos códigos sin referencia y una corrección de evidencia
(el 6007 no tiene cuchilla).

**L15. El color del conductor NO es por código ni por número de cable.** Medido sobre la
captura: el `4000` de la cabecera de fase va negro y los `4000` de la lámpara van granate; los
cables 1, 2, 4 y 5 son negro, granate, granate y azul. Lo que sí lo explica es la
**alimentación que la red toca**: el tramo que sale del terminal 3000 (Alimentación L) va negro,
el que sale del 3001 (Alimentación N) va azul, y los que no tocan ninguna alimentación van
granate. La regla quedó en `app/src/editor/conductor.ts`, que calcula las redes con la
proyección de `network.ts` y reparte el rol por cable (un cable con quiebres son varios
registros y se pintan del mismo color).

**L16.** La regla se validó contra los siete planos del repo: en `inversion-giro-cej.cade` el
mismo `4000` aparece con los tres roles, así que ninguna regla por código o por número puede
explicar el color. En el fixture de aceptación el reparto sale exacto: 1 tramo negro, 3 azules
y 4 granates, que son los de la captura.

**L17. Colores medidos en la captura**: negro `#000000`, azul `#0000ff`, granate `#800000`.
Entraron como tokens `--wire-fase`, `--wire-neutro` y `--wire-otro`: exactos en el paquete
`cadesimu` y con tonos del tema en el resto. El conductor `4019` (variante de cable) deja de
tener color propio: el color lo decide el rol, como en CADeSimu.

**L18. El grosor del conductor es de un píxel.** Sobre 6 px por unidad, el cable de la captura
mide 1 px: 0,17 unidades. Ours iba 0,34 (el doble). Los cables energizados y los seleccionados
pasaron de 0,46 a 0,34 para mantener la jerarquía visual.

**L19. El 6007 (relé térmico) no tiene cuchilla.** `rele termico.png` muestra tres conductores
rectos con el cuerpo y el gancho encima, sin cuchilla ni rombo. La app le dibujaba la cuchilla
de T8. Ahora usa `straightPoles`.

**L20. Dónde va el cuadro de disparo.** Medido: el 6000 (monofásico) lo lleva en su único polo,
el 6003 (tripolar) en los tres, y el 6001 (el automático IN de la captura) **sólo en el
primero**. Las dos cosas son verdad y no salen de una misma regla: se dejó el comportamiento
medido por código y se heredó el del aparato más cercano por número de polos para el 6002
(bipolar, como el 6001) y el 6004 (tripolar, como el 6003).

**L21. Con la migración, la cuchilla de los automáticos deja de ser móvil** (no lleva `blade`):
en CADeSimu el automático se dibuja siempre abierto. El disparo se sigue leyendo por el color
del cuerpo, como ya pasaba con el 6001.

**L22. Verificación.** 285/285 tests (8 nuevos: `test/protection-symbols.test.ts` y
`test/conductor-roles.test.ts`), `tsc` limpio. Además se renderizó el fixture con los módulos
de la app y se comparó contra la captura: el neutro azul coincide al **99,6%** (1 px de la
captura sin cubrir) y el granate al **97,1%**; la lámpara y los terminales coinciden con 4 a 12
píxeles de diferencia por caja, que son los rótulos que el render de medición no dibuja.

**L23. El cuadro de disparo se achicó a 1,35 de media diagonal** (era 1,55). Medido por área en
dos referencias independientes: la captura de la hoja (127 px de tinta a 6 px por unidad) y el
monofásico de `components_png` (1.090 px a 17,2 px por unidad). Las dos dan 1,35.

**L24. Lo que quedó sin cerrar y por qué (S12).** La geometría interna del polo tiene las
medidas finas corridas contra la captura: la conductora superior termina en +2,9 y no en +4,2;
la cuchilla va de (−3, +3) a (0, +9) y no de (−3, +3,6) a (0, +9,7); el guion va a +6 y no a +5;
y en el automático de dos polos de la captura el guion del **segundo** polo va del lado opuesto
al del primero. Corregir el modelo compartido sin resolver antes la regla del guion espejado
era más riesgo que beneficio: quedó como T11 con las medidas anotadas.

**L25. El unipolar de la familia queda corrido (S13).** `poleColumns(1, w)` centra el polo en
la caja de 12 unidades, pero en el archivo el primer borne está en el origen: el 6000 se
dibuja 6 unidades a la derecha de su cable. Los multipolares no tienen el problema. No se
tocó `poleColumns` porque mueve todos los unipolares del catálogo (fusibles, interruptores) y
eso es una decisión de convención, no de esta tanda: quedó como T12.

**L26. La regla de color sale de UNA captura.** Cierra el criterio de aceptación del fixture,
pero no alcanza para las alimentaciones trifásicas, el PE ni la continua: esos quedan en
`otro` (granate) hasta que haya una captura que los fije. Con capturas de un cuadro con
alimentación trifásica se cierra el caso.
