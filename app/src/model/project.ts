/**
 * Modelo de dominio de Electro-Simulador.
 *
 * Principio: el `Project` es una VISTA sobre los registros crudos del archivo,
 * no una reconstrucción. Cada registro conserva su texto original, y la
 * serialización concatena esos raw en orden. Consecuencias:
 *
 *  - abrir → modelar → serializar devuelve los mismos bytes siempre;
 *  - editar es reemplazar un registro, no regenerar el archivo;
 *  - un código desconocido nunca se pierde: sigue siendo un registro opaco.
 *
 * Layout de un registro de componente (12 campos al partir el raw por '#'):
 *   [0]  *<id>*<código>
 *   [1]  designador (texto libre: "-KM1", "KM1", "RELE", "ITM")
 *   [2]  vacío
 *   [3..] bornes, cantidad variable (6 en un contactor, U1/V1/W1/PE en un motor)
 *   [n]  geometría: 24 números, primer campo con '*' inicial
 *   [n+1] vacío (el raw termina en '#')
 */

import { parse } from '../format/cade.ts';
import type { CadeDocument, CadeRecord } from '../format/cade.ts';
import { CATALOG } from '../symbols/catalog.ts';

export type RecordKind = 'component' | 'connection' | 'text' | 'sheet-title' | 'config' | 'unknown';

/** Posiciones verificadas dentro del bloque de geometría (24 números). */
export const GEOMETRY = {
  x: 8,
  y: 9,
  x2: 10,
  y2: 11,
  offsetX: 12,
  offsetY: 13,
  width: 14,
  height: 15,
} as const;

/**
 * Color de la señalización óptica (códigos 9008 y 9009).
 *
 * El archivo guarda un índice, no un nombre: la cabecera del registro lleva un
 * token numérico justo después de los bornes (`#X1#X2#2#####`). El mapeo se
 * verificó sobre diez archivos de una sola lámpara guardados desde CADe_SIMU:
 * cada valor coincide con el color elegido en la app, en las dos familias.
 */
export const LAMP_COLORS = ['verde', 'rojo', 'amarillo', 'azul', 'gris'] as const;

export type LampColor = 0 | 1 | 2 | 3 | 4;

/** Códigos que llevan el slot de color: lámpara fija e intermitente. */
const LAMP_CODES = new Set([9008, 9009]);

export interface CadeRecordModel {
  id: number;
  code: number;
  kind: RecordKind;
  /** designador tal cual aparece, sin normalizar. Vacío si no tiene. */
  designator: string;
  /** bornes en orden de aparición, sin vacíos. Puede estar vacío. */
  pins: string[];
  /**
   * Color guardado de una lámpara (9008/9009). `null` en todo lo demás, y
   * también cuando el archivo trae un valor fuera de rango: preferimos no
   * pintar antes que inventar un color.
   */
  lampColor: LampColor | null;
  /** 24 números de geometría; [] si el registro no tiene bloque de geometría */
  geometry: number[];
  /** texto libre de las etiquetas (código 8) */
  text: string;
  /** texto original exacto del registro */
  raw: string;
}

export interface Sheet {
  index: number;
  /** rango de registros [start, end) dentro de project.records */
  startRecord: number;
  endRecord: number;
  /** registro del bloque de título, si la hoja lo tiene */
  titleBlock: CadeRecordModel | null;
}

export interface Project {
  hasMagic: boolean;
  prefix: string;
  /** registros en orden: fuente de verdad para serializar */
  records: CadeRecordModel[];
  sheets: Sheet[];
}

const WIRE_CODES = new Set([4000, 4001, 4002, 4003, 4004, 4009, 4010, 4018, 4019]);

const COMPONENT_CODES = new Set([
  1000, 2001, 3000, 3001, 3003, 3005, 6001, 6002, 6003, 6007, 6009, 7000, 7001, 8000, 8001, 8012,
  8013, 8016, 8017, 8018, 9000, 9003,
]);

export function classify(code: number): RecordKind {
  if (code === 8) return 'text';
  if (code === 20000) return 'sheet-title';
  if (code === 10501) return 'config';
  // Los cables viven en 4xxx, pero no todo 4xxx es un cable: las regletas y
  // conectores (4011-4017) son componentes con bornes.
  if (WIRE_CODES.has(code)) return 'connection';
  // El resto del catálogo (extraído del binario) son componentes dibujables.
  if (CATALOG[code] !== undefined) return 'component';
  if (COMPONENT_CODES.has(code)) return 'component';
  return 'unknown';
}

