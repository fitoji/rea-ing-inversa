#!/usr/bin/env node
/**
 * Genera `src/symbols/templates.ts`: una plantilla real por código de componente.
 *
 * "Colocar un componente" no puede inventar bytes. El formato tiene 23 campos
 * de geometría cuyo significado completo todavía no conocemos, así que la única
 * forma honesta de crear un registro nuevo es clonar uno que CADe_SIMU escribió.
 *
 * Las plantillas salen de los fixtures reales del repo, no de suposiciones.
 *
 * Uso: node scripts/make-templates.ts
 */
import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parse } from '../src/format/cade.ts';
import { buildProject } from '../src/model/project.ts';

const HERE = dirname(fileURLToPath(import.meta.url));
const FIXTURES = join(HERE, '..', 'test', 'fixtures');
const OUT = join(HERE, '..', 'src', 'symbols', 'templates.ts');

const templates = new Map<number, { raw: string; source: string }>();

for (const name of readdirSync(FIXTURES).filter((f) => /\.(cade|cad)$/i.test(f)).sort()) {
  const text = readFileSync(join(FIXTURES, name), 'latin1');
  for (const rec of buildProject(parse(text)).records) {
    if (rec.kind !== 'component') continue;
    if (templates.has(rec.code)) continue;
    templates.set(rec.code, { raw: rec.raw, source: name });
  }
}

const entries = [...templates.entries()].sort((a, b) => a[0] - b[0]);

const body = entries
  .map(([code, { raw, source }]) => `  ${code}: { raw: ${JSON.stringify(raw)}, source: ${JSON.stringify(source)} },`)
  .join('\n');

writeFileSync(
  OUT,
  `// GENERADO por scripts/make-templates.ts — no editar a mano.
// Plantillas crudas tomadas de fixtures reales. Editar invalida la garantía de
// que "agregar componente" clona bytes que CADe_SIMU escribió.

export interface Template {
  raw: string;
  source: string;
}

export const TEMPLATES: Record<number, Template> = {
${body}
};

export function templateFor(code: number): string | undefined {
  return TEMPLATES[code]?.raw;
}

export const TEMPLATE_CODES: number[] = Object.keys(TEMPLATES).map(Number).sort((a, b) => a - b);
`,
);

console.log(`escrito ${OUT}`);
console.log(`  códigos con plantilla: ${entries.length}`);
console.log(`  ${entries.map(([c]) => c).join(', ')}`);
