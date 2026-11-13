#!/usr/bin/env node
/**
 * Genera `docs/cadesimu-svg/calibration.html`: comparación de calibración
 * visual entre los símbolos REALES del proyecto (`src/symbols/library.ts` +
 * `src/symbols/families.ts`, mismos `shapes(w,h)` y labels que usa el lienzo)
 * y la captura de referencia CADe_SIMU.
 *
 * Por qué existe: la fidelidad visual no se puede reconstruir sólo desde las
 * dimensiones del `.cad`; hay que comparar contra la captura a escala fija.
 * Este script decodifica el PNG (RGB 8-bit sin entrelazado, puro Node), recorta
 * la tinta alrededor de cada símbolo piloto, dibuja el SVG actual al mismo
 * escalado y superpone ambos con controles de corrección y rotación: lo que
 * queda desalineado es exactamente lo que hay que corregir.
 *
 * Los bornes reales salen de los cables: cada cable (4000/4001) que termina
 * contra el componente marca su terminal en la superposición, así la
 * correspondencia borne↔cable se ve directamente.
 *
 * Uso: node scripts/make-calibration.ts [captura.png] [archivo.cad]
 * (por defecto usa la referencia del prototipo)
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { deflateSync, inflateSync } from 'node:zlib';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parse } from '../src/format/cade.ts';
import { buildProject, GEOMETRY } from '../src/model/project.ts';
import { resolveSymbol } from '../src/symbols/library.ts';
import { shapesBounds } from '../src/symbols/draw.ts';

const HERE = dirname(fileURLToPath(import.meta.url));
const REF = join(HERE, '..', '..', 'docs', 'cadesimu-svg', 'reference');
const PNG = process.argv[2] ?? join(REF, 'PR1_Rodolfo_Giusti_03.png');
const CADE = process.argv[3] ?? join(REF, 'PR1_Rodolfo_Giusti_03.cad');
const OUT = join(HERE, '..', '..', 'docs', 'cadesimu-svg', 'calibration.html');

/** Códigos del prototipo piloto: los mismos que el informe propone calibrar. */
const PILOT = [8000, 8001, 9000, 9008, 1000, 2001];

/**
 * Mapeo `.cad` -> px de la captura, medido contra ESTA referencia:
 *  - H2 (45,123) tiene el centro de su círculo en (72, 353.5) y H1 (117,123)
 *    en (360, 353.5): Δ288px / Δ72u => S = 4.0 exacto.
 *  - OX = 72 - 45*4 = -108; OY = 353.5 - 123*4 = -138.5.
 * Si se calibra otra captura, re-medir estas constantes.
 */
const S = 4;
const OX = -108;
const OY = -138.5;

const toPx = (x: number, y: number): [number, number] => [x * S + OX, y * S + OY];

// ---------------------------------------------------------------------------
// PNG decode (sólo lo que exporta CADe_SIMU: depth 8, sin entrelazado)
// ---------------------------------------------------------------------------

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
  if (depth !== 8 || interlace !== 0) {
    throw new Error(`PNG no soportado: depth=${depth} interlace=${interlace}`);
  }
  const ch = color === 2 ? 3 : color === 6 ? 4 : color === 0 || color === 3 ? 1 : 0;
  if (!ch || (color === 3 && !plte)) throw new Error(`color type ${color} no soportado`);
  const raw = inflateSync(Buffer.concat(idat));
  const stride = w * ch;
  const out = new Uint8Array(w * h * 3);
  let prev = new Uint8Array(stride);
  for (let y = 0; y < h; y++) {
    const rowStart = y * (stride + 1);
    const filter = raw[rowStart]!;
    const cur = new Uint8Array(stride);
    for (let i = 0; i < stride; i++) {
      const a = i >= ch ? cur[i - ch]! : 0;
      const b = prev[i]!;
      const c = i >= ch ? prev[i - ch]! : 0;
      let v = raw[rowStart + 1 + i]!;
      if (filter === 1) v += a;
      else if (filter === 2) v += b;
      else if (filter === 3) v += (a + b) >> 1;
      else if (filter === 4) {
        const p = a + b - c;
        const pa = Math.abs(p - a), pb = Math.abs(p - b), pc = Math.abs(p - c);
        v += pa <= pb && pa <= pc ? a : pb <= pc ? b : c;
      }
      cur[i] = v & 0xff;
    }
    for (let x = 0; x < w; x++) {
      const o = (y * w + x) * 3;
      const s = x * ch;
      if (color === 3) {
        const pi = cur[s]! * 3;
        out[o] = plte![pi]!; out[o + 1] = plte![pi + 1]!; out[o + 2] = plte![pi + 2]!;
      } else if (color === 2 || color === 6) {
        out[o] = cur[s]!; out[o + 1] = cur[s + 1]!; out[o + 2] = cur[s + 2]!;
      } else {
        out[o] = out[o + 1] = out[o + 2] = cur[s]!;
      }
    }
    prev = cur;
  }
  return { w, h, rgb: out };
}

