/**
 * Tipo de cable y armado del circuito para el solver.
 *
 * CADe_SIMU tiene «Cable fase» y «Cable neutro» como ELEMENTOS DISTINTOS de la
 * librería «Cables y conexiones» (documentación oficial). O sea: el tipo de
 * conductor no es una convención de color, es un registro distinto del archivo.
 * Por eso hay que leerlo del código, no adivinarlo.
 *
 * Lo que muestran los tres archivos reales:
 *
 *   código | qué hace en el dibujo                              | tipo inferido
 *   -------|----------------------------------------------------|---------------
 *   4000   | alimenta las cargas: borne -> protección -> contac- | fase
 *          | tor -> térmico -> motor. Numerados 1, 2, 3...       |
 *   4010   | UN solo conductor por archivo, del último borne de  | neutro (o PE)
 *          | la bornera al último borne del motor, de punta a    |
 *          | punta del plano                                    |
 *   4009   | varios tramos que comparten número, en el circuito  | mando
 *          | de mando                                           |
 *   4019   | tramos sin numerar, circuito de mando              | mando
 *   4001   | geometría de longitud cero                         | unión
 *
 * ⚠️ La asignación fase/neutro de 4000 y 4010 es una INFERENCIA por estructura,
 * todavía no confirmada contra la paleta de CADe_SIMU (marrón = fase, azul =
 * neutro, verde entrecortado = protección). Por eso el armado del circuito
 * recibe los códigos como PARÁMETRO: si la inferencia cambia, se cambia acá y
 * nada más.
 */

import type { CadeRecordModel } from '../model/project.ts';
import { buildNetlist, type Device, type Netlist } from './netlist.ts';
import type { Circuit, DeviceKind, SimDevice } from './solver.ts';

export type CableType = 'phase' | 'neutral' | 'control' | 'junction' | 'unknown';

export const CABLE_TYPE_BY_CODE: Readonly<Record<number, CableType>> = {
  4000: 'phase',
  4010: 'neutral',
  4009: 'control',
  4019: 'control',
  4001: 'junction',
};

export function cableTypeOf(code: number): CableType {
  return CABLE_TYPE_BY_CODE[code] ?? 'unknown';
}

/** Cómo se comporta cada aparato en el solver. */
export function simKindOf(device: Device): SimDevice['kind'] | null {
  switch (device.kind) {
    case 'coil':
      return 'coil';
    case 'lamp':
      return 'lamp';
    case 'motor':
      // Los bornes 9000/9003 son pasatapas del motor, no cargas.
      return device.code === 1000 ? 'motor' : null;
    case 'fuse':
      return 'fuse';
    case 'thermal':
      return device.code === 6007 ? 'thermal' : 'contactNC';
    case 'contact':
      // 2001 es el contacto de potencia: su estado lo manda la bobina del
      // mismo designador. 7001 es un auxiliar, también NA.
      return 'contactNO';
    case 'pushbutton':
      return device.code === 8000 ? 'buttonNO' : 'buttonNC';
    case 'selector':
      return device.code === 8012 ? 'switch' : 'buttonNC';
    default:
      return null;
  }
}

export interface CircuitOptions {
  /** cable marcado como fase por el usuario; su red es la alimentación */
  phaseRecord?: number | null;
  /** cable marcado como neutro por el usuario */
  neutralRecord?: number | null;
  /** códigos de respaldo cuando el usuario no marcó nada */
  liveCode?: number;
  returnCode?: number;
}

export interface BuiltCircuit {
  circuit: Circuit;
  /** net tomada como fase y net tomada como retorno */
  supply: [number, number];
  devices: Device[];
}

/**
 * Arma un circuito para el solver a partir de los registros del archivo.
 *
 * La fase y el neutro NO se adivinan por posición: se toman de las redes que
 * tocan los cables de cada tipo. Eso es lo que convierte "el dibujo" en "un
 * circuito con alimentación".
 */
export function circuitFrom(records: CadeRecordModel[], options: CircuitOptions = {}): BuiltCircuit | null {
  const liveCode = options.liveCode ?? 4000;
  const returnCode = options.returnCode ?? 4010;
  const netlist = buildNetlist(records);

  const netOfRecord = (id: number | null | undefined): number | null => {
    if (id === null || id === undefined) return null;
    const nets = netlist.recordNets.get(id);
    return nets && nets.length > 0 ? nets[0]! : null;
  };
  const live = netOfRecord(options.phaseRecord) ?? supplyNetOf(records, netlist, liveCode);
  const ret = netOfRecord(options.neutralRecord) ?? supplyNetOf(records, netlist, returnCode);
  if (live === null || ret === null || live === ret) return null;

  const devices: SimDevice[] = [];
  for (const device of netlist.devices) {
    const kind = simKindOf(device);
    if (!kind) continue;
    for (const [a, b] of device.poles) {
      devices.push({
        id: `${device.recordId}:${a}-${b}`,
        kind,
        a: device.nets[a]!,
        b: device.nets[b]!,
        part: device.part,
      });
    }
  }

  return { circuit: { devices, supply: [live, ret] }, supply: [live, ret], devices: netlist.devices };
}

/**
 * Net de alimentación de un tipo de cable: la red que aparece en más tramos de
 * ese código. Un cable de fase toca la misma red de alimentación varias veces.
 */
function supplyNetOf(records: CadeRecordModel[], netlist: Netlist, code: number): number | null {
  const counts = new Map<number, number>();
  for (const rec of records) {
    if (rec.kind !== 'connection' || rec.code !== code) continue;
    for (const net of netlist.recordNets.get(rec.id) ?? []) {
      counts.set(net, (counts.get(net) ?? 0) + 1);
    }
  }
  let best: number | null = null;
  let bestCount = 0;
  for (const [net, count] of counts) {
    if (count > bestCount) {
      best = net;
      bestCount = count;
    }
  }
  return best;
}

/** Tipo de cada tramo, para pintarlo en el lienzo. */
export function cableTypes(records: CadeRecordModel[]): Map<number, CableType> {
  const out = new Map<number, CableType>();
  for (const rec of records) {
    if (rec.kind !== 'connection') continue;
    out.set(rec.id, cableTypeOf(rec.code));
  }
  return out;
}

export type { DeviceKind };
