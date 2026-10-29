#!/usr/bin/env node
/**
 * Genera el spike de interacción de cables (T0.4).
 *
 * Lee un archivo real, extrae componentes y cables del modelo de dominio y
 * emite un HTML autocontenido: sin dependencias, sin servidor, se abre con
 * doble clic. Es descartable a propósito — su único objetivo es responder si
 * el ruteo ortogonal con arrastre se siente bien.
 *
 * Uso: node app/spike/make-spike.ts [archivo.cade]
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { basename, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parse } from '../src/format/cade.ts';
import { buildProject, wirePoints, boxOf, GEOMETRY } from '../src/model/project.ts';

const HERE = dirname(fileURLToPath(import.meta.url));
const source = process.argv[2] ?? join(HERE, '..', 'test', 'fixtures', 'arranque-paro-motor-3f.cad');
const project = buildProject(parse(readFileSync(source, 'latin1')));

interface SceneComponent {
  id: number;
  code: number;
  label: string;
  x: number;
  y: number;
  w: number;
  h: number;
  pins: string[];
}

interface SceneWire {
  id: number;
  code: number;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

const components: SceneComponent[] = [];
for (const rec of project.records) {
  if (rec.kind !== 'component') continue;
  const box = boxOf(rec);
  if (!box) continue;
  components.push({
    id: rec.id,
    code: rec.code,
    label: rec.designator || String(rec.code),
    x: rec.geometry[GEOMETRY.x],
    y: rec.geometry[GEOMETRY.y],
    w: box.width,
    h: box.height,
    pins: rec.pins,
  });
}

const wires: SceneWire[] = [];
for (const rec of project.records) {
  const pts = wirePoints(rec);
  if (!pts) continue;
  wires.push({ id: rec.id, code: rec.code, ...pts });
}

const scene = { source: basename(source), components, wires };

const html = `<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8">
<title>simuElectro — spike de cables</title>
<style>
  :root { color-scheme: dark; }
  * { box-sizing: border-box; }
  body { margin: 0; font: 13px/1.4 -apple-system, system-ui, sans-serif; background: #14161a; color: #d7dce3; overflow: hidden; }
  header { position: fixed; z-index: 3; top: 0; left: 0; right: 0; padding: 10px 14px; display: flex; gap: 16px;
           align-items: center; background: #14161acc; backdrop-filter: blur(8px); border-bottom: 1px solid #262a31; }
  h1 { font-size: 13px; margin: 0; font-weight: 600; letter-spacing: .2px; }
  .hint { color: #7f8894; }
  kbd { background: #22262d; border: 1px solid #333842; border-radius: 4px; padding: 1px 5px; font-size: 11px; }
  svg { display: block; width: 100vw; height: 100vh; cursor: grab; }
  svg.panning { cursor: grabbing; }
  .grid-line { stroke: #1d2027; stroke-width: 1; }
  .comp rect { fill: #1e242d; stroke: #455063; stroke-width: 1.5; }
  .comp:hover rect { stroke: #6f8bb5; }
  .comp text { fill: #9fb0c8; font-size: 9px; text-anchor: middle; dominant-baseline: middle; pointer-events: none; }
  .comp.dragging rect { stroke: #6ea8ff; fill: #24303f; }
  .pin { fill: #2a323d; stroke: #5b6a80; stroke-width: 1.2; cursor: crosshair; }
  .pin:hover { fill: #6ea8ff; stroke: #9cc4ff; }
  .wire { stroke: #4f9d7a; stroke-width: 1.6; fill: none; stroke-linecap: round; }
  .wire:hover { stroke: #7fd6ab; }
  .wire.sel { stroke: #ffd479; }
  .wire.vert { stroke: #467f92; }
  .node { fill: #4f9d7a; }
  .label { fill: #6d7a89; font-size: 8px; pointer-events: none; }
</style>
</head>
<body>
<header>
  <h1>simuElectro · spike de cables</h1>
  <span class="hint">${scene.components.length} componentes · ${scene.wires.length} cables</span>
  <span class="hint">arrastrá un componente — los cables se re-rutean · <kbd>rueda</kbd> zoom · arrastrá el fondo para mover</span>
</header>
<svg id="stage">
  <defs>
    <pattern id="grid" width="18" height="18" patternUnits="userSpaceOnUse">
      <path class="grid-line" d="M18 0H0V18" fill="none"/>
    </pattern>
  </defs>
  <rect width="100%" height="100%" fill="url(#grid)"/>
  <g id="world"></g>
</svg>
<script>
const SCENE = ${JSON.stringify(scene)};

const svg = document.getElementById('stage');
const world = document.getElementById('world');

// --- geometría de cables: ruteo ortogonal en Z (dos codos) ---
const SNAP = 3;
const snap = (v) => Math.round(v / SNAP) * SNAP;

function routePoints(a, b) {
  const ax = snap(a.x), ay = snap(a.y), bx = snap(b.x), by = snap(b.y);
  if (ax === bx || ay === by) return [[ax, ay], [bx, by]];
  const horizontal = Math.abs(ax - bx) >= Math.abs(ay - by);
  if (horizontal) {
    const mid = snap((ax + bx) / 2);
    return [[ax, ay], [mid, ay], [mid, by], [bx, by]];
  }
  const mid = snap((ay + by) / 2);
  return [[ax, ay], [ax, mid], [bx, mid], [bx, by]];
}

const pathOf = (pts) => pts.map(([x, y], i) => (i ? 'L' : 'M') + x + ' ' + y).join(' ');

// --- estado ---
const comps = SCENE.components.map((c) => ({ ...c, ox: c.x, oy: c.y }));
const wires = SCENE.wires.map((w) => {
  const owner = (x, y) => comps.find((c) => x >= c.x - 6 && x <= c.x + c.w + 6 && y >= c.y - 6 && y <= c.y + c.h + 6);
  const ca = owner(w.x1, w.y1), cb = owner(w.x2, w.y2);
  return { ...w, a: { x: w.x1, y: w.y1, comp: ca ? ca.id : null }, b: { x: w.x2, y: w.y2, comp: cb ? cb.id : null } };
});

const compById = new Map(comps.map((c) => [c.id, c]));

// --- render ---
const wireEls = new Map();
const compEls = new Map();

for (const w of wires) {
  const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
  path.setAttribute('class', 'wire');
  world.appendChild(path);
  wireEls.set(w.id, path);
}
for (const c of comps) {
  const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
  g.setAttribute('class', 'comp');
  g.dataset.id = c.id;

  const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
  rect.setAttribute('width', c.w);
  rect.setAttribute('height', c.h);
  rect.setAttribute('rx', 1.5);
  g.appendChild(rect);

  const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
  text.setAttribute('x', c.w / 2);
  text.setAttribute('y', c.h / 2);
  text.textContent = c.label.length > 7 ? c.label.slice(0, 7) : c.label;
  g.appendChild(text);

  // pines aproximados sobre el perímetro: no conocemos su posición real todavía
  const perSide = Math.ceil(c.pins.length / 2) || 1;
  c.pins.forEach((name, i) => {
    const left = i < perSide;
    const idx = left ? i : i - perSide;
    const count = left ? perSide : Math.max(1, c.pins.length - perSide);
    const pin = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    pin.setAttribute('class', 'pin');
    pin.setAttribute('r', 1.6);
    pin.setAttribute('cx', left ? 0 : c.w);
    pin.setAttribute('cy', ((idx + 1) / (count + 1)) * c.h);
    pin.dataset.pin = name;
    g.appendChild(pin);
  });

  world.appendChild(g);
  compEls.set(c.id, g);
}

function drawWires() {
  for (const w of wires) {
    const el = wireEls.get(w.id);
    el.setAttribute('d', pathOf(routePoints(w.a, w.b)));
    el.classList.toggle('vert', w.a.x === w.b.x);
  }
  for (const c of comps) {
    const g = compEls.get(c.id);
    g.setAttribute('transform', 'translate(' + c.x + ',' + c.y + ')');
  }
}
drawWires();

// --- pan y zoom ---
let view = { x: 0, y: 0, k: 1 };
function applyView() { world.setAttribute('transform', 'translate(' + view.x + ',' + view.y + ') scale(' + view.k + ')'); }

function bounds() {
  const xs = [];
  const ys = [];
  for (const c of comps) { xs.push(c.x, c.x + c.w); ys.push(c.y, c.y + c.h); }
  for (const w of wires) { xs.push(w.a.x, w.b.x); ys.push(w.a.y, w.b.y); }
  return { minX: Math.min(...xs), minY: Math.min(...ys), maxX: Math.max(...xs), maxY: Math.max(...ys) };
}
const b = bounds();
const vw = window.innerWidth, vh = window.innerHeight;
view.k = Math.min((vw - 120) / (b.maxX - b.minX), (vh - 120) / (b.maxY - b.minY), 4);
view.x = (vw - (b.maxX - b.minX) * view.k) / 2 - b.minX * view.k;
view.y = (vh - (b.maxY - b.minY) * view.k) / 2 - b.minY * view.k;
applyView();

let pan = null;
svg.addEventListener('pointerdown', (e) => {
  if (e.target.closest('.comp')) return;
  pan = { x: e.clientX - view.x, y: e.clientY - view.y };
  svg.classList.add('panning');
});
svg.addEventListener('pointermove', (e) => {
  if (!pan) return;
  view.x = e.clientX - pan.x;
  view.y = e.clientY - pan.y;
  applyView();
});
svg.addEventListener('pointerup', () => { pan = null; svg.classList.remove('panning'); });
svg.addEventListener('wheel', (e) => {
  e.preventDefault();
  const factor = Math.exp(-e.deltaY * 0.0015);
  const k = Math.min(8, Math.max(0.3, view.k * factor));
  const mx = e.clientX, my = e.clientY;
  view.x = mx - (mx - view.x) * (k / view.k);
  view.y = my - (my - view.y) * (k / view.k);
  view.k = k;
  applyView();
}, { passive: false });

// --- arrastre de componentes con re-ruteo en vivo ---
let drag = null;
svg.addEventListener('pointerdown', (e) => {
  const g = e.target.closest('.comp');
  if (!g) return;
  e.stopPropagation();
  const c = compById.get(Number(g.dataset.id));
  g.classList.add('dragging');
  drag = { c, sx: e.clientX, sy: e.clientY, cx: c.x, cy: c.y };
  svg.setPointerCapture(e.pointerId);
});
svg.addEventListener('pointermove', (e) => {
  if (!drag) return;
  const dx = (e.clientX - drag.sx) / view.k;
  const dy = (e.clientY - drag.sy) / view.k;
  const nx = snap(drag.cx + dx), ny = snap(drag.cy + dy);

  const moved = { x: nx - drag.c.x, y: ny - drag.c.y };
  drag.c.x = nx; drag.c.y = ny;

  for (const w of wires) {
    if (w.a.comp === drag.c.id) { w.a.x += moved.x; w.a.y += moved.y; }
    if (w.b.comp === drag.c.id) { w.b.x += moved.x; w.b.y += moved.y; }
  }
  drawWires();
});
svg.addEventListener('pointerup', (e) => {
  if (drag) {
    const g = compEls.get(drag.c.id);
    g.classList.remove('dragging');
    drag = null;
  }
  svg.releasePointerCapture?.(e.pointerId);
});
</script>
</body>
</html>
`;

const out = join(HERE, 'wires.html');
writeFileSync(out, html);
console.log(`escrito ${out}`);
console.log(`  fuente: ${basename(source)}`);
console.log(`  componentes: ${components.length} · cables: ${wires.length}`);
