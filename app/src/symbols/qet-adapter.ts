/**
 * Adapta los símbolos EN 60617 importados (`qet.ts`) al contrato de la librería.
 *
 * Sólo se reemplaza la geometría: el nombre y el grupo siguen siendo los del
 * catálogo, y los nombres de borne se conservan (son la convención del proyecto).
 * Si el elemento importado declara la misma cantidad de bornes, se toman sus
 * posiciones para que los puntos caigan sobre las terminales dibujadas.
 */
import type { Shape, SymbolDef } from './library.ts';
import type { QetSymbol } from './qet.ts';

const round = (n: number): number => Math.round(n * 100) / 100;

/** Convierte una polilínea normalizada (0..1) al path de la caja actual. */
export function qetPaths(q: QetSymbol, w: number, h: number): Shape[] {
  return q.shapes.map((s) => ({
    d:
      s.pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${round(p[0] * w)} ${round(p[1] * h)}`).join('') +
      (s.closed ? 'Z' : ''),
    fill: s.fill,
    thin: s.thin,
  }));
}

/** Devuelve el símbolo con el dibujo normalizado, conservando nombre y grupo. */
export function withQetGeometry(sym: SymbolDef, q: QetSymbol): SymbolDef {
  const pins =
    q.pins.length === sym.pins.length
      ? sym.pins.map((p, i) => ({ ...p, nx: q.pins[i]!.nx, ny: q.pins[i]!.ny, side: q.pins[i]!.side }))
      : sym.pins;
  return {
    ...sym,
    pins,
    size: q.size,
    shapes: (w, h) => qetPaths(q, w, h),
  };
}
