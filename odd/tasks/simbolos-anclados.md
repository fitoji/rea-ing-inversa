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
mismo gris. El color lo trae el **tipo de conductor** (el código del archivo), no el papel
eléctrico del tramo: el `4000` va granate `#800000`, el `4009` azul `#0000ff` y el `4010`
(la tierra) verde `#008000` y punteado. En el PR1 el tramo `4000` que cierra sobre la red del
neutro va granate igual que todos los demás `4000`: si el color fuera por alimentación, ése
sería azul.

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
| T10 | S11 | inline | parcial | commit de la tanda |
| T11 | S12 | inline | hecho | ídem |
| T12 | S13 | inline | hecho | ídem |

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

**L15. PRIMERA REGLA (FALSA), CORREGIDA EN L27.** Con una sola captura se concluir que el color
del conductor lo decide la alimentación que su red toca: el tramo que sale del terminal 3000
(Alimentación L) va negro, el que sale del 3001 (Alimentación N) va azul, y los que no tocan
ninguna van granate. Se implementó así y se publicó en v0.5.0.

**L16. La regla de L15 era una lectura equivocada de la captura.** En `test01.png` el cable del
terminal de fase es `#800000` (granate), no negro: los 682 píxeles negros de esa captura son
todos de símbolos y rótulos, ningún conductor es negro. La regla de L15 salió de leer la lista
de columnas granates como si fuera la de negros.

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

---

## Tanda 3: el PR1 como criterio de aceptación de la simulación

**L27. CORRECCIÓN DE L15: el color del conductor lo trae su TIPO, no la alimentación.** Con las
capturas del PR1 (`app/test_simu/`) se ve el error: en `PR1_Rodolfo_Giusti_03.png` el tramo
`4000` que cierra sobre la red del neutro (la salida de H3) va **granate**, igual que todos
los demás `4000`. Si el color fuera por alimentación, ése sería azul. La regla correcta es por
código:

| código | color | trazo |
|---|---|---|
| 4000 (conductor común) | granate `#800000` | continuo |
| 4009 | azul `#0000ff` | continuo |
| 4010 (la tierra) | verde `#008000` | punteado, raya y hueco de 0,75 unidades |

La captura del PR1 **no** tiene un solo conductor negro: en CADeSimu el conductor común es
granate. Cambiado `app/src/editor/conductor.ts` (de redes a códigos), los tokens
(`--wire-conductor`, `--wire-neutro`, `--wire-tierra`) y el CSS (`.wire.tierra` punteado).
Verificado contra la captura: granate 369 px nuestros contra 378 de la captura, con **0**
píxeles nuestros fuera; azul 123 contra 126, con 1 fuera.

**L28. El PR1 entra como criterio de aceptación de la simulación.** El usuario aporta cinco
capturas de CADeSimu sobre `app/test_simu/PR1_Rodolfo_Giusti_03.cad`: el plano en reposo, el
play sin nada actuado, con Q1 y F1 cerrada (se enciende H1, amarilla), con S1 o S2 cerrada (se
enciende H3, verde) y con Q1 abierta por clic (se enciende H2, roja). Queda como tanda aparte:
la simulación (qué se enciende, qué color toma cada conductor y qué se dibuja en cada estado)
es un comportamiento que la app todavía no tiene verificado contra CADeSimu.

---

## Tanda 4: el polo del automático, el unipolar en el origen y el catálogo

**L29. T11 cerrado: la geometría del polo, re-medida contra DOS capturas (S12).** La captura
de la hoja (`data/samples/tests01/test01.png`, 6 px por unidad) y el automático tripolar de
`components_png/interruptor automatico de proteccion contra cortocircuitos y sobrecargas.png`
(8,67 px por unidad) se midieron trazo por trazo, con el origen del registro identificado por
la posición del borne y las columnas de la grilla. Las dos dan **las mismas medidas**:

| elemento | medida | antes |
|---|---|---|
| conductora superior | del borne hasta **+2,9** | +4,2 |
| cuchilla | de **(−3, +3)** a **(0, +9)** | (−3, +3,6) a (0, +9,7) |
| guion | a **+6**, de −1,5 a +0,3 | a +5 |
| conductora inferior | de **+9** al borne de abajo | de +9,7 |
| cuadro de disparo | centro (x − 2,95, +5,9), media diagonal 1,35, inclinado 18° | igual |

