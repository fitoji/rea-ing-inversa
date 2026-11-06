# ComponentSpec — una sola tabla de semántica por código

Objetivo: eliminar la clase de bugs que produce tener la semántica de cada código de
componente repartida en cinco tablas que se contradicen.
Fuente: `docs/auditoria-v0.3.md` (P1-1) y el reconocimiento de tablas del 2026-11-06.

## Specs

- **S1** — «Una sola tabla `ComponentSpec` por código (kind de simulación, glifo, grupo de paleta, designador) y derivar los cinco consumidores. Elimina la clase de bugs `8005`/`8100`/`8101`.»
- **S2** — «`8005` es pulsador NC presionable en `circuit.ts:66` pero no está en el `PUSHER` de `visual.ts:40`: se presiona en la simulación y se dibuja en reposo.»
- **S3** — «`8100` está en `PUSH_CODES` pero `kindOf` lo devuelve `unknown`, así que el clic se pierde.»
- **S4** — «`8101`/`8102`/`8103` nunca son `lamp`.»
- **S5** — Ningún código puede estar en una tabla y ausente de otra en la misma dimensión: simulación (`kind`), pulsable, lámpara, protección, polaridad de reposo (NA/NC) y modo de temporizador. El test recorre la unión de códigos de todas las tablas y falla si dos consumidores discrepan.
- **S6** — La tabla no cambia lo que ya funciona: paridad congelada contra las tablas actuales para todo código que hoy tiene semántica consistente. Sólo cambian los códigos listados en el `Log`.

## Tablas actuales (inventario del reconocimiento)

| Dimensión | Dónde vive hoy | Códigos |
| --- | --- | --- |
| `kind` de simulación | `sim/netlist.ts:69-92` (`kindOf`) | bobina `9000,9001,7018,9004-9007`; contacto `7000,7001,2001,2006,8018,7004-7015`; pulsador `8000-8011`; selector `8012-8015`; lámpara `8016,9008,9009`; térmico `6007,8017`; fusible `6000-6999`; motor `1000-1010,10508,10509`; bornera `3000-3999` |
| Polaridad de reposo y tipo de solver | `sim/circuit.ts:49-71` (`simKindOf`) | NC: `7001,8018` (contacto), `8001,8005,8009` (pulsador), `8013,8015` (selector) |
| Pulsable | `ui/App.tsx:88` (`PUSH_CODES`) | `8000-8015`, `8100` |
| Lámpara | `sim/visual.ts:36` (`LAMP`), `model/project.ts:52` (`LAMP_CODES`) | `9008,9009` en las dos; `8016` sólo en `netlist` |
| Protección | `sim/netlist.ts:94-97` (`isProtectionCode`) | derivado de `kind` |
| Temporizador | `sim/netlist.ts:216-224` | `7004-7007` on, `7008-7011` off, `7012-7015` both, NC `7005,7009,7013`, latching `9001` |
| Estado visual | `sim/visual.ts:36-48` (siete sets) | `LAMP`, `COIL`, `PUSHER {8000,8001,8012,8013}`, `CONTACT`, `TIMED_CONTACT`, `TIMER_COIL`, `TIMED_NC` |
| Identidad / designador | `symbols/catalog.ts:11-282` (`CATALOG`, 270 códigos) | tabla maestra extraída del binario |

## Defectos probados que esta tanda cierra

| Código | Hoy | Debe |
| --- | --- | --- |
| `8005` (y `8002,8003,8004,8006-8011,8014,8015`) | se presiona en simulación, se dibuja en reposo | pulsador con polaridad de reposo y estado visual desde la misma fila |
| `8100` | pulsable en `App.tsx:88`, `unknown` en `netlist`, sin estado visual | pulsador (CATALOG lo lista como «Pulsador», designador `-S`) |
| `8101`, `8103` | glifo de lámpara, nunca `lamp` | lámpara: `kind`, estado visual y slot de color |
| `8102` | ni glifo ni semántica | lámpara con glifo |
| `8016` | `lamp` en el solver, no en las tablas de lámpara | lámpara en las tres |
| `2002` | `CONTACT` en visual, `unknown` en el solver | contacto |
| `8018` | contacto NC en el solver, no en `CONTACT` visual | contacto NC en las dos |
| `9004-9007` | `TIMER_COIL` visual espera `timerReady`, el device nunca lleva `timer` | bobina temporizada con su modo |
| `7005, 7009, 7013` | el dibujo los marca NC (`TIMED_NC`) y el solver los trataba NA | contacto temporizado NC: `rest: 'closed'` |
| `5000-5009` | «fusible/seccionador» en el catálogo, no conduce | fuera de alcance: se declara en el `Log`, no se toca |

