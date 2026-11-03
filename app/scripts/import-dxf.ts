#!/usr/bin/env node
/**
 * Genera `src/symbols/dxf.ts`: extrae símbolos de una hoja DXF y los convierte
 * al formato de dibujo de simuElectro (polilíneas normalizadas 0..1).
 *
 * Por qué existe: la hoja `SIMBOELE.dxf` es una biblioteca de símbolos de
 * instalación dibujada sin bloques — cada símbolo es un puñado de líneas,
 * círculos, arcos y sólidos sueltos, con su rótulo debajo. Este script agrupa
 * esas entidades por cercanía, les asocia el rótulo y recorta el grupo.
 *
 * Qué NO hace: no define bornes. Los bornes siguen siendo los del código de
 * CADe_SIMU (el registro los guarda y el CAD los espera así); acá sólo se
 * reemplaza el dibujo. Es la misma regla que `qet-adapter.ts`.
 *
 * El mapa es curado: cada entrada fija el rótulo esperado y su posición en la
 * hoja, así el recorte no depende de adivinar por nombre repetido.
 *
 * Uso: node scripts/import-dxf.ts [ruta-al.dxf]
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const OUT = join(HERE, '..', 'src', 'symbols', 'dxf.ts');
const DEFAULT = join(HERE, '..', '..', 'data', 'samples', 'SIMBOELE.dxf');

interface Ent {
  type: string;
  a: Record<number, string[]>;
}
interface Box {
  x0: number;
  y0: number;
  x1: number;
  y1: number;
}

const num = (e: Ent, code: number, i = 0): number => Number(e.a[code]?.[i] ?? 0);

function readEntities(path: string): Ent[] {
  const raw = readFileSync(path, 'latin1').split(/\r?\n/);
  const pairs: [number, string][] = [];
  for (let i = 0; i + 1 < raw.length; i += 2) pairs.push([Number(raw[i]!.trim()), raw[i + 1]!]);

  const out: Ent[] = [];
  let section: string | null = null;
  let cur: Ent | null = null;
  for (let i = 0; i < pairs.length; i++) {
    const [code, value] = pairs[i]!;
    if (code === 0 && value === 'SECTION') {
      section = pairs[i + 1]?.[1] ?? null;
      continue;
    }
    if (code === 0 && value === 'ENDSEC') {
      section = null;
      continue;
    }
    if (section !== 'ENTITIES') continue;
    if (code === 0) {
      if (cur) out.push(cur);
      cur = { type: value, a: {} };
      continue;
    }
    if (!cur) continue;
    (cur.a[code] ??= []).push(value);
  }
  if (cur) out.push(cur);
  return out;
}

/** Caja de una entidad de dibujo (los TEXT se tratan aparte). */
function boxOf(e: Ent): Box | null {
  if (e.type === 'LINE') {
    return {
      x0: Math.min(num(e, 10), num(e, 11)),
      y0: Math.min(num(e, 20), num(e, 21)),
      x1: Math.max(num(e, 10), num(e, 11)),
      y1: Math.max(num(e, 20), num(e, 21)),
    };
  }
  if (e.type === 'CIRCLE' || e.type === 'ARC') {
    const r = num(e, 40);
    return { x0: num(e, 10) - r, y0: num(e, 20) - r, x1: num(e, 10) + r, y1: num(e, 20) + r };
  }
  if (e.type === 'SOLID') {
    const xs = [num(e, 10), num(e, 11), num(e, 12), num(e, 13)];
    const ys = [num(e, 20), num(e, 21), num(e, 22), num(e, 23)];
    return { x0: Math.min(...xs), y0: Math.min(...ys), x1: Math.max(...xs), y1: Math.max(...ys) };
  }
  if (e.type === 'LWPOLYLINE') {
    const xs = (e.a[10] ?? []).map(Number);
    const ys = (e.a[20] ?? []).map(Number);
    if (xs.length === 0) return null;
    return { x0: Math.min(...xs), y0: Math.min(...ys), x1: Math.max(...xs), y1: Math.max(...ys) };
  }
  if (e.type === 'POINT') {
    return { x0: num(e, 10), y0: num(e, 20), x1: num(e, 10), y1: num(e, 20) };
  }
  return null;
}

