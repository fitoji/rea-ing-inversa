import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parse } from '../src/format/cade.ts';
import { buildProject, wirePoints } from '../src/model/project.ts';
import {
  buildNetwork,
  cableNumberOf,
  cableSegments,
  cableLength,
  validate,
  CABLE_NUMBER_INDEX,
} from '../src/editor/network.ts';
import {
  createEditor,
  projectOf,
  selectCable,
  moveEndpoint,
  insertVertex,
  mergeVertex,
  setCableNumber,
  addJunction,
  undo,
  deleteSelection,
} from '../src/editor/state.ts';
import { JUNCTION_TEMPLATE } from '../src/symbols/templates.ts';

const FIXTURES = join(dirname(fileURLToPath(import.meta.url)), 'fixtures');
const ARRANQUE = readFileSync(join(FIXTURES, 'arranque-paro-motor-3f.cad'), 'latin1');

const project = () => buildProject(parse(ARRANQUE));

// --- red ---------------------------------------------------------------------

test('el número de cable vive en geometry[21]', () => {
  const wires = project().records.filter((r) => r.kind === 'connection');
  const numbers = wires.map(cableNumberOf).filter((n) => n > 0);
  assert.ok(numbers.length > 20, 'esperaba cables numerados');
  assert.equal(numbers.includes(1), true);
  assert.equal(CABLE_NUMBER_INDEX, 21);
});

test('los tres tramos del cable 17 son un solo cable lógico', () => {
  const network = buildNetwork(project().records);
  const group = network.cables.get(17)!;
  assert.equal(group.length, 3);
  assert.deepEqual([...group].sort((a, b) => a - b), [36, 37, 38]);

  const ids = cableSegments(network, 36);
  assert.deepEqual([...ids].sort((a, b) => a - b), [36, 37, 38]);
  assert.ok(cableLength(network, ids) > 0);
});

test('los registros 4001 son uniones y su geometría es de longitud cero', () => {
  const network = buildNetwork(project().records);
  assert.equal(network.junctionPoints.length, 3);
  for (const p of network.junctionPoints) {
    assert.equal(Number.isFinite(p.x) && Number.isFinite(p.y), true);
  }
  const junctions = [...network.nodes.values()].filter((n) => n.junction);
  assert.ok(junctions.length >= 2);
  assert.equal(junctions.some((n) => n.x === 162 && n.y === 105), true);
});

test('detecta la unión en T: un extremo dentro de otro tramo', () => {
  const network = buildNetwork(project().records);
  const tee = network.nodes.get('162,105')!;
  assert.ok(tee, 'debe existir el nodo de la unión');
  assert.equal(tee.junction, true);
  assert.ok(tee.ends.length >= 1, 'un cable termina ahí');
  assert.ok(tee.through.length >= 1, 'otro cable pasa por ahí');
  assert.equal(tee.connected, true);
});

test('validaciones: reporta uniones superpuestas y no inventa errores', () => {
  const findings = validate(project().records);
  const codes = findings.map((f) => f.code);
  assert.ok(codes.includes('duplicate-junction'), 'hay dos 4001 en el mismo punto');
  for (const f of findings) {
    assert.equal(typeof f.message, 'string');
    assert.ok(f.message.length > 0);
  }
});

// --- edición de cables -------------------------------------------------------

test('mover un extremo dentro del mismo eje no cambia la cantidad de tramos', () => {
  const before = parse(ARRANQUE).records.length;
  const wire = project().records.find((r) => r.code === 4000 && r.geometry[21] === 1)!;
  const pts = wirePoints(wire)!;

  let s = createEditor(ARRANQUE);
  s = moveEndpoint(s, wire.id, 1, pts.x2, pts.y2 - 3);

  const after = projectOf(s).records.find((r) => r.id === wire.id)!;
  const moved = wirePoints(after)!;
  assert.equal(moved.y2, pts.y2 - 3);
  assert.equal(moved.x2, pts.x2);
  assert.equal(parse(s.text).records.length, before);
});

