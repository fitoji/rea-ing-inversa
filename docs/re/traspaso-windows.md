# Traspaso Windows → macOS: qué preservar y qué queda de REA

> Fecha: 2026-11-06 · Estado del análisis REA: `docs/re/cadesimu-v4-rea.md` (2026-11-04/05).
> Motivo: la máquina Windows se deja de usar como entorno principal.

## Lo que ya viaja con el repo

Todo esto está commiteado y se clona en cualquier máquina:

- `docs/cade-format.md` — gramática del formato, con lo verificado separado de lo hipotético.
- `docs/re/cadesimu-v4-rea.md` — identidad del artefacto (SHA-256, PE32, imports), recursos,
  catálogo del menú, funciones del serializer.
- `docs/re/pending-tasks.md` — tareas derivadas del análisis.
- `docs/re/componentes-completo.md` — tabla extendida de componentes.
- `docs/re/cade-resource-strings.txt` — 1.248 cadenas únicas de la string table.
- `docs/re/bitmaps/` — 280 PNG extraídos (12 primitivas de dibujo + recursos de UI).
- `docs/componentes.md` + `docs/img/componentes/` — catálogo renderizado desde la app.
- `docs/engram/rea-ing-inversa.json` — export de la memoria del proyecto.

## Lo que NO viaja con el repo y vive solo en esta máquina

| Activo | Ubicación | Estado |
| --- | --- | --- |
| `CADe_SIMU.exe` (44,66 MB) | `E:\FP SISTEMAS\CADe_SIMU V4\` | fuera del repo por licencia (`.gitignore` → `data/`) |
| DLLs del runtime (`libnodave`, `MFC42D`, `MFCO42D`, `MSVCRTD`) | misma carpeta | ídem |
| `CADe_S1` (12.940 B) | misma carpeta | parece el origen de `inversion-giro-cej.cade` |
| Instalación de Ghidra 12.1.4 + JDK 21 | `C:\Users\fitoj\AppData\Local\Programs\` | herramienta, reinstalable |
| Proyecto Ghidra (`.gpr`) | **no encontrado** | el análisis se hizo por MCP sin proyecto persistido |

Consecuencia: al abrir el binario en otra máquina hay que **reimportar y reanalizar** el PE. No es
caro (un PE de 45 MB), pero significa que cualquier función que se quiera volver a mirar cuesta un
import, no un clic.

## Checklist antes de apagar Windows

1. **Copiar `E:\FP SISTEMAS\CADe_SIMU V4\` completo** a un disco externo o a la Mac. Es el único
   insumo que no se puede regenerar. Sin el binario no hay REA posible, en ninguna plataforma.
2. Copiar cualquier `.cade` / `.cad` / `CADe_S1` suelto que haya en el disco y no esté en
   `app/test/fixtures/`. Ver «lo que falta no es REA» más abajo: los archivos reales valen más que
   otra pasada de descompilación.
3. **No re-exportar Engram a ciegas.** Ver la advertencia de la sección siguiente: el JSON commiteado
   tiene más historia que la base actual. Respaldarlo antes de tocarlo.
4. Anotar la clave shareware usada (`4962`) — está en `cadesimu-v4-rea.md`, pero conviene que no se
   pierda si se reinstala CADe_SIMU en otra máquina para observación en ejecución.

## ⚠️ Advertencia: el export de Engram es más rico que la base actual

Verificado el 2026-11-06:

| | Observaciones | Sesiones |
| --- | --- | --- |
| `docs/engram/rea-ing-inversa.json` (commiteado) | **56** | 7 |
| Base actual (`~/.engram/engram.db`) | **28** | 2 |

Faltan 32 observaciones, con ids `1641..1784`, creadas entre 2026-10-28 y 2026-11-04. No están
borradas lógicamente (`deleted_at` nulo en todas): no existen en el store. La base tiene 29 filas en
total, contando otro proyecto.

**El comando de export reescribe el archivo completo.** Ejecutar `engram export` hoy destruye la
única copia de esas 32 observaciones. El JSON commiteado es el archivo, no la base.

Antes de migrar: copiar ese JSON fuera del repo. `engram import <archivo>` es la vía de
recuperación; falta verificar si deduplica por `sync_id` o duplica las 24 observaciones que sí
siguen en la base.

## ¿Hace falta otra pasada de REA?

**No, no hace falta una pasada completa.** La descompilación ya respondió las preguntas de formato:
layout de registros, geometría, alimentación por símbolos, tipos de cable, temporizadores, bobinas
biestables, protecciones y el catálogo del menú. El parser y el writer se sostienen sobre eso y el
round-trip está validado contra CADe_SIMU real.

Queda **una** tarea que sí depende del binario:

| ID | Tarea | Coste |
| --- | --- | --- |
| P0.2 | Resolver `1073` (`0x431`): usa layout extendido pero no está en el catálogo ni en `classify`. La búsqueda de strings no devolvió nombre; requiere la tabla código→nombre en Ghidra. | bajo — una función y una tabla |
| T0.2 | Cerrar la tabla código→nombre→bornes del array de structs. Hoy hay 270 códigos de catálogo, 215 dibujados y **59 en fallback**. | medio |

Las dos son la misma búsqueda: **la tabla de componentes del binario**. Si se hace una sola sesión
de REA más, que sea esa, y hacela **antes de migrar**: parada la máquina, el mismo trabajo cuesta
instalar Ghidra + JDK + REA, reimportar el PE y reubicar la tabla.

## Lo que falta NO es REA

Estas tareas están abiertas porque faltan **datos**, no descompilación. Ninguna pasada de REA las
resuelve:

- **P0.1** — falta un fixture real con layout extendido (`1052`, `10502..10509`, `10550`). El layout
  está confirmado sintéticamente.
- **P0.7** — `inversion-giro-cej.cade` está incompleto como dibujo (28 extremos sueltos, falta
  cableado entre `3003` y la maniobra). Es un problema del archivo, no del parser.
- **Neumática** — los símbolos `10500..10550` ya están dibujados y el layout entendido; falta un
  archivo real que los use para verificar de punta a punta.

Si aparece un `.cade` de cátedra o de taller con componentes neumáticos o de layout extendido, vale
más que cualquier hora de Ghidra.

## Cómo retomar en macOS

1. Copiar el binario (checklist, punto 1).
2. Instalar Ghidra + JDK; `rea-agents` es un paquete npm y no depende del SO.
3. Reimportar el PE. No hay `.gpr` que reutilizar.
4. Antes de tocar Ghidra, releer `docs/re/cadesimu-v4-rea.md`: la mitad del trabajo ya está hecha y
   está escrito dónde mirar.
