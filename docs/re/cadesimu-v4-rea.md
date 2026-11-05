# CADe_SIMU V4 — Análisis estático con REA

> Target: `E:\FP SISTEMAS\CADe_SIMU V4\CADe_SIMU.exe`
> Herramienta: `rea-agents@6.8.0` (comandos target-free `inspect-pe-*`).
> Fecha: 2026-11-04.

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

## Limitaciones de este análisis

- No hay Ghidra/IDA/Hopper configurado: **no se decompiló** el parser ni el solver. Los hallazgos son de tablas PE, strings y recursos.
- Las firmas de funciones internas y la lógica de simulación quedan como *desconocidas*.
- Los bitmaps no se extrajeron a archivos; se documentó su inventario e IDs.
- Las strings se guardaron completas en `docs/re/cade-resource-strings.txt` (1.248 únicas).

## Evidencia

- `docs/re/cade-resource-strings.txt` — cadenas únicas de las string tables.
- Evidencia REA (imports): `ev_2e30610ed6df2f56996cec9c865e85aa4de0d924e3a351dcbf080f7acc1b90e5`.