test('mover un extremo en diagonal parte el tramo en un codo con el mismo número', () => {
  const before = parse(ARRANQUE).records.length;
  const wire = project().records.find((r) => r.code === 4000 && r.geometry[21] === 1)!;
  const pts = wirePoints(wire)!;
  const cable = cableNumberOf(wire);

  let s = createEditor(ARRANQUE);
  s = moveEndpoint(s, wire.id, 1, pts.x2 + 9, pts.y2);

  const records = projectOf(s).records;
  assert.equal(parse(s.text).records.length, before + 1);

  const legs = records.filter((r) => r.kind === 'connection' && cableNumberOf(r) === cable);
  assert.equal(legs.length, 2, 'el cable 1 pasa a tener dos tramos');
  for (const leg of legs) {
    const p = wirePoints(leg)!;
    assert.ok(p.x1 === p.x2 || p.y1 === p.y2, 'los tramos deben quedar ortogonales');
  }
  const ids = parse(s.text).records.map((r) => r.id);
  for (let i = 1; i < ids.length; i++) assert.ok(ids[i]! > ids[i - 1]!);
});

test('insertar un vértice conserva la longitud total', () => {
  const wire = project().records.find((r) => r.code === 4000 && r.geometry[21] === 1)!;
  const pts = wirePoints(wire)!;
  const mid = (pts.y1 + pts.y2) / 2;

  let s = createEditor(ARRANQUE);
  s = insertVertex(s, wire.id, pts.x1, mid);

  const records = projectOf(s).records;
  const legs = records.filter((r) => r.kind === 'connection' && cableNumberOf(r) === cableNumberOf(wire));
  assert.equal(legs.length, 2);
  const total = legs.reduce((sum, l) => {
    const p = wirePoints(l)!;
    return sum + Math.hypot(p.x2 - p.x1, p.y2 - p.y1);
  }, 0);
  assert.equal(Math.round(total), Math.round(Math.hypot(pts.x2 - pts.x1, pts.y2 - pts.y1)));
});

test('insertar y unir un vértice devuelve el texto original', () => {
  const wire = project().records.find((r) => r.code === 4000 && r.geometry[21] === 1)!;
  const pts = wirePoints(wire)!;
  const mid = (pts.y1 + pts.y2) / 2;

  let s = createEditor(ARRANQUE);
  s = insertVertex(s, wire.id, pts.x1, mid);
  assert.notEqual(s.text, ARRANQUE);

  s = mergeVertex(s, pts.x1, mid);
  assert.equal(s.text, ARRANQUE, 'unir debe devolver el archivo byte a byte');
});

test('unir un vértice no colineal no toca el archivo', () => {
  const s = createEditor(ARRANQUE);
  const wire = project().records.find((r) => r.code === 4000)!;
  const pts = wirePoints(wire)!;
  const merged = mergeVertex(s, pts.x1, pts.y1);
  assert.equal(merged.text, ARRANQUE);
});

test('cambiar el número de cable alcanza a todos los tramos del cable', () => {
  const network = buildNetwork(project().records);
  const group = network.cables.get(17)!;

  let s = createEditor(ARRANQUE);
  s = setCableNumber(s, group, 99);

  const after = buildNetwork(projectOf(s).records);
  assert.equal(after.cables.get(17), undefined);
  assert.deepEqual([...after.cables.get(99)!].sort((a, b) => a - b), [...group].sort((a, b) => a - b));
});

test('seleccionar un tramo selecciona el cable entero', () => {
  const s = selectCable(createEditor(ARRANQUE), 36);
  assert.deepEqual([...s.selection].sort((a, b) => a - b), [36, 37, 38]);
});

test('borrar un cable de varios tramos los borra todos', () => {
  const before = parse(ARRANQUE).records.length;
  let s = selectCable(createEditor(ARRANQUE), 36);
  s = deleteSelection(s);
  assert.equal(parse(s.text).records.length, before - 3);
});

