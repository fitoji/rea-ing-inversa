/**
 * Diagnóstico de extremos sueltos en un fixture `.cad`.
 *
 * Lista cada `orphan-end` con el componente más cercano y la distancia al
 * borde de su caja. No modifica nada; sirve para decidir el snap.
 */
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parse } from '../src/format/cade.ts';
import { boundsOf, buildProject, wirePoints } from '../src/model/project.ts';
import { buildNetwork, validate } from '../src/editor/network.ts';

const HERE = dirname(fileURLToPath(import.meta.url));
const name = process.argv[2] ?? 'inversion-giro-cej.cade';
const text = readFileSync(join(HERE, '../test/fixtures', name), 'latin1');
const project = buildProject(parse(text));
const network = buildNetwork(project.records);
const findings = validate(project.records).filter((f) => f.code === 'orphan-end');

const boxes = project.records
  .filter((r) => r.kind === 'component')
  .map((r) => ({ rec: r, box: boundsOf(r) }))
  .filter((x): x is { rec: (typeof project.records)[number]; box: NonNullable<ReturnType<typeof boundsOf>> } => x.box !== null);

const nearestBox = (x: number, y: number) => {
  let best: { rec: (typeof project.records)[number]; box: NonNullable<ReturnType<typeof boundsOf>>; d: number } | null = null;
  for (const b of boxes) {
    const dx = Math.max(b.box.x - x, 0, x - (b.box.x + b.box.w));
    const dy = Math.max(b.box.y - y, 0, y - (b.box.y + b.box.h));
    const d = Math.hypot(dx, dy);
    if (!best || d < best.d) best = { ...b, d };
  }
  return best;
};

console.log(`${name}: ${findings.length} extremos sueltos`);
for (const f of findings) {
  const at = f.at!;
  const near = nearestBox(at.x, at.y);
  const seg = f.ids[0];
  const rec = project.records.find((r) => r.id === seg);
  const pts = rec ? wirePoints(rec) : null;
  console.log(
    `  (${at.x}, ${at.y}) seg #${seg} cable ${rec?.geometry[21] ?? '?'}`,
    `cerca de ${near?.rec.designator || near?.rec.code} d=${near?.d.toFixed(1)}`,
    pts ? `[${pts.x1},${pts.y1} -> ${pts.x2},${pts.y2}]` : '',
  );
}

// Tees sin unión: también rompen la conducción.
const tees = validate(project.records).filter((f) => f.code === 'tee-without-junction');
console.log(`${name}: ${tees.length} uniones en T sin punto`);
for (const f of tees) console.log(`  (${f.at!.x}, ${f.at!.y}) ids ${f.ids.join(',')}`);
