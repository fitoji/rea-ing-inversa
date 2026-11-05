#!/usr/bin/env node
/**
 * Genera `test/fixtures/inversion-giro-mini.cade`: una inversión de giro mínima
 * con dos bobinas, enclavamiento propio y NC cruzado. Los bytes salen de
 * `templateForPlacement()` y `WIRE_TEMPLATES`, igual que `make-demo.ts`.
 *
 *   L → PARO → A ─┬─ S1 ── NC(KM2) ── bobina KM1 ─ N
 *                 ├─ KM1 ─┘
 *                 ├─ S2 ── NC(KM1) ── bobina KM2 ─ N
 *                 └─ KM2 ─┘
 *
 * Uso: node scripts/make-inversion-demo.ts
 */
import { writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { blankDocument } from '../src/format/blank.ts';
import { addComponent, addWire, createEditor, projectOf, setDesignator, type EditorState } from '../src/editor/state.ts';
import { GEOMETRY } from '../src/model/project.ts';
import { templateForPlacement } from '../src/symbols/place.ts';
import { WIRE_TEMPLATES } from '../src/symbols/templates.ts';
import { circuitFrom } from '../src/sim/circuit.ts';
import { simulate } from '../src/sim/solver.ts';

const HERE = dirname(fileURLToPath(import.meta.url));
const OUT = join(HERE, '..', 'test', 'fixtures', 'inversion-giro-mini.cade');

function place(state: EditorState, code: number, x: number, y: number): EditorState {
  const template = templateForPlacement(code);
  if (!template) throw new Error(`sin plantilla para ${code}`);
  return addComponent(state, template, x, y);
}

function wire(state: EditorState, from: [number, number], to: [number, number], code: number): EditorState {
  const template = WIRE_TEMPLATES[code];
  if (!template) throw new Error(`sin plantilla de cable ${code}`);
  return addWire(state, { x: from[0], y: from[1] }, { x: to[0], y: to[1] }, template);
}

function idOf(state: EditorState, before: Set<number>): number {
  const added = projectOf(state).records.find((r) => !before.has(r.id));
  if (!added) throw new Error('no se pudo colocar el componente');
  return added.id;
}

let state = createEditor(blankDocument(new Date('2026-11-05')));
const ids: Record<string, number> = {};

const put = (name: string, code: number, x: number, y: number): void => {
  const before = new Set(projectOf(state).records.map((r) => r.id));
  state = place(state, code, x, y);
  ids[name] = idOf(state, before);
};

// Alimentación
put('L', 3000, 30, 54);
put('N', 3001, 30, 112);
// Mando común
put('paro', 8001, 48, 54);
// Rama 1
put('s1', 8000, 90, 66);
put('aux1', 7000, 114, 66);
put('nc2', 7001, 90, 84);
put('km1', 9000, 90, 100);
// Rama 2
put('s2', 8000, 150, 66);
put('aux2', 7000, 174, 66);
put('nc1', 7001, 150, 84);
put('km2', 9000, 150, 100);

for (const [name, designator] of [
  ['paro', '-S0'],
  ['s1', '-S1'],
  ['s2', '-S2'],
  ['aux1', '-KM1'],
  ['aux2', '-KM2'],
  ['nc1', '-KM1'],
  ['nc2', '-KM2'],
  ['km1', '-KM1'],
  ['km2', '-KM2'],
] as const) {
  state = setDesignator(state, ids[name]!, designator);
}

// L → PARO
state = wire(state, [30, 54], [48, 54], 4000);
// PARO → bus A (y=64) con stubs a cada componente
state = wire(state, [48, 66], [48, 64], 4000);
state = wire(state, [48, 64], [90, 64], 4000);
state = wire(state, [90, 64], [114, 64], 4000);
state = wire(state, [114, 64], [150, 64], 4000);
state = wire(state, [150, 64], [174, 64], 4000);
state = wire(state, [90, 64], [90, 66], 4000); // S1
state = wire(state, [114, 64], [114, 66], 4000); // aux1
state = wire(state, [150, 64], [150, 66], 4000); // S2
state = wire(state, [174, 64], [174, 66], 4000); // aux2
// Rama 1: S1 → NC(KM2) → bobina KM1
state = wire(state, [90, 78], [90, 84], 4000);
state = wire(state, [114, 78], [114, 84], 4000);
state = wire(state, [114, 84], [90, 84], 4000);
state = wire(state, [90, 96], [90, 100], 4000);
// Rama 2: S2 → NC(KM1) → bobina KM2
state = wire(state, [150, 78], [150, 84], 4000);
state = wire(state, [174, 78], [174, 84], 4000);
state = wire(state, [174, 84], [150, 84], 4000);
state = wire(state, [150, 96], [150, 100], 4000);
// Neutro: los bornes inferiores de las bobinas tocan el riel de N.
state = wire(state, [30, 112], [90, 112], 4010);
state = wire(state, [90, 112], [150, 112], 4010);

const project = projectOf(state);
const sheet = project.sheets[0]!;
const built = circuitFrom(project.records.slice(sheet.startRecord, sheet.endRecord));
if (!built) throw new Error('el circuito no se arma');

const s1 = built.circuit.devices.find((d) => d.part === 'S1');
const s2 = built.circuit.devices.find((d) => d.part === 'S2');
if (!s1 || !s2) throw new Error('faltan los pulsadores');

const km1 = simulate(built.circuit, { pressed: new Set([s1.id]) });
const km2 = simulate(built.circuit, { pressed: new Set([s2.id]) });
const cross = simulate(built.circuit, { pressed: new Set([s2.id]), initialEnergized: km1.energized });

const ok =
  km1.energized.has('KM1') &&
  !km1.energized.has('KM2') &&
  km2.energized.has('KM2') &&
  !km2.energized.has('KM1') &&
  cross.energized.has('KM1') &&
  !cross.energized.has('KM2');
if (!ok) {
  console.log('KM1', [...km1.energized], 'KM2', [...km2.energized], 'cruzado', [...cross.energized]);
  console.log('devices', built.circuit.devices.map((d) => `${d.id}:${d.kind}:${d.part}`).join(' '));
  throw new Error('la simulación no cumple el enclavamiento esperado');
}

writeFileSync(OUT, state.text);
console.log(`escrito ${OUT} (${state.text.length} bytes)`);
console.log(project.records.map((r) => `${r.id}:${r.code}${r.designator ? ' ' + r.designator : ''}`).join(' '));
