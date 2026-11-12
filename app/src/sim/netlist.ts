/**
 * Netlist eléctrica: convierte el dibujo en un circuito.
 *
 * Tres cosas que el formato NO dice y hay que inferir del dibujo:
 *
 *  1. **Qué está unido eléctricamente.** Dos tramos que comparten un punto lo
 *     están; también lo están si un extremo cae en el MEDIO de otro (unión en
 *     T). Por eso se reutiliza la proyección de `network.ts` en vez de comparar
 *     coordenadas sueltas.
 *  2. **Qué bornes son de qué aparato.** Los bornes salen de los extremos de
 *     cable sobre la caja (`pins.ts`), en el orden en que el archivo los lista.
 *  3. **Qué partes forman un mismo aparato.** El designador es la única pista:
 *     la bobina `-KM1` y el contacto auxiliar `-KM1` son el mismo contactor.
 *     Sin eso no hay enclavamiento posible.
 */

import type { CadeRecordModel } from '../model/project.ts';
import { specOf } from '../model/component-spec.ts';
import { attachPoints } from '../editor/pins.ts';
import { buildNetwork, netKey } from '../editor/network.ts';

export type DeviceKind =
  | 'coil'
  | 'contact'
  | 'pushbutton'
  | 'selector'
  /** conmutador de dos posiciones: una sola de sus dos salidas está conectada */
  | 'changeover'
  | 'lamp'
  | 'fuse'
  | 'thermal'
  | 'motor'
  | 'terminal'
  | 'unknown';

export interface Device {
  recordId: number;
  code: number;
  /** designador crudo, tal cual lo escribió el archivo */
  designator: string;
  /** clave de aparato: designador normalizado, agrupa las partes */
  part: string;
  kind: DeviceKind;
  /** bornes en orden de archivo */
  pinNames: string[];
  /** net de cada borne; -1 si el borne no está conectado */
  nets: number[];
  /** pares de bornes que forman polos: [a, b] sobre índices de `nets` */
  poles: [number, number][];
  /** Temporizado: modo y si el contacto base es NC. */
  timer?: 'on' | 'off' | 'both';
  timerNC?: boolean;
  /** Bobina biestable: mantiene su estado tras desenergizarse. */
  latching?: boolean;
}

export interface Netlist {
  /** net id -> cantidad de puntos que la forman */
  sizes: Map<number, number>;
  devices: Device[];
  /** net -> ids de registro que la tocan */
  members: Map<number, Set<number>>;
  /** id de registro -> nets que toca (tramos y uniones incluidos) */
  recordNets: Map<number, number[]>;
}

/** Normaliza el designador para agrupar partes del mismo aparato. */
export function partKey(designator: string): string {
  return designator.trim().toUpperCase().replace(/^[-\s]+/, '');
}

/**
 * Kind de simulación de un código, derivado del ComponentSpec: la tabla
 * única de semántica por código (`model/component-spec.ts`).
 */
export function kindOf(code: number): DeviceKind {
  return specOf(code).kind;
}

/** Protecciones que el usuario puede abrir/disparar en simulación. */
export function isProtectionCode(code: number): boolean {
  return specOf(code).protection;
}

/** Agrupa bornes en polos: la primera mitad contra la segunda. */
function pairPins(count: number): [number, number][] {
  if (count < 2) return [];
  const half = Math.floor(count / 2);
  const pairs: [number, number][] = [];
  for (let i = 0; i < half; i++) pairs.push([i, i + half]);
  return pairs;
}

class UnionFind {
  private parent = new Map<string, string>();

  add(key: string): void {
    if (!this.parent.has(key)) this.parent.set(key, key);
  }

  find(key: string): string {
    this.add(key);
    let root = key;
    while (this.parent.get(root) !== root) root = this.parent.get(root)!;
    let cur = key;
    while (this.parent.get(cur) !== root) {
      const next = this.parent.get(cur)!;
      this.parent.set(cur, root);
      cur = next;
    }
    return root;
  }

  union(a: string, b: string): void {
    const ra = this.find(a);
    const rb = this.find(b);
    if (ra !== rb) this.parent.set(ra, rb);
  }
}

export function buildNetlist(records: CadeRecordModel[]): Netlist {
  const network = buildNetwork(records);
  const pins = attachPoints(records);
  const uf = new UnionFind();

  for (const node of network.nodes.values()) uf.add(node.key);

  // Un tramo conecta sus dos extremos, y une cualquier punto que caiga en su
  // interior (una unión en T o un borne sobre el cable).
  for (const seg of network.segments.values()) {
    uf.union(seg.a, seg.b);
    for (const node of network.nodes.values()) {
      if (node.through.includes(seg.id)) {
        uf.union(node.key, seg.a);
      }
    }
  }

  // Los bornes de un componente comparten net si caen en el mismo punto.
  const pinPoints = new Map<number, { x: number; y: number }[]>();
  for (const [id, list] of pins) pinPoints.set(id, list);

  const netIdByKey = new Map<string, number>();
  const rootToNet = new Map<string, number>();
  let nextNet = 0;
  const netOf = (k: string): number => {
    const cached = netIdByKey.get(k);
    if (cached !== undefined) return cached;
    const root = uf.find(k);
    let id = rootToNet.get(root);
    if (id === undefined) {
      id = nextNet++;
      rootToNet.set(root, id);
    }
    netIdByKey.set(k, id);
    return id;
  };

  const sizes = new Map<number, number>();
  const bump = (id: number): void => {
    sizes.set(id, (sizes.get(id) ?? 0) + 1);
  };

  for (const node of network.nodes.values()) bump(netOf(node.key));
  for (const seg of network.segments.values()) {
    netOf(seg.a);
    netOf(seg.b);
  }

  const devices: Device[] = [];
  const members = new Map<number, Set<number>>();
  const recordNets = new Map<number, number[]>();

  for (const rec of records) {
    if (rec.kind !== 'connection') continue;
    const pts = wirePointsOf(rec);
    if (!pts) continue;
    recordNets.set(rec.id, [netOf(netKey(rec.sheet, pts.x1, pts.y1)), netOf(netKey(rec.sheet, pts.x2, pts.y2))]);
  }

  for (const rec of records) {
    if (rec.kind !== 'component') continue;
    const points = pinPoints.get(rec.id);
    if (!points || points.length === 0) continue;

    const nets = points.map((p) => netOf(netKey(rec.sheet, p.x, p.y)));
    for (const net of nets) {
      const set = members.get(net) ?? new Set<number>();
      set.add(rec.id);
      members.set(net, set);
    }

    // La semántica del aparato sale del ComponentSpec: kind, temporizador y
    // biestable son dimensiones de la misma fila.
    const spec = specOf(rec.code);
    devices.push({
      recordId: rec.id,
      code: rec.code,
      designator: rec.designator,
      part: partKey(rec.designator),
      kind: spec.kind,
      pinNames: rec.pins,
      nets,
      poles: pairPins(nets.length),
      timer: spec.timer,
      timerNC: spec.timer !== undefined && spec.rest === 'closed',
      latching: spec.latching ?? false,
    });
  }

  return { sizes, devices, members, recordNets };
}

function wirePointsOf(rec: CadeRecordModel): { x1: number; y1: number; x2: number; y2: number } | null {
  const g = rec.geometry;
  if (g.length < 12) return null;
  const pts = { x1: g[8]!, y1: g[9]!, x2: g[10]!, y2: g[11]! };
  if (pts.x1 === pts.x2 && pts.y1 === pts.y2) return null;
  return pts;
}