El cuadro de disparo **no** se movió: la primera estimación (centro a +5,1) estaba contaminada
por la tinta de la cuchilla, que lo cruza; el tripolar, donde el cuadro se ve limpio, da +5,9.

Las dos capturas coinciden en la cuchilla, la conductora superior y la inferior. Discrepan
sólo en la altura del guion: en la hoja está en +6,0 y en el tripolar en +6,8, pero ahí la
tinta del guion se mezcla con el cuadro de disparo, así que la hoja manda (es la referencia
de la spec y la de la captura de la hoja, a 6 px por unidad).

**L30. El guion del segundo polo va al revés.** En el automático de dos polos de la hoja el
guion del primer polo cruza el conductor (de −1,5 a +0,3) y el del segundo queda a su
izquierda (de −3,3 a −1,5). Los dos están a +6. Los dos polos abren la cuchilla hacia la
izquierda, así que el guion apunta siempre hacia el centro del aparato: es el del primer polo
el que va a la derecha y el del último a la izquierda. En el tripolar se ve lo mismo: el del
primer polo se prolonga a la derecha y el del segundo queda dentro de la tinta del cuadro.

**L31. T12 cerrado: el unipolar va en el origen, no en el centro de la caja (S13).** En el
archivo el primer borne está en el origen del registro, así que el polo de un aparato de un
polo tiene que dibujarse en el borde izquierdo de su caja, como el primer polo de los
multipolares. `poleColumns()` dejó de centrar el unipolar: ahora devuelve `[0]` para `n = 1`.
Como el pin y el dibujo salen de la misma columna, el cambio mueve los dos a la vez y el
cable sigue tocando el polo. Afecta al 6000, 6010, 6017, 5005, 6019 y 6020.

**L32. T10 parcial: el fusible estaba dibujado horizontal.** `components_png/fusible
monofasico.png` lo dibuja **vertical**: un rectángulo de 2,5 unidades de ancho alrededor del
conductor, de +2,3 a +9,3, con el borne '1' arriba y el '2' abajo. Nosotros lo dibujábamos
horizontal, con los bornes arriba y abajo: el cuerpo no tocaba los pines. Corregido: el cuerpo
se dibuja por polo, con los bornes en la columna del polo.

**L33. T10 parcial: la cuchilla del pulsador NA.** `components_png/pulsador no.png` (22,5 px
por unidad) muestra la conductora superior terminando en +3 y la cuchilla colgando del borne
de abajo: de **(−3, +3)** a **(0, +9)**. La nuestra era la del polo genérico: de (−1,97,
+3,38) a (0, +8,25). Corregida, con su metadata de giro (pivote en +9, 26,57°): es la misma
cuchilla del automático.

**L34. Lo que queda de T10.** Medido y anotado, sin corregir todavía:

- **El operador del pulsador.** En CADeSimu la `E` está mucho más a la izquierda y es más
  grande que la nuestra: la barra vertical en −6,04 y las barras de 1,91 unidades, entre +4,44
  y +7,38; el enlace al contacto es una barra a +6,02 que va de −3,07 a la cuchilla. La
  nuestra es una `E` de 0,96 de brazo en −1,8 con un enlace de 0,54.
- **El pulsador NC.** CADeSimu lo dibuja con la cuchilla colgando del tope (libre, sin tocar
  el borne de abajo) y el tope a +6,02; el nuestro la apoya cerrada sobre el borne de abajo.
  Es una diferencia de estado de reposo, no sólo de geometría: hay que decidir cuál manda.
- **El 6000 (monofásico).** `components_png/interruptor proteccion contra cortocircuitos
  monofasico.png` trae elementos que el 6001 no tiene (un tirador vertical a la derecha del
  polo y una banda más gruesa en la cuchilla): es otro dibujo, no otra medida del mismo.
- **La bobina, el motor, el diferencial y el disyuntor trifásico** quedan sin medir.
- **El resistor (1050/1051)** quedó como estaba: su cuerpo es horizontal y sus
  bornes van arriba y abajo en el centro de la caja, así que no usa la grilla de
  los polos. No hay referencia de CADeSimu ni fixture con un resistor, así que no
  se cambió de posición.
- **Los unipolares de potencia (2006/2007)** sí se movieron al origen: son la
  misma convención que la familia de protección (polo vertical en la columna del
  primer borne) y no tienen otra referencia.

