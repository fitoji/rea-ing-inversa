---
name: Electro-Simulador
description: Editor de esquemas eléctricos que abre y guarda archivos CADe_SIMU sin perder un byte.
colors:
  plano-bg: "#0e1116"
  plano-card: "#14181f"
  plano-popover: "#171c24"
  plano-border: "#232832"
  plano-text: "#e2e8f0"
  plano-text-soft: "#98a3b3"
  plano-primary: "#2c4a7c"
  plano-primary-ink: "#dce9ff"
  plano-secondary: "#24344d"
  plano-muted: "#1e2531"
  plano-select: "#5b9dff"
  plano-wire: "#3fbf8f"
  plano-wire-alt: "#35a89b"
  plano-warn: "#f0b429"
  plano-danger: "#ff6b6b"
  plano-ink: "#93a7c2"
  plano-grid: "#1a1f28"
  day-bg: "#f6f8fb"
  day-card: "#ffffff"
  day-border: "#d7dee8"
  day-text: "#16202c"
  day-text-soft: "#5d6a7a"
  day-primary: "#2f5c9e"
  day-wire: "#0f9d63"
  day-warn: "#b97d05"
  day-select: "#2f6fd0"
typography:
  body:
    fontFamily: "Geist Variable, -apple-system, system-ui, sans-serif"
    fontSize: "13px"
    fontWeight: 400
    lineHeight: 1.45
  wordmark:
    fontFamily: "Geist Variable, -apple-system, system-ui, sans-serif"
    fontSize: "13.5px"
    fontWeight: 600
    lineHeight: 1.45
    letterSpacing: "-0.01em"
  menu:
    fontFamily: "Geist Variable, -apple-system, system-ui, sans-serif"
    fontSize: "14px"
    fontWeight: 500
    lineHeight: "20px"
  button:
    fontFamily: "Geist Variable, -apple-system, system-ui, sans-serif"
    fontSize: "12.8px"
    fontWeight: 500
    lineHeight: "18.5px"
  label:
    fontFamily: "Geist Variable, -apple-system, system-ui, sans-serif"
    fontSize: "10px"
    fontWeight: 600
    lineHeight: "14.5px"
    letterSpacing: "0.5px"
  data:
    fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace"
    fontSize: "11px"
    fontWeight: 400
    lineHeight: "16px"
    fontFeature: "tnum"
rounded:
  sm: "4.2px"
  md: "5.6px"
  lg: "7px"
  xl: "9.8px"
  2xl: "12.6px"
  pill: "18.2px"
spacing:
  xs: "4px"
  sm: "6px"
  md: "8px"
  lg: "12px"
  xl: "16px"
components:
  chrome-header:
    backgroundColor: "{colors.plano-card}"
    textColor: "{colors.plano-text}"
    height: "46px"
    padding: "0 {spacing.lg}"
    rounded: "0px"
  chrome-footer:
    backgroundColor: "{colors.plano-card}"
    textColor: "{colors.plano-text-soft}"
    height: "26px"
    padding: "0 {spacing.lg}"
    typography: "{typography.data}"
    rounded: "0px"
  panel-side:
    backgroundColor: "{colors.plano-card}"
    textColor: "{colors.plano-text}"
    width: "232px"
    padding: "0px"
    rounded: "0px"
  button-primary:
    backgroundColor: "{colors.plano-primary}"
    textColor: "{colors.plano-primary-ink}"
    height: "28px"
    padding: "0 10px 0 6px"
    rounded: "{rounded.md}"
    typography: "{typography.button}"
  button-ghost:
    backgroundColor: "transparent"
    textColor: "{colors.plano-text}"
    height: "28px"
    padding: "0 10px 0 6px"
    rounded: "{rounded.md}"
    typography: "{typography.button}"
  button-icon:
    backgroundColor: "transparent"
    textColor: "{colors.plano-text}"
    size: "28px"
    rounded: "{rounded.md}"
  menubar-trigger:
    backgroundColor: "transparent"
    textColor: "{colors.plano-text}"
    height: "24px"
    padding: "2px 6px"
    rounded: "{rounded.sm}"
    typography: "{typography.menu}"
  menu-surface:
    backgroundColor: "{colors.plano-popover}"
    textColor: "{colors.plano-text}"
    width: "144px"
    padding: "4px"
    rounded: "{rounded.lg}"
  menu-item:
    backgroundColor: "transparent"
    textColor: "{colors.plano-text}"
    height: "28px"
    padding: "4px 6px"
    rounded: "{rounded.md}"
    typography: "{typography.menu}"
  badge-counter:
    backgroundColor: "transparent"
    textColor: "{colors.plano-text-soft}"
    height: "20px"
    padding: "2px 4px"
    rounded: "{rounded.pill}"
    typography: "{typography.data}"
  input-text:
    backgroundColor: "transparent"
    textColor: "{colors.plano-text}"
    height: "32px"
    padding: "0 10px"
    rounded: "{rounded.lg}"
