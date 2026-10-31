import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parse } from '../src/format/cade.ts';
import { buildProject, boxOf } from '../src/model/project.ts';
import { resolveSymbol, symbolList, fallbackSymbol } from '../src/symbols/library.ts';
import { TEMPLATES, TEMPLATE_CODES } from '../src/symbols/templates.ts';

const FIXTURES = join(dirname(fileURLToPath(import.meta.url)), 'fixtures');

function allRecords() {
  return readdirSync(FIXTURES)
    .filter((f) => /\.(cade|cad)$/i.test(f))
    .flatMap((name) => {
      const text = readFileSync(join(FIXTURES, name), 'latin1');
      return buildProject(parse(text)).records.map((rec) => ({ rec, name }));
    });
}

test('todo componente de los fixtures tiene símbolo o cae al fallback sin lanzar', () => {
  for (const { rec, name } of allRecords()) {
    if (rec.kind !== 'component') continue;
    const box = boxOf(rec);
    if (!box) continue;
    const sym = resolveSymbol(rec.code, rec.pins);
    assert.ok(sym, `${name}: sin símbolo para ${rec.code}`);
    const shapes = sym.shapes(box.width, box.height);
    assert.ok(shapes.length > 0, `${name}: ${rec.code} no dibuja nada`);
    for (const s of shapes) {
      assert.ok(s.d.length > 0, `${name}: ${rec.code} path vacío`);
      assert.equal(/NaN|Infinity|undefined/.test(s.d), false, `${name}: ${rec.code} path inválido: ${s.d}`);
    }
    sym.labels?.(box.width, box.height).forEach((l) => {
      assert.equal(Number.isFinite(l.x) && Number.isFinite(l.y) && Number.isFinite(l.size), true, `${name}: ${rec.code} label inválida`);
    });
  }
});

test('todo cable de los fixtures tiene puntos finitos', () => {
  for (const { rec, name } of allRecords()) {
    if (rec.kind !== 'connection') continue;
    for (const n of rec.geometry.slice(8, 12)) {
      assert.equal(Number.isFinite(n), true, `${name}: cable ${rec.id} con coordenada inválida`);
    }
  }
});

test('los símbolos declarados tienen bornes con posición dentro de la caja', () => {
  for (const sym of symbolList()) {
    // Una alimentación no declara bornes: el registro real tampoco los tiene.
    if (sym.pins.length === 0) {
      assert.equal(sym.group, 'alimentacion', `${sym.code} (${sym.name}) no declara bornes`);
      continue;
    }
    for (const p of sym.pins) {
      assert.ok(p.nx >= 0 && p.nx <= 1, `${sym.code}: nx fuera de rango`);
      assert.ok(p.ny >= 0 && p.ny <= 1, `${sym.code}: ny fuera de rango`);
      assert.notEqual(p.name, '', `${sym.code}: borne sin nombre`);
    }
  }
});

test('el fallback conserva los nombres de borne del archivo', () => {
  const sym = fallbackSymbol(99999, ['A', 'B', 'C', 'D']);
  assert.equal(sym.code, 99999);
  assert.equal(sym.pins.length, 4);
  assert.deepEqual(sym.pins.map((p) => p.name), ['A', 'B', 'C', 'D']);
});

test('cada plantilla generada es un registro de componente reparseable', () => {
  assert.ok(TEMPLATE_CODES.length >= 20, 'esperaba al menos 20 códigos con plantilla');
  for (const code of TEMPLATE_CODES) {
    const template = TEMPLATES[code]!;
    const project = buildProject(parse(template.raw));
    const first = project.records[0]!;
    assert.ok(template.raw.startsWith(first.raw), `plantilla ${code}: el registro no arranca en el raw`);
    assert.equal(first.code, code);
    assert.equal(first.kind, 'component');
  }
});

test('la cola de la geometría no se confunde con una cabecera de registro', () => {
  // Hallazgo real: el registro del motor termina en `*15*16#`, que calza con el
  // patrón `*<id>*<código>#`. Antes se desambiguaba sólo por el orden global de
  // ids, así que un documento de dos registros lo partía en tres. Un registro
  // real tiene al menos dos '#', y eso alcanza para descartar la cola.
  const raw = TEMPLATES[1000]!.raw;
  assert.match(raw, /\*15\*16#$/);

  const parsed = parse(raw);
  assert.equal(parsed.records.length, 1);
  assert.equal(parsed.records[0]!.raw, raw);
});

test('las plantillas cubren todos los códigos con símbolo dedicado', () => {
  const dedicated = [1000, 2001, 3000, 3001, 3005, 6001, 6002, 6003, 6007, 6009, 7000, 7001, 8000, 8001, 8012, 8013, 8016, 8017, 8018, 9000, 9003];
  for (const code of dedicated) {
    assert.ok(TEMPLATE_CODES.includes(code), `falta plantilla para ${code}`);
  }
});
