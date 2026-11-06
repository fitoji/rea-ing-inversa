# Auditoría — Electro-Simulador v0.3.0

> Fecha: 2026-11-06 · Commit base: `86041c2` · Alcance: `app/` completo, solo lectura.
> Método: revisión de código con las skills `react-best-practices`, `typescript-advanced-types`,
> `accessibility`, `frontend-design` y `shadcn`, más medición empírica del parser y de la suite.

## Baseline medido

| Métrica | Valor |
| --- | --- |
| Código de producción | 50 archivos, 8.871 líneas (`app/src`) |
| Tests | 17 archivos, 2.158 líneas, **205 tests, 0 fallos** |
| Typecheck | `tsc --noEmit` limpio |
| Fixtures reales | 6 (el plan documenta 3) |
| Catálogo de componentes | 270 códigos, 215 dibujados, **59 caen al fallback** |
| `parse()` sobre 12,9 KB | **85,7 ms** (medido, ver P0-1) |

## Veredicto

**El motor está. El producto no.**

El núcleo de dominio —parser, writer, solver, netlist— es de calidad producción y sostiene la
promesa central del producto (no corromper el archivo). Lo que falta no es superficie de features:
es **que el diferenciador funcione a tamaño real** y **que exista la capa de producto**.

| Capa | Estado |
| --- | --- |
| Formato `.cade` (parse/write) | 🟢 sólido — round-trip byte a byte verificado |
| Modelo de dominio | 🟢 sólido — el texto es la única fuente de verdad |
| Solver / netlist | 🟢 sólido — lógica de contactores correcta |
| Editor / interacción | 🔴 limitado por performance (P0-1, P0-2) |
| Shell React | 🟠 prototipo — 861 líneas en un componente |
| Producto (Fase 5) | 🔴 inexistente — no exporta, no se instala |

## P0 — Bloqueantes

### P0-1 · El parser es O(n²)

`app/src/format/cade.ts:85-86`:

```ts
const tail = body.slice(m.index!);
if ((tail.match(/#/g) ?? []).length < 2) continue;
```

Por cada candidato a registro se copia **todo el resto del documento** y se escanea buscando `#`.
Con 161 registros sobre 12,9 KB eso da ~2 MB de escaneo y allocations por parse.

Medición sobre `test/fixtures/inversion-giro-cej.cade`:

```
bytes 12940 → parse avg 85.7 ms
```

No es lineal: un archivo de 50 KB tarda del orden de 1,7 s. Y `parse` corre dos veces por edición:
una en `projectOf` (`app/src/editor/state.ts:69-71`) y otra en la guarda de `commit`
(`app/src/editor/state.ts:78`).

**Fix:** precomputar las posiciones de `#` una sola vez (o acotar el escaneo al span hasta el
próximo candidato) y memoizar `text → Project` por identidad de texto.

### P0-2 · Arrastrar re-parsea el documento en cada `pointermove`

`app/src/ui/App.tsx:196-199` recalcula `projectOf(applyDrag(state, preview))` en cada evento, y
`app/src/ui/Canvas.tsx:331/337/344` lo emite sin throttle. Sumado a P0-1, el arrastre de cables
corre a **~4 fps** sobre un fixture real.

El cable es el diferenciador declarado del producto (principio 3 de `PRODUCT.md`). Hoy no se puede
demostrar.

**Fix:** el delta del arrastre es estado transitorio de `Canvas` y se aplica en el paint; `applyDrag`
y `commit` corren una sola vez en `pointerup`.

### P0-3 · El netlist mezcla hojas

`app/src/editor/network.ts:79`:

```ts
const key = (x, y) => `${Math.round(x * 100) / 100},${Math.round(y * 100) / 100}`;
```

Sin namespace de hoja. Las dos hojas de `inversion-giro-cej.cade` reusan el mismo origen de
coordenadas (bloque de título en 42,486 en ambas), así que un componente en la misma posición en
dos páginas es el mismo net. **Simulación silenciosamente incorrecta en archivos multi-hoja.**

**Fix:** prefijar la clave con el índice de hoja y construir el netlist por hoja.

## P1 — Deuda que ya produce bugs

