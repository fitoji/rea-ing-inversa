/**
 * Color de la señalización óptica.
 *
 * El mapping no se deduce del binario sino de diez archivos que CADe_SIMU
 * escribió con un color elegido a mano: cada valor del índice tiene que
 * coincidir con el color del nombre del archivo, en las dos familias.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

import { parse } from '../src/format/cade.ts';
import { buildProject, serializeProject, LAMP_COLORS, componentsOf, type LampColor } from '../src/model/project.ts';
import { templateForPlacement } from '../src/symbols/place.ts';

const FIXTURES = join(dirname(fileURLToPath(import.meta.url)), 'fixtures');

/**
 * El set de colores vive en `fixtures/luces/`, no en la raíz de fixtures: son
 * archivos de una sola lámpara sin cables, y las suites que recorren el
 * directorio esperan esquemas con aparatos conectados.
 */
const LUCES = join(FIXTURES, 'luces');

function load(name: string) {
  return buildProject(parse(readFileSync(join(FIXTURES, name), 'latin1')));
}

function loadLamp(name: string) {
  return buildProject(parse(readFileSync(join(LUCES, name), 'latin1')));
}

const SAMPLES: { file: string; code: number; color: LampColor }[] = [
  { file: 'luz_verde.cad', code: 9008, color: 0 },
  { file: 'luz_roja.cad', code: 9008, color: 1 },
  { file: 'luz_amarilla.cad', code: 9008, color: 2 },
  { file: 'luz_azul.cad', code: 9008, color: 3 },
  { file: 'luz_gris.cad', code: 9008, color: 4 },
  { file: 'luz_intermitente_verde.cad', code: 9009, color: 0 },
  { file: 'luz_intermitente_rojo.cad', code: 9009, color: 1 },
  { file: 'luz_intermitente_amarillo.cad', code: 9009, color: 2 },
  { file: 'luz_intermitente_azul.cad', code: 9009, color: 3 },
  { file: 'luz_intermitente_gris.cad', code: 9009, color: 4 },
];

test('los cinco colores tienen nombre y el mapping es el que eligió el usuario', () => {
  assert.deepEqual([...LAMP_COLORS], ['verde', 'rojo', 'amarillo', 'azul', 'gris']);
});

for (const { file, code, color } of SAMPLES) {
  test(`${file}: el índice ${color} es ${LAMP_COLORS[color]}`, () => {
    const lamps = componentsOf(loadLamp(file));
    assert.equal(lamps.length, 1);
    assert.equal(lamps[0]!.code, code);
    assert.equal(lamps[0]!.lampColor, color);
    // El color no es un borne: el editor no debe dibujar un pin de más.
    assert.deepEqual(lamps[0]!.pins, ['X1', 'X2']);
    assert.equal(serializeProject(loadLamp(file)), readFileSync(join(LUCES, file), 'latin1'));
  });
}

test('pr1: las tres lámparas del esquema real traen su color', () => {
  const lamps = componentsOf(load('pr1-rodolfo-giusti.cad')).filter((r) => r.code === 9008);
  assert.deepEqual(
    lamps.map((r) => [r.designator, r.lampColor]),
    [
      ['-H', 0],
      ['H1', 2],
      ['H2', 1],
    ],
  );
});

test('8016 no tiene slot de color: bornes 97/98 y color nulo', () => {
  const lamps = componentsOf(load('luz-con-interruptor.cade')).filter((r) => r.code === 8016);
  assert.equal(lamps.length, 1);
  assert.equal(lamps[0]!.lampColor, null);
  assert.deepEqual(lamps[0]!.pins, ['97', '98']);
});

test('8101, 8102 y 8103 llevan el slot de color como el resto de las lámparas (S4)', () => {
  // Tenían glifo de lámpara pero nunca fueron `lamp`: el índice de color que
  // cierra la cabecera se les quedaba dentro de los bornes.
  const text = readFileSync(join(LUCES, 'luz_verde.cad'), 'latin1');
  for (const code of [8101, 8102, 8103]) {
    const lamps = componentsOf(buildProject(parse(text.replace('*0*9008#', `*0*${code}#`))));
    assert.equal(lamps.length, 1);
    assert.equal(lamps[0]!.code, code);
    assert.equal(lamps[0]!.lampColor, 0, `${code}: el índice 0 es verde`);
    assert.deepEqual(lamps[0]!.pins, ['X1', 'X2'], `${code}: el color no es un borne`);
  }
});

test('una lámpara insertada desde la paleta no inventa color', () => {
  const raw = templateForPlacement(9008);
  assert.ok(raw);
  const [lamp] = componentsOf(buildProject(parse(raw)));
  assert.ok(lamp);
  assert.equal(lamp.lampColor, null);
  // Sin slot de color en la cabecera, los bornes quedan intactos.
  assert.equal(lamp.pins.length, 2);
});
