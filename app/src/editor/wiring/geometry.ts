/**
 * Geometría pura de cableado ortogonal (fase 1 del plan de
 * `docs/WIRING_ARCHITECTURE.md`, revisada en `docs/WIRING_ARCHITECTURE_REVIEW.md`).
 *
 * Funciones sin estado, sin React y sin conocer el formato CADe: las consume
 * el editor y las testea `app/test/wiring-geometry.test.ts`. Una polilínea es
 * la lista completa de vértices, extremos incluidos; los segmentos son los
 * tramos consecutivos entre vértices.
 *
 * La tolerancia EPS convive con la del resto del editor (`AXIS_TOL` en
 * state.ts, `TOL` en network.ts, ambos 0.01): las coordenadas del formato viven
 * en una grilla chica, así que 0.01 separa "mismo punto" de "punto distinto"
 * sin comerse codos legítimos.
 */

import type { Point } from '../pins.ts';

export const EPS = 0.01;

export interface Segment {
  a: Point;
  b: Point;
}

/** Parte una polilínea en sus segmentos consecutivos (una menos que vértices). */
export function toSegments(points: readonly Point[]): Segment[] {
  const out: Segment[] = [];
  for (let i = 0; i + 1 < points.length; i++) {
    out.push({ a: points[i]!, b: points[i + 1]! });
  }
  return out;
}

export function dist(p: Point, q: Point): number {
  return Math.hypot(p.x - q.x, p.y - q.y);
}

export function segmentLength(s: Segment): number {
  return dist(s.a, s.b);
}

/** Suma de las longitudes de los segmentos de la polilínea. */
export function pathLength(points: readonly Point[]): number {
  return toSegments(points).reduce((total, s) => total + segmentLength(s), 0);
}

/**
 * Todos los tramos son horizontales o verticales (o de longitud cero, que no
 * viola la ortogonalidad: lo viola la normalización, que los quita).
 */
export function isOrthogonal(points: readonly Point[]): boolean {
  return toSegments(points).every(
    (s) => Math.abs(s.a.x - s.b.x) < EPS || Math.abs(s.a.y - s.b.y) < EPS,
  );
}

const near = (p: Point, q: Point): boolean =>
  Math.abs(p.x - q.x) < EPS && Math.abs(p.y - q.y) < EPS;

/** `cur` está en la misma recta que `prev` y `next` (los tres por el mismo eje). */
const collinearMiddle = (prev: Point, cur: Point, next: Point): boolean =>
  (Math.abs(prev.y - cur.y) < EPS && Math.abs(cur.y - next.y) < EPS) ||
  (Math.abs(prev.x - cur.x) < EPS && Math.abs(cur.x - next.x) < EPS);

/**
 * Normaliza una polilínea ortogonal: quita segmentos de longitud cero
 * (vértices consecutivos duplicados) y codos colineales (un punto intermedio
 * sobre la misma recta no dobla nada). Es pura: no muta la entrada.
 */
export function normalizeOrthogonal(points: readonly Point[]): Point[] {
  // Primera pasada: vértices duplicados consecutivos.
  const deduped: Point[] = [];
  for (const p of points) {
    const prev = deduped.at(-1);
    if (prev !== undefined && near(prev, p)) continue;
    deduped.push(p);
  }
  // Segunda pasada: codos que no doblan.
  const out: Point[] = [];
  for (const p of deduped) {
    if (out.length >= 2) {
      const prev = out[out.length - 2]!;
      const cur = out.at(-1)!;
      if (collinearMiddle(prev, cur, p)) {
        out[out.length - 1] = p;
        continue;
      }
    }
    out.push(p);
  }
  return out;
}

export interface Projection {
  /** Punto proyectado, dentro del segmento (t recortado a [0, 1]). */
  point: Point;
  /** Parámetro de la proyección: 0 en `a`, 1 en `b`. */
  t: number;
  /** Distancia del punto original al proyectado. */
  distance: number;
}

/** Proyección de un punto sobre un segmento, con t recortado a los extremos. */
export function projectOnSegment(p: Point, s: Segment): Projection {
  const dx = s.b.x - s.a.x;
  const dy = s.b.y - s.a.y;
  const len2 = dx * dx + dy * dy;
  if (len2 < EPS * EPS) {
    // Segmento degenerado: el candidato es su propio punto.
    return { point: { ...s.a }, t: 0, distance: dist(p, s.a) };
  }
  const raw = ((p.x - s.a.x) * dx + (p.y - s.a.y) * dy) / len2;
  const t = Math.min(1, Math.max(0, raw));
  const point = { x: s.a.x + t * dx, y: s.a.y + t * dy };
  return { point, t, distance: dist(p, point) };
}

/** ¿El punto cae sobre el segmento (dentro de la tolerancia)? */
export function pointOnSegment(p: Point, s: Segment): boolean {
  return projectOnSegment(p, s).distance <= EPS;
}

export interface Crossing {
  point: Point;
  /** `cross`: los interiores se cruzan (X). `touch`: comparten un punto sin cruzar (T, esquina o extremo común). */
  kind: 'cross' | 'touch';
}

const crossProduct = (o: Point, a: Point, b: Point): number =>
  (a.x - o.x) * (b.y - o.y) - (a.y - o.y) * (b.x - o.x);

/** Intersección de las rectas infinitas que contienen los segmentos. */
const lineLine = (a: Segment, b: Segment): Point => {
  const a1 = a.b.y - a.a.y;
  const b1 = a.a.x - a.b.x;
  const c1 = a1 * a.a.x + b1 * a.a.y;
  const a2 = b.b.y - b.a.y;
  const b2 = b.a.x - b.b.x;
  const c2 = a2 * b.a.x + b2 * b.a.y;
  const det = a1 * b2 - a2 * b1;
  return { x: (b2 * c1 - b1 * c2) / det, y: (a1 * c2 - a2 * c1) / det };
};

/**
 * Intersección entre dos segmentos finitos. Devuelve `cross` cuando los
 * interiores se cruzan y `touch` cuando un extremo cae sobre el otro segmento
 * (T, esquina compartida, extremos coincidentes). Los colineales superpuestos
 * también devuelven `touch` (un extremo de uno cae dentro del otro): comparten
 * más que un punto, y la detección explícita de solapamiento llega con la fase
 * de derivaciones en T. Paralelos separados y segmentos que no se tocan
 * devuelven `null`.
 */
export function segmentIntersection(a: Segment, b: Segment): Crossing | null {
  const d1 = crossProduct(b.a, b.b, a.a);
  const d2 = crossProduct(b.a, b.b, a.b);
  const d3 = crossProduct(a.a, a.b, b.a);
  const d4 = crossProduct(a.a, a.b, b.b);
  if (((d1 > 0 && d2 < 0) || (d1 < 0 && d2 > 0)) && ((d3 > 0 && d4 < 0) || (d3 < 0 && d4 > 0))) {
    return { point: lineLine(a, b), kind: 'cross' };
  }
  // Sin cruce propio: tocar es que un extremo caiga sobre el otro segmento.
  for (const [p, other] of [[a.a, b], [a.b, b], [b.a, a], [b.b, a]] as const) {
    if (pointOnSegment(p, other)) return { point: { ...p }, kind: 'touch' };
  }
  return null;
}
