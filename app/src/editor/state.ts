/**
 * Estado del editor.
 *
 * Decisión central: la fuente de verdad es el TEXTO. Todo estado editable se
 * deriva de él, y cada operación produce un texto nuevo. Ventajas:
 *
 *  - el invariante de round-trip sigue siendo ejecutable: si una operación
 *    puede producir un texto que no re-parsea igual, es un bug del editor;
 *  - undo/redo es guardar textos, no un log de operaciones inversas que puede
 *    desincronizarse del modelo;
 *  - ninguna edición puede "inventar" campos: sólo reescribe el registro que
 *    tocó.
 *
 * La rotación es la única excepción y está marcada como tal: es visual, no se
 * persiste, porque el formato todavía no expuso el campo de orientación.
 */

import { parse } from '../format/cade.ts';
import {
  buildProject,
  modelOfRecord,
  nextId,
  serializeWith,
  withId,
  withPosition,
  withWirePoints,
  wirePoints,
  boundsOf,
  type CadeRecordModel,
  type Project,
} from '../model/project.ts';

export type Rotation = 0 | 90 | 180 | 270;

export interface EditorState {
  text: string;
  past: string[];
  future: string[];
  /** ids de registros seleccionados */
  selection: number[];
  /** rotación visual por id (no persistida) */
  rotation: Record<number, Rotation>;
  clipboard: string[];
  dirty: boolean;
}

const HISTORY_LIMIT = 100;

export function createEditor(text: string): EditorState {
  return { text, past: [], future: [], selection: [], rotation: {}, clipboard: [], dirty: false };
}

export function projectOf(state: EditorState): Project {
  return buildProject(parse(state.text));
}

function commit(state: EditorState, text: string, selection = state.selection): EditorState {
  if (text === state.text) return state;
  // Guarda de cordura: un texto que no re-parsea con la misma longitud de
  // registros es una edición corrupta y no debe entrar al historial.
  const before = parse(state.text).records.length;
  const after = parse(text).records.length;
  if (Math.abs(after - before) > 1) {
    throw new Error(`edición inválida: registros ${before} -> ${after}`);
  }
  const past = [...state.past, state.text].slice(-HISTORY_LIMIT);
  return { ...state, text, past, future: [], selection, dirty: true };
}

// --- historial ---------------------------------------------------------------

export function undo(state: EditorState): EditorState {
  const prev = state.past.at(-1);
  if (prev === undefined) return state;
  return {
    ...state,
    text: prev,
    past: state.past.slice(0, -1),
    future: [state.text, ...state.future].slice(0, HISTORY_LIMIT),
    selection: state.selection.filter((id) => parseRecordIds(prev).has(id)),
  };
}

export function redo(state: EditorState): EditorState {
  const next = state.future[0];
  if (next === undefined) return state;
  return {
    ...state,
    text: next,
    past: [...state.past, state.text].slice(-HISTORY_LIMIT),
    future: state.future.slice(1),
    selection: state.selection.filter((id) => parseRecordIds(next).has(id)),
  };
}

function parseRecordIds(text: string): Set<number> {
  return new Set(parse(text).records.map((r) => r.id));
}

// --- selección ---------------------------------------------------------------

export function select(state: EditorState, ids: number[], additive = false): EditorState {
  if (!additive) return { ...state, selection: [...new Set(ids)] };
  const set = new Set(state.selection);
  for (const id of ids) {
    if (set.has(id)) set.delete(id);
    else set.add(id);
  }
  return { ...state, selection: [...set] };
}

export function clearSelection(state: EditorState): EditorState {
  return state.selection.length === 0 ? state : { ...state, selection: [] };
}

export function selectedRecords(state: EditorState): CadeRecordModel[] {
  const set = new Set(state.selection);
  return projectOf(state).records.filter((r) => set.has(r.id));
}

// --- operaciones sobre registros --------------------------------------------

interface IndexedRecord {
  index: number;
  rec: CadeRecordModel;
}

function indexed(project: Project): IndexedRecord[] {
  return project.records.map((rec, index) => ({ index, rec }));
}

/**
 * Mueve la selección.
 *
 * Los cables cuyo extremo cae dentro de la caja de un componente movido viajan
 * con él. Es una regla PROVISIONAL por proximidad geométrica — la unión real
 * pin↔cable llega en la fase 3. Sin ella, arrastrar deja los cables atrás y el
 * resultado se lee como roto.
 */
export function moveSelection(state: EditorState, dx: number, dy: number): EditorState {
  if (state.selection.length === 0 || (dx === 0 && dy === 0)) return state;
  const project = projectOf(state);
  const selected = new Set(state.selection);
  const boxes = indexed(project)
    .filter(({ rec }) => selected.has(rec.id) && rec.kind === 'component')
    .map(({ rec }) => boundsOf(rec))
    .filter((b): b is NonNullable<typeof b> => b !== null);

  const edits = new Map<number, string>();

  for (const { index, rec } of indexed(project)) {
    if (selected.has(rec.id) && rec.kind === 'component') {
      const b = boundsOf(rec);
      if (!b) continue;
      edits.set(index, withPosition(rec, b.x + dx, b.y + dy));
      continue;
    }
    if (rec.kind !== 'connection') continue;
    const pts = wirePoints(rec);
    if (!pts) continue;

    const inside = (x: number, y: number): boolean =>
      boxes.some((b) => x >= b.x - 4 && x <= b.x + b.w + 4 && y >= b.y - 4 && y <= b.y + b.h + 4);

    const moveA = inside(pts.x1, pts.y1);
    const moveB = inside(pts.x2, pts.y2);
    if (!moveA && !moveB) continue;

    edits.set(
      index,
      withWirePoints(rec, {
        x1: moveA ? pts.x1 + dx : pts.x1,
        y1: moveA ? pts.y1 + dy : pts.y1,
        x2: moveB ? pts.x2 + dx : pts.x2,
        y2: moveB ? pts.y2 + dy : pts.y2,
      }),
    );
  }

  return commit(state, serializeWith(project, edits));
}

