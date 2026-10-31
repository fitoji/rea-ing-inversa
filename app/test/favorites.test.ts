/** Favoritos de la paleta: lectura tolerante de lo guardado en el navegador. */
import { test } from 'node:test';
import { strict as assert } from 'node:assert';

import { parseFavorites } from '../src/ui/favorites.ts';

test('sin nada guardado no hay favoritos', () => {
  assert.deepEqual(parseFavorites(null), []);
  assert.deepEqual(parseFavorites(''), []);
});

test('un JSON roto no rompe la paleta', () => {
  assert.deepEqual(parseFavorites('{no es json'), []);
  assert.deepEqual(parseFavorites('"1000"'), []);
  assert.deepEqual(parseFavorites('{"a":1}'), []);
});

test('descarta valores que no son códigos y quita duplicados', () => {
  assert.deepEqual(parseFavorites('[1000,"2001",-3,0,1000,1.5,6003]'), [1000, 6003]);
});
