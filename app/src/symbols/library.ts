/**
 * Librería de símbolos IEC 60617 de Electro-Simulador.
 *
 * Por qué existe: el formato `.cade` guarda los NOMBRES de los bornes
 * (`1 3 5 2 4 6`, `U1 V1 W1 PE`) pero no sus coordenadas. La geometría real
 * de cada borne vive en la librería de símbolos del CAD, no en el archivo.
 *
 * Consecuencia de diseño: esta librería ES la fuente de verdad de la geometría
 * de pines. Por eso el prototipo del spike conectaba al lugar equivocado — no
 * tenía librería, sólo un reparto aproximado sobre el perímetro.
 *
 * Los dibujos se calculan a partir de la caja declarada (w, h) del registro,
 * así el símbolo escala con lo que el archivo dice, sin inventar dimensiones.
 */

export type SymbolGroup =
  | 'motor'
  | 'potencia'
  | 'proteccion'
  | 'mando'
  | 'alimentacion'
  | 'senalizacion'
  | 'sensor'
  | 'linea'
  | 'borne'
  | 'carga'
  | 'otro';

import { circle, contact, left, line, pinsBoth, rect, right, threePole } from './draw.ts';
import { FAMILY_SYMBOLS, LINE_SYMBOLS } from './families.ts';
import { DXF_SYMBOLS } from './dxf.ts';
import { getPack } from './pack.ts';
import { QET_SYMBOLS } from './qet.ts';
import { withQetGeometry } from './qet-adapter.ts';

export interface SymbolPin {
  name: string;
  /** posición normalizada del centro del borne dentro de la caja: 0..1 */
  nx: number;
  ny: number;
  side: 'left' | 'right' | 'top' | 'bottom';
}

export interface Shape {
  d: string;
  fill?: boolean;
  /** trazo fino para detalles (ejes, marcas) */
  thin?: boolean;
  /**
   * Vidrio de una lámpara: se pinta con el color guardado en el archivo cuando
   * el registro lo trae. Sin color queda con la tinta normal del dibujo.
   */
  lamp?: boolean;
  /**
   * Hoja móvil de un contacto: gira sobre su pivote cuando el contacto cierra.
   * `deg` es el giro a aplicar en estado cerrado (el dibujo es el estado abierto).
   */
  blade?: { px: number; py: number; deg: number };
}

export interface Label {
  x: number;
  y: number;
  value: string;
  size: number;
  anchor?: 'start' | 'middle' | 'end';
}

export interface SymbolDef {
  code: number;
  name: string;
  group: SymbolGroup;
  pins: SymbolPin[];
  /** Tamaño con el que se inserta el componente (sólo si no hay plantilla real). */
  size?: { w: number; h: number };
  shapes(w: number, h: number): Shape[];
  labels?(w: number, h: number): Label[];
}

// --- helpers de dibujo -------------------------------------------------------
// (line, rect, circle, left, right, spread, pinsBoth, contact, threePole y
// poles viven en draw.ts: las familias generadas los comparten.)

const genericPins = (names: string[]): SymbolPin[] =>
  names.length === 0 ? pinsBoth(2, ['1', '2']) : pinsBoth(names.length, names);

// --- símbolos ---------------------------------------------------------------

const motor: SymbolDef = {
  code: 1000,
  name: 'Motor trifásico',
  group: 'motor',
  pins: [left(0.28, 'U1'), left(0.5, 'V1'), left(0.72, 'W1'), { name: 'PE', nx: 0.5, ny: 1, side: 'bottom' }],
  shapes(w, h) {
    const r = Math.min(w, h) * 0.42;
    const cx = w / 2;
    const cy = h / 2;
    return [
      { d: circle(cx, cy, r) },
      { d: line(0, h * 0.28, cx - r, h * 0.28) },
      { d: line(0, h * 0.5, cx - r, h * 0.5) },
      { d: line(0, h * 0.72, cx - r, h * 0.72) },
      { d: line(cx, cy + r, cx, h) },
    ];
  },
  labels(w, h) {
    return [{ x: w / 2, y: h / 2, value: 'M', size: Math.min(w, h) * 0.34, anchor: 'middle' }];
  },
};

