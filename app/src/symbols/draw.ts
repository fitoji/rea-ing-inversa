/**
 * Primitivas de dibujo compartidas por la librería de símbolos y las familias
 * generadas. Viven aparte para que `library.ts` y `families.ts` no se importen
 * entre sí: acá sólo hay funciones puras de geometría.
 */
import type { Shape, SymbolPin } from './library.ts';

export const round = (n: number): number => Math.round(n * 100) / 100;

export const line = (x1: number, y1: number, x2: number, y2: number): string =>
  `M${round(x1)} ${round(y1)}L${round(x2)} ${round(y2)}`;

export const rect = (x: number, y: number, w: number, h: number): string =>
  `M${round(x)} ${round(y)}H${round(x + w)}V${round(y + h)}H${round(x)}Z`;

export const circle = (cx: number, cy: number, r: number): string =>
  `M${round(cx - r)} ${round(cy)}a${round(r)} ${round(r)} 0 1 0 ${round(r * 2)} 0a${round(r)} ${round(r)} 0 1 0 ${round(-r * 2)} 0Z`;

export const left = (ny: number, name: string): SymbolPin => ({ name, nx: 0, ny, side: 'left' });
export const right = (ny: number, name: string): SymbolPin => ({ name, nx: 1, ny, side: 'right' });

/** Reparto vertical: n pines equiespaciados entre 0.18 y 0.82. */
export function spread(n: number): number[] {
  if (n === 0) return [];
  if (n === 1) return [0.5];
  const lo = 0.18;
  const hi = 0.82;
  return Array.from({ length: n }, (_, i) => lo + ((hi - lo) * i) / (n - 1));
}

export function pinsBoth(n: number, names: string[]): SymbolPin[] {
  const half = Math.ceil(n / 2);
  const ys = spread(half);
  const out: SymbolPin[] = [];
  for (let i = 0; i < n; i++) {
    const isLeft = i < half;
    const idx = isLeft ? i : i - half;
    out.push(isLeft ? left(ys[idx]!, names[i] ?? String(i)) : right(ys[idx]!, names[i] ?? String(i)));
  }
  return out;
}

/**
 * Contacto NA / NC genérico sobre una fila `y`.
 *
 * La hoja se marca como móvil (`blade`) para que el lienzo la gire al cerrar:
 * `deg` es el giro que la lleva a apoyar sobre el borne contrario. El NC se
 * dibuja apoyado y se abre, así que su giro se aplica al revés desde el lienzo.
 */
export function contact(w: number, y: number, nc: boolean): Shape[] {
  const mx = w / 2;
  const gap = Math.min(w * 0.16, 4.5);
  const shapes: Shape[] = [
    { d: line(0, y, mx - gap, y) },
    { d: line(mx + gap, y, w, y) },
  ];
  if (nc) {
    shapes.push({ d: line(mx - gap, y - gap, mx + gap, y), thin: true, blade: { px: mx - gap, py: y - gap, deg: -46 } });
    shapes.push({ d: line(mx + gap, y - gap * 0.8, mx + gap, y + gap * 0.8), thin: true });
  } else {
    const dy = gap * 0.9;
    const deg = (Math.atan2(dy, gap * 2) * 180) / Math.PI;
    shapes.push({ d: line(mx - gap, y, mx + gap, y - dy), thin: true, blade: { px: mx - gap, py: y, deg } });
  }
  return shapes;
}

/** Tres contactos de potencia apilados (contactor / interruptor). */
export function threePole(w: number, h: number, nc = false): Shape[] {
  const ys = spread(3).map((n) => n * h);
  return ys.flatMap((y) => contact(w, y, nc));
}

/** Bornes de un aparato multipolar: 1-3-5 arriba, 2-4-6 abajo. */
export function poles(n: number): SymbolPin[] {
  const ys = spread(n);
  return [
    ...ys.map((ny, i) => left(ny, String(1 + i * 2))),
    ...ys.map((ny, i) => right(ny, String(2 + i * 2))),
  ];
}

/** Marca de reloj para contactos y bobinas temporizadas. */
export function clock(w: number, h: number): Shape[] {
  const r = Math.min(w, h) * 0.12;
  const cx = w * 0.8;
  const cy = h * 0.84;
  return [
    { d: circle(cx, cy, r), thin: true },
    { d: line(cx, cy, cx, cy - r * 0.7), thin: true },
  ];
}