| ID | Hallazgo | Evidencia |
| --- | --- | --- |
| P1-1 | Semántica de componentes repartida en 5 tablas divergentes (`circuit`, `netlist`, `visual`, `project`, `catalog`). `8005` es pulsador NC presionable en `circuit.ts:66` pero no está en el `PUSHER` de `visual.ts:40`: se presiona en la simulación y se dibuja en reposo. `8100` está en `PUSH_CODES` pero `kindOf` lo devuelve `unknown`, así que el clic se pierde. `8101`/`8102`/`8103` nunca son `lamp`. | `sim/circuit.ts:66`, `sim/visual.ts:40`, `sim/netlist.ts:69-91` |
| P1-2 | `dirty` es un booleano que nunca se limpia al guardar: después del primer guardado el punto ámbar queda y «Nuevo» siempre avisa. Además rotar (cambio solo visual) marca `dirty`. La única advertencia que protege un esquema de producción se vuelve ruido. | `editor/state.ts:51,82,210` |
| P1-3 | El estado de simulación vive dentro de un `useMemo` y escribe refs durante el render (`timerReadyRef`, `lastEnergized`). StrictMode ya lo ejecuta dos veces en desarrollo: dev y prod pueden divergir. | `ui/App.tsx:232-264` |
| P1-4 | El reloj de 100 ms re-renderiza todo el árbol y cada `Set`/`Map` derivado cambia de identidad en cada tick, así que memoizar `Canvas` hoy no serviría de nada. | `ui/App.tsx:130-139,327-338` |
| P1-5 | Capas invertidas: `model/` depende de `symbols/` y `sim/` depende de `editor/`. El solver no corre sin las heurísticas de red del editor. | `model/project.ts:23`, `sim/netlist.ts:18-19`, `sim/visual.ts:9` |
| P1-6 | Nueve handlers llaman `setState(fn(state))` con estado de render; dos actualizaciones en el mismo batch pierden la primera. `onSelect` re-parsea el archivo entero para leer un `code`. | `ui/App.tsx:372,582,587,614,619,712,727,813-818` |
| P1-7 | `noUncheckedIndexedAccess` está apagado y la geometría es `number[]` con índices mágicos; de ahí la proliferación de `!` y `as` justo en los límites de array. | `app/tsconfig.json:16`, `editor/network.ts:109-110` |
| P1-8 | La lógica más riesgosa (sesión de simulación: press/trip/timers/preview→commit) está atrapada en `App` y no tiene tests. | `ui/App.tsx:121-128,232-264,367-393` sin cobertura |

## P2 — UI, accesibilidad y diseño

El diagnóstico de «se ve rústico», concreto y medible:

| ID | Hallazgo | Evidencia |
| --- | --- | --- |
| P2-1 | Tipografía de 8 px en la paleta clásica y once tamaños distintos en el chrome (8, 9, 10, 10.5, 11.5, 12, 13.5, 14). El design system documenta seis pasos. | `ui/Palette.tsx:144-145,307,320`, `ui/PanelHead.tsx:10`, `ui/Inspector.tsx:20` |
| P2-2 | Filas de paleta de 40 px donde el sistema dice 28: glifo de 30 px + nombre + pill de código + estrella permanente compitiendo en 232 px. Entra ~30% menos catálogo del que debería. | `ui/Palette.tsx:331,337,345,349-359` |
| P2-3 | Ocho colores de familia en la paleta, incluido el violeta que el propio sistema prohíbe, y reusando rojo/ámbar/verde que el lienzo necesita para falta/energizado/vivo. | `ui/Palette.tsx:47-59`, `src/index.css:89-96,157-164` |
| P2-4 | Cada borne se dibuja dos veces: una en el glifo (`r=1.4`) y otra en el canvas (`r=0.9`), desfasadas hasta 2,2 unidades. | `ui/SymbolGlyph.tsx:74-78`, `ui/Canvas.tsx:588-590` |
| P2-5 | El pack «CADe_SIMU (clásico)» en modo oscuro repinta el fondo a claro pero deja `--foreground` en `#e2e8f0`: contraste ~1,1:1. El modo de compatibilidad es ilegible justo para quien viene de CADe_SIMU. | `src/index.css:276-299`, `ui/App.tsx:147,526` |
| P2-6 | El canvas es solo puntero: sin `tabindex`, `role`, `aria-label` ni modelo de teclado sobre los registros. Un usuario de teclado no puede seleccionar, mover ni inspeccionar nada. | `ui/Canvas.tsx:428-438,581,609` |
| P2-7 | Estado energizado señalizado casi solo por color; con `prefers-reduced-motion` se elimina el dash, que era la única señal no cromática. | `src/ui/diagram.css:86-89,175-193` |
| P2-8 | Tolerancia de acierto de cable de 4 px de pantalla mientras el snap a bornes usa 11 px; los handles escalan a sub-píxel en zoom bajo. | `ui/Canvas.tsx:285,404,486-503` |
| P2-9 | El único modal es `window.confirm` y los menús imprimen atajos ⌘ en Windows. Un `AlertDialog` de tres vías (Guardar/Descartar/Cancelar) es el mínimo para un esquema de producción. | `ui/App.tsx:171,585,590,604,609,643` |

