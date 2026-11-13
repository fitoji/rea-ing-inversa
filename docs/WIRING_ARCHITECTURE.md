# Propuesta de arquitectura: sistema moderno de cableado

**Proyecto:** [fitoji/rea-ing-inversa](https://github.com/fitoji/rea-ing-inversa)  
**Estado:** propuesta de diseño, pendiente de contrastar con todos los archivos fuente  
**Fecha:** 2026-11-12

## 1. Objetivo

Rediseñar la experiencia de cableado del editor de circuitos para que sea precisa, fluida y predecible, preservando la conectividad eléctrica, la compatibilidad con CADe_SIMU y la capacidad de deshacer/rehacer operaciones.

**Decisión recomendada:** conservar React + SVG y el parser/serializador existentes; incorporar un motor de cableado propio, independiente de React, que separe geometría, conectividad, interacción y persistencia.

## 2. Contexto y alcance

Según la documentación y el análisis preliminar realizado durante la conversación, la aplicación dispone de un modelo de proyecto, componentes, pines y cables, además de edición, snap, rutas ortogonales básicas, validación de redes y exportación CADe_SIMU.

> **Limitación:** esta propuesta no constituye una auditoría completa del código. Antes de implementar, verificar rutas, tipos, funciones y contratos reales del repositorio. Las observaciones sobre `state.ts` y `network.ts` son hipótesis de refactorización derivadas de la revisión preliminar; confirmar su vigencia en la rama actual.

### Requisitos funcionales

- Conectar cables a terminales mediante snap magnético.
- Dibujar y editar rutas ortogonales con vista previa en tiempo real.
- Arrastrar un segmento sin perder sus anclajes eléctricos.
- Mover componentes conservando conexiones.
- Distinguir cruces geométricos de uniones eléctricas explícitas.
- Crear derivaciones en T y reconectar extremos.
- Cancelar cualquier gesto sin modificar el documento.
- Registrar una única operación de undo por gesto confirmado.
- Conservar archivos CADe_SIMU sin cambios cuando solo se abren y guardan.

## 3. Arquitectura propuesta

```text
Pointer / Keyboard Events
          |
          v
Interaction Controller (state machine)
          |
          v
Geometry Engine <----> Electrical Graph
(snap, hit-test,        (pins, junctions,
 routing, segments)      connectivity, nets)
          |                    |
          +---------+----------+
                    v
          Commands / Transactions
                    |
                    v
        Document State + Undo/Redo
                    |
           +--------+--------+
           v                 v
       SVG Renderer      CADe Adapter
    (previews/handles)  (import/export)
```

### Principios

1. **Conectividad explícita:** un extremo se conecta a un pin o una unión mediante identidad estable, no solo por proximidad.
2. **Geometría independiente:** los vértices determinan la forma visual; el grafo determina qué está eléctricamente conectado.
3. **Interacciones transaccionales:** el arrastre vive en un estado temporal y se confirma una vez al soltar el puntero.
4. **Compatibilidad conservadora:** conservar metadatos y registros no modificados del archivo original.
5. **Reglas deterministas:** el mismo gesto y documento deben producir la misma ruta y conectividad.

## 4. Modelo intermedio de cableado

```ts
type Point = Readonly<{ x: number; y: number }>;

type Anchor =
  | { kind: 'pin'; componentId: number; pinId: string }
  | { kind: 'junction'; junctionId: string }
  | { kind: 'free'; point: Point };

interface WirePath {
  id: string;
  sheet: number;
  from: Anchor;
  to: Anchor;
  vertices: Point[];
  routing: 'manual' | 'auto';
  sourceRecordIds: number[];
}

interface Junction {
  id: string;
  sheet: number;
  point: Point;
  explicit: boolean;
}

interface WiringDocument {
  paths: Map<string, WirePath>;
  junctions: Map<string, Junction>;
}
```

Este modelo es una **representación editable intermedia**, no una sustitución directa del modelo persistente CADe_SIMU. Antes de implementarlo, definir si `vertices` incluye o excluye extremos y documentar esa convención. Mantener un mapeo estable entre IDs internos y registros fuente.

### Invariantes

- Todos los tramos de una ruta ortogonal son horizontales o verticales.
- Un pin o junction referenciado debe existir en la hoja correspondiente.
- Un cruce sin junction no crea conectividad.
- Una derivación explícita sí crea conectividad.
- Un movimiento geométrico no modifica redes salvo que el usuario ejecute una operación de conexión/desconexión.
- No se crean segmentos de longitud cero ni duplicados al normalizar rutas.

## 5. Componentes del motor

### `geometry.ts`

- Conversión entre coordenadas de pantalla y documento.
- Normalización y simplificación de polilíneas ortogonales.
- Proyección de un punto sobre un segmento.
- Detección de intersecciones y distancias.
- Preservación de codos y segmentos bloqueados.

### `snap.ts`

Prioridad sugerida: pin válido cercano → junction existente → segmento apto para derivación → cuadrícula. Usar tolerancia visual en píxeles transformada a coordenadas de documento para mantener una experiencia consistente con el zoom. Evitar conexiones eléctricas implícitas durante un simple movimiento.

### `hitTest.ts`

Detectar el objetivo bajo el puntero (pin, junction, extremo, segmento, componente o fondo), con prioridades explícitas. Considerar un índice espacial por hoja cuando el rendimiento lo justifique; `rbush` es una opción, no un requisito.

### `router.ts`

Dos niveles:

- **Durante el arrastre:** candidatos HV y VH, selección rápida y estable.
- **Al confirmar:** A* ortogonal en cuadrícula si hay obstáculos o restricciones complejas.

Función de coste inicial orientativa:

```text
coste = longitud + 20 * codos + 100 * obstáculos + 5 * desviación
```

Los pesos son ajustables y requieren pruebas con circuitos reales. No penalizar todos los cruces: algunos son válidos eléctricamente y visualmente.

### `controller.ts`

Estados tipados: `idle`, `drawing`, `dragging-segment`, `dragging-endpoint`, `reconnecting`, `placing-junction`. Cada gesto implementa `start → preview → validate → commit/cancel`. `Escape` revierte la vista previa; `pointercancel` debe tener tratamiento explícito.

### `commands.ts`

Comandos atómicos sugeridos:

- `CreateWire`
- `MoveWireSegment`
- `ReconnectEndpoint`
- `InsertJunction`
- `RemoveJunction`
- `MoveComponentWithAnchors`
- `DeleteWire`

Cada comando valida precondiciones y devuelve un resultado inmutable o un cambio estructurado. Una transacción de usuario genera una sola entrada de historial.

### `adapter.ts`

Importar registros CADe_SIMU al modelo intermedio, conservando IDs y datos originales. Exportar **solo los cambios necesarios** y preservar lo demás. Evitar reescrituras globales de registros no afectados. Validar las reglas del formato con fixtures reales.

## 6. Archivos a modificar o crear

Rutas relativas a `app/`; **verificar nombres y ubicación reales** antes de abrir un PR.

| Archivo | Acción | Objetivo |
|---|---|---|
| `src/editor/state.ts` | Modificar | Transacciones y un único commit por gesto |
| `src/editor/network.ts` | Refactorizar | Conectividad, índices y validación |
| `src/editor/pins.ts` | Modificar | Anclajes e identidad estable de terminales |
| `src/model/project.ts` | Revisar/modificar | Adaptación del modelo persistente |
| `src/editor/wiring/types.ts` | Crear | Tipos de dominio |
| `src/editor/wiring/geometry.ts` | Crear | Operaciones geométricas |
| `src/editor/wiring/snap.ts` | Crear | Resolución de objetivos de snap |
| `src/editor/wiring/hitTest.ts` | Crear | Selección geométrica |
| `src/editor/wiring/router.ts` | Crear | Rutas ortogonales |
| `src/editor/wiring/controller.ts` | Crear | Máquina de estados |
| `src/editor/wiring/commands.ts` | Crear | Comandos y validación |
| `src/editor/wiring/adapter.ts` | Crear | Importación/exportación del modelo intermedio |
| `src/ui/` | Integrar | Capas SVG, handles y eventos de puntero |
| `src/sim/netlist.ts` | Revisar | Consumo coherente de redes eléctricas |

No cambiar nombres de archivos existentes ni interfaces públicas hasta comprobar sus dependencias.

## 7. Integración con el historial

No actualizar el texto persistente en cada `pointermove`. Mantener un `WiringDraft` transitorio, renderizarlo y confirmar una sola transacción al final.

Pseudocódigo orientativo (funciones por implementar, no API existente):

```ts
interface WiringTransaction {
  name: string;
  execute(document: WiringDocument): WiringDocument;
}

function applyWiringTransaction(
  state: EditorState,
  transaction: WiringTransaction
): EditorState {
  const project = projectOf(state);
  const before = importWiring(project);
  const after = transaction.execute(before);
  validateWiring(after);
  const nextText = exportWiringChanges(project, before, after);
  return commitDocument(state, nextText);
}
```

`commitDocument` debe reutilizar el contrato real de historial y serialización del proyecto. No copiar este ejemplo literalmente sin adaptar los tipos y funciones existentes.

## 8. Estrategia de migración

1. **Modelo y fixtures:** documentar invariantes, capturar archivos CADe_SIMU representativos y construir tests de importación/exportación.
2. **Geometría y snap:** implementar funciones puras, con tests de zoom, tolerancias y coordenadas.
3. **Grafo eléctrico:** definir conexiones explícitas, derivaciones y cruces; comparar netlists antes/después.
4. **Rutas y edición:** añadir control de segmentos, extremos y codos con previews.
5. **Integración React:** activar el nuevo controlador detrás de una opción de desarrollo, conservando el editor anterior.
6. **Validación y sustitución:** medir rendimiento y comprobar compatibilidad antes de eliminar código legado.

## 9. Pruebas de aceptación

| Caso | Resultado esperado |
|---|---|
| Mover componente | Los extremos anclados siguen sus pines |
| Mover segmento intermedio | Se conserva la conectividad |
| Cruzar cables | No se conectan sin unión explícita |
| Crear derivación en T | Se añade junction y se actualiza la red |
| Pulsar Escape durante arrastre | No cambia el documento |
| Hacer 100 movimientos del puntero | Un solo paso de undo tras confirmar |
| Abrir y guardar sin editar | Se preserva el archivo original |
| Exportar después de editar | Archivo válido, redes coherentes |
| Repetir undo y redo | Geometría y conectividad idénticas |
| Zoom extremo | Snap y hit-testing mantienen tolerancias útiles |

## 10. Dependencias

- **Mantener:** React, TypeScript y SVG.
- **Opcionales:** Zustand (estado de UI), XState (si la máquina de estados crece), `rbush` (índice espacial).
- **No incorporar inicialmente:** React Flow, JointJS, Konva o `elkjs`. Pueden servir como referencias, pero no sustituyen las reglas eléctricas específicas del proyecto.

## 11. Primer PR recomendado

**Título:** `refactor(wiring): introduce typed wiring domain and geometry primitives`

**Contenido:**

- Crear `types.ts` y `geometry.ts`.
- Añadir tests de normalización de rutas ortogonales y cruces.
- Crear fixtures de cables y uniones a partir de archivos existentes.
- Documentar las invariantes y la correspondencia entre registros CADe y entidades internas.
- No modificar todavía la interfaz ni el formato de guardado.

**Criterio de aceptación:** todas las pruebas actuales siguen pasando; las nuevas funciones son puras; no hay cambios en archivos CADe_SIMU por abrir/guardar sin editar.

---

## Referencias

- Repositorio: https://github.com/fitoji/rea-ing-inversa
- React Flow: https://reactflow.dev/
- JointJS routers: https://docs.jointjs.com/api/routers/

Esta propuesta está pensada para iterarse mediante PRs pequeños, sin comprometer la compatibilidad del editor existente.
