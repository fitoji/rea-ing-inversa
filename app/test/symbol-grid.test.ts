import { test } from 'node:test';
import assert from 'node:assert/strict';
import { FAMILY_SYMBOLS } from '../src/symbols/families.ts';
import { shapesBounds } from '../src/symbols/draw.ts';
import { symbolFor, type Shape } from '../src/symbols/library.ts';

/**
 * Grilla de conexión de CADeSimu, medida en archivos reales
 * (`docs/cade-format.md:183-186`, verificada en `test/pins.test.ts`):
 *
 *   - columnas en múltiplos de 6 desde el borde izquierdo de la caja;
 *   - filas en `0` y en `alto - 3`.
 *
 * `attachPoints()` deriva los puntos de conexión de los cables de un `.cade`
 * importado. Estas pruebas cubren el otro lado: los bornes que **dibuja** el
 * símbolo, que son los que usa un componente recién colocado.
 */
const COLUMN = 6;
const BOTTOM_INSET = 3;
const EPS = 0.01;

const isDevice = (code: number): boolean =>
  (code >= 2000 && code <= 2099) || (code >= 5000 && code <= 5099) || (code >= 6000 && code <= 6099);

const devices = FAMILY_SYMBOLS.filter((s) => isDevice(s.code));

const onColumn = (x: number): boolean => Math.abs(x / COLUMN - Math.round(x / COLUMN)) < EPS;
const onRow = (y: number, h: number): boolean => Math.abs(y) < EPS || Math.abs(y - (h - BOTTOM_INSET)) < EPS;

const near = (a: number, b: number): boolean => Math.abs(a - b) < EPS;

// --- lectura del dibujo ------------------------------------------------------

interface Pt {
  x: number;
  y: number;
}

/**
 * Puntos absolutos de un `d`. El símbolo se dibuja con M/L/H/V/Z; los arcos de
 * los círculos se saltan acá y se acotan aparte en `bbox()`.
 */
function points(d: string): Pt[] {
  const tokens = d.match(/[A-Za-z]|-?\d+(?:\.\d+)?/g) ?? [];
  const out: Pt[] = [];
  let x = 0;
  let y = 0;
  let cmd = '';
  let i = 0;
  while (i < tokens.length) {
    const tok = tokens[i]!;
    if (/[A-Za-z]/.test(tok)) {
      cmd = tok.toUpperCase();
      i++;
      continue;
    }
    const num = (): number => Number(tokens[i++]!);
    switch (cmd) {
      case 'M':
        x = num();
        y = num();
        out.push({ x, y });
        break;
      case 'L':
        x = num();
        y = num();
        out.push({ x, y });
        break;
      case 'H':
        x = num();
        out.push({ x, y });
        break;
      case 'V':
        y = num();
        out.push({ x, y });
        break;
      default:
        i++; // arcos: se acotan en `bbox()`
    }
  }
  return out;
}

interface Box {
  x0: number;
  y0: number;
  x1: number;
  y1: number;
}

/** Caja envolvente de un `d`, acotando los arcos por su radio. */
function bbox(d: string): Box {
  const tokens = d.match(/[A-Za-z]|-?\d+(?:\.\d+)?/g) ?? [];
  const box: Box = { x0: Infinity, y0: Infinity, x1: -Infinity, y1: -Infinity };
  let x = 0;
  let y = 0;
  let cmd = '';
  let i = 0;
  const grow = (px: number, py: number): void => {
    box.x0 = Math.min(box.x0, px);
    box.x1 = Math.max(box.x1, px);
    box.y0 = Math.min(box.y0, py);
    box.y1 = Math.max(box.y1, py);
  };
  while (i < tokens.length) {
    const tok = tokens[i]!;
    if (/[A-Za-z]/.test(tok)) {
      cmd = tok.toUpperCase();
      i++;
      continue;
    }
    const num = (): number => Number(tokens[i++]!);
    switch (cmd) {
      case 'M':
      case 'L':
        x = num();
        y = num();
        grow(x, y);
        break;
      case 'H':
        x = num();
        grow(x, y);
        break;
      case 'V':
        y = num();
        grow(x, y);
        break;
      case 'A': {
        const rx = num();
        const ry = num();
        num(); // rotación
        num(); // large-arc
        num(); // sweep
        x += num();
        y += num();
        grow(x - rx, y - ry);
        grow(x + rx, y + ry);
        break;
      }
      default:
        i++;
    }
  }
  return box;
}

