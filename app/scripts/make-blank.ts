#!/usr/bin/env node
/**
 * Genera `src/format/blank.ts`: el documento con el que arranca un proyecto nuevo.
 *
 * Por qué no se escribe a mano: el bloque de título (código 20000) es un registro
 * real de CADe_SIMU con 39 campos posicionales. Inventarlo sería adivinar; se
 * clona uno de los fixtures y se neutralizan sólo los campos que identifican al
 * archivo de origen (nombre del proyecto y fecha), que el CAD reescribe al
 * guardar.
 *
 * Uso: node scripts/make-blank.ts
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parse } from '../src/format/cade.ts';

const HERE = dirname(fileURLToPath(import.meta.url));
const SOURCE = join(HERE, '..', 'test', 'fixtures', 'arranque-paro-motor-3f.cad');
const OUT = join(HERE, '..', 'src', 'format', 'blank.ts');

/** Posición del campo de fecha y del nombre del proyecto dentro del bloque. */
const DATE_TOKEN = 18;
const NAME_TOKEN = 21;
const NAME_WIDTH = 21;

const doc = parse(readFileSync(SOURCE, 'latin1'));
const title = doc.records.find((r) => r.code === 20000);
if (!title) throw new Error('el fixture no tiene bloque de título');

const fields = title.raw.split('#');
fields[0] = '*0*20000';
const tail = fields[11]!.split('*');
if (tail.length <= NAME_TOKEN) throw new Error('bloque de título con forma inesperada');
tail[DATE_TOKEN] = '@DATE@';
tail[NAME_TOKEN] = ' '.repeat(NAME_WIDTH);
fields[11] = tail.join('*');

writeFileSync(
  OUT,
  `// GENERADO por scripts/make-blank.ts — no editar a mano.
// Hoja en blanco: el bloque de título es un registro real de CADe_SIMU con el
// id en 0 y sin nombre de proyecto ni fecha (el CAD los reescribe al guardar).

const SHEET_TITLE = ${JSON.stringify(fields.join('#'))};

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** Misma fecha que escribe CADe_SIMU: DD-Mon-YYYY. */
export function cadeDate(now: Date): string {
  const day = String(now.getDate()).padStart(2, '0');
  return \`\${day}-\${MONTHS[now.getMonth()]}-\${now.getFullYear()}\`;
}

/** Documento nuevo: cabecera + una hoja vacía con su bloque de título. */
export function blankDocument(now: Date = new Date()): string {
  return 'CADe_SIMU' + SHEET_TITLE.replace('@DATE@', cadeDate(now));
}
`,
);

console.log(`escrito ${OUT}`);
