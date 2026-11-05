# CADe_SIMU V4 — Análisis con REA (estático, Ghidra y ejecución)

> Target: `E:\FP SISTEMAS\CADe_SIMU V4\CADe_SIMU.exe`
> Herramientas: `rea-agents@6.8.0` (PE target-free), Ghidra 12.1.4 vía REA MCP, observación en ejecución.
> Fecha: 2026-11-04/05. Clave shareware usada: `4962`.

## Identidad del artefacto

| Campo | Valor |
|---|---|
| SHA-256 | `a5208930140862dd89bd01b1ee981fe0443235ccc9bf0119e7b2aee8f2fe8e91` |
| Bytes | 46.833.717 |
| Formato | PE32 (32-bit), arquitectura x86 (`machine 0x14c`) |
| Import hash (pefile MD5) | `b060b957c6714f41ea6b34e21fc84bd8` |

## Stack técnico observado (imports)

8 DLLs, 546 funciones importadas:

| DLL | Rol |
|---|---|
| `MFC42D.DLL` / `MFCO42D.DLL` | MFC 4.2 (build **debug**), app de escritorio clásica |
| `MSVCRTD.dll` | CRT de Visual C++ 6 en modo debug |
| `libnodave.dll` | Comunicación Siemens S7 / PLC (ISO-on-TCP) |
| `KERNEL32/USER32/GDI32/SHELL32` | Win32 base + GDI (dibujo de esquemas) |

Confirmaciones útiles para la app:
- El dibujo es **GDI**, no Direct2D/WPF: modelo de coordenadas y primitivas simple.
- `libnodave.dll` explica la integración PLC/Entrada-Salida del catálogo (bloques E/S).
- Build **debug** de MFC: hay aserciones y textos de depuración dentro del binario.

## Recursos empaquetados (715 recursos, 1122 entradas)

| Tipo PE | Cantidad | Contenido |
|---|---|---|
| 2 — Bitmap | 316 | Iconos/símbolos de componentes (304 con ID 128–552, 12 con nombre) |
| 5 — Dialog | 160 | Diálogos de la UI |
| 6 — String Table | 153 | 1.473 cadenas (1.248 únicas), en EN/IT/ES |
| 241 — Custom | 65 | Metadatos/tablas propias de CADe_SIMU |
| 4 — Menu | 10 | Menús |
| 3 — Icon | 4 | Iconos de app |
| 14 — Group Icon | 3 | Grupos de iconos |
| 1, 9, 12, 16 | 1 c/u | Cursor, accelerator, font, versión |

### Bitmaps con nombre (formas base)

`ARCOD`, `ARCOU`, `ELIPSED`, `ELIPSEU`, `LINEAD`, `LINEAU`, `NUMEROD`, `NUMEROU`, `RELLENOD`, `RELLENOU`, `TEXTOD`, `TEXTOU`

Sufijos `D`/`U` = *down* / *up*: los símbolos son **pares de estado** (normal / activado). Esto valida el modelo de animación de estados de la app.

## Catálogo del menú (barras de componentes)

Detectadas en las string tables (ES):

- Barra de accionamientos
- Barra de actuadores neumáticos
- Barra de alimentaciones
- Barra de automáticos
- Barra de bobinas
- Barra de conexiones
- Barra de contactores
- Barra de contactos
- Barra de detectores
- Barra de fusibles
- Barra de motores
- Barra de potencia
- Barra Entrada/Salida (PLC)
- Barra Grafcet
- Barra Ladder
- Barra Lógica
- Barra de estado / herramientas

## Nombres de componentes relevantes (ES)

Contactores / contactos:
`Contactor`, `Contactor I/II/III/IIII`, `Contactor de estado sólido`, `Contactor inversor de estado sólido`, `Contacto NA`, `Contacto NC`, `Contacto NA+NC`, `Contacto CON`, `Contactos auxiliares`, `Contacto auxiliar relé térmico NA/NC/NA-NC`.

Bobinas / relés:
`Bobina`, `Bobina contactor, relé`, `Bobina biestable`, `Bobina biestable contactor, relé`, `Bobina electroválvula`, `Bobinas, Señalizaciones`.

Temporizados:
`Contacto temporizado a la conexión NA/NC/NA+NC/CON`, `Contacto temporizado a la deconexión NA/NC/NA+NC`, `Contacto temporizado a la conexión-deconexión NA/NC/NA+NC/CON`, `Connection timer`.

Protecciones / potencia:
`Automáticos, Diferenciales, Relés Térmicos, Disyuntores`, `Barra de fusibles`, `Barra de potencia`, `Motor paso a paso unipolar`, `Bipolar stepper motor`, `Air Motor`.

UI / edición:
`Zoom Previous/Normal/+/-/Windows/All`, `Grid`, `Redraw`, `Line`, `Rectangle`, `Ellipse`, `Colored Rectangle`, `Colored Ellipse`, `Fill color`, `Color`, `Text`, `Bookstore`, `Exchange E/S (PLC)`.

