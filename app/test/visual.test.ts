import { test } from 'node:test';
import assert from 'node:assert/strict';
import { visualStateOf, type VisualContext } from '../src/sim/visual.ts';

function ctx(over: Partial<VisualContext> = {}): VisualContext {
  return {
    simulating: true,
    live: new Set<number>(),
    closed: new Set<number>(),
    pressed: new Set<number>(),
    ...over,
  };
}

const rec = (id: number, code: number) => ({ id, code, pins: [] as string[] });

test('sin simulación todos los componentes están en reposo', () => {
  const c = ctx({ simulating: false, live: new Set([1]), closed: new Set([2]) });
  assert.equal(visualStateOf(rec(1, 9000), c), 'idle');
  assert.equal(visualStateOf(rec(2, 7000), c), 'idle');
});

test('bobina energizada queda activa; el temporizador queda en timing', () => {
  const c = ctx({ live: new Set([1, 2]) });
  assert.equal(visualStateOf(rec(1, 9000), c), 'active');
  assert.equal(visualStateOf(rec(2, 9004), c), 'timing');
});

test('lámpara fija activa e intermitente en flashing', () => {
  const c = ctx({ live: new Set([1, 2]) });
  assert.equal(visualStateOf(rec(1, 9008), c), 'active');
  assert.equal(visualStateOf(rec(2, 9009), c), 'flashing');
});

test('motor energizado queda activo', () => {
  assert.equal(visualStateOf(rec(1, 1000), ctx({ live: new Set([1]) })), 'active');
});

test('contacto cerrado/abierto según el solver', () => {
  const c = ctx({ closed: new Set([1]) });
  assert.equal(visualStateOf(rec(1, 7000), c), 'closed');
  assert.equal(visualStateOf(rec(2, 7001), c), 'open');
});

test('pulsador presionado gana sobre el resto', () => {
  const c = ctx({ pressed: new Set([1]), live: new Set([1]) });
  assert.equal(visualStateOf(rec(1, 8000), c), 'pressed');
});

test('pulsador NA en reposo está abierto; NC está cerrado', () => {
  const c = ctx();
  assert.equal(visualStateOf(rec(1, 8000), c), 'open');
  assert.equal(visualStateOf(rec(2, 8001), c), 'closed');
});

test('protección disparada', () => {
  const c = ctx({ tripped: new Set([1]) });
  assert.equal(visualStateOf(rec(1, 6007), c), 'tripped');
});
