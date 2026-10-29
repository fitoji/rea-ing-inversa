/**
 * Modelo de dominio de simuElectro.
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

import type { CadeDocument, CadeRecord } from '../format/cade.ts';

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

export interface CadeRecordModel {
  id: number;
  code: number;
  kind: RecordKind;
  /** designador tal cual aparece, sin normalizar. Vacío si no tiene. */
  designator: string;
  /** bornes en orden de aparición, sin vacíos. Puede estar vacío. */
  pins: string[];
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

const COMPONENT_CODES = new Set([
  1000, 2001, 3000, 3001, 3003, 3005, 6001, 6002, 6003, 6007, 6009, 7000, 7001, 8000, 8001, 8012,
  8013, 8016, 8017, 8018, 9000, 9003,
]);

export function classify(code: number): RecordKind {
  if (code === 8) return 'text';
  if (code === 20000) return 'sheet-title';
  if (code === 10501) return 'config';
  if (COMPONENT_CODES.has(code)) return 'component';
  if (code >= 4000 && code < 5000) return 'connection';
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

function parseRecord(rec: CadeRecord): CadeRecordModel {
  const kind = classify(rec.code);
  const fields = rec.raw.split('#');
  const base: CadeRecordModel = {
    id: rec.id,
    code: rec.code,
    kind,
    designator: kind === 'text' ? '' : (fields[1] ?? ''),
    pins: [],
    geometry: [],
    text: '',
    raw: rec.raw,
  };

  if (kind === 'text') {
    // el texto libre cierra el registro, pegado tras el último '#'
    base.text = rec.raw.slice(rec.raw.lastIndexOf('#') + 1);
    return base;
  }

  const geoIdx = fields.findIndex((f, i) => i > 0 && f.startsWith('*'));
  if (geoIdx === -1) return base;

  base.pins = fields.slice(2, geoIdx).filter((p) => p !== '');
  base.geometry = splitNumbers(fields[geoIdx]);
  return base;
}

export function buildProject(doc: CadeDocument): Project {
  const records = doc.records.map(parseRecord);

  const sheets: Sheet[] = [];
  let start = 0;
  records.forEach((rec, i) => {
    if (rec.kind !== 'sheet-title') return;
    sheets.push({ index: sheets.length, startRecord: start, endRecord: i + 1, titleBlock: rec });
    start = i + 1;
  });
  if (start < records.length) {
    sheets.push({ index: sheets.length, startRecord: start, endRecord: records.length, titleBlock: null });
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
