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

test('el pulsador NA-NC (8002) va anclado con un contacto en cada columna', () => {
  const sym = resolveSymbol(8002, ['11', '13', '12', '14']);
  assert.equal(sym.anchor, 'origin', 'el 8002 migró a anclaje al origen');
  assert.deepEqual(sym.originPins, [
    { name: '11', x: 0, y: 0 },
    { name: '13', x: 9, y: 0 },
    { name: '12', x: 0, y: 12 },
    { name: '14', x: 9, y: 12 },
  ]);

  // Medido sobre docs/02/pulsadores.png (9 px por unidad), NA-NC en (528,198):
  // NC en la columna 0 (barra a −2,5 y paleta de +3 a −3) y NO en la columna 9
  // (paleta de +3 a −3 abriendo hacia la izquierda), con el enlace mecánico
  // discontinuo en y=0 de −3 a 7,5.
  const shapes = sym.shapes(15, 15);
  const ink = shapesBounds(shapes);
  assert.ok(near(ink.minX, -6) && near(ink.maxX, 9), `el NA-NC mide ${ink.minX}..${ink.maxX} de ancho`);
  assert.ok(near(ink.minY, -6) && near(ink.maxY, 5.75), `el NA-NC mide ${ink.minY}..${ink.maxY} de alto`);
  assert.ok(shapes.some((s) => s.d === 'M0 -2.5L3.5 -2.5'), 'falta la barra del contacto NC');
  assert.ok(shapes.some((s) => s.d === 'M0 3L3 -3'), 'falta la paleta NC');
  assert.ok(shapes.some((s) => s.d === 'M9 -6L9 -3'), 'falta el tramo superior del NO');
  assert.ok(shapes.some((s) => s.d === 'M9 3L6 -3'), 'falta la paleta NO');
  for (const d of ['M-3 0L-1 0', 'M0 0L2 0', 'M3 0L5 0', 'M6 0L7.5 0']) {
    assert.ok(shapes.some((s) => s.d === d && s.thin), `falta el tramo ${d} del enlace mecánico`);
  }
});

test('el pulsador conmutado (8003) lleva el común arriba y los dos tiros abajo', () => {
  const sym = resolveSymbol(8003, ['11', '12', '14']);
  assert.equal(sym.anchor, 'origin', 'el 8003 migró a anclaje al origen');
  assert.deepEqual(sym.originPins, [
    { name: '11', x: 3, y: 0 },
    { name: '12', x: 0, y: 12 },
    { name: '14', x: 6, y: 12 },
  ]);

  // Medido sobre la misma captura, conmutado en (798,198): común arriba en
  // x=3, cuchilla hasta (0,5;3) apoyada en el NC, y los dos tiros abajo en
  // x=0 y x=6 con sus barras cortas apuntando hacia la cuchilla.
  const shapes = sym.shapes(12, 15);
  const ink = shapesBounds(shapes);
  assert.ok(near(ink.minX, -6) && near(ink.maxX, 6), `el conmutado mide ${ink.minX}..${ink.maxX} de ancho`);
  assert.ok(near(ink.minY, -6) && near(ink.maxY, 5.75), `el conmutado mide ${ink.minY}..${ink.maxY} de alto`);
  assert.ok(shapes.some((s) => s.d === 'M3 -6L3 -3'), 'falta el tramo del común');
  assert.ok(shapes.some((s) => s.d === 'M3 -3L0.5 3'), 'falta la cuchilla del conmutado');
  assert.ok(shapes.some((s) => s.d === 'M0 2.33L1.2 2.33'), 'falta la barra del tiro NC');
  assert.ok(shapes.some((s) => s.d === 'M4.78 2.33L6 2.33'), 'falta la barra del tiro NO');
});

