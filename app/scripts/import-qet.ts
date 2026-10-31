#!/usr/bin/env node
/**
 * Importa símbolos normalizados de EN 60617 (los que trae QElectroTech) y los
 * convierte al formato de dibujo de simuElectro.
 *
 * Por qué: los dibujos a mano alcanzan para reconocer un componente, pero no son
 * la norma. QElectroTech distribuye una colección de elementos vectoriales
 * basada en EN 60617 (el equivalente europeo de IEC 60617) con los bornes ya
 * declarados. Convertirlos es determinista: cada elemento es XML con líneas,
 * rectángulos, círculos, arcos y polígonos.
 *
 * Licencia: la colección de elementos de QElectroTech es CC-BY 3.0 (ver
 * QET-Elements.NOTICE). El proyecto debe atribuirla; el detalle está en
 * `NOTICE-qet.md`. Este script NO copia la colección: extrae la geometría de los
 * elementos que el proyecto usa y la convierte a su propio formato.
 *
 * Uso: node scripts/import-qet.ts [ruta-a-elements]
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const OUT = join(HERE, '..', 'src', 'symbols', 'qet.ts');
const ROOT =
  process.argv[2] ?? '/Applications/QElectroTech.app/Contents/Resources/elements';
const EN = '10_electric/91_en_60617';

/**
 * Mapa curado: código de CADe_SIMU -> elemento EN 60617.
 *
 * El nombre del elemento no alcanza para elegir con certeza (un contactor y un
 * interruptor comparten familia), así que la tabla es explícita y revisable.
 */
const MAP: { code: number; path: string }[] = [
  { code: 1050, path: `${EN}/en_60617_05/en_60617_05_06/en_60617_05_06_01.elmt` }, // resistencia
  { code: 1051, path: `${EN}/en_60617_05/en_60617_05_06/en_60617_05_06_02.elmt` }, // resistencia III
  { code: 3012, path: `${EN}/en_60617_06/en_60617_06_10/en_60617_06_10_03.elmt` }, // transformador
  { code: 3013, path: `${EN}/en_60617_06/en_60617_06_14/en_60617_06_14_03.elmt` }, // rectificador

  { code: 5000, path: `${EN}/en_60617_07/en_60617_07_21/en_60617_07_21_02.elmt` }, // fusible
  { code: 9008, path: `${EN}/en_60617_08/en_60617_08_10/en_60617_08_10_01.elmt` }, // lámpara
  { code: 9010, path: `${EN}/en_60617_08/en_60617_08_10/en_60617_08_10_06.elmt` }, // timbre
  { code: 9012, path: `${EN}/en_60617_08/en_60617_08_10/en_60617_08_10_09.elmt` }, // sirena
  { code: 9011, path: `${EN}/en_60617_08/en_60617_08_10/en_60617_08_10_10.elmt` }, // zumbador
  { code: 9004, path: `${EN}/en_60617_11/en_60617_11_14/en_60617_11_14_13.elmt` }, // temporizador
  { code: 1000, path: `${EN}/en_60617_06/en_60617_06_08/en_60617_06_08_01.elmt` }, // motor de inducción trifásico
  { code: 1002, path: `${EN}/en_60617_06/en_60617_06_08/en_60617_06_08_02.elmt` }, // motor de inducción monofásico
  { code: 8004, path: `${EN}/en_60617_11/en_60617_11_14/en_60617_11_14_12.elmt` }, // pulsador protegido contra accionamiento involuntario
];

type Pt = [number, number];
interface Shape {
  pts: Pt[];
  closed: boolean;
  fill: boolean;
  thin: boolean;
}
interface Terminal {
  name: string;
  x: number;
  y: number;
  side: 'left' | 'right' | 'top' | 'bottom';
}

const attr = (tag: string, name: string): number => {
  const m = new RegExp(`\\b${name}="(-?[\\d.]+)"`).exec(tag);
  return m ? Number.parseFloat(m[1]!) : 0;
};
const attrText = (tag: string, name: string): string => {
  const m = new RegExp(`\\b${name}="([^"]*)"`).exec(tag);
  return m ? m[1]! : '';
};

const ARC_STEPS = 24;

/** Puntos de un arco de elipse, tal como lo describe QElectroTech. */
function arcPoints(cx: number, cy: number, rx: number, ry: number, start: number, sweep: number): Pt[] {
  const out: Pt[] = [];
  const sign = sweep >= 0 ? 1 : -1;
  const total = Math.abs(sweep);
  for (let i = 0; i <= ARC_STEPS; i++) {
    const a = ((start + (sign * total * i) / ARC_STEPS) * Math.PI) / 180;
    out.push([cx + rx * Math.cos(a), cy - ry * Math.sin(a)]);
  }
  return out;
}