---

# Design System: Electro-Simulador

## Overview

**Creative North Star: "El plano de obra"**

El sistema se lee como un plano técnico, no como una aplicación: el lienzo es el documento y todo el chrome es el caballete que lo sostiene. Por eso el fondo de la aplicación es un azul-negro profundo (`{colors.plano-bg}`), los paneles son cartón un paso más claro (`{colors.plano-card}`) y la separación entre zonas la hace un borde de 1px antes que cualquier sombra. La densidad es la de un taller: filas de 28px, rótulos de 10px en mayúsculas, contadores en mono de 11px. No hay aire decorativo ni tarjetas dentro de tarjetas.

La paleta tiene dos registros que no se mezclan. **Acero** —azul y neutros— es todo lo que es interfaz: navegación, botones, paneles, bordes. **Tinta de dibujo** —verde de conductor, ámbar de energizado, azul de selección— es todo lo que ocurre dentro del plano: cables, símbolos, marcas de aviso. Un botón nunca se pinta verde; un cable nunca se pinta gris de chrome. Cuando una zona se sale del registro, deja de leerse como herramienta.

La tipografía sostiene la misma división: Geist para leer y decidir, monoespaciada para medir. Designadores, códigos de componente, conteos, zoom y alimentación van en mono porque son datos del plano, no texto de interfaz.

**Key Characteristics:**
- Dos temas completos (noche por defecto, día como alternativa) con los mismos nombres de token.
- Chrome plano con elevación sutil direccional; el borde hace la separación, la sombra sólo insinúa la capa.
- Cero gradientes, cero transparencias decorativas, cero violeta.
- El color con más permiso es el verde del conductor, y vive dentro del lienzo.

## Colors

Paleta de plano nocturno: acero frío de base y señales vivas reservadas al dibujo.

### Primary

- **Azul de chapa** (`{colors.plano-primary}`): fondo del botón primario —guardar, la única acción con peso propio— y del estado `secondary` de la lista de hojas. En día sube a `{colors.day-primary}` porque el mismo valor se apagaría sobre blanco.
- **Tinta de selección** (`{colors.plano-select}`): todo lo seleccionado, dentro y fuera del lienzo: contorno del símbolo, cable, pin, marquesina y anillo de foco. Es el único azul brillante del sistema; si aparece en un botón, está mal.

### Secondary

- **Verde de conductor** (`{colors.plano-wire}`): cables, uniones y el punto de "sin cambios" del footer. No es un color de estado de interfaz, es la tinta del plano.
- **Verde de conductor alterno** (`{colors.plano-wire-alt}`): el segundo conductor del mismo cableado, para que dos trazados paralelos se distingan sin cambiar de familia.

### Tertiary

- **Ámbar de energizado** (`{colors.plano-warn}`): un aparato que quedó con tensión durante la simulación y el triángulo de aviso. Su escasez es la señal: si el ámbar aparece en el chrome, la simulación pierde sentido.
- **Rojo de falla** (`{colors.plano-danger}`): marca de error sobre el lienzo y insignia de avisos. Nunca como decoración de un botón secundario.

### Neutral

