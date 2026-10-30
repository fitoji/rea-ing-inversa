/**
 * Modelo de red de cables.
 *
 * Tres hallazgos del archivo, verificados, que definen todo lo de arriba:
 *
 * 1. **Un cable con quiebres son varios registros.** El formato no tiene
 *    polilíneas: cada tramo es un registro con dos puntos. Lo que los une es el
 *    número de cable, guardado en `geometry[21]`. Los tres tramos del cable 17
 *    de `arranque-paro-motor-3f.cad` comparten ese número y forman una L real.
 *
 * 2. **Las uniones son registros propios.** El código `4001` con geometría de
 *    longitud cero marca un punto de unión, y también lleva número de cable.
 *
 * 3. **Un cable puede terminar en el medio de otro.** En el arranque, el cable
 *    que baja hasta la unión (162,105) termina *dentro* del tramo que va de
 *    (162,102) a (162,108). Esa conexión sólo existe porque hay un `4001` ahí.
 *
 * Consecuencia: para saber si dos cables están conectados no alcanza con
 * comparar extremos. Hay que proyectar los puntos sobre cada tramo.
 */

import { boundsOf, wirePoints, type CadeRecordModel } from '../model/project.ts';
import { attachPoints, type Point } from './pins.ts';

/** Índice de geometría donde vive el número de cable. */
export const CABLE_NUMBER_INDEX = 21;

/** Código del registro que marca una unión. */
export const JUNCTION_CODE = 4001;

export type NodeKind = 'end' | 'corner' | 'tee' | 'junction' | 'pin';

export interface NetNode {
  key: string;
  x: number;
  y: number;
  /** tramos que terminan exactamente acá */
  ends: number[];
  /** tramos que pasan por acá sin terminar (unión en T) */
  through: number[];
  /** hay un registro 4001 en este punto */
  junction: boolean;
  /** hay un borne de componente en este punto */
  pin: boolean;
  /** conexión efectiva: dos o más conductores, o un conductor sobre un borne */
  connected: boolean;
  kind: NodeKind;
}

export interface NetSegment {
  id: number;
  code: number;
  cable: number;
  a: string;
  b: string;
  points: { x1: number; y1: number; x2: number; y2: number };
}

export interface Network {
  nodes: Map<string, NetNode>;
  segments: Map<number, NetSegment>;
  /** número de cable -> ids de tramo, en orden de archivo */
  cables: Map<number, number[]>;
  /** puntos de unión declarados por registros 4001 */
  junctionPoints: Point[];
  /** bornes de componente por id */
  pins: Map<number, Point[]>;
}

export interface Finding {
  level: 'error' | 'warn';
  code: string;
  message: string;
  ids: number[];
  /** punto al que se refiere el hallazgo, cuando aplica */
  at?: Point;
}

const key = (x: number, y: number): string => `${Math.round(x * 100) / 100},${Math.round(y * 100) / 100}`;
const TOL = 0.01;

export function cableNumberOf(rec: CadeRecordModel): number {
  return rec.geometry[CABLE_NUMBER_INDEX] ?? 0;
}

const onSegmentInterior = (seg: NetSegment, x: number, y: number): boolean => {
  const { x1, y1, x2, y2 } = seg.points;
  if ((Math.abs(x - x1) < TOL && Math.abs(y - y1) < TOL) || (Math.abs(x - x2) < TOL && Math.abs(y - y2) < TOL)) {
    return false;
  }
  if (Math.abs(x1 - x2) < TOL) {
    return Math.abs(x - x1) < TOL && y > Math.min(y1, y2) + TOL && y < Math.max(y1, y2) - TOL;
  }
  if (Math.abs(y1 - y2) < TOL) {
    return Math.abs(y - y1) < TOL && x > Math.min(x1, x2) + TOL && x < Math.max(x1, x2) - TOL;
  }
  return false;
};

