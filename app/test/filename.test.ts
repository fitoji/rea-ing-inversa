/**
 * El nombre con el que se guarda un esquema.
 *
 * Regla del producto: se guarda **siempre** `.cad`. Los `.cade` se abren sin
 * problema y al guardarlos quedan como `.cad`, que es el mismo formato con otra
 * extensión. Este test fija esa regla antes de que exista la función.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';

import { SAVE_EXTENSION, cadFileName } from '../src/format/filename.ts';

test('la extensión de guardado es .cad', () => {
  assert.equal(SAVE_EXTENSION, '.cad');
});

test('un .cade se guarda como .cad', () => {
  assert.equal(cadFileName('inversion-giro-cej.cade'), 'inversion-giro-cej.cad');
  assert.equal(cadFileName('luz-con-interruptor.cade'), 'luz-con-interruptor.cad');
});

test('un .cad conserva su nombre', () => {
  assert.equal(cadFileName('arranque-paro-motor-3f.cad'), 'arranque-paro-motor-3f.cad');
  assert.equal(cadFileName('luz_verde.cad'), 'luz_verde.cad');
});

test('la extensión se normaliza sin importar mayúsculas', () => {
  assert.equal(cadFileName('ESQUEMA.CADE'), 'ESQUEMA.cad');
  assert.equal(cadFileName('ESQUEMA.CAD'), 'ESQUEMA.cad');
});

test('un nombre sin extensión recibe .cad', () => {
  assert.equal(cadFileName('esquema'), 'esquema.cad');
  assert.equal(cadFileName('mi.tablero'), 'mi.tablero.cad');
});

test('un nombre vacío cae en el nombre por defecto', () => {
  assert.equal(cadFileName(''), 'sin título.cad');
  assert.equal(cadFileName('   '), 'sin título.cad');
  assert.equal(cadFileName('sin título.cade'), 'sin título.cad');
});

test('sólo se toca la extensión final', () => {
  assert.equal(cadFileName('a.b.cade'), 'a.b.cad');
  assert.equal(cadFileName('panel.cad.viejo'), 'panel.cad.viejo.cad');
});
