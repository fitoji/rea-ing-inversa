/**
 * Estado visual de un componente durante la simulación.
 *
 * El solver informa qué aparatos están energizados y qué contactos conducen;
 * esta capa traduce eso a un estado que el lienzo puede pintar sin conocer la
 * lógica eléctrica. No cambia el archivo ni el modelo de dominio.
 */
import type { CadeRecordModel } from '../model/project.ts';
import { specOf } from '../model/component-spec.ts';
import { resolveSymbol } from '../symbols/library.ts';

export type VisualState =
  | 'idle'
  | 'active'
  | 'closed'
  | 'open'
  | 'pressed'
  | 'flashing'
  | 'timing'
  | 'tripped';

export interface VisualContext {
  simulating: boolean;
  /** ids de registros energizados */
  live: ReadonlySet<number>;
  /** ids de contactos cerrados */
  closed: ReadonlySet<number>;
  /** ids de pulsadores presionados */
  pressed: ReadonlySet<number>;
  /** ids de protecciones disparadas (aún no modelado por el solver) */
  tripped?: ReadonlySet<number>;
  /** ids de temporizadores/contactos temporizados que ya cumplieron el retardo */
  timerReady?: ReadonlySet<number>;
}

function isMotor(code: number, pins: string[]): boolean {
  return resolveSymbol(code, pins).group === 'motor';
}

/** Lámpara intermitente: única lámpara que no enciende fija. */
const FLASHING_LAMP = 9009;

export function visualStateOf(
  rec: Pick<CadeRecordModel, 'id' | 'code' | 'pins'>,
  ctx: VisualContext,
): VisualState {
  if (!ctx.simulating) return 'idle';

  const id = rec.id;
  const spec = specOf(rec.code);
  if (ctx.tripped?.has(id)) return 'tripped';
  // Pulsadores y selectores: el clic manda y en reposo mandan su polaridad NA/NC.
  if (spec.pressable) {
    if (ctx.pressed.has(id)) return 'pressed';
    return spec.rest === 'closed' ? 'closed' : 'open';
  }
  if (spec.kind === 'lamp') {
    if (!ctx.live.has(id)) return 'idle';
    return rec.code === FLASHING_LAMP ? 'flashing' : 'active';
  }
  if (isMotor(rec.code, rec.pins)) return ctx.live.has(id) ? 'active' : 'idle';
  if (spec.kind === 'coil') {
    if (!ctx.live.has(id)) return 'idle';
    if (spec.timer) return ctx.timerReady?.has(id) ? 'active' : 'timing';
    return 'active';
  }
  if (spec.kind === 'contact' && spec.timer) {
    const baseNC = spec.rest === 'closed';
    const ready = ctx.timerReady?.has(id) ?? false;
    if (!ctx.live.has(id)) return baseNC ? (ready ? 'open' : 'closed') : 'idle';
    return ready ? 'active' : 'timing';
  }
  if (spec.kind === 'contact') return ctx.closed.has(id) ? 'closed' : 'open';
  // Conmutador de dos posiciones: cerrado cuando su salida activa toca el común.
  if (spec.kind === 'changeover') return ctx.closed.has(id) ? 'closed' : 'open';
  return ctx.live.has(id) ? 'active' : 'idle';
}

/** Estado por registro de componente, listo para `data-state` en el lienzo. */
export function visualStatesOf(
  records: CadeRecordModel[],
  ctx: VisualContext,
): Map<number, VisualState> {
  const out = new Map<number, VisualState>();
  for (const rec of records) {
    if (rec.kind !== 'component') continue;
    out.set(rec.id, visualStateOf(rec, ctx));
  }
  return out;
}
