#!/usr/bin/env node
/**
 * Genera `docs/componentes.md` (catálogo de componentes por familia) y los
 * dibujos de cada uno en `docs/img/componentes/<código>.svg`.
 *
 * Por qué existe: el catálogo (`src/symbols/catalog.ts`) dice qué códigos
 * existen y cómo se llaman, y las familias (`src/symbols/families.ts`) dicen
 * cómo se dibujan. Este script cruza las dos cosas para que la tabla se pueda
 * revisar sin abrir el código, y saca los SVG del mismo `shapes(w, h)` que usa
 * el lienzo: si el dibujo cambia en la app, cambia acá.
 *
 * No inventa datos: los códigos del catálogo sin dibujo propio se listan aparte
 * como fallback, y los dibujados que no están en el catálogo se explican con su
 * procedencia.
 *
 * Uso: node scripts/make-component-docs.ts
 */
import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { CATALOG } from '../src/symbols/catalog.ts';
import { shapesBounds } from '../src/symbols/draw.ts';
import {
  lineList,
  resolveSymbol,
  symbolList,
  type Label,
  type Shape,
  type SymbolDef,
  type SymbolGroup,
} from '../src/symbols/library.ts';

const HERE = dirname(fileURLToPath(import.meta.url));
const DOCS = join(HERE, '..', '..', 'docs');
const OUT = join(DOCS, 'componentes.md');
const IMG = join(DOCS, 'img', 'componentes');

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

// --- dibujo -----------------------------------------------------------------
// Mismos colores del tema día y mismos trazos que diagram.css: la miniatura es
// el símbolo del lienzo, no una ilustración aparte.

const INK = '#3d4a5c';
const INK_SOFT = '#6b7789';
const LABEL_INK = '#37455a';
const PIN_FILL = '#ffffff';
const PIN_STROKE = '#7d8b9c';
const CARD_FILL = '#f6f8fb';
const CARD_STROKE = '#d7dee8';

/** Unidades de margen alrededor de la caja del símbolo. */
const PAD = 1.5;
/** Multiplicador para que la miniatura se lea en una tabla. */
const SCALE = 3;
/** Caja por defecto para los símbolos que no declaran tamaño propio. */
const DEFAULT_BOX = 18;

const escapeXml = (text: string): string =>
  text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

const pathOf = (shape: Shape): string => {
  const stroke = shape.thin ? INK_SOFT : INK;
  const width = shape.thin ? '0.26' : '0.38';
  const fill = shape.fill ? `fill="${INK}"` : 'fill="none"';
  return `<path d="${shape.d}" stroke="${stroke}" stroke-width="${width}" ${fill} stroke-linecap="round" stroke-linejoin="round"/>`;
};

const textOf = (label: Label): string =>
  `<text x="${label.x}" y="${label.y}" font-family="ui-monospace, SFMono-Regular, Menlo, monospace" font-size="${label.size}" fill="${LABEL_INK}" text-anchor="${label.anchor ?? 'middle'}" dominant-baseline="middle">${escapeXml(label.value)}</text>`;

/** SVG autocontenido: sin CSS externo, para que se vea igual en cualquier visor. */
function glyphSvg(input: SymbolDef): string {
  // resolveSymbol aplica la geometría importada de EN 60617 (qet-adapter): si no,
  // la miniatura mostraría el dibujo a mano y no lo que pinta el lienzo.
  const sym = resolveSymbol(
    input.code,
    input.pins.map((pin) => pin.name),
  );
  const w = sym.size?.w ?? DEFAULT_BOX;
  const h = sym.size?.h ?? DEFAULT_BOX;
  const shapes = sym.shapes(w, h);
  // El dibujo puede desbordar la caja declarada (S2c): el accionamiento manual
  // va a la izquierda de x=0 y la punta de la cuchilla del primer polo tambien.
  // El viewBox se calcula sobre el bbox real para no recortarlos.
  const bounds = shapesBounds(shapes);
  const minX = Math.min(0, bounds.minX);
  const minY = Math.min(0, bounds.minY);
  const maxX = Math.max(w, bounds.maxX);
  const maxY = Math.max(h, bounds.maxY);
  const viewX = minX - PAD;
  const viewY = minY - PAD;
  const viewW = maxX - minX + PAD * 2;
  const viewH = maxY - minY + PAD * 2;
  const labels = sym.labels?.(w, h) ?? [];
  const pins = sym.pins.map(
    (pin) =>
      `<circle cx="${Math.round(pin.nx * w * 100) / 100}" cy="${Math.round(pin.ny * h * 100) / 100}" r="1.4" fill="${PIN_FILL}" stroke="${PIN_STROKE}" stroke-width="0.42"/>`,
  );
  return [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${Math.round(viewW * SCALE)}" height="${Math.round(viewH * SCALE)}" viewBox="${viewX} ${viewY} ${viewW} ${viewH}" role="img">`,
    `<title>${escapeXml(sym.name)}</title>`,
    `<rect x="${viewX}" y="${viewY}" width="${viewW}" height="${viewH}" rx="1.2" fill="${CARD_FILL}" stroke="${CARD_STROKE}" stroke-width="0.3"/>`,
    ...shapes.map(pathOf),
    ...pins,
    ...labels.map(textOf),
    '</svg>',
    '',
  ].join('\n');
}

