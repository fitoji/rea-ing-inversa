#!/usr/bin/env node
/**
 * Genera `docs/componentes.md`: el catálogo de componentes por familia, con
 * código, nombre, designador y bornes.
 *
 * El catálogo (`src/symbols/catalog.ts`) dice qué códigos existen y cómo se
 * llaman; las familias (`src/symbols/families.ts`) dicen cómo se dibujan y qué
 * bornes usan. Este script cruza las dos cosas para que la tabla se pueda
 * revisar sin abrir el código.
 *
 * No inventa datos: los 59 códigos del catálogo sin dibujo propio se listan
 * aparte como fallback, y los 3 dibujados que no están en el catálogo se
 * explican con nombre y procedencia.
 *
 * Uso: node scripts/make-component-docs.ts
 */
import { writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { CATALOG } from '../src/symbols/catalog.ts';
import { lineList, symbolList, type SymbolDef, type SymbolGroup } from '../src/symbols/library.ts';

const HERE = dirname(fileURLToPath(import.meta.url));
const OUT = join(HERE, '..', '..', 'docs', 'componentes.md');

/** Nombres visibles de cada familia: los mismos que usa la paleta. */
const LABEL: Record<SymbolGroup, string> = {
  alimentacion: 'Alimentación',
  motor: 'Motores',
  potencia: 'Potencia',
  proteccion: 'Protección',
  mando: 'Mando',
  senalizacion: 'Señalización y pulsadores',
  sensor: 'Sensores',
  linea: 'Líneas y cables',
  carga: 'Cargas',
  borne: 'Borneras',
  otro: 'Otros',
};

const ORDER: SymbolGroup[] = [
  'alimentacion',
  'motor',
  'potencia',
  'proteccion',
  'mando',
  'senalizacion',
  'sensor',
  'linea',
  'carga',
  'borne',
  'otro',
];

const cell = (text: string): string => text.replace(/\|/g, '\\|');
const designatorOf = (code: number): string => {
  const designator = CATALOG[code]?.designator;
  return designator ? `\`${designator}\`` : '—';
};
const pinsOf = (sym: SymbolDef): string =>
  sym.pins.length === 0 ? '—' : sym.pins.map((pin) => pin.name || '·').join(' · ');

const drawn = [...symbolList(), ...lineList()];
const byGroup = new Map<SymbolGroup, SymbolDef[]>();
for (const sym of drawn) {
  const list = byGroup.get(sym.group) ?? [];
  list.push(sym);
  byGroup.set(sym.group, list);
}

const catalogCodes = Object.keys(CATALOG)
  .map(Number)
  .sort((a, b) => a - b);
const drawnCodes = new Set(drawn.map((sym) => sym.code));
const fallback = catalogCodes.filter((code) => !drawnCodes.has(code));
const uncatalogued = drawn.filter((sym) => !(sym.code in CATALOG));

const out: string[] = [
  '# Componentes',
  '',
  'Catálogo de componentes eléctricos que ofrece la paleta del editor: qué códigos existen, cómo se llaman y qué bornes exponen.',
  '',
  '## De dónde sale esto',
  '',
  '- **Los códigos y nombres** vienen de `app/src/symbols/catalog.ts`, generado desde el menú real del binario CADe_SIMU con `pnpm catalog` (`app/scripts/make-catalog.ts`). No están adivinados por rango numérico.',
  '- **Los grupos y los dibujos** viven en `app/src/symbols/families.ts`; los nombres visibles de cada familia y su orden, en `app/src/ui/Palette.tsx`.',
  '- **Los bornes** de cada componente son una convención IEC elegida al dibujarlo, no un dato que venga en el archivo: el formato los guarda por registro y acá se listan los que la app asigna por defecto.',
  '',
  `Totales: **${catalogCodes.length} códigos** en el catálogo generado, **${drawn.length} componentes** en la paleta, **${fallback.length} códigos del catálogo caen al fallback** (un rectángulo con el código adentro).`,
  '',
  ...(uncatalogued.length > 0
    ? [
        `Hay **${uncatalogued.length} componentes dibujados que no figuran en el catálogo**: ${uncatalogued
          .map((sym) => `\`${sym.code}\` (${sym.name})`)
          .join(', ')}. No salen del menú del CAD pero aparecen en archivos reales, así que su plantilla se generó desde los fixtures y el dibujo se escribió a mano. Por eso no tienen designador de catálogo.`,
        '',
      ]
    : []),
  'El designador de la tabla es el prefijo con el que el CAD nombra el componente nuevo (`-M`, `-Q`…); `—` significa que el catálogo no lo define.',
  '',
  `De los ${catalogCodes.length} códigos, **${catalogCodes.filter((code) => !CATALOG[code]?.designator).length} no traen designador** en el catálogo: el menú del CAD no sugiere prefijo para esos componentes (alimentaciones, sensores y varios más).`,
  '',
  '## Convención de bornes',
  '',
  '- **Aparatos de potencia:** 1-3-5 arriba, 2-4-6 abajo.',
  '- **Contactos auxiliares:** 11-12 (NC), 13-14 (NA), 11-12-14 (conmutado).',
  '- **Bobinas y temporizadores:** A1-A2.',
  '- **Sensores de 2 hilos:** 1-2; de 3 hilos: `+`, `O`, `-`.',
];

for (const group of ORDER) {
  const list = byGroup.get(group);
  if (!list || list.length === 0) continue;
  list.sort((a, b) => a.code - b.code);
  out.push(
    '',
    `## ${LABEL[group]} (${list.length})`,
    '',
    '| Código | Nombre | Designador | Bornes |',
    '| --- | --- | --- | --- |',
  );
  for (const sym of list) {
    out.push(`| \`${sym.code}\` | ${cell(sym.name)} | ${designatorOf(sym.code)} | ${pinsOf(sym)} |`);
  }
}

out.push(
  '',
  `## Códigos sin símbolo dedicado (${fallback.length})`,
  '',
  'Se dibujan con el fallback: un rectángulo con el código adentro y los bornes que declare el archivo. Siguen siendo válidos para abrir y guardar sin pérdida; lo que falta es el dibujo.',
  '',
  '| Código | Nombre | Designador |',
  '| --- | --- | --- |',
);
for (const code of fallback) {
  out.push(`| \`${code}\` | ${cell(CATALOG[code]?.name ?? 'sin nombre')} | ${designatorOf(code)} |`);
}

out.push(
  '',
  '## Cómo mantenerlo',
  '',
  '1. Regenerar la tabla: `pnpm componentes` (desde la raíz o desde `app/`).',
  '2. Si cambia el catálogo: correr `pnpm catalog` primero (necesita el binario en `data/`), después este script.',
  '3. Cuando se agrega el dibujo de un código que estaba en fallback, sale de esa sección y aparece en su familia sin tocar nada más.',
  '4. Un componente nuevo necesita dibujo y bornes en `src/symbols/families.ts` más su plantilla en `src/symbols/templates.ts`.',
  '',
);

writeFileSync(OUT, out.join('\n'));
console.log(`escrito docs/componentes.md`);
console.log(
  `catálogo ${catalogCodes.length} · paleta ${drawn.length} · fallback ${fallback.length} · sin catálogo ${uncatalogued.length}`,
);
