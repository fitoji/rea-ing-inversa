# Simulación del PR1: los estados de CADeSimu como criterio de aceptación

Que la simulación del electro-simulador se parezca a la de CADeSimu, verificado sobre el cuadro
real del PR1 (`app/test_simu/PR1_Rodolfo_Giusti_03.cad`) con las cinco capturas que aportó el
usuario. Rama: `main`. Entrega: work units por tanda. Runner: `npm test` en `app/` (node --test),
`npx tsc --noEmit`.

## Specs

**S1.** Los estados de referencia son los de las capturas (los conductors en rojo `#FF0000` están
con tensión, los granate `#800000` en reposo):

| captura | lo que hace el usuario | lo que se enciende en CADeSimu |
|---|---|---|
| `PR1_Rodolfo_Giusti_03.png` | nada (el plano) | nada |
| `..._simu_play.png` | play, sin actuar nada | nada |
| `..._simu_play_02.png` | Q1 cerrada y F0 cerrada | **H1** (amarilla) |
| `..._simu_play_03.png` | además, S1 o S2 pulsada | **H1** (amarilla) y **H3** (verde) |
| `..._simu_play_04.png` | click en Q1: se abre | **H2** (roja) |

Las capturas son acumulativas: en la 03 sigue encendida H1, y en la 04 se apaga H1.

**S2.** El color de cada lámpara sale del archivo (`#X1#X2#<color>`): H3 = `0` verde, H2 = `1`
rojo, H1 = `2` amarillo. La app ya lo resuelve con `LAMP_COLORS`.

**S3.** Los conductores con tensión se dibujan en rojo `#ff0000`. Hoy el paquete `cadesimu` usa
`--warn: #d40000` para la energía: hay que llevar ese token al rojo de la captura.

**S4.** En reposo no hay ninguna lámpara encendida ni ningún conductor con tensión.

**S5.** El `8018` (Q1) es un **conmutador de dos posiciones**, no dos contactos
independientes: el común son los bornes `95` y `97` (enlazados en el dibujo) y las dos salidas
son `96` (la red de H2) y `98` (la red de S0). En un instante dado una sola de las dos salidas
está conectada. La app lo modela con `poles()` (95-96 y 97-98) como dos contactos cerrados a
la vez.

**S6.** Las protecciones (`6000`–`6010`) arrancan **abiertas** en la simulación de CADeSimu: el
F0 bloquea la fase hasta que el usuario la cierra. En la app arrancan conduciendo.

**S7.** En la simulación se puede **accionar un contacto con un clic** (mover el conmutador,
abrir o cerrar una protección), como en CADeSimu. Hoy sólo se pueden pulsar los pulsadores y
abrir las protecciones.

## Tasks

| ID | Specs | Ruta | Estado | Commit |
|---|---|---|---|---|
| T13 | S4, S5 | inline | hecho | commit de la tanda |
| T14 | S6 | inline | hecho | ídem |
| T15 | S7 | inline | hecho | ídem |
| T16 | S1-S3 | inline | hecho | ídem |
| T17 | S5 (dibujo) | inline | hecho | commit de la tanda |

## Log

**L1.** "en @test/simu tengo un archivo .cad, y luego varias capturas png de como se ve en
cadesimu" — cinco capturas del PR1 como criterio de aceptación de la simulación.

**L2. Lo que ya coincide.** El color de las lámparas sale del archivo y calza con las capturas
(H1 = 2 = amarillo, H2 = 1 = rojo, H3 = 0 = verde). El archivo parsea, la red se arma y el
circuito se construye sin problemas: el suministro es la red 14 (fase) y la 17 (neutro).

**L3. Brecha 1 — en reposo nuestra app enciende H1 y H2; CADeSimu no enciende nada.** Causa:
el `8018` (Q1) está en el modelo como dos contactos NC cerrados a la vez (S5) y el `6002` (F0)
conduce siempre (S6). Con el F0 cerrado y los dos contactos del Q1 cerrados, la fase llega a la
red 16 (X1 de H2) y a la red 0 (X1 de H1) y las dos lámparas encienden.