## Tasks

| ID | Tarea | Spec | Ruta | Commit |
| --- | --- | --- | --- | --- |
| T1 | `app/src/model/component-spec.ts`: tabla `SPEC` por código + `specOf` + predicados derivados (`isPushable`, `isLamp`, `restStateOf`, `timerOf`, `isProtection`) y test de paridad contra las tablas actuales | S1, S5, S6 | worker | `feat(model): single ComponentSpec table` |
| T2 | `sim/netlist.ts` y `sim/circuit.ts` derivan `kind`, polaridad, temporizador y protección de `SPEC`; cierra `8100`, `8016`, `2002`, `8018`, `9004-9007` | S1, S3, S6 | worker | `refactor(sim): derive solver semantics from ComponentSpec` |
| T3 | `sim/visual.ts` deriva sus sets de `SPEC`; cierra `8005` y la polaridad de reposo | S1, S2, S5 | inline | `refactor(sim): derive visual states from ComponentSpec` |
| T4 | `ui/App.tsx` (`PUSH_CODES`) y `model/project.ts` (`LAMP_CODES`) derivan de `SPEC` | S1, S4 | inline | `refactor(ui): derive pressable and lamp codes from ComponentSpec` |
| T5 | Glifo para `8102` en `symbols/families.ts` | S4 | inline | `feat(symbols): draw 8102 lamp` |

## Log

- **L1** — Elección del humano para la tanda siguiente: «P1: tabla única de componentes» — «Una sola tabla ComponentSpec por código y derivar circuito, netlist, visual y catálogo. 2-3 días y mata la clase de bugs 8005/8100/8101.» Autoriza T1-T5.
- **L2** — Reconocimiento de las cinco tablas (2026-11-06): inventario de §«Tablas actuales», con `path:line`. Hallazgo: la divergencia no es de tres códigos, son diez familias. `CATALOG` (270 códigos) es la única clave maestra generada del binario, pero no lleva semántica de simulación: la tabla nueva se define por rangos con excepciones, no por nombre de catálogo.
- **L3** — Fuera de alcance declarado: `5000-5009` figura como «Fusible/Seccionador» en el catálogo y no conduce (`netlist.ts:85` sólo toma `6000-6999`). Decidir si conduce es una tarea de REA, no de esta refactorización.
- **L4** — `4009`/`4010` tienen nombre de catálogo («Cable neutro» / «Cable PE») distinto del tipo inferido en `circuit.ts:36-42` (mando / neutro). Se mantiene el tipo inferido y no se toca en esta tanda.
- **L5** — T1+T2 entregados por worker y **corregidos en revisión**. Dos defectos de la entrega: (1) `8100` quedó como `contact`, pero `CATALOG` lo lista como «Pulsador» con designador `-S`; como contacto el cierre dependía de una bobina homónima y el clic seguía perdido, o sea S3 no se cerraba. Ahora es `pushbutton` y el test compara que reemplazar `8000` por `8100` sea indistinguible para el solver. (2) Los temporizados `7005/7009/7013` quedaron NA «para congelar paridad», pero `solver.ts:155-172` sí conmuta `contactNC` temporizado y ningún fixture usa esos códigos: la tabla decía lo contrario de lo que dibuja `TIMED_NC`. Ahora son `rest: 'closed'`.
- **L6** — Verificación de T1+T2: suite **235/235**, `tsc --noEmit` limpio y diferencial **end-to-end** contra `551e1da` sobre los 6 fixtures (kinds, modos de temporizador, estado en reposo y efecto de presionar cada dispositivo accionable): **idéntico**. Nada de lo que ya funcionaba cambió.
