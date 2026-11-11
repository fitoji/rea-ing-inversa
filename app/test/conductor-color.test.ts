import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parse } from '../src/format/cade.ts';
import { buildProject } from '../src/model/project.ts';
import { conductorToneOf } from '../src/editor/conductor.ts';

/**
 * Color del conductor por su tipo en el archivo.
 *
 * Criterio de aceptación: las dos capturas reales de CADeSimu:
 * - `data/samples/tests01/test01.png` (el automático y la lámpara);
 * - `app/test_simu/PR1_Rodolfo_Giusti_03.png` (el cuadro completo del PR1).
 *
 * Los colores medidos son granate `#800000`, azul `#0000ff` y verde `#008000`.
 * Acá se prueba la regla que los produce: el color lo trae el tipo de
 * conductor, no el papel eléctrico del tramo.
 */

const HERE = dirname(fileURLToPath(import.meta.url));

const load = (name: string): number[] => {
  const project = buildProject(parse(readFileSync(join(HERE, 'fixtures', name), 'latin1')));
  return project.records.filter((r) => r.kind === 'connection').map((r) => r.code);
};

test('el color del conductor lo trae su tipo en el archivo', () => {
  assert.equal(conductorToneOf(4000), 'conductor', 'el 4000 es el conductor común');
  assert.equal(conductorToneOf(4009), 'neutro', 'el 4009 va azul');
  assert.equal(conductorToneOf(4010), 'tierra', 'el 4010 va verde');
  assert.equal(conductorToneOf(4019), 'conductor', 'el 4019 es variante del 4000');
});

test('en el fixture de aceptación el 4000 es el conductor común y el 4009 el azul', () => {
  const codes = load('test01-termomag-lampara.cad');
  assert.ok(codes.includes(4000));
  assert.ok(codes.includes(4009));
  // En la captura el 4000 va granate y el 4009 azul, sin importar a qué
  // alimentación toque el tramo.
  assert.deepEqual([...new Set(codes.map(conductorToneOf))].sort(), ['conductor', 'neutro']);
});

test('el color no depende de la red que toca el tramo', () => {
  // En el PR1 el tramo 4000 que cierra sobre la red del neutro (la salida de
  // H3) va granate como todos los demás 4000: si el color fuera por
  // alimentación, ése sería azul.
  const project = buildProject(
    parse(readFileSync(join(HERE, '..', 'test_simu', 'PR1_Rodolfo_Giusti_03.cad'), 'latin1')),
  );
  const wires = project.records.filter((r) => r.kind === 'connection' && r.code !== 4001);
  const porTono = new Map<string, Set<number>>();
  for (const rec of wires) {
    const tono = conductorToneOf(rec.code);
    if (!porTono.has(tono)) porTono.set(tono, new Set());
    porTono.get(tono)!.add(rec.code);
  }
  // Cada tono viene de un único código: el tipo es lo que decide.
  for (const [tono, codigos] of porTono) {
    assert.equal(codigos.size, 1, `el tono ${tono} mezcla los códigos ${[...codigos]}`);
  }
  assert.deepEqual([...porTono.keys()].sort(), ['conductor', 'neutro', 'tierra']);
});
