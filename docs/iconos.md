# Iconos de Electro-Simulador

Inventario de todo lo que dibuja iconografía en la interfaz: qué ícono se usa, dónde vive y para qué está. Son **29 íconos distintos** en 8 archivos, todos de la misma librería.

## Fuente y reglas

- **Única librería:** `lucide-react` (~1.65.0), trazo de 2px sobre viewBox 24×24. No hay icon fonts, ni SVG propios de interfaz, ni emoji usado como ícono.
- **Color:** siempre `currentColor`. Ningún ícono se pinta con un color propio salvo la estrella de favoritos (tono de señalización) y los avisos, que heredan el color de su alerta.
- **En botones con etiqueta** el ícono va con `data-icon="inline-start"`; el tamaño lo pone el componente según su `size`, así que nunca se le pasa `size-*` a mano. Los botones de sólo ícono no usan `data-icon` (no hay etiqueta a la que ajustarse). En los ítems de menú el tamaño lo fija la clase `[&_svg]:size-4` del propio ítem.
- **Siempre con etiqueta.** En los menús cada ícono acompaña texto ("Nuevo", "Guardar .cade"); no existe un ítem sólo-icono. La barra de la derecha sí tiene botones de sólo ícono, pero todos llevan `aria-label`, tooltip y atajo equivalente en el menú.

### Tamaños por contexto

| Contexto | Tamaño | Lo fija |
| --- | --- | --- |
| Ítem de menú (menubar, select) | 16px | `menubar.tsx` / `select.tsx` (`[&_svg]:size-4`) |
| Botón `size="sm"` u `outline` | 14px | `button.tsx` (`size-3.5`) |
| Botón `size="icon-sm"` | 16px | `button.tsx` (base `size-4`) |
| Botón `size="icon-xs"` (favorito) | 12px | `button.tsx` (`size-3`) |
| Alerta del inspector | 16px | `alert.tsx` |
| Estado vacío | 16px en una caja de 32px | `empty.tsx` |
| Toast | 16px | `sonner.tsx` |
| Rótulo de sección (Favoritos) | 12px | `Palette.tsx` (`size-3` explícito) |
| Spinner | 16px | `spinner.tsx` |

## Menubar · Archivo

| Ícono | Etiqueta | Para qué |
| --- | --- | --- |
| `FilePlusIcon` | Nuevo | Empezar un documento en blanco válido (una hoja con bloque de título), previa confirmación si hay cambios sin guardar. |
| `FolderOpenIcon` | Abrir… | Disparar el selector de archivos `.cade`/`.cad` del sistema. |
| `BookOpenIcon` | Ejemplos | Marcar el submenú que lista los samples incluidos; el abierto se marca con "actual" a la derecha. |
| `SaveIcon` | Guardar .cade | Descargar el archivo. Es el único botón primario de la aplicación. |

## Menubar · Editar

| Ícono | Etiqueta | Para qué |
| --- | --- | --- |
| `Undo2Icon` | Deshacer | Deshacer sobre el historial de texto (⌘Z). |
| `Redo2Icon` | Rehacer | Rehacer (⇧⌘Z). |
| `CopyIcon` | Copiar | Copiar la selección al portapapeles del editor (⌘C). |
| `ClipboardPasteIcon` | Pegar | Pegar lo copiado, desplazado respecto del original (⌘V). |
| `RotateCwIcon` | Rotar 90° | Girar la selección en pasos de 90° (R). |
| `Trash2Icon` | Borrar selección | Eliminar registros seleccionados (⌫). Va como único ítem `destructive` del menubar. |

## Menubar · Ver

| Ícono | Etiqueta | Para qué |
| --- | --- | --- |
| `Grid3x3Icon` | Grilla | Mostrar u ocultar la grilla del lienzo. Es un checkbox: el tilde lo pinta el propio ítem. |
| `MagnetIcon` | Snap (paso de 3) | Activar el pegado a la grilla de 3 unidades y a los bornes. Imán = atracción, no "magnetismo eléctrico". |
| `Maximize2Icon` | Encuadrar | Ajustar zoom y desplazamiento para que entre todo el dibujo (⌘0). |
| `SunIcon` | Modo día | Opción del grupo de tema; el tema vive en `<html class="dark">` y se guarda en localStorage. |
| `MoonIcon` | Modo noche | La opción por defecto del grupo de tema. |

