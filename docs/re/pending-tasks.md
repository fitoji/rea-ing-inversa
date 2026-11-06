# Tareas pendientes derivadas del anÃ¡lisis REA de CADe_SIMU V4

> Fuente: `docs/re/cadesimu-v4-rea.md` (PE, Ghidra y observaciÃ³n en ejecuciÃ³n).
> Estado al 2026-11-05.

## Ya resuelto con los hallazgos de REA

- [x] **Layout extendido de registros**: geometrÃ­a pegada al Ãºltimo texto (`...#EV1*1*1*...`) en cÃ³digos `1052`, `10500..10550`.
- [x] **AlimentaciÃ³n desde el dibujo**: se eliminaron las marcas manuales Fase/Neutro; ahora salen de los sÃ­mbolos `3000/3001/3003/3004/3005/3006/3007` y, como respaldo, de los cables `4000`/`4010`.
- [x] **AnimaciÃ³n del motor**: rotor girando cuando el motor estÃ¡ energizado.
- [x] **Cables con tensiÃ³n**: `wire.live` animado y contactos que conmutan.
- [x] **Bitmaps y strings**: 280 PNG (12 primitivas D/U + UI: toolbars/splash) y 1.248 cadenas en `docs/re/`. Los bitmaps **no** son Ã­conos de componentes: CADe_SIMU dibuja los sÃ­mbolos con GDI.
- [x] **Mapeo extendido de componentes**: 8000..8015, 1000..1010, 10508/10509, 9007, 2006, 8017/8018 mapeados.
- [x] **Temporizadores (P1.1)**: soporte de contactos temporizados ON/OFF/ambos con reloj de 100 ms.
- [x] **Bobinas biestables (P1.2)**: latching con `initialEnergized` y reset.
- [x] **Protecciones toggleables**: abrir/disparar y rearmar con clic.

## P0 â€” Correctitud del parser y del solver

| ID | Tarea | Evidencia REA |
|---|---|---|
| P0.1 | âœ… Probar un componente extendido real: test sintÃ©tico de `10500` con 11 textos y 24 nÃºmeros. Pendiente: fixture real de `1052`/`10502..10509`/`10550`. | Layout extendido confirmado en el serializer. |
| P0.2 | Pendiente: Resolver `1073` (`0x431`): usa layout extendido pero no esta en el catalogo ni en `classify`. Busqueda de strings en el binario no devolvio nombre; requiere tabla codigo->nombre en Ghidra. | Cadena de formato extendido del binario. |
| P0.3 | Investigado: `10501` tiene 22 numeros de geometria, no 24. Los indices GEOMETRY siguen valiendo (x=8, y=9); el registro funciona. | Registro `*3*10501#...` de `inversion-giro-cej.cade`. |
| P0.4 | âœ… AlimentaciÃ³n por sÃ­mbolos: `3000`, `3001`, `3003` (L+N), `3004`, `3005`, `3006`, `3007` (con N/PE). Tests de inferencia y remapeo. | `3005` tiene nets 0,1,2,12; el motor usa 9,10,11,12. |
| P0.5 | ðŸŸ¡ IntegraciÃ³n de inversiÃ³n de giro: el circuito se arma con supply inferida, pero el fixture tiene cables sueltos y no energiza. | Fixture real y observaciÃ³n en CADe_SIMU. |
| P0.7 | ðŸŸ¡ Reparar `inversion-giro-cej.cade`: el parser ya recupera el registro KM2 que una cola de geometrÃ­a tapaba (`*6*5#`), pero quedan 28 extremos sueltos y el control no cierra. El dibujo estÃ¡ incompleto (falta cableado entre 3003 y la maniobra); el snap automÃ¡tico no alcanza. | DiagnÃ³stico con `app/scripts/fixture-orphans.ts`. |
| P0.8 | âœ… Generado `inversion-giro-mini.cade` con `make-inversion-demo.ts`: dos bobinas, enclavamiento propio y NC cruzado. Test end-to-end en `circuit.test.ts`. El fixture original sigue pendiente (P0.7). | P0.7 bloqueado por datos, no por el solver. |
| P0.6 | âœ… Actualizado `odd/tasks/simuelectro.md`: T4.3 cerrada y alimentaciÃ³n inferida documentada. | Este anÃ¡lisis. |