## Paridad con CADe_SIMU

| Capacidad | CADe_SIMU | Acá |
| --- | --- | --- |
| Abrir/editar `.cade` sin corromper | sí | ✅ **mejor**: round-trip byte a byte |
| Edición de cables moderna | no (arcaica) | 🟠 existe, ~4 fps |
| Simulación de contactores | sí | ✅ |
| Temporizadores ON/OFF/ambos | sí | ✅ implementado (`7004..7013`, `9004..9007`) |
| Bobinas biestables | sí | ✅ |
| Motores + animación de giro | sí | ✅ |
| Numeración de cables y designadores | sí | ✅ |
| Multi-hoja | sí | 🟠 UI sí, netlist mezcla (P0-3) |
| Undo/redo | limitado | ✅ mejor |
| Export PDF/PNG e impresión | sí | ❌ |
| Instalable Windows/macOS | sí | ❌ (Tauri planificado) |
| PLC Siemens / bloques E/S | sí (`libnodave.dll`) | ❌ fuera de v1 |
| Neumática / hidráulica | sí | ❌ fuera de v1 |
| Arduino | sí | ❌ fuera de v1 |

## Orden de trabajo recomendado

**P0 — hacer usable lo que ya existe (1-2 semanas)**
1. Parser lineal + memoización `text → Project` (85 ms → <1 ms).
2. Arrastre como transformación transitoria; commit en `pointerup`.
3. Netlist con namespace de hoja.

**P1 — cerrar la grieta semántica (2-3 días)**
4. Una sola tabla `ComponentSpec` por código (kind de simulación, glifo, grupo de paleta,
   designador) y derivar los cinco consumidores. Elimina la clase de bugs `8005`/`8100`/`8101`.

**P2 — la capa de producto (Fase 5 completa)**
5. Export PNG/PDF y hoja de impresión con cajetín.
6. Tauri: filesystem real, diálogos nativos, autosave, archivos recientes.
7. `AlertDialog` de tres vías y atajos según plataforma.

**P3 — teclado y accesibilidad**
8. Modelo de teclado del canvas: roving tabindex sobre registros, flechas para mover, Enter para
   inspeccionar.

**P4 — fuera de v1**
PLC, neumática, Arduino. No empezar antes de P0-P2.

## Correcciones a la documentación existente

- `odd/tasks/simuelectro.md` lista los temporizadores como fuera de alcance: **están
  implementados** (`netlist.ts:219-226`, `solver.ts:135-162`).
- `app/PRODUCT.md` dice «suite de 136 tests»: hay **205**. Y dice 3 fixtures: hay **6**.
- `app/PRODUCT.md` y `odd/tasks/simuelectro.md` no mencionan que los timers ya están dentro.

## Límites de esta auditoría

- No se ejecutó la app en navegador: los hallazgos de UI se derivan del código y de los tokens CSS,
  no de una captura de pantalla.
- No se midió rendimiento de render con muchos registros en el navegador; las cifras de P0-1 son
  del parser en Node.
- `seo` no aplica (app de escritorio) y `vite` no arrojó hallazgos: la configuración está limpia.

## Errata de medición de P0-1 (2026-11-06, tanda P0)

Medición reproducida con `app/test/parse-perf.test.ts` antes de arreglar el escaneo:

| Documento | Registros | `parse` antes | `parse` después |
| --- | --- | --- | --- |
| `inversion-giro-cej.cade` (12,9 KB) | 161 | 1,09 ms | 0,16 ms |
| sintético 61 KB | 2.000 | 22,8 ms | 0,62 ms |
| sintético 124 KB | 4.000 | 87,0 ms | 1,25 ms |
| sintético 250 KB | 8.000 | 343,2 ms | 2,34 ms |

- **La forma cuadrática se confirma**: duplicar el documento multiplicaba el tiempo por 3,92.
- **El valor de 85,7 ms para el fixture real no se reproduce**: son 1,09 ms. La extrapolación
  «50 KB → 1,7 s» de arriba también estaba inflada: 50 KB parsea en ~15 ms. El defecto es real,
  pero no bloqueaba el editor a los tamaños de archivo que hoy se manejan.
- Arreglado en `app/src/format/cade.ts` (posiciones de `#` precomputadas) y `app/src/editor/state.ts`
  (memo `text → Project`): un archivo de 250 KB pasa de 343 ms a 2,3 ms por parseo, y cambiar la
  selección deja de reconstruir el `Project`. El arrastre sigue parseando por evento (P0-2).
