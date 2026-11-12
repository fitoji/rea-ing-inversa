import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parse } from '../src/format/cade.ts';
import { buildProject } from '../src/model/project.ts';
import { circuitFrom, cableTypeOf, simKindOf } from '../src/sim/circuit.ts';
import { type Device } from '../src/sim/netlist.ts';
import { simulate } from '../src/sim/solver.ts';

const FIXTURES = join(dirname(fileURLToPath(import.meta.url)), 'fixtures');
const ARRANQUE = buildProject(parse(readFileSync(join(FIXTURES, 'arranque-paro-motor-3f.cad'), 'latin1'))).records;
const INVERSION = buildProject(parse(readFileSync(join(FIXTURES, 'inversion-giro-cej.cade'), 'latin1')));
const INVERSION_MINI = buildProject(parse(readFileSync(join(FIXTURES, 'inversion-giro-mini.cade'), 'latin1')));
const PR1 = buildProject(parse(readFileSync(join(FIXTURES, 'pr1-rodolfo-giusti.cad'), 'latin1')));

test('los tipos de cable son códigos distintos, no colores', () => {
  assert.equal(cableTypeOf(4000), 'phase');
  assert.equal(cableTypeOf(4010), 'neutral');
  assert.equal(cableTypeOf(4009), 'control');
  assert.equal(cableTypeOf(4019), 'control');
  assert.equal(cableTypeOf(4001), 'junction');
  assert.equal(cableTypeOf(1234), 'unknown');
});

test('cada aparato mapea a un comportamiento del solver', () => {
  const fake = (code: number, kind: Device['kind']): Device =>
    ({ recordId: 1, code, designator: 'X', part: 'X', kind, pinNames: [], nets: [0, 1], poles: [[0, 1]] });
  assert.equal(simKindOf(fake(9000, 'coil')), 'coil');
  assert.equal(simKindOf(fake(7001, 'contact')), 'contactNC');
  assert.equal(simKindOf(fake(2001, 'contact')), 'contactNO');
  assert.equal(simKindOf(fake(8000, 'pushbutton')), 'buttonNO');
  assert.equal(simKindOf(fake(8001, 'pushbutton')), 'buttonNC');
  assert.equal(simKindOf(fake(6009, 'fuse')), 'fuse');
  assert.equal(simKindOf(fake(6007, 'thermal')), 'thermal');
  assert.equal(simKindOf(fake(1000, 'motor')), 'motor');
  // El kind lo manda el código vía ComponentSpec: un Device con kind
  // 'unknown' y código 6003 ya no puede existir (6003 es un fusible).
  assert.equal(simKindOf(fake(12345, 'unknown')), null);
});

test('simKindOf deriva kind y polaridad del ComponentSpec', () => {
  const fake = (code: number, kind: Device['kind']): Device =>
    ({ recordId: 1, code, designator: 'X', part: 'X', kind, pinNames: [], nets: [0, 1], poles: [[0, 1]] });
  // La polaridad NA/NC sale de `specOf(code).rest`, no de una lista suelta.
  // El 8018 es un conmutador de dos posiciones, no un contacto NC doble.
  assert.equal(simKindOf(fake(8018, 'changeover')), 'changeover');
  assert.equal(simKindOf(fake(2002, 'contact')), 'contactNO', '2002 era unknown en el solver');
  assert.equal(simKindOf(fake(8100, 'pushbutton')), 'buttonNO', '8100 era unknown y el clic se perdía');
  assert.equal(simKindOf(fake(8005, 'pushbutton')), 'buttonNC');
  assert.equal(simKindOf(fake(8009, 'pushbutton')), 'buttonNC');
  assert.equal(simKindOf(fake(8013, 'selector')), 'buttonNC');
  assert.equal(simKindOf(fake(8015, 'selector')), 'buttonNC');
  assert.equal(simKindOf(fake(8017, 'thermal')), 'contactNC', '8017 es el contacto NC del relé térmico');
  assert.equal(simKindOf(fake(8101, 'lamp')), 'lamp');
});

// Plano mínimo con alimentación L/N, un pulsador y una lámpara; los tests
// cambian el código conservando la geometría para probar la semántica nueva.
const LUZ = readFileSync(join(FIXTURES, 'luz-con-interruptor.cade'), 'latin1');
const luzWith = (from: string, to: string) => buildProject(parse(LUZ.replace(from, to))).records;
const built = (b: NonNullable<ReturnType<typeof circuitFrom>>, part: string) =>
  b.circuit.devices.find((d) => d.part === part)!;

