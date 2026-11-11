/**
 * Rol eléctrico de cada conductor, para pintarlo como lo pinta CADeSimu.
 *
 * Lo que muestra la captura real (`data/samples/tests01/test01.png`, 6 px por
 * unidad del archivo):
 *
 * - el conductor que sale del terminal de **fase** (3000) va **negro**;
 * - el que sale del terminal de **neutro** (3001) va **azul**;
 * - los que no tocan ninguna alimentación van **granate**.
 *
 * Lo que NO es la regla, medido sobre el mismo archivo:
 *
 * - no es el **código** del cable: el `4000` aparece en negro (cabecera de fase)
 *   y en granate (los dos tramos de la lámpara);
 * - no es el **número** de cable: los cables 1, 2, 4 y 5 son negro, granate,
 *   granate y azul.
 *
 * Lo que sí es la regla: el conductor toma el color de la **alimentación que su
 * red toca**. La red es lo que une los tramos por sus extremos y los puntos de
 * unión, así que un cable de tres tramos (el 4009 del neutro) es una sola red
 * y se pinta entero del mismo color.
 *
 * La regla sale de UNA captura: alcanza para el criterio de aceptación del
 * fixture, pero no para cerrar el caso de las alimentaciones trifásicas, del PE
 * y de la continua. Por eso el rol se calcula por red y no por código de
 * cable, y por eso las alimentaciones sin color medido quedan en `otro`.
 */

import type { CadeRecordModel } from '../model/project.ts';
import { netKey, type Network } from './network.ts';
import type { Point } from './pins.ts';

export type ConductorRole = 'fase' | 'neutro' | 'otro';

/**
 * Rol de los bornes de cada símbolo de alimentación, en el orden en que el
 * dibujo los declara (de arriba abajo).
 *
 * Los nombres salen del catálogo de CADeSimu (`catalog.ts`): 3000 es "Alimentación
 * L", 3001 "Alimentación N", 3003 "L N", 3004 "L1 L2 L3", 3005 "L1 L2 L3 PE",
 * 3006 "L1 L2 L3 N" y 3007 "L1 L2 L3 N PE". El PE y las alimentaciones de
 * continua no tienen color medido en ninguna captura: quedan en `otro`.
 */
const SUPPLY_PINS: Record<number, ConductorRole[]> = {
  3000: ['fase'],
  3001: ['neutro'],
  3002: ['otro'],
  3003: ['fase', 'neutro'],
  3004: ['fase', 'fase', 'fase'],
  3005: ['fase', 'fase', 'fase', 'otro'],
  3006: ['fase', 'fase', 'fase', 'neutro'],
  3007: ['fase', 'fase', 'fase', 'neutro', 'otro'],
  3008: ['otro'],
  3009: ['otro'],
  3010: ['otro', 'otro'],
};

/** La fase le gana al neutro: una red no puede ser las dos cosas. */
function strongest(a: ConductorRole, b: ConductorRole): ConductorRole {
  if (a === 'fase' || b === 'fase') return 'fase';
  if (a === 'neutro' || b === 'neutro') return 'neutro';
  return 'otro';
}

/** Unión de redes: dos nodos están en la misma red si un conductor los une. */
class Nets {
  private readonly parent = new Map<string, string>();

  find(key: string): string {
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
    if (!this.parent.has(a)) this.parent.set(a, a);
    if (!this.parent.has(b)) this.parent.set(b, b);
    const ra = this.find(a);
    const rb = this.find(b);
    if (ra !== rb) this.parent.set(ra, rb);
  }
}

/**
 * Rol de cada conductor del dibujo, por id de registro.
 *
 * `network` y `pins` son los que ya calcula el lienzo: no se recalculan acá.
 * Un conductor sin red (o una red sin alimentación) queda en `otro`.
 */
export function conductorRoles(
  records: CadeRecordModel[],
  network: Network,
  pins: Map<number, Point[]>,
): Map<number, ConductorRole> {
  const nets = new Nets();

  // Un tramo une sus dos extremos, y une cualquier punto que caiga en su
  // interior (una unión en T o un borne sobre el cable). La red ya trae esa
  // información en `node.through`.
  for (const seg of network.segments.values()) nets.union(seg.a, seg.b);
  for (const node of network.nodes.values()) {
    for (const segId of node.through) {
      const seg = network.segments.get(segId);
      if (seg) nets.union(node.key, seg.a);
    }
  }

  // Qué alimentación toca cada red.
  const roleByNet = new Map<string, ConductorRole>();
  for (const rec of records) {
    if (rec.kind !== 'component') continue;
    const roles = SUPPLY_PINS[rec.code];
    if (!roles) continue;
    const points = pins.get(rec.id) ?? [];
    points.forEach((p, i) => {
      const role = roles[i] ?? 'otro';
      const net = nets.find(netKey(rec.sheet, p.x, p.y));
      const current = roleByNet.get(net);
      roleByNet.set(net, current ? strongest(current, role) : role);
    });
  }

  const roleOf = (net: string): ConductorRole => roleByNet.get(net) ?? 'otro';

  // Un cable con quiebres son varios registros que comparten número: en
  // CADeSimu es un solo conductor y se pinta entero del mismo color. Los
  // cables sin número no se agrupan (cada tramo va por su propia red).
  const cableRole = new Map<string, ConductorRole>();
  for (const [group, ids] of network.cables) {
    const first = ids[0] === undefined ? undefined : network.segments.get(ids[0]);
    if (!first || first.cable === 0) continue;
    let role: ConductorRole = 'otro';
    for (const id of ids) {
      const seg = network.segments.get(id);
      if (!seg) continue;
      role = strongest(role, roleOf(nets.find(seg.a)));
    }
    cableRole.set(group, role);
  }

  const out = new Map<number, ConductorRole>();
  for (const rec of records) {
    if (rec.kind !== 'connection') continue;
    const seg = network.segments.get(rec.id);
    if (!seg) continue;
    const group = `${seg.sheet}:${seg.cable}`;
    out.set(rec.id, seg.cable === 0 ? roleOf(nets.find(seg.a)) : (cableRole.get(group) ?? 'otro'));
  }
  return out;
}