**L4. Brecha 2 — con S1 pulsado nuestra app enciende H1, H2 y H3; CADeSimu enciende H1 y H3.**
La de más es la misma (H2), por el 8018 mal modelado.

**L5. Brecha 3 — con S1 o S2 pulsado, nuestra app energiza la bobina de K1M** ✓ igual que
CADeSimu, y enciende H3 ✓. El camino (fase → F0 → Q1 → S0 → red 0 → S1 → red 2 → bobina →
neutro) lo resuelve el solver con `reach()` sobre los contactos cerrados ✓.

**L6. Brecha 4 — no se puede abrir un contacto a mano.** La captura 04 es el usuario haciendo
clic en Q1: en CADeSimu el conmutador cambia de posición (de la salida 98 a la 96) y por eso H1
se apaga y H2 se enciende. En la app no hay forma de actuar un contacto que no sea pulsador
(S7).

**L7. El archivo tiene dos aparatos con el designador `Q1`**: el `8018` (el conmutador del
circuito de mando, arriba a la izquierda) y el `6009` (el disyuntor del motor, a la derecha). La
captura 04 corresponde al `8018`: al abrirse, el motor sigue sin tensión (sus conductores siguen
granate) y en cambio se enciende H2.

**L8. Decisiones del usuario.** (1) "arranque abierto como cadesimu": las protecciones arrancan
abiertas y el usuario las cierra con un clic. (2) "modelamos como conmutador de dos posiciones,
no y nc": el `8018` no es un contacto NC doble sino un conmutador con un común (95-97, enlazados
en el dibujo) y dos salidas (96 y 98).

**L9. El conmutador como modelo.** El `8018` pasa a `kind: 'changeover'`: sus dos polos siguen
siendo los pares de bornes (95-96) y (97-98), pero el solver cierra **sólo** el de la posición
actual (`SimDevice.changeover` + `SimOptions.changeovers`). La posición de reposo es la salida
96 y el clic pasa a la 98: así se reproducen las cuatro capturas.

**L10. Las protecciones arrancan abiertas.** `startsOpen(code)` declara cuáles (6000-6999); el
8017 (contacto auxiliar del térmico) no: es un contacto y arranca cerrado. El estado por
protección es `'closed' | 'open'` y el clic lo alterna; abrir una que estaba cerrada la marca
como disparada (roja).

**L11. Verificación.** 293/293 tests, `tsc` limpio, build OK. Los nueve estados de
aceptación del PR1 están en `app/test/simulacion-pr1.test.ts` y pasan: reposo y play sin nada
encendido; con el automático cerrado y el conmutador en la otra posición se enciende sólo H1;
con S1 o S2 pulsada, H1 y H3 (y la bobina de K1M); con el conmutador en la posición de reposo,
sólo H2.

**L12. El dibujo del `8018` (T17).** La captura del PR1 muestra que no son dos contactos
horizontales: son **dos contactos verticales** (95-96 y 97-98) con las cuchillas abiertas en
direcciones opuestas —la lambda—, un **acoplamiento mecánico punteado** entre ellas y el
corchete de la derecha. El símbolo nuevo (`library.ts:changeover`) reproduce esa estructura: los
bornes en la grilla (0 y 12 de alto, cada 9 de ancho), las dos cuchillas con giros de signo
contrario y el punteado (`Shape.dashed` + `.sym path.dashed`).

**L13. La animación.** El lienzo rota la hoja cuando el contacto está cerrado, y la regla de
signo (`deg > 0` rota al cerrar) hace que con el conmutador en la posición de reposo se apoye la
cuchilla de 95-96 y se abra la de 97-98, y al revés en la otra posición. Como el solver sólo
cierra una de las dos salidas, `closedContacts` tiene que distinguir la posición: un conmutador
está "cerrado" cuando está en la posición de reposo.

**L14. Verificación.** 297/297 tests (4 nuevos en `app/test/conmutador.test.ts`), `tsc` limpio,
build OK, catálogo regenerado. La miniatura del 8018 coincide con la captura: los dos contactos
verticales, la lambda y el acoplamiento punteado con el corchete.
