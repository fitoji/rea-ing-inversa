#!/usr/bin/env node
/**
 * Genera `src/symbols/catalog.ts`: la tabla real de componentes de CADe_SIMU.
 *
 * Por qué existe: el menú de componentes no puede inventarse. El catálogo vive
 * dentro de `CADe_SIMU.exe` como una cadena de comparaciones del tipo
 *
 *     81 3D <global32> <code32>   cmp dword ptr [global], code
 *     68 <ptr32>                  push offset "nombre"
 *
 * así que este script lee el binario, empareja cada código con el string que la
 * rama empuja y escribe la tabla. Es la única forma honesta de saber que el
 * código 9004 es "Temporizador a la conexión" y no una suposición por rango.
 *
 * Requiere `data/CADe_SIMU V4/CADe_SIMU.exe` (ignorado por git: software de
 * terceros). El archivo generado SÍ se commitea.
 *
 * Uso: node scripts/make-catalog.ts
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const EXE = join(HERE, '..', '..', 'data', 'CADe_SIMU V4', 'CADe_SIMU.exe');
const OUT = join(HERE, '..', 'src', 'symbols', 'catalog.ts');

/** Campos del objeto componente donde el binario guarda el nombre visible.
 *  La tabla no está en un solo campo: el binario escribe el nombre en campos
 *  distintos según la familia (potencia, sensores, lógica, neumática). */
const NAME_FIELDS = new Set([3436, 1004, 824, 3624]);
/** Campo donde guarda el designador por defecto (-M, -Q, ...). */
const DESIGNATOR_FIELD = null;

interface Section {
  va: number;
  vsize: number;
  raw: number;
  rsize: number;
}

interface Row {
  code: number;
  field: number | null;
  text: string;
}

function sections(buf: Buffer): { base: number; list: Section[] } {
  const pe = buf.readUInt32LE(0x3c);
  if (buf.toString('latin1', pe, pe + 4) !== 'PE\0\0') throw new Error('no es un PE');
  const count = buf.readUInt16LE(pe + 6);
  const optSize = buf.readUInt16LE(pe + 20);
  const base = buf.readUInt32LE(pe + 24 + 28);
  const list: Section[] = [];
  for (let i = 0; i < count; i++) {
    const o = pe + 24 + optSize + i * 40;
    const vsize = buf.readUInt32LE(o + 8);
    const va = buf.readUInt32LE(o + 12);
    const rsize = buf.readUInt32LE(o + 16);
    const raw = buf.readUInt32LE(o + 20);
    list.push({ va, vsize, raw, rsize });
  }
  return { base, list };
}

function main(): void {
  const buf = readFileSync(EXE);
  const { base, list } = sections(buf);

  const toOffset = (va: number): number | null => {
    const rva = va - base;
    for (const s of list) {
      if (rva >= s.va && rva < s.va + Math.max(s.vsize, s.rsize)) return s.raw + (rva - s.va);
    }
    return null;
  };

  const cstr = (va: number): string | null => {
    const off = toOffset(va);
    if (off === null || off >= buf.length) return null;
    const end = buf.indexOf(0, off);
    if (end < 0 || end - off < 2 || end - off > 80) return null;
    const raw = buf.subarray(off, end);
    const text = raw.toString('latin1').trim();
    if (!/^[\x20-\x7e\xa0-\xff]{2,}$/.test(text)) return null;
    return text;
  };

  const rows: Row[] = [];
  let i = 0;
  for (;;) {
    i = buf.indexOf(Buffer.from([0x81, 0x3d]), i);
    if (i < 0) break;
    const code = buf.readUInt32LE(i + 6);
    if (code < 1 || code > 200000) {
      i += 1;
      continue;
    }
    const window = buf.subarray(i + 10, i + 160);
    for (let k = 0; k < window.length - 5; k++) {
      if (window[k] !== 0x68) continue;
      const ptr = window.readUInt32LE(k + 1);
      if (ptr <= base || ptr > base + 0x4000000) continue;
      const text = cstr(ptr);
      if (!text) continue;
      // El campo destino aparece como `81 C1 <field32>` (add ecx, field).
      let field: number | null = null;
      for (let j = k; j < Math.min(k + 32, window.length - 6); j++) {
        if (window[j] === 0x81 && window[j + 1] === 0xc1) {
          field = window.readUInt32LE(j + 2);
          break;
        }
      }
      rows.push({ code, field, text });
      break;
    }
    i += 1;
  }

  // Un código puede aparecer varias veces (nombre, designador, variantes
  // desactivadas). Nos quedamos con el nombre más largo de cada campo.
  const names = new Map<number, string>();
  const designators = new Map<number, string>();
  // El campo de sensores mezcla nombres con comandos de dibujo ("TEXT,+020,…").
  const drawing = /^(TEXT|LINE|POLI|CIRCLE|ARC|RECT|DOT)[,(]/;
  const designatorShape = /^-[A-Za-z0-9]{1,4}$/;
  for (const r of rows) {
    if (r.field !== null && NAME_FIELDS.has(r.field)) {
      if (drawing.test(r.text)) continue;
      const prev = names.get(r.code);
      if (prev === undefined || r.text.length > prev.length) names.set(r.code, r.text);
      continue;
    }
    if (r.field === DESIGNATOR_FIELD && designatorShape.test(r.text)) {
      designators.set(r.code, r.text);
    }
  }

  const codes = [...names.keys()].sort((a, b) => a - b);
  const body = codes
    .map((code) => `  ${code}: { name: ${JSON.stringify(names.get(code))}, designator: ${JSON.stringify(designators.get(code) ?? '')} },`)
    .join('\n');

  writeFileSync(
    OUT,
    `// GENERADO por scripts/make-catalog.ts — no editar a mano.
// Catálogo real de componentes: código de CADe_SIMU -> nombre que muestra su
// menú. Sale del binario, no de una suposición por rango numérico.

export interface CatalogEntry {
  name: string;
  /** Prefijo de designador con el que el CAD nombra el componente nuevo. */
  designator: string;
}

export const CATALOG: Record<number, CatalogEntry> = {
${body}
};

export function catalogFor(code: number): CatalogEntry | undefined {
  return CATALOG[code];
}

export const CATALOG_CODES: number[] = Object.keys(CATALOG).map(Number).sort((a, b) => a - b);
`,
  );

  console.log(`escrito ${OUT}`);
  console.log(`  componentes en el catálogo: ${codes.length}`);
}

main();