const shapesOf = (code: number, w: number, h: number): Shape[] => {
  const sym = FAMILY_SYMBOLS.find((s) => s.code === code);
  assert.ok(sym, `el símbolo ${code} debe existir`);
  return sym.shapes(w, h);
};

const closedPolys = (shapes: Shape[]): Pt[][] =>
  shapes.filter((s) => /[Zz]/.test(s.d)).map((s) => points(s.d)).filter((p) => p.length >= 3);

/** El cuerpo es el rectángulo cerrado más ancho del símbolo. */
function widestRect(shapes: Shape[]): Box | undefined {
  return closedPolys(shapes)
    .filter((p) => p.length === 4)
    .map((p) => bbox(pointsToD(p)))
    .sort((a, b) => b.x1 - b.x0 - (a.x1 - a.x0))[0];
}

const segments = (shapes: Shape[]): { a: Pt; b: Pt }[] =>
  shapes.map((s) => points(s.d)).filter((p) => p.length === 2).map((p) => ({ a: p[0]!, b: p[1]! }));

/**
 * Gancho térmico `⊐`: un rectángulo abierto cuyos dos extremos se apoyan en el
 * conductor (la columna del polo) y cuyo tramo vertical corre a la derecha.
 */
const isHook = (d: string): boolean => {
  if (/[Zz]/.test(d)) return false;
  const p = points(d);
  if (p.length !== 4) return false;
  const [a, b, c, e] = p as [Pt, Pt, Pt, Pt];
  return near(a.x, e.x) && near(a.y, b.y) && near(b.x, c.x) && near(c.y, e.y) && b.x > a.x + EPS;
};

/** Triángulo magnético `▷`: lado vertical sobre el conductor y vértice a la derecha. */
const isTriangle = (d: string): boolean => {
  if (!/[Zz]/.test(d)) return false;
  const p = points(d);
  if (p.length !== 3) return false;
  const [a, b, c] = p as [Pt, Pt, Pt];
  return near(a.x, c.x) && b.x > a.x + EPS && b.y > a.y + EPS && b.y < c.y - EPS;
};

const columnsOf = (n: number, w: number): number[] =>
  Array.from({ length: n }, (_, i) => (n === 1 ? w / 2 : i * COLUMN));

// --- grilla ------------------------------------------------------------------

test('los bornes dibujados de la aparamenta caen en la grilla de CADeSimu', () => {
  assert.ok(devices.length >= 15, `se esperaban al menos 15 dispositivos, hay ${devices.length}`);

  const off: string[] = [];
  for (const sym of devices) {
    if (!sym.size) continue;
    const { w, h } = sym.size;
    for (const p of sym.pins) {
      const x = p.nx * w;
      const y = p.ny * h;
      if (!onColumn(x) || !onRow(y, h)) {
        off.push(`${sym.code} (${sym.name}): borne ${p.name} en (${x}, ${y}) de caja ${w}x${h}`);
      }
    }
  }
  assert.deepEqual(off, [], `bornes fuera de la grilla:\n  ${off.join('\n  ')}`);
});

