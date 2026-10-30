/**
 * Librería de símbolos IEC 60617 de simuElectro.
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
  | 'borne'
  | 'carga'
  | 'otro';

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
  shapes(w: number, h: number): Shape[];
  labels?(w: number, h: number): Label[];
}

// --- helpers de dibujo -------------------------------------------------------

const line = (x1: number, y1: number, x2: number, y2: number): string =>
  `M${round(x1)} ${round(y1)}L${round(x2)} ${round(y2)}`;

const rect = (x: number, y: number, w: number, h: number): string =>
  `M${round(x)} ${round(y)}H${round(x + w)}V${round(y + h)}H${round(x)}Z`;

const circle = (cx: number, cy: number, r: number): string =>
  `M${round(cx - r)} ${round(cy)}a${round(r)} ${round(r)} 0 1 0 ${round(r * 2)} 0a${round(r)} ${round(r)} 0 1 0 ${round(-r * 2)} 0Z`;

const round = (n: number): number => Math.round(n * 100) / 100;

const left = (ny: number, name: string): SymbolPin => ({ name, nx: 0, ny, side: 'left' });
const right = (ny: number, name: string): SymbolPin => ({ name, nx: 1, ny, side: 'right' });

/** Reparto vertical: n pines equiespaciados entre 0.2 y 0.8. */
function spread(n: number): number[] {
  if (n === 0) return [];
  if (n === 1) return [0.5];
  const lo = 0.18;
  const hi = 0.82;
  return Array.from({ length: n }, (_, i) => lo + ((hi - lo) * i) / (n - 1));
}

function pinsBoth(n: number, names: string[]): SymbolPin[] {
  const half = Math.ceil(n / 2);
  const ys = spread(half);
  const out: SymbolPin[] = [];
  for (let i = 0; i < n; i++) {
    const isLeft = i < half;
    const idx = isLeft ? i : i - half;
    out.push(isLeft ? left(ys[idx]!, names[i] ?? String(i)) : right(ys[idx]!, names[i] ?? String(i)));
  }
  return out;
}

/** Contacto NA / NC genérico sobre una fila `y`. */
function contact(w: number, y: number, nc: boolean): Shape[] {
  const mx = w / 2;
  const gap = Math.min(w * 0.16, 4.5);
  const shapes: Shape[] = [
    { d: line(0, y, mx - gap, y) },
    { d: line(mx + gap, y, w, y) },
  ];
  if (nc) {
    shapes.push({ d: line(mx - gap, y - gap, mx + gap, y), thin: true });
    shapes.push({ d: line(mx + gap, y - gap * 0.8, mx + gap, y + gap * 0.8), thin: true });
  } else {
    shapes.push({ d: line(mx - gap, y, mx + gap, y - gap * 0.9), thin: true });
  }
  return shapes;
}

/** Tres contactos de potencia apilados (contactor / interruptor). */
function threePole(w: number, h: number, nc = false): Shape[] {
  const ys = spread(3).map((n) => n * h);
  return ys.flatMap((y) => contact(w, y, nc));
}

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
  name: 'Contacto de potencia 3P',
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

const terminal: SymbolDef = {
  code: 3000,
  name: 'Borne',
  group: 'borne',
  pins: [left(0.5, '1'), right(0.5, '2')],
  shapes(w, h) {
    const r = Math.min(w * 0.22, h * 0.22, 3);
    const cy = h / 2;
    return [
      { d: line(0, cy, w / 2 - r, cy) },
      { d: line(w / 2 + r, cy, w, cy) },
      { d: circle(w / 2, cy, r), fill: true },
    ];
  },
};

const viaBorne: SymbolDef = {
  ...terminal,
  code: 3001,
  name: 'Borne de paso',
};

const terminalBlock: SymbolDef = {
  ...terminal,
  code: 3005,
  name: 'Bornera',
};

const terminal3: SymbolDef = {
  ...terminal,
  code: 3003,
  name: 'Borne doble',
};

const fuse: SymbolDef = {
  code: 6009,
  name: 'Fusible',
  group: 'proteccion',
  pins: [left(0.5, '1'), right(0.5, '2')],
  shapes(w, h) {
    const cy = h / 2;
    const pad = w * 0.24;
    return [
      { d: line(0, cy, pad, cy) },
      { d: rect(pad, cy - h * 0.13, w - pad * 2, h * 0.26) },
      { d: line(pad, cy, w - pad, cy), thin: true },
      { d: line(w - pad, cy, w, cy) },
    ];
  },
};

