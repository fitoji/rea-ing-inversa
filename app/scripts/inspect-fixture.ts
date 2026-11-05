import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parse } from '../src/format/cade.ts';
import { buildProject } from '../src/model/project.ts';
import { buildNetlist, kindOf } from '../src/sim/netlist.ts';
import { circuitFrom, simKindOf } from '../src/sim/circuit.ts';
import { simulate } from '../src/sim/solver.ts';

const HERE = dirname(fileURLToPath(import.meta.url));
const name = process.argv[2] ?? 'pr1-rodolfo-giusti.cad';
const project = buildProject(parse(readFileSync(join(HERE, '../test/fixtures', name), 'latin1')));

console.log(`${name}: ${project.records.length} registros, ${project.sheets.length} hojas`);
for (const sheet of project.sheets) {
  const recs = project.records.slice(sheet.startRecord, sheet.endRecord);
  console.log(`hoja ${sheet.index}: ${recs.length} registros`);
  for (const r of recs.filter((x) => x.kind === 'component')) {
    console.log(`  comp ${r.id} code=${r.code} des=${r.designator || '-'} kind=${kindOf(r.code)} box=${r.geometry[8]},${r.geometry[9]} ${r.geometry[14]}x${r.geometry[15]}`);
  }
}

const nl = buildNetlist(project.records);
console.log('devices:');
for (const d of nl.devices) {
  console.log(`  ${d.recordId} code=${d.code} kind=${d.kind} sim=${simKindOf(d) ?? '-'} part=${d.part} nets=${d.nets.join(',')}`);
}

const built = circuitFrom(project.records);
console.log('circuitFrom:', built ? `supply=${built.supply} devices=${built.circuit.devices.length}` : 'null');
if (built) {
  for (const d of built.circuit.devices.filter((x) => x.kind === 'buttonNO' || x.kind === 'buttonNC')) {
    const s = simulate(built.circuit, { pressed: new Set([d.id]) });
    console.log(`  press ${d.id} (${d.part}): energized=[${[...s.energized]}] loads=[${[...s.loads]}]`);
  }
}

console.log('nets de interés:');
for (const net of [14, 0, 1, 2, 3, 16]) {
  console.log(`  net ${net} members=${[...(nl.members.get(net) ?? [])].join(',')}`);
  for (const [id, nets] of nl.recordNets) {
    if (!nets.includes(net)) continue;
    const r = project.records.find((x) => x.id === id);
    if (r?.kind === 'connection') {
      console.log(`    cable ${id} code=${r.code} [${r.geometry[8]},${r.geometry[9]} -> ${r.geometry[10]},${r.geometry[11]}]`);
    }
  }
}
