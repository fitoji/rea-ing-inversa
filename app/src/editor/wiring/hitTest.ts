/**
 * Hit-test puro del cableado (fase 2 del plan de
 * `docs/WIRING_ARCHITECTURE.md`).
 *
 * Prioridad explícita: endpoint > segmento > componente > fondo. La tolerancia
 * llega en unidades de documento (el llamador la convierte de píxeles con la
 * escala de la vista). Las uniones de longitud cero (4001) no son objetivos de
 * golpe: su objetivo real es el punto que marcan.
 *
 * Los endpoints son apagables: el escaneo de solo segmentos del Canvas golpea
 * aun en la punta del tramo (comportamiento previo que hay que conservar).
 */

import type { CadeRecordModel } from '../../model/project.ts';
import { boundsOf } from '../../model/project.ts';
import type { Network } from '../network.ts';
import type { Point } from '../pins.ts';
import { projectOnSegment } from './geometry.ts';

export type HitTarget =
  | { kind: 'endpoint'; segmentId: number; end: 0 | 1; point: Point }
  | { kind: 'segment'; segmentId: number }
  | { kind: 'component'; componentId: number }
  | { kind: 'background' };

export interface HitContext {
  sheet: number;
  segments: Network['segments'];
  components: { id: number; bounds: { x: number; y: number; w: number; h: number } }[];
}

/** Contexto de hit-test de una hoja, construido desde los registros. */
export function hitContext(network: Network, records: CadeRecordModel[], sheet: number): HitContext {
  return {
    sheet,
    segments: network.segments,
    components: records
      .filter((rec) => rec.kind === 'component' && rec.sheet === sheet)
      .map((rec) => ({ id: rec.id, bounds: boundsOf(rec) }))
      .filter((c): c is { id: number; bounds: NonNullable<typeof c.bounds> } => c.bounds !== null),
  };
}

export interface HitOptions {
  /** Incluye los extremos de los tramos como objetivos (por defecto, sí). */
  endpoints?: boolean;
}

/**
 * ¿El tramo llega por borne a esta caja? Un extremo dentro de la caja (borde
 * incluido) significa que el cable conecta ahí: es el caso de las terminales
 * de alimentación, cuya tinta vive pegada al cable que las alimenta. Un tramo
 * que solo pasa cerca o cruza la caja sin meter un extremo adentro no cuenta:
 * sigue ganando el cable, como siempre.
 */
export function segmentAttachedTo(
  segment: { x1: number; y1: number; x2: number; y2: number },
  bounds: { x: number; y: number; w: number; h: number },
): boolean {
  const inside = (x: number, y: number): boolean =>
    x >= bounds.x && x <= bounds.x + bounds.w && y >= bounds.y && y <= bounds.y + bounds.h;
  return inside(segment.x1, segment.y1) || inside(segment.x2, segment.y2);
}

export function hitTest(world: Point, ctx: HitContext, tolerance: number, options: HitOptions = {}): HitTarget {
  const tol2 = tolerance * tolerance;
  const wantEndpoints = options.endpoints ?? true;

  // 1. Endpoint más cercano dentro de la tolerancia.
  if (wantEndpoints) {
    let best: { segmentId: number; end: 0 | 1; point: Point; d2: number } | null = null;
    for (const seg of ctx.segments.values()) {
      if (seg.sheet !== ctx.sheet) continue;
      const { x1, y1, x2, y2 } = seg.points;
      if (x1 === x2 && y1 === y2) continue; // unión 4001: sin extremos de golpe
      for (const [end, p] of [
        [0, { x: x1, y: y1 }],
        [1, { x: x2, y: y2 }],
      ] as const) {
        const d2 = (p.x - world.x) ** 2 + (p.y - world.y) ** 2;
        if (d2 <= tol2 && (best === null || d2 < best.d2)) best = { segmentId: seg.id, end, point: p, d2 };
      }
    }
    if (best) return { kind: 'endpoint', segmentId: best.segmentId, end: best.end, point: best.point };
  }

  // 2. Segmento más cercano dentro de la tolerancia.
  let bestSegment: { id: number; d2: number } | null = null;
  for (const seg of ctx.segments.values()) {
    if (seg.sheet !== ctx.sheet) continue;
    const s = { a: { x: seg.points.x1, y: seg.points.y1 }, b: { x: seg.points.x2, y: seg.points.y2 } };
    if (s.a.x === s.b.x && s.a.y === s.b.y) continue;
    const proj = projectOnSegment(world, s);
    const d2 = proj.distance * proj.distance;
    if (d2 <= tol2 && (bestSegment === null || d2 < bestSegment.d2)) bestSegment = { id: seg.id, d2 };
  }
  if (bestSegment) return { kind: 'segment', segmentId: bestSegment.id };

  // 3. Componente cuya caja contiene el punto (el orden del archivo decide).
  for (const c of ctx.components) {
    const b = c.bounds;
    if (world.x >= b.x && world.x <= b.x + b.w && world.y >= b.y && world.y <= b.y + b.h) {
      return { kind: 'component', componentId: c.id };
    }
  }

  // 4. Fondo.
  return { kind: 'background' };
}
