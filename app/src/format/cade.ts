/**
 * Parser del formato CADe_SIMU (.cade / .cad).
 *
 * El archivo es texto plano. Los registros empiezan con `*<id>*<codigo>#`, pero
 * ese patrón también aparece en la cola de la geometría de un componente
 * (`...*4*5#`) y dentro de bloques de texto libre. Anclar a segmentos no alcanza
 * porque una etiqueta de texto (código 8) termina pegada al registro siguiente.
 *
 * Discriminante real: los ids de registro los asigna la app de forma
 * estrictamente creciente. Se toman todos los candidatos y se elige la
 * subsecuencia creciente más larga: los registros reales son, por lejos, la
 * cadena dominante. Los falsos positivos quedan afuera.
 *
 * La serialización concatena los raw tal cual: lossless por construcción.
 */

export const MAGIC = 'CADe_SIMU';

const CANDIDATE = /\*(\d+)\*(\d+)#/g;

export interface CadeRecord {
  index: number;
  id: number;
  code: number;
  /** offset absoluto del inicio del registro dentro del texto completo */
  at: number;
  /** texto original exacto del registro */
  raw: string;
  /** segmentos del registro separados por '#' */
  fields: string[];
  /** primer segmento posterior al id/código (designador, o vacío) */
  designator: string;
}

export interface CadeDocument {
  hasMagic: boolean;
  /** texto entre el magic y el primer registro */
  prefix: string;
  records: CadeRecord[];
}

interface Candidate {
  at: number;
  id: number;
  code: number;
}

/** Subsecuencia estrictamente creciente más larga sobre `id`. */
function longestIncreasing(cands: Candidate[]): Candidate[] {
  const ids = cands.map((c) => c.id);
  const prev = new Array<number>(ids.length).fill(-1);
  const tails: number[] = [];

  for (let i = 0; i < ids.length; i++) {
    let lo = 0;
    let hi = tails.length;
    while (lo < hi) {
      const mid = (lo + hi) >> 1;
      if (ids[tails[mid]] < ids[i]) lo = mid + 1;
      else hi = mid;
    }
    prev[i] = lo > 0 ? tails[lo - 1] : -1;
    tails[lo] = i;
  }

  const chain: Candidate[] = [];
  let cursor = tails.at(-1) ?? -1;
  while (cursor !== -1) {
    chain.push(cands[cursor]);
    cursor = prev[cursor];
  }
  return chain.reverse();
}

export function parse(text: string): CadeDocument {
  const hasMagic = text.startsWith(MAGIC);
  const body = hasMagic ? text.slice(MAGIC.length) : text;

  const candidates: Candidate[] = [];
  // Posiciones de '#' precomputadas una sola vez. Antes se copiaba el resto del
  // documento por cada candidato para contarlas, y eso hacía el parseo
  // cuadrático (medido: 87 ms con 4000 registros, 343 ms con 8000).
  const hashes: number[] = [];
  for (let h = body.indexOf('#'); h !== -1; h = body.indexOf('#', h + 1)) hashes.push(h);
  let nextHash = 0;

  for (const m of body.matchAll(CANDIDATE)) {
    const at = m.index!;
    // Los candidatos llegan en orden creciente, así que el puntero solo avanza.
    while (nextHash < hashes.length && hashes[nextHash] < at) nextHash++;
    // Un registro real tiene, como mínimo, cabecera + designador + geometría:
    // al menos dos '#'. El final de una geometría puede imitar `*id*codigo#`
    // (`...*0*15*16#`) y quedarse con un solo '#' hasta el final del texto; sin
    // este filtro, en un documento corto se toma como un registro aparte.
    if (hashes.length - nextHash < 2) continue;
    candidates.push({ at, id: Number(m[1]), code: Number(m[2]) });
  }

  // Un id repetido solo aparece cuando la cola de una geometría imita una
  // cabecera (`...*6*5#`). Entre dos candidatos con el mismo id gana el que
  // parece un registro real: código distinto de las colas típicas (0/5) y
  // mayor extensión hasta el próximo candidato.
  const scored = candidates.map((c, i) => ({
    ...c,
    span: (candidates[i + 1]?.at ?? body.length) - c.at,
  }));
  const bestById = new Map<number, (typeof scored)[number]>();
  const score = (c: (typeof scored)[number]): number => (c.code === 0 || c.code === 5 ? 0 : 1_000_000) + c.span;
  for (const c of scored) {
    const prev = bestById.get(c.id);
    if (!prev || score(c) > score(prev)) bestById.set(c.id, c);
  }
  const unique = [...bestById.values()].sort((a, b) => a.at - b.at);

  // Invariante verificada en las tres muestras: el primer registro empieza
  // exactamente donde termina el magic. Anclarlo evita que un `...*0*0#` de la
  // geometría empate en longitud con la cadena real y se lleve el primer lugar.
  const anchored = unique.find((c) => c.at === 0);
  const pool = anchored ? unique.filter((c) => c.at > 0 && c.id > anchored.id) : unique;
  const starts = anchored ? [anchored, ...longestIncreasing(pool)] : longestIncreasing(pool);
  const prefix = body.slice(0, starts[0]?.at ?? body.length);

  const records: CadeRecord[] = starts.map((s, i) => {
    const end = starts[i + 1]?.at ?? body.length;
    const raw = body.slice(s.at, end);
    const fields = raw.split('#');
    return {
      index: i,
      id: s.id,
      code: s.code,
      at: s.at,
      raw,
      fields,
      designator: fields[1] ?? '',
    };
  });

  return { hasMagic, prefix, records };
}

export function serialize(doc: CadeDocument): string {
  return (doc.hasMagic ? MAGIC : '') + doc.prefix + doc.records.map((r) => r.raw).join('');
}

export interface CodeStat {
  code: number;
  count: number;
  designators: string[];
  layouts: number[];
}

/** Inventario de códigos con designadores asociados (evidencia empírica). */
export function codeInventory(doc: CadeDocument): CodeStat[] {
  const byCode = new Map<number, CodeStat>();
  for (const rec of doc.records) {
    const stat = byCode.get(rec.code) ?? { code: rec.code, count: 0, designators: [], layouts: [] };
    stat.count += 1;
    const span = rec.fields.length;
    if (!stat.layouts.includes(span)) stat.layouts.push(span);
    if (rec.designator && !stat.designators.includes(rec.designator)) {
      stat.designators.push(rec.designator);
    }
    byCode.set(rec.code, stat);
  }
  return [...byCode.values()].sort((a, b) => b.count - a.count || a.code - b.code);
}
