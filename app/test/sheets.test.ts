import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parse } from '../src/format/cade.ts';
import { buildProject, serializeProject } from '../src/model/project.ts';
import { buildNetwork, cableNumberOf, cableSegments } from '../src/editor/network.ts';
import { createEditor, moveVertex } from '../src/editor/state.ts';

const FIXTURES = join(dirname(fileURLToPath(import.meta.url)), 'fixtures');
const MULTI = readFileSync(join(FIXTURES, 'inversion-giro-cej.cade'), 'latin1');

const SHEET_TITLE = (id: number): string =>
  `*${id}*20000#XXX#########*0*0*0*0*0*0*0*0*42*486*0*0*0*0*0*0*0*0*0*0*0*0*0#$$$*1*1*1*2*5*0*1*0*0*279*210&&&*           *`;

test('un tramo en cada hoja con la misma geometría son dos redes distintas', () => {
  const project = buildProject(parse(MULTI));
  const sheet0 = project.sheets[0]!;
  const wire = project.records
    .slice(sheet0.startRecord, sheet0.endRecord)
    .find((r) => r.kind === 'connection' && r.code === 4000)!;
  assert.ok(wire, 'el fixture tiene un cable de fase en la primera hoja');

  const before = buildNetwork(project.records).nodes.size;

  // Hoja nueva al final del archivo con una copia exacta del mismo tramo: mismos
  // x/y, mismo número de cable, otra página.
  const dupId = Math.max(...project.records.map((r) => r.id)) + 1;
  const dupRaw = wire.raw.replace(/^\*\d+\*/, `*${dupId}*`);
  const opened = serializeProject(project) + SHEET_TITLE(dupId - 1) + dupRaw;

  const after = buildNetwork(buildProject(parse(opened)).records);
  assert.equal(
    after.nodes.size,
    before + 2,
    'los dos extremos de la hoja nueva no pueden fundirse con los de la primera',
  );
});

test('el número de cable es por hoja: cableSegments no cruza páginas', () => {
  const project = buildProject(parse(MULTI));
  const sheet0 = project.sheets[0]!;
  const sheet1 = project.sheets[1]!;
  const idsOf = (s: typeof sheet0): Set<number> =>
    new Set(project.records.slice(s.startRecord, s.endRecord).map((r) => r.id));

  const inSheet0 = idsOf(sheet0);
  const inSheet1 = idsOf(sheet1);
  const network = buildNetwork(project.records);

  // El cable 4 aparece en las dos hojas de este archivo real.
  const wire4 = project.records
    .slice(sheet0.startRecord, sheet0.endRecord)
    .find((r) => r.kind === 'connection' && r.code !== 4001 && cableNumberOf(r) === 4);
  assert.ok(wire4, 'la primera hoja numera el cable 4');

  const group = cableSegments(network, wire4.id);
  assert.deepEqual(
    group.filter((id) => inSheet1.has(id)),
    [],
    'el cable 4 de la primera hoja no puede arrastrar tramos de la segunda',
  );
  assert.ok(group.every((id) => inSheet0.has(id)));
});

test('la fase y el neutro de una hoja no alimentan la otra', () => {
  const project = buildProject(parse(MULTI));
  const network = buildNetwork(project.records);
  const keys = [...network.nodes.keys()];
  assert.ok(keys.length > 0);
  // Toda clave de red declara su hoja: sin eso, dos páginas con el mismo punto
  // son el mismo nodo.
  assert.ok(
    keys.every((k) => /^\d+\|/.test(k)),
    `las claves de red deben empezar con la hoja, por ejemplo "0|42,486" (recibí "${keys[0]}")`,
  );
});

test('cada registro sabe a qué hoja pertenece', () => {
  const project = buildProject(parse(MULTI));
  assert.equal(project.sheets.length, 2);
  for (const [i, sheet] of project.sheets.entries()) {
    const slice = project.records.slice(sheet.startRecord, sheet.endRecord);
    assert.ok(slice.length > 0);
    assert.ok(
      slice.every((r) => r.sheet === i),
      `los registros de la hoja ${i} deben declarar índice ${i}`,
    );
  }
});

test('arrastrar un vértice en la hoja 1 deja la selección en esa hoja', () => {
  const project = buildProject(parse(MULTI));
  const sheet1 = project.sheets[1]!;
  const sheet0Ids = new Set(project.records.slice(0, sheet1.startRecord).map((r) => r.id));
  // El cable 4 existe en las dos hojas de este archivo.
  const wire = project.records
    .slice(sheet1.startRecord, sheet1.endRecord)
    .find((r) => r.kind === 'connection' && r.code !== 4001 && cableNumberOf(r) === 4)!;
  const from = { x: wire.geometry[8]!, y: wire.geometry[9]! };
  const to = { x: from.x + 6, y: from.y };

  const next = moveVertex(createEditor(MULTI), from, to, sheet1.index);
  assert.ok(next.selection.length > 0, 'la selección tiene que seguir al cable que se movió');
  assert.deepEqual(
    next.selection.filter((id) => sheet0Ids.has(id)),
    [],
    'la selección no puede arrastrar tramos de la otra hoja aunque compartan número de cable',
  );
});

test('ninguna red mezcla cables y bornes de hojas distintas', () => {
  // El caso real: tres bornes de la hoja 1 caen sobre extremos de cable de la
  // hoja 0 (54,69 / 54,78 / 54,84) y se fundían con ese cableado.
  const project = buildProject(parse(MULTI));
  const network = buildNetwork(project.records);
  const sheetById = new Map(project.records.map((r) => [r.id, r.sheet]));

  for (const node of network.nodes.values()) {
    for (const segId of [...node.ends, ...node.through]) {
      assert.equal(
        sheetById.get(segId),
        node.sheet,
        `el nodo ${node.key} no puede tocar el tramo ${segId} de otra hoja`,
      );
    }
  }
});