function parseElement(xml: string): { shapes: Shape[]; terminals: Terminal[] } {
  const shapes: Shape[] = [];
  const terminals: Terminal[] = [];

  for (const m of xml.matchAll(/<line\b[^>]*>/g)) {
    const t = m[0];
    shapes.push({
      pts: [
        [attr(t, 'x1'), attr(t, 'y1')],
        [attr(t, 'x2'), attr(t, 'y2')],
      ],
      closed: false,
      fill: false,
      thin: false,
    });
  }

  for (const m of xml.matchAll(/<rect\b[^>]*>/g)) {
    const t = m[0];
    const x = attr(t, 'x');
    const y = attr(t, 'y');
    const w = attr(t, 'width');
    const h = attr(t, 'height');
    shapes.push({
      pts: [
        [x, y],
        [x + w, y],
        [x + w, y + h],
        [x, y + h],
      ],
      closed: true,
      fill: /filling:(black|gray)/.test(t),
      thin: false,
    });
  }

  for (const m of xml.matchAll(/<(?:circle|ellipse)\b[^>]*>/g)) {
    const t = m[0];
    const rx = t.startsWith('<ellipse') ? attr(t, 'rx') : attr(t, 'r');
    const ry = t.startsWith('<ellipse') ? attr(t, 'ry') : attr(t, 'r');
    const cx = t.startsWith('<ellipse') ? attr(t, 'cx') : attr(t, 'cx');
    const cy = t.startsWith('<ellipse') ? attr(t, 'cy') : attr(t, 'cy');
    shapes.push({
      pts: arcPoints(cx, cy, rx, ry, 0, 360),
      closed: true,
      fill: /filling:(black|gray)/.test(t),
      thin: false,
    });
  }

  for (const m of xml.matchAll(/<arc\b[^>]*>/g)) {
    const t = m[0];
    // QElectroTech: x,y = esquina superior izquierda de la caja del arco.
    const x = attr(t, 'x');
    const y = attr(t, 'y');
    const w = attr(t, 'width');
    const h = attr(t, 'height');
    shapes.push({
      pts: arcPoints(x + w / 2, y + h / 2, w / 2, h / 2, attr(t, 'start'), attr(t, 'angle')),
      closed: false,
      fill: false,
      thin: false,
    });
  }

  for (const m of xml.matchAll(/<polyline\b[^>]*>/g)) {
    const t = m[0];
    const pts: Pt[] = [];
    const n = Math.floor((t.match(/\bx\d+="/g) ?? []).length / 1);
    for (let i = 1; i <= n; i++) pts.push([attr(t, `x${i}`), attr(t, `y${i}`)]);
    if (pts.length > 1) shapes.push({ pts, closed: false, fill: false, thin: false });
  }

  for (const m of xml.matchAll(/<polygon\b[^>]*>/g)) {
    const t = m[0];
    const pts: Pt[] = [];
    const n = (t.match(/\bx\d+="/g) ?? []).length;
    for (let i = 1; i <= n; i++) pts.push([attr(t, `x${i}`), attr(t, `y${i}`)]);
    if (pts.length > 1) {
      shapes.push({
        pts,
        closed: !/\bclosed="false"/.test(t),
        fill: /filling:(black|gray)/.test(t),
        thin: false,
      });
    }
  }

  for (const m of xml.matchAll(/<terminal\b[^>]*>/g)) {
    const t = m[0];
    const o = attrText(t, 'orientation');
    const side = o === 'n' ? 'top' : o === 's' ? 'bottom' : o === 'e' ? 'right' : 'left';
    terminals.push({ name: attrText(t, 'name'), x: attr(t, 'x'), y: attr(t, 'y'), side });
  }

  return { shapes, terminals };
}

function convert(code: number, path: string): string | null {
  const xml = readFileSync(join(ROOT, path), 'utf8');
  const body = /<description>([\s\S]*?)<\/description>/.exec(xml)?.[1];
  if (!body) return null;
  const { shapes, terminals } = parseElement(body);

  const xs = [...shapes.flatMap((s) => s.pts.map((p) => p[0])), ...terminals.map((t) => t.x)];
  const ys = [...shapes.flatMap((s) => s.pts.map((p) => p[1])), ...terminals.map((t) => t.y)];
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);
  const width = maxX - minX || 1;
  const height = maxY - minY || 1;

  const nx = (x: number): number => Number(((x - minX) / width).toFixed(3));
  const ny = (y: number): number => Number(((y - minY) / height).toFixed(3));

  const scale = 24 / Math.max(width, height);
  const w = Math.max(6, Math.round(width * scale));
  const h = Math.max(6, Math.round(height * scale));

  const pins = terminals
    .filter((t) => t.side === 'left' || t.side === 'right' || t.side === 'top' || t.side === 'bottom')
    .map((t, i) => ({ name: t.name || String(i + 1), nx: nx(t.x), ny: ny(t.y), side: t.side }));

  const drawn = shapes.map((s) => ({
    pts: s.pts.map((p) => [nx(p[0]), ny(p[1])] as Pt),
    closed: s.closed,
    fill: s.fill,
    thin: s.thin,
  }));

  return `  ${code}: {
    source: ${JSON.stringify(path)},
    size: { w: ${w}, h: ${h} },
    pins: ${JSON.stringify(pins)},
    shapes: [
${drawn.map((s) => `      { pts: ${JSON.stringify(s.pts)}, closed: ${s.closed}, fill: ${s.fill}, thin: ${s.thin} },`).join('\n')}
    ],
  },`;
}

const entries: string[] = [];
for (const { code, path } of MAP) {
  const out = convert(code, path);
  if (out) entries.push(out);
  else console.error(`no se pudo convertir ${path}`);
}

writeFileSync(
  OUT,
  `// GENERADO por scripts/import-qet.ts — no editar a mano.
// Símbolos normalizados de EN 60617 convertidos desde la colección de elementos
// de QElectroTech (licencia CC-BY 3.0, ver NOTICE-qet.md), muestreados a
// polilíneas en coordenadas 0..1 para poder escalarlos a la caja del registro.

export interface QetShape {
  pts: [number, number][];
  closed: boolean;
  fill: boolean;
  thin: boolean;
}

export interface QetPin {
  name: string;
  nx: number;
  ny: number;
  side: 'left' | 'right' | 'top' | 'bottom';
}

export interface QetSymbol {
  source: string;
  size: { w: number; h: number };
  pins: QetPin[];
  shapes: QetShape[];
}

export const QET_SYMBOLS: Record<number, QetSymbol> = {
${entries.join('\n')}
};
`,
);

console.log(`escrito ${OUT}`);
console.log(`  símbolos importados: ${entries.length}/${MAP.length}`);
