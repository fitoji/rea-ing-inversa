#!/usr/bin/env node
/**
 * Genera `test/fixtures/luz-con-interruptor.cade`: el circuito mínimo para
 * probar la simulación (un pulsador que hace de interruptor y una lámpara).
 *
 * No inventa bytes: cada componente sale de `templateForPlacement()` y cada
 * cable de `WIRE_TEMPLATES`, que clonan registros que CADe_SIMU escribió. La
 * disposición es la mínima que el modelo entiende:
 *
 *   Alimentación L ──4000── [pulsador] ──4000── [lámpara] ──4010── Alimentación N
 *
 * La fase lleva dos tramos para que el respaldo por código elija su red y no la
 * del tramo conmutado.
 *
 * Uso: node scripts/make-demo.ts
 */
import { writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { blankDocument } from '../src/format/blank.ts';
import { addComponent, addWire, createEditor, projectOf, setDesignator, type EditorState } from '../src/editor/state.ts';
import { GEOMETRY } from '../src/model/project.ts';
import { templateForPlacement } from '../src/symbols/place.ts';
import { WIRE_TEMPLATES } from '../src/symbols/templates.ts';

const HERE = dirname(fileURLToPath(import.meta.url));
const OUT = join(HERE, '..', 'test', 'fixtures', 'luz-con-interruptor.cade');

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

/**
 * Bornes de un componente de dos bornes.
 *
 * Regla verificada sobre los fixtures (L2/L7): van sobre el borde izquierdo de
 * la caja, en la fila superior (y) y en la inferior (y + alto - 3), sobre la
 * grilla de 6.
 */
function twoPinsOf(state: EditorState, id: number): { x: number; y: number }[] {
  const rec = projectOf(state).records.find((r) => r.id === id);
  if (!rec) return [];
  const x = rec.geometry[GEOMETRY.x] ?? 0;
  const y = rec.geometry[GEOMETRY.y] ?? 0;
  const h = rec.geometry[GEOMETRY.height] ?? 0;
  return [
    { x, y },
    { x, y: y + h - 3 },
  ];
}

// Fecha fija: el archivo se versiona y regenerarlo no debe cambiar los bytes.
let state = createEditor(blankDocument(new Date('2026-11-03')));
const codes: Record<string, number> = {};

// Alimentación, pulsador y lámpara, separados para que se lea.
for (const [name, code, x, y] of [
  ['live', 3000, 30, 54],
  ['switch', 8000, 72, 54],
  ['lamp', 8016, 120, 54],
  ['neutral', 3001, 30, 96],
] as const) {
  const before = new Set(projectOf(state).records.map((r) => r.id));
  state = place(state, code, x, y);
  const added = projectOf(state).records.find((r) => !before.has(r.id));
  if (!added) throw new Error(`no se pudo colocar ${name}`);
  codes[name] = added.id;
}

// Designadores legibles: -S para el pulsador, -H para la lámpara.
state = setDesignator(state, codes.switch!, '-S1');
state = setDesignator(state, codes.lamp!, '-H1');

const sw = twoPinsOf(state, codes.switch!);
const lamp = twoPinsOf(state, codes.lamp!);
if (sw.length < 2 || lamp.length < 2) throw new Error(`bornes insuficientes: switch ${sw.length}, lámpara ${lamp.length}`);

// Fase en L hasta el pulsador (dos tramos 4000: así el respaldo elige esta red).
state = wire(state, [30, 54], [51, 54], 4000);
state = wire(state, [51, 54], [sw[0]!.x, sw[0]!.y], 4000);
// Conmutado: del pulsador a la lámpara, en la misma fila que el borne inferior.
state = wire(state, [sw[1]!.x, sw[1]!.y], [lamp[1]!.x, lamp[1]!.y], 4000);
// Retorno: sale por arriba y baja por la derecha, para no cruzar ni tocar el
// otro borne de la lámpara (un cable que pasa por un borne genera un aviso).
state = wire(state, [lamp[0]!.x, lamp[0]!.y], [lamp[0]!.x + 15, lamp[0]!.y], 4010);
state = wire(state, [lamp[0]!.x + 15, lamp[0]!.y], [lamp[0]!.x + 15, 96], 4010);
state = wire(state, [lamp[0]!.x + 15, 96], [30, 96], 4010);

writeFileSync(OUT, state.text);
console.log(`escrito ${OUT} (${state.text.length} bytes)`);
console.log(
  projectOf(state)
    .records.map((r) => `${r.id}:${r.code}${r.designator ? ' ' + r.designator : ''}`)
    .join(' '),
);