const motor3f: SymbolDef = {
  ...motor,
  code: 1000,
};

const powerContact: SymbolDef = {
  code: 2001,
  name: 'Contactor III',
  group: 'potencia',
  pins: [
    left(0.18, '1'),
    left(0.5, '3'),
    left(0.82, '5'),
    right(0.18, '2'),
    right(0.5, '4'),
    right(0.82, '6'),
  ],
  shapes(w, h) {
    return threePole(w, h, false);
  },
};

/** Bornes de los aparatos tripolares: 1-3-5 arriba, 2-4-6 abajo. */
const SIX_POLES: SymbolPin[] = [
  left(0.18, '1'),
  left(0.5, '3'),
  left(0.82, '5'),
  right(0.18, '2'),
  right(0.5, '4'),
  right(0.82, '6'),
];

/** Detalle de disparo magnético/térmico que distingue al automático. */
function tripDetail(w: number, h: number): Shape[] {
  const cy = h / 2;
  const mx = w / 2;
  return [
    { d: rect(mx - w * 0.06, cy - h * 0.3, w * 0.12, h * 0.12), thin: true },
    { d: line(mx, cy - h * 0.3, mx, cy - h * 0.4), thin: true },
  ];
}

const fuse: SymbolDef = {
  code: 6009,
  name: 'Disyuntor III',
  group: 'proteccion',
  pins: SIX_POLES,
  shapes(w, h) {
    return threePole(w, h, false);
  },
};

const breaker: SymbolDef = {
  code: 6003,
  name: 'Automático III',
  group: 'proteccion',
  pins: SIX_POLES,
  shapes(w, h) {
    return [...threePole(w, h, false), ...tripDetail(w, h)];
  },
};

const thermalRelay: SymbolDef = {
  code: 6007,
  name: 'Relé térmico',
  group: 'proteccion',
  pins: SIX_POLES,
  shapes(w, h) {
    const cy = h / 2;
    return [
      ...threePole(w, h, false),
      { d: rect(w * 0.36, cy - h * 0.12, w * 0.28, h * 0.24), thin: true },
      { d: line(w * 0.36, cy + h * 0.12, w * 0.64, cy - h * 0.12), thin: true },
    ];
  },
};

const circuitBreaker4: SymbolDef = {
  code: 6001,
  name: 'Automático IN',
  group: 'proteccion',
  pins: [left(0.3, '1'), left(0.7, '3'), right(0.3, '2'), right(0.7, '4')],
  shapes(w, h) {
    return [...threePole(w, h, false), ...tripDetail(w, h)];
  },
};

const breaker4: SymbolDef = {
  ...circuitBreaker4,
  code: 6002,
  name: 'Automático II',
};

const coil: SymbolDef = {
  code: 9000,
  name: 'Bobina monoestable',
  group: 'mando',
  pins: [left(0.5, 'A1'), right(0.5, 'A2')],
  size: { w: 9, h: 15 },
  shapes(w, h) {
    return [{ d: rect(w * 0.2, h * 0.2, w * 0.6, h * 0.6) }];
  },
  labels(w, h) {
    return [{ x: w / 2, y: h / 2, value: 'K', size: Math.min(w, h) * 0.3, anchor: 'middle' }];
  },
};

/** Contacto auxiliar NA (código 7000: bornes 13-14 en los archivos reales). */
const auxContact: SymbolDef = {
  code: 7000,
  name: 'Contacto auxiliar NA',
  group: 'mando',
  pins: [left(0.5, '13'), right(0.5, '14')],
  size: { w: 6, h: 15 },
  shapes(w, h) {
    return contact(w, h / 2, false);
  },
};