test('un aparato de tres polos lleva 1-3-5 arriba y 2-4-6 abajo', () => {
  const sym = devices.find((s) => s.code === 2004);
  const size = sym?.size;
  assert.ok(size, 'el dispositivo 2004 debe existir y declarar caja');
  const { h } = size;
  const rowOf = (p: (typeof sym.pins)[number]): 'top' | 'bottom' | 'other' => {
    const y = p.ny * h;
    if (Math.abs(y) < EPS) return 'top';
    if (Math.abs(y - (h - BOTTOM_INSET)) < EPS) return 'bottom';
    return 'other';
  };
  const names = (r: string): string[] => sym.pins.filter((p) => rowOf(p) === r).map((p) => p.name).sort();
  assert.deepEqual(names('top'), ['1', '3', '5']);
  assert.deepEqual(names('bottom'), ['2', '4', '6']);
  assert.deepEqual(names('other'), []);
});

// --- elementos del polo vertical (T3) ----------------------------------------

test('el aparato con disparo térmico dibuja un gancho por polo', () => {
  const sym = FAMILY_SYMBOLS.find((s) => s.code === 6016);
  assert.ok(sym?.size, 'el 6016 (relé térmico) debe declarar caja');
  const { w, h } = sym.size;
  const hooks = shapesOf(6016, w, h).filter((s) => isHook(s.d));

  const cols = columnsOf(3, w);
  const perPole = cols.map((x) => hooks.filter((sh) => near(points(sh.d)[0]!.x, x)).length);
  assert.deepEqual(perPole, [1, 1, 1], `se esperaba un gancho por polo, hay ${perPole}`);
  assert.equal(hooks.length, 3, `se esperaban 3 ganchos, hay ${hooks.length}`);
});

test('el cuerpo de n polos tiene n - 1 tabiques internos', () => {
  const bodies = [
    { code: 6005, n: 2 },
    { code: 6015, n: 3 },
    { code: 6016, n: 3 },
    { code: 6018, n: 2 },
  ];
  const off: string[] = [];
  for (const { code, n } of bodies) {
    const sym = FAMILY_SYMBOLS.find((s) => s.code === code);
    assert.ok(sym?.size, `el ${code} debe declarar caja`);
    const { w, h } = sym.size;
    const shapes = shapesOf(code, w, h);
    const body = widestRect(shapes);
    assert.ok(body, `el ${code} debe dibujar un cuerpo`);

    const partitions = segments(shapes).filter(
      (s) =>
        near(s.a.x, s.b.x) &&
        s.a.x > body.x0 + EPS &&
        s.a.x < body.x1 - EPS &&
        Math.min(s.a.y, s.b.y) <= body.y0 + EPS &&
        Math.max(s.a.y, s.b.y) >= body.y1 - EPS,
    );
    const unique = [...new Set(partitions.map((p) => Math.round(p.a.x * 100) / 100))].sort((a, b) => a - b);
    const expected = columnsOf(n, w).slice(1);
    if (unique.length !== n - 1 || unique.some((x, i) => !near(x, expected[i]!))) {
      off.push(`${code} (${n} polos): tabiques en ${JSON.stringify(unique)}, se esperaban ${JSON.stringify(expected)}`);
    }
  }
  assert.deepEqual(off, [], `tabiques fuera de lugar:\n  ${off.join('\n  ')}`);
});

test('el diferencial dibuja un triángulo magnético por polo', () => {
  const sym = FAMILY_SYMBOLS.find((s) => s.code === 6018);
  assert.ok(sym?.size, 'el 6018 (interruptor diferencial) debe declarar caja');
  const { w, h } = sym.size;
  const tri = shapesOf(6018, w, h).filter((s) => isTriangle(s.d));
  const cols = columnsOf(2, w);
  const perPole = cols.map((x) => tri.filter((s) => near(points(s.d)[0]!.x, x)).length);
  assert.deepEqual(perPole, [1, 1], `se esperaba un triángulo por polo, hay ${perPole}`);
});

