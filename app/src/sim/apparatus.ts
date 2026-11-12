/**
 * Aparatos unidos mecánicamente: el contacto auxiliar y su disyuntor.
 *
 * En el PR1 el disyuntor de potencia (6009) y el conmutador del mando (8018)
 * comparten designador: son **el mismo aparato**. El conmutador es su contacto
 * auxiliar, así que su posición no se acciona por separado: la marca el
 * disyuntor. Con el disyuntor cerrado el conmutador queda en la posición de
 * maniobra (la salida 98, la que alimenta la red de la bobina) y con el
 * abierto en la de reposo (la salida 96).
 *
 * Es lo que muestra la captura del PR1: al activar el disyuntor de potencia
 * (el Q1 de la derecha) se permutan los contactos del Q1 del mando (el de la
 * izquierda) y, con ellos, se enciende H2 en vez de H1.
 */

import { isChangeover, startsOpen } from '../model/component-spec.ts';
import type { CadeRecordModel } from '../model/project.ts';
import { partKey } from './netlist.ts';

/** Estado de una protección: `'closed'` conduce, `'open'` corta. */
export type ProtectionState = 'closed' | 'open';

/**
 * La protección con el mismo designador que `rec`, si la hay.
 *
 * Sólo cuentan las protecciones (6000-6999): un contacto con otro contacto del
 * mismo aparato no se une mecánicamente a él.
 */
export function linkedProtection(
  records: CadeRecordModel[],
  rec: CadeRecordModel,
): CadeRecordModel | undefined {
  const designator = partKey(rec.designator);
  if (designator === '') return undefined;
  return records.find(
    (other) =>
      other.kind === 'component' &&
      other.id !== rec.id &&
      startsOpen(other.code) &&
      partKey(other.designator) === designator,
  );
}

/**
 * Posición de cada conmutador del dibujo, por id de registro.
 *
 * Un conmutador con una protección del mismo designador sigue al disyuntor: es
 * su contacto auxiliar. Los demás conservan la posición que el usuario les haya
 * dado con el clic.
 */
export function changeoverPositions(
  records: CadeRecordModel[],
  protectionStates: Record<number, ProtectionState>,
  free: Record<string, number>,
): Record<string, number> {
  const out: Record<string, number> = { ...free };
  for (const rec of records) {
    if (rec.kind !== 'component') continue;
    if (!isChangeover(rec.code)) continue;
    const protection = linkedProtection(records, rec);
    if (!protection) continue;
    const state = protectionStates[protection.id];
    const closed = state ? state === 'closed' : !startsOpen(protection.code);
    out[String(rec.id)] = closed ? 1 : 0;
  }
  return out;
}
