/**
 * Estado visual de un componente durante la simulación.
 *
 * El solver informa qué aparatos están energizados y qué contactos conducen;
 * esta capa traduce eso a un estado que el lienzo puede pintar sin conocer la
 * lógica eléctrica. No cambia el archivo ni el modelo de dominio.
 */
import type { CadeRecordModel } from '../model/project.ts';
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

/** Señalización óptica fija e intermitente. */
const LAMP = new Set([9008, 9009]);
/** Bobinas, electroválvulas y temporizadores. */
const COIL = new Set([9000, 9001, 9003, 9004, 9005, 9006, 9007]);
/** Pulsadores y finales de carrera. */
const PUSHER = new Set([8000, 8001, 8012, 8013]);
/** Contactos principales y auxiliares. */
const CONTACT = new Set([2001, 2002, 7000, 7001]);
/** Contactos temporizados. */
const TIMED_CONTACT = new Set([7004, 7005, 7006, 7007, 7008, 7009, 7010, 7011, 7012, 7013, 7014, 7015]);
/** Temporizadores a la conexión (coil). */
const TIMER_COIL = new Set([9004, 9005, 9006, 9007]);
/** Contactos temporizados NC. */
const TIMED_NC = new Set([7005, 7009, 7013]);

function isMotor(code: number, pins: string[]): boolean {
  return resolveSymbol(code, pins).group === 'motor';
}

export function visualStateOf(
  rec: Pick<CadeRecordModel, 'id' | 'code' | 'pins'>,
  ctx: VisualContext,
): VisualState {
  if (!ctx.simulating) return 'idle';

  const id = rec.id;
  if (ctx.tripped?.has(id)) return 'tripped';
  if (PUSHER.has(rec.code)) {
    if (ctx.pressed.has(id)) return 'pressed';
    // Pulsador NC (paro) dibujado cerrado; NA (marcha) abierto.
    return rec.code === 8001 || rec.code === 8013 ? 'closed' : 'open';
  }
  if (LAMP.has(rec.code)) {
    if (!ctx.live.has(id)) return 'idle';
    return rec.code === 9009 ? 'flashing' : 'active';
  }
  if (isMotor(rec.code, rec.pins)) return ctx.live.has(id) ? 'active' : 'idle';
  if (COIL.has(rec.code)) {
    if (!ctx.live.has(id)) return 'idle';
    if (TIMER_COIL.has(rec.code)) return ctx.timerReady?.has(id) ? 'active' : 'timing';
    return 'active';
  }
  if (TIMED_CONTACT.has(rec.code)) {
    const baseNC = TIMED_NC.has(rec.code);
    const ready = ctx.timerReady?.has(id) ?? false;
    if (!ctx.live.has(id)) return baseNC ? (ready ? 'open' : 'closed') : 'idle';
    return ready ? 'active' : 'timing';
  }
  if (CONTACT.has(rec.code)) return ctx.closed.has(id) ? 'closed' : 'open';
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