test('la bobina temporizada 9004 llega al circuito con su modo', () => {
  const built = circuitFrom(luzWith('8016#-H1', '9004#-KT1'));
  assert.ok(built, 'el plano debe armar circuito');
  const device = built.devices.find((d) => d.part === 'KT1');
  assert.ok(device, 'la bobina temporizada debe estar en la netlist');
  assert.equal(device.kind, 'coil');
  assert.equal(device.timer, 'on', 'el Device lleva el modo: antes TIMER_COIL esperaba timerReady y nunca llegaba');
  const sim = built.circuit.devices.find((d) => d.part === 'KT1');
  assert.ok(sim);
  assert.equal(sim.kind, 'coil');
  assert.equal(sim.timer, 'on', 'el SimDevice hereda el modo de temporizador');

  // El timer en una bobina no rompe la detección de carga: se energiza igual.
  const button = built.circuit.devices.find((d) => d.part === 'S1')!;
  const pressed = simulate(built.circuit, { pressed: new Set([button.id]) });
  assert.equal(pressed.energized.has('KT1'), true);
});

test('8100 se comporta igual que un pulsador que ya funcionaba', () => {
  // S3: «8100 está en PUSH_CODES pero kindOf lo devuelve unknown, así que el
  // clic se pierde». La prueba no es que encienda una carga en este plano (el
  // plano de luz no se energiza ni con 8000), sino que reemplazar 8000 por 8100
  // sea indistinguible para el solver: misma netlist, mismo resultado al
  // presionar. Antes, 8100 ni siquiera llegaba a la netlist.
  const reference = circuitFrom(luzWith('8000#-S1', '8000#-S1'));
  const candidate = circuitFrom(luzWith('8000#-S1', '8100#-S1'));
  assert.ok(reference && candidate);

  const kinds = (built: NonNullable<typeof candidate>): string[] =>
    built.circuit.devices.map((d) => `${d.part}:${d.kind}`).sort();
  assert.deepEqual(kinds(candidate), kinds(reference), 'la netlist de 8100 debe ser la de un pulsador');

  const button = built(candidate, 'S1');
  assert.equal(button.kind, 'buttonNO', 'CATALOG lo lista como «Pulsador» (-S)');

  const run = (built: NonNullable<typeof candidate>, pressed: boolean): string[] => {
    const device = built.circuit.devices.find((d) => d.part === 'S1')!;
    const result = simulate(built.circuit, { pressed: pressed ? new Set([device.id]) : new Set<string>() });
    return [...result.energized].sort();
  };
  assert.deepEqual(run(candidate, true), run(reference, true), 'presionar 8100 debe dar el mismo estado que presionar 8000');
  assert.deepEqual(run(candidate, false), run(reference, false));
});

test('8101 se simula como lámpara', () => {
  const built = circuitFrom(luzWith('8016#-H1', '8101#-H1'));
  assert.ok(built);
  const sim = built.circuit.devices.find((d) => d.part === 'H1');
  assert.ok(sim, 'la lámpara debe llegar al solver');
  assert.equal(sim.kind, 'lamp');
});

test('la alimentación se infiere del dibujo (sin marcas manuales)', () => {
  const built = circuitFrom(ARRANQUE);
  assert.ok(built, 'el arranque tiene símbolos de alimentación y cables de fase/neutro');
  assert.notEqual(built.supply[0], built.supply[1]);
});

test('inversión de giro: la alimentación 3005+3003 también se infiere', () => {
  const sheet = INVERSION.sheets[0]!;
  const built = circuitFrom(INVERSION.records.slice(sheet.startRecord, sheet.endRecord));
  assert.ok(built, 'la hoja de potencia/control debe armar circuito');
  assert.notEqual(built.supply[0], built.supply[1]);
  assert.ok(built.circuit.devices.some((d) => d.kind === 'motor'));
});

test('el arranque directo simula de verdad', () => {
  const built = circuitFrom(ARRANQUE);
  assert.ok(built, 'el circuito debe armarse');

  const idle = simulate(built.circuit);
  assert.equal(idle.stable, true);
  assert.equal(idle.energized.size, 0, 'en reposo no hay nada energizado');

  const star = built.circuit.devices.find((d) => d.kind === 'buttonNO');
  assert.ok(star, 'el arranque tiene que tener un pulsador NA');

  const pressed = simulate(built.circuit, { pressed: new Set([star.id]) });
  assert.equal(pressed.stable, true);
  assert.equal(pressed.energized.has('KM1'), true, 'STAR debe energizar el contactor');
  assert.ok(pressed.loads.size > 0, 'la bobina debe quedar como carga activa');

  // El lienzo pinta los cables con `liveNets`: en reposo llega la fase, y con
  // STAR apretado la maniobra suma redes hasta el retorno.
  assert.equal(idle.liveNets.has(built.circuit.supply[0]), true, 'la fase siempre está viva');
  assert.ok(pressed.liveNets.size > idle.liveNets.size, 'apretar STAR debe encender más tramos');
});

