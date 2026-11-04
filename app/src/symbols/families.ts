/**
 * Familias de componentes generadas a partir del catálogo real.
 *
 * El catálogo (`catalog.ts`) dice qué códigos existen y cómo se llaman. Acá se
 * dibujan, agrupados por familia, con una convención de bornes IEC:
 *
 *   - aparatos de potencia: 1-3-5 arriba, 2-4-6 abajo
 *   - contactos auxiliares: 11-12 (NC), 13-14 (NA), 11-12-14 (conmutado)
 *   - bobinas y temporizadores: A1-A2
 *   - sensores de 2 hilos: 1-2 · de 3 hilos: +, O, -
 *
 * Los bornes son una convención, no un dato extraído: el formato los guarda en
 * cada registro, y para un componente nuevo hay que elegirlos. Están acá
 * juntos justamente para poder revisarlos y cambiarlos en un solo lugar.
 */
import { CATALOG } from './catalog.ts';
import type { Shape, SymbolDef, SymbolGroup, SymbolPin } from './library.ts';
import { circle, clock, contact, left, line, poles, rect, right, spread, threePole } from './draw.ts';

const nameOf = (code: number): string => CATALOG[code]?.name ?? `Componente ${code}`;

type Kind = 'NA' | 'NC' | 'NANC' | 'CO';

const PINS: Record<Kind, SymbolPin[]> = {
  NA: [left(0.5, '13'), right(0.5, '14')],
  NC: [left(0.5, '11'), right(0.5, '12')],
  NANC: [left(0.3, '13'), left(0.7, '11'), right(0.3, '14'), right(0.7, '12')],
  CO: [left(0.3, '11'), left(0.7, '12'), right(0.5, '14')],
};

function contactShapes(kind: Kind, w: number, h: number): Shape[] {
  if (kind === 'NA') return contact(w, h / 2, false);
  if (kind === 'NC') return contact(w, h / 2, true);
  if (kind === 'NANC') return [...contact(w, h * 0.3, false), ...contact(w, h * 0.7, true)];
  // Conmutado: dos contactos que comparten el común (11).
  return [
    ...contact(w, h * 0.3, true),
    ...contact(w, h * 0.7, false),
    { d: line(w * 0.5, h * 0.3, w * 0.5, h * 0.7), thin: true },
  ];
}

const def = (
  code: number,
  group: SymbolGroup,
  pins: SymbolPin[],
  shapes: (w: number, h: number) => Shape[],
  size: { w: number; h: number },
  labels?: (w: number, h: number) => { x: number; y: number; value: string; size: number; anchor?: 'start' | 'middle' | 'end' }[],
): SymbolDef => ({ code, name: nameOf(code), group, pins, size, shapes, labels });

// --- motores ---------------------------------------------------------------

/** Cuerpo de motor: círculo con la letra y una entrada por borne. */
const motorBody = (pins: SymbolPin[]) => (w: number, h: number): Shape[] => {
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
};

const motorLabel = (letter: string) => (w: number, h: number) => [
  { x: w / 2, y: h / 2, value: letter, size: Math.min(w, h) * 0.34, anchor: 'middle' as const },
];

const motorTriYD: SymbolPin[] = [
  left(0.22, 'U1'),
  left(0.5, 'V1'),
  left(0.78, 'W1'),
  right(0.22, 'U2'),
  right(0.5, 'V2'),
  right(0.78, 'W2'),
];

const motorDC: SymbolPin[] = [left(0.38, 'A1'), right(0.38, 'A2'), left(0.7, 'E1'), right(0.7, 'E2')];

// --- potencia --------------------------------------------------------------

const resistor = (code: number, count: number): SymbolDef => {
  const pins = count === 1 ? poles(1) : poles(count);
  return def(code, 'potencia', pins, (w, h) => {
    const rows = spread(count).map((n) => n * h);
    return rows.flatMap((y) => [
      { d: line(0, y, w * 0.3, y) },
      { d: rect(w * 0.3, y - h * 0.06, w * 0.4, h * 0.12) },
      { d: line(w * 0.7, y, w, y) },
    ]);
  }, { w: 18, h: count === 1 ? 12 : 24 });
};

/** Aparato de potencia con `n` polos y una etiqueta opcional. */
const polesDevice = (code: number, n: number, group: SymbolGroup, letter?: string): SymbolDef =>
  def(code, group, poles(n), (w, h) => {
    const rows = spread(n).map((v) => v * h);
    return rows.flatMap((y) => contact(w, y, false));
  }, { w: 18, h: n === 1 ? 12 : 24 }, letter ? motorLabel(letter) : undefined);

