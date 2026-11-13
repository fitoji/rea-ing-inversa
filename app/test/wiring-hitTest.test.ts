/**
 * Hit-test puro del cableado (fase 2 del plan de
 * `docs/WIRING_ARCHITECTURE.md`): endpoint > segmento > componente > fondo.
 */
import { test } from 'node:test';
import { strict as assert } from 'node:assert';

import { hitContext, hitTest } from '../src/editor/wiring/hitTest.ts';
import type { Point } from '../src/editor/pins.ts';
import type { CadeRecordModel } from '../src/model/project.ts';
import type { Network } from '../src/editor/network.ts';

const pt = (x: number, y: number): Point => ({ x, y });

/** Registro mínimo de prueba: solo lo que boundsOf lee. */
const rec = (id: number, kind: 'component' | 'connection', geometry: number[], sheet = 0): CadeRecordModel =>
  ({ id, code: kind === 'component' ? 0 : 4000, kind, designator: '', pins: [], lampColor: null, geometry, text: '', raw: '', sheet });

// Tramo horizontal (0,50)-(20,50), uno vertical (50,0)-(50,30), un componente
// con caja (0,0)-(10,10) y una unión 4001 de longitud cero en (70,70).
const records: CadeRecordModel[] = [
  rec(9, 'component', [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 10, 10]),
];
const network = {
  pins: new Map(),
  junctionPoints: [],
  segments: new Map([
    [1, { id: 1, code: 4000, sheet: 0, cable: 0, a: '0|0,50', b: '0|20,50', points: { x1: 0, y1: 50, x2: 20, y2: 50 } }],
    [2, { id: 2, code: 4000, sheet: 0, cable: 0, a: '0|50,0', b: '0|50,30', points: { x1: 50, y1: 0, x2: 50, y2: 30 } }],
    [3, { id: 3, code: 4001, sheet: 0, cable: 0, a: '0|70,70', b: '0|70,70', points: { x1: 70, y1: 70, x2: 70, y2: 70 } }],
  ]),
  nodes: new Map(),
  cables: new Map(),
} as unknown as Network;

const ctx = hitContext(network, records, 0);
const TOL = 2;

test('el extremo del tramo es el objetivo de mayor prioridad', () => {
  const out = hitTest(pt(1, 50), ctx, TOL);
  assert.equal(out.kind, 'endpoint');
  if (out.kind === 'endpoint') {
    assert.equal(out.segmentId, 1);
    assert.equal(out.end, 0);
    assert.deepEqual(out.point, pt(0, 50));
  }
});

test('el interior del tramo es segmento', () => {
  const out = hitTest(pt(10, 51), ctx, TOL);
  assert.equal(out.kind, 'segment');
  if (out.kind === 'segment') assert.equal(out.segmentId, 1);
});

test('el componente solo responde cuando el punto cae en su caja', () => {
  const out = hitTest(pt(5, 5), ctx, TOL);
  assert.equal(out.kind, 'component');
  if (out.kind === 'component') assert.equal(out.componentId, 9);
});

test('el fondo cuando no hay nada cerca', () => {
  assert.equal(hitTest(pt(100, 100), ctx, TOL).kind, 'background');
});

test('la unión de longitud cero (4001) no es un objetivo de golpe', () => {
  // Caería en el registro 3 si no se filtrara.
  assert.equal(hitTest(pt(70, 70), ctx, TOL).kind, 'background');
});

test('la tolerancia decide sobre empates a favor del más cercano', () => {
  // A 1.5 del tramo 1 y fuera del alcance de otros objetivos.
  const near = hitTest(pt(10, 51.5), ctx, TOL);
  assert.equal(near.kind, 'segment');
  // A 3 unidades: fuera de la tolerancia → fondo.
  assert.equal(hitTest(pt(10, 53), ctx, TOL).kind, 'background');
});

test('la hoja filtra los objetivos: otra hoja no golpea nada', () => {
  const other = hitContext(network, records, 1);
  assert.equal(hitTest(pt(10, 51), other, TOL).kind, 'background');
  assert.equal(hitTest(pt(5, 5), other, TOL).kind, 'background');
});

test('los endpoints se pueden apagar: el escaneo de solo segmentos conserva el golpe en la punta', () => {
  // hitWire del Canvas golpea segmentos aun en la punta del tramo.
  const out = hitTest(pt(0, 50), ctx, TOL, { endpoints: false });
  assert.equal(out.kind, 'segment');
  if (out.kind === 'segment') assert.equal(out.segmentId, 1);
});