/** Puntos de una entidad, ya en coordenadas de la hoja. */
function pointsOf(e: Ent): [number, number][] {
  if (e.type === 'LINE') return [
    [num(e, 10), num(e, 20)],
    [num(e, 11), num(e, 21)],
  ];
  if (e.type === 'CIRCLE') {
    const cx = num(e, 10);
    const cy = num(e, 20);
    const r = num(e, 40);
    return Array.from({ length: 49 }, (_, i) => {
      const a = (i / 48) * Math.PI * 2;
      return [cx + r * Math.cos(a), cy + r * Math.sin(a)] as [number, number];
    });
  }
  if (e.type === 'ARC') {
    const cx = num(e, 10);
    const cy = num(e, 20);
    const r = num(e, 40);
    const a0 = num(e, 50);
    let a1 = num(e, 51);
    while (a1 < a0) a1 += 360;
    const steps = Math.max(8, Math.round((a1 - a0) / 6));
    return Array.from({ length: steps + 1 }, (_, i) => {
      const a = ((a0 + ((a1 - a0) * i) / steps) * Math.PI) / 180;
      return [cx + r * Math.cos(a), cy + r * Math.sin(a)] as [number, number];
    });
  }
  if (e.type === 'SOLID') {
    return [
      [num(e, 10), num(e, 20)],
      [num(e, 11), num(e, 21)],
      [num(e, 12), num(e, 22)],
      [num(e, 13), num(e, 23)],
      [num(e, 10), num(e, 20)],
    ];
  }
  if (e.type === 'LWPOLYLINE') {
    const xs = (e.a[10] ?? []).map(Number);
    const ys = (e.a[20] ?? []).map(Number);
    const pts = xs.map((x, i) => [x, ys[i] ?? 0] as [number, number]);
    const closed = (Number(e.a[70]?.[0] ?? 0) & 1) === 1;
    return closed && pts.length > 0 ? [...pts, pts[0]!] : pts;
  }
  return [];
}

/**
 * Mapa curado: código de CADe_SIMU → rótulo de la hoja y su posición.
 *
 * Se exige rótulo Y posición porque varios símbolos comparten nombre ("CONTACTO",
 * "PULSADOR") y el rótulo de dos líneas aparece repetido en la hoja.
 */
const MAP: { code: number; label: string; at: [number, number] }[] = [
  { code: 2006, label: 'CONTACTOR (UNIPOLAR)', at: [354, 257] },
  { code: 2000, label: 'CONTACTOR BIPOLAR', at: [329, 256] },
  { code: 2001, label: 'CONTACTOR TRIPOLAR', at: [299, 257] },
  { code: 5000, label: 'FUSIBLE (UNIPOLAR)', at: [112, 256] },
  { code: 5002, label: 'FUSIBLE BIPOLAR', at: [96, 256] },
  { code: 5003, label: 'FUSIBLE TRIPOLAR', at: [73, 256] },
  { code: 5005, label: 'SECCIONADOR UNIPOLAR', at: [280, 257] },
  { code: 5008, label: 'SECCIONADOR TRIPOLAR', at: [238, 256] },
  { code: 6018, label: 'DIFERENCIAL BIPOLAR', at: [74, 226] },
  // 6017 queda fuera: la hoja no trae un magnetotérmico bipolar de dos bornes que
  // coincida con el código, y no se tocan los bornes para forzarlo.
  { code: 1004, label: 'MOTOR TRIFASICO (ANILLOS ROZANTES)', at: [186, 191] },
  { code: 8000, label: 'PULSADOR APERTURA', at: [215, 224] },
];

interface Group {
  box: Box;
  ents: Ent[];
  label: string;
  anchor: [number, number];
}

/** Agrupa por cercanía de cajas (union-find) y asocia el rótulo de abajo. */
function groupEntities(ents: Ent[]): Group[] {
  const geo = ents
    .filter((e) => e.type !== 'TEXT')
    .map((e) => ({ e, b: boxOf(e) }))
    .filter((o): o is { e: Ent; b: Box } => o.b !== null);
  const texts = ents
    .filter((e) => e.type === 'TEXT')
    .map((t) => {
      const h = num(t, 40) || 2;
      return { text: (t.a[1]?.[0] ?? '').trim(), x: num(t, 10), y: num(t, 20), h };
    })
    .filter((t) => t.text.length > 0);

  const parent = geo.map((_, i) => i);
  const find = (i: number): number => (parent[i] === i ? i : (parent[i] = find(parent[i]!)));
  const union = (a: number, b: number): void => {
    const ra = find(a);
    const rb = find(b);
    if (ra !== rb) parent[rb] = ra;
  };
  const gap = (a: Box, b: Box): number => {
    const dx = Math.max(0, Math.max(a.x0, b.x0) - Math.min(a.x1, b.x1));
    const dy = Math.max(0, Math.max(a.y0, b.y0) - Math.min(a.y1, b.y1));
    return Math.hypot(dx, dy);
  };

  const TOL = 2;
  for (let i = 0; i < geo.length; i++) {
    for (let j = i + 1; j < geo.length; j++) {
      if (gap(geo[i]!.b, geo[j]!.b) <= TOL) union(i, j);
    }
  }

  const buckets = new Map<number, { e: Ent; b: Box }[]>();
  geo.forEach((o, i) => {
    const root = find(i);
    const list = buckets.get(root) ?? [];
    list.push(o);
    buckets.set(root, list);
  });

  return [...buckets.values()].map((list) => {
    const box: Box = {
      x0: Math.min(...list.map((o) => o.b.x0)),
      y0: Math.min(...list.map((o) => o.b.y0)),
      x1: Math.max(...list.map((o) => o.b.x1)),
      y1: Math.max(...list.map((o) => o.b.y1)),
    };
    // Rótulo: una o dos líneas justo debajo del dibujo, centradas en su columna.
    const near = texts
      .filter((t) => {
        const cx = t.x + (t.text.length * t.h * 0.6) / 2;
        return cx >= box.x0 - 8 && cx <= box.x1 + 8 && t.y <= box.y0 + 3 && t.y >= box.y0 - 15;
      })
      .sort((a, b) => b.y - a.y);
    return {
      box,
      ents: list.map((o) => o.e),
      label: near.map((t) => t.text).join(' ').replace(/\s+/g, ' ').trim(),
      anchor: [box.x0, box.y0] as [number, number],
    };
  });
}