/** Variador / arrancador: caja con la designación del equipo. */
const drive = (code: number, pins: SymbolPin[], letter: string, size = { w: 24, h: 24 }): SymbolDef =>
  def(code, 'potencia', pins, (w, h) => [{ d: rect(0, 0, w, h) }], size, motorLabel(letter));

// --- aparatos de maniobra --------------------------------------------------

const contactDevice = (code: number, kind: Kind, group: SymbolGroup, timed = false, size = { w: 6, h: 15 }): SymbolDef =>
  def(code, group, PINS[kind], (w, h) => {
    const shapes = contactShapes(kind, w, h);
    return timed ? [...shapes, ...clock(w, h)] : shapes;
  }, size);

// --- bobinas y señalización ------------------------------------------------

const coilDevice = (code: number, letter: string, timed: 'on' | 'off' | 'both' | 'flash' | null = null): SymbolDef =>
  def(code, 'mando', [left(0.5, 'A1'), right(0.5, 'A2')], (w, h) => {
    const base: Shape[] = [{ d: rect(w * 0.2, h * 0.2, w * 0.6, h * 0.6) }];
    if (timed !== null) base.push(...clock(w, h));
    return base;
  }, { w: 15, h: 15 }, motorLabel(letter));

const lampDevice = (code: number, group: SymbolGroup, pulsed = false): SymbolDef =>
  def(code, group, [left(0.5, 'X1'), right(0.5, 'X2')], (w, h) => {
    const r = Math.min(w, h) * 0.3;
    const cx = w / 2;
    const cy = h / 2;
    const out: Shape[] = [
      { d: line(0, cy, cx - r, cy) },
      { d: circle(cx, cy, r), lamp: true },
      { d: line(cx + r, cy, w, cy) },
    ];
    if (pulsed) out.push({ d: line(cx - r * 0.6, cy - r * 0.6, cx + r * 0.6, cy + r * 0.6), thin: true, lamp: true });
    return out;
  }, { w: 12, h: 15 });

/**
 * Señalización óptica: círculo con aspa, tal como la dibuja CADe_SIMU.
 *
 * No se toma de EN 60617: el elemento importado es sólo el aspa (sin cuerpo) y
 * acá el símbolo tiene que leerse como la lámpara del CAD.
 */
const signalLamp = (code: number, group: SymbolGroup): SymbolDef =>
  def(code, group, [left(0.5, '97'), right(0.5, '98')], (w, h) => {
    const r = Math.min(w, h) * 0.32;
    const cx = w / 2;
    const cy = h / 2;
    const d = r * Math.SQRT1_2;
    return [
      { d: line(0, cy, cx - r, cy) },
      { d: line(cx + r, cy, w, cy) },
      { d: circle(cx, cy, r), lamp: true },
      { d: line(cx - d, cy - d, cx + d, cy + d), lamp: true },
      { d: line(cx - d, cy + d, cx + d, cy - d), lamp: true },
    ];
  }, { w: 15, h: 15 });

/** Aparato acústico: círculo con la boca. */
const soundDevice = (code: number): SymbolDef =>
  def(code, 'senalizacion', [left(0.5, 'X1'), right(0.5, 'X2')], (w, h) => {
    const r = Math.min(w, h) * 0.3;
    const cx = w / 2;
    const cy = h / 2;
    return [
      { d: line(0, cy, cx - r, cy) },
      { d: line(cx + r, cy, w, cy) },
      { d: circle(cx, cy, r) },
      { d: `M${cx - r * 0.4} ${cy + r * 0.35}a${r * 0.9} ${r * 0.9} 0 0 1 ${r * 0.8} 0`, thin: true },
    ];
  }, { w: 15, h: 15 });

// --- sensores --------------------------------------------------------------

/**
 * Sensor de proximidad / presión / temperatura.
 *
 * El nombre del catálogo alcanza para derivar las tres variables que importan:
 * contacto NA o NC, dos o tres hilos, y el tipo (que define el glifo del frente).
 */
