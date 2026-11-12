/**
 * Primitivas de dibujo compartidas por la librería de símbolos y las familias
 * generadas. Viven aparte para que `library.ts` y `families.ts` no se importen
 * entre sí: acá sólo hay funciones puras de geometría.
 */
import type { Shape, SymbolPin } from './library.ts';

export const round = (n: number): number => Math.round(n * 100) / 100;

export const line = (x1: number, y1: number, x2: number, y2: number): string =>
  `M${round(x1)} ${round(y1)}L${round(x2)} ${round(y2)}`;

export const rect = (x: number, y: number, w: number, h: number): string =>
  `M${round(x)} ${round(y)}H${round(x + w)}V${round(y + h)}H${round(x)}Z`;

export const circle = (cx: number, cy: number, r: number): string =>
  `M${round(cx - r)} ${round(cy)}a${round(r)} ${round(r)} 0 1 0 ${round(r * 2)} 0a${round(r)} ${round(r)} 0 1 0 ${round(-r * 2)} 0Z`;

/**
 * Polo del interruptor automático, con la geometría medida en CADeSimu.
 *
 * Unidades absolutas del archivo, relativas al borne de arriba del polo (que
 * es el origen del registro). Medido en dos capturas independientes que dan las
 * mismas medidas: `data/samples/tests01/test01.png` (el automático de dos polos
 * de la hoja, 6 px por unidad) y
 * `components_png/interruptor automatico de proteccion contra cortocircuitos y
 * sobrecargas.png` (el tripolar, 8,67 px por unidad).
 *
 * - la conductora superior baja del borne hasta +2,9;
 * - la cuchilla va de (−3, +3) a (0, +9): tres unidades a la izquierda;
 * - un guion horizontal de 1,8 unidades cruza el polo a +6;
 * - la conductora inferior sigue de +9 hasta el borne de abajo (+12).
 *
 * El guion va hacia el centro del aparato: en el automático de dos polos de la
 * captura el del primer polo cruza el conductor (de −1,5 a +0,3) y el del
 * segundo queda a su izquierda (de −3,3 a −1,5), porque la cuchilla de cada
 * polo se abre siempre hacia la izquierda. Por eso `dashLeft`.
 *
 * El detalle de disparo (cuadrado negro inclinado) va SÓLO en el primer polo:
 * en la captura de la hoja el segundo polo no lo lleva, aunque el automático
 * tripolar de `components_png` lo lleva en los tres.
 *
 * La media diagonal del cuadro se midió por área en dos referencias
 * independientes: la captura de la hoja (127 px de tinta, con 6 px por unidad)
 * y el monofásico de `components_png` (1.090 px, con 17,2 px por unidad). Las
 * dos dan 1,35 unidades.
 */
export function cadesimuPole(x: number, h: number, withTrip: boolean, dashLeft = false): Shape[] {
  const bottom = gridBottom(h);
  const out: Shape[] = [
    { d: line(x, 0, x, 2.9) },
    { d: line(x - 3, 3, x, 9) },
    { d: dashLeft ? line(x - 3.3, 6, x - 1.5, 6) : line(x - 1.5, 6, x + 0.3, 6), thin: true },
    { d: line(x, 9, x, bottom) },
  ];
  if (withTrip) out.push({ d: tiltedSquare(x - 2.95, 5.9, 1.35, 18), fill: true });
  return out;
}

/**
 * Lámpara de señalización de CADeSimu: círculo con aspa, con el círculo
 * **centrado en el medio de sus dos bornes** (el de arriba es el origen) y las
 * puntas de la aspa sobresaliendo un poco.
 *
 * Medido sobre `data/samples/tests01/test01.png`: radio 2,83 unidades, centro
 * 6 unidades por debajo del borne de arriba (el de abajo está a 12) y las
 * puntas de la aspa 0,25 unidades fuera del círculo.
 */
