import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parse } from '../src/format/cade.ts';
import { buildProject } from '../src/model/project.ts';
import { buildNetlist, partKey, kindOf, isProtectionCode } from '../src/sim/netlist.ts';

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

test('en el arranque, el contacto auxiliar queda en paralelo con STAR y la bobina en serie', () => {
  // Antes el código 7000 (contacto auxiliar) estaba clasificado como bobina, así
  // que el "contactor" era en realidad su contacto y la bobina real (9000) se
  // leía como motor. Con el mapeo corregido el dibujo dice lo que debe: el
  // auxiliar de -KM1 puentea a STAR (enclavamiento) y la bobina cuelga de la
  // red que sale de ellos.
  const nl = buildNetlist(load('arranque-paro-motor-3f.cad').records);
  const star = nl.devices.find((d) => d.part === 'STAR' && d.kind === 'pushbutton')!;
  const aux = nl.devices.find((d) => d.part === 'KM1' && d.code === 7000)!;
  const coil = nl.devices.find((d) => d.kind === 'coil')!;

  assert.deepEqual([...aux.nets], [...star.nets], 'el auxiliar puentea al pulsador');
  assert.notDeepEqual([...coil.nets], [...star.nets], 'la bobina no está en paralelo con STAR');
  const shared = coil.nets.filter((n) => star.nets.includes(n));
  assert.equal(shared.length, 1, 'la bobina sale de una de las dos redes del pulsador');
});

test('normalización de designador: el guion inicial no cambia el aparato', () => {
  assert.equal(partKey('-KM1'), 'KM1');
  assert.equal(partKey('km1 '), 'KM1');
  assert.equal(partKey('KM1'), 'KM1');
  assert.notEqual(partKey('-KM1'), partKey('-KM2'));
});

test('clasificación de códigos en tipos de aparato', () => {
  assert.equal(kindOf(7000), 'contact');
  assert.equal(kindOf(9000), 'coil');
  assert.equal(kindOf(9008), 'lamp');
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

test('clasificación: los códigos que el ComponentSpec corrige', () => {
  // 8100 era pulsable en la UI y unknown acá: el clic se perdía.
  assert.equal(kindOf(8100), 'pushbutton');
  // 2002 era CONTACT en visual y unknown en el solver.
  assert.equal(kindOf(2002), 'contact');
  // 8101/8102/8103 tienen glifo de lámpara pero nunca fueron lamp.
  assert.equal(kindOf(8101), 'lamp');
  assert.equal(kindOf(8102), 'lamp');
  assert.equal(kindOf(8103), 'lamp');
  // 9004-9007 siguen siendo bobinas, ahora temporizadas.
  assert.equal(kindOf(9004), 'coil');
  assert.equal(kindOf(9007), 'coil');
});

test('isProtectionCode se deriva del ComponentSpec', () => {
  assert.equal(isProtectionCode(6000), true);
  assert.equal(isProtectionCode(6007), true);
  assert.equal(isProtectionCode(6999), true);
  assert.equal(isProtectionCode(8017), true);
  assert.equal(isProtectionCode(8000), false);
  assert.equal(isProtectionCode(8100), false);
  assert.equal(isProtectionCode(12345), false);
});
