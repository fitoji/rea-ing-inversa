/**
 * Sentido de la corriente por cable.
 *
 * El solver responde QUÉ está energizado; esta capa responde hacia DÓNDE va la
 * corriente, para que el dibujo la muestre como un solo lazo: sale de la
 * alimentación, baja hacia la carga y vuelve por el retorno hasta el neutro.
 *
 * Modelo: grafo de puntos sobre la misma proyección de `buildNetwork` que usa
 * la netlist (así las uniones en T quedan unidas igual que ahí). Las aristas
 * son los tramos y los aparatos que conducen (contactos cerrados y cargas
 * energizadas). Un BFS desde los bornes de la fase asigna a cada punto su
 * distancia a la fuente; la corriente siempre va del punto más cercano al más
 * lejano. El neutro no siembra: por eso la distancia crece hasta el borne de N
 * y el retorno queda apuntando hacia allá, nunca al revés.
 */

import type { CadeRecordModel } from '../model/project.ts';
import type { BuiltCircuit } from './circuit.ts';
import type { SimState } from './solver.ts';
import { buildNetwork, netKey } from '../editor/network.ts';

/**
 * Cuántos bornes de cada símbolo de alimentación son del lado fase, en orden
 * de archivo: los que van después son retorno (N o PE). Por eso no se compara
 * contra la net de retorno: un tablero puede tener varias barras N en nets
 * distintas y todas quedan del lado retorno igual.
 */
const LIVE_PIN_COUNT: Readonly<Record<number, number>> = {
  3000: Number.POSITIVE_INFINITY,
  3001: 0,
  3003: 1,
  3004: 3,
  3005: 3,
  3006: 3,
  3007: 4,
};

export interface CurrentFlow {
  /** cables por donde hay tensión o circula corriente: lazo completo */
  carrying: Set<number>;
  /** cables cuya corriente va contra el sentido del trazo (x2,y2 -> x1,y1) */
  reversed: Set<number>;
}

export function currentFlow(records: CadeRecordModel[], built: BuiltCircuit, state: SimState): CurrentFlow {
  const network = buildNetwork(records);
  const sheetOf = new Map<number, number>();
  for (const rec of records) sheetOf.set(rec.id, rec.sheet);

  const adjacent = new Map<string, string[]>();
  const link = (a: string, b: string): void => {
    if (a === b) return;
    const la = adjacent.get(a) ?? [];
    la.push(b);
    adjacent.set(a, la);
    const lb = adjacent.get(b) ?? [];
    lb.push(a);
    adjacent.set(b, lb);
  };

  // Tramos y uniones en T: un borne o unión que cae en el medio de un tramo lo
  // subdivide, igual que en la netlist, para que la distancia crezca a lo largo.
  for (const seg of network.segments.values()) link(seg.a, seg.b);
  for (const node of network.nodes.values()) {
    for (const segId of node.through) {
      const seg = network.segments.get(segId);
      if (!seg) continue;
      link(node.key, seg.a);
      link(node.key, seg.b);
    }
  }

  // Aristas por aparato: los bornes de un polo que conduce quedan unidos.
  for (const device of built.devices) {
    const pts = network.pins.get(device.recordId);
    if (!pts) continue;
    const sheet = sheetOf.get(device.recordId);
    if (sheet === undefined) continue;
    for (const [i, j] of device.poles) {
      const id = `${device.recordId}:${i}-${j}`;
      if (!state.closed.has(id) && !state.loads.has(id)) continue;
      const a = pts[i];
      const b = pts[j];
      if (!a || !b) continue;
      link(netKey(sheet, a.x, a.y), netKey(sheet, b.x, b.y));
    }
  }

  // Siembra: bornes del lado fase de los símbolos de alimentación. Un terminal
  // de sólo fase lista los dos extremos del cable que lo alimenta; el primero
  // (orden del archivo) es el extremo libre, la punta por donde entra la
  // corriente. Sin símbolos, siembran todos los puntos de la net de fase.
  const seeds: string[] = [];
  for (const device of built.devices) {
    const liveCount = LIVE_PIN_COUNT[device.code];
    if (liveCount === undefined) continue;
    const pts = network.pins.get(device.recordId);
    if (!pts) continue;
    const sheet = sheetOf.get(device.recordId);
    if (sheet === undefined) continue;
    const live = pts
      .slice(0, liveCount)
      .map((p, i) => ({ p, net: device.nets[i] }))
      .filter((e) => e.net !== undefined);
    if (live.length === 0) continue;
    const sameNet = live.every((e) => e.net === live[0]!.net);
    const inject = live.length > 1 && sameNet ? [live[0]!] : live;
    for (const e of inject) seeds.push(netKey(sheet, e.p.x, e.p.y));
  }
  if (seeds.length === 0) {
    const [live] = built.supply;
    const vertexNet = new Map<string, number>();
    for (const seg of network.segments.values()) {
      const nets = built.recordNets.get(seg.id);
      if (!nets) continue;
      if (!vertexNet.has(seg.a)) vertexNet.set(seg.a, nets[0]!);
      if (!vertexNet.has(seg.b)) vertexNet.set(seg.b, nets[1] ?? nets[0]!);
    }
    for (const [key, net] of vertexNet) if (net === live) seeds.push(key);
  }

  // BFS multi-fuente: distancia de cada punto a la fuente de fase.
  const dist = new Map<string, number>();
  const queue: string[] = [];
  for (const key of seeds) {
    if (dist.has(key)) continue;
    dist.set(key, 0);
    queue.push(key);
  }
  for (let head = 0; head < queue.length; head++) {
    const key = queue[head]!;
    const d = dist.get(key)!;
    for (const next of adjacent.get(key) ?? []) {
      if (dist.has(next)) continue;
      dist.set(next, d + 1);
      queue.push(next);
    }
  }

  const carrying = new Set<number>();
  const reversed = new Set<number>();
  for (const [id, seg] of network.segments) {
    const da = dist.get(seg.a);
    const db = dist.get(seg.b);
    if (da === undefined && db === undefined) continue;
    carrying.add(id);
    if (da !== undefined && db !== undefined && db < da) reversed.add(id);
  }
  return { carrying, reversed };
}