- **Vacío de plano** (`{colors.plano-bg}`): fondo de la aplicación y del lienzo. Es el color que más superficie ocupa y el que no compite.
- **Cartón de panel** (`{colors.plano-card}`): header, footer, paleta e inspector. Un paso de luz sobre el vacío: suficiente para separar, insuficiente para parecer una tarjeta.
- **Cartón de menú** (`{colors.plano-popover}`): menús, popovers y tooltips. Un paso más claro que el panel porque flota sobre todo.
- **Borde de plano** (`{colors.plano-border}`): toda separación de 1px. Si una zona necesita un borde más grueso, el problema es de layout.
- **Tinta de texto** (`{colors.plano-text}`): texto de interfaz y valores.
- **Tinta suave** (`{colors.plano-text-soft}`): rótulos de sección, footer, texto secundario. Nunca por debajo de 11px.
- **Tinta de símbolo** (`{colors.plano-ink}`): trazo de los símbolos IEC dentro del lienzo, en un tono más apagado que el texto para que el dibujo no grite.
- **Grilla menor** (`{colors.plano-grid}`): la grilla de 3 unidades del lienzo; la mayor es un paso más clara y nunca se dibuja sobre el contenido.

### Named Rules

**La regla del acero y la tinta.** El azul y los neutros son de la interfaz; el verde, el ámbar y el rojo son del plano. Un control de chrome usa tinta de chrome aunque esté cerca de un cable.

**La regla del 1px.** Toda frontera entre zonas se resuelve primero con un borde de 1px. La sombra no reemplaza al borde ni lo duplica con más grosor.

## Typography

**Display Font:** Geist Variable (con system-ui de respaldo)
**Body Font:** Geist Variable
**Label/Mono Font:** monoespaciada del sistema (`ui-monospace, SFMono-Regular, Menlo, monospace`)

**Character:** una sola familia para toda la interfaz y una mono para lo que se mide. La escala es corta y apretada a propósito: entre 10px y 14px, porque la pantalla es de trabajo y cada píxel de alto es un registro menos visible.

### Hierarchy

- **Wordmark** (600, 13.5px, tracking -0.01em): sólo "Electro-Simulador" en el header. No hay titulares más grandes en toda la aplicación.
- **Menú** (500, 14px, 20px): disparadores del menubar y etiquetas de los ítems. Es el tamaño más grande de la interfaz y marca la jerarquía de navegación.
- **Botón** (500, 12.8px, 18.5px): etiquetas de botones y filas de la paleta.
- **Cuerpo** (400, 13px, 1.45): texto de interfaz, inspector y descripciones. Medida corta: los paneles tienen 232 y 268px de ancho, así que el texto se escribe para columnas de 40–50 caracteres.
- **Rótulo** (600, 10px, mayúsculas, tracking 0.5px): encabezados de sección tipo "INSERTAR COMPONENTE", "PROPIEDADES", "HOJAS".
- **Dato** (400, 11px, mono, tabular): conteos, designadores, códigos de componente, porcentaje de zoom, coordenadas. Todo número que se compara por columna va acá.

### Named Rules

**La regla de las dos voces.** Si el valor se mide o se compara, va en mono. Si se lee o se decide, va en Geist. No hay excepciones decorativas: un título no se pone mono para "parecer técnico".

**La regla del rótulo mudo.** Las mayúsculas están reservadas para rótulos de 10px. Ningún texto de lectura, botón o menú se escribe en mayúsculas.

## Layout

Marco fijo de tres bandas con dos columnas laterales. El documento nunca hace scroll: `html`/`body` están en `height: 100%` con `overflow: hidden`, y sólo los cuerpos de panel scrollean.

- **Header** 46px, siempre visible, con el menubar a la izquierda y las acciones frecuentes a la derecha. Es la única banda con navegación de producto.
- **Footer** 26px en mono de 11px: archivo abierto, conteos, estado de alimentación, avisos y zoom. Es el tablero de instrumentos, y por eso no tiene botones.
- **Paleta** 232px a la izquierda: grupos de símbolos plegables, favoritos y las hojas del documento al pie.
- **Inspector** 268px a la derecha: propiedades de la selección, red detectada y avisos.
- **Lienzo**: toma todo el resto y nunca se comprime por debajo de 640px.

