import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parse } from '../src/format/cade.ts';
import { buildProject } from '../src/model/project.ts';
import { buildNetlist, partKey, kindOf } from '../src/sim/netlist.ts';

const FIXTURES = join(dirname(fileURLToPath(import.meta.url)), 'fixtures');

function load(name: string) {
  return buildProject(parse(readFileSync(join(FIXTURES, name), 'latin1')));
}

const files = readdirSync(FIXTURES).filter((f) => /\.(cade|cad)$/i.test(f));

test('cada archivo produce una netlist con aparatos y redes', () => {
  for (const name of files) {
    const nl = buildNetlist(load(name).records);
    assert.ok(nl.devices.length > 0, `${name}: sin aparatos`);
    assert.ok(nl.sizes.size > 0, `${name}: sin redes`);
    for (const device of nl.devices) {
      for (const net of device.nets) assert.ok(net >= 0, `${name}: net inválida en ${device.designator}`);
    }
  }
});

test('todo aparato con dos bornes conectados declara al menos un polo', () => {
  for (const name of files) {
    const nl = buildNetlist(load(name).records);
    for (const device of nl.devices) {
      if (device.nets.length < 2) continue;
      assert.ok(device.poles.length >= 1, `${name}: ${device.designator} (${device.code}) sin polos`);
      for (const [a, b] of device.poles) {
        assert.ok(a >= 0 && a < device.nets.length);
        assert.ok(b >= 0 && b < device.nets.length);
        assert.notEqual(a, b);
      }
    }
  }
});

test('el designador agrupa las partes del mismo aparato', () => {
  // Inversión de giro: KM1 es el contactor principal (2001) y su auxiliar (7001)
  const nl = buildNetlist(load('inversion-giro-cej.cade').records);
  const km1 = nl.devices.filter((d) => d.part === 'KM1');
  assert.ok(km1.length >= 2, 'KM1 debe tener varias partes');
  assert.ok(km1.some((d) => d.code === 2001), 'falta el contacto de potencia');
  assert.ok(km1.some((d) => d.code === 7001), 'falta el contacto auxiliar');

  // KM2 tiene la bobina: sin eso no hay enclavamiento posible
  const km2 = nl.devices.filter((d) => d.part === 'KM2');
  assert.ok(km2.some((d) => d.kind === 'coil'), 'KM2 debe tener bobina');
});

test('los bornes de un aparato caen en redes distintas cuando el dibujo las separa', () => {
  const nl = buildNetlist(load('arranque-paro-motor-3f.cad').records);
  const motor = nl.devices.find((d) => d.code === 1000)!;
  assert.equal(motor.pinNames.length, 4);
  assert.equal(new Set(motor.nets).size >= 3, true, `el motor debe tener al menos 3 redes: ${JSON.stringify(motor.nets)}`);
});

test('hallazgo documentado: en el arranque, bobina y STAR comparten las dos redes', () => {
  // En `arranque-paro-motor-3f.cad` la bobina -KM1 está dibujada entre los dos
  // extremos de STAR, así que la extracción las deja EN PARALELO. Queda anotado
  // como observación: o el esquema es así, o falta identificar algún campo que
  // diga cómo se conecta la bobina. No se fuerza ninguna interpretación.
  const nl = buildNetlist(load('arranque-paro-motor-3f.cad').records);
  const star = nl.devices.find((d) => d.part === 'STAR' && d.kind === 'pushbutton')!;
  const coil = nl.devices.find((d) => d.kind === 'coil')!;
  assert.deepEqual([...coil.nets], [...star.nets]);
});

test('normalización de designador: el guion inicial no cambia el aparato', () => {
  assert.equal(partKey('-KM1'), 'KM1');
  assert.equal(partKey('km1 '), 'KM1');
  assert.equal(partKey('KM1'), 'KM1');
  assert.notEqual(partKey('-KM1'), partKey('-KM2'));
});

test('clasificación de códigos en tipos de aparato', () => {
  assert.equal(kindOf(7000), 'coil');
  assert.equal(kindOf(2001), 'contact');
  assert.equal(kindOf(7001), 'contact');
  assert.equal(kindOf(8000), 'pushbutton');
  assert.equal(kindOf(8012), 'selector');
  assert.equal(kindOf(8016), 'lamp');
  assert.equal(kindOf(6009), 'fuse');
  assert.equal(kindOf(6007), 'thermal');
  assert.equal(kindOf(1000), 'motor');
  assert.equal(kindOf(3005), 'terminal');
  assert.equal(kindOf(12345), 'unknown');
});