## Menubar · Simulación

| Ícono | Etiqueta | Para qué |
| --- | --- | --- |
| `PlayIcon` | Simular | Arrancar la simulación de contactores con la alimentación marcada. Si falta fase o neutro, avisa en lugar de simular. |
| `SquareIcon` | Detener simulación | Cortar la simulación y limpiar el estado retenido de los contactores. Cuadrado = stop, el par convencional de play. |

## Barra de acciones (header, a la derecha)

| Ícono | Botón | Para qué |
| --- | --- | --- |
| `Undo2Icon` | Deshacer (icon-sm) | Mismo comando que el menú, con tooltip y atajo. Se deshabilita si no hay historial. |
| `Redo2Icon` | Rehacer (icon-sm) | Ídem. |
| `PlayIcon` / `SquareIcon` | Simular / Detener | Único botón de la barra con etiqueta visible; cambia de ícono y de variante según el estado. |
| `SunIcon` / `MoonIcon` | Tema (icon-sm) | Muestra el modo **al que vas**, no en el que estás: en noche se ve sol, en día se ve luna. |
| `SaveIcon` | Guardar .cade (primario) | Remite al mismo comando que el menú. |

## Inspector (panel derecho)

| Ícono | Dónde | Para qué |
| --- | --- | --- |
| `MousePointerClickIcon` | Estado vacío | Explicar que hay que hacer clic en un componente o cable; es la única ilustración del panel. |
| `RotateCwIcon` | Botón Rotar | Rotar la selección, tanto con un registro como con varios. |
| `Trash2Icon` | Botón Borrar | Eliminar la selección (simple y múltiple). |
| `Trash2Icon` | Botón Eliminar vértice | Aparece cuando hay un vértice de cable enfocado (⌫). |
| `TriangleAlertIcon` | Avisos | Encabeza cada aviso de red (unión superpuesta, etc.). La alerta es `destructive`: el color lo pone el contenedor. |
| `InfoIcon` | Notas | Aviso informativo del panel que **no** es un error de red. |

## Paleta (panel izquierdo)

| Ícono | Dónde | Para qué |
| --- | --- | --- |
| `StarIcon` | Rótulo "Favoritos" | Marcar la sección de símbolos guardados; va relleno con el tono de señalización. |
| `StarIcon` | Fila de símbolo | Marcar o quitar un favorito (persistido en localStorage). Relleno cuando está marcado, contorno cuando no. |
| `BoxesIcon` | Estado vacío | Explicar que no hay plantillas generadas y qué comando correr. |

## Componentes base (shadcn)

Estos no los elegimos nosotros: vienen con los componentes y existen para que el control se entienda.

| Ícono | Componente | Para qué |
| --- | --- | --- |
| `ChevronDownIcon` | `accordion`, `select` | Indicar que el grupo se abre; en el select también es la flecha del disparador y el botón de scroll hacia abajo. |
| `ChevronUpIcon` | `accordion`, `select` | El mismo indicador cerrado; en el select, scroll hacia arriba. |
| `CheckIcon` | `select`, `menubar` | Marcar el ítem elegido en un select y el estado de un checkbox/radio del menú. |
| `ChevronRightIcon` | `menubar` | Señalar que un ítem abre un submenú (Ejemplos). |
| `CircleCheckIcon` | `sonner` | Toast de éxito. |
| `InfoIcon` | `sonner` | Toast informativo (además de su uso en el inspector). |
| `TriangleAlertIcon` | `sonner` | Toast de advertencia (además de su uso en el inspector). |
| `OctagonXIcon` | `sonner` | Toast de error. Octágono = señal de stop, más fuerte que un triángulo. |
| `Loader2Icon` | `sonner`, `spinner` | Toast de carga y spinner de "Cargando…" al abrir el editor. Gira con `animate-spin`. |

