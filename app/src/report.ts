#!/usr/bin/env node
/**
 * Inventario de códigos de un archivo CADe_SIMU.
 * Uso: node app/src/report.ts <archivo.cade> [...]
 */
import { readFileSync } from 'node:fs';
import { basename } from 'node:path';
import { parse, codeInventory } from './format/cade.ts';

const files = process.argv.slice(2);
if (files.length === 0) {
  console.error('uso: node app/src/report.ts <archivo.cade> [...]');
  process.exit(1);
}

for (const file of files) {
  const doc = parse(readFileSync(file, 'latin1'));
  console.log(`\n=== ${basename(file)} ===`);
  console.log(`registros: ${doc.records.length} | magic: ${doc.hasMagic} | prefijo: ${doc.prefix.length} bytes`);
  for (const stat of codeInventory(doc)) {
    const names = stat.designators.slice(0, 8).join(' ');
    const layouts = stat.layouts.length === 1 && stat.layouts[0] === 11 ? '' : `  layouts=${stat.layouts.join('/')}`;
    console.log(
      `  ${String(stat.code).padStart(6)}  ×${String(stat.count).padStart(3)}  ${names || '(sin designador)'}${layouts}`,
    );
  }
}
