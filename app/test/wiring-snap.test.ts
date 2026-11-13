/**
 * Snap priorizado del cableado (fase 2 del plan de
 * `docs/WIRING_ARCHITECTURE.md`): pin → junction → derivación en T → cuadrícula.
 *
 * La tolerancia llega en unidades de documento (el llamador convierte de
 * píxeles con la escala de la vista) para que el snap se sienta igual a
 * cualquier zoom.
 */
import { test } from 'node:test';
import { strict as assert } from 'node:assert';

import { snapContext, snapTarget } from '../src/editor/wiring/snap.ts';
import type { Point } from '../src/editor/pins.ts';
import type { CadeRecordModel } from '../src/model/project.ts';
import type { Network } from '../src/editor/network.ts';

const pt = (x: number, y: number): Point => ({ x, y });

/** Registro mínimo de prueba: solo lo que attachPoints/wirePoints leen. */
const rec = (id: number, kind: 'component' | 'connection', geometry: number[], sheet = 0): CadeRecordModel =>
  ({ id, code: kind === 'component' ? 0 : 4000, kind, designator: '', pins: [], lampColor: null, geometry, text: '', raw: '', sheet });

// Componente 7 con caja (5,15)-(15,45) y dos cables que la tocan en (10,20) y
// (10,40): attachPoints deriva de ahí sus bornes.
const records: CadeRecordModel[] = [
  rec(7, 'component', [0, 0, 0, 0, 0, 0, 0, 0, 5, 15, 0, 0, 0, 0, 10, 30]),
  rec(51, 'connection', [0, 0, 0, 0, 0, 0, 0, 0, 10, 20, 0, 0, 0, 0, 10, 0]),
  rec(52, 'connection', [0, 0, 0, 0, 0, 0, 0, 0, 10, 40, 0, 0, 0, 0, 10, 55]),
];

// Red de prueba: una junction (4001) en (30,20) y dos tramos ortogonales.
const network = {
  pins: new Map(),
  junctionPoints: [{ x: 30, y: 20, sheet: 0 }],
  segments: new Map([
    [101, { id: 101, code: 4000, sheet: 0, cable: 0, a: '0|30,60', b: '0|60,60', points: { x1: 30, y1: 60, x2: 60, y2: 60 } }],
    [102, { id: 102, code: 4000, sheet: 0, cable: 0, a: '0|60,20', b: '0|60,50', points: { x1: 60, y1: 20, x2: 60, y2: 50 } }],
  ]),
  nodes: new Map(),
  cables: new Map(),
} as unknown as Network; // snapTarget solo consume junctions/segments

const ctx = snapContext(network, records, 0);
const TOL = 2;
const STEP = 3;

test('el pin más cercano gana sobre todo lo demás', () => {
  // Cerca del borne (10,20) pero también a 2 del tramo 101... el pin manda.
  const out = snapTarget(pt(11, 20), ctx, TOL, STEP);
  assert.equal(out.kind, 'pin');
  if (out.kind === 'pin') {
    assert.equal(out.componentId, 7);
    assert.equal(out.pinIndex, 0);
    assert.deepEqual(out.point, pt(10, 20));
  }
});

test('los bornes de otros componentes se distinguir por índice', () => {
  const out = snapTarget(pt(10, 41), ctx, TOL, STEP);
  assert.equal(out.kind, 'pin');
  if (out.kind === 'pin') assert.equal(out.pinIndex, 1);
});

test('la junction existente es la segunda prioridad', () => {
  const out = snapTarget(pt(31, 21), ctx, TOL, STEP);
  assert.equal(out.kind, 'junction');
  if (out.kind === 'junction') assert.deepEqual(out.point, pt(30, 20));
});

test('la derivación en T cae sobre el interior del tramo', () => {
  // Cursor a 1 unidad del tramo horizontal 101 (y=60, x de 30 a 60).
  const out = snapTarget(pt(45, 61), ctx, TOL, STEP);
  assert.equal(out.kind, 'tee');
  if (out.kind === 'tee') {
    assert.equal(out.segmentId, 101);
    // El punto de T está sobre el tramo y snapeado a la grilla en su eje libre.
    assert.equal(out.point.y, 60);
    assert.equal(out.point.x, 45); // 45 ya es múltiplo de 3
  }
});

test('la T en un tramo vertical snapea el eje libre a la grilla', () => {
  const out = snapTarget(pt(59, 35), ctx, TOL, STEP);
  assert.equal(out.kind, 'tee');
  if (out.kind === 'tee') {
    assert.equal(out.segmentId, 102);
    assert.equal(out.point.x, 60);
    assert.equal(out.point.y, 36); // 35 → 36 (múltiplo de 3)
  }
});

test('la T rechaza los extremos del tramo: ahí no hay derivación', () => {
  // A 1 del extremo x=30 del tramo 101: la proyección cae en la punta.
  const out = snapTarget(pt(31, 61), ctx, TOL, STEP);
  assert.equal(out.kind, 'grid');
});

test('el propio tramo en edición se excluye de la T', () => {
  const out = snapTarget(pt(45, 61), ctx, TOL, STEP, [101]);
  assert.equal(out.kind, 'grid');
});

test('la hoja es parte del contexto: no se snapea lo de otra hoja', () => {
  const other = snapContext(network, records, 1);
  assert.equal(snapTarget(pt(31, 21), other, TOL, STEP).kind, 'grid');
  assert.equal(snapTarget(pt(45, 61), other, TOL, STEP).kind, 'grid');
  // Los bornes tampoco viajan entre hojas.
  assert.equal(snapTarget(pt(11, 20), other, TOL, STEP).kind, 'grid');
});

test('sin objetivos cerca cae en la cuadrícula', () => {
  const out = snapTarget(pt(47, 63), ctx, TOL, STEP);
  assert.equal(out.kind, 'grid');
  if (out.kind === 'grid') assert.deepEqual(out.point, pt(48, 63));
});

test('la tolerancia se respeta: fuera de ella no hay snap magnético', () => {
  // A 3 unidades del borne: fuera de TOL=2.
  const out = snapTarget(pt(13, 20), ctx, TOL, STEP);
  assert.equal(out.kind, 'grid');
});

test('sin grilla (step 1) la cuadrícula redondea al entero', () => {
  const out = snapTarget(pt(47.4, 63.6), ctx, TOL, 1);
  assert.equal(out.kind, 'grid');
  if (out.kind === 'grid') assert.deepEqual(out.point, pt(47, 64));
});
