import { test } from 'node:test';
import assert from 'node:assert/strict';
import { resolveSymbol } from '../src/symbols/library.ts';

/**
 * Geometría de la familia de protección, medida en CADeSimu.
 *
 * Criterio de aceptación:
 * - `data/samples/components_png/interruptor proteccion contra cortocircuitos
 *   monofasico.png` (el 6000) y `interruptor automatico de proteccion contra
 *   cortocircuitos y sobrecargas.png` (el 6003): cuchilla de tres unidades de
 *   recorrido horizontal y cuadro de disparo inclinado.
 * - `data/samples/tests01/test01.png` (el 6001): el cuadro va sólo en el primer
 *   polo.
 * - `data/samples/components_png/rele termico.png` (el 6007): conductores
 *   rectos, sin cuchilla.
 *
 * Las medidas están en unidades del archivo (6 px por unidad en la captura de
 * la hoja).
 */

const paths = (code: number, pins: string[] = [], w = 18, h = 15): string[] =>
  resolveSymbol(code, pins).shapes(w, h).map((s) => s.d);

test('los automáticos dibujan la cuchilla medida en CADeSimu', () => {
  // Cuchilla: de (x − 3, +3) a (x, +9). La conductora superior termina en
  // +2,9 y la inferior arranca en +9. El guion horizontal de 1,8 unidades
  // cruza el polo a +6.
  // El unipolar (6000) va anclado al origen, como los multipolares.
  for (const [code, poles] of [
    [6000, [0]],
    [6002, [0, 6]],
    [6003, [0, 6, 12]],
    [6004, [0, 6, 12]],
  ] as const) {
    const ds = paths(code, [], code === 6000 || code === 6002 ? 12 : 18);
    for (const x of poles) {
      assert.ok(ds.includes(`M${x - 3} 3L${x} 9`), `${code}: falta la cuchilla del polo ${x}`);
      assert.ok(ds.includes(`M${x} 0L${x} 2.9`), `${code}: falta la conductora superior del polo ${x}`);
      assert.ok(ds.includes(`M${x} 9L${x} 12`), `${code}: falta la conductora inferior del polo ${x}`);
    }
  }
});

test('el guion del automático va hacia el centro del aparato', () => {
  // En la captura de la hoja el del primer polo cruza el conductor (de −1,5 a
  // +0,3) y el del segundo queda a su izquierda (de −3,3 a −1,5): cada polo
  // lo lleva hacia el centro.
  const guion = (x: number, left: boolean): string =>
    left ? `M${x - 3.3} 6L${x - 1.5} 6` : `M${x - 1.5} 6L${x + 0.3} 6`;

  const ds6002 = paths(6002, [], 12);
  assert.ok(ds6002.includes(guion(0, false)), 'el 6002: el primer polo lleva el guion a la derecha');
  assert.ok(ds6002.includes(guion(6, true)), 'el 6002: el segundo polo lleva el guion a la izquierda');

  const ds6003 = paths(6003, [], 18);
  assert.ok(ds6003.includes(guion(0, false)), 'el 6003: el primer polo lleva el guion a la derecha');
  assert.ok(ds6003.includes(guion(12, true)), 'el 6003: el último polo lleva el guion a la izquierda');

  // El unipolar no tiene centro: el guion queda como estaba.
  assert.ok(paths(6000, [], 12).includes(guion(0, false)), 'el 6000: el guion no se mueve');
});

test('el cuadro de disparo va donde lo pone CADeSimu', () => {
  // El monofásico (6000) y el tripolar (6003) lo llevan en todos sus polos; el
  // bipolar (6001, medido en la captura de la hoja) sólo en el primero; el 6002
  // hereda la del bipolar y el 6004 la del tripolar.
  const filled = (code: number, w = 18): number =>
    resolveSymbol(code, []).shapes(w, 15).filter((s) => s.fill).length;
  assert.equal(filled(6000, 12), 1, 'el monofásico lleva el cuadro en su único polo');
  assert.equal(filled(6002, 12), 1, 'el bipolar lleva el cuadro en el primer polo');
  assert.equal(filled(6003, 18), 3, 'el tripolar lleva el cuadro en los tres polos');
  assert.equal(filled(6004, 18), 3, 'el 6004 hereda la del tripolar');
});

