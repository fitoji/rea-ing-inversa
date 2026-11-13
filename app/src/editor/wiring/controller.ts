/**
 * Máquina de gestos del lienzo (fase 3 del plan de cableado, revisada en
 * `docs/WIRING_ARCHITECTURE_REVIEW.md`).
 *
 * Pura y sin React: consume eventos de puntero en coordenadas del mundo/cliente
 * y devuelve el estado siguiente con efectos declarativos que el Canvas
 * aplica. Cada gesto confirmado produce exactamente UN efecto de commit;
 * `cancel` (Escape y `pointercancel`) revierte el preview sin tocar el
 * documento. Los umbrales de movimiento evitan commits de gestos que no se
 * movieron: el clic sin arrastre es solo selección.
 */

import type { Point } from '../pins.ts';
import type { DragOp } from '../state.ts';

export type Gesture =
  | { kind: 'idle' }
  | { kind: 'panning'; startClient: Point; origin: Point }
  | { kind: 'marquee'; start: Point; current: Point; additive: boolean }
  | { kind: 'move'; start: Point; moved: boolean }
  | { kind: 'vertex'; from: Point; start: Point; moved: boolean; exclude: number[]; sheet: number }
  | { kind: 'bend'; id: number; at: Point; start: Point; moved: boolean; sheet: number };

export type Effect =
  /** Nueva vista del paneo. */
  | { type: 'pan'; x: number; y: number }
  /** Preview del gesto en curso; `null` lo limpia. */
  | { type: 'preview'; op: DragOp | null }
  /** Commit del gesto: una sola operación de deshacer. */
  | { type: 'commit'; op: DragOp }
  /** Revertir el gesto en curso sin commit. */
  | { type: 'cancel' }
  /** Selección por marquee al soltar, con el rectángulo normalizado. */
  | { type: 'select'; rect: { x1: number; y1: number; x2: number; y2: number }; additive: boolean };

export interface StepCtx {
  /** Snap de cableado (borne → junction → T → grilla), con exclusiones. */
  snap: (world: Point, exclude?: number[]) => Point;
  /** Snap de grilla para el delta del movimiento de selección. */
  grid: (n: number) => number;
}

export type GestureEvent =
  | { type: 'move'; world: Point; client: Point }
  | { type: 'up'; world: Point; client: Point }
  /** Escape o `pointercancel`: el gesto no entra al documento. */
  | { type: 'cancel' };

export const idle: Gesture = { kind: 'idle' };

export const startPan = (client: Point, origin: Point): Gesture => ({
  kind: 'panning',
  startClient: client,
  origin,
});

export const startMarquee = (world: Point, additive: boolean): Gesture => ({
  kind: 'marquee',
  start: world,
  current: world,
  additive,
});

export const startMove = (world: Point): Gesture => ({ kind: 'move', start: world, moved: false });

export const startVertex = (from: Point, world: Point, exclude: number[], sheet: number): Gesture => ({
  kind: 'vertex',
  from,
  start: world,
  moved: false,
  exclude,
  sheet,
});

export const startBend = (id: number, at: Point, world: Point, sheet: number): Gesture => ({
  kind: 'bend',
  id,
  at,
  start: world,
  moved: false,
  sheet,
});

const VERTEX_TOL = 0.5;
const BEND_TOL = 0.8;

/** Distancia entre el punto del gesto y el cursor. */
const dFrom = (g: { start: Point }, world: Point): number =>
  Math.hypot(world.x - g.start.x, world.y - g.start.y);

export function step(g: Gesture, e: GestureEvent, ctx: StepCtx): { next: Gesture; effects: Effect[] } {
  // Cancelar en reposo no hace nada; en gesto, revierte y vuelve a idle.
  if (e.type === 'cancel') {
    if (g.kind === 'idle') return { next: g, effects: [] };
    const effects: Effect[] = g.kind === 'vertex' || g.kind === 'bend' || g.kind === 'move' ? [{ type: 'cancel' }] : [];
    return { next: idle, effects };
  }
  if (g.kind === 'idle') return { next: g, effects: [] };

  if (g.kind === 'panning') {
    if (e.type !== 'move') return { next: idle, effects: [] };
    return {
      next: g,
      effects: [
        {
          type: 'pan',
          x: g.origin.x + (e.client.x - g.startClient.x),
          y: g.origin.y + (e.client.y - g.startClient.y),
        },
      ],
    };
  }

  if (g.kind === 'marquee') {
    if (e.type === 'move') return { next: { ...g, current: e.world }, effects: [] };
    return {
      next: idle,
      effects: [
        {
          type: 'select',
          rect: {
            x1: Math.min(g.start.x, g.current.x),
            y1: Math.min(g.start.y, g.current.y),
            x2: Math.max(g.start.x, g.current.x),
            y2: Math.max(g.start.y, g.current.y),
          },
          additive: g.additive,
        },
      ],
    };
  }

  if (g.kind === 'move') {
    const dx = ctx.grid(e.world.x - g.start.x);
    const dy = ctx.grid(e.world.y - g.start.y);
    if (e.type === 'move') {
      const moved = g.moved || dx !== 0 || dy !== 0;
      return { next: { ...g, moved }, effects: [{ type: 'preview', op: { kind: 'move', dx, dy } }] };
    }
    return {
      next: idle,
      effects: dx !== 0 || dy !== 0 ? [{ type: 'commit', op: { kind: 'move', dx, dy } }] : [{ type: 'cancel' }],
    };
  }

  if (g.kind === 'vertex') {
    const to = ctx.snap(e.world, g.exclude);
    const op: DragOp = { kind: 'vertex', from: g.from, to, sheet: g.sheet };
    if (e.type === 'move') {
      const moved = g.moved || dFrom(g, e.world) > VERTEX_TOL;
      return { next: { ...g, moved }, effects: [{ type: 'preview', op }] };
    }
    if (dFrom(g, e.world) <= VERTEX_TOL) return { next: idle, effects: [{ type: 'cancel' }] };
    return { next: idle, effects: [{ type: 'commit', op }] };
  }

  // Doblaz: el preview y el commit esperan el umbral; el snap de T excluye el
  // propio tramo (no deriva sobre sí mismo).
  const bendOp = (world: Point): DragOp => ({
    kind: 'bend',
    id: g.id,
    at: g.at,
    to: ctx.snap(world, [g.id]),
    sheet: g.sheet,
  });
  if (e.type === 'move') {
    if (g.moved) return { next: g, effects: [{ type: 'preview', op: bendOp(e.world) }] };
    if (dFrom(g, e.world) <= BEND_TOL) return { next: g, effects: [] };
    return { next: { ...g, moved: true }, effects: [{ type: 'preview', op: bendOp(e.world) }] };
  }
  if (dFrom(g, e.world) <= BEND_TOL) return { next: idle, effects: [{ type: 'cancel' }] };
  return { next: idle, effects: [{ type: 'commit', op: bendOp(e.world) }] };
}