## P1 â€” SimulaciÃ³n que CADe_SIMU sÃ­ tiene

| ID | Tarea | Evidencia REA |
|---|---|---|
| P1.1 | âœ… Temporizadores ON/OFF/ambos con reloj de 100 ms y `timerReady`/`offReady`. | `7004..7015` contactos y `9004..9007` bobinas. |
| P1.2 | âœ… Bobinas biestables con latching y reset explÃ­cito. | `9001` Bobina biestable. |
| P1.3 | âœ… Variantes de motor mapeadas (1000..1010, 10508/10509) y verificadas como cargas. | CatÃ¡logo de motores. |
| P1.4 | âœ… Contactos auxiliares tÃ©rmicos y disparo de protecciones (toggleables). | `8017`, `8018`, `6000`..`6009`. |
| P1.5 | âœ… Selectores y finales de carrera accionables con clic. | `8012..8015`. |
| P1.6 | âœ… Verificado en vivo: motor y bobina `active`, auxiliar `closed`, STAR `pressed`, rotor girando. | `data-state` + CSS. |

## P2 â€” NeumÃ¡tica y PLC (backlog v2, ya fundamentado)

| ID | Tarea | Evidencia REA |
|---|---|---|
| P2.1 | âœ… SÃ­mbolos SVG para actuadores neumÃ¡ticos `10500`, `10502..10509`, `10550`. | `app/src/symbols/families.ts` (helper `actuator`). |
| P2.2 | Bloques de Entrada/Salida PLC (`Intercambio E/S`), mapeo de seÃ±ales. | `libnodave.dll` y menÃº `Intercambio E/S (PLC)`. |
| P2.3 | âœ… Documentado como no-goal de v1 en `docs/re/pending-tasks.md` (Grafcet/Ladder/LÃ³gica). | Barras del menÃº de CADe_SIMU. |

## P3 â€” Formato y producto

| ID | Tarea | Evidencia REA |
|---|---|---|
| P3.1 | âœ… El envelope completo se genera con `blankDocument()` (`SHEET_TITLE` con `$$$`, `&&&`, flags) al crear un proyecto nuevo. | `app/src/format/blank.ts`. |
| P3.2 | Leer/escribir `config.cfg` por posiciones fijas (opcional, compatibilidad). | `FUN_008782d0`/`FUN_00408ef0`. |
| P3.3 | âœ… Round-trip validado: nuestro `.cad` abre en CADe_SIMU V4 (Archivo â†’ Abrir). | ObservaciÃ³n en ejecuciÃ³n. |
| P3.4 | âœ… RegresiÃ³n de color de lÃ¡mparas `9008`/`9009` (suite lamp-color). | REA confirmÃ³ slot de color. |
| P3.5 | OK Mapa de modulos documentado en `docs/re/cadesimu-v4-rea.md`. | Strings `__FILE__` extraidos. |

## Notas

- La alimentaciÃ³n ya no se â€œindicaâ€ en la UI: CADe_SIMU usa **sÃ­mbolos de alimentaciÃ³n** y **tipos de cable** (`4000` fase, `4010` neutro/PE, `4009`/`4019` mando, `4001` uniÃ³n).
- El motor se sigue modelando como carga de dos terminales; P1.3/P0.4 son los que habilitan trifÃ¡sico real.
- Los cÃ³digos `10500..10550` son componentes neumÃ¡ticos/elÃ©ctricos reales del catÃ¡logo; `10501` estÃ¡ documentado como configuraciÃ³n de hoja.
- **Los bitmaps extraÃ­dos no sirven como modo de render de componentes**: son 12 primitivas D/U mÃ¡s tiras de iconos de toolbar y el splash. Un â€œmodo CADe_SIMUâ€ tendrÃ­a que ser un **tema visual SVG** (colores, grosores, tipografÃ­a), no el uso de esos PNG.
