import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  specOf,
  isPushable,
  isLamp,
  isProtection,
  restStateOf,
  timerOf,
  isLatching,
  type SimKind,
} from '../src/model/component-spec.ts';
import { CATALOG_CODES } from '../src/symbols/catalog.ts';

const SIM_KINDS: ReadonlySet<SimKind> = new Set([
  'coil',
  'contact',
  'pushbutton',
  'selector',
  'lamp',
  'thermal',
  'fuse',
  'motor',
  'terminal',
  'unknown',
]);

/** Códigos con semántica de simulación que el catálogo del binario no lista. */
const EXTRA_CODES = [8016, 8017, 8018];
const SEMANTIC_CODES = [...CATALOG_CODES, ...EXTRA_CODES];

test('bobinas: monoestable, biestable y la de contactor', () => {
  assert.equal(specOf(9000).kind, 'coil');
  assert.equal(specOf(9000).latching, undefined);
  assert.equal(specOf(7018).kind, 'coil');
  assert.deepEqual(specOf(9001), { kind: 'coil', rest: 'open', pressable: false, protection: false, latching: true });
});

test('bobinas temporizadas 9004-9007 llevan su modo de temporizador', () => {
  // Antes el TIMER_COIL de visual esperaba `timerReady` pero el Device nunca
  // llevaba `timer`. Ahora la bobina declara su modo (S: 9004-9007).
  assert.deepEqual(specOf(9004), { kind: 'coil', rest: 'open', pressable: false, protection: false, timer: 'on' });
  assert.deepEqual(specOf(9005), { kind: 'coil', rest: 'open', pressable: false, protection: false, timer: 'off' });
  assert.deepEqual(specOf(9006), { kind: 'coil', rest: 'open', pressable: false, protection: false, timer: 'both' });
  assert.deepEqual(specOf(9007), { kind: 'coil', rest: 'open', pressable: false, protection: false, timer: 'both' });
});

test('contactos: auxiliares, de potencia y los que el solver ignoraba', () => {
  assert.deepEqual(specOf(7000), { kind: 'contact', rest: 'open', pressable: false, protection: false });
  assert.deepEqual(specOf(7001), { kind: 'contact', rest: 'closed', pressable: false, protection: false });
  assert.deepEqual(specOf(2001), { kind: 'contact', rest: 'open', pressable: false, protection: false });
  assert.deepEqual(specOf(2006), { kind: 'contact', rest: 'open', pressable: false, protection: false });
  assert.deepEqual(specOf(8018), { kind: 'contact', rest: 'closed', pressable: false, protection: false });
  // 2002 era CONTACT en visual y unknown en el solver: ahora es contacto NA.
  assert.deepEqual(specOf(2002), { kind: 'contact', rest: 'open', pressable: false, protection: false });
  // 8100 es «Pulsador» (-S) en CATALOG y estaba en PUSH_CODES: el solver lo
  // ignoraba, así que el clic se perdía. Como contacto no alcanzaba.
  // presionable con kind propio.
  assert.deepEqual(specOf(8100), { kind: 'pushbutton', rest: 'open', pressable: true, protection: false });
});

test('contactos temporizados 7004-7015: modo por rango y polaridad NC real', () => {
  for (const code of [7004, 7005, 7006, 7007]) assert.equal(specOf(code).timer, 'on', `${code}`);
  for (const code of [7008, 7009, 7010, 7011]) assert.equal(specOf(code).timer, 'off', `${code}`);
  for (const code of [7012, 7013, 7014, 7015]) assert.equal(specOf(code).timer, 'both', `${code}`);
  for (let code = 7004; code <= 7015; code++) {
    const spec = specOf(code);
    assert.equal(spec.kind, 'contact', `${code}`);
    assert.equal(spec.pressable, false, `${code}`);
    // Los terminados en 5/9/3 son NC: así los dibuja TIMED_NC y así lo declaraba
    // el campo timerNC. El solver trata contactNC temporizado (solver.ts:155),
    // así que la tabla dice la verdad en vez de congelar una divergencia.
    const nc = code === 7005 || code === 7009 || code === 7013;
    assert.equal(spec.rest, nc ? 'closed' : 'open', `${code}`);
  }
});

test('pulsadores 8000-8011: presionables, NC en 8001, 8005 y 8009', () => {
  for (let code = 8000; code <= 8011; code++) {
    const spec = specOf(code);
    assert.equal(spec.kind, 'pushbutton', `${code}`);
    assert.equal(spec.pressable, true, `${code}`);
    assert.equal(spec.rest, [8001, 8005, 8009].includes(code) ? 'closed' : 'open', `${code}`);
  }
});

test('selectores 8012-8015: presionables, NC en 8013 y 8015', () => {
  for (let code = 8012; code <= 8015; code++) {
    const spec = specOf(code);
    assert.equal(spec.kind, 'selector', `${code}`);
    assert.equal(spec.pressable, true, `${code}`);
    assert.equal(spec.rest, [8013, 8015].includes(code) ? 'closed' : 'open', `${code}`);
  }
});