test('el pulsador de paro corta la maniobra', () => {
  const built = circuitFrom(ARRANQUE)!;
  const star = built.circuit.devices.find((d) => d.kind === 'buttonNO')!;
  const stop = built.circuit.devices.find((d) => d.kind === 'buttonNC')!;

  const running = simulate(built.circuit, { pressed: new Set([star.id]) });
  assert.equal(running.energized.has('KM1'), true);

  const stopped = simulate(built.circuit, {
    pressed: new Set([star.id, stop.id]),
    initialEnergized: running.energized,
  });
  assert.equal(stopped.energized.has('KM1'), false, 'PARO debe abrir la maniobra');
});

test('un dibujo sin cables de alimentación no arma circuito', () => {
  assert.equal(circuitFrom([]), null);
});

test('pr1: los pulsadores, el automático y el disyuntor conducen', () => {
  const built = circuitFrom(PR1.records);
  assert.ok(built, 'el plano debe armar circuito');
  const s1 = built.circuit.devices.find((d) => d.part === 'S1');
  assert.ok(s1, 'falta el pulsador S1');

  // El Q1 es un conmutador de dos posiciones. En su posición de reposo queda
  // conectada la salida 96 (la red de H2) y la de la maniobra no, así que la
  // fase no llega a la bobina: hace falta pasar el conmutador.
  const changeover = built.circuit.devices.find((d) => d.kind === 'changeover');
  assert.ok(changeover?.changeover, 'el Q1 debe ser un conmutador de dos posiciones');
  const group = changeover.changeover.group;

  const enReposo = simulate(built.circuit, { pressed: new Set([s1.id]) });
  assert.equal(enReposo.energized.has('K1M'), false, 'en reposo el conmutador no alimenta la maniobra');

  const accionado = simulate(built.circuit, {
    pressed: new Set([s1.id]),
    changeovers: new Map([[group, 1]]),
  });
  assert.equal(accionado.energized.has('K1M'), true);
  assert.ok(accionado.loads.size > 0, 'el motor y las lámparas deben quedar como cargas');
  assert.ok(built.circuit.devices.some((d) => d.kind === 'fuse'), 'el automático/diyuntor debe estar en el circuito');
});

test('pr1: abrir el automático corta la maniobra', () => {
  const breaker = PR1.records.find((r) => r.code === 6000)!;
  const conTodo = circuitFrom(PR1.records);
  assert.ok(conTodo);
  const changeover = conTodo.circuit.devices.find((d) => d.kind === 'changeover');
  assert.ok(changeover?.changeover);
  const group = changeover.changeover.group;

  const built = circuitFrom(PR1.records, { openRecords: new Set([breaker.id]) });
  assert.ok(built);
  const s1 = built.circuit.devices.find((d) => d.part === 'S1');
  assert.ok(s1);
  const pressed = simulate(built.circuit, {
    pressed: new Set([s1.id]),
    changeovers: new Map([[group, 1]]),
  });
  assert.equal(pressed.energized.has('K1M'), false);
});

test('pr1: abrir el disyuntor deja el motor sin alimentación', () => {
  const breaker = PR1.records.find((r) => r.code === 6009)!;
  const built = circuitFrom(PR1.records, { openRecords: new Set([breaker.id]) });
  assert.ok(built);
  const s1 = built.circuit.devices.find((d) => d.part === 'S1');
  assert.ok(s1);
  const pressed = simulate(built.circuit, { pressed: new Set([s1.id]) });
  assert.equal(
    [...pressed.loads].some((id) => id.startsWith('44:')),
    false,
    'el motor no debe quedar como carga',
  );
});

test('inversión de giro completa: enclavamiento propio y NC cruzado', () => {
  const built = circuitFrom(INVERSION_MINI.records);
  assert.ok(built, 'el fixture mini debe armar circuito');

  const s1 = built.circuit.devices.find((d) => d.part === 'S1')!;
  const s2 = built.circuit.devices.find((d) => d.part === 'S2')!;
  assert.ok(s1 && s2, 'faltan los pulsadores');

  const km1 = simulate(built.circuit, { pressed: new Set([s1.id]) });
  assert.equal(km1.energized.has('KM1'), true);
  assert.equal(km1.energized.has('KM2'), false);

  const km2 = simulate(built.circuit, { pressed: new Set([s2.id]) });
  assert.equal(km2.energized.has('KM2'), true);
  assert.equal(km2.energized.has('KM1'), false);

  // Con KM1 enclavado, el NC cruzado impide arrancar el otro sentido.
  const cross = simulate(built.circuit, { pressed: new Set([s2.id]), initialEnergized: km1.energized });
  assert.equal(cross.energized.has('KM1'), true);
  assert.equal(cross.energized.has('KM2'), false);
});
