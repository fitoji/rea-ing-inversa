# Futuro: catálogo de símbolos UNE reutilizable

Estado: **idea, no aprobada.** No hay trabajo comprometido. Se anota para no perderla.

## Qué sería

Un proyecto o herramienta aparte que produzca símbolos eléctricos normalizados
(UNE-EN 60617) como artefacto reutilizable: catálogo + validador + manifiesto,
consumible por este proyecto y por otros.

Entrada: especificación del componente (PNG de referencia, código, familia).
Salida: símbolo normalizado con geometría, bornes declarados y metadatos.

## Por qué NO se hace ahora

La app ya resuelve los símbolos de tres formas con un contrato único
(`app/src/symbols/`): dibujo propio (`families.ts` + `draw.ts`), EN 60617
importado (`qet.ts` + `qet-adapter.ts`) y hoja DXF (`dxf.ts` + `import-dxf.ts`),
seleccionables por `pack.ts` (`base` / `dxf` / `cadesimu`). Un proyecto aparte
hoy sería una cuarta fuente de verdad, no una mejora.

## Condición para retomarlo

Sólo si aparece la necesidad de un catálogo de símbolos **reutilizable fuera de
esta app** (varios proyectos, un CLI, un paquete publicable).

## Restricción técnica aprendida

No vectorizar automáticamente símbolos de esquema eléctrico. Son dibujos de
líneas ortogonales sobre rejilla con topología normalizada: un tracer devuelve
un blob de paths sin estructura, sin bornes y sin rejilla, arrastrando los
defectos de la imagen (borrosidad, grosores desparejos). El PNG sirve como
referencia para decidir geometría, nunca como insumo de build.

## Referencia existente

`data/simbolos-electricos-une-svg/SKILL.md` documenta las convenciones
normativas (terminales 1-3-5 / 2-4-6, auxiliares 11-12 / 13-14, bobinas A1-A2,
térmico 95-96 / 97-98, letras de designación Q/F/K/S) y un ejemplo verificado.
Si se retoma el catálogo, ese documento es el punto de partida para la tabla de
convenciones; su flujo de trabajo (redibujo manual asistido) no es el objetivo
del catálogo.
