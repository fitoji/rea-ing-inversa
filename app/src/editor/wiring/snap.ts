/**
 * Snap priorizado del cableado (fase 2 del plan de
 * `docs/WIRING_ARCHITECTURE.md`, revisada en `docs/WIRING_ARCHITECTURE_REVIEW.md`).
 *
 * Prioridad: pin → junction existente → segmento apto para derivación en T →
 * cuadrícula. La tolerancia llega en unidades de documento (el llamador
 * convierte de píxeles con la escala de la vista) para que el snap se sienta
 * igual a cualquier zoom. El snap magnético es siempre activo: la grilla solo
 * define el paso del punto de reserva.
 *
 * Contexto: los bornes se derivan con `attachPoints` de los registros de la
 * hoja activa (misma fuente que usa el Canvas); junction y segmentos se
 * filtran por hoja aquí.
 */

import type { CadeRecordModel } from '../../model/project.ts';
import type { Network, NetSegment } from '../network.ts';
import { attachPoints, type Point } from '../pins.ts';
import { EPS, dist, projectOnSegment } from './geometry.ts';

export type SnapTarget =
  /** Borne de componente: identidad estable (componente + índice de borne). */
  | { kind: 'pin'; componentId: number; pinIndex: number; point: Point }
  /** Punto de unión declarado por un registro 4001. */
  | { kind: 'junction'; point: Point }
  /** Interior de un tramo apto para derivación. */
  | { kind: 'tee'; segmentId: number; point: Point }
  /** Punto de reserva: grilla. */
  | { kind: 'grid'; point: Point };

export interface SnapContext {
  sheet: number;
  pins: Map<number, Point[]>;
  junctions: (Point & { sheet: number })[];
  segments: Map<number, NetSegment>;
}

/** Contexto de snap de una hoja: bornes de sus propios registros. */
export function snapContext(network: Network, records: CadeRecordModel[], sheet: number): SnapContext {
  return {
    sheet,
    pins: attachPoints(records.filter((rec) => rec.sheet === sheet)),
    junctions: network.junctionPoints,
    segments: network.segments,
  };
}

/** Distancia mínima al extremo del tramo para que la T sea una derivación. */
const INTERIOR_MARGIN = 1;

const snapTo = (n: number, step: number): number => Math.round(n / step) * step;
const clamp = (n: number, lo: number, hi: number): number => Math.min(hi, Math.max(lo, n));

/**
 * Objetivo de snap para un punto del mundo. `exclude` lista los ids de tramos
 * que no son candidatos a T (el tramo que se está editando no deriva sobre sí
 * mismo).
 */
export function snapTarget(
  world: Point,
  ctx: SnapContext,
  tolerance: number,
  gridStep: number,
  exclude: number[] = [],
): SnapTarget {
  const tol2 = tolerance * tolerance;

  // 1. Borne más cercano dentro de la tolerancia.
  let bestPin: { componentId: number; pinIndex: number; point: Point; d2: number } | null = null;
  for (const [componentId, list] of ctx.pins) {
    for (let pinIndex = 0; pinIndex < list.length; pinIndex++) {
      const p = list[pinIndex]!;
      const d2 = (p.x - world.x) ** 2 + (p.y - world.y) ** 2;
      if (d2 <= tol2 && (bestPin === null || d2 < bestPin.d2)) {
        bestPin = { componentId, pinIndex, point: p, d2 };
      }
    }
  }
  if (bestPin) return { kind: 'pin', componentId: bestPin.componentId, pinIndex: bestPin.pinIndex, point: { ...bestPin.point } };

  // 2. Junction existente (4001) en la misma hoja.
  let bestJunction: { point: Point; d2: number } | null = null;
  for (const j of ctx.junctions) {
    if (j.sheet !== ctx.sheet) continue;
    const d2 = (j.x - world.x) ** 2 + (j.y - world.y) ** 2;
    if (d2 <= tol2 && (bestJunction === null || d2 < bestJunction.d2)) {
      bestJunction = { point: { x: j.x, y: j.y }, d2 };
    }
  }
  if (bestJunction) return { kind: 'junction', point: bestJunction.point };

  // 3. Derivación en T: proyección sobre el interior de un tramo.
  let bestTee: { segmentId: number; point: Point; d2: number } | null = null;
  for (const seg of ctx.segments.values()) {
    if (seg.sheet !== ctx.sheet || exclude.includes(seg.id)) continue;
    const s = { a: { x: seg.points.x1, y: seg.points.y1 }, b: { x: seg.points.x2, y: seg.points.y2 } };
    if (dist(s.a, s.b) < EPS) continue; // unión 4001: no es tramo
    const proj = projectOnSegment(world, s);
    if (proj.distance > tolerance) continue;
    // Los extremos del tramo no derivan: ahí el objetivo es otro (pin u otro tramo).
    if (dist(proj.point, s.a) <= INTERIOR_MARGIN + EPS || dist(proj.point, s.b) <= INTERIOR_MARGIN + EPS) continue;
    // El eje libre de la T cae en la grilla; el eje del tramo queda clavado en
    // la línea (un punto fuera de ella no conecta).
    const horizontal = Math.abs(s.a.y - s.b.y) < EPS;
    const vertical = Math.abs(s.a.x - s.b.x) < EPS;
    let point: Point;
    if (horizontal) {
      const lo = Math.min(s.a.x, s.b.x) + INTERIOR_MARGIN;
      const hi = Math.max(s.a.x, s.b.x) - INTERIOR_MARGIN;
      point = { x: clamp(snapTo(world.x, gridStep), lo, hi), y: s.a.y };
    } else if (vertical) {
      const lo = Math.min(s.a.y, s.b.y) + INTERIOR_MARGIN;
      const hi = Math.max(s.a.y, s.b.y) - INTERIOR_MARGIN;
      point = { x: s.a.x, y: clamp(snapTo(world.y, gridStep), lo, hi) };
    } else {
      // Tramo no ortogonal (archivo ajeno): la proyección tal cual.
      point = proj.point;
    }
    const d2 = proj.distance * proj.distance;
    if (bestTee === null || d2 < bestTee.d2) bestTee = { segmentId: seg.id, point, d2 };
  }
  if (bestTee) return { kind: 'tee', segmentId: bestTee.segmentId, point: bestTee.point };

  // 4. Cuadrícula.
  return { kind: 'grid', point: { x: snapTo(world.x, gridStep), y: snapTo(world.y, gridStep) } };
}
