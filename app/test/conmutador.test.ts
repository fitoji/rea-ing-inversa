import { test } from 'node:test';
import assert from 'node:assert/strict';
import { resolveSymbol } from '../src/symbols/library.ts';

/**
 * Conmutador de dos posiciones (el 8018).
 *
 * Criterio de aceptación: `app/test_simu/PR1_Rodolfo_Giusti_03_simu_play_02.png`
 * y `..._play_04.png`, las capturas de CADeSimu con el Q1 en cada posición.
 *
 * Lo que se ve en ellas: dos contactos **verticales** (95-96 y 97-98) con las
 * cuchillas abiertas en direcciones opuestas —la lambda—, un acoplamiento
 * mecánico punteado entre ellas y el corchete de la derecha. En una captura
 * está apoyada la cuchilla de 97-98 y en la otra la de 95-96: nunca las dos.
 */

const sym = resolveSymbol(8018, ['95', '97', '96', '98']);

test('el conmutador tiene dos contactos verticales con cuchillas opuestas', () => {
  const shapes = sym.shapes(15, 15);
  const blades = shapes.filter((s) => s.blade);
  assert.equal(blades.length, 2, 'dos cuchillas, una por contacto');
  // Signos contrarios: el lienzo rota la hoja cuando el contacto está cerrado
  // (`deg > 0`), así que con signos opuestos se apoya una y se abre la otra.
  const [a, b] = blades.map((s) => s.blade!.deg);
  assert.ok(a * b < 0, `los giros deben tener signo contrario: ${a} y ${b}`);
  assert.ok(Math.abs(a) > 15 && Math.abs(a) < 30, `el giro debe ser el de la cuchilla: ${a}`);
});

test('el acoplamiento mecánico es una línea punteada con el corchete', () => {
  const shapes = sym.shapes(15, 15);
  const dashed = shapes.filter((s) => s.dashed);
  assert.equal(dashed.length, 1, 'la línea de acoplamiento');
  // El corchete de la derecha: tres tramos.
  const corchete = shapes.filter((s) => !s.dashed && s.d.includes('L15.9') || s.d.includes('14.1'));
  assert.ok(corchete.length >= 3, `el corchete de la derecha: ${corchete.length} tramos`);
});

test('los bornes caen en la grilla de CADeSimu: 0 y 12 de alto, cada 9 de ancho', () => {
  assert.deepEqual(
    sym.pins.map((p) => [p.name, Math.round(p.nx * 15), Math.round(p.ny * 15)]),
    [
      ['95', 0, 0],
      ['97', 9, 0],
      ['96', 0, 12],
      ['98', 9, 12],
    ],
  );
});

test('cada cuchilla pivota en su propio borne de abajo y abre hacia un lado', () => {
  const blades = sym.shapes(15, 15).filter((s) => s.blade);
  const tips = blades.map((s) => {
    const m = /M(-?[\d.]+) (-?[\d.]+)L(-?[\d.]+) (-?[\d.]+)/.exec(s.d)!;
    return { pivot: [Number(m[1]), Number(m[2])], tip: [Number(m[3]), Number(m[4])] };
  });
  // Los dos pivotes en la fila inferior de la grilla (y = 12).
  for (const { pivot } of tips) {
    assert.equal(pivot[1], 12, `el pivote debe estar en el borne de abajo: ${pivot[1]}`);
  }
  // Cada cuchilla abre hacia un lado distinto: la de 95-96 a la izquierda y la
  // de 97-98 a la derecha.
  const [izq, der] = tips;
  assert.ok(izq!.tip[0] < izq!.pivot[0], 'la de 95-96 abre a la izquierda');
  assert.ok(der!.tip[0] > der!.pivot[0], 'la de 97-98 abre a la derecha');
});