export function rotateSelection(state: EditorState): EditorState {
  if (state.selection.length === 0) return state;
  const rotation = { ...state.rotation };
  for (const id of state.selection) {
    const current = rotation[id] ?? 0;
    rotation[id] = (((current + 90) % 360) as Rotation);
  }
  return { ...state, rotation, dirty: true };
}

export function deleteSelection(state: EditorState): EditorState {
  if (state.selection.length === 0) return state;
  const project = projectOf(state);
  const selected = new Set(state.selection);
  const removable = new Set(
    project.records
      .filter((r) => selected.has(r.id) && (r.kind === 'component' || r.kind === 'connection'))
      .map((r) => r.id),
  );
  if (removable.size === 0) return state;

  const magic = project.hasMagic ? 'CADe_SIMU' : '';
  const text = magic + project.prefix + project.records.filter((r) => !removable.has(r.id)).map((r) => r.raw).join('');
  const rotation = { ...state.rotation };
  for (const id of removable) delete rotation[id];
  return { ...commit(state, text, []), rotation };
}

export function copySelection(state: EditorState): EditorState {
  const selected = new Set(state.selection);
  const clipboard = projectOf(state)
    .records.filter((r) => selected.has(r.id) && (r.kind === 'component' || r.kind === 'connection'))
    .map((r) => r.raw);
  return { ...state, clipboard };
}

/**
 * Pega al final del archivo.
 *
 * El formato exige ids estrictamente crecientes en orden de archivo, así que no
 * se puede insertar en el medio sin renumerar todo lo posterior. Pegar al final
 * es la única posición segura; el registro nuevo queda en la última hoja.
 */
export function paste(state: EditorState, dx = 8, dy = 8): EditorState {
  if (state.clipboard.length === 0) return state;
  const project = projectOf(state);
  let id = nextId(project);
  const appended: string[] = [];
  const added: number[] = [];

  for (const raw of state.clipboard) {
    const template = project.records.find((r) => r.raw === raw) ?? parseOne(raw);
    if (!template) continue;
    let next = withId(template, id);
    if (template.kind === 'component') {
      const b = boundsOf(template);
      if (b) next = withPosition({ ...template, raw: next }, b.x + dx, b.y + dy);
    } else {
      const pts = wirePoints(template);
      if (pts) {
        next = withWirePoints({ ...template, raw: next }, {
          x1: pts.x1 + dx,
          y1: pts.y1 + dy,
          x2: pts.x2 + dx,
          y2: pts.y2 + dy,
        });
      }
    }
    appended.push(next);
    added.push(id);
    id += 1;
  }

  if (appended.length === 0) return state;
  const magic = project.hasMagic ? 'CADe_SIMU' : '';
  const text = magic + project.prefix + project.records.map((r) => r.raw).join('') + appended.join('');
  return commit(state, text, added);
}

/**
 * Modela UN registro a partir de su texto completo.
 *
 * No alcanza con `parse(raw).records[0]`: la cola de la geometría puede imitar
 * una cabecera (`*15*16#`), y el parser cortaría el registro ahí perdiendo los
 * últimos campos. Cuando el llamador ya sabe que `raw` ES un registro entero,
 * se modela esa totalidad.
 */
function parseOne(raw: string): CadeRecordModel | null {
  const first = parse(raw).records[0];
  if (!first) return null;
  const fields = raw.split('#');
  return modelOfRecord({
    ...first,
    at: 0,
    raw,
    fields,
    designator: fields[1] ?? '',
  });
}

/** Inserta un componente nuevo a partir de una plantilla real del archivo. */
export function addComponent(state: EditorState, templateRaw: string, x: number, y: number): EditorState {
  const project = projectOf(state);
  const id = nextId(project);
  const template = parseOne(templateRaw);
  if (!template || template.kind !== 'component') return state;
  const raw = withPosition({ ...template, raw: withId(template, id) }, Math.round(x), Math.round(y));
  const magic = project.hasMagic ? 'CADe_SIMU' : '';
  const text = magic + project.prefix + project.records.map((r) => r.raw).join('') + raw;
  return commit(state, text, [id]);
}

/** Renombra el designador del único registro seleccionado. */
export function setDesignator(state: EditorState, id: number, designator: string): EditorState {
  const project = projectOf(state);
  const entry = indexed(project).find(({ rec }) => rec.id === id);
  if (!entry || entry.rec.kind === 'text') return state;
  const fields = entry.rec.raw.split('#');
  if (fields.length < 2) return state;
  fields[1] = designator;
  const edits = new Map([[entry.index, fields.join('#')]]);
  return commit(state, serializeWith(project, edits));
}
