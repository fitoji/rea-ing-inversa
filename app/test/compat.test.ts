/**
 * Compatibilidad con CADe_SIMU.
 *
 * Lo único que se puede afirmar sin la app original es lo que se mide acá:
 * abrir y volver a serializar un archivo real devuelve EXACTAMENTE los mismos
 * bytes, y no se pierde ni se fusiona ningún registro. `.cad` y `.cade` se
 * tratan igual porque el contenido es el mismo formato de texto.
 *
 * Lo que NO se puede afirmar desde este repo: que CADe_SIMU acepte registros
 * que sintetizamos para códigos sin muestra real. Eso necesita Windows.
 */
import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

import { parse } from '../src/format/cade.ts';
import { buildProject, serializeProject } from '../src/model/project.ts';
import { blankDocument } from '../src/format/blank.ts';
import { createEditor, rotateSelection, select } from '../src/editor/state.ts';

const HERE = dirname(fileURLToPath(import.meta.url));
const FIXTURES = join(HERE, 'fixtures');
const CADESIMU_DIR = join(HERE, '..', '..', 'data', 'CADe_SIMU V4');

const realFiles: { name: string; text: string }[] = readdirSync(FIXTURES)
  .filter((f) => /\.(cade|cad)$/i.test(f))
  .sort()
  .map((name) => ({ name, text: readFileSync(join(FIXTURES, name), 'latin1') }));

// El archivo de la instalación original, cuando está disponible (data/ no se commitea).
const installed = join(CADESIMU_DIR, 'CADe_S1');
if (existsSync(installed)) {
  realFiles.push({ name: 'CADe_S1', text: readFileSync(installed, 'latin1') });
}

test('abrir y guardar un archivo real devuelve los mismos bytes', () => {
  for (const { name, text } of realFiles) {
    const project = buildProject(parse(text));
    assert.equal(serializeProject(project), text, `round-trip roto en ${name}`);
  }
});

test('ningún registro se pierde ni se fusiona al reabrir', () => {
  for (const { name, text } of realFiles) {
    const first = buildProject(parse(text));
    const second = buildProject(parse(serializeProject(first)));
    assert.equal(second.records.length, first.records.length, `registros distintos en ${name}`);
    assert.deepEqual(
      second.records.map((r) => [r.id, r.code, r.raw]),
      first.records.map((r) => [r.id, r.code, r.raw]),
      `registros alterados en ${name}`,
    );
  }
});

test('.cad y .cade son el mismo formato: la extensión no cambia el parseo', () => {
  const cad = realFiles.find((f) => f.name.endsWith('.cad'));
  const cade = realFiles.find((f) => f.name.endsWith('.cade'));
  assert.ok(cad && cade, 'faltan muestras .cad y .cade');
  for (const file of [cad, cade]) {
    assert.equal(parse(file.text).hasMagic, true, `${file.name} sin cabecera`);
    assert.ok(parse(file.text).records.length > 0, `${file.name} sin registros`);
  }
});

test('el documento nuevo también es estable al reabrir', () => {
  const text = blankDocument(new Date('2026-10-31T12:00:00'));
  assert.equal(serializeProject(buildProject(parse(text))), text);
});

/**
 * Ley de oro: lo que CADe_SIMU no puede leer no se escribe. La rotación es
 * visual (el formato no expone el campo de orientación), así que girar todos
 * los componentes de un archivo tiene que dejarlo byte a byte igual: si algún
 * día alguien "persiste" el giro moviendo geometría, este test lo frena.
 */
test('rotar componentes no cambia un byte del archivo', () => {
  for (const { name, text } of realFiles) {
    const ids = buildProject(parse(text))
      .records.filter((r) => r.kind === 'component')
      .map((r) => r.id);
    let state = select(createEditor(text), ids, false);
    for (let i = 0; i < 4; i++) state = rotateSelection(state);
    assert.equal(state.text, text, `rotar cambió bytes en ${name}`);
  }
});
