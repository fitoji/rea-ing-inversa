# Tareas pendientes derivadas del análisis REA de CADe_SIMU V4

> Fuente: `docs/re/cadesimu-v4-rea.md` (PE, Ghidra y observación en ejecución).
> Estado al 2026-11-05.

## Ya resuelto con los hallazgos de REA

- [x] **Layout extendido de registros**: geometría pegada al último texto (`...#EV1*1*1*...`) en códigos `1052`, `10500..10550`.
- [x] **Alimentación desde el dibujo**: se eliminaron las marcas manuales Fase/Neutro; ahora salen de los símbolos `3000/3001/3003/3004/3005/3006/3007` y, como respaldo, de los cables `4000`/`4010`.
- [x] **Animación del motor**: rotor girando cuando el motor está energizado.
- [x] **Cables con tensión**: `wire.live` animado y contactos que conmutan.
- [x] **Bitmaps y strings**: 280 PNG (12 primitivas D/U + UI: toolbars/splash) y 1.248 cadenas en `docs/re/`. Los bitmaps **no** son íconos de componentes: CADe_SIMU dibuja los símbolos con GDI.
- [x] **Mapeo extendido de componentes**: 8000..8015, 1000..1010, 10508/10509, 9007, 2006, 8017/8018 mapeados.
- [x] **Temporizadores (P1.1)**: soporte de contactos temporizados ON/OFF/ambos con reloj de 100 ms.
- [x] **Bobinas biestables (P1.2)**: latching con `initialEnergized` y reset.
- [x] **Protecciones toggleables**: abrir/disparar y rearmar con clic.

## P0 — Correctitud del parser y del solver

| ID | Tarea | Evidencia REA |
|---|---|---|
| P0.1 | ✅ Probar un componente extendido real: test sintético de `10500` con 11 textos y 24 números. Pendiente: fixture real de `1052`/`10502..10509`/`10550`. | Layout extendido confirmado en el serializer. |
| P0.2 | Resolver `1073` (`0x431`): aparece en el layout extendido pero no está en el catálogo ni en `classify`. | Cadena de formato extendido del binario. |
| P0.3 | Investigar por qué `10501` tiene 22 números de geometría y no 24; confirmar índices `GEOMETRY` para el layout extendido. | Registro `*3*10501#...` de `inversion-giro-cej.cade`. |
| P0.4 | ✅ Alimentación por símbolos: `3000`, `3001`, `3003` (L+N), `3004`, `3005`, `3006`, `3007` (con N/PE). Tests de inferencia y remapeo. | `3005` tiene nets 0,1,2,12; el motor usa 9,10,11,12. |
| P0.5 | 🟡 Integración de inversión de giro: el circuito se arma con supply inferida, pero el fixture tiene cables sueltos y no energiza. | Fixture real y observación en CADe_SIMU. |
| P0.7 | 🟡 Reparar `inversion-giro-cej.cade`: el parser ya recupera el registro KM2 que una cola de geometría tapaba (`*6*5#`), pero quedan 28 extremos sueltos y el control no cierra. El dibujo está incompleto (falta cableado entre 3003 y la maniobra); el snap automático no alcanza. | Diagnóstico con `app/scripts/fixture-orphans.ts`. |
| P0.8 | ✅ Generado `inversion-giro-mini.cade` con `make-inversion-demo.ts`: dos bobinas, enclavamiento propio y NC cruzado. Test end-to-end en `circuit.test.ts`. El fixture original sigue pendiente (P0.7). | P0.7 bloqueado por datos, no por el solver. |
| P0.6 | Actualizar `odd/tasks/simuelectro.md`: T4.3 cerrada y decisión de alimentación reemplazada. | Este análisis. |

## P1 — Simulación que CADe_SIMU sí tiene

| ID | Tarea | Evidencia REA |
|---|---|---|
| P1.1 | ✅ Temporizadores ON/OFF/ambos con reloj de 100 ms y `timerReady`/`offReady`. | `7004..7015` contactos y `9004..9007` bobinas. |
| P1.2 | ✅ Bobinas biestables con latching y reset explícito. | `9001` Bobina biestable. |
| P1.3 | ✅ Variantes de motor mapeadas (1000..1010, 10508/10509) y verificadas como cargas. | Catálogo de motores. |
| P1.4 | ✅ Contactos auxiliares térmicos y disparo de protecciones (toggleables). | `8017`, `8018`, `6000`..`6009`. |
| P1.5 | ✅ Selectores y finales de carrera accionables con clic. | `8012..8015`. |
| P1.6 | ✅ Verificado en vivo: motor y bobina `active`, auxiliar `closed`, STAR `pressed`, rotor girando. | `data-state` + CSS. |

## P2 — Neumática y PLC (backlog v2, ya fundamentado)

| ID | Tarea | Evidencia REA |
|---|---|---|
| P2.1 | Símbolos y estado simple para actuadores neumáticos `10500..10509`, `10550`. | Catálogo: Actuador simple/doble efecto, pinza, ventosa, motor neumático. |
| P2.2 | Bloques de Entrada/Salida PLC (`Intercambio E/S`), mapeo de señales. | `libnodave.dll` y menú `Intercambio E/S (PLC)`. |
| P2.3 | Grafcet / Ladder / Lógica: documentar como no-goal de v1. | Barras del menú de CADe_SIMU. |

## P3 — Formato y producto

| ID | Tarea | Evidencia REA |
|---|---|---|
| P3.1 | ✅ El envelope completo se genera con `blankDocument()` (`SHEET_TITLE` con `$$$`, `&&&`, flags) al crear un proyecto nuevo. | `app/src/format/blank.ts`. |
| P3.2 | Leer/escribir `config.cfg` por posiciones fijas (opcional, compatibilidad). | `FUN_008782d0`/`FUN_00408ef0`. |
| P3.3 | Probar abrir/guardar con CADe_SIMU original tras el fix extendido (round-trip real). | Observación: `Archivo → Abrir` acepta nuestro `.cad`. |
| P3.4 | Regresión de color de lámparas `9008`/`9009`. | REA confirmó slot de color. |
| P3.5 | Documentar el mapa de módulos del binario para futuras pasadas (Pilotos/Temporiza/Simbolo). | Strings `__FILE__` extraídos. |

## Notas

- La alimentación ya no se “indica” en la UI: CADe_SIMU usa **símbolos de alimentación** y **tipos de cable** (`4000` fase, `4010` neutro/PE, `4009`/`4019` mando, `4001` unión).
- El motor se sigue modelando como carga de dos terminales; P1.3/P0.4 son los que habilitan trifásico real.
- Los códigos `10500..10550` son componentes neumáticos/eléctricos reales del catálogo; `10501` está documentado como configuración de hoja.
- **Los bitmaps extraídos no sirven como modo de render de componentes**: son 12 primitivas D/U más tiras de iconos de toolbar y el splash. Un “modo CADe_SIMU” tendría que ser un **tema visual SVG** (colores, grosores, tipografía), no el uso de esos PNG.
