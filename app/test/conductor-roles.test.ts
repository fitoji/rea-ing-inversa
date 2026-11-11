import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parse } from '../src/format/cade.ts';
import { buildProject, type CadeRecordModel } from '../src/model/project.ts';
import { attachPoints } from '../src/editor/pins.ts';
import { buildNetwork } from '../src/editor/network.ts';
import { conductorRoles, type ConductorRole } from '../src/editor/conductor.ts';

/**
 * Color del conductor por rol eléctrico.
 *
 * Criterio de aceptación: la captura real de CADeSimu
 * (`data/samples/tests01/test01.png`, que no viaja al repo porque `data/` está
 * ignorado). En ese dibujo el conductor de la fase va negro, el del neutro azul
 * y los de la lámpara granate.
 *
 * Los colores medidos son `#000000`, `#0000ff` y `#800000`; acá se prueba la
 * regla que los produce, que es la que decide el color.
 */

const HERE = dirname(fileURLToPath(import.meta.url));

const load = (name: string): { records: CadeRecordModel[]; roles: Map<number, ConductorRole> } => {
  const project = buildProject(parse(readFileSync(join(HERE, 'fixtures', name), 'latin1')));
  const pins = attachPoints(project.records);
  const network = buildNetwork(project.records);
  return { records: project.records, roles: conductorRoles(project.records, network, pins) };
};

/** El conductor que va de un punto a otro, por su geometría. */
const wireBetween = (
  records: CadeRecordModel[],
  roles: Map<number, ConductorRole>,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
): ConductorRole => {
  const rec = records.find(
    (r) =>
      r.kind === 'connection' &&
      r.geometry[8] === x1 &&
      r.geometry[9] === y1 &&
      r.geometry[10] === x2 &&
      r.geometry[11] === y2,
  );
  assert.ok(rec, `no hay conductor de (${x1},${y1}) a (${x2},${y2})`);
  return roles.get(rec.id) ?? 'otro';
};

test('el conductor de la fase va con la fase y el del neutro con el neutro', () => {
  const { records, roles } = load('test01-termomag-lampara.cad');
  // Del terminal de fase (3000 en 117,48) al polo 3 del automático.
  assert.equal(wireBetween(records, roles, 117, 48, 117, 51), 'fase');
  // Del terminal de neutro (3001 en 99,42) al polo 1, en tres tramos.
  assert.equal(wireBetween(records, roles, 99, 42, 99, 45), 'neutro');
  assert.equal(wireBetween(records, roles, 99, 45, 111, 45), 'neutro');
  assert.equal(wireBetween(records, roles, 111, 45, 111, 51), 'neutro');
});

test('los conductores que no tocan ninguna alimentación van como resto', () => {
  const { records, roles } = load('test01-termomag-lampara.cad');
  // Del polo 4 a la lámpara, y el retorno de la lámpara al polo 2.
  assert.equal(wireBetween(records, roles, 117, 63, 117, 72), 'otro');
  assert.equal(wireBetween(records, roles, 117, 84, 117, 96), 'otro');
  assert.equal(wireBetween(records, roles, 111, 96, 117, 96), 'otro');
  assert.equal(wireBetween(records, roles, 111, 63, 111, 96), 'otro');
});

test('el color no lo decide el código del cable ni su número', () => {
  // En el mismo archivo el 4000 aparece en negro y en granate: el código no
  // alcanza. Y el número de cable tampoco (1 negro, 2 granate, 4 granate,
  // 5 azul).
  const { records, roles } = load('test01-termomag-lampara.cad');
  const byCode = new Map<number, Set<ConductorRole>>();
  for (const rec of records) {
    if (rec.kind !== 'connection') continue;
    const role = roles.get(rec.id) ?? 'otro';
    if (!byCode.has(rec.code)) byCode.set(rec.code, new Set());
    byCode.get(rec.code)!.add(role);
  }
  assert.ok(byCode.get(4000)!.size > 1, 'el 4000 debería tener más de un rol');
  assert.deepEqual([...byCode.get(4000)!].sort(), ['fase', 'otro']);
  assert.deepEqual([...byCode.get(4009)!], ['neutro']);
});

test('la regla se sostiene en los otros planos del repo', () => {
  // En el plano grande el mismo 4000 aparece con los tres roles: ninguna regla
  // por código o por número puede explicar el color.
  const { records, roles } = load('inversion-giro-cej.cade');
  const roles4000 = new Set<ConductorRole>();
  for (const rec of records) {
    if (rec.kind !== 'connection' || rec.code !== 4000) continue;
    roles4000.add(roles.get(rec.id) ?? 'otro');
  }
  assert.equal(roles4000.size, 3, `el 4000 debería tener tres roles, tiene ${[...roles4000]}`);
});