El ritmo espacial es de 4px: 4 en el interior de un ítem de menú, 6 entre ícono y etiqueta, 8 entre acciones, 12 en el padding lateral de las bandas y en las filas de panel, 16 para separar bloques dentro del inspector. Las filas interactivas miden 28px (botón), 24px (disparador de menú) y 20px (insignia).

No hay breakpoints. Es una herramienta de escritorio con mouse y teclado; por debajo de ~1024px la composición se mantiene y el lienzo cede espacio, no se reordena a una vista móvil.

### Named Rules

**La regla del marco fijo.** Sólo el contenido de un panel scrollea. Si algo del shell necesita scroll, el panel está mal dimensionado.

## Elevation & Depth

El sistema usa **elevación sutil y direccional**: cada banda del chrome proyecta una sombra de 1px de offset con blur corto sobre el lienzo, en la dirección en la que el contenido se desliza por debajo. El borde de 1px sigue siendo el que separa; la sombra es la segunda pista, la que dice qué capa está arriba cuando el borde solo no alcanza.

Las sombras de chrome tienen dos capas (una de contacto, de 1–2px, y una difusa, de 8–12px) y nunca superan ese blur. En noche se refuerzan porque una sombra negra sobre azul-negro casi no se ve; en día se mantienen por debajo del 6% de opacidad.

Los menús, popovers y tooltips son la única elevación alta: `shadow-md` más un anillo de 1px de tinta al 10%. Es el único lugar del sistema donde la sombra es estructural y no una pista.

### Shadow Vocabulary

- **Banda inferior** (`0 1px 2px rgb(0 0 0 / 0.5), 0 4px 12px rgb(0 0 0 / 0.35)` en noche): header, proyectando hacia el lienzo.
- **Banda superior** (`0 -1px 2px …, 0 -4px 12px …`): footer, proyectando hacia arriba.
- **Panel izquierdo** (`1px 0 2px …, 4px 0 12px …`): la paleta, proyectando sobre el lienzo.
- **Panel derecho** (`-1px 0 2px …, -4px 0 12px …`): el inspector, proyectando sobre el lienzo.
- **Flotante** (`0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)` + anillo 1px): menús, popovers, tooltips.

En día las cuatro bandas usan `rgb(22 32 44 / 0.06)` y `rgb(22 32 44 / 0.05)`.

### Named Rules

**La regla del blur corto.** Ninguna sombra de chrome pasa de 12px de blur ni de 4px de offset. Una sombra ancha convierte el plano en una tarjeta flotante.

## Shapes

Radio base de 7px (`{rounded.lg}`), con pasos cortos por debajo: 4.2px para disparadores de menú, 5.6px para botones e ítems, 7px para paneles de menú e inputs. Nada del chrome supera los 7px salvo la insignia contadora, que es una píldora de 18.2px, y el tooltip, que acompaña la forma de lo que explica.

El lienzo es de esquinas rectas por definición: nada adentro del SVG se redondea, porque cada símbolo es una norma IEC, no una ilustración. El trazo de los símbolos escala con el zoom salvo la grilla, que usa `vector-effect: non-scaling-stroke` para no engordar cuando se acerca.

Los bordes son siempre de 1px y del mismo token de borde. No hay bordes de 2px, ni bordes de color en el lateral de un panel o de un aviso.

### Named Rules

**La regla de la esquina de herramienta.** Ningún control redondea más de 7px. Lo redondo comunica "consumidor"; acá todo tiene que comunicar instrumento.

## Components

### Buttons

- **Shape:** radio de 5.6px, alto de 28px, 1px de borde transparente que se vuelve visible sólo en `outline`.
- **Primary:** fondo `{colors.plano-primary}` con tinta `{colors.plano-primary-ink}`. Es la acción que guarda o confirma, y no hay más de una por pantalla. En hover baja a 80% de opacidad.
- **Ghost:** transparente, tinta de texto, fondo `muted` en hover. Es el default de las acciones de barra (deshacer, rehacer, simular).
- **Secundario:** fondo `{colors.plano-secondary}` con tinta clara; lo usa el estado activo de la lista de hojas.
- **Destructivo:** fondo de rojo al 10–20% con tinta de falla. Sólo borrar y borrar vértice.
- **Icon:** 28×28px, mismo radio, ícono de 14px. Nunca es la única forma de acceder a una acción: siempre hay un ítem de menú o un atajo equivalente.
- **Hover / Focus:** la transición es `transition-all` de 150ms; el foco pinta borde de anillo más un halo de 3px al 50%. En press, el botón baja 1px.

