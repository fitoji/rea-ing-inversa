import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parse } from '../src/format/cade.ts';
import { boxOf, wirePoints } from '../src/model/project.ts';
import {
  createEditor,
  projectOf,
  select,
  moveSelection,
  deleteSelection,
  copySelection,
  paste,
  addComponent,
  rotateSelection,
  setDesignator,
  undo,
  redo,
} from '../src/editor/state.ts';

const FIXTURES = join(dirname(fileURLToPath(import.meta.url)), 'fixtures');
const ARRANQUE = readFileSync(join(FIXTURES, 'arranque-paro-motor-3f.cad'), 'latin1');

const idOf = (code: number, text = ARRANQUE): number =>
  parse(text).records.find((r) => r.code === code)!.id;

test('createEditor: abre sin marcar cambios y sin historial', () => {
  const s = createEditor(ARRANQUE);
  assert.equal(s.text, ARRANQUE);
  assert.equal(s.dirty, false);
  assert.deepEqual(s.past, []);
  assert.deepEqual(s.selection, []);
});

test('select: reemplaza y acumula con additive', () => {
  let s = createEditor(ARRANQUE);
  s = select(s, [1, 2]);
  assert.deepEqual(s.selection, [1, 2]);
  s = select(s, [2, 3], true);
  assert.deepEqual(s.selection.sort(), [1, 3]);
});

test('moveSelection: el componente y sus cables viajan juntos', () => {
  const motorId = idOf(1000);
  let s = createEditor(ARRANQUE);
  s = select(s, [motorId]);
  s = moveSelection(s, 10, -5);

  const before = projectOf(createEditor(ARRANQUE));
  const after = projectOf(s);
  const mb = before.records.find((r) => r.id === motorId)!;
  const ma = after.records.find((r) => r.id === motorId)!;

  assert.equal(ma.geometry[8], mb.geometry[8]! + 10);
  assert.equal(ma.geometry[9], mb.geometry[9]! - 5);
  assert.equal(s.dirty, true);
  assert.equal(parse(s.text).records.length, parse(ARRANQUE).records.length);
});

test('moveSelection: los cables del componente movido cambian de extremo', () => {
  const motorId = idOf(1000);
  const base = projectOf(createEditor(ARRANQUE));
  const motorBox = (() => {
    const rec = base.records.find((r) => r.id === motorId)!;
    const b = boxOf(rec)!;
    return { x: rec.geometry[8]!, y: rec.geometry[9]!, w: b.width, h: b.height };
  })();
  const attached = base.records.filter((r) => {
    const pts = wirePoints(r);
    if (!pts) return false;
    const inside = (x: number, y: number) =>
      x >= motorBox.x - 4 && x <= motorBox.x + motorBox.w + 4 && y >= motorBox.y - 4 && y <= motorBox.y + motorBox.h + 4;
    return inside(pts.x1, pts.y1) || inside(pts.x2, pts.y2);
  });
  assert.ok(attached.length > 0, 'el motor debe tener cables enganchados');

  let s = select(createEditor(ARRANQUE), [motorId]);
  s = moveSelection(s, 7, 0);

  const after = projectOf(s);
  for (const rec of attached) {
    const beforePts = wirePoints(base.records.find((r) => r.id === rec.id)!)!;
    const now = wirePoints(after.records.find((r) => r.id === rec.id)!)!;
    const inside = (x: number, y: number) =>
      x >= motorBox.x - 4 && x <= motorBox.x + motorBox.w + 4 && y >= motorBox.y - 4 && y <= motorBox.y + motorBox.h + 4;
    const shiftA = inside(beforePts.x1, beforePts.y1) ? 7 : 0;
    const shiftB = inside(beforePts.x2, beforePts.y2) ? 7 : 0;
    assert.equal(now.x1, beforePts.x1 + shiftA, `cable ${rec.id} extremo A`);
    assert.equal(now.x2, beforePts.x2 + shiftB, `cable ${rec.id} extremo B`);
    assert.ok(shiftA + shiftB > 0, `cable ${rec.id} debía moverse de algún lado`);
  }
});

test('moveSelection sin selección no altera el texto', () => {
  const s = createEditor(ARRANQUE);
  assert.equal(moveSelection(s, 5, 5).text, ARRANQUE);
});

test('undo y redo restauran el texto exacto', () => {
  const motorId = idOf(1000);
  let s = select(createEditor(ARRANQUE), [motorId]);
  s = moveSelection(s, 12, 0);
  const moved = s.text;
  assert.notEqual(moved, ARRANQUE);

  s = undo(s);
  assert.equal(s.text, ARRANQUE);
  assert.deepEqual(s.selection, [motorId]);

  s = redo(s);
  assert.equal(s.text, moved);
});

