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
  // Cuchilla: de (x − 3, +3,6) a (x, +9,7). El guion horizontal de 1,8
  // unidades cruza el polo a +5.
  // El unipolar (6000) va centrado en su caja de 12, como el resto de la
  // familia; los multipolares arrancan en el borde izquierdo.
  for (const [code, poles] of [
    [6000, [6]],
    [6002, [0, 6]],
    [6003, [0, 6, 12]],
    [6004, [0, 6, 12]],
  ] as const) {
    const ds = paths(code, [], code === 6000 || code === 6002 ? 12 : 18);
    for (const x of poles) {
      assert.ok(ds.includes(`M${x - 3} 3.6L${x} 9.7`), `${code}: falta la cuchilla del polo ${x}`);
      assert.ok(ds.includes(`M${x - 1.5} 5L${x + 0.3} 5`), `${code}: falta el guion del polo ${x}`);
    }
  }
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
  assert.ok(ds.includes('M-3 3.6L0 9.7'), 'falta la cuchilla del primer polo');
  assert.ok(ds.includes('M3 3.6L6 9.7'), 'falta la cuchilla del segundo polo');
  assert.equal(sym.shapes(12, 15).filter((s) => s.fill).length, 1);
});
