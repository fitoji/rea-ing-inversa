# simuElectro

Simulador eléctrico con manejo de cables moderno, compatible con archivos de **CADe_SIMU** (`.cade` / `.cad`).

## Por qué existe

CADe_SIMU es freeware cerrado, escrito en MFC 4.2 sobre Visual C++ 6 a partir del año 2000, y solo corre en Windows. Su punto débil es la interacción: dibujar y mover cables es arcaico.

Este proyecto **no** intenta decompilar ni reconstruir CADe_SIMU. Lo reimplementa: lee sus archivos, los simula y ofrece una experiencia de edición moderna. Al ser código propio, se puede modificar sin límites.

## Estado

| Fase | Estado |
|---|---|
| 0 — Reconocimiento del formato | 🟡 parcial |
| 1 — Parser y round-trip | 🟢 parser listo, 12 tests |
| 2 — Render e interacción | ⚪ no iniciado |
| 3 — Manejo de cables | ⚪ no iniciado |
| 4 — Simulación | ⚪ no iniciado |
| 5 — Producto | ⚪ no iniciado |

Plan completo y tareas: [`odd/tasks/simuelectro.md`](odd/tasks/simuelectro.md).

## Stack

- **TypeScript** ejecutado por Node 24 sin build (type stripping nativo).
- **Sin dependencias** en el núcleo: tests con `node:test`.
- A futuro: **Vite + React + SVG** para la UI y **Tauri** para el binario de escritorio (macOS y Windows).

## Uso

```bash
cd app

# tests
node --test

# inventario de códigos de un archivo
node src/report.ts test/fixtures/arranque-paro-motor-3f.cad
```

Salida del inventario: cada código con su frecuencia, los designadores observados y los `layouts` cuando un registro no sigue el layout estándar de 11 campos.

## Estructura

```
app/
  src/format/cade.ts   parser + serializador + inventario
  src/report.ts        CLI de inventario
  test/                tests y fixtures reales
docs/cade-format.md    gramática del formato, verificado vs. hipótesis
odd/tasks/             plan de construcción por fases
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