test('el automático dibuja un cuadrado relleno sobre la cuchilla', () => {
  const sym = FAMILY_SYMBOLS.find((s) => s.code === 6017);
  assert.ok(sym?.size, 'el 6017 (interruptor automático) debe declarar caja');
  const { w, h } = sym.size;
  const shapes = shapesOf(6017, w, h);

  const squares = shapes.filter((s) => s.fill === true && /[Zz]/.test(s.d) && points(s.d).length === 4);
  assert.equal(squares.length, 1, `se esperaba un cuadrado relleno, hay ${squares.length}`);

  const blade = shapes.find((s) => s.blade);
  assert.ok(blade, 'el polo debe conservar su cuchilla con metadata');
  const [tip, pivot] = points(blade.d) as [Pt, Pt];
  const box = bbox(squares[0]!.d);
  const cx = (box.x0 + box.x1) / 2;
  const cy = (box.y0 + box.y1) / 2;

  // Distancia del centro del cuadrado a la recta de la cuchilla.
  const vx = pivot.x - tip.x;
  const vy = pivot.y - tip.y;
  const dist = Math.abs((cx - tip.x) * vy - (cy - tip.y) * vx) / Math.hypot(vx, vy);
  assert.ok(dist < 0.5, `el cuadrado debe estar sobre la cuchilla, está a ${dist.toFixed(2)}`);
});

test('el contactor lleva accionamiento manual con enlace discontinuo', () => {
  const sym = FAMILY_SYMBOLS.find((s) => s.code === 6015);
  assert.ok(sym?.size, 'el 6015 (contactor) debe declarar caja');
  const { w, h } = sym.size;
  const shapes = shapesOf(6015, w, h);

  const squares = closedPolys(shapes).filter((p) => {
    if (p.length !== 4) return false;
    const box = bbox(pointsToD(p));
    const side = Math.max(box.x1 - box.x0, box.y1 - box.y0);
    return side > 1 && side < w * 0.4;
  });
  assert.equal(squares.length, 1, `se esperaba un cuadrado de accionamiento, hay ${squares.length}`);

  // Enlace mecánico: tramos cortos, la marca de un trazo discontinuo.
  const dashes = segments(shapes).filter((s) => Math.hypot(s.b.x - s.a.x, s.b.y - s.a.y) < COLUMN * 0.25);
  assert.ok(dashes.length >= 3, `se esperaban tramos discontinuos, hay ${dashes.length}`);
});

// --- accionamiento manual a la izquierda (S2c, D3) ---------------------------

/**
 * El accionamiento manual va a la **izquierda** del aparato y desborda la caja
 * declarada, que es la grilla de bornes y no el bbox del dibujo (S2c, D3).
 * Se une a las filas del cuerpo con un enlace discontinuo que lleva un pie por
 * fila (`disyuntor trifasico.png`).
 */
test('el accionamiento manual se dibuja a la izquierda, con un pie por fila', () => {
  const cases = [
    { code: 6009, rows: 2 },
    { code: 6015, rows: 1 },
  ];
  const off: string[] = [];
  for (const { code, rows } of cases) {
    const sym = FAMILY_SYMBOLS.find((s) => s.code === code);
    assert.ok(sym?.size, `el ${code} debe declarar caja`);
    const { w, h } = sym.size;
    const shapes = shapesOf(code, w, h);

    // El cuadrado del accionamiento: el único polígono que queda entero a la
    // izquierda de x = 0, es decir fuera de la caja declarada.
    const operator = closedPolys(shapes).filter((p) => p.length === 4 && p.every((pt) => pt.x < -EPS));
    if (operator.length !== 1) {
      off.push(`${code}: ${operator.length} cuadrados de accionamiento a la izquierda`);
      continue;
    }

    // Un pie por fila: tramo horizontal que cruza x = 0 (del accionamiento al
    // borde izquierdo del aparato).
    const stubs = segments(shapes).filter(
      (s) => near(s.a.y, s.b.y) && Math.min(s.a.x, s.b.x) < -EPS && Math.max(s.a.x, s.b.x) > -EPS,
    );
    const heights = [...new Set(stubs.map((s) => Math.round(s.a.y * 100) / 100))].sort((a, b) => a - b);
    if (stubs.length !== rows || heights.length !== rows) {
      off.push(`${code}: ${stubs.length} pies en y ${JSON.stringify(heights)}, se esperaban ${rows}`);
    }
  }
  assert.deepEqual(off, [], `accionamiento manual fuera de lugar:\n  ${off.join('\n  ')}`);
});