function splitNumbers(field: string): number[] {
  return field
    .split('*')
    .map((t) => t.trim())
    .filter((t) => t !== '')
    .map(Number)
    .filter((n) => Number.isFinite(n));
}

export function modelOfRecord(rec: CadeRecord): CadeRecordModel {
  const kind = classify(rec.code);
  const fields = rec.raw.split('#');
  const base: CadeRecordModel = {
    id: rec.id,
    code: rec.code,
    kind,
    designator: kind === 'text' ? '' : (fields[1] ?? ''),
    pins: [],
    lampColor: null,
    geometry: [],
    text: '',
    raw: rec.raw,
  };

  if (kind === 'text') {
    // el texto libre cierra el registro, pegado tras el último '#'
    base.text = rec.raw.slice(rec.raw.lastIndexOf('#') + 1);
    return base;
  }

  // El bloque de geometría empieza con '*', pero en los códigos con layout
  // extendido (11 textos, p. ej. 1052/10500..10550) el último texto queda
  // pegado al primer número: `...#EV1*1*1*...`. Buscamos el primer '*' dentro
  // del campo, no solo al inicio.
  let geoIdx = -1;
  let geoPrefix = '';
  for (let i = 1; i < fields.length; i++) {
    const star = fields[i].indexOf('*');
    if (star !== -1) {
      geoIdx = i;
      geoPrefix = fields[i].slice(0, star);
      break;
    }
  }
  if (geoIdx === -1) return base;

  const headerFields = fields.slice(2, geoIdx);
  if (geoPrefix !== '') headerFields.push(geoPrefix);
  const header = headerFields.filter((p) => p !== '');

  // Las lámparas cierran su cabecera con el índice de color. Ese token no es un
  // borne: si se deja en `pins`, el editor dibuja un pin fantasma al lado de X1
  // y X2. El mínimo de tres tokens protege a un registro sin bornes.
  if (LAMP_CODES.has(rec.code) && header.length >= 3) {
    const last = header.at(-1)!.trim();
    if (/^\d+$/.test(last)) {
      const color = Number(last);
      if (color >= 0 && color < LAMP_COLORS.length) {
        base.lampColor = color as LampColor;
        header.pop();
      }
    }
  }

  base.pins = header;
  base.geometry = splitNumbers(fields[geoIdx].slice(fields[geoIdx].indexOf('*')));
  return base;
}

export function buildProject(doc: CadeDocument): Project {
  const records = doc.records.map(modelOfRecord);

  const sheets: Sheet[] = [];
  let start = 0;
  records.forEach((rec, i) => {
    if (rec.kind !== 'sheet-title') return;
    sheets.push({ index: sheets.length, startRecord: start, endRecord: i + 1, titleBlock: rec });
    start = i + 1;
  });

  // Lo que queda después del último bloque de título pertenece a ESA hoja, no a
  // una nueva. Evidencia: `ej0def.cad` tiene su bloque de título en el registro
  // 14 y dieciséis registros dibujados después, sobre la misma página. El bloque
  // de título se escribe al guardar; seguir dibujando después es lo normal.
  //
  // Sin esto, cualquier registro agregado caía en una hoja sin título que no se
  // estaba mirando, y la edición parecía no haber hecho nada.
  if (start < records.length) {
    const last = sheets.at(-1);
    if (last) last.endRecord = records.length;
    else sheets.push({ index: 0, startRecord: 0, endRecord: records.length, titleBlock: null });
  }
  return { hasMagic: doc.hasMagic, prefix: doc.prefix, records, sheets };
}

export function serializeProject(project: Project): string {
  const magic = project.hasMagic ? 'CADe_SIMU' : '';
  return magic + project.prefix + project.records.map((r) => r.raw).join('');
}

/** Registros dibujables de una hoja: componentes y conexiones. */
export function drawablesOf(project: Project, sheet?: Sheet): CadeRecordModel[] {
  const slice = sheet ? project.records.slice(sheet.startRecord, sheet.endRecord) : project.records;
  return slice.filter((r) => r.kind === 'component' || r.kind === 'connection');
}

/** Solo componentes (sin cables ni uniones). */
export function componentsOf(project: Project, sheet?: Sheet): CadeRecordModel[] {
  return drawablesOf(project, sheet).filter((r) => r.kind === 'component');
}

export function componentsByCode(project: Project): Map<number, CadeRecordModel[]> {
  const byCode = new Map<number, CadeRecordModel[]>();
  for (const rec of project.records) {
    if (rec.kind !== 'component' && rec.kind !== 'connection') continue;
    const list = byCode.get(rec.code) ?? [];
    list.push(rec);
    byCode.set(rec.code, list);
  }
  return byCode;
}

