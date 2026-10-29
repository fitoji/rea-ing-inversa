# simuElectro — plan de construcción

Objetivo: simulador eléctrico con manejo de cables moderno, que abra y ejecute archivos `.cade` de CADe_SIMU.

## Specs

- **S1** — Abrir archivos `.cade` existentes sin pérdida: todo registro no reconocido se preserva byte a byte y se reescribe igual al guardar.
- **S2** — Editar cables con interacción moderna: arrastre de extremos, ruteo ortogonal automático, uniones explícitas y cruces sin conexión.
- **S3** — Simular lógica de contactores: bobinas, contactos NA/NC, pulsadores, selectores, lámparas, fusibles, relé térmico y motor como carga.
- **S4** — Guardar en `.cade` (compatible) y exportar PDF/PNG.
- **S5** — App nativa de escritorio para macOS y Windows.
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
- [ ] T0.4 Spike de interacción de cables
- [ ] T0.5 Alcance de simulación v1 cerrado

### Fase 1 — Fundaciones (5/5)

- [x] T1.1 Repo, TypeScript, `node:test` — falta lint y CI
- [x] T1.2 Modelo de dominio `Project → Sheet → Component → Pin → Wire` (`app/src/model/project.ts`)
- [x] T1.3 Parser con golden files reales
- [x] T1.4 Writer con round-trip byte a byte
- [x] T1.5 Registro de componentes con fallback opaco

### Limitación abierta

2 de 161 registros mal delimitados en `inversion-giro-cej.cade` (códigos `0` y `5`). Se reportan vía `layouts`, no se ocultan.