/** Contacto auxiliar NC (código 7001: bornes 11-12). */
const auxContactNC: SymbolDef = {
  ...auxContact,
  code: 7001,
  name: 'Contacto auxiliar NC',
  pins: [left(0.5, '11'), right(0.5, '12')],
  shapes(w, h) {
    return contact(w, h / 2, true);
  },
};

const pushNO: SymbolDef = {
  code: 8000,
  name: 'Contacto pulsador NA',
  group: 'mando',
  pins: [left(0.5, '13'), right(0.5, '14')],
  shapes(w, h) {
    const cy = h / 2;
    const mx = w / 2;
    const gap = Math.min(w * 0.18, 4);
    return [
      { d: line(0, cy, mx - gap, cy) },
      { d: line(mx + gap, cy, w, cy) },
      { d: line(mx - gap, cy, mx + gap, cy - gap * 0.9), thin: true },
      { d: line(mx, cy - gap * 0.9, mx, cy - h * 0.28), thin: true },
      { d: line(mx - w * 0.2, cy - h * 0.28, mx + w * 0.2, cy - h * 0.28), thin: true },
    ];
  },
};

const pushNC: SymbolDef = {
  code: 8001,
  name: 'Contacto pulsador NC',
  group: 'mando',
  pins: [left(0.5, '11'), right(0.5, '12')],
  shapes(w, h) {
    const cy = h / 2;
    const mx = w / 2;
    const gap = Math.min(w * 0.18, 4);
    return [
      { d: line(0, cy, mx - gap, cy) },
      { d: line(mx + gap, cy, w, cy) },
      { d: line(mx - gap, cy - gap, mx + gap, cy), thin: true },
      { d: line(mx + gap, cy - gap * 0.8, mx + gap, cy + gap * 0.8), thin: true },
      { d: line(mx, cy - gap, mx, cy - h * 0.28), thin: true },
      { d: line(mx - w * 0.2, cy - h * 0.28, mx + w * 0.2, cy - h * 0.28), thin: true },
    ];
  },
};

const selectorNO: SymbolDef = {
  code: 8012,
  name: 'Contacto final de carrera NA',
  group: 'mando',
  pins: [left(0.5, '13'), right(0.5, '14')],
  shapes(w, h) {
    const cy = h / 2;
    return [...contact(w, cy, false), { d: line(w / 2, cy, w * 0.72, cy - h * 0.3), thin: true }];
  },
};

const selectorNC: SymbolDef = {
  code: 8013,
  name: 'Contacto final de carrera NC',
  group: 'mando',
  pins: [left(0.5, '11'), right(0.5, '12')],
  shapes(w, h) {
    const cy = h / 2;
    return [...contact(w, cy, true), { d: line(w / 2, cy, w * 0.72, cy - h * 0.3), thin: true }];
  },
};

const lamp: SymbolDef = {
  code: 8016,
  name: 'Lámpara de señalización',
  group: 'mando',
  pins: [left(0.5, '97'), right(0.5, '98')],
  shapes(w, h) {
    const r = Math.min(w, h) * 0.32;
    const cx = w / 2;
    const cy = h / 2;
    return [
      { d: line(0, cy, cx - r, cy) },
      { d: line(cx + r, cy, w, cy) },
      { d: circle(cx, cy, r), lamp: true },
      { d: line(cx - r * 0.7, cy - r * 0.7, cx + r * 0.7, cy + r * 0.7), thin: true, lamp: true },
      { d: line(cx + r * 0.7, cy - r * 0.7, cx - r * 0.7, cy + r * 0.7), thin: true, lamp: true },
    ];
  },
};

const thermalContact: SymbolDef = {
  code: 8017,
  name: 'Contacto del térmico',
  group: 'mando',
  pins: [left(0.5, '95'), right(0.5, '96')],
  shapes(w, h) {
    const cy = h / 2;
    return [...contact(w, cy, true), { d: line(w * 0.5, cy - 2, w * 0.5, cy - h * 0.28), thin: true }];
  },
};

