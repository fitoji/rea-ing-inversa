# Electro-Simulador — plan de construcción

Objetivo: simulador eléctrico con manejo de cables moderno, que abra y ejecute archivos `.cade` de CADe_SIMU.

## Specs

- **S1** — Abrir archivos `.cade` existentes sin pérdida: todo registro no reconocido se preserva byte a byte y se reescribe igual al guardar.
- **S2** — Editar cables con interacción moderna: arrastre de extremos, ruteo ortogonal automático, uniones explícitas y cruces sin conexión.
- **S3** — Simular lógica de contactores: bobinas, contactos NA/NC, pulsadores, selectores, lámparas, fusibles, relé térmico y motor como carga.
- **S4** — Guardar en `.cade` (compatible) y exportar PDF/PNG.
- **S5** — App nativa de escritorio para macOS y Windows.
- **S6** — Los bornes que se dibujan son los que el archivo declara: se derivan de los extremos de cable que caen sobre el borde de la caja, nunca de una geometría inventada. Un componente sin cables no muestra pines.
- **S7** — Toda edición es un texto nuevo derivado del anterior, y el estado del editor (undo/redo, selección) se sostiene sobre ese texto. Ninguna operación puede inventar campos que el archivo no tenía.
- **Out of scope v1**: PLC Siemens/Modbus, Arduino, neumática, imágenes 3D, temporizadores.

## Fases y tareas

### Fase 0 — Reconocimiento (3-5 días)

| ID | Tarea | Salida verificable |
|---|---|---|
| T0.1 | Inventario de `.cade` reales: cuántos, qué componentes usan, qué códigos aparecen | Tabla de frecuencias de códigos |
| T0.2 | Extraer la tabla de componentes del `.exe` con Ghidra (array de structs: id, nombre, pines, tipo) | JSON `components.json` contrastado con T0.1 |
| T0.3 | Especificar gramática `.cade`: cabecera, registro de componente, bloque de hoja, separadores | `docs/cade-format.md` |
| T0.4 | Spike de interacción de cables (2 días, descartable): ruteo ortogonal + drag | Video/prototipo que valide la UX |
| T0.5 | Cerrar alcance de simulación v1 y criterios de aceptación | Lista de componentes y circuitos de prueba |

**Riesgo**: T0.2 puede fallar. Mitigación: S1 permite avanzar con códigos desconocidos.

### Fase 1 — Fundaciones (1 semana)

| ID | Tarea |
|---|---|
| T1.1 | Repo, TypeScript strict, Vite, Vitest, lint, CI |
| T1.2 | Modelo de dominio: `Project → Sheet → Component → Pin → Wire` |
| T1.3 | Parser `.cade` con golden files reales |
| T1.4 | Writer `.cade` + test de round-trip byte a byte |
| T1.5 | Registro de componentes con fallback opaco |

### Fase 2 — Render e interacción base (1-2 semanas)

| ID | Tarea |
|---|---|
| T2.1 | Canvas con zoom, pan, grilla y snap |
| T2.2 | Librería de símbolos IEC 60617 en SVG |
| T2.3 | Colocar, seleccionar, mover, rotar, borrar |
| T2.4 | Undo/redo con historial transaccional |
| T2.5 | Copiar/pegar y multi-selección |

### Fase 3 — Manejo de cables (1-2 semanas) ← el diferenciador

| ID | Tarea |
|---|---|
| T3.1 | Modelo de cable por segmentos ortogonales con puntos de control |
| T3.2 | Arrastrar extremo con auto-ruteo y snap magnético a pines |
| T3.3 | Uniones (junction dots) y cruces sin conexión explícitos |
| T3.4 | Insertar/eliminar vértices, mover segmentos enteros |
| T3.5 | Numeración automática de cables y etiquetas editables |
| T3.6 | Validaciones: pin-pin, solapamiento de símbolos, cable huérfano |

### Fase 4 — Simulación (2 semanas)

