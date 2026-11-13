/**
 * overlay-diff.ts — verificación raster de un SymbolDef contra una captura de CADe_SIMU.
 *
 * Uso (desde la raíz del repo):
 *   node --experimental-strip-types .agents/skills/cadesimu-calibration/assets/overlay-diff.ts \
 *     <png> <code> <ox> <oy> [S OX OY]
 *
 * `ox,oy` es la posición del registro en unidades del `.cad` (primer borne).
 * `S OX OY` es el mapeo px↔cad de la captura (x = cad*S + OX); por defecto el
 * de `docs/cadesimu-svg/reference/PR1_Rodolfo_Giusti_03.png`: 4 -108 -138.5.
 *
 * Salida: ref (tinta negra de la captura), sym (tinta dibujada), overlap,
 * refOnly (px de la captura que el def no cubre), symOnly y stray (px
 * dibujados sin tinta de la captura a ≤2px: los stray indican desvío real de
 * geometría; el resto es el halo del pincel de 3px del verificador).
 */
import { readFileSync } from 'node:fs';
import { inflateSync } from 'node:zlib';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { resolveSymbol } from '../../../../app/src/symbols/library.ts';

const HERE = dirname(fileURLToPath(import.meta.url));
const REF = join(HERE, '..', '..', '..', '..', 'docs', 'cadesimu-svg', 'reference');

// --- PNG decode (sólo lo que exporta CADe_SIMU: depth 8, sin entrelazado) ---

interface Image {
  w: number;
  h: number;
  rgb: Uint8Array;
}

function decodePng(buf: Buffer): Image {
  let off = 8;
  let w = 0, h = 0, depth = 0, color = 0, interlace = 0;
  const idat: Buffer[] = [];
  let plte: Buffer | null = null;
  while (off < buf.length) {
    const len = buf.readUInt32BE(off);
    const type = buf.toString('latin1', off + 4, off + 8);
    const data = buf.subarray(off + 8, off + 8 + len);
    if (type === 'IHDR') {
      w = data.readUInt32BE(0)!;
      h = data.readUInt32BE(4)!;
      depth = data[8]!;
      color = data[9]!;
      interlace = data[12]!;
    } else if (type === 'IDAT') idat.push(data);
    else if (type === 'PLTE') plte = data;
    off += 12 + len;
    if (type === 'IEND') break;
  }
  if (depth !== 8 || interlace !== 0) throw new Error(`PNG no soportado: depth=${depth} interlace=${interlace}`);
  const channels = color === 2 ? 3 : color === 6 ? 4 : color === 3 ? 1 : 0;
  if (!channels) throw new Error(`color type ${color} no soportado`);
  const raw = inflateSync(Buffer.concat(idat));
  const stride = w * channels;
  const out = Buffer.alloc(h * stride);
  let prev = Buffer.alloc(stride);
  let p = 0;
  for (let y = 0; y < h; y++) {
    const f = raw[p++]!;
    const line = raw.subarray(p, p + stride);
    p += stride;
    const cur = Buffer.alloc(stride);
    for (let i = 0; i < stride; i++) {
      const a = i >= channels ? cur[i - channels]! : 0;
      const b = prev[i]!;
      const c = i >= channels ? prev[i - channels]! : 0;
      let v = line[i]!;
      if (f === 1) v += a;
      else if (f === 2) v += b;
      else if (f === 3) v += (a + b) >> 1;
      else if (f === 4) {
        const pa = Math.abs(b - c), pb = Math.abs(a - c), pc = Math.abs(a + b - 2 * c);
        v += pa <= pb && pa <= pc ? a : pb <= pc ? b : c;
      } else if (f !== 0) throw new Error(`filtro ${f} no soportado`);
      cur[i] = v & 0xff;
    }
    cur.copy(out, y * stride);
    prev = cur;
  }
  const rgb = new Uint8Array(w * h * 3);
  for (let i = 0; i < w * h; i++) {
    if (color === 2) { rgb.set(out.subarray(i * 3, i * 3 + 3), i * 3); }
    else if (color === 6) { rgb.set(out.subarray(i * 4, i * 4 + 3), i * 3); }
    else { const idx = out[i]! * 3; rgb.set(plte!.subarray(idx, idx + 3), i * 3); }
  }
  return { w, h, rgb };
}

