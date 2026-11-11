import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parse } from '../src/format/cade.ts';
import { buildProject } from '../src/model/project.ts';
import { circuitFrom } from '../src/sim/circuit.ts';
import { simulate } from '../src/sim/solver.ts';
import { currentFlow } from '../src/sim/flow.ts';

const HERE = dirname(fileURLToPath(import.meta.url));
const TERMOMAG = buildProject(
  parse(readFileSync(join(HERE, '../../data/samples/tests01/test01_termomag_lampara.cad'), 'latin1')),
).records;

/**
 * Circuito del reporte: L -> polo fase del automático -> lámpara H -> retorno
 * por el polo neutro -> N. La lámpara enciende, y la corriente tiene que leerse
 * como UN loop: baja por la fase, cruza la lámpara y vuelve por el neutro.
 *
 * Sentido del trazo en el archivo (x1,y1 -> x2,y2):
 *   4  (117,48)->(117,51)  fase, hacia abajo
 *   5  (117,63)->(117,72)  fase, hacia la lámpara
 *   6  (117,84)->(117,96)  salida de la lámpara, hacia abajo
 *   7  (111,63)->(111,96)  retorno, dibujado hacia abajo (corriente SUBE)
 *   8  (111,96)->(117,96)  retorno, dibujado a la derecha (corriente va a la IZQ)
 *   9  (111,45)->(111,51)  retorno, dibujado hacia abajo (corriente SUBE)
 *   10 (99,45)->(111,45)   retorno, dibujado a la derecha (corriente va a la IZQ)
 *   11 (99,42)->(99,45)    retorno, dibujado hacia abajo (corriente SUBE al N)
 */
const HACIA_LA_CARGA = new Set([4, 5, 6]);
const CONTRA_EL_TRAZO = new Set([7, 8, 9, 10, 11]);
const LAZO_COMPLETO = new Set([4, 5, 6, 7, 8, 9, 10, 11]);

test('lámpara encendida: la corriente recorre el lazo completo fase -> carga -> neutro', () => {
  const built = circuitFrom(TERMOMAG)!;
  const state = simulate(built.circuit);
  assert.ok(state.loads.has('3:0-1'), 'la lámpara debe encender');

  const flow = currentFlow(TERMOMAG, built, state);
  assert.deepEqual([...flow.carrying].sort((a, b) => a - b), [...LAZO_COMPLETO]);
  assert.deepEqual([...flow.reversed].sort((a, b) => a - b), [...CONTRA_EL_TRAZO]);
  for (const id of HACIA_LA_CARGA) assert.ok(!flow.reversed.has(id), `cable ${id} no debe invertirse`);
});

test('lámpara apagada: sólo hay tensión en el tramo de fase anterior al corte', () => {
  // Automático 6001 (registro 2) abierto: no conduce ningún polo.
  const built = circuitFrom(TERMOMAG, { openRecords: new Set([2]) })!;
  const state = simulate(built.circuit);
  assert.equal(state.loads.size, 0);

  const flow = currentFlow(TERMOMAG, built, state);
  assert.deepEqual([...flow.carrying], [4]);
  assert.equal(flow.reversed.size, 0);
});

test('sin carga energizada: los tramos con tensión no invierten sentido', () => {
  const built = circuitFrom(TERMOMAG)!;
  const state = simulate(built.circuit);
  const apagado = { ...state, loads: new Set<string>(), energized: new Set<string>() };
  const flow = currentFlow(TERMOMAG, built, apagado);
  assert.equal(flow.reversed.size, 0);
});