const path = process.argv[2] ?? DEFAULT;
const groups = groupEntities(readEntities(path));

const found: { code: number; label: string; shapes: number }[] = [];
const missing: number[] = [];
const shapesByCode = new Map<number, { label: string; aspect: number; shapes: { d: string; fill: boolean }[] }>();

for (const entry of MAP) {
  const g = groups.find(
    (gr) =>
      gr.label === entry.label &&
      Math.abs(gr.anchor[0] - entry.at[0]) <= 8 &&
      Math.abs(gr.anchor[1] - entry.at[1]) <= 8,
  );
  if (!g) {
    missing.push(entry.code);
    continue;
  }
  const { x0, y0, x1, y1 } = g.box;
  const w = x1 - x0 || 1;
  const h = y1 - y0 || 1;
  const shapes = g.ents.flatMap((e) => {
    const pts = pointsOf(e);
    if (pts.length < 2) return [];
    const d = pts
      .map(([x, y], i) => `${i === 0 ? 'M' : 'L'}${round((x - x0) / w)} ${round((y1 - y) / h)}`)
      .join('');
    return [{ d, fill: e.type === 'SOLID' }];
  });
  shapesByCode.set(entry.code, { label: entry.label, aspect: round(w / h), shapes } as never);
  found.push({ code: entry.code, label: entry.label, shapes: shapes.length });
}

function round(n: number): number {
  return Math.round(n * 1000) / 1000;
}

const body = [...shapesByCode.entries()]
  .sort((a, b) => a[0] - b[0])
  .map(([code, data]) => {
    return `  ${code}: {
    label: ${JSON.stringify(data.label)},
    aspect: ${data.aspect},
    shapes: [
${data.shapes.map((s) => `      { d: ${JSON.stringify(s.d)}, fill: ${s.fill} },`).join('\n')}
    ],
  },`;
  })
  .join('\n');

const out = `// GENERADO por scripts/import-dxf.ts — no editar a mano.
// Símbolos de instalación extraídos de data/samples/SIMBOELE.dxf y normalizados
// a 0..1 para poder escalarlos a la caja del registro. Los bornes NO vienen de
// acá: los pone el código de CADe_SIMU (ver resolveSymbol).

export interface DxfShape {
  d: string;
  fill: boolean;
}

export interface DxfSymbol {
  label: string;
  /** Relación ancho/alto del recorte, para no deformar el símbolo al escalarlo. */
  aspect: number;
  shapes: DxfShape[];
}

export const DXF_SYMBOLS: Record<number, DxfSymbol> = {
${body}
};
`;

writeFileSync(OUT, out);
console.log(`escrito ${OUT}`);
for (const f of found) console.log(`  ${f.code}: ${f.label.padEnd(34)} ${f.shapes} trazos`);
if (missing.length > 0) {
  console.log('sin recorte:', missing.join(', '));
  for (const entry of MAP.filter((m) => missing.includes(m.code))) {
    const near = groups.filter(
      (g) => Math.abs(g.anchor[0] - entry.at[0]) <= 10 && Math.abs(g.anchor[1] - entry.at[1]) <= 10,
    );
    console.log(`  buscaba ${entry.code} "${entry.label}" en ${entry.at.join(',')}`);
    for (const g of near) console.log(`    cerca: "${g.label}" en ${g.anchor.join(',')} (${g.ents.length} entidades)`);
  }
}