// --- tinta: negro puro del trazo de CADe_SIMU ---

const isBlack = (img: Image, x: number, y: number): boolean => {
  if (x < 0 || y < 0 || x >= img.w || y >= img.h) return false;
  const o = (y * img.w + x) * 3;
  const r = img.rgb[o]!, g = img.rgb[o + 1]!, b = img.rgb[o + 2]!;
  const mx = Math.max(r, g, b), mn = Math.min(r, g, b);
  return mx - mn < 30 && mx < 120;
};

// --- shapes -> px ---

const [, , pngArg, codeArg, oxArg, oyArg, sArg, oxPArg, oyPArg] = process.argv;
if (!pngArg || !codeArg || !oxArg || !oyArg) {
  console.error('uso: node overlay-diff.ts <png> <code> <ox> <oy> [S OX OY]');
  process.exit(2);
}
const S = Number(sArg ?? 4), OX = Number(oxPArg ?? -108), OY = Number(oyPArg ?? -138.5);
const px = (u: number) => Math.round(u * S + OX);
const py = (u: number) => Math.round(u * S + OY);

const code = Number(codeArg);
const t = { ox: Number(oxArg), oy: Number(oyArg) };
const img = decodePng(readFileSync(pngArg.startsWith('/') ? pngArg : join(REF, pngArg)));

const sym = resolveSymbol(code, []);
const size = sym.size ?? { w: 9, h: 15 };
const shapes = sym.shapes(size.w, size.h);
const segs: Array<[number, number, number, number]> = [];
let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;

// parser de los paths de draw.ts: M x y (L x y | H x | V y | a rx ry rot L S dx dy)+ Z
const collect = (d: string) => {
  const cmds = d.match(/[MLHVZaA][^MLHVZaA]*/g) ?? [];
  let cx = 0, cy = 0, sx = 0, sy = 0;
  for (const c of cmds) {
    const k = c[0]!;
    const nums = (c.slice(1).match(/-?[\d.]+/g) ?? []).map(Number);
    if (k === 'M') { cx = sx = nums[0]!; cy = sy = nums[1]!; }
    else if (k === 'L') { segs.push([cx, cy, nums[0]!, nums[1]!]); cx = nums[0]!; cy = nums[1]!; }
    else if (k === 'H') { segs.push([cx, cy, nums[0]!, cy]); cx = nums[0]!; }
    else if (k === 'V') { segs.push([cx, cy, cx, nums[0]!]); cy = nums[0]!; }
    else if (k === 'Z') { segs.push([cx, cy, sx, sy]); cx = sx; cy = sy; }
    else {
      const [rx, ry, , laf, swf, dx, dy] = nums as number[];
      const x1 = cx, y1 = cy;
      const x2 = k === 'a' ? x1 + dx : dx!;
      const y2 = k === 'a' ? y1 + dy : dy!;
      // centro: dos candidatos a h del midpoint, perpendicular a la cuerda; el
      // elegido es el cuyo arco (en dirección de barrido) cruza 180° según el
      // flag de arco mayor.
      const mx = (x1 + x2) / 2, my = (y1 + y2) / 2;
      const len = Math.hypot(x2 - x1, y2 - y1);
      const h = Math.sqrt(Math.max(0, rx * rx - (len / 2) * (len / 2)));
      const nx = (-(y2 - y1)) / len, ny = (x2 - x1) / len;
      const cands: Array<[number, number]> = [
        [mx + h * nx, my + h * ny],
        [mx - h * nx, my - h * ny],
      ];
      const arcOf = ([ccx, ccy]: [number, number]): number => {
        const a1 = Math.atan2(y1 - ccy, x1 - ccx);
        let sw = Math.atan2(y2 - ccy, x2 - ccx) - a1;
        if (swf === 1) { while (sw < 0) sw += 2 * Math.PI; }
        else { while (sw > 0) sw -= 2 * Math.PI; }
        return Math.abs(sw);
      };
      const cand = cands.find((c) => (laf === 1 ? arcOf(c) > Math.PI : arcOf(c) <= Math.PI)) ?? cands[0]!;
      const a1 = Math.atan2(y1 - cand[1], x1 - cand[0]);
      const sw = arcOf(cand);
      const n = Math.max(8, Math.ceil(sw * rx * 2));
      let px1 = x1, py1 = y1;
      for (let i = 1; i <= n; i++) {
        const ang = a1 + (sw * (swf === 1 ? i : -i)) / n;
        const qx = cand[0] + rx * Math.cos(ang);
        const qy = cand[1] + ry * Math.sin(ang);
        segs.push([px1, py1, qx, qy]);
        px1 = qx; py1 = qy;
      }
      cx = x2; cy = y2;
    }
  }
};
for (const s of shapes) collect(s.d);
for (const [x1, y1, x2, y2] of segs) {
  minX = Math.min(minX, x1, x2); maxX = Math.max(maxX, x1, x2);
  minY = Math.min(minY, y1, y2); maxY = Math.max(maxY, y1, y2);
}
const half = 2;
const u0 = Math.floor(minX) - half, u1 = Math.ceil(maxX) + half;
const v0 = Math.floor(minY) - half, v1 = Math.ceil(maxY) + half;

