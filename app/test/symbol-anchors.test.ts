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
  // 6 unidades a la derecha. El cuadrado de disparo (media diagonal 1,35,
  // inclinado 18°) llega a 4,24 a la izquierda. El guion del segundo polo va
  // hacia el centro, así que no sale por la derecha del segundo polo.
  assert.ok(near(ink.minX, -4.24), `el automático llega a ${ink.minX}`);
  assert.ok(near(ink.maxX, 6), `el automático llega a ${ink.maxX}`);
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

test('el pulsador NA (8000) va anclado al origen, vertical, como lo dibuja CADeSimu', () => {
  const sym = resolveSymbol(8000, ['13', '14']);
  assert.equal(sym.anchor, 'origin', 'el 8000 migró a anclaje al origen');
  assert.deepEqual(sym.originPins, [
    { name: '13', x: 0, y: 0 },
    { name: '14', x: 0, y: 12 },
  ]);

  // Medido sobre docs/cadesimu-svg/reference/PR1_Rodolfo_Giusti_03.png
  // (4 px por unidad), S1 en (66,123): tramo superior (0,-6)→(0,-3.25),
  // paleta (−3,−3)→(0,+3) con pivote en (0,+3), tramo inferior hasta +5.75,
  // corchete del operador en x=−6 y guion (−3,0)→(−1.5,0) apoyado en la paleta.
  const shapes = sym.shapes(9, 15);
  const ink = shapesBounds(shapes);
  assert.ok(near(ink.minX, -6) && near(ink.maxX, 0), `el NA mide ${ink.minX}..${ink.maxX} de ancho`);
  assert.ok(near(ink.minY, -6) && near(ink.maxY, 5.75), `el NA mide ${ink.minY}..${ink.maxY} de alto`);

  const blade = shapes.find((s) => s.blade);
  assert.ok(blade, 'la paleta del NA es móvil');
  const m = /M(-?[\d.]+) (-?[\d.]+)L(-?[\d.]+) (-?[\d.]+)/.exec(blade.d)!;
  assert.deepEqual([Number(m[1]), Number(m[2])], [0, 3], 'el pivote de la paleta cae en el borne del tramo inferior');
  assert.deepEqual([Number(m[3]), Number(m[4])], [-3, -3], 'la paleta en reposo abre hacia la izquierda');
  // CADe deja la paleta a 1 unidad del conductor al cerrar (medido en
  // K1M-aux de play_03 y F0 de play_04): giro de 17.1° (26.57 − 9.46),
  // positivo porque el lienzo rota las cuchillas con deg > 0 al cerrar.
  assert.ok(near(blade.blade!.deg, 17.1, 0.05), `giro del NA: ${blade.blade!.deg}`);
});

test('el pulsador NC (8001) abre girando al contrario que el NA', () => {
  const sym = resolveSymbol(8001, ['11', '12']);
  assert.equal(sym.anchor, 'origin', 'el 8001 migró a anclaje al origen');
  assert.deepEqual(sym.originPins, [
    { name: '11', x: 0, y: 0 },
    { name: '12', x: 0, y: 12 },
  ]);

  // Medido sobre la misma referencia, S0 en (66,99): tramo superior hasta
  // −2.5 donde sale la barra (0,−2.5)→(+3.25,−2.5); paleta espejo
  // (+3,−3)→(0,+3); dos guiones a la altura del origen.
  const shapes = sym.shapes(9, 15);
  const ink = shapesBounds(shapes);
  assert.ok(near(ink.minX, -6) && near(ink.maxX, 3.25), `el NC mide ${ink.minX}..${ink.maxX} de ancho`);
  assert.ok(near(ink.minY, -6) && near(ink.maxY, 5.75), `el NC mide ${ink.minY}..${ink.maxY} de alto`);

  const blade = shapes.find((s) => s.blade);
  assert.ok(blade, 'la paleta del NC es móvil');
  const m = /M(-?[\d.]+) (-?[\d.]+)L(-?[\d.]+) (-?[\d.]+)/.exec(blade.d)!;
  assert.deepEqual([Number(m[1]), Number(m[2])], [0, 3], 'el pivote de la paleta cae en el borne del tramo inferior');
  assert.deepEqual([Number(m[3]), Number(m[4])], [3, -3], 'la paleta en reposo está apoyada hacia la derecha');
  // Espejo del NA: el carrier común mueve las dos puntas hacia el conductor
  // y frena a 1 unidad, así que el NC presionado deja la punta a +1 y el
  // giro es negativo (el lienzo lo aplica cuando el contacto está abierto).
  assert.ok(near(blade.blade!.deg, -17.1, 0.05), `giro del NC: ${blade.blade!.deg}`);

  // La barra del apoyo y el tramo superior comparten la esquina (0,−2.5).
  const bar = shapes.find((s) => s.d === 'M0 -2.5L3.25 -2.5');
  assert.ok(bar, 'falta la barra del apoyo NC');
  const stub = shapes.find((s) => s.d === 'M0 -6L0 -2.5');
  assert.ok(stub, 'el tramo superior del NC baja hasta la barra');
});

test('la bobina (9000) va anclada al origen, con el cuerpo centrado en el conductor', () => {
  const sym = resolveSymbol(9000, ['A1', 'A2']);
  assert.equal(sym.anchor, 'origin', 'el 9000 migró a anclaje al origen');
  assert.deepEqual(sym.originPins, [
    { name: 'A1', x: 0, y: 0 },
    { name: 'A2', x: 0, y: 12 },
  ]);

  // Medido sobre docs/cadesimu-svg/reference/PR1_Rodolfo_Giusti_03.png, K1M
  // en (66,141): conductora continua de −5,875 a +5,875 (el tramo hasta el
  // borne A2 lo dibuja el ruteador) y rectángulo de −4 a +4 por −2 a +2
  // atravesado por el conductor, sin letra adentro.
  const shapes = sym.shapes(9, 15);
  const ink = shapesBounds(shapes);
  assert.ok(near(ink.minX, -4) && near(ink.maxX, 4), `el cuerpo mide ${ink.minX}..${ink.maxX} de ancho`);
  assert.ok(near(ink.minY, -5.875) && near(ink.maxY, 5.875), `la bobina mide ${ink.minY}..${ink.maxY} de alto`);
  assert.ok(shapes.some((s) => s.d === 'M0 -5.87L0 5.88'), 'la conductora es continua y no llega hasta A2');
  assert.ok(shapes.some((s) => s.d === 'M-4 -2H4V2H-4Z'), 'el cuerpo es el rectángulo medido');
  assert.equal(sym.labels?.(9, 15), undefined, 'el cuerpo va sin letra: los rótulos los pone el lienzo');
});

test('la lámpara (9008) sigue anclada y centrada como antes', () => {
  // S6: la lámpara ya estaba calibrada; la migración de los vecinos no la
  // mueve. Es la verificación de que el recorte piloto no la toca.
  const sym = resolveSymbol(9008, ['X1', 'X2']);
  assert.equal(sym.anchor, 'origin');
  const ink = shapesBounds(sym.shapes(9, 15));
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
  for (const code of [2001, 6007]) {
    const sym = resolveSymbol(code, []);
    assert.notEqual(sym.anchor, 'origin', `${code} no debería estar anclado todavía`);
  }
});
