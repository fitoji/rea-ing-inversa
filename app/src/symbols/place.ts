/**
 * Plantilla para insertar un componente que no aparece en ningún fixture real.
 *
 * Por qué existe: `templates.ts` sólo puede clonar bytes que CADe_SIMU escribió,
 * así que sólo cubre los códigos que aparecen en los archivos del repo. Para el
 * resto del catálogo (extraído del binario en `catalog.ts`) no hay muestra.
 *
 * Qué se hace entonces, sin inventar el formato de cero: se clona la forma de un
 * componente REAL con la misma cantidad de bornes y se reescriben sólo los
 * campos cuyo significado está verificado sobre los 66 componentes de los
 * fixtures:
 *
 *   - campos 0..7  -> flag 1 por cada borne declarado (verificado 66/66)
 *   - campos 8..9  -> x, y (GEOMETRY.x / GEOMETRY.y)
 *   - campos 12..15 -> offset y tamaño, escalados desde la plantilla base
 *
 * Los campos que el formato todavía no expone se heredan tal cual del base. Un
 * componente sintetizado conserva así la estructura de un registro que el CAD
 * escribió; lo único nuevo son código, designador, bornes y posición.
 */
import { GEOMETRY } from '../model/project.ts';
import { catalogFor } from './catalog.ts';
import { symbolFor, type SymbolDef } from './library.ts';
import { TEMPLATES } from './templates.ts';

/** Cantidad de bornes de cada plantilla base disponible. */
const BASES: { pins: number; code: number }[] = [
  { pins: 0, code: 3000 },
  { pins: 2, code: 7000 },
  { pins: 4, code: 1000 },
  { pins: 6, code: 2001 },
];

const PIN_SLOTS = 7;
const FIRST_PIN_SLOT = 3;
/** El registro real guarda hasta 7 bornes; la geometría usa 8 flags (el 8º queda en 0). */
const FLAG_SLOTS = 8;

/** Prefijo por familia cuando el catálogo no trae designador para el código. */
const GROUP_DESIGNATOR: Record<string, string> = {
  motor: '-M',
  potencia: '-KM',
  proteccion: '-F',
  mando: '-K',
  alimentacion: '',
  senalizacion: '-S',
  sensor: '-B',
  borne: '-X',
  carga: '-R',
  otro: '',
};

function baseFor(pinCount: number): number {
  const fit = BASES.find((b) => b.pins >= pinCount);
  return (fit ?? BASES[BASES.length - 1]!).code;
}

/** Plantilla lista para insertar: clonada si existe, sintetizada si no. */
export function templateForPlacement(code: number): string | undefined {
  const cloned = TEMPLATES[code]?.raw;
  if (cloned) return cloned;
  const sym = symbolFor(code);
  if (!sym) return undefined;
  return synthesize(sym);
}

/**
 * Construye el registro de un símbolo a partir de una plantilla real.
 *
 * Exportado para poder probarlo: con la forma de un registro real y sus mismos
 * bornes/tamaño debe devolver el mismo string, byte por byte.
 */
export function synthesize(
  sym: SymbolDef,
  opts: { baseCode?: number; designator?: string; size?: { w: number; h: number } } = {},
): string | undefined {
  const base = TEMPLATES[opts.baseCode ?? baseFor(sym.pins.length)];
  if (!base) return undefined;

  const slots = base.raw.split('#');
  if (slots.length < FIRST_PIN_SLOT + PIN_SLOTS + 2) return undefined;

  const pins = sym.pins.map((p) => p.name);
  const size = opts.size ?? sym.size ?? { w: 18, h: 15 };
  const prefix = catalogFor(sym.code)?.designator || GROUP_DESIGNATOR[sym.group] || '';
  const designator = opts.designator ?? (prefix === '' ? '' : `${prefix}1`);
  const geometry = slots[FIRST_PIN_SLOT + PIN_SLOTS]!
    .split('*')
    .filter((s) => s !== '')
    .map(Number);
  if (geometry.length <= GEOMETRY.height) return undefined;

  const baseW = geometry[GEOMETRY.width]!;
  const baseH = geometry[GEOMETRY.height]!;

  slots[0] = `*0*${sym.code}`;
  if (designator !== '') slots[1] = designator;
  for (let i = 0; i < PIN_SLOTS; i++) slots[FIRST_PIN_SLOT + i] = pins[i] ?? '';

  for (let i = 0; i < FLAG_SLOTS; i++) geometry[i] = i < pins.length ? 1 : 0;
  geometry[GEOMETRY.offsetX] = Math.round((geometry[GEOMETRY.offsetX]! * size.w) / baseW);
  geometry[GEOMETRY.offsetY] = Math.round((geometry[GEOMETRY.offsetY]! * size.h) / baseH);
  geometry[GEOMETRY.width] = size.w;
  geometry[GEOMETRY.height] = size.h;

  slots[FIRST_PIN_SLOT + PIN_SLOTS] = `*${geometry.join('*')}`;
  return slots.join('#');
}