### Menubar

- **Style:** barra de 32px con borde de 1px, radio 7px y padding de 3px, sobre el header de 46px. Cuatro disparadores en texto: Archivo, Editar, Ver, Simulación.
- **Trigger:** 24px de alto, 14px/500, hover y abierto pintan fondo `muted`; radio 4.2px.
- **Content:** superficie de menú, ancho mínimo 144px, padding 4px, ítems de 28px con ícono de 16px a la izquierda y atajo en mono a la derecha. Los ítems deshabilitados bajan a 50% de opacidad en lugar de desaparecer.
- **Por qué menú y no barra de íconos:** el anti-referente es un CAD con cintas de iconos. Acá las acciones se nombran con palabras y el header conserva sólo las cinco que se usan sin mirar.

### Badges

- **Style:** píldora de 20px de alto, texto en mono de 10px, borde de 1px cuando el contador es informativo (código de componente) y sin borde cuando es de estado.
- **State:** `secondary` para simulación estable, `destructive` para avisos y oscilación. Nunca se usan como decoración de fila.

### Panels

- **Corner Style:** sin radio: son bandas del marco, no tarjetas.
- **Background:** `{colors.plano-card}` con borde de 1px del lado que da al lienzo.
- **Internal Padding:** 6px en los bordes del panel, 12px en las filas, separadores de 1px entre bloques.
- **Scroll:** 9px de ancho, pulgar del color del borde y pista transparente.

### Inputs / Selects

- **Style:** 32px de alto, radio 7px, borde de 1px, fondo transparente sobre el panel. El select compacto baja a 28px con radio 5.6px.
- **Focus:** borde de anillo con halo de 3px, nunca un glow.
- **Disabled / Invalid:** 50% de opacidad y borde destructivo respectivamente, con el mismo halo al 20%.

### Canvas (componente firma)

El lienzo es el sistema. Dibuja sobre una grilla de 3 unidades con ejes mayor y menor, y pinta cada registro del archivo con los tokens de tinta: el cuerpo del símbolo en `{colors.plano-ink}`, el cable en `{colors.plano-wire}`, la selección en `{colors.plano-select}` y el energizado en `{colors.plano-warn}`. La selección sube el grosor del trazo (0.26 → 0.34), nunca agrega halo. La marca de error es un trazo punteado con una pulsación de opacidad de 1.1s: es la única animación del sistema, y existe porque un aviso tiene que llamar.

## Do's and Don'ts

### Do:

- **Do** separar zonas con 1px de `{colors.plano-border}` antes de recurrir a una sombra.
- **Do** reservar el verde, el ámbar y el rojo para lo que pasa dentro del plano.
- **Do** usar mono de 11px con `tabular-nums` para cualquier cifra que se compare verticalmente.
- **Do** mantener el header en 46px y el footer en 26px: son las dos cotas que fijan la densidad.
- **Do** limitar el botón primario a una sola instancia visible por pantalla.
- **Do** nombrar las acciones con palabras en los menús, con el atajo en mono a la derecha.
- **Do** dejar el foco visible con borde de anillo más halo de 3px, en ambos temas.

### Don't:

- **Don't** convertir esto en un dashboard SaaS: sin tarjetas flotantes, sin métricas grandes, sin gradientes, sin KPIs. Los números viven en el footer.
- **Don't** pintar un control de chrome con la tinta del dibujo, ni un cable con el gris del chrome.
- **Don't** pasar de 7px de radio en un control, ni usar píldoras fuera de las insignias contadoras.
- **Don't** agregar sombras fuera de las cinco direccionales documentadas, ni subir el blur de 12px.
- **Don't** usar mayúsculas fuera de los rótulos de 10px.
- **Don't** introducir violeta, glassmorphism, blur decorativo ni transparencias fuera de los `color-mix` de estado del lienzo.
- **Don't** ocultar un ítem deshabilitado: se muestra al 50% para que la acción siga siendo descubrible.
