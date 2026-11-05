/**
 * Puntos de conexión reales de cada componente, derivados del archivo.
 *
 * El formato no guarda coordenadas de borne, pero sí guarda los cables. Cada
 * extremo de cable que cae sobre el borde de una caja ES un punto de conexión
 * que CADe_SIMU dibujó. Eso es evidencia, no una suposición: no inventamos la
 * geometría, la leemos.
 *
 * Patrón observado en `arranque-paro-motor-3f.cad`: los puntos caen en una grilla
 * de 6 unidades. La fila superior está en `y = 0`; la inferior, en `y = alto - 3`
 * (tres unidades adentro del borde). Los dispositivos de dos bornes los tienen
 * sobre el borde izquierdo, espaciados 12. Es consistente con un esquema en
 * escalera vertical, donde la corriente baja.
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

/**
 * Un borne puede estar sobre el borde O dentro de la caja.
 *
 * Corrección sobre la primera hipótesis: el contactor tiene su fila inferior de
 * bornes en `y = alto - 3`, o sea tres unidades adentro del borde inferior. El
 * motor, en cambio, los tiene justo sobre el borde superior. La regla real es
 * "dentro o sobre la caja", no "sobre el borde".
 */
const insideBox = (b: Box, x: number, y: number): boolean =>
  x >= b.x - TOL && x <= b.x + b.w + TOL && y >= b.y - TOL && y <= b.y + b.h + TOL;

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
      const candidates = boxes.filter((b) => insideBox(b, p.x, p.y));
      // Un extremo puede tocar dos cajas apiladas (alimentación + protección).
      // Asignarlo a todas conecta la serie; el netlist las une por coordenada.
      for (const b of candidates) push(b.id, p);
    }
  }

  for (const list of out.values()) {
    list.sort((p, q) => (p.y === q.y ? p.x - q.x : p.y - q.y));
  }
  return out;
}