test('undo sin historial es inocuo', () => {
  const s = createEditor(ARRANQUE);
  assert.equal(undo(s), s);
});

test('deleteSelection: borra el componente y deja intacto el resto', () => {
  const motorId = idOf(1000);
  const before = parse(ARRANQUE).records.length;
  let s = select(createEditor(ARRANQUE), [motorId]);
  s = deleteSelection(s);

  const after = parse(s.text).records;
  assert.equal(after.length, before - 1);
  assert.equal(after.some((r) => r.id === motorId), false);
  assert.ok(after.some((r) => r.code === 2001), 'el contactor sigue ahí');
  assert.ok(after.some((r) => r.code === 20000), 'el bloque de título sobrevive');
  assert.deepEqual(s.selection, []);
});

test('deleteSelection: no borra registros que no son dibujables', () => {
  const titleId = parse(ARRANQUE).records.find((r) => r.code === 20000)!.id;
  const s = deleteSelection(select(createEditor(ARRANQUE), [titleId]));
  assert.equal(s.text, ARRANQUE);
});

test('copy + paste: agrega registros con ids crecientes y reparsea', () => {
  const motorId = idOf(1000);
  let s = select(createEditor(ARRANQUE), [motorId]);
  s = copySelection(s);
  assert.equal(s.clipboard.length, 1);

  const before = parse(ARRANQUE).records.length;
  s = paste(s, 20, 20);

  const records = parse(s.text).records;
  assert.equal(records.length, before + 1);
  const ids = records.map((r) => r.id);
  for (let i = 1; i < ids.length; i++) {
    assert.ok(ids[i]! > ids[i - 1]!, `id ${ids[i]} no es mayor que ${ids[i - 1]}`);
  }
  const copy = records.at(-1)!;
  assert.equal(copy.code, 1000);
  assert.equal(s.selection.length, 1);
  assert.equal(s.selection[0], copy.id);
});

test('paste sin clipboard no cambia nada', () => {
  const s = createEditor(ARRANQUE);
  assert.equal(paste(s).text, ARRANQUE);
});

test('addComponent: inserta al final con el id siguiente y en la posición pedida', () => {
  const template = parse(ARRANQUE).records.find((r) => r.code === 6003)!.raw;
  let s = createEditor(ARRANQUE);
  s = addComponent(s, template, 140, 60);

  const records = parse(s.text).records;
  const added = projectOf(s).records.at(-1)!;
  assert.equal(added.code, 6003);
  assert.equal(added.id, Math.max(...records.slice(0, -1).map((r) => r.id)) + 1);
  assert.equal(added.geometry[8], 140);
  assert.equal(added.geometry[9], 60);
  assert.deepEqual(s.selection, [added.id]);
});

test('addComponent: no repite el designador aunque la plantilla lo traiga usado', () => {
  const template = parse(ARRANQUE).records.find((r) => r.code === 1000)!.raw;
  let s = createEditor(ARRANQUE);
  const usados = new Set(projectOf(s).records.map((r) => r.designator));

  s = addComponent(s, template, 200, 60);
  s = addComponent(s, template, 220, 60);

  const added = projectOf(s)
    .records.slice(-2)
    .map((r) => r.designator);
  assert.equal(added.length, 2);
  assert.notEqual(added[0], added[1], 'los dos motores nuevos comparten designador');
  for (const d of added) assert.ok(!usados.has(d), `el designador ${d} ya existía`);
});

test('rotateSelection: rota 90 grados acumulativos sin tocar el texto', () => {
  const motorId = idOf(1000);
  let s = select(createEditor(ARRANQUE), [motorId]);
  s = rotateSelection(s);
  assert.equal(s.rotation[motorId], 90);
  s = rotateSelection(s);
  assert.equal(s.rotation[motorId], 180);
  assert.equal(s.text, ARRANQUE, 'la rotación es visual hasta confirmar el campo del formato');
});

test('setDesignator: cambia sólo el designador del registro indicado', () => {
  const motorId = idOf(1000);
  let s = createEditor(ARRANQUE);
  s = setDesignator(s, motorId, '-M7');

  const records = parse(s.text).records;
  const motor = records.find((r) => r.id === motorId)!;
  assert.equal(motor.designator, '-M7');
  assert.equal(records.length, parse(ARRANQUE).records.length);

  const untouched = records.filter((r) => r.id !== motorId);
  const original = parse(ARRANQUE).records.filter((r) => r.id !== motorId);
  untouched.forEach((r, i) => assert.equal(r.raw, original[i]!.raw));
});