export function buildNetwork(records: CadeRecordModel[]): Network {
  const segments = new Map<number, NetSegment>();
  const cables = new Map<number, number[]>();
  const junctionPoints: Point[] = [];
  const pins = attachPoints(records);

  for (const rec of records) {
    if (rec.kind === 'component') continue;
    if (rec.code === JUNCTION_CODE) {
      const x = rec.geometry[8];
      const y = rec.geometry[9];
      if (Number.isFinite(x) && Number.isFinite(y)) junctionPoints.push({ x, y });
      continue;
    }
    const pts = wirePoints(rec);
    if (!pts) continue;
    const cable = cableNumberOf(rec);
    segments.set(rec.id, {
      id: rec.id,
      code: rec.code,
      cable,
      a: key(pts.x1, pts.y1),
      b: key(pts.x2, pts.y2),
      points: pts,
    });
    const list = cables.get(cable) ?? [];
    list.push(rec.id);
    cables.set(cable, list);
  }

  const nodes = new Map<string, NetNode>();
  const ensure = (x: number, y: number): NetNode => {
    const k = key(x, y);
    let node = nodes.get(k);
    if (!node) {
      node = { key: k, x, y, ends: [], through: [], junction: false, pin: false, connected: false, kind: 'end' };
      nodes.set(k, node);
    }
    return node;
  };

  for (const seg of segments.values()) {
    ensure(seg.points.x1, seg.points.y1).ends.push(seg.id);
    ensure(seg.points.x2, seg.points.y2).ends.push(seg.id);
  }

  for (const p of junctionPoints) ensure(p.x, p.y).junction = true;

  const pinByKey = new Map<string, number[]>();
  for (const [componentId, list] of pins) {
    for (const p of list) {
      const k = key(p.x, p.y);
      const ids = pinByKey.get(k) ?? [];
      ids.push(componentId);
      pinByKey.set(k, ids);
      ensure(p.x, p.y).pin = true;
    }
  }

  // Proyección: un borne o una unión que cae en el medio de un tramo lo corta.
  for (const node of nodes.values()) {
    for (const seg of segments.values()) {
      if (onSegmentInterior(seg, node.x, node.y)) node.through.push(seg.id);
    }
  }

  for (const node of nodes.values()) {
    const degree = node.ends.length + node.through.length * 2;
    node.connected = degree >= 2 || (node.ends.length + node.through.length > 0 && node.pin);
    if (node.junction) node.kind = 'junction';
    else if (node.pin) node.kind = 'pin';
    else if (node.through.length > 0) node.kind = 'tee';
    else if (node.ends.length >= 2) node.kind = 'corner';
    else node.kind = 'end';
  }

  return { nodes, segments, cables, junctionPoints, pins };
}

/** Ids de los tramos que forman el mismo cable lógico que `segmentId`. */
export function cableSegments(network: Network, segmentId: number): number[] {
  const seg = network.segments.get(segmentId);
  if (!seg) return [];
  if (seg.cable === 0) return [segmentId];
  return network.cables.get(seg.cable) ?? [segmentId];
}

/** Longitud total de un conjunto de tramos. */
export function cableLength(network: Network, ids: number[]): number {
  let total = 0;
  for (const id of ids) {
    const seg = network.segments.get(id);
    if (!seg) continue;
    total += Math.hypot(seg.points.x2 - seg.points.x1, seg.points.y2 - seg.points.y1);
  }
  return Math.round(total);
}

// --- validaciones (T3.6) -----------------------------------------------------

export function validate(records: CadeRecordModel[]): Finding[] {
  const network = buildNetwork(records);
  const findings: Finding[] = [];

  for (const node of network.nodes.values()) {
    const touching = node.ends.length + node.through.length;
    if (touching === 0) continue;
    if (node.ends.length === 1 && node.through.length === 0 && !node.pin && !node.junction) {
      findings.push({
        level: 'warn',
        code: 'orphan-end',
        message: `Extremo de cable suelto en (${node.x}, ${node.y})`,
        ids: node.ends,
        at: { x: node.x, y: node.y },
      });
    }
    if (node.through.length > 0 && !node.junction) {
      findings.push({
        level: 'warn',
        code: 'tee-without-junction',
        message: `Unión en T en (${node.x}, ${node.y}) sin punto de unión`,
        ids: [...node.through, ...node.ends],
        at: { x: node.x, y: node.y },
      });
    }
  }

  const seen = new Map<string, number>();
  for (const p of network.junctionPoints) {
    const k = key(p.x, p.y);
    seen.set(k, (seen.get(k) ?? 0) + 1);
  }
  for (const [k, count] of seen) {
    if (count > 1) {
      findings.push({ level: 'warn', code: 'duplicate-junction', message: `Dos uniones superpuestas en ${k}`, ids: [] });
    }
  }

  const components = records.filter((r) => r.kind === 'component');
  for (let i = 0; i < components.length; i++) {
    for (let j = i + 1; j < components.length; j++) {
      const a = boundsOf(components[i]!);
      const b = boundsOf(components[j]!);
      if (!a || !b) continue;
      if (a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y) {
        findings.push({
          level: 'warn',
          code: 'overlap',
          message: `Símbolos superpuestos: ${components[i]!.designator || components[i]!.code} y ${components[j]!.designator || components[j]!.code}`,
          ids: [components[i]!.id, components[j]!.id],
        });
      }
    }
  }

  for (const [cable, ids] of network.cables) {
    if (cable === 0 || ids.length < 2) continue;
    const ends = new Map<string, number>();
    for (const id of ids) {
      const seg = network.segments.get(id)!;
      for (const k of [seg.a, seg.b]) ends.set(k, (ends.get(k) ?? 0) + 1);
    }
    const loose = [...ends.entries()].filter(([, n]) => n === 1);
    for (const [k] of loose) {
      const node = network.nodes.get(k);
      if (node && !node.connected) {
        findings.push({
          level: 'warn',
          code: 'cable-disconnected',
          message: `Cable ${cable} con un extremo desconectado en ${k}`,
          ids,
        });
      }
    }
  }

  return findings;
}
