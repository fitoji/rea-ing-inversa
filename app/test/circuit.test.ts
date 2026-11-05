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
  assert.equal(simKindOf(fake(6003, 'unknown')), null);
});

test('la alimentación se infiere del dibujo (sin marcas manuales)', () => {
  const built = circuitFrom(ARRANQUE);
  assert.ok(built, 'el arranque tiene símbolos de alimentación y cables de fase/neutro');
  assert.notEqual(built.supply[0], built.supply[1]);
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