const auxNC2: SymbolDef = {
  code: 8018,
  name: 'Contacto auxiliar NC doble',
  group: 'mando',
  pins: [left(0.3, '95'), left(0.7, '97'), right(0.3, '96'), right(0.7, '98')],
  shapes(w, h) {
    return [...contact(w, h * 0.3, true), ...contact(w, h * 0.7, true)];
  },
};

/** Electroválvula: bobina con designador EV (código 9003). */
const electrovalve: SymbolDef = {
  ...coil,
  code: 9003,
  name: 'Electroválvula',
  labels(w, h) {
    return [{ x: w / 2, y: h / 2, value: 'EV', size: Math.min(w, h) * 0.28, anchor: 'middle' }];
  },
};

// --- catálogo extendido ------------------------------------------------------
//
// Cada código de acá sale de `catalog.ts`, que se extrae del binario: nombre y
// designador son los que usa CADe_SIMU, no una suposición. El registro para
// insertarlos lo sintetiza `place.ts` clonando la forma de un componente real
// del mismo tamaño en bornes.

/** Motor con la misma caja que el trifásico pero con sus propios bornes. */
const motorVariant = (code: number, name: string, pins: SymbolPin[]): SymbolDef => ({
  code,
  name,
  group: 'motor',
  pins,
  size: { w: 24, h: 24 },
  shapes(w, h) {
    const r = Math.min(w, h) * 0.42;
    const cx = w / 2;
    const cy = h / 2;
    const out: Shape[] = [{ d: circle(cx, cy, r) }];
    for (const p of pins) {
      if (p.side === 'left') out.push({ d: line(0, p.ny * h, cx - r, p.ny * h) });
      else if (p.side === 'right') out.push({ d: line(cx + r, p.ny * h, w, p.ny * h) });
      else if (p.side === 'bottom') out.push({ d: line(cx, cy + r, cx, h) });
      else out.push({ d: line(p.nx * w, 0, p.nx * w, cy - r) });
    }
    return out;
  },
  labels(w, h) {
    return [{ x: w / 2, y: h / 2, value: 'M', size: Math.min(w, h) * 0.34, anchor: 'middle' }];
  },
});

const motorSingle: SymbolDef = motorVariant(1002, 'Motor monofásico', [left(0.38, 'U1'), left(0.66, 'U2')]);

const motorDahlander: SymbolDef = motorVariant(1003, 'Motor Dahlander', [
  left(0.22, 'U1'),
  left(0.5, 'V1'),
  left(0.78, 'W1'),
  right(0.22, 'U2'),
  right(0.5, 'V2'),
  right(0.78, 'W2'),
]);

const motorWound: SymbolDef = motorVariant(1004, 'Motor rotor bobinado', [
  left(0.22, 'U1'),
  left(0.5, 'V1'),
  left(0.78, 'W1'),
  right(0.22, 'K'),
  right(0.5, 'L'),
  right(0.78, 'M'),
]);

const motorTwoSpeeds: SymbolDef = motorVariant(1005, 'Motor dos velocidades', [
  left(0.22, 'U1'),
  left(0.5, 'V1'),
  left(0.78, 'W1'),
  right(0.22, 'U2'),
  right(0.5, 'V2'),
  right(0.78, 'W2'),
]);

const motorAsSingle: SymbolDef = motorVariant(1010, 'Motor trifásico como monofásico', [
  left(0.38, 'L'),
  left(0.66, 'N'),
]);

/** Alimentación: barra con un borne por conductor y su rótulo. */
const feed = (code: number, name: string, pins: SymbolPin[], label?: string): SymbolDef => ({
  code,
  name,
  group: 'alimentacion',
  pins,
  size: { w: 12, h: Math.max(12, pins.length * 6) },
  shapes(w, h) {
    const bar = w * 0.35;
    return [
      { d: line(bar, 0, bar, h), thin: true },
      ...pins.map((p) => ({ d: line(bar, p.ny * h, w, p.ny * h) })),
    ];
  },
  labels(w, h) {
    if (!label) return [];
    return [{ x: w * 0.62, y: h / 2, value: label, size: Math.min(w, h) * 0.42, anchor: 'middle' }];
  },
});