function sensorDef(code: number, label: string): SymbolDef {
  const name = nameOf(code);
  const nc = /\bNC\b/.test(name);
  const three = /3 hilos/.test(name);
  const pins: SymbolPin[] = three
    ? [left(0.3, '+'), right(0.5, 'O'), left(0.7, '-')]
    : [left(0.4, '1'), right(0.6, '2')];

  return def(code, 'sensor', pins, (w, h) => {
    const front = w * 0.18;
    const out: Shape[] = [
      { d: rect(front, h * 0.12, w - front, h * 0.76) },
      { d: line(0, h * 0.4, front, h * 0.4) },
      { d: line(0, h * 0.7, front, h * 0.7) },
      { d: line(w - front * 0.6, h * 0.12, w - front * 0.6, h * 0.88), thin: true },
    ];
    if (label === 'inductivo') out.push({ d: line(front * 0.4, h * 0.3, front * 0.4, h * 0.8), thin: true });
    if (label === 'capacitivo') out.push({ d: line(front * 0.3, h * 0.32, front * 0.9, h * 0.3), thin: true });
    return out;
  }, { w: 24, h: 15 }, (w, h) => [
    { x: w * 0.55, y: h * 0.5, value: nc ? 'NC' : 'NA', size: Math.min(w, h) * 0.26, anchor: 'middle' },
  ]);
}

const sensorKind = (name: string): string => {
  if (name.startsWith('Det. inductivo')) return 'inductivo';
  if (name.startsWith('Det. capacitivo')) return 'capacitivo';
  if (name.startsWith('Det. magnético')) return 'magnético';
  if (name.startsWith('Barrera')) return 'óptico';
  if (name.startsWith('Presostato') || name.startsWith('Vacuostato')) return 'presión';
  return 'temperatura';
};

const SENSOR_CODES = Object.keys(CATALOG)
  .map(Number)
  .filter((code) => /^(Det\.|Barrera|Presostato|Vacuostato|Termostato)/.test(CATALOG[code]!.name))
  .sort((a, b) => a - b);

// --- catálogo generado -----------------------------------------------------

