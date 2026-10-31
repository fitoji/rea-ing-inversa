/**
 * Hoja de contactos de candidatos EN 60617.
 *
 * Qué resuelve: el mapa código CADe → elemento normativo no se puede armar por
 * nombre (un contactor y un interruptor comparten familia, y hay elementos que
 * son sólo un fragmento del símbolo). Esta hoja dibuja los candidatos para
 * elegirlos mirándolos.
 *
 * Uso: node scripts/qet-sheet.ts [salida.html] [ruta-a-elements]
 */
import { readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
import { tmpdir } from 'node:os';
const OUT = process.argv[2] ?? join(tmpdir(), 'qet-sheet.html');
const ROOT = process.argv[3] ?? '/Applications/QElectroTech.app/Contents/Resources/elements';
const EN = join(ROOT, '10_electric', '91_en_60617');

type Pt = [number, number];
interface El {
  path: string;
  name: string;
  shapes: { pts: Pt[]; closed: boolean; fill: boolean }[];
}

const attr = (tag: string, name: string): number => {
  const m = new RegExp(`\\b${name}="(-?[\\d.]+)"`).exec(tag);
  return m ? Number.parseFloat(m[1]!) : 0;
};

function arcPoints(cx: number, cy: number, rx: number, ry: number, start: number, sweep: number): Pt[] {
  const out: Pt[] = [];
  const sign = sweep >= 0 ? 1 : -1;
  const total = Math.abs(sweep);
  for (let i = 0; i <= 16; i++) {
    const a = ((start + (sign * total * i) / 16) * Math.PI) / 180;
    out.push([cx + rx * Math.cos(a), cy - ry * Math.sin(a)]);
  }
  return out;
}

function walk(dir: string, out: string[] = []): string[] {
  for (const f of readdirSync(dir)) {
    const p = join(dir, f);
    if (statSync(p).isDirectory()) walk(p, out);
    else if (f.endsWith('.elmt')) out.push(p);
  }
  return out;
}

const KEYWORDS = (process.argv[4] ?? '').split(',').filter(Boolean).length ? (process.argv[4] ?? '').split(',') : [
  'contactor',
  'interruptor',
  'seccionador',
  'diferencial',
  'final de carrera',
  'pulsador',
  'seta',
  'piloto',
  'lámpara',
  'zumbador',
  'timbre',
  'sirena',
  'temporizador',
  'bobina',
  'transformador',
  'rectificador',
  'resistencia',
  'motor',
  'electroválvula',
  'térmico',
  'fusible',
];

const files = walk(EN).sort();
const rows: El[] = [];

for (const path of files) {
  const xml = readFileSync(path, 'utf8');
  const es = /<name lang="es">([^<]+)<\/name>/.exec(xml)?.[1]?.trim() ?? '';
  const en = /<name lang="en">([^<]+)<\/name>/.exec(xml)?.[1]?.trim() ?? '';
  const hay = `${es} ${en}`.toLowerCase();
  if (!KEYWORDS.some((k) => hay.includes(k))) continue;
  const body = /<description>([\s\S]*?)<\/description>/.exec(xml)?.[1];
  if (!body) continue;

  const shapes: El['shapes'] = [];
  for (const m of body.matchAll(/<line\b[^>]*>/g)) {
    const t = m[0];
    shapes.push({ pts: [[attr(t, 'x1'), attr(t, 'y1')], [attr(t, 'x2'), attr(t, 'y2')]], closed: false, fill: false });
  }
  for (const m of body.matchAll(/<rect\b[^>]*>/g)) {
    const t = m[0];
    const x = attr(t, 'x'), y = attr(t, 'y'), w = attr(t, 'width'), h = attr(t, 'height');
    shapes.push({ pts: [[x, y], [x + w, y], [x + w, y + h], [x, y + h]], closed: true, fill: /filling:(black|gray)/.test(t) });
  }
  for (const m of body.matchAll(/<circle\b[^>]*>/g)) {
    const t = m[0];
    shapes.push({ pts: arcPoints(attr(t, 'cx'), attr(t, 'cy'), attr(t, 'r'), attr(t, 'r'), 0, 360), closed: true, fill: /filling:(black|gray)/.test(t) });
  }
  for (const m of body.matchAll(/<arc\b[^>]*>/g)) {
    const t = m[0];
    const x = attr(t, 'x'), y = attr(t, 'y'), w = attr(t, 'width'), h = attr(t, 'height');
    shapes.push({ pts: arcPoints(x + w / 2, y + h / 2, w / 2, h / 2, attr(t, 'start'), attr(t, 'angle')), closed: false, fill: false });
  }
  for (const m of body.matchAll(/<polygon\b[^>]*>/g)) {
    const t = m[0];
    const n = (t.match(/\bx\d+="/g) ?? []).length;
    const pts: Pt[] = [];
    for (let i = 1; i <= n; i++) pts.push([attr(t, `x${i}`), attr(t, `y${i}`)]);
    if (pts.length > 1) shapes.push({ pts, closed: !/\bclosed="false"/.test(t), fill: /filling:(black|gray)/.test(t) });
  }

  if (shapes.length === 0) continue;
  rows.push({ path: path.slice(ROOT.length + 1), name: es || en, shapes });
}

function toSvg(el: El): string {
  const xs = el.shapes.flatMap((s) => s.pts.map((p) => p[0]));
  const ys = el.shapes.flatMap((s) => s.pts.map((p) => p[1]));
  const minX = Math.min(...xs), maxX = Math.max(...xs);
  const minY = Math.min(...ys), maxY = Math.max(...ys);
  const w = maxX - minX || 1, h = maxY - minY || 1;
  const scale = 70 / Math.max(w, h);
  return el.shapes
    .map((s) => {
      const d =
        s.pts
          .map((p, i) => `${i === 0 ? 'M' : 'L'}${(p[0] - minX) * scale + 5} ${(p[1] - minY) * scale + 5}`)
          .join('') + (s.closed ? 'Z' : '');
      return `<path d="${d}" fill="${s.fill ? '#3a4a5f' : 'none'}" stroke="#c8d4e4" stroke-width="1.1"/>`;
    })
    .join('');
}

const cells = rows
  .map(
    (el) => `<figure>
  <svg width="80" height="80" viewBox="0 0 80 80">${toSvg(el)}</svg>
  <figcaption><b>${el.name}</b><br>${el.path.split('/').slice(-1)[0]}</figcaption>
</figure>`,
  )
  .join('\n');

writeFileSync(
  OUT,
  `<!doctype html><meta charset="utf-8"><title>EN 60617 · candidatos</title>
<style>
 body{background:#0e1116;color:#c8d4e4;font:11px/1.3 system-ui;margin:12px}
 .grid{display:grid;grid-template-columns:repeat(8,minmax(0,1fr));gap:10px}
 figure{margin:0;background:#14181f;border:1px solid #232832;border-radius:6px;padding:6px;text-align:center}
 figcaption{color:#8fa0b6;margin-top:4px;word-break:break-word}
 b{color:#e2e8f0}
</style>
<h2>EN 60617 · ${rows.length} candidatos</h2>
<div class="grid">${cells}</div>`,
);

console.log(`escrito ${OUT}`);
console.log(`  candidatos: ${rows.length}`);
