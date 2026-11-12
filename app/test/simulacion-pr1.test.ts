import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parse } from '../src/format/cade.ts';
import { buildProject } from '../src/model/project.ts';
import { circuitFrom } from '../src/sim/circuit.ts';
import { simulate } from '../src/sim/solver.ts';
import { changeoverPositions, linkedProtection } from '../src/sim/apparatus.ts';

/**
 * Simulación del PR1 contra las capturas de CADeSimu.
 *
 * Criterio de aceptación: `app/test_simu/PR1_Rodolfo_Giusti_03*.png`, las cinco
 * capturas que dio el usuario:
 *
 * | captura | lo que hace el usuario | lo que se enciende |
 * |---|---|---|
 * | `PR1_Rodolfo_Giusti_03.png` | nada | nada |
 * | `..._simu_play.png` | play, sin actuar nada | nada |
 * | `..._simu_play_02.png` | Q1 cerrada y F0 cerrada | H1 (amarilla) |
 * | `..._simu_play_03.png` | además S1 o S2 pulsada | H1 y H3 (verde) |
 * | `..._simu_play_04.png` | el Q1 cambia de posición | H2 (roja) |
 *
 * Las capturas son acumulativas: en la 03 sigue encendida H1.
 */

const HERE = dirname(fileURLToPath(import.meta.url));
const PR1 = buildProject(
  parse(readFileSync(join(HERE, '..', 'test_simu', 'PR1_Rodolfo_Giusti_03.cad'), 'latin1')),
);

/** Las protecciones del plano: arrancan abiertas, como en CADeSimu. */
const protectionIds = PR1.records
  .filter((r) => r.kind === 'component' && (r.code === 6002 || r.code === 6009))
  .map((r) => r.id);

const automato = PR1.records.find((r) => r.code === 6002)!;

interface Estado {
  /** protecciones cerradas por el usuario */
  cerradas: number[];
  /** conmutadores accionados, por id de registro */
  conmutadores: Record<string, number>;
  /** pulsadores apretados, por designador */
  pulsados: string[];
}

function simular(estado: Estado): { encendidas: string[]; bobinas: string[] } {
  const open = new Set<number>(protectionIds.filter((id) => !estado.cerradas.includes(id)));
  const built = circuitFrom(PR1.records, { openRecords: open });
  assert.ok(built, 'el plano debe armar circuito');
  const pressed = new Set(
    built.circuit.devices.filter((d) => estado.pulsados.includes(d.part)).map((d) => d.id),
  );
  const state = simulate(built.circuit, {
    pressed,
    changeovers: new Map(Object.entries(estado.conmutadores)),
  });
  const encendidas: string[] = [];
  for (const device of built.devices) {
    if (device.kind !== 'lamp') continue;
    if (state.loads.has(`${device.recordId}:0-1`)) encendidas.push(device.designator);
  }
  return { encendidas: encendidas.sort(), bobinas: [...state.energized].sort() };
}

/** El conmutador del Q1 (el 8018): su grupo es el id del registro. */
const GRUPO_Q1 = String(PR1.records.find((r) => r.code === 8018)!.id);

test('en reposo no se enciende nada', () => {
  const { encendidas, bobinas } = simular({ cerradas: [], conmutadores: {}, pulsados: [] });
  assert.deepEqual(encendidas, [], 'ninguna lámpara encendida');
  assert.deepEqual(bobinas, [], 'ninguna bobina energizada');
});

test('con el play y sin actuar nada sigue todo apagado', () => {
  const { encendidas } = simular({ cerradas: [], conmutadores: {}, pulsados: [] });
  assert.deepEqual(encendidas, []);
});

test('con el automático cerrado y el conmutador en la otra posición se enciende H1', () => {
  const { encendidas } = simular({
    cerradas: [automato.id],
    conmutadores: { [GRUPO_Q1]: 1 },
    pulsados: [],
  });
  assert.deepEqual(encendidas, ['H1'], 'sólo H1: la salida 98 alimenta la red de la maniobra');
});

test('con S1 pulsada se encienden H1 y H3', () => {
  const { encendidas, bobinas } = simular({
    cerradas: [automato.id],
    conmutadores: { [GRUPO_Q1]: 1 },
    pulsados: ['S1'],
  });
  assert.deepEqual(encendidas, ['H1', 'H3']);
  assert.deepEqual(bobinas, ['K1M'], 'la bobina del contactor queda energizada');
});

