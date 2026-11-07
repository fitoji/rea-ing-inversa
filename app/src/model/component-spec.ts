/**
 * ComponentSpec — una sola tabla de semántica por código de componente.
 *
 * La semántica de cada código vivía repartida en cinco tablas que se
 * contradecían (`netlist.kindOf`, `circuit.simKindOf`, los sets de `visual`,
 * `App.PUSH_CODES` y `project.LAMP_CODES`), y esa divergencia producía la
 * clase de bugs 8005/8100/8101: un código presionable en la UI y `unknown` en
 * el solver, un glifo de lámpara que nunca fue `lamp`. Este módulo es la
 * fuente única: cada consumidor deriva su dimensión de acá.
 *
 * La tabla se define por rangos más excepciones explícitas, sembrada del
 * inventario de `odd/tasks/component-spec.md` y de las tablas que reemplaza
 * (`netlist.ts` y `circuit.ts`). Paridad congelada (S6): sólo cambian los
 * códigos que ese documento declara — 8100, 8101, 8102, 8103, 8016, 2002,
 * 8018 y 9004-9007.
 */

export type SimKind =
  | 'coil'
  | 'contact'
  | 'pushbutton'
  | 'selector'
  | 'lamp'
  | 'thermal'
  | 'fuse'
  | 'motor'
  | 'terminal'
  | 'unknown';

export interface ComponentSpec {
  /** qué es el aparato para el solver */
  kind: SimKind;
  /**
   * Polaridad de reposo NA/NC tal como la trata el solver. En kinds sin
   * polaridad (fusibles, lámparas, motores...) es declarativa y vale 'open'.
   */
  rest: 'open' | 'closed';
  /** el usuario puede accionarlo con un clic */
  pressable: boolean;
  /** protección que el usuario puede abrir/disparar en simulación */
  protection: boolean;
  /** modo de retardo, si el aparato es temporizado */
  timer?: 'on' | 'off' | 'both';
  /** bobina biestable: mantiene su estado tras desenergizarse */
  latching?: boolean;
}

const UNKNOWN_SPEC: ComponentSpec = { kind: 'unknown', rest: 'open', pressable: false, protection: false };