**L35. Verificación.** 308/308 tests (6 nuevos: el guion del automático según el polo, el
unipolar en el origen, la cuchilla del pulsador, el resistor intacto, los unipolares de
potencia en el origen y los multipolares en la grilla), `tsc` limpio, build OK, catálogo
regenerado (238 SVG).

**L36. Verificación independiente (riesgo item 3: `poleColumns` es código compartido).** Un
verificador read-only sobre el diff `ea656d6..8280b32`: **sin blockers**, S12 y S13 OK.
Medió la captura otra vez y confirmó las cinco medidas del polo al píxel; comprobó que
exactamente 17 símbolos cambian de dibujo (10 pedidos, 6 correcciones medidas y el 2006/2007)
y que el resistor queda byte-idéntico al baseline. Recorrió los 640 pines declarados del
catálogo: **0 pines rotos nuevos** y 16 pines del fusible arreglados (con el fusible
horizontal no caían sobre el dibujo). Sus tres avisos: el 2006/2007 fuera de la lista de S13
(convención, no rotura), el pivote de la cuchilla del pulsador (medido en +8,9 y 27°, no en
+9,9 y 23,5°: corregido a **+9** y 26,57°, que es la cuchilla del automático) y la altura
del guion en el tripolar (+6,8 contra +6 de la hoja: la hoja manda).

---

## Tanda 5: el resto del catálogo (T10)

**L37. La bobina (9000 y 7018) estaba corrida.** `components_png/bobina rele de contactor.png`
(32,3 px por unidad) la dibuja con el cuerpo **centrado en el conductor**: un rectángulo de
−4,7 a +4,7 y de +3,5 a +8,0, con la conductora atravesándolo de A1 a A2. El nuestro iba de
−1,8 a +9 (todo a la derecha del conductor). Corregido, con los rótulos A1 y A2 a la altura
medida (el centro en +1,1 y +10,0; antes A2 caía debajo del borne de abajo).

**L38. El diferencial (6005/6006) y el disyuntor (6009) usan la cuchilla del automático.**
`rele diferencial.png` y `disyuntor trifasico.png` muestran los tres polos con la cuchilla
que abre hacia la izquierda y su guion a +6, igual que el automático; los ours usaban la
cuchilla vieja del polo genérico (de 22° y 1,97 de recorrido). Ahora los tres usan la
geometría medida, sin cuadro de disparo relleno (el diferencial no lleva).

**L39. Lo que queda de T10, medido y sin corregir.** Queda anotado para la próxima tanda:

- **El relé térmico (6007).** `rele termico.png` (8,15 px por unidad) lo dibuja con el cuerpo
  **arriba**, de +2,64 a +7,85, y **sin tabiques** internos; el nuestro va abajo (de +8,7 a
  +11,7) y con dos tabiques. Además el gancho térmico es un **escalón en el conductor** (sale
  en diagonal a +2,2 de la columna, baja y vuelve), no un corchete `⊐` aparte como el nuestro.
- **El operador del pulsador.** En CADeSimu la `E` está en −6,04 con barras de 1,91, entre
  +4,44 y +7,38; el enlace al contacto es una barra a +6,02 que va de −3,07 a la cuchilla. La
  nuestra es una `E` de 0,96 de brazo en −1,8 con un enlace de 0,54.
- **El pulsador NC.** CADeSimu lo dibuja con la cuchilla colgando del tope (libre, sin tocar
  el borne de abajo) y el tope a +6,02; el nuestro la apoya cerrada sobre el borne de abajo.
  Es una diferencia de estado de reposo, no sólo de geometría: **hay que decidir cuál manda**.
- **El motor trifásico (1000).** `motor trifasico.png` lo dibuja con el círculo y las cuatro
  puntas **tocando** el círculo, el símbolo `3~` dentro (con la `M` encima) y la punta de PE
  bajando por la derecha hasta un gancho corto en el borde del círculo. El nuestro deja las
  puntas en el aire (a 8,42 y 3,34 del borde), no tiene el `3~` y dibuja la PE como un
  círculo suelto abajo a la derecha.
- **El 6000 (monofásico).** `interruptor proteccion contra cortocircuitos monofasico.png`
  trae elementos que el 6001 no tiene (un tirador vertical a la derecha del polo y una banda
  más gruesa en la cuchilla): es otro dibujo, no otra medida del mismo.

**L40. Verificación.** 310/310 tests (2 nuevos: el cuerpo de la bobina y la cuchilla del
diferencial y del disyuntor), `tsc` limpio, catálogo regenerado (238 SVG).
