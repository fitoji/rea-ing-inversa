/**
 * Puntos de conexión reales de cada componente, derivados del archivo.
 *
 * El formato no guarda coordenadas de borne, pero sí guarda los cables. Cada
 * extremo de cable que cae sobre el borde de una caja ES un punto de conexión
 * que CADe_SIMU dibujó. Eso es evidencia, no una suposición: no inventamos la
 * geometría, la leemos.
 *
 * Patrón observado en `arranque-paro-motor-3f.cad`: los puntos caen en múltiplos
 * de 6 unidades sobre el borde superior (dispositivos de varios bornes) o sobre
 * el borde izquierdo espaciados 12 (dispositivos de dos bornes). Es consistente
 * con un esquema en escalera vertical, donde la corriente baja.
 *
 * Cuando no hay cables, no hay pines que mostrar. Es correcto: sin conexión no
 * hay evidencia de dónde está el borne.
 */

import { boundsOf, wirePoints, type CadeRecordModel } from '../model/project.ts';

export interface Point {
  x: number;
  y: number;
}

const TOL = 0.01;

interface Box {
  id: number;
  x: number;
  y: number;
  w: number;
  h: number;
}

const onBoundary = (b: Box, x: number, y: number): boolean => {
  const insideX = x >= b.x - TOL && x <= b.x + b.w + TOL;
  const insideY = y >= b.y - TOL && y <= b.y + b.h + TOL;
  if (!insideX || !insideY) return false;
  const onVertical = Math.abs(x - b.x) <= TOL || Math.abs(x - (b.x + b.w)) <= TOL;
  const onHorizontal = Math.abs(y - b.y) <= TOL || Math.abs(y - (b.y + b.h)) <= TOL;
  return onVertical || onHorizontal;
};

const centerDistance = (b: Box, x: number, y: number): number =>
  Math.hypot(x - (b.x + b.w / 2), y - (b.y + b.h / 2));

/**
 * Devuelve, por id de componente, los puntos donde sus cables lo tocan.
 *
 * Un extremo compartido por dos cajas se asigna a la más cercana, para que un
 * empalme entre componentes vecinos no duplique el pin.
 */
export function attachPoints(records: CadeRecordModel[]): Map<number, Point[]> {
  const boxes: Box[] = [];
  const wires: { a: Point; b: Point }[] = [];

  for (const rec of records) {
    if (rec.kind === 'component') {
      const b = boundsOf(rec);
      if (b) boxes.push({ id: rec.id, ...b });
      continue;
    }
    const pts = wirePoints(rec);
    if (pts) wires.push({ a: { x: pts.x1, y: pts.y1 }, b: { x: pts.x2, y: pts.y2 } });
  }

  const out = new Map<number, Point[]>();
  const push = (id: number, p: Point): void => {
    const list = out.get(id) ?? [];
    if (list.some((q) => Math.abs(q.x - p.x) < TOL && Math.abs(q.y - p.y) < TOL)) return;
    list.push(p);
    out.set(id, list);
  };

  for (const wire of wires) {
    for (const p of [wire.a, wire.b]) {
      const candidates = boxes.filter((b) => onBoundary(b, p.x, p.y));
      if (candidates.length === 0) continue;
      const nearest = candidates.reduce((best, b) =>
        centerDistance(b, p.x, p.y) < centerDistance(best, p.x, p.y) ? b : best,
      );
      push(nearest.id, p);
    }
  }

  for (const list of out.values()) {
    list.sort((p, q) => (p.y === q.y ? p.x - q.x : p.y - q.y));
  }
  return out;
}