test('con S2 pulsada se encienden H1 y H3', () => {
  const { encendidas } = simular({
    cerradas: [automato.id],
    conmutadores: { [GRUPO_Q1]: 1 },
    pulsados: ['S2'],
  });
  assert.deepEqual(encendidas, ['H1', 'H3']);
});

test('con el conmutador en la posición de reposo se enciende H2 y se apaga H1', () => {
  const { encendidas } = simular({
    cerradas: [automato.id],
    conmutadores: { [GRUPO_Q1]: 0 },
    pulsados: [],
  });
  assert.deepEqual(encendidas, ['H2'], 'la salida 96 alimenta la red de H2');
});

test('el conmutador nunca deja las dos salidas conectadas a la vez', () => {
  const built = circuitFrom(PR1.records);
  assert.ok(built);
  const salidas = built.circuit.devices.filter((d) => d.kind === 'changeover');
  assert.equal(salidas.length, 2, 'el Q1 tiene dos salidas');
  for (const position of [0, 1]) {
    const state = simulate(built.circuit, { changeovers: new Map([[GRUPO_Q1, position]]) });
    const cerradas = salidas.filter((d) => state.closed.has(d.id));
    assert.equal(cerradas.length, 1, `en la posición ${position} hay una sola salida cerrada`);
    assert.equal(cerradas[0]!.changeover!.throw, position);
  }
});

test('las protecciones arrancan abiertas: sin cerrarlas no pasa la fase', () => {
  const built = circuitFrom(PR1.records, { openRecords: new Set(protectionIds) });
  assert.ok(built);
  const state = simulate(built.circuit, { changeovers: new Map([[GRUPO_Q1, 1]]) });
  assert.equal(state.loads.size, 0, 'sin el automático cerrado no hay cargas');
  assert.deepEqual([...state.energized], []);
});

test('cerrar el automático deja pasar la fase', () => {
  const open = new Set<number>(protectionIds.filter((id) => id !== automato.id));
  const built = circuitFrom(PR1.records, { openRecords: open });
  assert.ok(built);
  const state = simulate(built.circuit, { changeovers: new Map([[GRUPO_Q1, 1]]) });
  assert.ok(state.loads.size > 0, 'con el automático cerrado se enciende H1');
});

test('el conmutador del mando es el contacto auxiliar del disyuntor de potencia', () => {
  // Mismo designador: son el mismo aparato. Por eso el conmutador no se
  // acciona por separado: su posición la marca el disyuntor.
  const conmutador = PR1.records.find((r) => r.code === 8018)!;
  const disyuntor = PR1.records.find((r) => r.code === 6009)!;
  assert.equal(conmutador.designator, disyuntor.designator, 'comparten designador');
  assert.equal(linkedProtection(PR1.records, conmutador)?.id, disyuntor.id);
});

test('la posición del conmutador la marca el disyuntor', () => {
  const conmutador = PR1.records.find((r) => r.code === 8018)!;
  const disyuntor = PR1.records.find((r) => r.code === 6009)!;
  const posiciones = (cerrado: boolean): Record<string, number> =>
    changeoverPositions(PR1.records, { [disyuntor.id]: cerrado ? 'closed' : 'open' }, {});
  assert.equal(
    posiciones(true)[String(conmutador.id)],
    1,
    'con el disyuntor cerrado el conmutador queda en la posición de maniobra',
  );
  assert.equal(
    posiciones(false)[String(conmutador.id)],
    0,
    'con el disyuntor abierto, en la de reposo',
  );
});

test('el estado de la captura 02 sale del disyuntor, sin tocar el conmutador', () => {
  // El usuario activa el Q1 de potencia y el F0: el conmutador del mando se
  // permuta solo y se enciende H1 (nada más).
  const disyuntor = PR1.records.find((r) => r.code === 6009)!;
  const posiciones = changeoverPositions(PR1.records, { [disyuntor.id]: 'closed' }, {});
  const { encendidas } = simular({
    cerradas: [automato.id, disyuntor.id],
    conmutadores: posiciones,
    pulsados: [],
  });
  assert.deepEqual(encendidas, ['H1']);
});

test('al abrir el disyuntor de potencia se enciende H2 y se apaga H1', () => {
  const disyuntor = PR1.records.find((r) => r.code === 6009)!;
  const posiciones = changeoverPositions(PR1.records, { [disyuntor.id]: 'open' }, {});
  const { encendidas } = simular({
    cerradas: [automato.id, disyuntor.id],
    conmutadores: posiciones,
    pulsados: [],
  });
  assert.deepEqual(encendidas, ['H2'], 'la salida 96 alimenta la red de H2');
});