## Cómo aplicarlo a Electro-Simulador

1. **Pares de estado D/U**: modelar cada símbolo con dos variantes (reposo/activado) para la animación de simulación. El par ya existe en los recursos.
2. **Categorías como paleta**: agrupar la paleta de componentes por las barras detectadas (motores, bobinas, contactos, potencia, fusibles, automáticos, E/S, Grafcet, Ladder, lógica).
3. **Nombres ES**: usar los literales en español de las string tables para etiquetas de la paleta e inspector.
4. **E/S PLC**: la app no necesita `libnodave`, pero el concepto de bloque E/S (Entrada/Salida) está en el catálogo y puede mapearse a un modelo de señales externas.
5. **Temporizados**: el catálogo distingue ON-delay / OFF-delay / ON-OFF-delay con variantes NA/NC/NA+NC/CON; útil para extender el solver.

## Observación en ejecución (CADe_SIMU V4)

Ejecutado con la clave de acceso `4962` (shareware). Ventana MDI: documento `CADe_S1` por defecto.

- **Abrir archivos**: la app **no acepta un archivo como argumento de línea de comandos**; responde *"No se puede abrir el archivo"*. Hay que usar **Archivo → Abrir**. Con ese flujo, tanto `inversion-giro-cej.cade` como `arranque-paro-motor-3f.cad` **abren correctamente** (esto confirma compatibilidad de nuestro `.cad`).
- **Menú Modo**: `Edición`, `Simulación`, `Pausa`, `Paso a Paso`, `Simular Documento`, `Simular todos los documentos`, `Intercambio E/S (PLC)`.
- **Al entrar en Simulación** la barra de estado pasa de `Edición/Stop` a `Simulación/Run`.
- **Feedback visual**: los componentes energizados se redibujan en **rojo** y el motor muestra una **flecha de giro animada**. Los contactos conmutan su trazo; el estado se actualiza en el lienzo.
- **Zoom**: `Ver → Zoom Todo` ajusta la vista al circuito completo (necesario porque el encuadre inicial muestra solo una esquina de la hoja).
- **Clave de acceso**: el diálogo `CLAVE DE ACCESO` acepta `4962` y desbloquea guardado/opciones completas; sin ella el programa queda limitado.

Implicación para Electro-Simulador: el pipeline de simulación debe (1) cambiar de modo edición→simulación, (2) propagar estados por contactos/bobinas, y (3) pintar energía (rojo) y animar el motor. El `.cad` propio es aceptado por el CADe_SIMU original, así que el parser actual es un buen punto de partida.

## Decompilación con Ghidra (REA)

Target copiado a NTFS (`C:\...\Temp\opencode\CADe_SIMU.exe`, mismo SHA-256) porque E: es FAT32 y Ghidra solo admite NTFS.
Inventario: **4.961 funciones**, **7.079 strings**, image base `0x400000`.

### Serialización del archivo (confirmada en pseudocódigo)

Dos funciones de guardado (Save y Save As) en `FUN_004315f0` / `FUN_00432710`.

Estructura del archivo:

1. Cabecera literal: `CADe_SIMU`
2. Hasta **2000 registros** (array de códigos en documento `+0x2024`, flags en `+0x158a4`, conteo en `+0xbc`). Se omiten los de código `<= 0` salvo `-1`, y los que tienen flag `!= 0`.
3. Cadena `$$$`
4. Bloque de metadatos: `*%d*%d*%d*%d*%d*%d*%d*%d*%d*%3d*%3d&&&`
5. Bloque de textos: `*%-11s*%-11s*%-11s*%-11s*%-25s*%-25s*%-11s*%-11s*%-11s*%-21s`
6. Bloque de flags: `*%1d` × 14
7. Cierre: `***$$$&&&`

### Dos layouts de registro (clave para el parser)

| Layout | Códigos | Textos | Numéricos |
|---|---|---|---|
| Estándar | cualquiera salvo los de abajo | 10 | 23 |
| Extendido | `0x41c` (1052), `0x431` (1073), y rango `0x2904..0x2936` (10500..10550) | **11** | **24** |

Formato estándar:
```
*%d*%d#%s#%s#%s#%s#%s#%s#%s#%s#%s#%s*%d*...*%d#%s
```
Formato extendido:
```
*%d*%d#%s#%s#%s#%s#%s#%s#%s#%s#%s#%s#%s*%d*...*%d#%s
```

Esto explica por qué algunos registros no encajan en el layout de 11 campos: los códigos especiales llevan 11 textos y 24 numéricos. El proyecto ya documentaba la excepción; aquí queda el **conjunto exacto de códigos** que la disparan.

### `config.cfg`