| ID | Tarea |
|---|---|
| T4.1 | Solver booleano iterativo con detección de convergencia y de lazo inestable |
| T4.2 | Componentes: bobina, contacto NA/NC, pulsador, selector, lámpara, fusible, térmico, motor |
| T4.3 | Propagación de estados y animación visual |
| T4.4 | Tests con circuitos canónicos: arranque directo, inversión de giro, estrella-triángulo, enclavamiento |

### Fase 5 — Producto (1 semana)

| ID | Tarea |
|---|---|
| T5.1 | Guardar/abrir proyecto y autosave |
| T5.2 | Exportar PDF/PNG con cajetín |
| T5.3 | Empaquetado con Tauri para macOS y Windows, firma y notarización |
| T5.4 | Documentación de uso y migración desde CADe_SIMU |

### Fase 6 — Backlog v2

Temporizadores (a la conexión/desconexión), PLC S7 y Modbus, Arduino, neumática, comparación de versiones de esquema.

## Estimación

v1 usable: **6-8 semanas** de trabajo part-time. La fase 3 es la que define el producto; la 4 es la que más incógnitas tiene.

## Decisiones tomadas

1. ✅ Stack: TypeScript (Node 24 nativo) + Vite + React + SVG, empaquetado con Tauri.
2. ✅ Núcleo sin dependencias; tests con `node:test`.
3. ✅ Round-trip lossless como garantía central del parser.
4. ⬜ Alcance exacto de simulación v1.

## Estado al 2026-10-29

### Fase 0 — Reconocimiento (3/5)

- [x] T0.1 Inventario de `.cade` reales — 2 archivos, insuficiente para cerrar la tabla
- [ ] T0.2 Tabla de componentes desde el binario — región de strings localizada, vínculo código→nombre pendiente
- [x] T0.3 Gramática `.cade` documentada en `docs/cade-format.md`
- [~] T0.4 Spike de interacción de cables — entregado en `app/spike/wires.html`, pendiente de evaluación visual
- [ ] T0.5 Alcance de simulación v1 cerrado

### Fase 1 — Fundaciones (5/5)

- [x] T1.1 Repo, TypeScript, `node:test` — falta lint y CI
- [x] T1.2 Modelo de dominio `Project → Sheet → Component → Pin → Wire` (`app/src/model/project.ts`)
- [x] T1.3 Parser con golden files reales
- [x] T1.4 Writer con round-trip byte a byte
- [x] T1.5 Registro de componentes con fallback opaco

### Limitación abierta

2 de 161 registros mal delimitados en `inversion-giro-cej.cade` (códigos `0` y `5`). Se reportan vía `layouts`, no se ocultan.

## Estado al 2026-10-30

### Fase 2 — Render e interacción base (5/5)

- [x] T2.1 Canvas con zoom, pan, grilla y snap (`app/src/ui/Canvas.tsx`)
- [x] T2.2 Librería de símbolos IEC 60617 en SVG (`app/src/symbols/library.ts`) — 22 códigos con símbolo dedicado y fallback rotulado
- [x] T2.3 Colocar, seleccionar, mover, rotar, borrar — rotación visual, no persistida
- [x] T2.4 Undo/redo transaccional sobre el texto (`app/src/editor/state.ts`)
- [x] T2.5 Copiar/pegar y multi-selección (shift-clic y lazo)
- [x] Extra: pines derivados del archivo (`app/src/editor/pins.ts`) — cierra el hueco del spike

**Deuda declarada de la fase:**

- La rotación es visual: el formato no expuso aún el campo de orientación. Se avisa en el inspector.
- Los registros nuevos (colocar/pegar) se agregan al final del archivo porque los ids deben ser estrictamente crecientes; quedan en la última hoja.
- La unión cable↔componente es por proximidad geométrica; el vínculo pin-a-pin real es T3.2.

### Fase 3 — Manejo de cables (6/6)