// ---------------------------------------------------------------------------
// PNG encode (recortes embebidos como data URI)
// ---------------------------------------------------------------------------

const CRC_TABLE: number[] = (() => {
  const t: number[] = [];
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();

function crc32(buf: Buffer): number {
  let c = 0xffffffff;
  for (const b of buf) c = CRC_TABLE[(c ^ b) & 0xff]! ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type: string, data: Buffer): Buffer {
  const out = Buffer.alloc(12 + data.length);
  out.writeUInt32BE(data.length, 0);
  out.write(type, 4, 'latin1');
  data.copy(out, 8);
  out.writeUInt32BE(crc32(out.subarray(4, 8 + data.length)), 8 + data.length);
  return out;
}

function encodePng(w: number, h: number, rgb: Uint8Array): Buffer {
  const stride = w * 3;
  const raw = Buffer.alloc((stride + 1) * h);
  for (let y = 0; y < h; y++) {
    raw[y * (stride + 1)] = 0; // filtro 0
    for (let i = 0; i < stride; i++) raw[y * (stride + 1) + 1 + i] = rgb[y * stride + i]!;
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0);
  ihdr.writeUInt32BE(h, 4);
  ihdr[8] = 8; ihdr[9] = 2; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

// ---------------------------------------------------------------------------
// Recorte de tinta alrededor de cada componente
// ---------------------------------------------------------------------------

interface Crop {
  /** data URI PNG del recorte */
  png: string;
  /** esquina del recorte en unidades .cad */
  ux: number;
  uy: number;
  uw: number;
  uh: number;
}

function inkCrop(img: Image, cx: number, cy: number, half: number): Crop {
  const x0 = Math.max(0, Math.round(cx - half));
  const x1 = Math.min(img.w, Math.round(cx + half));
  const y0 = Math.max(0, Math.round(cy - half));
  const y1 = Math.min(img.h, Math.round(cy + half));
  let bx0 = x1, by0 = y1, bx1 = x0, by1 = y0;
  for (let y = y0; y < y1; y++) {
    for (let x = x0; x < x1; x++) {
      const o = (y * img.w + x) * 3;
      const r = img.rgb[o]!, g = img.rgb[o + 1]!, b = img.rgb[o + 2]!;
      // tinta oscura; excluye la grilla de puntos clara y los cables de color
      if (r < 120 && g < 120 && b < 120) {
        if (x < bx0) bx0 = x;
        if (x > bx1) bx1 = x;
        if (y < by0) by0 = y;
        if (y > by1) by1 = y;
      }
    }
  }
  const pad = 4;
  const px0 = Math.max(0, bx0 - pad), py0 = Math.max(0, by0 - pad);
  const pw = Math.min(img.w, bx1 + pad + 1) - px0, ph = Math.min(img.h, by1 + pad + 1) - py0;
  const rgb = new Uint8Array(pw * ph * 3);
  for (let y = 0; y < ph; y++) {
    for (let x = 0; x < pw; x++) {
      const s = ((py0 + y) * img.w + px0 + x) * 3;
      const d = (y * pw + x) * 3;
      rgb[d] = img.rgb[s]!; rgb[d + 1] = img.rgb[s + 1]!; rgb[d + 2] = img.rgb[s + 2]!;
    }
  }
  return {
    png: encodePng(pw, ph, rgb).toString('base64'),
    ux: (px0 - OX) / S,
    uy: (py0 - OY) / S,
    uw: pw / S,
    uh: ph / S,
  };
}

// ---------------------------------------------------------------------------
// Partes del símbolo actual (misma forma de dibujar que SymbolGlyph/Canvas)
// ---------------------------------------------------------------------------

interface Parts {
  def: ReturnType<typeof resolveSymbol>;
  box: { w: number; h: number };
  anchored: boolean;
  paths: string;
  texts: string;
  pinDots: string;
}

function symbolParts(code: number, pinNames: string[]): Parts {
  const def = resolveSymbol(code, pinNames);
  const box = def.size ?? { w: 18, h: 15 };
  const anchored = def.anchor === 'origin';
  const shapes = def.shapes(box.w, box.h);
  const labels = def.labels?.(box.w, box.h) ?? [];
  const paths = shapes
    .map((s) => {
      const sw = s.thin ? 0.17 : 0.26;
      const cls = [s.fill ? 'fill' : '', s.dashed ? 'dashed' : ''].filter(Boolean).join(' ');
      return `<path d="${s.d}"${cls ? ` class="${cls}"` : ''} style="stroke-width:${sw}"/>`;
    })
    .join('\n');
  const texts = labels
    .map((l) => `<text x="${l.x}" y="${l.y}" font-size="${l.size}" text-anchor="${l.anchor ?? 'middle'}" dominant-baseline="middle" font-family="ui-monospace,Menlo,monospace">${l.value}</text>`)
    .join('\n');
  const pinDots = anchored
    ? (def.originPins ?? []).map((p) => `<circle cx="${p.x}" cy="${p.y}" r="0.55" fill="#0a0"/>`).join('\n')
    : def.pins.map((p) => `<circle cx="${p.nx * box.w}" cy="${p.ny * box.h}" r="0.55" fill="#0a0"/>`).join('\n');
  return { def, box, anchored, paths, texts, pinDots };
}

/** Panel lateral: el símbolo como lo dibuja la app (viewBox = marco de tinta). */
function symbolPanel(parts: Parts, scale: number): string {
  const bounds = shapesBounds(parts.def.shapes(parts.box.w, parts.box.h));
  const m = 1;
  const vx = bounds.minX - m, vy = bounds.minY - m;
  const vw = bounds.maxX - bounds.minX + 2 * m, vh = bounds.maxY - bounds.minY + 2 * m;
  return `<svg viewBox="${vx} ${vy} ${vw} ${vh}" width="${vw * scale}" height="${vh * scale}" class="sym">${parts.paths}${parts.texts}${parts.pinDots}</svg>`;
}

// ---------------------------------------------------------------------------
// HTML
// ---------------------------------------------------------------------------

function main(): void {
  const refPng = decodePng(readFileSync(PNG));
  const project = buildProject(parse(readFileSync(CADE, 'latin1')));
  const comps = project.records.filter((r) => PILOT.includes(r.code) && (r.geometry?.length ?? 0) > GEOMETRY.height);
  const wires = project.records.filter((r) => r.code === 4000 || r.code === 4001);

  const sections = comps.map((rec) => {
    const x = rec.geometry[GEOMETRY.x]!;
    const y = rec.geometry[GEOMETRY.y]!;
    const [cx, cy] = toPx(x, y);
    const crop = inkCrop(refPng, cx, cy, 55);
    const parts = symbolParts(rec.code, rec.pins);
    const panel = symbolPanel(parts, 2.4);
    const zoom = 2.4; // px de pantalla por px de captura
    // terminales reales: extremos de cables que caen cerca del registro
    const terms: string[] = [];
    for (const wr of wires) {
      const g = wr.geometry;
      if (g.length <= GEOMETRY.y2) continue;
      const pts: [number, number][] = [
        [g[GEOMETRY.x]!, g[GEOMETRY.y]!],
        [g[GEOMETRY.x2]!, g[GEOMETRY.y2]!],
      ];
      for (const [tx, ty] of pts) {
        if (Math.abs(tx - x) <= parts.box.w && Math.abs(ty - y) <= parts.box.h + 2) {
          const [px, py] = toPx(tx, ty);
          terms.push(
            `<circle cx="${((px - OX) / S - crop.ux).toFixed(2)}" cy="${((py - OY) / S - crop.uy).toFixed(2)}" r="0.7" fill="none" stroke="#0a0" stroke-width="0.3"/>`,
          );
        }
      }
    }
    // La superposición dibuja el símbolo con su caja apoyada en el origen del
    // registro, igual que Canvas (place=origin para anclados). Los controles
    // permiten desplazar y rotar para probar la orientación que guarde el .cad.
    const inner = `<g data-bx="${x}" data-by="${y}">${parts.paths}${parts.texts}${parts.pinDots}<g class="terms">${terms.join('')}</g></g>`;
    const overlay = `<div class="ov-wrap">
      <img src="data:image/png;base64,${crop.png}" width="${crop.uw * S * zoom}">
      <svg class="ov" viewBox="${crop.ux} ${crop.uy} ${crop.uw} ${crop.uh}" width="${crop.uw * S * zoom}" height="${crop.uh * S * zoom}">
        <g class="sym-layer">${inner}</g>
      </svg></div>`;
    return `
<section data-code="${rec.code}" data-label="${rec.designator}">
  <h3>${rec.code} — ${rec.designator || '(sin designador)'} <small>pos (${x}, ${y}) caja ${parts.box.w}×${parts.box.h}${parts.anchored ? ' · anclado al origen' : ''}</small></h3>
  <div class="row">
    <figure><figcaption>captura (tinta real)</figcaption><img src="data:image/png;base64,${crop.png}" width="${crop.uw * S * zoom}"></figure>
    <figure><figcaption>library.ts actual</figcaption>${panel}</figure>
    <figure class="ov-fig"><figcaption>superposición (símbolo azul, bornes verdes)</figcaption>${overlay}</figure>
  </div>
  <div class="controls">
    <button class="nudge" data-dx="-0.25">←</button>
    <button class="nudge" data-dx="0.25">→</button>
    <button class="nudge" data-dy="-0.25">↑</button>
    <button class="nudge" data-dy="0.25">↓</button>
    <button class="rot" data-dr="-90">⟲ 90°</button>
    <button class="rot" data-dr="90">⟳ 90°</button>
    <button class="reset">reset</button>
    <span class="off">desplazamiento: <b class="off-val">0, 0</b> u · rotación: <b class="rot-val">0°</b></span>
  </div>
</section>`;
  });

  const html = `<!doctype html>
<html lang="es"><head><meta charset="utf-8">
<title>Calibración CADe_SIMU — símbolos piloto</title>
<style>
  body { font-family: system-ui, sans-serif; background: #fafafa; color: #111; margin: 2rem; }
  section { margin-bottom: 3rem; border-top: 1px solid #ddd; padding-top: 1rem; }
  h3 small { font-weight: normal; color: #777; }
  .row { display: flex; gap: 2rem; align-items: flex-start; flex-wrap: wrap; }
  figure { margin: 0; } figcaption { font-size: 0.8rem; color: #666; margin-bottom: 0.4rem; }
  .sym path { stroke: #111; fill: none; stroke-linejoin: round; stroke-linecap: round; }
  .sym path.fill { fill: #111; }
  .sym path.dashed { stroke-dasharray: 0.9 0.9; }
  .sym text { fill: #444; }
  .ov-wrap { position: relative; display: inline-block; }
  .ov { position: absolute; inset: 0; opacity: 0.65; pointer-events: none; }
  .ov .sym-layer path { stroke: rgba(0,80,255,0.85); fill: none; stroke-linejoin: round; stroke-linecap: round; }
  .ov .sym-layer path.fill { fill: rgba(0,80,255,0.35); }
  .ov .sym-layer text { fill: rgba(0,80,255,0.9); font-family: ui-monospace,Menlo,monospace; }
  .controls { margin-top: 0.6rem; display: flex; gap: 0.4rem; align-items: center; }
  .controls button { font-size: 0.9rem; padding: 0.15rem 0.6rem; cursor: pointer; }
  .off { font-size: 0.85rem; color: #555; }
  .off-val, .rot-val { color: #111; }
</style></head><body>
<h1>Calibración CADe_SIMU — símbolos piloto</h1>
<p>Escala de la captura: <b>${S} px/unidad</b> (medida con H2↔H1). En la superposición:
azul = dibujo actual de <code>library.ts</code>/<code>families.ts</code> apoyado en el
origen del registro (igual que el lienzo); verde = bornes reales (extremos de cables del
<code>.cad</code>). Corregí desplazamiento y rotación hasta alinear bornes con cables y
anotá el resultado: es el dato que hay que corregir en los <code>SymbolDef</code>.</p>
${sections.join('\n')}
<script>
  document.querySelectorAll('section').forEach((sec) => {
    const layer = sec.querySelector('.sym-layer');
    const g = layer.querySelector('g');
    const val = sec.querySelector('.off-val');
    const rval = sec.querySelector('.rot-val');
    let dx = 0, dy = 0, rot = 0;
    const bx = +g.dataset.bx, by = +g.dataset.by;
    const apply = () => {
      layer.setAttribute('transform', \`translate(\${dx} \${dy}) rotate(\${rot} \${bx} \${by})\`);
      val.textContent = \`\${dx}, \${dy}\`;
      rval.textContent = \`\${rot}°\`;
    };
    sec.querySelectorAll('.nudge').forEach((b) => b.addEventListener('click', () => {
      dx += +b.dataset.dx || 0; dy += +b.dataset.dy || 0; apply();
    }));
    sec.querySelectorAll('.rot').forEach((b) => b.addEventListener('click', () => {
      rot = (rot + +b.dataset.dr + 360) % 360; apply();
    }));
    sec.querySelector('.reset').addEventListener('click', () => { dx = 0; dy = 0; rot = 0; apply(); });
  });
</script>
</body></html>`;

  writeFileSync(OUT, html);
  console.log(`escrito ${OUT} (${comps.length} símbolos piloto)`);
}

main();