// raster (pincel de 1px: punto + 4 vecinos ortogonales)
const drawn = new Set<string>();
for (const [x1, y1, x2, y2] of segs) {
  const ax = px(t.ox + x1), ay = py(t.oy + y1), bx = px(t.ox + x2), by = py(t.oy + y2);
  const n = Math.max(Math.abs(bx - ax), Math.abs(by - ay)) * 2 + 1;
  for (let i = 0; i <= n; i++) {
    const sx = Math.round(ax + ((bx - ax) * i) / n);
    const sy = Math.round(ay + ((by - ay) * i) / n);
    drawn.add(`${sx},${sy}`);
    drawn.add(`${sx + 1},${sy}`); drawn.add(`${sx - 1},${sy}`);
    drawn.add(`${sx},${sy + 1}`); drawn.add(`${sx},${sy - 1}`);
  }
}

// comparar
let refInk = 0, symInk = 0, overlap = 0, refOnly = 0, symOnly = 0;
const refOnlyList: Array<[number, number]> = [];
const symOnlyList: Array<[number, number]> = [];
const refSet = new Set<string>();
for (let y = py(t.oy + v0); y <= py(t.oy + v1); y++) {
  for (let x = px(t.ox + u0); x <= px(t.ox + u1); x++) {
    const r = isBlack(img, x, y);
    const s = drawn.has(`${x},${y}`);
    if (r) { refInk++; refSet.add(`${x},${y}`); }
    if (s) symInk++;
    if (r && s) overlap++;
    else if (r) { refOnly++; if (refOnlyList.length < 40) refOnlyList.push([x, y]); }
    else if (s) { symOnly++; if (symOnlyList.length < 1200) symOnlyList.push([x, y]); }
  }
}
const stray: Array<[number, number]> = [];
for (const [x, y] of symOnlyList) {
  let near = false;
  for (let dy = -2; dy <= 2 && !near; dy++)
    for (let dx = -2; dx <= 2 && !near; dx++)
      if (refSet.has(`${x + dx},${y + dy}`)) near = true;
  if (!near) stray.push([x, y]);
}
const cad = (x: number, y: number) => `[${(Math.round((x - OX) / S * 100) / 100)},${(Math.round((y - OY) / S * 100) / 100)}]`;
console.log(`--- ${code} (registro ${t.ox},${t.oy}) ---`);
console.log(`ref=${refInk}px sym=${symInk}px overlap=${overlap} refOnly=${refOnly} symOnly=${symOnly}`);
console.log('refOnly:', refOnlyList.map(([x, y]) => `${x},${y}${cad(x, y)}`).join(' '));
console.log(`stray (sin ref a <=2px): ${stray.length}`);
console.log('stray:', stray.slice(0, 30).map(([x, y]) => `${x},${y}${cad(x, y)}`).join(' '));