const feedL: SymbolDef = feed(3000, 'Alimentación L', [], 'L');
const feedN: SymbolDef = feed(3001, 'Alimentación N', [], 'N');
const feedLN: SymbolDef = feed(3003, 'Alimentación L N', [], 'L/N');
const feed3PE: SymbolDef = feed(3005, 'Alimentación L1 L2 L3 PE', [], 'L123');

const feedPE: SymbolDef = feed(3002, 'Alimentación PE', [right(0.5, 'PE')]);

const feed3: SymbolDef = feed(3004, 'Alimentación L1 L2 L3', [
  right(0.2, 'L1'),
  right(0.5, 'L2'),
  right(0.8, 'L3'),
]);

const feed3N: SymbolDef = feed(3006, 'Alimentación L1 L2 L3 N', [
  right(0.15, 'L1'),
  right(0.38, 'L2'),
  right(0.62, 'L3'),
  right(0.85, 'N'),
]);

const feed3NPE: SymbolDef = feed(3007, 'Alimentación L1 L2 L3 N PE', [
  right(0.1, 'L1'),
  right(0.3, 'L2'),
  right(0.5, 'L3'),
  right(0.7, 'N'),
  right(0.9, 'PE'),
]);

const feedPos: SymbolDef = feed(3008, 'Alimentación +', [right(0.5, '+')]);

const feedDC: SymbolDef = feed(3010, 'Alimentación + -', [right(0.3, '+'), right(0.7, '-')]);

/** Aparato de un polo: un solo corte más el detalle de disparo. */
const onePole = (code: number, name: string): SymbolDef => ({
  code,
  name,
  group: 'proteccion',
  pins: [left(0.5, '1'), right(0.5, '2')],
  size: { w: 12, h: 15 },
  shapes(w, h) {
    return [...contact(w, h / 2, false), ...tripDetail(w, h)];
  },
});

const auto1: SymbolDef = onePole(6000, 'Automático I');

const disyuntor1: SymbolDef = onePole(6010, 'Disyuntor I');

const disyuntor2: SymbolDef = {
  code: 6008,
  name: 'Disyuntor II',
  group: 'proteccion',
  pins: [left(0.3, '1'), left(0.7, '3'), right(0.3, '2'), right(0.7, '4')],
  size: { w: 12, h: 15 },
  shapes(w, h) {
    return [...contact(w, h * 0.3, false), ...contact(w, h * 0.7, false)];
  },
};

const auxNANC: SymbolDef = {
  code: 7002,
  name: 'Contacto auxiliar NA-NC',
  group: 'mando',
  pins: [left(0.3, '13'), left(0.7, '11'), right(0.3, '14'), right(0.7, '12')],
  size: { w: 6, h: 15 },
  shapes(w, h) {
    return [...contact(w, h * 0.3, false), ...contact(w, h * 0.7, true)];
  },
};

const relayCoil: SymbolDef = {
  ...coil,
  code: 7016,
  name: 'Rele',
  pins: [left(0.5, 'A1'), right(0.5, 'A2')],
  labels(w, h) {
    return [{ x: w / 2, y: h / 2, value: 'KA', size: Math.min(w, h) * 0.28, anchor: 'middle' }];
  },
};

const timerOn: SymbolDef = {
  ...coil,
  code: 9004,
  name: 'Temporizador a la conexión',
  size: { w: 15, h: 15 },
  shapes(w, h) {
    return [
      { d: rect(w * 0.2, h * 0.2, w * 0.6, h * 0.6) },
      { d: circle(w * 0.72, h * 0.78, Math.min(w, h) * 0.14), thin: true },
      { d: line(w * 0.72, h * 0.78, w * 0.72, h * 0.72), thin: true },
    ];
  },
  labels(w, h) {
    return [{ x: w / 2, y: h / 2, value: 'KT', size: Math.min(w, h) * 0.28, anchor: 'middle' }];
  },
};