function buildTable(): Readonly<Record<number, ComponentSpec>> {
  const table: Record<number, ComponentSpec> = {};
  const range = (from: number, to: number, spec: ComponentSpec): void => {
    for (let code = from; code <= to; code++) table[code] = spec;
  };
  const one = (code: number, spec: ComponentSpec): void => {
    table[code] = spec;
  };

  // Motores: trifásicos, Dahlander, rotativo, dos velocidades, CC, etc.
  const motor: ComponentSpec = { kind: 'motor', rest: 'open', pressable: false, protection: false };
  range(1000, 1010, motor);
  one(10508, motor);
  one(10509, motor);

  // Borneras y símbolos de alimentación.
  range(3000, 3999, { kind: 'terminal', rest: 'open', pressable: false, protection: false });

  // Protecciones: fusibles, automáticos, disyuntores y diferenciales conducen
  // mientras no se modelen disparos. 6007 cae en el rango pero es térmico.
  range(6000, 6999, { kind: 'fuse', rest: 'open', pressable: false, protection: true });
  one(6007, { kind: 'thermal', rest: 'open', pressable: false, protection: true });
  // 8017 es el contacto auxiliar NC del relé térmico: el solver lo trata NC.
  one(8017, { kind: 'thermal', rest: 'closed', pressable: false, protection: true });

  // Contactos: 7000/7001 auxiliares, 2001/2006 los de potencia del contactor,
  // 8018 el auxiliar NC doble. 2002 era CONTACT en visual y unknown en el
  // solver.
  const contactNO: ComponentSpec = { kind: 'contact', rest: 'open', pressable: false, protection: false };
  one(7000, contactNO);
  one(7001, { kind: 'contact', rest: 'closed', pressable: false, protection: false });
  one(2001, contactNO);
  one(2002, contactNO);
  one(2006, contactNO);
  one(8018, { kind: 'contact', rest: 'closed', pressable: false, protection: false });

  // Contactos temporizados: 7004-7007 a la conexión, 7008-7011 a la
  // desconexión, 7012-7015 a ambos. Los terminados en 5/9/3 son NC: así los
  // dibujaba `visual.TIMED_NC` y así lo declaraba el campo `timerNC`, pero el
  // solver los trataba como NA. `solver.ts:155-172` ya conmuta contactNC
  // temporizado, así que la polaridad de la tabla es ahora la verdadera.
  for (let code = 7004; code <= 7015; code++) {
    const timer = code <= 7007 ? 'on' : code <= 7011 ? 'off' : 'both';
    const rest = code === 7005 || code === 7009 || code === 7013 ? 'closed' : 'open';
    one(code, { kind: 'contact', rest, pressable: false, protection: false, timer });
  }

  // Pulsadores (NA/NC/NA-NC/conmutado) y setas de emergencia: presionables.
  // NC en el solver: 8001, 8005 y 8009.
  for (let code = 8000; code <= 8011; code++) {
    const rest = code === 8001 || code === 8005 || code === 8009 ? 'closed' : 'open';
    one(code, { kind: 'pushbutton', rest, pressable: true, protection: false });
  }

  // 8100 figura en CATALOG como «Pulsador» (designador -S) y estaba en
  // PUSH_CODES, pero el solver lo ignoraba: como contacto, el cierre dependía de
  // una bobina homónima y presionarlo no hacía nada. Es un pulsador.
  one(8100, { kind: 'pushbutton', rest: 'open', pressable: true, protection: false });

  // Selectores y finales de carrera: se accionan como pulsadores.
  // NC en el solver: 8013 y 8015.
  for (let code = 8012; code <= 8015; code++) {
    const rest = code === 8013 || code === 8015 ? 'closed' : 'open';
    one(code, { kind: 'selector', rest, pressable: true, protection: false });
  }

  // Señalización óptica. 8016 ya era lamp en el solver; 8101/8102/8103
  // tenían glifo de lámpara (o ni glifo) pero nunca fueron lamp.
  const lamp: ComponentSpec = { kind: 'lamp', rest: 'open', pressable: false, protection: false };
  one(8016, lamp);
  one(8101, lamp);
  one(8102, lamp);
  one(8103, lamp);
  one(9008, lamp);
  one(9009, lamp);

  // Bobinas: lo que se energiza. 9000 monoestable, 9001 biestable, 7018 la de
  // contactor. 9004-9007 son temporizadores: el TIMER_COIL de visual esperaba
  // `timerReady` pero el Device nunca llevaba `timer`; ahora la bobina
  // declara su modo (9004 conexión, 9005 desconexión, 9006 ambos, 9007
  // intermitente — cicla en ambos sentidos).
  one(9000, { kind: 'coil', rest: 'open', pressable: false, protection: false });
  // 9003 es «Electroválvula» (CATALOG, -EV): la capa visual ya la trataba como
  // bobina pero el solver la ignoraba. Eléctricamente es una carga inductiva.
  one(9003, { kind: 'coil', rest: 'open', pressable: false, protection: false });
  one(9001, { kind: 'coil', rest: 'open', pressable: false, protection: false, latching: true });
  one(7018, { kind: 'coil', rest: 'open', pressable: false, protection: false });
  one(9004, { kind: 'coil', rest: 'open', pressable: false, protection: false, timer: 'on' });
  one(9005, { kind: 'coil', rest: 'open', pressable: false, protection: false, timer: 'off' });
  one(9006, { kind: 'coil', rest: 'open', pressable: false, protection: false, timer: 'both' });
  one(9007, { kind: 'coil', rest: 'open', pressable: false, protection: false, timer: 'both' });

  return table;
}

const SPEC = buildTable();

/**
 * Semántica de un código. Función total: nunca lanza; los códigos sin
 * semántica de simulación reciben el spec `unknown`.
 */
export function specOf(code: number): ComponentSpec {
  return SPEC[code] ?? UNKNOWN_SPEC;
}

/** Presionable con un clic: pulsadores y selectores. */
export function isPushable(code: number): boolean {
  return specOf(code).pressable;
}

export function isLamp(code: number): boolean {
  return specOf(code).kind === 'lamp';
}

/** Protecciones que el usuario puede abrir/disparar en simulación. */
export function isProtection(code: number): boolean {
  return specOf(code).protection;
}

/** Polaridad de reposo: 'closed' = NC, 'open' = NA. */
export function restStateOf(code: number): 'open' | 'closed' {
  return specOf(code).rest;
}

export function timerOf(code: number): 'on' | 'off' | 'both' | undefined {
  return specOf(code).timer;
}

export function isLatching(code: number): boolean {
  return specOf(code).latching ?? false;
}
