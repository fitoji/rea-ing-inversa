/**
 * Inventario completo de símbolos del proyecto.
 *
 * Guarda en `docs/re/componentes-completo.md` todo lo que la app sabe dibujar,
 * separando lo que pertenece al catálogo de CADe_SIMU de los extras propios y
 * de los importados de QElectroTech. Sirve antes de filtrar la paleta.
 */
import { writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { symbolList, lineList } from '../src/symbols/library.ts';
import { CATALOG } from '../src/symbols/catalog.ts';
import { QET_SYMBOLS } from '../src/symbols/qet.ts';

const HERE = dirname(fileURLToPath(import.meta.url));
const OUT = join(HERE, '../../docs/re/componentes-completo.md');

const all = [...symbolList(), ...lineList()];
const inCatalog = all.filter((s) => CATALOG[s.code]).sort((a, b) => a.code - b.code);
const extras = all.filter((s) => !CATALOG[s.code]).sort((a, b) => a.code - b.code);
const qetExtra = Object.keys(QET_SYMBOLS)
  .map(Number)
  .filter((code) => !CATALOG[code])
  .sort((a, b) => a - b);

const rows = (list: typeof all): string =>
  list.map((s) => `| \`${s.code}\` | ${s.name} | ${s.group} |`).join('\n');

const md = `# Componentes del proyecto (inventario completo)

> Guardado antes de filtrar la paleta a solo CADe_SIMU.
> Generado con \`node scripts/make-inventory.ts\`.

## En el catálogo CADe_SIMU (${inCatalog.length})

| Código | Nombre | Grupo |
|---|---|---|
${rows(inCatalog)}

## Extras del proyecto, no están en CADe_SIMU (${extras.length})

| Código | Nombre | Grupo |
|---|---|---|
${rows(extras)}

## Extras importados de QElectroTech (${qetExtra.length})

${qetExtra.length > 0 ? qetExtra.map((c) => `- \`${c}\``).join('\n') : '- (ninguno)'}
`;

writeFileSync(OUT, md, 'utf8');
console.log(`inventario: ${inCatalog.length} CADe_SIMU, ${extras.length} extras, ${qetExtra.length} QET`);
