/**
 * Solver de lógica de contactores.
 *
 * Modelo: los contactos conducen o no; las cargas (bobina, lámpara, motor) NO se
 * usan para propagar, sólo se consultan al final. Si una carga condujera para el
 * cálculo de continuidad, la fase y el neutro quedarían unidos por ella y todo
 * aparecería energizado.
 *
 * Algoritmo, por iteración:
 *   1. cada contacto se resuelve desde el estado de su aparato y los pulsadores;
 *   2. se calcula el conjunto alcanzable desde la fase usando SÓLO contactos;
 *   3. se recalcula cada carga: energizada si un borne está en la fase alcanzable
 *      y el otro en el neutro alcanzable;
 *   4. si el estado no cambió, convergió.
 *
 * Los enclavamientos son realimentación real: el contacto auxiliar del contactor
 * depende de la bobina del mismo contactor. Con un lazo mal puesto el estado
 * oscila; el solver lo detecta en vez de colgarse.
 */

export type DeviceKind =
  | 'coil'
  | 'lamp'
  | 'motor'
  | 'contactNO'
  | 'contactNC'
  | 'buttonNO'
  | 'buttonNC'
  | 'fuse'
  | 'thermal'
  | 'switch';

export interface SimDevice {
  /** identificador estable dentro del circuito */
  id: string;
  kind: DeviceKind;
  /** nets de los dos bornes */
  a: number;
  b: number;
  /** aparato al que pertenece: la bobina y sus contactos comparten clave */
  part: string;
}

export interface Circuit {
  devices: SimDevice[];
  /** net de alimentación y net de retorno */
  supply: [number, number];
}

export interface SimState {
  /** claves de aparato con la bobina energizada */
  energized: Set<string>;
  /** ids de dispositivos que conducen en este estado */
  closed: Set<string>;
  /** cargas energizadas: incluye bobinas, lámparas y motores */
  loads: Set<string>;
  /** nets con tensión en el último paso; sirve para pintar los cables */
  liveNets: Set<number>;
  iterations: number;
  stable: boolean;
  /** estado en el que se quedó oscilando, si no convergió */
  oscillating?: { energized: Set<string> };
}

const MAX_ITERATIONS = 40;
const CONDUCTIVE_CONTACT: ReadonlySet<DeviceKind> = new Set<DeviceKind>([
  'contactNO',
  'contactNC',
  'buttonNO',
  'buttonNC',
  'fuse',
  'thermal',
  'switch',
]);

const LOAD_KINDS: ReadonlySet<DeviceKind> = new Set<DeviceKind>(['coil', 'lamp', 'motor']);

export interface SimOptions {
  /** ids de pulsadores presionados */
  pressed?: ReadonlySet<string>;
  /**
   * Estado retenido del paso anterior. Un contactor real no olvida: si soltás
   * el pulsador, el contacto auxiliar lo mantiene. Arrancar siempre desde cero
   * haría imposible simular un enclavamiento.
   */
  initialEnergized?: Iterable<string>;
  /** máximo de iteraciones; útil para probar la detección de oscilación */
  maxIterations?: number;
}

function setKey(set: ReadonlySet<string>): string {
  return [...set].sort().join('|');
}

export function simulate(circuit: Circuit, options: SimOptions = {}): SimState {
  const pressed = options.pressed ?? new Set<string>();
  const maxIterations = options.maxIterations ?? MAX_ITERATIONS;
  const { devices, supply } = circuit;
  const [live, ret] = supply;

  const byPart = new Map<string, SimDevice[]>();
  for (const device of devices) {
    const list = byPart.get(device.part) ?? [];
    list.push(device);
    byPart.set(device.part, list);
  }

  let energized = new Set<string>(options.initialEnergized ?? []);
  const seen = new Set<string>([setKey(energized)]);
  let oscillating: Set<string> | undefined;

  for (let iteration = 1; iteration <= maxIterations; iteration++) {
    // 1. estado de cada contacto
    const closed = new Set<string>();
    for (const device of devices) {
      switch (device.kind) {
        case 'buttonNO':
          if (pressed.has(device.id)) closed.add(device.id);
          break;
        case 'buttonNC':
          if (!pressed.has(device.id)) closed.add(device.id);
          break;
        case 'contactNO':
          if (energized.has(device.part)) closed.add(device.id);
          break;
        case 'contactNC':
          if (!energized.has(device.part)) closed.add(device.id);
          break;
        case 'fuse':
        case 'thermal':
        case 'switch':
          closed.add(device.id);
          break;
        default:
          // las cargas no conducen para el cálculo de continuidad
          break;
      }
    }

    // 2. alcanzabilidad desde fase y desde neutro, sólo con contactos
    const adjacent = new Map<number, number[]>();
    const link = (a: number, b: number): void => {
      const la = adjacent.get(a) ?? [];
      la.push(b);
      adjacent.set(a, la);
      const lb = adjacent.get(b) ?? [];
      lb.push(a);
      adjacent.set(b, lb);
    };
    for (const device of devices) {
      if (!CONDUCTIVE_CONTACT.has(device.kind)) continue;
      if (!closed.has(device.id)) continue;
      link(device.a, device.b);
    }
    const reach = (from: number): Set<number> => {
      const seenNets = new Set<number>([from]);
      const stack = [from];
      while (stack.length > 0) {
        const net = stack.pop()!;
        for (const next of adjacent.get(net) ?? []) {
          if (seenNets.has(next)) continue;
          seenNets.add(next);
          stack.push(next);
        }
      }
      return seenNets;
    };
    const liveNets = reach(live);
    const returnNets = reach(ret);

    // 3. cargas
    //
    // El motor es trifásico: en un esquema unifilar no tiene retorno, así que se
    // considera alimentado cuando al menos dos de sus bornes están sobre redes
    // con tensión. Exigirle fase y neutro lo dejaba siempre apagado.
    const motorLive = new Map<string, Set<number>>();
    for (const device of devices) {
      if (device.kind !== 'motor') continue;
      const nets = motorLive.get(device.part) ?? new Set<number>();
      if (liveNets.has(device.a)) nets.add(device.a);
      if (liveNets.has(device.b)) nets.add(device.b);
      motorLive.set(device.part, nets);
    }

    const loads = new Set<string>();
    const nextEnergized = new Set<string>();
    for (const device of devices) {
      if (!LOAD_KINDS.has(device.kind)) continue;
      if (device.kind === 'motor') {
        const phases = motorLive.get(device.part)?.size ?? 0;
        const straddles = (liveNets.has(device.a) && returnNets.has(device.b)) || (liveNets.has(device.b) && returnNets.has(device.a));
        if (phases >= 2 || straddles) loads.add(device.id);
        continue;
      }
      const forward = liveNets.has(device.a) && returnNets.has(device.b);
      const backward = liveNets.has(device.b) && returnNets.has(device.a);
      if (!forward && !backward) continue;
      loads.add(device.id);
      if (device.kind === 'coil') nextEnergized.add(device.part);
    }

    if (setKey(nextEnergized) === setKey(energized)) {
      return { energized: nextEnergized, closed, loads, liveNets, iterations: iteration, stable: true };
    }

    const nextKey = setKey(nextEnergized);
    if (seen.has(nextKey)) {
      oscillating = nextEnergized;
      return {
        energized: nextEnergized,
        closed,
        loads,
        liveNets,
        iterations: iteration,
        stable: false,
        oscillating: { energized: oscillating },
      };
    }
    seen.add(nextKey);
    energized = nextEnergized;
  }

  return { energized, closed: new Set(), loads: new Set(), liveNets: new Set(), iterations: maxIterations, stable: false };
}