export interface WirePoints {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

/** Puntos de un cable/segmento. `null` si el registro no define un segundo punto. */
export function wirePoints(rec: CadeRecordModel): WirePoints | null {
  if (rec.kind !== 'connection') return null;
  const g = rec.geometry;
  if (g.length <= GEOMETRY.y2) return null;
  const pts = { x1: g[GEOMETRY.x], y1: g[GEOMETRY.y], x2: g[GEOMETRY.x2], y2: g[GEOMETRY.y2] };
  if (pts.x1 === pts.x2 && pts.y1 === pts.y2) return null;
  return pts;
}

/** Anchura y altura declaradas de un componente. `null` si no aplica. */
export function boxOf(rec: CadeRecordModel): { width: number; height: number } | null {
  const g = rec.geometry;
  if (g.length <= GEOMETRY.height) return null;
  const width = g[GEOMETRY.width];
  const height = g[GEOMETRY.height];
  if (width <= 0 || height <= 0) return null;
  return { width, height };
}

// --- edición -----------------------------------------------------------------
//
// Editar es reescribir UN registro, nunca regenerar el archivo. Estas funciones
// devuelven el `raw` nuevo y dejan intacto todo lo que no tocaron.

/** Índice del campo de geometría dentro de la lista de campos separada por `#`. */
function geometryFieldIndex(raw: string): number {
  const fields = raw.split('#');
  return fields.findIndex((f, i) => i > 0 && f.includes('*'));
}

/** Devuelve `raw` con el bloque de geometría reemplazado por `geometry`. */
export function withGeometry(rec: CadeRecordModel, geometry: number[]): string {
  const idx = geometryFieldIndex(rec.raw);
  if (idx === -1) return rec.raw;
  const fields = rec.raw.split('#');
  const star = fields[idx].indexOf('*');
  // Preserva el texto que precede al bloque en el layout extendido.
  fields[idx] = fields[idx].slice(0, star) + '*' + geometry.join('*');
  return fields.join('#');
}

/** Devuelve `raw` con el id reemplazado. */
export function withId(rec: CadeRecordModel, id: number): string {
  const m = /^\*(\d+)\*/.exec(rec.raw);
  if (!m) return rec.raw;
  return '*'.concat(String(id), rec.raw.slice(m[0].length - 1));
}

export function withPosition(rec: CadeRecordModel, x: number, y: number): string {
  const g = [...rec.geometry];
  if (g.length <= GEOMETRY.y) return rec.raw;
  g[GEOMETRY.x] = x;
  g[GEOMETRY.y] = y;
  return withGeometry(rec, g);
}

export function withWirePoints(rec: CadeRecordModel, pts: WirePoints): string {
  const g = [...rec.geometry];
  if (g.length <= GEOMETRY.y2) return rec.raw;
  g[GEOMETRY.x] = pts.x1;
  g[GEOMETRY.y] = pts.y1;
  g[GEOMETRY.x2] = pts.x2;
  g[GEOMETRY.y2] = pts.y2;
  return withGeometry(rec, g);
}

/**
 * Serializa reemplazando los registros indicados.
 *
 * Se indexa por posición dentro de `project.records`, que es 1:1 con el orden
 * del archivo. Todo registro ausente del mapa se escribe tal cual.
 */
export function serializeWith(project: Project, edits: Map<number, string>): string {
  const magic = project.hasMagic ? 'CADe_SIMU' : '';
  const parts: string[] = [];
  project.records.forEach((rec, i) => parts.push(edits.get(i) ?? rec.raw));
  return magic + project.prefix + parts.join('');
}

/** Id libre siguiente: los ids del archivo son estrictamente crecientes. */
export function nextId(project: Project): number {
  return project.records.reduce((max, r) => Math.max(max, r.id), 0) + 1;
}

/** Caja ocupada por un componente en coordenadas de hoja. */
export function boundsOf(rec: CadeRecordModel): { x: number; y: number; w: number; h: number } | null {
  const box = boxOf(rec);
  if (!box) return null;
  return { x: rec.geometry[GEOMETRY.x]!, y: rec.geometry[GEOMETRY.y]!, w: box.width, h: box.height };
}

/**
 * Invariante de compatibilidad: el texto se puede abrir y volver a serializar
 * sin cambiar un byte. Es la garantía que sostiene el ida y vuelta con
 * CADe_SIMU; si falla, guardar rompería el archivo.
 */
export function roundTrips(text: string): boolean {
  try {
    return serializeProject(buildProject(parse(text))) === text;
  } catch {
    return false;
  }
}
