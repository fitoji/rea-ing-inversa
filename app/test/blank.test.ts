/**
 * Hoja en blanco: el proyecto nuevo tiene que ser un documento válido de una
 * página, no un texto vacío. Con cero registros no hay hoja y lo que se inserta
 * cae fuera de la vista.
 */
import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { parse } from '../src/format/cade.ts';
import { blankDocument, cadeDate } from '../src/format/blank.ts';
import { buildProject, drawablesOf } from '../src/model/project.ts';
import { createEditor, addComponent, projectOf } from '../src/editor/state.ts';
import { TEMPLATES } from '../src/symbols/templates.ts';

test('el documento nuevo es una hoja vacía con bloque de título', () => {
  const doc = blankDocument(new Date('2026-10-31T12:00:00'));
  const project = buildProject(parse(doc));

  assert.equal(project.hasMagic, true, 'sin cabecera CADe_SIMU');
  assert.equal(project.records.length, 1, 'sólo debe traer el bloque de título');
  assert.equal(project.sheets.length, 1, 'tiene que haber una hoja');
  assert.equal(project.sheets[0]!.titleBlock?.code, 20000);
  assert.equal(drawablesOf(project).length, 0);
});

test('la fecha del bloque de título usa el formato del CAD', () => {
  assert.equal(cadeDate(new Date('2026-10-31T12:00:00')), '31-Oct-2026');
  assert.match(blankDocument(), /\d{2}-[A-Z][a-z]{2}-\d{4}/);
});

test('lo que se inserta en un proyecto nuevo queda visible en la hoja', () => {
  let state = createEditor(blankDocument());
  state = addComponent(state, TEMPLATES[1000]!.raw, 30, 30);

  const project = projectOf(state);
  const drawn = drawablesOf(project, project.sheets[0]);
  assert.equal(drawn.length, 1, 'el componente insertado no cae en la hoja');
  assert.equal(drawn[0]!.code, 1000);
});

test('el documento nuevo no arrastra datos del archivo de origen', () => {
  const doc = blankDocument();
  assert.ok(!doc.includes('arranque-paro-motor-3f'), 'quedó el nombre del fixture');
  assert.ok(!doc.includes('CADe_S1'), 'quedó el nombre de proyecto del fixture');
});