export function cadesimuLamp(): Shape[] {
  const r = 2.83;
  const cy = 6;
  const k = (r + 0.25) / Math.SQRT2;
  return [
    { d: line(0, 0, 0, cy - r) },
    { d: line(0, cy + r, 0, 12) },
    { d: circle(0, cy, r), lamp: true },
    { d: line(-k, cy - k, k, cy + k), thin: true, lamp: true },
    { d: line(-k, cy + k, k, cy - k), thin: true, lamp: true },
  ];
}

/**
 * Cuadrado relleno girado: el detalle de disparo del automático, que en
 * CADeSimu va inclinado y no como rombo simétrico.
 *
 * `half` es la media diagonal (del centro al vértice) y `firstAngle` el ángulo
 * del primer vértice, en grados.
 */
export function tiltedSquare(cx: number, cy: number, half: number, firstAngle: number): string {
  const pts = [0, 1, 2, 3].map((i) => {
    const a = ((firstAngle + i * 90) * Math.PI) / 180;
    return `${round(cx + half * Math.cos(a))} ${round(cy + half * Math.sin(a))}`;
  });
  return `M${pts.join('L')}Z`;
}

export const left = (ny: number, name: string): SymbolPin => ({ name, nx: 0, ny, side: 'left' });
export const right = (ny: number, name: string): SymbolPin => ({ name, nx: 1, ny, side: 'right' });

/** Reparto vertical: n pines equiespaciados entre 0.18 y 0.82. */
export function spread(n: number): number[] {
  if (n === 0) return [];
  if (n === 1) return [0.5];
  const lo = 0.18;
  const hi = 0.82;
  return Array.from({ length: n }, (_, i) => lo + ((hi - lo) * i) / (n - 1));
}