## Lo que NO es un ícono

Los símbolos del lienzo (210 símbolos en la paleta, sobre un catálogo de 270 códigos CADe_SIMU) no son iconografía de interfaz y no se cuentan acá: son geometría del plano. Viven en `src/symbols/library.ts`, se dibujan con `SymbolGlyph` y usan los tokens de tinta del diagrama (`--ink`, `--wire`, `--select`), escalan con el zoom y no llevan etiqueta. Su origen es la colección de QElectroTech (CC-BY 3.0, ver `NOTICE-qet.md`).

Tampoco cuentan los tonos por familia de la paleta (`--tone-*`): son puntos de color, no íconos.

## Índice alfabético

| Ícono | Archivo | Para qué (resumen) |
| --- | --- | --- |
| `BookOpenIcon` | `ui/App.tsx` | Submenú Ejemplos. |
| `BoxesIcon` | `ui/Palette.tsx` | Estado vacío sin plantillas. |
| `CheckIcon` | `ui/menubar.tsx`, `ui/select.tsx` | Ítem elegido / checkbox marcado. |
| `ChevronDownIcon` | `ui/accordion.tsx`, `ui/select.tsx` | Abrir grupo / flecha de select. |
| `ChevronRightIcon` | `ui/menubar.tsx` | Submenú. |
| `ChevronUpIcon` | `ui/accordion.tsx`, `ui/select.tsx` | Grupo cerrado / scroll arriba. |
| `CircleCheckIcon` | `ui/sonner.tsx` | Toast de éxito. |
| `ClipboardPasteIcon` | `ui/App.tsx` | Pegar (⌘V). |
| `CopyIcon` | `ui/App.tsx` | Copiar (⌘C). |
| `FilePlusIcon` | `ui/App.tsx` | Nuevo documento. |
| `FolderOpenIcon` | `ui/App.tsx` | Abrir archivo. |
| `Grid3x3Icon` | `ui/App.tsx` | Grilla on/off. |
| `InfoIcon` | `ui/Inspector.tsx`, `ui/sonner.tsx` | Nota informativa / toast info. |
| `Loader2Icon` | `ui/sonner.tsx`, `ui/spinner.tsx` | Carga. |
| `MagnetIcon` | `ui/App.tsx` | Snap on/off. |
| `Maximize2Icon` | `ui/App.tsx` | Encuadrar (⌘0). |
| `MoonIcon` | `ui/App.tsx` | Modo noche. |
| `MousePointerClickIcon` | `ui/Inspector.tsx` | Estado vacío del inspector. |
| `OctagonXIcon` | `ui/sonner.tsx` | Toast de error. |
| `PlayIcon` | `ui/App.tsx` | Simular. |
| `Redo2Icon` | `ui/App.tsx` | Rehacer (⇧⌘Z). |
| `RotateCwIcon` | `ui/App.tsx`, `ui/Inspector.tsx` | Rotar 90° (R). |
| `SaveIcon` | `ui/App.tsx` | Guardar .cade. |
| `SquareIcon` | `ui/App.tsx` | Detener simulación. |
| `StarIcon` | `ui/Palette.tsx` | Favoritos. |
| `SunIcon` | `ui/App.tsx` | Modo día. |
| `Trash2Icon` | `ui/App.tsx`, `ui/Inspector.tsx` | Borrar selección / vértice. |
| `TriangleAlertIcon` | `ui/Inspector.tsx`, `ui/sonner.tsx` | Aviso de red / toast de advertencia. |
| `Undo2Icon` | `ui/App.tsx` | Deshacer (⌘Z). |

## Cómo mantener esto

1. `grep -rn "lucide-react" app/src/` lista los archivos con íconos.
2. Si un ícono nuevo no entra en ninguna de las categorías de arriba, probablemente sobra: la regla del sistema visual es que las acciones se nombran con palabras y el ícono sólo acompaña.
3. Un ícono no se reemplaza por un emoji ni por un carácter Unicode; y si es un símbolo eléctrico, va al lienzo, no a la interfaz.