// --- códigos de protección con dibujo propio (S7) ----------------------------

test('cada código de protección 6000-6010 tiene símbolo propio (S7)', () => {
  const missing = Array.from({ length: 11 }, (_, i) => 6000 + i).filter(
    (code) => !FAMILY_SYMBOLS.some((s) => s.code === code),
  );
  assert.deepEqual(missing, [], `códigos que caen al dibujo genérico: ${missing.join(', ')}`);
});

test('los bornes de 6000-6010 se escriben en el orden del CAD: impares arriba', () => {
  const off: string[] = [];
  for (let code = 6000; code <= 6010; code++) {
    const sym = FAMILY_SYMBOLS.find((s) => s.code === code);
    assert.ok(sym, `falta el símbolo ${code}`);
    const numbers = sym.pins.map((p) => Number(p.name));
    const sorted = [...numbers].sort((a, b) => a - b);
    if (sorted.some((n, i) => n !== i + 1)) {
      off.push(`${code}: bornes ${numbers.join(' ')}`);
      continue;
    }
    const half = numbers.length / 2;
    const oddsFirst =
      numbers.slice(0, half).every((n) => n % 2 === 1) && numbers.slice(half).every((n) => n % 2 === 0);
    if (!oddsFirst) off.push(`${code}: orden ${numbers.join(' ')}`);
  }
  assert.deepEqual(off, [], `bornes fuera del orden del registro (1 3 5 / 2 4 6):\n  ${off.join('\n  ')}`);
});

test('el automático 6003 dibuja un cuadrado relleno en cada polo, sobre su columna', () => {
  const sym = FAMILY_SYMBOLS.find((s) => s.code === 6003);
  assert.ok(sym?.size, 'el 6003 (automático III) debe declarar caja');
  const { w, h } = sym.size;
  assert.deepEqual({ w, h }, { w: 18, h: 15 }, 'el 6003 mide 18x15 según E8');
  const shapes = shapesOf(6003, w, h);

  const squares = shapes.filter((s) => s.fill === true && /[Zz]/.test(s.d) && points(s.d).length === 4);
  assert.equal(squares.length, 3, `se esperaba un cuadrado relleno por polo, hay ${squares.length}`);

  const centres = squares.map((s) => {
    const b = bbox(s.d);
    return { x: (b.x0 + b.x1) / 2, y: (b.y0 + b.y1) / 2 };
  });

  // El cuadrado va montado sobre la cuchilla, que arranca en la columna del polo
  // y se abre hacia la izquierda: el centro queda a menos de media columna.
  const off: string[] = [];
  for (const x of columnsOf(3, w)) {
    const hits = centres.filter((c) => Math.abs(c.x - x) < COLUMN / 2);
    if (hits.length !== 1) off.push(`polo en x=${x}: ${hits.length} cuadrados`);
  }
  assert.deepEqual(off, [], `cuadrados fuera de su polo:\n  ${off.join('\n  ')}`);

  // Y cada uno está apoyado en su cuchilla, no suelto.
  const blades = shapes.filter((s) => s.blade).map((s) => points(s.d) as [Pt, Pt]);
  assert.equal(blades.length, 3, `se esperaban 3 cuchillas, hay ${blades.length}`);
  for (const c of centres) {
    const dist = Math.min(
      ...blades.map(([a, b]) => {
        const vx = b.x - a.x;
        const vy = b.y - a.y;
        return Math.abs((c.x - a.x) * vy - (c.y - a.y) * vx) / Math.hypot(vx, vy);
      }),
    );
    assert.ok(dist < 0.5, `el cuadrado en (${c.x}, ${c.y}) no está sobre una cuchilla, está a ${dist.toFixed(2)}`);
  }
});