- [x] T3.1 Modelo de cable: tramos agrupados por número (`geometry[21]`) y red con proyección de puntos (`app/src/editor/network.ts`)
- [x] T3.2 Arrastrar extremo con snap magnético a bornes y ruteo ortogonal con codo automático
- [x] T3.3 Uniones: los `4001` se dibujan y se pueden crear desde un aviso de unión en T
- [x] T3.4 Insertar vértice (doble clic) y unir vértice (clic en el handle), preservando el número de cable
- [x] T3.5 Número de cable editable; el inspector avisa cuántos tramos mueve
- [x] T3.6 Validaciones: extremo suelto, unión en T sin punto, uniones superpuestas, símbolos solapados

**Deuda declarada de la fase:**

- Arrastrar el cable entero no está implementado: se arrastran los extremos.
- Al crear una unión nueva se clona la plantilla `4001` del archivo, no se sintetiza.
- La conexión en T se detecta; no se auto-repara.

### Fase 4 — Simulación (2/4)

- [x] T4.1 Solver iterativo con detección de convergencia y de lazo inestable (`app/src/sim/solver.ts`)
- [x] T4.2 Semántica de componentes: bobina, contacto NA/NC, pulsador, selector, lámpara, fusible, térmico, motor (`app/src/sim/netlist.ts`)
- [ ] T4.3 Propagación de estados y animación visual en el lienzo — el solver ya corre sobre archivos reales, falta pintarlo
- [x] T4.4 Tests con circuitos canónicos: arranque directo con enclavamiento e inversión de giro con NC cruzado

**Decisión de diseño**: el solver se prueba contra circuitos escritos como datos, no extraídos de un `.cade`. Así un fallo de lógica no se confunde con un fallo de interpretación del dibujo. La extracción tiene sus propios tests de invariantes sobre los archivos reales.

**Abierto:**

- **La alimentación se INDICA, no se adivina.** El usuario marca un cable como fase y otro como neutro; sus redes se resuelven al armar el circuito. Sin marcar, la simulación no corre. El respaldo por código de cable existe pero no se usa para afirmar nada.
- **Confirmado con documentación oficial**: CADe_SIMU tiene «Cable fase» y «Cable neutro» como **elementos distintos** de la librería «Cables y conexiones». El tipo de conductor es un registro distinto, no una convención de color. Mapa inferido por estructura: `4000` fase (alimenta las cargas, numerado), `4010` neutro/PE (un solo conductor por archivo, de la bornera al motor), `4009`/`4019` mando, `4001` unión.
- **Confirmado por simulación**: marcando los cables `#23` (fase) y `#25` (neutro) del arranque, pulsar STAR energiza KM1 y PARO lo corta. La extracción del circuito es correcta; lo que faltaba era indicar la alimentación.

## Log

