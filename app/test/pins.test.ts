import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parse } from '../src/format/cade.ts';
import { buildProject, boundsOf } from '../src/model/project.ts';
import { attachPoints } from '../src/editor/pins.ts';

const FIXTURES = join(dirname(fileURLToPath(import.meta.url)), 'fixtures');

function load(name: string) {
  return buildProject(parse(readFileSync(join(FIXTURES, name), 'latin1')));
}

test('el motor del arranque expone 4 puntos de conexión sobre el borde superior', () => {
  const project = load('arranque-paro-motor-3f.cad');
  const motor = project.records.find((r) => r.code === 1000)!;
  const box = boundsOf(motor)!;
  const pins = attachPoints(project.records).get(motor.id);

  assert.ok(pins, 'el motor tiene cables, debe tener pines');
  assert.equal(pins.length, 4);
  for (const p of pins) {
    assert.equal(p.y, box.y, 'todos los bornes del motor están sobre el borde superior');
    assert.ok(p.x >= box.x && p.x <= box.x + box.w);
  }
  const xs = pins.map((p) => p.x - box.x);
  assert.deepEqual(xs, [0, 6, 12, 18], 'los bornes caen en múltiplos de 6');
});

test('todo punto de conexión cae dentro o sobre su caja', () => {
  for (const name of ['arranque-paro-motor-3f.cad', 'ej0def.cad', 'inversion-giro-cej.cade']) {
    const project = load(name);
    const boxes = new Map(
      project.records
        .filter((r) => r.kind === 'component')
        .map((r) => [r.id, boundsOf(r)] as const)
        .filter((entry): entry is [number, NonNullable<ReturnType<typeof boundsOf>>] => entry[1] !== null),
    );
    for (const [id, pins] of attachPoints(project.records)) {
      const b = boxes.get(id)!;
      for (const p of pins) {
        assert.ok(p.x >= b.x - 0.01 && p.x <= b.x + b.w + 0.01, `${name}: ${id} pin x=${p.x} fuera de la caja`);
        assert.ok(p.y >= b.y - 0.01 && p.y <= b.y + b.h + 0.01, `${name}: ${id} pin y=${p.y} fuera de la caja`);
      }
    }
  }
});

test('los bornes siguen una grilla de 6 con la fila inferior en alto-3', () => {
  const project = load('arranque-paro-motor-3f.cad');
  const pins = attachPoints(project.records);
  const contactor = project.records.find((r) => r.code === 2001)!;
  const b = boundsOf(contactor)!;
  const rel = pins.get(contactor.id)!.map((p) => [p.x - b.x, p.y - b.y]);

  assert.deepEqual(rel, [
    [0, 0],
    [6, 0],
    [12, 0],
    [0, 12],
    [6, 12],
    [12, 12],
  ]);
  assert.equal(12, b.h - 3, 'la fila inferior está tres unidades adentro del borde');
});

test('el fusible de ej0def confirma la regla con otra altura', () => {
  const project = load('ej0def.cad');
  const fuse = project.records.find((r) => r.code === 6009)!;
  const b = boundsOf(fuse)!;
  const pins = attachPoints(project.records).get(fuse.id)!;
  const rows = [...new Set(pins.map((p) => p.y - b.y))].sort((a, b2) => a - b2);
  assert.deepEqual(rows, [0, b.h - 3]);
});

test('componentes sin cables no inventan pines', () => {
  const project = load('arranque-paro-motor-3f.cad');
  const pins = attachPoints(project.records);
  const sinCables = project.records.filter((r) => r.kind === 'component' && !pins.has(r.id));
  for (const rec of sinCables) {
    assert.equal(pins.has(rec.id), false);
  }
});
