/**
 * Catálogo de componentes, sintetizador de plantillas y menú completo.
 *
 * El invariante que importa: todo lo que la paleta muestra se puede insertar, y
 * lo que se inserta vuelve a parsearse con el mismo código y los mismos bornes.
 */
import { test } from 'node:test';
import { strict as assert } from 'node:assert';

import { parse } from '../src/format/cade.ts';
import { buildProject } from '../src/model/project.ts';
import { CATALOG, CATALOG_CODES } from '../src/symbols/catalog.ts';
import { TEMPLATES, TEMPLATE_CODES } from '../src/symbols/templates.ts';
import { symbolList, type SymbolDef } from '../src/symbols/library.ts';
import { synthesize, templateForPlacement } from '../src/symbols/place.ts';

/** Reconstruye un registro real como si lo hubiera sintetizado `synthesize`. */
function roundTrip(code: number): string {
  const raw = TEMPLATES[code]!.raw;
  const slots = raw.split('#');
  const pins = slots.slice(3, 10).filter((s) => s !== '');
  const geometry = slots[10]!
    .split('*')
    .filter((s) => s !== '')
    .map(Number);
  const sym: SymbolDef = {
    code,
    name: 'test',
    group: 'otro',
    pins: pins.map((name) => ({ name, nx: 0, ny: 0.5, side: 'left' })),
    shapes: () => [],
  };
  return synthesize(sym, {
    baseCode: code,
    designator: slots[1]!,
    size: { w: geometry[14]!, h: geometry[15]! },
  })!;
}

/** El id lo asigna el editor al insertar; acá sólo comparamos la forma. */
const withoutId = (raw: string): string => raw.replace(/^\*\d+\*/, '*0*');

test('el sintetizador reproduce cada plantilla real byte por byte', () => {
  for (const code of TEMPLATE_CODES) {
    assert.equal(withoutId(roundTrip(code)), withoutId(TEMPLATES[code]!.raw), `código ${code}`);
  }
});

test('todo símbolo del catálogo se puede insertar', () => {
  for (const sym of symbolList()) {
    assert.ok(templateForPlacement(sym.code), `${sym.code} (${sym.name}) sin plantilla`);
  }
});

test('lo que se inserta re-parsea con el mismo código y bornes', () => {
  for (const sym of symbolList()) {
    const raw = templateForPlacement(sym.code)!;
    const components = buildProject(parse(raw)).records.filter((r) => r.kind === 'component');
    assert.equal(components.length, 1, `código ${sym.code} no produce exactamente un componente`);
    const rec = components[0]!;
    assert.equal(rec.code, sym.code);
    assert.deepEqual(rec.pins, sym.pins.map((p) => p.name), `bornes de ${sym.code}`);
  }
});

test('el catálogo no tiene códigos repetidos ni nombres vacíos', () => {
  assert.equal(new Set(CATALOG_CODES).size, CATALOG_CODES.length);
  for (const code of CATALOG_CODES) {
    const entry = CATALOG[code]!;
    assert.ok(entry.name.trim().length > 0, `código ${code} sin nombre`);
    assert.ok(Number.isInteger(code) && code > 0);
  }
});

test('los códigos con plantilla real no pierden sus bytes', () => {
  for (const code of TEMPLATE_CODES) {
    assert.equal(templateForPlacement(code), TEMPLATES[code]!.raw);
  }
});

test('el catálogo cubre más componentes que los fixtures', () => {
  assert.ok(CATALOG_CODES.length > TEMPLATE_CODES.length * 4, 'el catálogo debería superar ampliamente a los fixtures');
});