test('el disyuntor 6009 dibuja un cuerpo de dos filas: gancho arriba, triángulo abajo', () => {
  const sym = FAMILY_SYMBOLS.find((s) => s.code === 6009);
  assert.ok(sym?.size, 'el 6009 (disyuntor III) debe declarar caja');
  const { w, h } = sym.size;
  assert.deepEqual({ w, h }, { w: 18, h: 24 }, 'el 6009 mide 18x24 según E8');
  const shapes = shapesOf(6009, w, h);

  const body = widestRect(shapes);
  assert.ok(body, 'el 6009 debe dibujar un cuerpo');

  const hooks = shapes.filter((s) => isHook(s.d)).map((s) => bbox(s.d));
  const tris = shapes.filter((s) => isTriangle(s.d)).map((s) => bbox(s.d));
  assert.equal(hooks.length, 3, `se esperaban 3 ganchos, hay ${hooks.length}`);
  assert.equal(tris.length, 3, `se esperaban 3 triángulos, hay ${tris.length}`);

  // Una fila por elemento de disparo: ganchos en la banda de arriba, triángulos
  // en la de abajo, sin solaparse y dentro del cuerpo.
  const hookBottom = Math.max(...hooks.map((b) => b.y1));
  const triTop = Math.min(...tris.map((b) => b.y0));
  assert.ok(Math.min(...hooks.map((b) => b.y0)) >= body.y0 - EPS, 'los ganchos salen del cuerpo por arriba');
  assert.ok(Math.max(...tris.map((b) => b.y1)) <= body.y1 + EPS, 'los triángulos salen del cuerpo por abajo');
  assert.ok(hookBottom <= triTop + EPS, `las dos filas se pisan: ganchos hasta ${hookBottom}, triángulos desde ${triTop}`);

  // Dos filas y no una: el cuerpo lleva un tabique horizontal entre ambas.
  const dividers = segments(shapes).filter(
    (s) =>
      near(s.a.y, s.b.y) &&
      s.a.y > body.y0 + EPS &&
      s.a.y < body.y1 - EPS &&
      Math.min(s.a.x, s.b.x) <= body.x0 + EPS &&
      Math.max(s.a.x, s.b.x) >= body.x1 - EPS,
  );
  assert.equal(dividers.length, 1, `se esperaba un tabique horizontal, hay ${dividers.length}`);

  // Un gancho y un triángulo por polo, sobre la columna del polo.
  for (const x of columnsOf(3, w)) {
    assert.equal(hooks.filter((b) => near(b.x0, x)).length, 1, `el polo en x=${x} no tiene exactamente un gancho`);
    assert.equal(tris.filter((b) => near(b.x0, x)).length, 1, `el polo en x=${x} no tiene exactamente un triángulo`);
  }
});

// --- motor en una sola fila de bornes (S3, S4) -------------------------------

test('el motor 1000 toma U1 V1 W1 PE en una sola fila sobre el borde superior', () => {
  const sym = symbolFor(1000);
  assert.ok(sym, 'el motor 1000 debe existir');
  const size = sym.size ?? { w: 24, h: 24 };
  assert.deepEqual(size, { w: 24, h: 24 }, 'el motor mide 24x24 (S3)');

  assert.deepEqual(
    sym.pins.map((p) => p.name),
    ['U1', 'V1', 'W1', 'PE'],
    'los nombres de borne no cambian (S4)',
  );
  assert.deepEqual(
    sym.pins.map((p) => p.side),
    ['top', 'top', 'top', 'top'],
    'los cuatro bornes salen por el borde superior',
  );
  assert.deepEqual(
    sym.pins.map((p) => Math.round(p.ny * size.h)),
    [0, 0, 0, 0],
    'una sola fila, en y = 0',
  );
  assert.deepEqual(
    sym.pins.map((p) => p.nx * size.w),
    [0, 6, 12, 18],
    'las columnas caen en la grilla de 6',
  );
});