- **L1** — «falta bastante la ui se ve muy rustica, pasemos a face 2». Autoriza Fase 2 completa.
- **L2** — Hallazgo: los extremos de cable caen exactamente sobre el borde de la caja del componente, en múltiplos de 6 unidades. El motor del arranque tiene 4 bornes sobre el borde superior en `x+0, +6, +12, +18`; los dispositivos de dos bornes los tienen sobre el borde izquierdo a `y` y `y+12`. Los pines que se dibujan salen de ahí, no de la librería.
- **L3** — Hallazgo: la cola de la geometría puede imitar una cabecera de registro (`*15*16#` al final del registro del motor). Parsear un registro suelto sólo es fiable modelando el raw completo; `withId`/`withPosition` deben partir del fragmento entero.
- **L4** — «dale». Autoriza Fase 3.
- **L5** — Hallazgo: `geometry[21]` es el **número de cable**. Los tramos de un mismo cable lo comparten: en el arranque, los registros 36/37/38 son el cable 17 y forman una L real. El formato no tiene polilíneas; un cable con quiebres son varios registros.
- **L6** — Hallazgo: el código `4001` con geometría de longitud cero es un **punto de unión**, y también lleva número de cable. Un cable puede terminar en el medio de otro: la conexión existe sólo por ese registro.
- **L13** — «dale» al arranque de Fase 4. Solver implementado con realimentación real: contactos resuelven desde el estado, la fase y el neutro se propagan sólo por contactos (las cargas no conducen para continuidad), y las cargas se consultan al final. La oscilación se detecta por estado repetido, no por tope de iteraciones. 9 tests de solver + 7 de netlist.
- **L12** — Reporte del usuario: los vértices agregados se comportaban raro; al volver a la recta a veces quedaban, y al borrar un vértice se borraba la línea. Tres causas: (1) `mergeVertex` reemplazaba el tramo DESPUÉS de filtrar, así que al sacar un registro se corrían los índices y el tramo unido se escribía sobre otro — eso borraba la línea; (2) faltaba disolver los vértices que quedan sobre una recta; (3) no había forma de borrar un vértice: Suprimir borraba el cable entero. Ahora `simplifyCollinear` une tramos colineales sin borne ni unión, el clic en un vértice lo enfoca y Suprimir borra sólo ese vértice. Verificado por CDP: doblar 44 → volver 43; insertar 44 → enfocar vértice → ⌫ → 43 con el cable recto; ⌫ sin vértice enfocado sigue borrando el cable.
- **L11** — Reporte del usuario: al volver un extremo a su lugar, el vértice del codo viejo quedaba plantado. Tres causas: (1) al volver se generaba un tramo idéntico a uno existente y el duplicado sobrevivía; (2) el tramo que quedaba sin conexión por el movimiento no se limpiaba; (3) la selección no seguía al cable, así que los handles quedaban en los lugares viejos y el arrastre siguiente agarraba otra cosa. Arreglado con descarte de duplicados contra TODO el archivo, limpieza de ramales que quedaron muertos por el movimiento (salvo en el punto que se está arrastrando) y selección que sigue al cable. Además el imán a bornes pasó de 6 unidades a 11 px de pantalla: los bornes de este esquema están cada 6, así que el punto saltaba entre ellos y no se podía soltar donde uno quería. Verificado por CDP: ida 44 registros, vuelta 43, el cable vuelve a ser un único tramo vertical y el codo no queda.
- **L10** — Reporte del usuario: arrastrar a la derecha el extremo inferior del cable largo sólo agregaba una línea horizontal. El codo se ubicaba junto al extremo que se arrastraba, así que la vertical quedaba intacta. Ahora el codo va junto al extremo QUIETO: el tramo que se arrastra conserva su orientación y se ve desplazarse. Verificado en pantalla: la vertical pasa a x=60 y el codo queda arriba, junto al borne.
- **L9** — Reporte del usuario: al arrastrar un vértice se agregaban tramos en vez de moverlo, y arrastrar el cable no hacía nada. Causa: un vértice interior lo comparten dos tramos y `moveEndpoint` movía uno solo, dejando el otro clavado y generando un tramo suelto. Se agregó `moveVertex`, que mueve todos los extremos del punto en una sola operación, y `bendCable`, que inserta el doblez donde se agarra el cable y lo arrastra en un único paso de deshacer. Además se deduplican los tramos coincidentes: un vértice entre dos tramos colineales generaba dos tramos superpuestos.
- **L8** — Bug reportado por el usuario: al arrastrar un extremo sólo se movía en vertical, y el doble clic no agregaba vértice. Causa única: toda creación de registros se agregaba al final del archivo, o sea después del bloque de título, y el modelo lo tomaba como una hoja nueva sin título → invisible. Arreglado en el modelo (`buildProject`): lo que sigue al último bloque de título pertenece a esa hoja. Segundo arreglo: el golpe sobre cable se resuelve por distancia al segmento, no por orden de pintado, porque la caja del componente tapaba el cable. Verificado con un cliente CDP manejando Chrome de verdad.
- **L7** — Corrección de L2: los bornes no siempre están sobre el borde. La regla real es una grilla de 6 unidades con filas en `y=0` e `y=alto-3`. El fusible de `ej0def.cad` (alto 24, fila inferior en 21) la confirma con otra altura.
