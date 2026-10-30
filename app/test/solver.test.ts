import { test } from 'node:test';
import assert from 'node:assert/strict';
import { simulate, type Circuit } from '../src/sim/solver.ts';

/**
 * Circuitos canónicos escritos como datos.
 *
 * Se escriben a mano y no se extraen de un `.cade` a propósito: así el test
 * mide el SOLVER. La extracción de la netlist tiene sus propios tests contra
 * archivos reales. Mezclar las dos cosas haría que un fallo de interpretación
 * del dibujo pareciera un fallo de lógica.
 */

const FASE = 0;
const NEUTRO = 1;

/** Arranque directo con enclavamiento: PARO - [STAR || aux KM1] - bobina. */
function arranqueDirecto(): Circuit {
  return {
    supply: [FASE, NEUTRO],
    devices: [
      { id: 'paro', kind: 'buttonNC', a: FASE, b: 2, part: 'PARO' },
      { id: 'star', kind: 'buttonNO', a: 2, b: 3, part: 'STAR' },
      { id: 'aux', kind: 'contactNO', a: 2, b: 3, part: 'KM1' },
      { id: 'bobina', kind: 'coil', a: 3, b: NEUTRO, part: 'KM1' },
    ],
  };
}

test('arranque directo: en reposo la bobina está desenergizada', () => {
  const s = simulate(arranqueDirecto());
  assert.equal(s.stable, true);
  assert.equal(s.energized.has('KM1'), false);
  assert.equal(s.loads.size, 0);
});

test('arranque directo: al pulsar STAR la bobina se energiza', () => {
  const s = simulate(arranqueDirecto(), { pressed: new Set(['star']) });
  assert.equal(s.stable, true);
  assert.equal(s.energized.has('KM1'), true);
  assert.equal(s.loads.has('bobina'), true);
  assert.equal(s.stable, true);
});

test('arranque directo: al soltar STAR queda enclavado por el auxiliar', () => {
  const pulsado = simulate(arranqueDirecto(), { pressed: new Set(['star']) });
  assert.equal(pulsado.energized.has('KM1'), true);

  const soltado = simulate(arranqueDirecto(), { initialEnergized: pulsado.energized });
  assert.equal(soltado.stable, true);
  assert.equal(soltado.energized.has('KM1'), true, 'el contacto auxiliar lo mantiene');
  assert.equal(soltado.loads.has('bobina'), true);
});

test('arranque directo: PARO corta el enclavamiento y no vuelve', () => {
  const enclavado = simulate(arranqueDirecto(), {
    pressed: new Set(['star']),
  });
  const parado = simulate(arranqueDirecto(), {
    pressed: new Set(['paro']),
    initialEnergized: enclavado.energized,
  });
  assert.equal(parado.energized.has('KM1'), false);
  assert.equal(parado.loads.has('bobina'), false);

  // soltar PARO no lo vuelve a energizar: el pulsador de marcha está suelto
  const despues = simulate(arranqueDirecto(), { initialEnergized: parado.energized });
  assert.equal(despues.energized.has('KM1'), false);
});

test('sin camino al neutro la bobina no se energiza', () => {
  const circuit: Circuit = {
    supply: [FASE, NEUTRO],
    devices: [
      { id: 'paro', kind: 'buttonNC', a: FASE, b: 2, part: 'PARO' },
      { id: 'bobina', kind: 'coil', a: 3, b: NEUTRO, part: 'KM1' },
    ],
  };
  const s = simulate(circuit);
  assert.equal(s.energized.size, 0);
});

test('el fusible y el térmico conducen sin condición', () => {
  const circuit: Circuit = {
    supply: [FASE, NEUTRO],
    devices: [
      { id: 'fusible', kind: 'fuse', a: FASE, b: 2, part: 'F1' },
      { id: 'rele', kind: 'thermal', a: 2, b: 3, part: 'F2' },
      { id: 'lamp', kind: 'lamp', a: 3, b: NEUTRO, part: 'H1' },
    ],
  };
  const s = simulate(circuit);
  assert.equal(s.loads.has('lamp'), true);
  assert.equal(s.energized.size, 0, 'una lámpara no energiza ningún aparato');
});

test('motor como carga: se alimenta si sus bornes llegan a fase y neutro', () => {
  const circuit: Circuit = {
    supply: [FASE, NEUTRO],
    devices: [
      { id: 'guardamotor', kind: 'thermal', a: FASE, b: 2, part: 'F1' },
      { id: 'motor', kind: 'motor', a: 2, b: NEUTRO, part: 'M1' },
    ],
  };
  assert.equal(simulate(circuit).loads.has('motor'), true);
});

test('detecta la oscilación en vez de colgarse', () => {
  // Un contacto NC del propio aparato en serie con su bobina: si se energiza,
  // abre el contacto, se desenergiza, cierra... Un lazo mal puesto.
  const circuit: Circuit = {
    supply: [FASE, NEUTRO],
    devices: [
      { id: 'nc', kind: 'contactNC', a: FASE, b: 2, part: 'K9' },
      { id: 'bobina', kind: 'coil', a: 2, b: NEUTRO, part: 'K9' },
    ],
  };
  const s = simulate(circuit, { maxIterations: 20 });
  assert.equal(s.stable, false, 'un lazo inestable no puede reportarse estable');
  assert.ok(s.iterations <= 20);
});

test('inversión de giro: dos bobinas enclavadas no pueden estar activas a la vez', () => {
  // KM1 y KM2 con contacto NC cruzado: la rama de cada uno pasa por el NC del otro.
  const circuit: Circuit = {
    supply: [FASE, NEUTRO],
    devices: [
      { id: 'paro', kind: 'buttonNC', a: FASE, b: 2, part: 'PARO' },
      { id: 'giro1', kind: 'buttonNO', a: 2, b: 3, part: 'S1' },
      { id: 'giro2', kind: 'buttonNO', a: 2, b: 4, part: 'S2' },
      { id: 'aux1', kind: 'contactNO', a: 2, b: 3, part: 'KM1' },
      { id: 'aux2', kind: 'contactNO', a: 2, b: 4, part: 'KM2' },
      { id: 'encl1', kind: 'contactNC', a: 3, b: 5, part: 'KM2' },
      { id: 'encl2', kind: 'contactNC', a: 4, b: 6, part: 'KM1' },
      { id: 'bobina1', kind: 'coil', a: 5, b: NEUTRO, part: 'KM1' },
      { id: 'bobina2', kind: 'coil', a: 6, b: NEUTRO, part: 'KM2' },
    ],
  };

  const km1 = simulate(circuit, { pressed: new Set(['giro1']) });
  assert.equal(km1.energized.has('KM1'), true);
  assert.equal(km1.energized.has('KM2'), false);

  // con KM1 enclavado, apretar el otro sentido no lo activa
  const cruzado = simulate(circuit, { pressed: new Set(['giro2']), initialEnergized: km1.energized });
  assert.equal(cruzado.energized.has('KM1'), true);
  assert.equal(cruzado.energized.has('KM2'), false, 'el NC cruzado impide ambos sentidos');
});