// --- invariantes de la caja --------------------------------------------------

/**
 * Margen documentado del arte fuera de la caja declarada (S2c, D3).
 *
 * La caja es la grilla de conexión, no el bbox del dibujo: el accionamiento
 * manual vive a la izquierda de `x = 0` y la punta de la cuchilla del primer
 * polo sale a `x < 0`. Ese desborde se acota a una columna de grilla por lado;
 * verticalmente no hay desborde.
 */
const ART_MARGIN = COLUMN;

test('todo relleno entra en la caja declarada más una columna de margen', () => {
  const off: string[] = [];
  for (const sym of FAMILY_SYMBOLS) {
    if (!sym.size) continue;
    const { w, h } = sym.size;
    for (const s of sym.shapes(w, h)) {
      if (!s.fill) continue;
      const b = bbox(s.d);
      if (b.x0 < -ART_MARGIN - EPS || b.x1 > w + ART_MARGIN + EPS || b.y0 < -EPS || b.y1 > h + EPS) {
        off.push(`${sym.code} (${sym.name}): relleno en [${b.x0}, ${b.y0}]-[${b.x1}, ${b.y1}] de caja ${w}x${h}`);
      }
    }
  }
  assert.deepEqual(off, [], `rellenos fuera de la caja y su margen:\n  ${off.join('\n  ')}`);
});

test('los interruptores 6019, 6020 y 5005-5008 quedan como llave simple', () => {
  const off: string[] = [];
  for (const code of [6019, 6020, 5005, 5006, 5007, 5008]) {
    const sym = FAMILY_SYMBOLS.find((s) => s.code === code);
    assert.ok(sym?.size, `el ${code} (interruptor / seccionador) debe declarar caja`);
    const { w, h } = sym.size;
    const shapes = shapesOf(code, w, h);
    const hooks = shapes.filter((s) => isHook(s.d)).length;
    const triangles = shapes.filter((s) => isTriangle(s.d)).length;
    const bodies = closedPolys(shapes).length;
    const fills = shapes.filter((s) => s.fill).length;
    if (hooks || triangles || bodies || fills) {
      off.push(`${code}: ${hooks} ganchos, ${triangles} triángulos, ${bodies} cuerpos, ${fills} rellenos`);
    }
  }
  assert.deepEqual(off, [], `los interruptores simples no llevan cuerpo ni disparo:\n  ${off.join('\n  ')}`);
});

test('el bbox de las formas cubre el arte que desborda la caja (S2c)', () => {
  const sym = FAMILY_SYMBOLS.find((s) => s.code === 6009);
  const size = sym?.size;
  assert.ok(size, 'el 6009 debe declarar caja');
  const b = shapesBounds(sym.shapes(size.w, size.h));
  assert.ok(b.minX < 0, `el accionamiento desborda a la izquierda, minX=${b.minX}`);
  assert.ok(b.maxX <= size.w + 0.01, `no desborda a la derecha, maxX=${b.maxX}`);
  assert.ok(b.maxY <= size.h + 0.01, `no desborda abajo, maxY=${b.maxY}`);
  assert.ok(b.minY >= -0.01, `no desborda arriba, minY=${b.minY}`);
});

/** `d` de un polígono cerrado, para reusar `bbox()` sobre puntos ya leídos. */
function pointsToD(pts: Pt[]): string {
  return `M${pts[0]!.x} ${pts[0]!.y}` + pts.slice(1).map((p) => `L${p.x} ${p.y}`).join('') + 'Z';
}