test('lámparas: 9008 y 9009, más 8016 y las 8101-8103 que nunca fueron lamp', () => {
  for (const code of [8016, 9008, 9009, 8101, 8102, 8103]) {
    assert.deepEqual(specOf(code), { kind: 'lamp', rest: 'open', pressable: false, protection: false }, `${code}`);
  }
});

test('protecciones: fusibles 6000-6999 y térmicos 6007/8017', () => {
  for (const code of [6000, 6001, 6006, 6008, 6010, 6999]) {
    assert.deepEqual(specOf(code), { kind: 'fuse', rest: 'open', pressable: false, protection: true }, `${code}`);
  }
  // 6007 cae dentro del rango de fusibles pero es térmico: excepción explícita.
  assert.deepEqual(specOf(6007), { kind: 'thermal', rest: 'open', pressable: false, protection: true });
  // 8017 es el contacto auxiliar NC del relé térmico.
  assert.deepEqual(specOf(8017), { kind: 'thermal', rest: 'closed', pressable: false, protection: true });
});

test('motores y borneras conservan sus rangos', () => {
  for (const code of [1000, 1005, 1010, 10508, 10509]) assert.equal(specOf(code).kind, 'motor', `${code}`);
  for (const code of [3000, 3007, 3014, 3999]) {
    assert.deepEqual(specOf(code), { kind: 'terminal', rest: 'open', pressable: false, protection: false }, `${code}`);
  }
});

test('códigos sin semántica reciben el spec unknown exacto', () => {
  const unknown = { kind: 'unknown', rest: 'open', pressable: false, protection: false };
  // 5000-5009: «fusible/seccionador» del catálogo que no conduce, fuera de
  // alcance declarado (L3). 2000/2003: interruptores que el solver nunca
  // modeló. 9002/9003: fuera del kindOf original. 12345: no existe.
  for (const code of [2000, 2003, 5000, 5009, 9002, 9003, 12345]) {
    assert.deepEqual(specOf(code), unknown, `${code}`);
  }
});

test('predicados derivados de la misma fila', () => {
  assert.equal(isPushable(8100), true);
  assert.equal(isPushable(8005), true);
  assert.equal(isPushable(8014), true);
  assert.equal(isPushable(9000), false);
  assert.equal(isLamp(8016), true);
  assert.equal(isLamp(8101), true);
  assert.equal(isLamp(9009), true);
  assert.equal(isLamp(7000), false);
  assert.equal(isProtection(6000), true);
  assert.equal(isProtection(6007), true);
  assert.equal(isProtection(8017), true);
  assert.equal(isProtection(2001), false);
  assert.equal(restStateOf(7001), 'closed');
  assert.equal(restStateOf(8018), 'closed');
  assert.equal(restStateOf(8005), 'closed');
  assert.equal(restStateOf(7000), 'open');
  assert.equal(timerOf(9004), 'on');
  assert.equal(timerOf(9005), 'off');
  assert.equal(timerOf(9006), 'both');
  assert.equal(timerOf(9007), 'both');
  assert.equal(timerOf(7004), 'on');
  assert.equal(timerOf(7011), 'off');
  assert.equal(timerOf(7015), 'both');
  assert.equal(timerOf(9000), undefined);
  assert.equal(isLatching(9001), true);
  assert.equal(isLatching(9000), false);
});

test('specOf es total: todo código del catálogo recibe un spec usable', () => {
  for (const code of CATALOG_CODES) {
    const spec = specOf(code);
    assert.ok(SIM_KINDS.has(spec.kind), `${code}: kind inválido ${spec.kind}`);
    assert.ok(spec.rest === 'open' || spec.rest === 'closed', `${code}: rest inválido`);
    assert.equal(typeof spec.pressable, 'boolean', `${code}`);
    assert.equal(typeof spec.protection, 'boolean', `${code}`);
    if (spec.timer !== undefined) assert.ok(['on', 'off', 'both'].includes(spec.timer), `${code}`);
  }
});

test('S5: todo código presionable tiene un kind que el solver puede accionar', () => {
  for (const code of SEMANTIC_CODES) {
    if (!specOf(code).pressable) continue;
    assert.ok(
      ['pushbutton', 'selector', 'contact'].includes(specOf(code).kind),
      `${code}: presionable con kind ${specOf(code).kind}`,
    );
  }
});

test('S5: todo código presionable tiene polaridad de reposo definida', () => {
  for (const code of SEMANTIC_CODES) {
    if (!specOf(code).pressable) continue;
    assert.ok(specOf(code).rest === 'open' || specOf(code).rest === 'closed', `${code}`);
  }
});

test('S5: todo código con timer es bobina o contacto (consistente con netlist)', () => {
  for (const code of SEMANTIC_CODES) {
    if (specOf(code).timer === undefined) continue;
    assert.ok(['coil', 'contact'].includes(specOf(code).kind), `${code}: timer con kind ${specOf(code).kind}`);
  }
});

test('S5: protection implica kind fuse o thermal', () => {
  for (const code of SEMANTIC_CODES) {
    if (!specOf(code).protection) continue;
    assert.ok(['fuse', 'thermal'].includes(specOf(code).kind), `${code}: protección con kind ${specOf(code).kind}`);
  }
});