export function pinsBoth(n: number, names: string[]): SymbolPin[] {
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

/**
 * Contacto NA / NC genérico sobre una fila `y`.
 *
 * La hoja se marca como móvil (`blade`) para que el lienzo la gire al cerrar:
 * `deg` es el giro que la lleva a apoyar sobre el borne contrario. El NC se
 * dibuja apoyado y se abre, así que su giro se aplica al revés desde el lienzo.
 */
export function contact(w: number, y: number, nc: boolean): Shape[] {
  const mx = w / 2;
  const gap = Math.min(w * 0.16, 4.5);
  const shapes: Shape[] = [
    { d: line(0, y, mx - gap, y) },
    { d: line(mx + gap, y, w, y) },
  ];
  if (nc) {
    shapes.push({ d: line(mx - gap, y - gap, mx + gap, y), thin: true, blade: { px: mx - gap, py: y - gap, deg: -46 } });
    shapes.push({ d: line(mx + gap, y - gap * 0.8, mx + gap, y + gap * 0.8), thin: true });
  } else {
    const dy = gap * 0.9;
    const deg = (Math.atan2(dy, gap * 2) * 180) / Math.PI;
    shapes.push({ d: line(mx - gap, y, mx + gap, y - dy), thin: true, blade: { px: mx - gap, py: y, deg } });
  }
  return shapes;
}

/** Tres polos de potencia verticales (contactor / interruptor). */
export function threePole(w: number, h: number, _nc = false): Shape[] {
  return verticalPoles(w, h, 3);
}

/**
 * Grilla de conexión de CADeSimu, medida en archivos reales
 * (`docs/cade-format.md:183-186`): columnas cada 6 unidades desde el borde
 * izquierdo de la caja, y fila inferior tres unidades adentro del borde.
 */
export const GRID = 6;

export const BOTTOM_INSET = 3;

/** `y` de la fila inferior de bornes de una caja de alto `h`. */
export const gridBottom = (h: number): number => h - BOTTOM_INSET;

/**
 * Columnas de bornes de una caja. Multipolar avanza de a 6 unidades desde el
 * borde izquierdo; unipolar va en el origen.
 *
 * El unipolar va al **origen** y no al centro de la caja: en el archivo el
 * primer borne está en el origen del registro, así que el polo se dibuja ahí
 * (como el primer polo de los multipolares) y no seis unidades a la derecha
 * del cable (S13).
 */
export function poleColumns(n: number): number[] {
  return Array.from({ length: n }, (_, i) => (n === 1 ? 0 : i * GRID));
}

/**
 * Bornes de un aparato multipolar sobre la grilla de CADeSimu: los impares en
 * la fila superior y los pares en la inferior, cada polo en su columna.
 *
 * `centered` fuerza la columna al centro de la caja: lo usa el resistor, que
 * dibuja un cuerpo horizontal y no va por la grilla de los polos.
 */
export function poles(n: number, size: { w: number; h: number }, centered = false): SymbolPin[] {
  const { w, h } = size;
  const bottom = gridBottom(h);
  const cols = n === 1 && centered ? [w / 2] : poleColumns(n);
  return cols.flatMap((x, i) => [
    { name: String(1 + i * 2), nx: x / w, ny: 0, side: 'top' as const },
    { name: String(2 + i * 2), nx: x / w, ny: bottom / h, side: 'bottom' as const },
  ]);
}

/** Ángulo de la cuchilla abierta respecto de la vertical. */
const BLADE_DEG = 22;

/**
 * Polo vertical de aparamenta: conductor superior, cuchilla oblicua hasta el
 * pivote y conductor inferior en la misma `x`. La cuchilla mide el hueco hasta
 * el extremo del borne, así que al girar a la vertical lo toca exactamente
 * (`data/simbolos-electricos-une-svg/SKILL.md:41`).
 */
export function verticalPole(x: number, h: number): Shape[] {
  const yTop = h * 0.2;
  const yPivot = h * 0.55;
  const bottom = gridBottom(h);
  const run = yPivot - yTop;
  const rad = (BLADE_DEG * Math.PI) / 180;
  return [
    { d: line(x, 0, x, yTop) },
    {
      d: line(x, yPivot, x - run * Math.sin(rad), yPivot - run * Math.cos(rad)),
      thin: true,
      blade: { px: x, py: yPivot, deg: BLADE_DEG },
    },
    { d: line(x, yPivot, x, bottom) },
  ];
}

/**
 * Cuchilla de un conmutador vertical (el 8018).
 *
 * El pivote está en el borne de abajo (la fila inferior de la grilla, a
 * `h - 3`) y la cuchilla se apoya girando. `side` es -1 para la que abre hacia
 * la izquierda y +1 para la que abre hacia la derecha: las dos se dibujan
 * abiertas y en direcciones opuestas, formando la lambda del dibujo de
 * CADeSimu, y sólo una puede apoyarse.
 *
 * El giro lleva signo contrario al lado porque el lienzo rota la hoja cuando el
 * contacto está cerrado (`deg > 0`): con la hoja de 95-96 abierta hacia la
 * izquierda el giro la apoya, y con la de 97-98 abierta hacia la derecha hace
 * falta el giro contrario.
 */
export function changeoverPole(x: number, h: number, side: number): Shape[] {
  const pivotY = h - BOTTOM_INSET;
  const reach = 5.5;
  const rad = (BLADE_DEG * Math.PI) / 180;
  const tipX = x + side * reach * Math.sin(rad);
  const tipY = pivotY - reach * Math.cos(rad);
  return [
    // Contacto fijo: el tramo que baja del borne de arriba.
    { d: line(x, 0, x, pivotY - reach) },
    // La cuchilla, con su pivote en el borne de abajo.
    {
      d: line(x, pivotY, tipX, tipY),
      thin: true,
      blade: { px: x, py: pivotY, deg: -side * BLADE_DEG },
    },
  ];
}

/**
 * Acoplamiento mecánico de un conmutador: la línea punteada que une las dos
 * cuchillas y el corchete de la derecha, como los dibuja CADeSimu.
 */
export function mechanicalLink(w: number, h: number): Shape[] {
  const y = h * 0.62;
  return [
    { d: line(w * 0.06, y, w * 0.94, y), thin: true, dashed: true },
    { d: line(w * 0.94, y - 1.6, w * 1.06, y - 1.6), thin: true },
    { d: line(w * 1.06, y - 1.6, w * 1.06, y + 1.6), thin: true },
    { d: line(w * 1.06, y + 1.6, w * 0.94, y + 1.6), thin: true },
  ];
}

/** Todos los polos de un aparato, sobre las columnas de la grilla. */
export function verticalPoles(_w: number, h: number, n = 3): Shape[] {
  return poleColumns(n).flatMap((x) => verticalPole(x, h));
}

/**
 * Conductora vertical recta, sin cuchilla.
 *
 * No todos los aparatos de protección llevan cuchilla: el relé térmico
 * (`rele termico.png`) dibuja sus conductores rectos, con el cuerpo y el gancho
 * encima. La cuchilla es del interruptor, no del Aparato.
 */
export function straightPoles(_w: number, h: number, n = 3): Shape[] {
  const bottom = gridBottom(h);
  return poleColumns(n).map((x) => ({ d: line(x, 0, x, bottom) }));
}

/**
 * Caja que encierra todas las formas de un símbolo, en las mismas unidades que
 * la caja declarada. Hace falta porque el dibujo puede desbordarla (S2c): el
 * accionamiento manual se pinta a la izquierda de `x = 0` y la punta de la
 * cuchilla del primer polo queda en `x < 0`.
 *
 * Los arcos se aproximan expandiendo por su radio, que es lo que dibuja
 * `circle()`.
 */
export function shapesBounds(shapes: Shape[]): { minX: number; minY: number; maxX: number; maxY: number } {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  const add = (x: number, y: number): void => {
    if (x < minX) minX = x;
    if (y < minY) minY = y;
    if (x > maxX) maxX = x;
    if (y > maxY) maxY = y;
  };

  for (const shape of shapes) {
    const tokens = shape.d.match(/[A-Za-z]|-?\d*\.?\d+(?:e[-+]?\d+)?/g) ?? [];
    let x = 0;
    let y = 0;
    let startX = 0;
    let startY = 0;
    let cmd = '';
    let i = 0;

    while (i < tokens.length) {
      const token = tokens[i]!;
      if (/[A-Za-z]/.test(token)) {
        cmd = token;
        i++;
        continue;
      }
      const num = (): number => Number(tokens[i++]);
      const relative = cmd === cmd.toLowerCase();
      switch (cmd.toLowerCase()) {
        case 'm':
        case 'l': {
          const nx = num();
          const ny = num();
          x = relative ? x + nx : nx;
          y = relative ? y + ny : ny;
          if (cmd.toLowerCase() === 'm' && cmd === 'M') {
            startX = x;
            startY = y;
            cmd = 'L';
          }
          add(x, y);
          break;
        }
        case 'h': {
          const nx = num();
          x = relative ? x + nx : nx;
          add(x, y);
          break;
        }
        case 'v': {
          const ny = num();
          y = relative ? y + ny : ny;
          add(x, y);
          break;
        }
        case 'z': {
          x = startX;
          y = startY;
          add(x, y);
          break;
        }
        case 'a': {
          const rx = Math.abs(num());
          const ry = Math.abs(num());
          num(); // rotación del eje x
          num(); // flag de arco mayor
          num(); // flag de barrido
          const dx = num();
          const dy = num();
          const nx = relative ? x + dx : dx;
          const ny = relative ? y + dy : dy;
          // La envolvente del arco: la cuerda y los dos extremos del arco. Para
          // una semicircunferencia (que es como dibuja `circle()`) los extremos
          // están en el punto medio de la cuerda, a un radio de distancia en
          // perpendicular. Expandir por el radio en ambos ejes daba una caja
          // mucho más grande que el círculo (y descentrada).
          add(x, y);
          add(nx, ny);
          const len = Math.hypot(nx - x, ny - y);
          if (len > 0) {
            const r = Math.max(rx, ry);
            const mx = (x + nx) / 2;
            const my = (y + ny) / 2;
            const px = (-(ny - y) / len) * r;
            const py = ((nx - x) / len) * r;
            add(mx + px, my + py);
            add(mx - px, my - py);
          }
          x = nx;
          y = ny;
          break;
        }
        default:
          i++;
      }
    }
  }

  return { minX, minY, maxX, maxY };
}

/** Radio de la cuchilla abierta (`BLADE_DEG`). */
const BLADE_RAD = (BLADE_DEG * Math.PI) / 180;

/**
 * Cuadrado relleno sobre la cuchilla de un automático.
 *
 * Se dibuja girado con la cuchilla (mismo ángulo y mismo centro), porque es el
 * elemento que distingue un aparato automático de un interruptor manual
 * (`interruptor proteccion contra cortocircuitos monofasico.png`).
 *
 * No lleva metadata `blade`: el lienzo rota cada forma con `Shape.blade` sobre
 * su caja envolvente, y eso alcanza para un trazo recto pero no para un
 * polígono girado. El cuadrado ya sale dibujado con el ángulo de la cuchilla.
 *
 * Las fracciones del alto replican las de `verticalPole()`, que no se toca.
 */
export function filledSquareOnBlade(x: number, h: number, side?: number): Shape[] {
  const s = side ?? Math.min(h * 0.16, GRID * 0.4);
  const yTop = h * 0.2;
  const yPivot = h * 0.55;
  const run = yPivot - yTop;
  const cx = x - (run * Math.sin(BLADE_RAD)) / 2;
  const cy = (yTop + yPivot) / 2;
  // Semiejes del cuadrado: uno sobre la cuchilla y otro perpendicular a ella.
  const ax = (s / 2) * Math.sin(BLADE_RAD);
  const ay = (s / 2) * Math.cos(BLADE_RAD);
  const bx = (s / 2) * Math.cos(BLADE_RAD);
  const by = (-s / 2) * Math.sin(BLADE_RAD);
  const pt = (dx: number, dy: number): string => `${round(cx + dx)} ${round(cy + dy)}`;
  return [
    {
      d: `M${pt(-ax + bx, -ay + by)}L${pt(ax + bx, ay + by)}L${pt(ax - bx, ay - by)}L${pt(-ax - bx, -ay - by)}Z`,
      fill: true,
    },
  ];
}

/** Margen del cuerpo a cada lado del aparato: media columna de la grilla. */
const BODY_MARGIN = GRID / 2;

/** Banda del cuerpo en fracción del alto: arranca debajo del pivote de la cuchilla. */
const BODY_TOP = 0.58;
const BODY_BOTTOM = 0.78;

interface BodyFrame {
  left: number;
  right: number;
  top: number;
  bottom: number;
}

/**
 * Caja del cuerpo de un aparato de `n` polos: abarca desde media columna antes
 * del primer polo hasta media columna después del último, sin salirse de la
 * caja declarada, y ocupa la banda que queda entre el pivote y la fila inferior.
 */
function bodyFrame(w: number, h: number, n: number): BodyFrame {
  const cols = poleColumns(n);
  const first = cols[0] ?? 0;
  const last = cols[cols.length - 1] ?? 0;
  return {
    left: Math.max(0, first - BODY_MARGIN),
    right: Math.min(w, last + BODY_MARGIN),
    top: h * BODY_TOP,
    bottom: h * BODY_BOTTOM,
  };
}

/**
 * Cuerpo del aparato: un rectángulo exterior y un tabique compartido por cada
 * polo interior, de modo que quede una celda por polo (`rele termico.png`).
 *
 * Con `rows > 1` agrega el tabique horizontal que separa las filas, así el
 * cuerpo del disyuntor queda como una cuadrícula de celdas y no como una banda
 * (`disyuntor trifasico.png`: gancho arriba, triángulo abajo).
 */
export function cellBody(w: number, h: number, n: number, rows = 1): Shape[] {
  const f = bodyFrame(w, h, n);
  const cols = poleColumns(n);
  const out: Shape[] = [{ d: rect(f.left, f.top, f.right - f.left, f.bottom - f.top) }];
  for (let i = 1; i < n; i++) {
    const x = cols[i];
    if (x !== undefined && x > f.left + 0.01 && x < f.right - 0.01) {
      out.push({ d: line(x, f.top, x, f.bottom), thin: true });
    }
  }
  for (let i = 1; i < rows; i++) {
    const y = bodyRow(h, rows, i).top;
    out.push({ d: line(f.left, y, f.right, y), thin: true });
  }
  return out;
}

/** Fila `i` de `rows` dentro de la banda del cuerpo. */
function bodyRow(h: number, rows: number, i: number): { top: number; bottom: number } {
  const top = h * BODY_TOP;
  const rowHeight = (h * (BODY_BOTTOM - BODY_TOP)) / rows;
  return { top: top + rowHeight * i, bottom: top + rowHeight * (i + 1) };
}

/**
 * Gancho térmico `⊐` de un polo: el conductor hace un codo rectangular hacia
 * un lado dentro de su celda (`rele termico.png`).
 */
export function thermalHook(x: number, h: number, rows = 1, row = 0): Shape[] {
  const r = bodyRow(h, rows, row);
  const span = (r.bottom - r.top) * 0.6;
  const cy = (r.top + r.bottom) / 2;
  const reach = Math.min(GRID * 0.4, span * 1.4);
  return [
    {
      d: `M${round(x)} ${round(cy - span / 2)}H${round(x + reach)}V${round(cy + span / 2)}H${round(x)}`,
    },
  ];
}

/**
 * Triángulo magnético `▷` de un polo: lado vertical sobre el conductor y
 * vértice hacia el interior de la celda (`disyuntor trifasico.png`).
 */
export function magneticTriangle(x: number, h: number, rows = 1, row = 0): Shape[] {
  const r = bodyRow(h, rows, row);
  const span = (r.bottom - r.top) * 0.65;
  const cy = (r.top + r.bottom) / 2;
  const reach = span * 0.8;
  return [
    {
      d: `M${round(x)} ${round(cy - span / 2)}L${round(x + reach)} ${round(cy)}L${round(x)} ${round(cy + span / 2)}Z`,
    },
  ];
}

/**
 * Tramo discontinuo del enlace mecánico: segmentos cortos con la proporción de
 * trazo `4 3` que pide la convención UNE (`SKILL.md:41`).
 */
function dashed(x1: number, y1: number, x2: number, y2: number, dash: number, gap: number): Shape[] {
  const len = Math.hypot(x2 - x1, y2 - y1);
  if (len < dash) return [{ d: line(x1, y1, x2, y2), thin: true }];
  const ux = (x2 - x1) / len;
  const uy = (y2 - y1) / len;
  const out: Shape[] = [];
  for (let t = 0; t < len; t += dash + gap) {
    const end = Math.min(t + dash, len);
    out.push({ d: line(x1 + ux * t, y1 + uy * t, x1 + ux * end, y1 + uy * end), thin: true });
  }
  return out;
}

/**
 * Accionamiento manual: cuadrado con cruz, palanca corta y enlace mecánico
 * discontinuo hasta el cuerpo (`disyuntor trifasico.png`).
 *
 * Va a la **izquierda** del aparato, sobre el margen que la grilla de bornes
 * deja libre: por eso arranca en `x < 0` y desborda la caja declarada, que es
 * la grilla de conexión y no el bbox del dibujo (S2c, D3). El enlace lleva un
 * pie por fila del cuerpo, así un aparato de dos filas se une en las dos.
 */
export function manualOperator(w: number, h: number, n: number, rows = 1): Shape[] {
  const f = bodyFrame(w, h, n);
  const side = Math.min(h * 0.16, GRID * 0.8);
  // Columna del enlace: media columna de grilla antes del borde de la caja,
  // que es donde el CAD dibuja el accionamiento.
  const x = -GRID;
  const cy = f.top - side;
  const lever = x - side / 2 - side * 0.9;
  const stubs = Array.from({ length: rows }, (_, i) => {
    const r = bodyRow(h, rows, i);
    return (r.top + r.bottom) / 2;
  });
  const out: Shape[] = [
    { d: rect(x - side / 2, cy - side / 2, side, side) },
    // Cruz que parte el cuadrado en cuatro paños.
    { d: line(x, cy - side / 2, x, cy + side / 2), thin: true },
    { d: line(x - side / 2, cy, x + side / 2, cy), thin: true },
    // Palanca con su tope, del lado libre.
    { d: line(lever, cy, x - side / 2, cy), thin: true },
    { d: line(lever, cy - side * 0.45, lever, cy + side * 0.45), thin: true },
  ];
  // Enlace discontinuo desde el cuadrado hasta el último pie del cuerpo.
  const bottom = cy + side / 2;
  const last = Math.max(stubs[stubs.length - 1] ?? bottom, bottom);
  out.push(...dashed(x, bottom, x, last, h * 0.045, h * 0.03));
  for (const y of stubs) out.push({ d: line(x, y, f.left, y), thin: true });
  return out;
}

/** Marca de reloj para contactos y bobinas temporizadas. */
export function clock(w: number, h: number): Shape[] {
  const r = Math.min(w, h) * 0.12;
  const cx = w * 0.8;
  const cy = h * 0.84;
  return [
    { d: circle(cx, cy, r), thin: true },
    { d: line(cx, cy, cx, cy - r * 0.7), thin: true },
  ];
}

/**
 * Toroide del diferencial (6005/6006): cápsula horizontal con extremos
 * redondeados que cruza el tramo inferior de los polos, justo encima de los
 * bornes pares, tal como la dibuja `rele diferencial.png`.
 */
export function torus(_w: number, h: number, n: number): Shape[] {
  const cols = poleColumns(n);
  const x1 = cols[0]! - GRID * 0.25;
  const x2 = cols[cols.length - 1]! + GRID * 0.25;
  const cy = gridBottom(h) - GRID * 0.45;
  const r = GRID * 0.25;
  return [
    { d: `M${round(x1)} ${round(cy - r)}H${round(x2)}`, thin: true },
    { d: `M${round(x1)} ${round(cy + r)}H${round(x2)}`, thin: true },
    { d: `M${round(x1)} ${round(cy + r)}a${round(r)} ${round(r)} 0 0 1 0 ${round(-2 * r)}`, thin: true },
    { d: `M${round(x2)} ${round(cy - r)}a${round(r)} ${round(r)} 0 0 1 0 ${round(2 * r)}`, thin: true },
  ];
}

/**
 * Disparador del diferencial: bracket `⊢` a la izquierda con una línea fina a
 * la altura de la cuchilla que atraviesa una caja de dos celdas y muere en el
 * primer polo; un conector discontinuo en `L` baja hasta el extremo izquierdo
 * del toroide (`rele diferencial.png`).
 */
export function differentialTrip(_w: number, h: number, n: number): Shape[] {
  const cols = poleColumns(n);
  const px = cols[0]!;
  const x1 = px - GRID * 0.25;
  const r = GRID * 0.25;
  const cy = gridBottom(h) - GRID * 0.45;
  const y = h * 0.42;
  const s = GRID * 0.22;
  const boxR = px - GRID * 0.3;
  const boxL = boxR - 2 * s;
  const xb = boxL - GRID * 0.15;
  const xr = px - GRID * 0.13;
  const xL = boxL + s * 0.4;
  return [
    { d: line(xb, y - s, xb, y + s), thin: true },
    { d: line(xb, y, xr, y), thin: true },
    { d: rect(boxL, y - s, 2 * s, 2 * s), thin: true },
    { d: line(boxL + s, y - s, boxL + s, y + s), thin: true },
    ...dashed(xL, y + s, xL, cy, GRID * 0.3, GRID * 0.22),
    ...dashed(xL, cy, x1 - r, cy, GRID * 0.3, GRID * 0.22),
  ];
}