test('agregar una unión inserta un 4001 en el punto pedido', () => {
  const before = parse(ARRANQUE).records.length;
  let s = createEditor(ARRANQUE);
  s = addJunction(s, 100, 120, JUNCTION_TEMPLATE ?? undefined);

  const records = projectOf(s).records;
  assert.equal(records.length, before + 1);
  const j = records.at(-1)!;
  assert.equal(j.code, 4001);
  assert.equal(j.geometry[8], 100);
  assert.equal(j.geometry[9], 120);
  assert.equal(validate(records).some((f) => f.code === 'duplicate-junction' && f.message.includes('100,120')), false);
});

test('undo deshace también la partición de un tramo', () => {
  const wire = project().records.find((r) => r.code === 4000 && r.geometry[21] === 1)!;
  const pts = wirePoints(wire)!;
  let s = createEditor(ARRANQUE);
  s = moveEndpoint(s, wire.id, 1, pts.x2 + 9, pts.y2);
  assert.notEqual(s.text, ARRANQUE);
  s = undo(s);
  assert.equal(s.text, ARRANQUE);
});

test('editar cables no altera los componentes', () => {
  const wire = project().records.find((r) => r.code === 4000 && r.geometry[21] === 1)!;
  const pts = wirePoints(wire)!;
  let s = createEditor(ARRANQUE);
  s = moveEndpoint(s, wire.id, 1, pts.x2 + 9, pts.y2);

  const before = project().records.filter((r) => r.kind === 'component');
  const after = projectOf(s).records.filter((r) => r.kind === 'component');
  assert.equal(after.length, before.length);
  before.forEach((r, i) => assert.equal(after[i]!.raw, r.raw));
});

test('regresión: lo dibujado después del bloque de título pertenece a esa hoja', () => {
  // ej0def.cad tiene el bloque de título en el registro 14 y dieciséis registros
  // dibujados después, sobre la misma página. Tratarlos como una hoja nueva y
  // vacía hacía que toda edición nueva quedara invisible.
  const p = buildProject(parse(readFileSync(join(FIXTURES, 'ej0def.cad'), 'latin1')));
  assert.equal(p.sheets.length, 1, 'ej0def es una sola hoja');
  assert.equal(p.sheets[0]!.endRecord, p.records.length);
  assert.equal(p.sheets[0]!.titleBlock?.code, 20000);
});

test('regresión: un tramo agregado queda dentro de la hoja visible', () => {
  const wire = project().records.find((r) => r.code === 4000 && r.geometry[21] === 1)!;
  const pts = wirePoints(wire)!;

  let s = createEditor(ARRANQUE);
  s = moveEndpoint(s, wire.id, 0, pts.x1 - 12, pts.y1 + 9);

  const p = projectOf(s);
  assert.equal(p.sheets.length, 1, 'no debe aparecer una hoja nueva sin título');
  const sheet = p.sheets[0]!;
  const visible = p.records.slice(sheet.startRecord, sheet.endRecord);
  const attached = visible.filter((r) => r.kind === 'connection' && cableNumberOf(r) === cableNumberOf(wire));
  assert.equal(attached.length, 2, 'los dos tramos del codo deben quedar en la hoja');
});

test('un codo en diagonal produce un tramo vertical y otro horizontal', () => {
  const wire = project().records.find((r) => r.code === 4000 && r.geometry[21] === 1)!;
  const pts = wirePoints(wire)!;

  let s = createEditor(ARRANQUE);
  s = moveEndpoint(s, wire.id, 0, pts.x1 - 12, pts.y1 + 9);

  const legs = projectOf(s).records.filter(
    (r) => r.kind === 'connection' && cableNumberOf(r) === cableNumberOf(wire),
  );
  assert.equal(legs.length, 2);
  const shapes = legs.map((l) => {
    const p = wirePoints(l)!;
    return p.x1 === p.x2 ? 'vertical' : 'horizontal';
  });
  assert.deepEqual(shapes.sort(), ['horizontal', 'vertical']);
});
