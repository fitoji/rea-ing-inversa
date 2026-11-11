import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parse } from '../src/format/cade.ts';
import { buildProject, GEOMETRY } from '../src/model/project.ts';
import { attachPoints } from '../src/editor/pins.ts';
import { resolveSymbol } from '../src/symbols/library.ts';
import { shapesBounds } from '../src/symbols/draw.ts';
import { designatorAt, pinLabelAt } from '../src/ui/labels.ts';

const HERE = dirname(fileURLToPath(import.meta.url));
const FIXTURE = join(HERE, 'fixtures/test01-termomag-lampara.cad');
const project = buildProject(parse(readFileSync(FIXTURE, 'latin1')));
const pins = attachPoints(project.records);

/**
 * Criterio de aceptación: la captura real de CADeSimu del fixture
 * (`data/samples/tests01/test01.png`, que no viaja al repo porque `data/` está
 * ignorado). Las medidas de abajo están en unidades del archivo, tomadas sobre
 * esa captura (6 px por unidad).
 */

const near = (a: number, b: number, tol = 0.05): boolean => Math.abs(a - b) <= tol;


test('el terminal de alimentación se dibuja anclado al origen, con su círculo encima', () => {
  for (const code of [3000, 3001]) {
    const sym = resolveSymbol(code, []);
    assert.equal(sym.anchor, 'origin', `${code} debe quedar anclado al origen`);
    const ink = shapesBounds(sym.shapes(6, 3));
    // Círculo de radio 1 con el centro 3,2 unidades por encima del origen, y
    // un hilo que baja hasta el origen (el extremo del cable).
    assert.ok(near(ink.minX, -1) && near(ink.maxX, 1), `el círculo del ${code} mide ${ink.minX}..${ink.maxX}`);
    assert.ok(near(ink.minY, -4.2), `el ${code} sube hasta ${ink.minY}`);
    assert.ok(near(ink.maxY, 0), `el ${code} baja hasta ${ink.maxY}`);
  }
});

test('el automático IN tiene dos polos sobre los bornes y el disparo sólo en el primero', () => {
  const sym = resolveSymbol(6001, ['1', '3', '2', '4']);
  assert.equal(sym.anchor, 'origin');
  const ink = shapesBounds(sym.shapes(12, 15));
  // La cuchilla sale 3 unidades a la izquierda del polo; el segundo polo está
  // 6 unidades a la derecha. El cuadrado de disparo llega a 4,42 a la izquierda.
  assert.ok(near(ink.minX, -4.42), `el automático llega a ${ink.minX}`);
  assert.ok(near(ink.maxX, 6.3), `el automático llega a ${ink.maxX}`);
  assert.ok(near(ink.minY, 0) && near(ink.maxY, 12), `el automático mide ${ink.minY}..${ink.maxY}`);

  const filled = sym.shapes(12, 15).filter((s) => s.fill);
  assert.equal(filled.length, 1, 'el detalle de disparo va sólo en el primer polo');
});

test('la lámpara se dibuja centrada en el medio de sus dos bornes', () => {
  const sym = resolveSymbol(9008, ['X1', 'X2']);
  assert.equal(sym.anchor, 'origin');
  const ink = shapesBounds(sym.shapes(9, 15));
  // Círculo de radio 2,83 con el centro 6 unidades abajo del borne de arriba.
  assert.ok(near(ink.minX, -2.83) && near(ink.maxX, 2.83), `la lámpara mide ${ink.minX}..${ink.maxX}`);
  assert.ok(near(ink.minY, 0) && near(ink.maxY, 12), `la lámpara mide ${ink.minY}..${ink.maxY}`);
});

test('los bornes de los símbolos anclados caen donde el archivo los conecta', () => {
  // El criterio real del anclaje: el símbolo tiene que estar sobre sus cables.
  for (const rec of project.records) {
    if (rec.kind !== 'component') continue;
    const sym = resolveSymbol(rec.code, rec.pins);
    if (sym.anchor !== 'origin') continue;
    const originPins = sym.originPins ?? [];
    if (originPins.length === 0) continue;
    const actual = pins.get(rec.id) ?? [];
    assert.equal(actual.length, originPins.length, `${rec.code}: ${actual.length} puntos para ${originPins.length} bornes`);
    const ox = rec.geometry[GEOMETRY.x] ?? 0;
    const oy = rec.geometry[GEOMETRY.y] ?? 0;
    const expected = originPins.map((p) => `${p.x},${p.y}`).sort();
    const got = actual.map((p) => `${p.x - ox},${p.y - oy}`).sort();
    assert.deepEqual(got, expected, `${rec.code}: los bornes no coinciden con el origen`);
  }
});

test('el rótulo del borne va a su derecha y el designador a la izquierda del símbolo', () => {
  assert.deepEqual(pinLabelAt({ x: 10, y: 20 }), { x: 11.2, y: 20.4 });
  assert.deepEqual(designatorAt({ x: 4, y: 6, w: 10, h: 12 }), { x: 2.8, y: 12 });
});

test('los símbolos que no se migraron siguen dibujándose en su caja', () => {
  // El anclaje al origen es opt-in: el resto del catálogo no se mueve.
  for (const code of [2001, 6007, 8000, 9000]) {
    const sym = resolveSymbol(code, []);
    assert.notEqual(sym.anchor, 'origin', `${code} no debería estar anclado todavía`);
  }
});