export const FAMILY_SYMBOLS: SymbolDef[] = [
  // motores
  def(1001, 'motor', motorTriYD, motorBody(motorTriYD), { w: 24, h: 24 }, motorLabel('M')),
  def(1006, 'motor', [left(0.4, 'A1'), right(0.4, 'A2')], motorBody([left(0.4, 'A1'), right(0.4, 'A2')]), { w: 24, h: 24 }, motorLabel('M=')),
  def(1007, 'motor', motorDC, motorBody(motorDC), { w: 24, h: 24 }, motorLabel('M')),

  // potencia
  resistor(1050, 1),
  resistor(1051, 3),
  def(1052, 'potencia', motorTriYD, (w, h) => [
    { d: circle(w / 2, h * 0.35, Math.min(w, h) * 0.16), thin: true },
    { d: circle(w / 2, h * 0.65, Math.min(w, h) * 0.16), thin: true },
  ], { w: 24, h: 24 }, motorLabel('T')),
  drive(1053, poles(3), 'G'),
  drive(1054, poles(2), 'G', { w: 18, h: 15 }),
  drive(1055, poles(3), 'G'),
  drive(1057, [left(0.3, 'L+'), right(0.3, 'L-'), left(0.7, 'M+'), right(0.7, 'M-')], 'G', { w: 18, h: 15 }),
  drive(1058, [left(0.3, 'L+'), right(0.3, 'L-'), left(0.7, 'M+'), right(0.7, 'M-')], 'G', { w: 18, h: 15 }),
  def(1076, 'potencia', [left(0.3, 'A1'), right(0.3, 'A2'), left(0.7, '11'), right(0.7, '14')], (w, h) => [
    { d: rect(0, 0, w, h) },
    ...contact(w, h * 0.72, false),
  ], { w: 18, h: 15 }, motorLabel('K')),

  // contactores e interruptores
  polesDevice(2000, 2, 'potencia'),
  polesDevice(2003, 2, 'potencia'),
  polesDevice(2004, 3, 'potencia'),
  polesDevice(2006, 1, 'potencia'),
  polesDevice(2007, 1, 'potencia'),

  // alimentación y fuentes
  def(3009, 'alimentacion', [], (w, h) => [{ d: line(w * 0.35, 0, w * 0.35, h), thin: true }], { w: 12, h: 12 },
    (w, h) => [{ x: w * 0.62, y: h / 2, value: '-', size: Math.min(w, h) * 0.42, anchor: 'middle' }]),
  def(3011, 'alimentacion', [], (w, h) => [{ d: line(w * 0.35, 0, w * 0.35, h), thin: true }], { w: 12, h: 12 },
    (w, h) => [{ x: w * 0.62, y: h / 2, value: 'LNP', size: Math.min(w, h) * 0.3, anchor: 'middle' }]),
  def(3012, 'alimentacion', motorTriYD, (w, h) => [
    { d: circle(w / 2, h * 0.35, Math.min(w, h) * 0.15), thin: true },
    { d: circle(w / 2, h * 0.65, Math.min(w, h) * 0.15), thin: true },
  ], { w: 24, h: 24 }, motorLabel('T')),
  def(3013, 'alimentacion', [left(0.35, '~'), left(0.7, '~'), right(0.35, '+'), right(0.7, '-')], (w, h) => [
    { d: rect(w * 0.3, h * 0.2, w * 0.4, h * 0.6) },
    { d: line(w * 0.45, h * 0.45, w * 0.55, h * 0.55), thin: true },
  ], { w: 18, h: 15 }, motorLabel('V')),
  def(3014, 'alimentacion', [left(0.3, 'L'), left(0.7, 'N'), right(0.3, '+'), right(0.7, '-')], (w, h) => [
    { d: rect(0, 0, w, h) },
    { d: line(w * 0.2, h * 0.5, w * 0.8, h * 0.5), thin: true },
  ], { w: 18, h: 15 }, motorLabel('V')),

  // protección
  def(5000, 'proteccion', poles(1), (w, h) => fuseBody(w, h), { w: 12, h: 15 }),
  def(5001, 'proteccion', poles(2), (w, h) => fuseBody(w, h), { w: 12, h: 15 }),
  def(5002, 'proteccion', poles(2), (w, h) => fuseBody(w, h), { w: 12, h: 15 }),
  def(5003, 'proteccion', poles(3), (w, h) => fuseBody(w, h), { w: 18, h: 15 }),
  def(5005, 'proteccion', poles(1), (w, h) => [...contact(w, h / 2, false)], { w: 12, h: 15 }),
  def(5006, 'proteccion', poles(2), (w, h) => spread(2).flatMap((n) => contact(w, n * h, false)), { w: 12, h: 15 }),
  def(5007, 'proteccion', poles(2), (w, h) => spread(2).flatMap((n) => contact(w, n * h, false)), { w: 12, h: 15 }),
  def(5008, 'proteccion', poles(3), (w, h) => threePole(w, h, false), { w: 18, h: 15 }),
  def(6005, 'proteccion', poles(2), (w, h) => [...spread(2).flatMap((n) => contact(w, n * h, false)), ...testButton(w, h)], { w: 12, h: 15 }),
  def(6015, 'proteccion', poles(3), (w, h) => threePole(w, h, false), { w: 18, h: 15 }),
  def(6016, 'proteccion', poles(3), (w, h) => [...threePole(w, h, false), ...thermalMark(w, h)], { w: 18, h: 15 }),
  def(6017, 'proteccion', poles(1), (w, h) => [...contact(w, h / 2, false), ...thermalMark(w, h)], { w: 12, h: 15 }),
  def(6018, 'proteccion', poles(2), (w, h) => [...spread(2).flatMap((n) => contact(w, n * h, false)), ...testButton(w, h)], { w: 12, h: 15 }),
  def(6019, 'proteccion', poles(1), (w, h) => contact(w, h / 2, false), { w: 12, h: 15 }),
  def(6020, 'proteccion', poles(1), (w, h) => contact(w, h / 2, false), { w: 12, h: 15 }),

  // mando: contactos y temporizadores
  contactDevice(7003, 'CO', 'mando'),
  contactDevice(7004, 'NA', 'mando', true),
  contactDevice(7005, 'NC', 'mando', true),
  contactDevice(7006, 'NANC', 'mando', true, { w: 6, h: 18 }),
  contactDevice(7007, 'CO', 'mando', true),
  contactDevice(7008, 'NA', 'mando', true),
  contactDevice(7009, 'NC', 'mando', true),
  contactDevice(7010, 'NANC', 'mando', true, { w: 6, h: 18 }),
  contactDevice(7011, 'CO', 'mando', true),
  contactDevice(7012, 'NA', 'mando', true),
  contactDevice(7013, 'NC', 'mando', true),
  contactDevice(7014, 'NANC', 'mando', true, { w: 6, h: 18 }),
  contactDevice(7015, 'CO', 'mando', true),
  def(7018, 'mando', [left(0.5, 'A1'), right(0.5, 'A2')], (w, h) => [{ d: rect(w * 0.2, h * 0.2, w * 0.6, h * 0.6) }], { w: 9, h: 15 }, motorLabel('KM')),
  def(7019, 'mando', PINS.NANC, (w, h) => contactShapes('NANC', w, h), { w: 6, h: 15 }),
  contactDevice(7020, 'NA', 'mando', true),
  contactDevice(7021, 'NA', 'mando', true),

  // señalización y pulsadores
  contactDevice(8003, 'CO', 'senalizacion'),
  contactDevice(8006, 'NANC', 'senalizacion', false, { w: 6, h: 18 }),
  contactDevice(8007, 'CO', 'senalizacion'),
  contactDevice(8009, 'NC', 'senalizacion'),
  contactDevice(8011, 'CO', 'senalizacion'),
  contactDevice(8014, 'NANC', 'senalizacion', false, { w: 6, h: 18 }),
  contactDevice(8015, 'CO', 'senalizacion'),
  contactDevice(8100, 'NA', 'senalizacion'),
  contactDevice(10050, 'NA', 'mando'),
  contactDevice(10051, 'NC', 'mando'),

  // lámparas y avisos
  signalLamp(9008, 'senalizacion'),
  lampDevice(8101, 'senalizacion'),
  lampDevice(8103, 'senalizacion'),
  lampDevice(9009, 'senalizacion', true),
  soundDevice(9010),
  soundDevice(9012),
  soundDevice(9013),

  // bobinas y temporizadores
  coilDevice(9001, 'K'),
  def(9002, 'mando', [left(0.3, 'A1'), right(0.3, 'A2'), left(0.7, '1'), right(0.7, '2')], (w, h) => [
    { d: rect(w * 0.1, h * 0.1, w * 0.8, h * 0.8) },
    ...contact(w, h * 0.72, false),
  ], { w: 15, h: 15 }, motorLabel('K')),
  coilDevice(9005, 'KT', 'off'),
  coilDevice(9006, 'KT', 'both'),
  coilDevice(9007, 'KT', 'flash'),

  // sensores
  ...SENSOR_CODES.map((code) => sensorDef(code, sensorKind(CATALOG[code]!.name))),

  // regletas y conectores: son componentes con bornes, no cables
  strip(4011, 2),
  strip(4012, 2),
  strip(4013, 2),
  strip(4014, 2),
  strip(4015, 2),
  strip(4016, 3),
  // 4017 (4 vías = 8 bornes) no entra: el registro guarda 7 bornes como máximo.
];