const signalLamp: SymbolDef = {
  ...lamp,
  code: 9008,
  name: 'Señalización óptica',
  group: 'senalizacion',
  size: { w: 12, h: 15 },
};

const buzzer: SymbolDef = {
  code: 9011,
  name: 'Zumbador',
  group: 'senalizacion',
  pins: [left(0.5, 'X1'), right(0.5, 'X2')],
  size: { w: 15, h: 15 },
  shapes(w, h) {
    const cy = h / 2;
    const r = Math.min(w, h) * 0.3;
    const cx = w / 2;
    return [
      { d: line(0, cy, cx - r, cy) },
      { d: line(cx + r, cy, w, cy) },
      { d: circle(cx, cy, r) },
      { d: `M${cx - r * 0.5} ${cy + r * 0.4}a${r} ${r} 0 0 1 ${r} 0`, thin: true },
    ];
  },
};

const pushNANC: SymbolDef = {
  code: 8002,
  name: 'Contacto pulsador NA-NC',
  group: 'senalizacion',
  pins: [left(0.3, '13'), left(0.7, '11'), right(0.3, '14'), right(0.7, '12')],
  size: { w: 6, h: 15 },
  shapes(w, h) {
    return [...contact(w, h * 0.3, false), ...contact(w, h * 0.7, true)];
  },
};

/** Pulsador tipo seta: contacto normal más la tapa de hongo. */
const mushroom = (code: number, name: string, nc: boolean): SymbolDef => ({
  code,
  name,
  group: 'senalizacion',
  pins: nc ? [left(0.5, '11'), right(0.5, '12')] : [left(0.5, '13'), right(0.5, '14')],
  size: { w: 9, h: 15 },
  shapes(w, h) {
    const cy = h / 2;
    const mx = w / 2;
    const gap = Math.min(w * 0.18, 3.5);
    const cap = `M${mx - gap} ${cy - h * 0.34}H${mx + gap}V${cy - h * 0.26}H${mx - gap}Z`;
    return [
      ...contact(w, cy, nc),
      { d: line(mx, cy, mx, cy - h * 0.26), thin: true },
      { d: cap, fill: true },
    ];
  },
});

const mushroomNA: SymbolDef = mushroom(8004, 'Contacto pulsador seta NA', false);
const mushroomNC: SymbolDef = mushroom(8005, 'Contacto pulsador seta NC', true);

const switchNO: SymbolDef = {
  code: 8008,
  name: 'Contacto interruptor NA',
  group: 'senalizacion',
  pins: [left(0.5, '13'), right(0.5, '14')],
  size: { w: 9, h: 15 },
  shapes(w, h) {
    const cy = h / 2;
    return [...contact(w, cy, false), { d: line(w * 0.62, cy - h * 0.2, w * 0.72, cy - h * 0.34), thin: true }];
  },
};

const switchNANC: SymbolDef = {
  code: 8010,
  name: 'Contacto interruptor NA-NC',
  group: 'senalizacion',
  pins: [left(0.3, '13'), left(0.7, '11'), right(0.3, '14'), right(0.7, '12')],
  size: { w: 9, h: 15 },
  shapes(w, h) {
    return [
      ...contact(w, h * 0.3, false),
      ...contact(w, h * 0.7, true),
      { d: line(w * 0.62, h * 0.3, w * 0.72, h * 0.12), thin: true },
    ];
  },
};

