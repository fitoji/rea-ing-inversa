import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parse, serialize, codeInventory, MAGIC } from '../src/format/cade.ts';

const FIXTURES = join(dirname(fileURLToPath(import.meta.url)), 'fixtures');

function fixtures(): string[] {
  return readdirSync(FIXTURES).filter((f) => /\.(cade|cad)$/i.test(f));
}

for (const name of fixtures()) {
  const text = readFileSync(join(FIXTURES, name), 'latin1');

  test(`${name}: round-trip byte a byte`, () => {
    assert.equal(serialize(parse(text)), text);
  });

  test(`${name}: magic detectado y primer registro anclado al magic`, () => {
    const doc = parse(text);
    assert.equal(doc.hasMagic, true);
    assert.equal(doc.prefix, '', 'el primer registro debe empezar donde termina el magic');
    assert.equal(doc.records[0].at, 0);
  });

  test(`${name}: registros contiguos y cubren todo el archivo`, () => {
    const doc = parse(text);
    for (let i = 1; i < doc.records.length; i++) {
      const prevEnd = doc.records[i - 1].at + doc.records[i - 1].raw.length;
      assert.equal(doc.records[i].at, prevEnd, `hueco antes del registro ${i}`);
    }
    const last = doc.records.at(-1)!;
    assert.equal(last.at + last.raw.length, text.length - MAGIC.length);
  });

  test(`${name}: ids estrictamente crecientes`, () => {
    const doc = parse(text);
    for (let i = 1; i < doc.records.length; i++) {
      assert.ok(doc.records[i].id > doc.records[i - 1].id, `id no creciente en ${i}`);
    }
  });

  test(`${name}: todo registro empieza con su id y código`, () => {
    const doc = parse(text);
    for (const rec of doc.records) {
      assert.equal(rec.raw.slice(0, rec.raw.indexOf('#')), `*${rec.id}*${rec.code}`);
    }
  });
}

test('arranque-paro: designadores por código (evidencia verificada)', () => {
  const doc = parse(readFileSync(join(FIXTURES, 'arranque-paro-motor-3f.cad'), 'latin1'));
  const byCode = new Map(codeInventory(doc).map((s) => [s.code, s]));

  assert.deepEqual(byCode.get(1000)?.designators, ['-M1']);
  assert.deepEqual(byCode.get(2001)?.designators, ['-KM1']);
  assert.deepEqual(byCode.get(6003)?.designators, ['ITM']);
  assert.deepEqual(byCode.get(6007)?.designators, ['RELE']);
  assert.deepEqual(byCode.get(7000)?.designators, ['-KM1']);
  assert.deepEqual(byCode.get(8000)?.designators, ['STAR']);
  assert.deepEqual(byCode.get(8001)?.designators, ['PARO']);
});

test('ej0def: designadores por código (evidencia verificada)', () => {
  const doc = parse(readFileSync(join(FIXTURES, 'ej0def.cad'), 'latin1'));
  const byCode = new Map(codeInventory(doc).map((s) => [s.code, s]));

  assert.deepEqual(byCode.get(1000)?.designators, ['-M']);
  assert.deepEqual(byCode.get(2001)?.designators, ['KM1']); // sin guion: designador libre
  assert.deepEqual(byCode.get(3005)?.designators, ['-X']);
  assert.deepEqual(byCode.get(6001)?.designators, ['-F']);
  assert.deepEqual(byCode.get(6009)?.designators, ['Q1']);
  assert.deepEqual(byCode.get(8018)?.designators, ['-F']);
  assert.deepEqual(byCode.get(8000)?.designators, ['-S']);
});

test('ej0def: primer registro es el id 25, no un 0 de la geometría', () => {
  const doc = parse(readFileSync(join(FIXTURES, 'ej0def.cad'), 'latin1'));
  assert.equal(doc.records[0].id, 25);
  assert.equal(doc.records[0].code, 3005);
  const codes = codeInventory(doc).map((s) => s.code);
  assert.equal(codes.includes(0), false, 'código 0 espurio');
});

test('arranque-paro: no hay códigos basura de cola de geometría', () => {
  const doc = parse(readFileSync(join(FIXTURES, 'arranque-paro-motor-3f.cad'), 'latin1'));
  const codes = new Set(codeInventory(doc).map((s) => s.code));
  // estos aparecían cuando el parser confundía la cola de la geometría
  for (const bogus of [2, 5, 15, 16, 18, 24]) {
    assert.equal(codes.has(bogus), false, `código basura ${bogus} presente`);
  }
  assert.ok(codes.has(4000));
  assert.ok(codes.has(20000));
});