/** Regleta / conector: caja con un contacto por vía. */
function strip(code: number, ways: number): SymbolDef {
  return def(code, 'borne', poles(ways), (w, h) => {
    const ys = spread(ways).map((v) => v * h);
    return [
      { d: rect(0, h * 0.12, w, h * 0.76) },
      ...ys.flatMap((y) => [
        { d: line(0, y, w * 0.32, y) },
        { d: circle(w * 0.5, y, Math.min(w, h) * 0.07), fill: true },
        { d: line(w * 0.68, y, w, y) },
      ]),
    ];
  }, { w: 12, h: Math.max(12, ways * 6) });
}

/** Cables: no son componentes, se insertan como tramo (ver addWire). */
export const LINE_SYMBOLS: SymbolDef[] = [4000, 4009, 4010, 4019].map((code) => ({
  code,
  name: CATALOG[code]?.name ?? `Cable ${code}`,
  group: 'linea' as SymbolGroup,
  pins: [],
  size: { w: 12, h: 3 },
  shapes(w: number, h: number) {
    return [{ d: `M0 ${h / 2}H${w}` }];
  },
}));

function fuseBody(w: number, h: number): Shape[] {
  const cy = h / 2;
  const pad = w * 0.24;
  return [
    { d: line(0, cy, pad, cy) },
    { d: rect(pad, cy - h * 0.13, w - pad * 2, h * 0.26) },
    { d: line(pad, cy, w - pad, cy), thin: true },
    { d: line(w - pad, cy, w, cy) },
  ];
}

function testButton(w: number, h: number): Shape[] {
  const r = Math.min(w, h) * 0.1;
  return [{ d: circle(w * 0.82, h * 0.16, r), thin: true }];
}

function thermalMark(w: number, h: number): Shape[] {
  const cy = h / 2;
  return [
    { d: rect(w * 0.36, cy - h * 0.1, w * 0.28, h * 0.2), thin: true },
    { d: line(w * 0.36, cy + h * 0.1, w * 0.64, cy - h * 0.1), thin: true },
  ];
}