test('la seta (8004/8005) se dibuja como cúpula con vástago, no con tapa recta', () => {
  for (const [code, names] of [
    [8004, ['13', '14']],
    [8005, ['11', '12']],
  ] as const) {
    const sym = resolveSymbol(code, [...names]);
    assert.equal(sym.anchor, 'origin', `el ${code} migró a anclaje al origen`);
    assert.deepEqual(sym.originPins, [
      { name: names[0], x: 0, y: 0 },
      { name: names[1], x: 0, y: 12 },
    ]);

    // Medido sobre la misma captura, seta en (1041,90) y (1041,279): cúpula de
    // radio 2 con el lado plano en x=−6 y vástago hasta −4,1. El 8005 suma la
    // barra del apoyo NC hasta +3,25.
    const shapes = sym.shapes(6, 15);
    const ink = shapesBounds(shapes);
    const maxX = code === 8005 ? 3.25 : 0;
    assert.ok(near(ink.minX, -8) && near(ink.maxX, maxX), `la seta ${code} mide ${ink.minX}..${ink.maxX} de ancho`);
    assert.ok(near(ink.minY, -6) && near(ink.maxY, 5.75), `la seta ${code} mide ${ink.minY}..${ink.maxY} de alto`);
    assert.ok(shapes.some((s) => s.d.startsWith('M-6 -1.9') && s.d.includes('L-8 0')), `falta la cúpula de la seta ${code}`);
    assert.ok(shapes.some((s) => s.d === 'M-6 -2L-6 2'), `falta el lado plano de la seta ${code}`);
    assert.ok(shapes.some((s) => s.d === 'M-6 0L-4.1 0'), `falta el vástago de la seta ${code}`);
  }
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

test('el motor (1000) va anclado al origen, con los bornes sobre el registro y el cuerpo centrado', () => {
  const sym = resolveSymbol(1000, ['U1', 'V1', 'W1', 'PE']);
  assert.equal(sym.anchor, 'origin', 'el 1000 migró a anclaje al origen');
  assert.deepEqual(sym.originPins, [
    { name: 'U1', x: 0, y: 0 },
    { name: 'V1', x: 6, y: 0 },
    { name: 'W1', x: 12, y: 0 },
    { name: 'PE', x: 18, y: 0 },
  ]);

  // Medido sobre docs/cadesimu-svg/reference/PR1_Rodolfo_Giusti_03.png, M1 en
  // (183,168): los cables terminan en la fila del registro (rel y=0) y la
  // tinta del símbolo empieza 6 unidades arriba (162) tapando el cable,
  // igual que en CADe. Círculo r=9 centrado en (189,174): rel (6,6).
  // El sobreenvolvente de arcos de shapesBounds es conservador: para el arco
  // del PE cuenta los dos centros candidatos (±9,75 de la cuerda), así que la
  // caja llega a 25,3 aunque la tinta real (el gancho) termina en x=18.
  const shapes = sym.shapes(24, 24);
  const ink = shapesBounds(shapes);
  assert.ok(near(ink.minX, -3) && near(ink.maxX, 25.3), `el motor mide ${ink.minX}..${ink.maxX} de ancho`);
  assert.ok(near(ink.minY, -6) && near(ink.maxY, 15), `el motor mide ${ink.minY}..${ink.maxY} de alto`);

  // Cada stub baja hasta ~0,15 del borde del círculo (el hueco visual que
  // deja CADe): U1 -0.375, V1 -2.875 (borde el apex), W1 -0.875.
  const ds = shapes.map((s) => s.d);
  assert.ok(ds.includes('M0 -6L0 -0.37'), 'falta el stub de U1');
  assert.ok(ds.includes('M6 -6L6 -2.87'), 'falta el stub de V1');
  assert.ok(ds.includes('M12 -6L12 -0.87'), 'falta el stub de W1');
  assert.ok(ds.includes('M18 -6L18 6'), 'el stub del PE cruza hasta la altura del centro');
  assert.ok(ds.includes('M18 6L15.5 6'), 'falta el gancho del PE hacia el círculo');
  // La terminal del PE es un arco concéntrico al cuerpo (r 9.75), no una
  // marca de tierra: mide ~4u de alto pegado al borde derecho.
  assert.ok(ds.includes('M15.55 4a9.75 9.75 0 0 1 0 4'), 'falta el arco de la terminal del PE');
  assert.equal(shapes.some((s) => s.fill), false, 'sin rellenos');
});

test('el contactor de potencia (2001) va anclado al origen con la fila de bornes del registro', () => {
  const sym = resolveSymbol(2001, ['1', '3', '5', '2', '4', '6']);
  assert.equal(sym.anchor, 'origin', 'el 2001 migró a anclaje al origen');
  assert.deepEqual(sym.originPins, [
    { name: '1', x: 0, y: 0 },
    { name: '3', x: 6, y: 0 },
    { name: '5', x: 12, y: 0 },
    { name: '2', x: 0, y: 12 },
    { name: '4', x: 6, y: 12 },
    { name: '6', x: 12, y: 12 },
  ]);

  // Medido sobre docs/cadesimu-svg/reference/PR1_Rodolfo_Giusti_03.png
  // (4 px por unidad), K1M en (624,390), caja del registro 18x15. Por polo
  // (columnas 0/6/12): stub superior (p,−6)→(p,−3) — 1 px negro alineado sobre
  // el borde de la caja, donde el cable (gris de CADe) se apoya —, hoja
  // (p−3,−3)→(p,+3) con pivote en (p,+3) y montante (p,+3)→(p,+6): de +6 a la
  // fila inferior +12 el tramo lo dibuja el ruteador (en la captura queda bajo
  // el relleno de la caja). El guion mecánico discontinuo en y=0 arranca en el
  // cruce de la hoja 1 (−1,5) y termina en el de la hoja 3 (+10,5): tramos de
  // 2u con paso 5u. Entre el stub y el borne la captura no muestra tinta.
  const shapes = sym.shapes(18, 15);
  const ink = shapesBounds(shapes);
  assert.ok(near(ink.minX, -3) && near(ink.maxX, 12), `el contactor mide ${ink.minX}..${ink.maxX} de ancho`);
  assert.ok(near(ink.minY, -6) && near(ink.maxY, 6), `el contactor mide ${ink.minY}..${ink.maxY} de alto`);
  for (const p of [0, 6, 12]) {
    assert.ok(shapes.some((s) => s.d === `M${p} -6L${p} -3`), `falta el stub del polo ${p}`);
    assert.ok(shapes.some((s) => s.d === `M${p - 3} -3L${p} 3`), `falta la hoja del polo ${p}`);
    assert.ok(shapes.some((s) => s.d === `M${p} 3L${p} 6`), `falta el montante del polo ${p}`);
  }
  assert.ok(shapes.some((s) => s.d === 'M-1.5 0L0.5 0' && s.thin), 'falta el primer tramo del guion');
  assert.ok(shapes.some((s) => s.d === 'M3.5 0L5.5 0' && s.thin), 'falta el segundo tramo del guion');
  assert.ok(shapes.some((s) => s.d === 'M8.5 0L10.5 0' && s.thin), 'falta el tercer tramo del guion');
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

test('la lámpara de señalización intermitente (9009) lleva el destello medido en docs/03', () => {
  const sym = resolveSymbol(9009, ['X1', 'X2']);
  assert.equal(sym.anchor, 'origin', 'el 9009 va anclado al origen');
  assert.deepEqual(sym.originPins, [
    { name: 'X1', x: 0, y: 0 },
    { name: 'X2', x: 0, y: 12 },
  ]);

  // Misma base que la lámpara CADe (círculo centrado en y=6, r=2,83, aspa y
  // conductores hasta las filas 0/12) más la marca de intermitencia medida
  // sobre docs/03/componentes01.png (S=4, OX=-17, OY=-101), a la derecha.
  const shapes = sym.shapes(12, 15);
  const ink = shapesBounds(shapes);
  assert.ok(near(ink.minX, -2.83) && near(ink.maxX, 7.25), `la 9009 mide ${ink.minX}..${ink.maxX} de ancho`);
  assert.ok(near(ink.minY, 0) && near(ink.maxY, 12), `la 9009 mide ${ink.minY}..${ink.maxY} de alto`);
  assert.ok(shapes.some((s) => s.d === 'M0 0L0 3.17'), 'falta el conductor superior de la lámpara');
  assert.ok(shapes.some((s) => s.d === 'M0 8.83L0 12'), 'falta el conductor inferior de la lámpara');
  assert.ok(shapes.some((s) => s.d === 'M6 5.25H6.75'), 'falta la barra superior del destello');
  assert.ok(shapes.some((s) => s.d === 'M6 5.25V6.5H5.5'), 'falta el trazo izquierdo del destello');
  assert.ok(shapes.some((s) => s.d === 'M6.75 5.25V6.5H7.25'), 'falta el trazo derecho del destello');
});

test('el rótulo del borne va a su derecha y el designador a la izquierda del símbolo', () => {
  assert.deepEqual(pinLabelAt({ x: 10, y: 20 }), { x: 11.2, y: 20.4 });
  assert.deepEqual(designatorAt({ x: 4, y: 6, w: 10, h: 12 }), { x: 2.8, y: 12 });
});

test('los símbolos que no se migraron siguen dibujándose en su caja', () => {
  // El anclaje al origen es opt-in: el resto del catálogo no se mueve.
  // El 2001 ya migró (test de arriba); el 6007 sigue sin registro que lo ancle.
  for (const code of [6007]) {
    const sym = resolveSymbol(code, []);
    assert.notEqual(sym.anchor, 'origin', `${code} no debería estar anclado todavía`);
  }
});


test('el contacto auxiliar NA-NC (7002) va anclado al origen con sus cuatro bornes', () => {
  const sym = resolveSymbol(7002, ['11', '13', '12', '14']);
  assert.equal(sym.anchor, 'origin', 'el 7002 migra a anclaje al origen');
  assert.deepEqual(sym.originPins, [
    { name: '11', x: 0, y: 0 },
    { name: '13', x: 9, y: 0 },
    { name: '12', x: 0, y: 12 },
    { name: '14', x: 9, y: 12 },
  ]);
});

test('el conmutador de dos posiciones (8018) va anclado al origen con sus cuatro bornes', () => {
  const sym = resolveSymbol(8018, ['95', '97', '96', '98']);
  assert.equal(sym.anchor, 'origin', 'el 8018 migra a anclaje al origen');
  assert.deepEqual(sym.originPins, [
    { name: '95', x: 0, y: 0 },
    { name: '97', x: 9, y: 0 },
    { name: '96', x: 0, y: 12 },
    { name: '98', x: 9, y: 12 },
  ]);
});
