import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parse } from '../src/format/cade.ts';
import {
  buildProject,
  serializeProject,
  classify,
  componentsOf,
  drawablesOf,
  componentsByCode,
  wirePoints,
  boxOf,
  GEOMETRY,
} from '../src/model/project.ts';

const FIXTURES = join(dirname(fileURLToPath(import.meta.url)), 'fixtures');

function fixtures(): string[] {
  return readdirSync(FIXTURES).filter((f) => /\.(cade|cad)$/i.test(f));
}

function load(name: string) {
  return buildProject(parse(readFileSync(join(FIXTURES, name), 'latin1')));
}

for (const name of fixtures()) {
  const text = readFileSync(join(FIXTURES, name), 'latin1');

  test(`${name}: modelar y serializar devuelve los mismos bytes`, () => {
    assert.equal(serializeProject(buildProject(parse(text))), text);
  });

  test(`${name}: cada registro del modelo conserva su id y código`, () => {
    const project = buildProject(parse(text));
    const doc = parse(text);
    assert.equal(project.records.length, doc.records.length);
    project.records.forEach((rec, i) => {
      assert.equal(rec.id, doc.records[i].id);
      assert.equal(rec.code, doc.records[i].code);
      assert.equal(rec.raw, doc.records[i].raw);
    });
  });

  test(`${name}: las hojas cubren todos los registros sin solaparse`, () => {
    const project = buildProject(parse(text));
    assert.ok(project.sheets.length >= 1);
    assert.equal(project.sheets[0].startRecord, 0);
    for (let i = 1; i < project.sheets.length; i++) {
      assert.equal(project.sheets[i].startRecord, project.sheets[i - 1].endRecord);
    }
    assert.equal(project.sheets.at(-1)!.endRecord, project.records.length);
  });
}

test('arranque-paro: componentes, bornes y designadores', () => {
  const project = load('arranque-paro-motor-3f.cad');
  const byCode = componentsByCode(project);

  const motor = byCode.get(1000)![0];
  assert.equal(motor.kind, 'component');
  assert.equal(motor.designator, '-M1');
  assert.deepEqual(motor.pins, ['U1', 'V1', 'W1', 'PE']);

  const contactor = byCode.get(2001)![0];
  assert.equal(contactor.designator, '-KM1');
  assert.deepEqual(contactor.pins, ['1', '3', '5', '2', '4', '6']);

  const relay = byCode.get(6007)![0];
  assert.equal(relay.designator, 'RELE');
});

test('arranque-paro: cables con dos puntos distintos', () => {
  const project = load('arranque-paro-motor-3f.cad');
  const wires = project.records.filter((r) => r.code === 4000);
  assert.ok(wires.length > 0);
  for (const w of wires) {
    const pts = wirePoints(w);
    assert.ok(pts, `cable ${w.id} sin puntos`);
    assert.ok(pts.x1 !== pts.x2 || pts.y1 !== pts.y2, `cable ${w.id} degenerado`);
  }
});

test('ej0def: 4019 también es un cable', () => {
  const project = load('ej0def.cad');
  const variants = project.records.filter((r) => r.code === 4019);
  assert.equal(variants.length, 8);
  for (const v of variants) {
    assert.equal(v.kind, 'connection');
    const pts = wirePoints(v);
    assert.ok(pts, `4019 ${v.id} sin puntos`);
    assert.ok(pts.x1 !== pts.x2 || pts.y1 !== pts.y2);
  }
});

test('componentes: caja declarada positiva', () => {
  const project = load('arranque-paro-motor-3f.cad');
  const comps = componentsOf(project);
  assert.ok(comps.length > 0);
  for (const rec of comps) {
    const box = boxOf(rec);
    assert.ok(box, `componente ${rec.code}/${rec.designator} sin caja`);
    assert.ok(box.width > 0 && box.height > 0);
  }
});

test('componentsOf excluye cables; drawablesOf los incluye', () => {
  const project = load('arranque-paro-motor-3f.cad');
  const comps = componentsOf(project);
  const drawables = drawablesOf(project);
  const connections = drawables.filter((r) => r.kind === 'connection');

  assert.equal(comps.every((r) => r.kind === 'component'), true);
  assert.ok(connections.length > 0);
  assert.equal(comps.length + connections.length, drawables.length);
});

test('etiquetas de texto (código 8): el texto cierra el registro', () => {
  const project = load('arranque-paro-motor-3f.cad');
  const labels = project.records.filter((r) => r.kind === 'text');
  assert.ok(labels.length > 0);
  for (const l of labels) {
    assert.notEqual(l.text.trim(), '');
    assert.equal(l.designator, '');
  }
  assert.ok(labels.some((l) => l.text.includes('ARRANQUE Y PARO')));
});

test('geometría: posiciones documentadas estables', () => {
  const project = load('arranque-paro-motor-3f.cad');
  const contactor = project.records.find((r) => r.code === 2001)!;
  assert.equal(contactor.geometry[GEOMETRY.x], 30);
  assert.equal(contactor.geometry[GEOMETRY.y], 99);
  assert.equal(contactor.geometry[GEOMETRY.width], 18);
  assert.equal(contactor.geometry[GEOMETRY.height], 15);
});

test('classify: grupos de códigos', () => {
  assert.equal(classify(8), 'text');
  assert.equal(classify(20000), 'sheet-title');
  assert.equal(classify(10501), 'config');
  assert.equal(classify(2001), 'component');
  assert.equal(classify(4000), 'connection');
  assert.equal(classify(99999), 'unknown');
});

test('registros desconocidos se preservan como opacos', () => {
  const project = load('ej0def.cad');
  for (const rec of project.records) {
    assert.equal(typeof rec.raw, 'string');
    assert.ok(rec.raw.length > 0);
  }
});
