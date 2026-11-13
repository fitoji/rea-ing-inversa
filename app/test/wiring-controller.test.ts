/**
 * Máquina de gestos del lienzo (fase 3 del plan de cableado).
 *
 * Contrato: cada gesto confirmado produce UNA acción de commit; Escape y
 * pointercancel cancelan sin tocar el documento; los umbrales de movimiento
 * evitan commits de gestos que no se movieron.
 */
import { test } from 'node:test';
import { strict as assert } from 'node:assert';

import {
  idle,
  startBend,
  startMarquee,
  startMove,
  startPan,
  startVertex,
  step,
} from '../src/editor/wiring/controller.ts';
import type { Point } from '../src/editor/pins.ts';

const pt = (x: number, y: number): Point => ({ x, y });
const snap = (p: Point): Point => ({ x: Math.round(p.x), y: Math.round(p.y) });
const ctx = { snap: (p: Point) => snap(p), grid: (n: number) => Math.round(n / 3) * 3 };

test('el arrastre de vértice confirmado hace un solo commit', () => {
  let g = startVertex(pt(10, 10), pt(10, 10), [5], 0);
  const m1 = step(g, { type: 'move', world: pt(12, 10), client: pt(12, 10) }, ctx);
  g = m1.next;
  assert.equal(g.kind, 'vertex');
  if (g.kind === 'vertex') assert.ok(g.moved);
  const up = step(g, { type: 'up', world: pt(15, 10), client: pt(15, 10) }, ctx);
  assert.equal(up.next.kind, 'idle');
  const commits = up.effects.filter((e) => e.type === 'commit');
  assert.equal(commits.length, 1);
});

test('el clic sin arrastre no commitea: solo cancela el preview', () => {
  const g = startVertex(pt(10, 10), pt(10, 10), [5], 0);
  const up = step(g, { type: 'up', world: pt(10.2, 10), client: pt(10.2, 10) }, ctx);
  assert.equal(up.next.kind, 'idle');
  assert.equal(up.effects.filter((e) => e.type === 'commit').length, 0);
  assert.deepEqual(up.effects, [{ type: 'cancel' }]);
});

test('Escape durante un arrastre de vértice cancela sin commit', () => {
  let g = startVertex(pt(10, 10), pt(10, 10), [5], 0);
  g = step(g, { type: 'move', world: pt(20, 20), client: pt(20, 20) }, ctx).next;
  const esc = step(g, { type: 'cancel' }, ctx);
  assert.equal(esc.next.kind, 'idle');
  assert.deepEqual(esc.effects, [{ type: 'cancel' }]);
  assert.equal(esc.effects.filter((e) => e.type === 'commit').length, 0);
});

test('pointercancel se trata igual que Escape: cancela, no confirma', () => {
  let g = startBend(7, pt(30, 60), pt(30, 60), 0);
  g = step(g, { type: 'move', world: pt(40, 60), client: pt(40, 60) }, ctx).next;
  const cancelled = step(g, { type: 'cancel' }, ctx);
  assert.equal(cancelled.next.kind, 'idle');
  assert.equal(cancelled.effects.filter((e) => e.type === 'commit').length, 0);
});

test('el doblez por debajo del umbral no manda preview ni commitea', () => {
  let g = startBend(7, pt(30, 60), pt(30, 60), 0);
  const small = step(g, { type: 'move', world: pt(30.5, 60), client: pt(30.5, 60) }, ctx);
  assert.equal(small.effects.length, 0);
  g = small.next;
  const up = step(g, { type: 'up', world: pt(30.6, 60), client: pt(30.6, 60) }, ctx);
  assert.deepEqual(up.effects, [{ type: 'cancel' }]);
});

test('el doblez confirmado excluye su propio tramo del snap de T', () => {
  let g = startBend(7, pt(30, 60), pt(30, 60), 0);
  let seen: number[] | undefined;
  const spyCtx = {
    snap: (p: Point, exclude?: number[]) => {
      seen = exclude;
      return p;
    },
    grid: ctx.grid,
  };
  const out = step(g, { type: 'move', world: pt(45, 60), client: pt(45, 60) }, spyCtx);
  assert.deepEqual(seen, [7]);
  const preview = out.effects[0]!;
  if (preview.type === 'preview') {
    assert.equal(preview.op?.kind, 'bend');
    if (preview.op?.kind === 'bend') assert.equal(preview.op.id, 7);
  } else {
    assert.fail('se esperaba un preview');
  }
});

test('el movimiento de selección snapea el delta a la grilla y commitea una vez', () => {
  let g = startMove(pt(10, 10));
  const m = step(g, { type: 'move', world: pt(11, 12), client: pt(11, 12) }, ctx);
  const preview = m.effects[0]!;
  if (preview.type === 'preview' && preview.op?.kind === 'move') {
    // 1 y 2 sobre grilla de 3: el eje x no llega al paso, el y sí.
    assert.equal(preview.op.dx, 0);
    assert.equal(preview.op.dy, 3);
  } else {
    assert.fail('se esperaba un preview de movimiento');
  }
  g = m.next;
  const up = step(g, { type: 'up', world: pt(11, 12), client: pt(11, 12) }, ctx);
  assert.equal(up.effects.filter((e) => e.type === 'commit').length, 1);
});

test('el paneo mueve la vista y termina al soltar', () => {
  let g = startPan(pt(100, 100), pt(5, 7));
  const m = step(g, { type: 'move', world: pt(0, 0), client: pt(140, 90) }, ctx);
  const pan = m.effects[0]!;
  if (pan.type === 'pan') {
    assert.equal(pan.x, 45);
    assert.equal(pan.y, -3);
  } else {
    assert.fail('se esperaba un efecto de paneo');
  }
  g = m.next;
  const up = step(g, { type: 'up', world: pt(0, 0), client: pt(150, 90) }, ctx);
  assert.equal(up.next.kind, 'idle');
  assert.equal(up.effects.length, 0);
});

test('la marquee selecciona el rectángulo normalizado al soltar', () => {
  let g = startMarquee(pt(20, 30), false);
  g = step(g, { type: 'move', world: pt(10, 25), client: pt(10, 25) }, ctx).next;
  const up = step(g, { type: 'up', world: pt(10, 25), client: pt(10, 25) }, ctx);
  const sel = up.effects[0]!;
  assert.equal(sel.type, 'select');
  if (sel.type === 'select') {
    assert.deepEqual(sel.rect, { x1: 10, y1: 25, x2: 20, y2: 30 });
    assert.equal(sel.additive, false);
  }
});

test('cancelar en reposo no hace nada', () => {
  const out = step(idle, { type: 'cancel' }, ctx);
  assert.equal(out.next.kind, 'idle');
  assert.deepEqual(out.effects, []);
});
