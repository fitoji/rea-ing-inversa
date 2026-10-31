/**
 * Líneas y regletas del catálogo (4xxx).
 *
 * Los cables no son componentes: el formato los guarda como conexiones de dos
 * puntos. Las regletas y conectores (4011-4017) sí son componentes con bornes y
 * se clasifican distinto del cable, aunque compartan rango numérico.
 */
import { test } from 'node:test';
import { strict as assert } from 'node:assert';

import { parse } from '../src/format/cade.ts';
import { buildProject, classify, drawablesOf } from '../src/model/project.ts';
import { createEditor, addWire, projectOf } from '../src/editor/state.ts';
import { blankDocument } from '../src/format/blank.ts';
import { WIRE_TEMPLATES, WIRE_CODES } from '../src/symbols/templates.ts';
import { lineList, symbolFor } from '../src/symbols/library.ts';

test('los cables se clasifican como conexión y las regletas como componente', () => {
  for (const code of WIRE_CODES) assert.equal(classify(code), 'connection', `cable ${code}`);
  assert.equal(classify(4011), 'component', 'regleta cuadrada');
  assert.equal(classify(4016), 'component', 'regleta de 3 vías');
});

test('todo cable con plantilla aparece en la paleta de líneas', () => {
  const codes = lineList().map((s) => s.code).sort((a, b) => a - b);
  assert.deepEqual(codes, [...WIRE_CODES].sort((a, b) => a - b));
});

test('las regletas tienen símbolo y se pueden insertar', () => {
  for (const code of [4011, 4012, 4013, 4014, 4015, 4016]) {
    assert.ok(symbolFor(code), `falta el símbolo de la regleta ${code}`);
  }
});

test('insertar un cable agrega un tramo entre dos puntos', () => {
  let state = createEditor(blankDocument());
  state = addWire(state, { x: 30, y: 60 }, { x: 42, y: 60 }, WIRE_TEMPLATES[4000]!);

  const project = projectOf(state);
  const drawn = drawablesOf(project, project.sheets[0]);
  assert.equal(drawn.length, 1);
  assert.equal(drawn[0]!.kind, 'connection');
  assert.equal(drawn[0]!.code, 4000);
  assert.equal(drawn[0]!.geometry[8], 30);
  assert.equal(drawn[0]!.geometry[9], 60);
  assert.equal(drawn[0]!.geometry[10], 42);
  assert.equal(drawn[0]!.geometry[11], 60);
});

test('el cable insertado vuelve a parsearse con el mismo código', () => {
  let state = createEditor(blankDocument());
  state = addWire(state, { x: 10, y: 20 }, { x: 22, y: 20 }, WIRE_TEMPLATES[4019]!);
  const records = buildProject(parse(state.text)).records;
  assert.equal(records.length, 2, 'hoja + cable');
  assert.equal(records[1]!.code, 4019);
});
