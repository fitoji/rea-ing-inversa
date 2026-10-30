# simuElectro

Simulador eléctrico con manejo de cables moderno, compatible con archivos de **CADe_SIMU** (`.cade` / `.cad`).

## Por qué existe

CADe_SIMU es freeware cerrado, escrito en MFC 4.2 sobre Visual C++ 6 a partir del año 2000, y solo corre en Windows. Su punto débil es la interacción: dibujar y mover cables es arcaico.

Este proyecto **no** intenta decompilar ni reconstruir CADe_SIMU. Lo reimplementa: lee sus archivos, los simula y ofrece una experiencia de edición moderna. Al ser código propio, se puede modificar sin límites.

## Roadmap

**v1 = app funcional** al cerrar la Fase 5: abre, edita y simula `.cade`, y se instala en macOS y Windows.

```
M1 ──────────● M2 ────────● M3 ────────● M4 ──────── M5
abrir/guardar   ver/dibujar  editar      simular      producto
                                        ▲
                                        estamos acá (M1-M3 cerrados, entrando a Fase 4)
```

| Fase | Objetivo | Entregable que lo prueba | Estado |
|---|---|---|---|
| **0 — Reconocimiento** | entender el formato y el binario | tabla de códigos + gramática | 🟡 4/5 |
| **1 — Parser** | abrir y guardar sin pérdida | round-trip byte a byte | 🟢 5/5 |
| **2 — Render** | ver y dibujar el esquema | esquema en pantalla con zoom y símbolos | 🟢 5/5 |
| **3 — Cables** | editar cables como en 2026 | arrastrar extremo con auto-ruteo | 🟢 6/6 |
| **4 — Simulación** | que el circuito funcione | arranque directo e inversión de giro | ⚪ 0/4 |
| **5 — Producto** | que se pueda usar a diario | instalador macOS + Windows | ⚪ 0/4 |

### Hitos

| Hito | Significa | Estado |
|---|---|---|
| **M1** | Abrir un `.cade` y guardarlo idéntico | ✅ |
| **M2** | Verlo dibujado y poder mover componentes | ✅ |
| **M3** | Editar cables con ruteo moderno | ✅ |
| **M4** | Simular el circuito | ⬜ |
| **M5** | Instalarlo en la máquina y usarlo | ⬜ |

### Dónde estamos

Fecha: 2026-10-30 · rama `feat/simuelectro`

**Hecho**
- ✅ Parser `.cade`/`.cad` con round-trip byte a byte (79 tests, 3 archivos reales).
- ✅ Modelo de dominio `Project → Sheet → Component → Pin → Wire`.
- ✅ Editor con undo/redo, multi-selección, copiar/pegar y borrar sobre el texto.
- ✅ Librería de símbolos IEC 60617: 22 códigos con símbolo dedicado y fallback rotulado.
- ✅ App Vite + React + SVG corriendo: paleta, lienzo con zoom/pan/grilla/snap, inspector.
- ✅ Pines derivados del archivo: cada borne dibujado es un extremo de cable real.
- ✅ Modelo de cable: número (`geometry[21]`), tramos, uniones (`4001`).
- ✅ Arrastrar extremos con snap a bornes y codo ortogonal automático.
- ✅ Validaciones de red en vivo con acciones de arreglo.

**En curso (Fase 4)**
- 🟡 Solver de simulación: todavía no hay motor de estados.
- 🟡 Tabla de códigos completa: faltan muestras o análisis del binario (T0.2).

**Limitaciones declaradas**
- La rotación es visual: el formato no expuso el campo de orientación.
- Los registros nuevos se agregan al final porque los ids deben ser estrictamente crecientes.
- 1 de 161 registros sigue mal delimitado en `inversion-giro-cej.cade`.

**Siguiente**
1. Fase 4: solver booleano con contactos, bobinas y motor como carga.
2. Cerrar la tabla de códigos con más muestras.

Plan detallado con todas las tareas: [`odd/tasks/simuelectro.md`](odd/tasks/simuelectro.md).

## Stack

- **TypeScript** ejecutado por Node 24 sin build (type stripping nativo).
- **Sin dependencias** en el núcleo: tests con `node:test`.
- A futuro: **Vite + React + SVG** para la UI y **Tauri** para el binario de escritorio (macOS y Windows).

## Uso

```bash
cd app
npm install

npm run dev     # abre la app en http://localhost:5187
npm test        # 61 tests sobre tres archivos reales
npm run build   # typecheck + bundle de producción

# inventario de códigos de un archivo
node src/report.ts test/fixtures/arranque-paro-motor-3f.cad
```

Salida del inventario: cada código con su frecuencia, los designadores observados y los `layouts` cuando un registro no sigue el layout estándar de 11 campos.

## Estructura

```
app/
  src/format/cade.ts       parser + serializador + inventario (sin dependencias)
  src/model/project.ts     modelo de dominio y edición de registros
  src/editor/state.ts      estado del editor: undo/redo, selección, clipboard
  src/editor/pins.ts       bornes derivados de los extremos de cable
  src/editor/network.ts    red de cables, uniones y validaciones
  src/symbols/library.ts   símbolos IEC 60617 en SVG
  src/symbols/templates.ts plantillas crudas por código (generadas)
  src/ui/                  app React: canvas, paleta, inspector
  src/report.ts            CLI de inventario
  test/                    tests y fixtures reales
docs/cade-format.md        gramática del formato, verificado vs. hipótesis
odd/tasks/                 plan de construcción por fases
```

## El formato, en cuatro ideas

Detalle completo en [`docs/cade-format.md`](docs/cade-format.md).

1. **Texto plano** Latin-1, dos delimitadores con roles distintos: `*` para campos numéricos, `#` para campos textuales.
2. **Sin cabecera de versión.** `CADe_SIMU` va seguido del primer registro, con forma `*<id>*<código>#`. El campo que parece "versión" es el id del primer registro.
3. **Los ids de registro son estrictamente crecientes.** Ese es el discriminante que separa un registro real de la cola de la geometría de un componente, que encaja en el mismo patrón.
4. **El código `8` es una etiqueta de texto**, y su contenido termina pegado al registro siguiente. Por eso la frontera de un registro puede caer dentro de un segmento: el parser trabaja con offsets sobre el texto, no con segmentos.

## Decisiones de diseño

- **Round-trip lossless**: `serialize(parse(x)) === x`, byte a byte. Es la garantía que permite abrir archivos sin miedo a corromperlos.
- **Registros opacos preservados**: un código desconocido se conserva íntegro y se reescribe igual. No hace falta entender los 200 códigos para poder editar cables.
- **El parser declara su incertidumbre**: los registros con layout inesperado se reportan, no se esconden.
- **Sin dependencias en el núcleo**: menos superficie, arranque instantáneo, tests sin instalación.

## Limitaciones conocidas

- 2 de 161 registros mal delimitados en `inversion-giro-cej.cade` (códigos `0` y `5`).
- La tabla de códigos de componente está incompleta: falta la extracción desde el binario.
- No hay simulación todavía.

## Muestras y legalidad

Los fixtures de `app/test/fixtures/` son esquemas eléctricos de terceros, usados como datos de prueba. En `data/` (fuera de git) vive el binario propietario de CADe_SIMU, que **no** se versiona ni se redistribuye.

Este repositorio no contiene código de CADe_SIMU. El conocimiento del formato proviene de observar archivos de datos; la implementación es propia.
