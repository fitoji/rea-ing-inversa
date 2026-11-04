# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Dos audiencias confirmadas, en este orden:

1. **Electricistas y técnicos** que ya usan CADe_SIMU en el taller, la planta o el mantenimiento industrial y necesitan abrir, corregir o simular esquemas de mando que ya existen.
2. **Estudiantes y docentes de electrotecnia**, que trabajan con los mismos esquemas de cátedra (arranque-paro-motor, inversión de giro) y hoy dependen de una herramienta cerrada que solo corre en Windows.

El trabajo es el mismo en ambos casos: partir de un archivo `.cade`/`.cad` heredado, entender el circuito de contactores que describe y modificarlo sin corromperlo.

## Product Purpose

Electro-Simulador es un simulador eléctrico que abre archivos de CADe_SIMU sin pérdida, los edita con una interacción de cables moderna y simula la lógica de contactores. Existe porque el incumbent es freeware cerrado escrito en MFC 4.2 sobre Visual C++ 6, solo Windows, y su edición de cables es arcaica.

El éxito de v1 es concreto: abrir, editar y simular `.cade`, e instalarse como app de escritorio en macOS y Windows.

## Positioning

Es el único reemplazo que combina tres cosas que el incumbent no da juntas: round-trip byte a byte del archivo original, edición de cables con arrastre y ruteo ortogonal automático, y simulación de contactores sobre código propio y modificable. La garantía de no corromper el archivo es lo que habilita a un profesional a tocar un esquema que ya usa en producción.

## Operating Context

- Archivos reales de terceros en texto plano Latin-1, sin cabecera de versión, con ids de registro estrictamente crecientes.
- Flujo de trabajo: abrir → inspeccionar → editar (componentes, cables, designadores) → simular → guardar/exportar.
- Los esquemas son dibujos técnicos IEC 60617 leídos de cerca: zoom, grilla, snap a bornes, designadores y numeración de cables.
- Uso previsto en escritorio (macOS y Windows) con teclado y mouse; la app corre hoy en navegador vía Vite.
- El producto y su interfaz son nativamente en español; no hay i18n ni cambio de idioma.

## Capabilities and Constraints

Confirmado y funcionando: parser/serializador `.cade`/`.cad` con round-trip byte a byte; modelo `Project → Sheet → Component → Pin → Wire`; editor con undo/redo, multi-selección, copiar/pegar; lienzo con zoom/pan/grilla/snap; paleta, inspector y modo día/noche persistido; pines derivados de los extremos de cable reales; validaciones de red con acciones de arreglo; netlist y solver de contactores con enclavamiento.

Restricciones y límites declarados:

- Ninguna operación puede inventar campos que el archivo no tenía; los registros desconocidos se preservan íntegros.
- La rotación es solo visual: el formato no expone el campo de orientación.
- El catálogo de códigos de componente está incompleto (270 códigos extraídos del binario; falta cerrar la tabla).
- 1 de 161 registros sigue mal delimitado en `inversion-giro-cej.cade`.
- El núcleo no tiene dependencias; corre sobre Node 24 con type stripping nativo. La UI es Vite + React + SVG.
- Fuera de alcance de v1: PLC Siemens/Modbus, Arduino, neumática, imágenes 3D y temporizadores.
- El empaquetado de escritorio (Tauri, macOS y Windows) está planificado, todavía no existe.

## Brand Commitments

- Nombre del producto: **Electro-Simulador**.
- Interfaz en español, sin plan de i18n para v1.
- CADe_SIMU es el anti-referente de interacción: se reimplementa, no se decompila ni se reconstruye. El repositorio no contiene código de CADe_SIMU.
- Símbolos IEC 60617 tomados de la colección de QElectroTech, licencia CC-BY 3.0; el crédito vive en `NOTICE-qet.md` y debe conservarse.
- El binario propietario en `data/` no se versiona ni se redistribuye.

## Evidence on Hand

- Tres archivos reales como fixtures: `test/fixtures/arranque-paro-motor-3f.cad`, `ej0def.cad`, `inversion-giro-cej.cade`.
- Suite de 136 tests sobre esos archivos, incluido el round-trip byte a byte.
- Gramática del formato documentada en `docs/cade-format.md`, separando lo verificado de lo hipotético.
- Plan de construcción por fases en `odd/tasks/simuelectro.md` con criterios de aceptación por spec.
- No hay testimonios, clientes, benchmarks, precios ni métricas de rendimiento: ningún trabajo futuro debe inventarlos.

## Product Principles

1. **El archivo manda.** Todo lo que se dibuja o se edita deriva del texto del archivo; nada se inventa y lo desconocido se conserva.
2. **No corromper es la función.** El round-trip sin pérdida es la condición que hace usable todo lo demás, no un detalle de implementación.
3. **El cable es el diferenciador.** La calidad del manejo de cables es el motivo por el que alguien cambia de herramienta.
4. **Declarar la incertidumbre.** Los registros raros, los códigos faltantes y los límites se reportan, no se esconden.
5. **Herramienta de taller, no demo.** Precisión, velocidad y previsibilidad por encima de la expresión visual.