test('el relé térmico no tiene cuchilla: sus conductores son rectos', () => {
  const ds = paths(6007, [], 21);
  // Conductora recta de la fila superior a la inferior, en cada polo.
  for (const x of [0, 6, 12]) {
    assert.ok(ds.includes(`M${x} 0L${x} 12`), `el térmico: falta la conductora recta del polo ${x}`);
  }
  // La cuchilla vieja era una diagonal: no puede quedar ninguna.
  const diagonals = ds.filter((d) => /M(-?[\d.]+) (-?[\d.]+)L(-?[\d.]+) (-?[\d.]+)/.test(d) && (() => {
    const m = /M(-?[\d.]+) (-?[\d.]+)L(-?[\d.]+) (-?[\d.]+)/.exec(d)!;
    return m[1] !== m[3];
  })());
  assert.deepEqual(diagonals, [], 'el térmico no tiene diagonales');
  assert.equal(resolveSymbol(6007, []).shapes(21, 15).filter((s) => s.fill).length, 0);
});

test('el automático IN sigue anclado al origen con el cuadro sólo en el primer polo', () => {
  const sym = resolveSymbol(6001, ['1', '3', '2', '4']);
  assert.equal(sym.anchor, 'origin');
  const ds = sym.shapes(12, 15).map((s) => s.d);
  assert.ok(ds.includes('M-3 3L0 9'), 'falta la cuchilla del primer polo');
  assert.ok(ds.includes('M3 3L6 9'), 'falta la cuchilla del segundo polo');
  // El guion del segundo polo va hacia el centro del aparato.
  assert.ok(ds.includes('M-1.5 6L0.3 6'), 'falta el guion del primer polo');
  assert.ok(ds.includes('M2.7 6L4.5 6'), 'falta el guion del segundo polo');
  assert.equal(sym.shapes(12, 15).filter((s) => s.fill).length, 1);
});

test('el unipolar de la familia se dibuja en el origen, no en el centro de la caja', () => {
  // En el archivo el primer borne está en el origen del registro: el polo va
  // en el borde izquierdo de la caja, como el primer polo de los multipolares.
  for (const code of [6000, 6010, 6017, 5005, 6019, 6020]) {
    const sym = resolveSymbol(code, []);
    assert.ok(sym.size, `${code} debe declarar caja`);
    const { w, h } = sym.size;
    assert.equal(sym.pins[0]!.nx * w, 0, `${code}: el primer borne está en x=0`);
    assert.equal(sym.pins[1]!.nx * w, 0, `${code}: el segundo borne está en x=0`);
    const ds = sym.shapes(w, h).map((s) => s.d);
    assert.ok(
      ds.some((d) => d.startsWith('M0 0L0 ')),
      `${code}: el polo no se dibuja en el origen`,
    );
  }
});

test('el fusible se dibuja vertical, con el cuerpo alrededor del conductor', () => {
  // `components_png/fusible monofasico.png`: rectángulo de 2,5 unidades de
  // ancho en el conductor, de +2,3 a +9,3, con el borne '1' arriba y '2' abajo.
  const sym = resolveSymbol(5000, []);
  assert.ok(sym.size);
  const { w, h } = sym.size;
  assert.deepEqual(sym.pins.map((p) => p.name), ['1', '2']);
  assert.deepEqual(sym.pins.map((p) => Math.round(p.nx * w)), [0, 0]);
  const ds = sym.shapes(w, h).map((s) => s.d);
  assert.ok(ds.includes('M-1.25 2.3H1.25V9.3H-1.25Z'), 'el fusible no dibuja el cuerpo medido');
  assert.ok(ds.includes('M0 0L0 2.3'), 'falta la conductora superior del fusible');
  assert.ok(ds.includes('M0 9.3L0 12'), 'falta la conductora inferior del fusible');
});