const ALL: SymbolDef[] = [
  motor3f,
  powerContact,
  feedL,
  feedN,
  feedLN,
  feed3PE,
  feedPE,
  feed3,
  feed3N,
  feed3NPE,
  feedPos,
  feedDC,
  fuse,
  breaker,
  thermalRelay,
  circuitBreaker4,
  breaker4,
  coil,
  auxContact,
  auxContactNC,
  pushNO,
  pushNC,
  selectorNO,
  selectorNC,
  lamp,
  thermalContact,
  auxNC2,
  electrovalve,
  motorSingle,
  motorDahlander,
  motorWound,
  motorTwoSpeeds,
  motorAsSingle,
  auto1,
  disyuntor1,
  disyuntor2,
  auxNANC,
  relayCoil,
  timerOn,
  signalLamp,
  buzzer,
  pushNANC,
  mushroomNA,
  mushroomNC,
  switchNO,
  switchNANC,
  ...FAMILY_SYMBOLS,
];

const BY_CODE = new Map<number, SymbolDef>(ALL.map((s) => [s.code, s]));

// Los símbolos normalizados de EN 60617 pisan el dibujo a mano del mismo código.
for (const [code, qet] of Object.entries(QET_SYMBOLS)) {
  const sym = BY_CODE.get(Number(code));
  if (sym) BY_CODE.set(Number(code), withQetGeometry(sym, qet));
}

export function symbolFor(code: number): SymbolDef | undefined {
  return BY_CODE.get(code);
}

export function symbolList(): SymbolDef[] {
  return [...ALL];
}

/** Cables: se dibujan como una línea y se insertan como tramo, no como componente. */
export function lineList(): SymbolDef[] {
  return [...LINE_SYMBOLS];
}

/**
 * Símbolo genérico para códigos sin definición.
 *
 * No es un hueco: es la contraparte visual de S1. Un código desconocido debe
 * seguir dibujándose (caja rotulada) para que el archivo nunca sea ilegible,
 * del mismo modo que el modelo lo preserva como registro opaco.
 */
export function fallbackSymbol(code: number, pinNames: string[]): SymbolDef {
  return {
    code,
    name: `Genérico ${code}`,
    group: 'otro',
    pins: genericPins(pinNames),
    shapes(w, h) {
      return [{ d: rect(0.5, 0.5, w - 1, h - 1) }];
    },
    labels(w, h) {
      return [{ x: w / 2, y: h / 2, value: String(code), size: Math.min(w, h) * 0.4, anchor: 'middle' }];
    },
  };
}

/** Resuelve el símbolo de un componente, con fallback si el código es nuevo. */
export function resolveSymbol(code: number, pinNames: string[]): SymbolDef {
  // Los cables viven en LINE_SYMBOLS (no en BY_CODE) porque se insertan como
  // tramo y no como componente; igual tienen dibujo propio y no deben caer al
  // genérico cuando algo pide su símbolo (miniaturas, documentación).
  const base = BY_CODE.get(code) ?? LINE_SYMBOLS.find((sym) => sym.code === code) ?? fallbackSymbol(code, pinNames);

  // Paquete `dxf`: reemplaza sólo el trazo. Nombre, grupo, bornes y tamaño se
  // conservan, así el registro que se escribe sigue siendo el mismo.
  const dxf = DXF_SYMBOLS[code];
  if (getPack() === 'dxf' && dxf) {
    return { ...base, shapes: (w, h) => dxf.shapes.map((s) => ({ d: scalePath(s.d, w, h, dxf.aspect), fill: s.fill })) };
  }
  return base;
}

/** Escala un path normalizado (0..1) a la caja del registro, sin deformarlo. */
function scalePath(d: string, w: number, h: number, aspect: number): string {
  // El recorte mide `aspect` de ancho por 1 de alto: se ajusta por el lado que
  // entra y se centra, así el símbolo conserva sus proporciones dentro de la
  // caja del registro (que casi nunca tiene la misma relación).
  const k = Math.min(w / aspect, h);
  const offX = (w - aspect * k) / 2;
  const offY = (h - k) / 2;
  return d.replace(/([ML])([\d.]+) ([\d.]+)/g, (_, cmd: string, x: string, y: string) => {
    const px = Math.round((Number(x) * aspect * k + offX) * 100) / 100;
    const py = Math.round((Number(y) * k + offY) * 100) / 100;
    return `${cmd}${px} ${py}`;
  });
}