const breaker: SymbolDef = {
  code: 6003,
  name: 'Interruptor termomagnético',
  group: 'proteccion',
  pins: [left(0.5, '1'), right(0.5, '2')],
  shapes(w, h) {
    const cy = h / 2;
    const mx = w / 2;
    const gap = Math.min(w * 0.16, 4.5);
    return [
      { d: line(0, cy, mx - gap, cy) },
      { d: line(mx + gap, cy, w, cy) },
      { d: line(mx - gap, cy, mx + gap, cy - gap * 0.9), thin: true },
      { d: rect(mx - gap * 0.5, cy - h * 0.3, gap, h * 0.16), thin: true },
      { d: line(mx, cy - h * 0.3, mx, cy - h * 0.4), thin: true },
    ];
  },
};

const thermalRelay: SymbolDef = {
  code: 6007,
  name: 'Relé térmico',
  group: 'proteccion',
  pins: [left(0.5, '1'), right(0.5, '2')],
  shapes(w, h) {
    const cy = h / 2;
    return [
      ...contact(w, cy, false),
      { d: rect(w * 0.34, cy - h * 0.16, w * 0.32, h * 0.32), thin: true },
      { d: line(w * 0.34, cy + h * 0.16, w * 0.66, cy - h * 0.16), thin: true },
    ];
  },
};

const circuitBreaker4: SymbolDef = {
  code: 6001,
  name: 'Seccionador 4P',
  group: 'proteccion',
  pins: [left(0.3, '1'), left(0.7, '3'), right(0.3, '2'), right(0.7, '4')],
  shapes(w, h) {
    return [...contact(w, h * 0.3, false), ...contact(w, h * 0.7, false)];
  },
};

const breaker4: SymbolDef = {
  ...circuitBreaker4,
  code: 6002,
  name: 'Interruptor 4P',
};

const coil: SymbolDef = {
  code: 7000,
  name: 'Bobina de contactor',
  group: 'mando',
  pins: [left(0.5, 'A1'), right(0.5, 'A2')],
  shapes(w, h) {
    return [{ d: rect(w * 0.2, h * 0.2, w * 0.6, h * 0.6) }];
  },
  labels(w, h) {
    return [{ x: w / 2, y: h / 2, value: 'KM', size: Math.min(w, h) * 0.3, anchor: 'middle' }];
  },
};

const auxContact: SymbolDef = {
  code: 7001,
  name: 'Contacto auxiliar',
  group: 'mando',
  pins: [left(0.5, '1'), right(0.5, '2')],
  shapes(w, h) {
    return contact(w, h / 2, false);
  },
};

const pushNO: SymbolDef = {
  code: 8000,
  name: 'Pulsador NA',
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
  name: 'Pulsador NC',
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
  name: 'Selector NA',
  group: 'mando',
  pins: [left(0.5, '13'), right(0.5, '14')],
  shapes(w, h) {
    const cy = h / 2;
    return [...contact(w, cy, false), { d: line(w / 2, cy, w * 0.72, cy - h * 0.3), thin: true }];
  },
};

const selectorNC: SymbolDef = {
  code: 8013,
  name: 'Selector NC',
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
  pins: [left(0.5, 'X1'), right(0.5, 'X2')],
  shapes(w, h) {
    const r = Math.min(w, h) * 0.32;
    const cx = w / 2;
    const cy = h / 2;
    return [
      { d: line(0, cy, cx - r, cy) },
      { d: line(cx + r, cy, w, cy) },
      { d: circle(cx, cy, r) },
      { d: line(cx - r * 0.7, cy - r * 0.7, cx + r * 0.7, cy + r * 0.7), thin: true },
      { d: line(cx + r * 0.7, cy - r * 0.7, cx - r * 0.7, cy + r * 0.7), thin: true },
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

const motorTerminal: SymbolDef = {
  code: 9000,
  name: 'Borne de motor',
  group: 'carga',
  pins: [left(0.5, '1'), right(0.5, '2')],
  shapes(w, h) {
    const cy = h / 2;
    return [
      { d: line(0, cy, w * 0.35, cy) },
      { d: line(w * 0.65, cy, w, cy) },
      { d: rect(w * 0.35, cy - h * 0.18, w * 0.3, h * 0.36), fill: true },
    ];
  },
};

const motorTerminal3: SymbolDef = {
  ...motorTerminal,
  code: 9003,
  name: 'Borne de motor 3F',
};

const ALL: SymbolDef[] = [
  motor3f,
  powerContact,
  terminal,
  viaBorne,
  terminal3,
  terminalBlock,
  fuse,
  breaker,
  thermalRelay,
  circuitBreaker4,
  breaker4,
  coil,
  auxContact,
  pushNO,
  pushNC,
  selectorNO,
  selectorNC,
  lamp,
  thermalContact,
  auxNC2,
  motorTerminal,
  motorTerminal3,
];

const BY_CODE = new Map<number, SymbolDef>(ALL.map((s) => [s.code, s]));

export function symbolFor(code: number): SymbolDef | undefined {
  return BY_CODE.get(code);
}

export function symbolList(): SymbolDef[] {
  return [...ALL];
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
  return BY_CODE.get(code) ?? fallbackSymbol(code, pinNames);
}
