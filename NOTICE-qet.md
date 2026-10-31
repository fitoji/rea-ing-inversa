# Atribución — símbolos EN 60617

`app/src/symbols/qet.ts` es un archivo generado por `app/scripts/import-qet.ts`.
Su geometría proviene de la **colección de elementos de QElectroTech**, que está
bajo licencia **Creative Commons Attribution 3.0 (CC-BY 3.0)**.

- Proyecto: QElectroTech — https://qelectrotech.org
- Colección de elementos: `elements/10_electric/91_en_60617` (912 elementos
  basados en la norma EN 60617, el equivalente europeo de IEC 60617)
- Licencia: https://creativecommons.org/licenses/by/3.0/
- Texto original de la licencia incluido con la aplicación:
  `QElectroTech.app/Contents/Resources/licenses/QET-Elements.LICENSE`

## Qué se usó y cómo

No se copia la colección: el script toma **elementos puntuales**, extrae su
geometría (líneas, rectángulos, círculos, arcos y polígonos), la muestrea a
polilíneas normalizadas 0..1 y la reescribe en el formato propio del proyecto.
La lista de elementos usados está en el mapa `MAP` de `scripts/import-qet.ts`, y
cada símbolo generado conserva el campo `source` con la ruta original.

Los cambios son de formato (conversión geométrica), no de contenido gráfico.

## Condiciones

CC-BY 3.0 exige atribución: esta nota y la mención en el README cumplen ese rol.
Al agregar nuevos elementos al mapa, la atribución ya está cubierta por este
archivo; si se incorporaran elementos de otra colección, hay que agregarla acá.