`FUN_008782d0` escribe y `FUN_00408ef0` lee la configuración global:
```
CADe_SIMU*%1d*%1d*%1d*%1d*%1d*%1d*%1d*%1d*%3d*%3d*%0.4f*%1d*%1d*%3d*%3d*%1d*%1d*%4d$$$
```
El lector (`FUN_00408ef0`) parsea por **posiciones fijas de carácter** (`[0x0a]`, `[0x0c]`, `[0x0e]`, …) y valida que el prefijo sea literalmente `CADe_SIMU`. Conviene replicar ese contrato si la app lee `config.cfg`.

### Mapa de módulos (filtrado por `__FILE__` en aserciones MFC)

Los strings `E:\C++\CADe_SIMU\*.cpp` revelan la arquitectura del binario:

`CADe_SIMUDoc`, `CADe_SIMUView`, `Dibujo`, `Presenta`, `Simbolo`, `SIMBOLOS`, `Temporiza`, `Temporiza1`, `Pilotos`, `Editar_NA_NC`, `Editar_Cable`, `Editar_contador`, `Editar_DI_DO`, `Editar_IN`, `Editar_OUT`, `Editar_Neuma`, `Editar_MPP1`, `Editar_var1`, `Editar_var2`, `EDITAR_PLC`, `EDITAR_ARDUINO`, `Interruptor_horario`, `Numerico`, `Sim_Texto`, `Texto`, `Cajetin`, `Librerias`, `Clave`, `Configuracion`, `ACCION_GRAFCET`, `TRANSICION_GRAFCET`, `ARR_ELE`.

Esto da el mapa para futuras pasadas: la lógica de simulación vive en `Pilotos`, `Temporiza`, `Simbolo` y los `Editar_*`; el parser/serialización en `CADe_SIMUDoc`.

### Motor de presentación de componentes

`FUN_0087aef0` (36 KB, 8.269 instrucciones, 1.129 bloques básicos, 8 callees) referencia **373 strings** y **3.182 nombres**. Contiene los literales `"Contactor I..IIII"`, `"Bobina monoestable/biestable"`, `"Motor Dahalander"`, `"Motor rotor bobinado"`, `"Piloto verde/rojo/ambar"`, `"LED verde/rojo/ambar"`, `"Temporizador intermitente"`. Es la función que **presenta/etiqueta el catálogo de componentes**, no el solver eléctrico.

## Limitaciones de este análisis

- Ghidra 12.1.4 se usó para decompilar las funciones de guardado, configuración y documento. La lista completa de procedimientos es `FUN_xxxxxxxx` (sin PDB); los nombres de módulo provienen de `__FILE__`.
- **No se localizó todavía la función de carga/parseo** ni el solver de simulación; la sección de decompilación documenta lo confirmado.
- Los bitmaps sí se extrajeron a `docs/re/bitmaps/` (280 PNG).
- Las strings se guardaron completas en `docs/re/cade-resource-strings.txt` (1.248 únicas).

## Evidencia

- `docs/re/cade-resource-strings.txt` — cadenas únicas de las string tables.
- `docs/re/bitmaps/` — 280 PNG de símbolos (pares D/U).
- Evidencia REA (imports): `ev_2e30610ed6df2f56996cec9c865e85aa4de0d924e3a351dcbf080f7acc1b90e5`.

## Conclusiones y próximos pasos

Lo confirmado y aplicable ya:

1. **Parser**: añadir el layout extendido para los códigos `1052`, `1073` y `10500..10550` (11 textos + 24 numéricos). El resto usa 10 textos + 23 numéricos.
2. **Serializer**: replicar la estructura `CADe_SIMU` + registros + `$$$` + bloques finales + `***$$$&&&`, y la sección de `config.cfg` con posiciones fijas.
3. **Compatibilidad validada**: nuestro `.cad` abre en CADe_SIMU V4 vía *Archivo → Abrir* (no por argumento CLI).
4. **Simulación**: el modo cambia a `Simulación/Run`, la energía se pinta en rojo y el motor se anima; usar eso como referencia visual de la app.
5. **Catálogo**: los pares D/U ya están extraídos y los nombres ES están en `cade-resource-strings.txt`.

Pendiente para una próxima pasada:

- Localizar la función de **carga/parseo** (probablemente en `CADe_SIMUDoc`/`Presenta`) y el **solver** (`Pilotos`, `Temporiza`, `Simbolo`).
- Mapear el array de estado por registro (código, flags, energizado) para replicar la animación exacta.

## Estado del repositorio

- `docs/re/cadesimu-v4-rea.md` — este informe.
- `docs/re/cade-resource-strings.txt` — cadenas del binario.
- `docs/re/bitmaps/*.png` — símbolos extraídos.
- Commits: `e69c649` (análisis + bitmaps), `af6b41b` (decompilación), `477c8f9` (runtime), `5e2e99c` (presentador).
