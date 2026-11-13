/**
 * Geometría pura de cableado (fase 1 del plan de
 * `docs/WIRING_ARCHITECTURE.md`): normalización de polilíneas ortogonales,
 * proyecciones y cruces. Son funciones puras: ninguna muta su entrada.
 */
import { test } from 'node:test';
import { strict as assert } from 'node:assert';

import {
  EPS,
  isOrthogonal,
  normalizeOrthogonal,
  pathLength,
  pointOnSegment,
  projectOnSegment,
  segmentIntersection,
  toSegments,
} from '../src/editor/wiring/geometry.ts';
import type { Point } from '../src/editor/pins.ts';

const pt = (x: number, y: number): Point => ({ x, y });
/** Comparación de puntos tolerante al redondeo del cálculo. */
const samePoint = (a: Point, b: Point, eps = 1e-9): boolean =>
  Math.abs(a.x - b.x) < eps && Math.abs(a.y - b.y) < eps;

// --- normalización -----------------------------------------------------------

test('la normalización colapsa los codos que no doblan', () => {
  // Recta horizontal con vértices de relleno, más un codo real.
  const out = normalizeOrthogonal([pt(0, 0), pt(5, 0), pt(10, 0), pt(10, 10)]);
  assert.deepEqual(out, [pt(0, 0), pt(10, 0), pt(10, 10)]);
});

test('la normalización elimina los segmentos de longitud cero', () => {
  assert.deepEqual(normalizeOrthogonal([pt(0, 0), pt(0, 0), pt(10, 0)]), [pt(0, 0), pt(10, 0)]);
  // Duplicado al final, no solo en el medio.
  assert.deepEqual(normalizeOrthogonal([pt(0, 0), pt(10, 0), pt(10, 0)]), [pt(0, 0), pt(10, 0)]);
});

test('la normalización preserva los codos reales', () => {
  const path = [pt(0, 0), pt(10, 0), pt(10, 10), pt(20, 10)];
  assert.deepEqual(normalizeOrthogonal(path), path);
});

test('la normalización no muta la entrada y tolera polilíneas cortas', () => {
  const input = [pt(0, 0), pt(5, 0), pt(10, 0)];
  const before = structuredClone(input);
  normalizeOrthogonal(input);
  assert.deepEqual(input, before);

  assert.deepEqual(normalizeOrthogonal([]), []);
  assert.deepEqual(normalizeOrthogonal([pt(3, 4)]), [pt(3, 4)]);
  assert.deepEqual(normalizeOrthogonal([pt(0, 0), pt(10, 0)]), [pt(0, 0), pt(10, 0)]);
});

test('una polilínea con diagonal no es ortogonal', () => {
  assert.ok(isOrthogonal([pt(0, 0), pt(10, 0), pt(10, 10)]));
  assert.ok(isOrthogonal([pt(0, 0), pt(0, 0)])); // longitud cero: no dobla
  assert.ok(!isOrthogonal([pt(0, 0), pt(10, 10)]));
  assert.ok(!isOrthogonal([pt(0, 0), pt(10, 0), pt(15, 5)]));
});

// --- proyección --------------------------------------------------------------

test('la proyección cae dentro del segmento', () => {
  const p = projectOnSegment(pt(5, 5), { a: pt(0, 0), b: pt(10, 0) });
  assert.ok(samePoint(p.point, pt(5, 0)));
  assert.ok(Math.abs(p.t - 0.5) < 1e-9);
  assert.ok(Math.abs(p.distance - 5) < 1e-9);
});

test('la proyección se recorta en los extremos', () => {
  // Más allá de b: t recorta a 1 y la distancia es hasta el extremo.
  const end = projectOnSegment(pt(15, 3), { a: pt(0, 0), b: pt(10, 0) });
  assert.ok(samePoint(end.point, pt(10, 0)));
  assert.equal(end.t, 1);
  assert.ok(Math.abs(end.distance - Math.hypot(5, 3)) < 1e-9);

  // Antes de a: t recorta a 0.
  const start = projectOnSegment(pt(-4, 0), { a: pt(0, 0), b: pt(10, 0) });
  assert.ok(samePoint(start.point, pt(0, 0)));
  assert.equal(start.t, 0);
});

test('la proyección tolera un segmento de longitud cero', () => {
  const p = projectOnSegment(pt(5, 0), { a: pt(2, 2), b: pt(2, 2) });
  assert.ok(samePoint(p.point, pt(2, 2)));
  assert.equal(p.t, 0);
  assert.ok(Math.abs(p.distance - Math.hypot(3, 2)) < 1e-9);
});

test('pointOnSegment distingue interior, extremo y fuera', () => {
  const seg = { a: pt(0, 0), b: pt(10, 0) };
  assert.ok(pointOnSegment(pt(5, 0), seg));
  assert.ok(pointOnSegment(pt(10, 0), seg)); // extremo: sí toca
  assert.ok(!pointOnSegment(pt(5, 1), seg)); // distancia > EPS
  assert.ok(!pointOnSegment(pt(10 + EPS * 5, 0), seg)); // fuera por el largo
});

// --- cruces ------------------------------------------------------------------

test('el cruce en X se detecta en el interior de ambos', () => {
  const out = segmentIntersection(
    { a: pt(0, 5), b: pt(10, 5) },
    { a: pt(5, 0), b: pt(5, 10) },
  );
  assert.ok(out);
  assert.equal(out.kind, 'cross');
  assert.ok(samePoint(out.point, pt(5, 5)));
});

test('la T toca sin cruzar: un extremo cae en el interior del otro', () => {
  // Derivación en T: b arranca del medio de a.
  const out = segmentIntersection({ a: pt(0, 5), b: pt(10, 5) }, { a: pt(5, 5), b: pt(5, 20) });
  assert.ok(out);
  assert.equal(out.kind, 'touch');
  assert.ok(samePoint(out.point, pt(5, 5)));
});

test('los extremos coincidentes tocan una sola vez', () => {
  const out = segmentIntersection({ a: pt(0, 0), b: pt(10, 0) }, { a: pt(10, 0), b: pt(10, 10) });
  assert.ok(out);
  assert.equal(out.kind, 'touch');
  assert.ok(samePoint(out.point, pt(10, 0)));
});

test('los paralelos y los separados no se tocan', () => {
  assert.equal(segmentIntersection({ a: pt(0, 0), b: pt(10, 0) }, { a: pt(0, 5), b: pt(10, 5) }), null);
  assert.equal(segmentIntersection({ a: pt(0, 0), b: pt(10, 0) }, { a: pt(0, 5), b: pt(0, 9) }), null);
  // Colineales superpuestos: comparten un tramo; el extremo de a cae dentro
  // de b, así que se detecta como touch en ese punto.
  const overlap = segmentIntersection({ a: pt(0, 0), b: pt(10, 0) }, { a: pt(5, 0), b: pt(20, 0) });
  assert.ok(overlap);
  assert.equal(overlap.kind, 'touch');
  assert.ok(samePoint(overlap.point, pt(10, 0)));
});

// --- helpers de polilínea ----------------------------------------------------

test('toSegments y pathLength son coherentes con los vértices', () => {
  const path = [pt(0, 0), pt(10, 0), pt(10, 10)];
  assert.equal(toSegments(path).length, 2);
  assert.ok(Math.abs(pathLength(path) - 20) < EPS);
  assert.equal(pathLength([]), 0);
});