// --- datos ------------------------------------------------------------------

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

// Las miniaturas se rehacen enteras: un código que desaparece no deja el SVG viejo.
rmSync(IMG, { recursive: true, force: true });
mkdirSync(IMG, { recursive: true });
for (const sym of drawn) writeFileSync(join(IMG, `${sym.code}.svg`), glyphSvg(sym));

// --- documento --------------------------------------------------------------

const out: string[] = [
  '# Componentes',
  '',
  'Catálogo de componentes eléctricos que ofrece la paleta del editor: cómo se dibuja cada uno, qué código tiene, cómo se llama y qué bornes expone.',
  '',
  '## De dónde sale esto',
  '',
  '- **Los dibujos** salen del mismo `shapes(w, h)` que usa el lienzo (`app/src/symbols/families.ts`) y se escriben como SVG sueltos en `docs/img/componentes/`. Si cambia el símbolo en la app, cambia la miniatura.',
  '- **Los códigos y nombres** vienen de `app/src/symbols/catalog.ts`, generado desde el menú real del binario CADe_SIMU con `pnpm catalog` (`app/scripts/make-catalog.ts`). No están adivinados por rango numérico.',
  '- **Los grupos y los nombres de familia** son los de la paleta (`app/src/ui/Palette.tsx`).',
  '- **Los bornes** son una convención IEC elegida al dibujar cada símbolo, no un dato que venga en el archivo: el formato los guarda por registro y acá se listan los que la app asigna por defecto. En la miniatura se ven como círculos.',
  '',
  `Totales: **${catalogCodes.length} códigos** en el catálogo generado, **${drawn.length} componentes dibujados**, **${fallback.length} códigos del catálogo caen al fallback** (un rectángulo con el código adentro).`,
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
    '| Dibujo | Código | Nombre | Designador | Bornes |',
    '| --- | --- | --- | --- | --- |',
  );
  for (const sym of list) {
    out.push(
      `| ![${cell(sym.name)}](img/componentes/${sym.code}.svg) | \`${sym.code}\` | ${cell(sym.name)} | ${designatorOf(sym.code)} | ${pinsOf(sym)} |`,
    );
  }
}

out.push(
  '',
  `## Códigos sin símbolo dedicado (${fallback.length})`,
  '',
  'No tienen dibujo propio: el lienzo los pinta con el fallback, un rectángulo con el código adentro y los bornes que declare el archivo. Siguen siendo válidos para abrir y guardar sin pérdida; lo que falta es el dibujo, así que no llevan miniatura acá.',
  '',
  'Lo mismo pasa con cualquier código que no esté en el catálogo, por ejemplo `20000`, que aparece en el sample PR1: `resolveSymbol()` lo dibuja como `Genérico 20000` en lugar de romper el render.',
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
  '1. Regenerar tabla y dibujos: `pnpm componentes` (desde la raíz o desde `app/`). El script borra `docs/img/componentes/` y la rehace, así no quedan SVG huérfanos.',
  '2. Si cambia el catálogo: correr `pnpm catalog` primero (necesita el binario en `data/`), después este script.',
  '3. Cuando se agrega el dibujo de un código que estaba en fallback, sale de esa sección y aparece en su familia con su miniatura.',
  '4. Un componente nuevo necesita dibujo y bornes en `src/symbols/families.ts` más su plantilla en `src/symbols/templates.ts`.',
  '',
);

writeFileSync(OUT, out.join('\n'));
console.log(`escrito docs/componentes.md + ${drawn.length} svg en docs/img/componentes/`);
console.log(
  `catálogo ${catalogCodes.length} · dibujados ${drawn.length} · fallback ${fallback.length} · sin catálogo ${uncatalogued.length}`,
);
