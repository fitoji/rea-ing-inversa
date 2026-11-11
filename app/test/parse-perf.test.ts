import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parse } from '../src/format/cade.ts';
import { createEditor, projectOf } from '../src/editor/state.ts';

const FIXTURES = join(dirname(fileURLToPath(import.meta.url)), 'fixtures');

/** Documento sintético con ids estrictamente crecientes, como los escribe la app. */
function synthetic(records: number): string {
  const parts: string[] = [];
  for (let i = 1; i <= records; i++) {
    // Cabecera `*id*codigo#` seguida de designador y geometría. Ninguna cola de
    // la geometría imita una cabecera: el `*` va antes del `#` final.
    const x = (i % 97) * 6;
    const y = (i % 61) * 6;
    parts.push(`*${i}*8000#K${i}*1*1*${x}*${y}*0*#`);
  }
  return parts.join('');
}

function median(fn: () => unknown, runs = 9): number {
  fn();
  const samples: number[] = [];
  for (let i = 0; i < runs; i++) {
    const started = performance.now();
    fn();
    samples.push(performance.now() - started);
  }
  samples.sort((a, b) => a - b);
  return samples[Math.floor(samples.length / 2)];
}

test('parse escala lineal con el tamaño del documento', () => {
  const small = synthetic(4000);
  const large = synthetic(8000);
  assert.equal(parse(large).records.length, 8000, 'parsea todos los registros del sintético');

  const smallMs = median(() => parse(small));
  const largeMs = median(() => parse(large));
  const ratio = largeMs / smallMs;

  // Cuadrático da ~4.0 (87 ms → 343 ms medido); lineal da ~2.0. El umbral 3.2
  // separa los dos regímenes sin depender de la velocidad de la máquina; con
  // tiempos absolutos de pocos ms el jitter del disco llega a ~3.3 con
  // medianas cortas, así que hay 9 corridas y margen extra.
  assert.ok(
    ratio < 3.2,
    `duplicar el documento multiplicó el tiempo por ${ratio.toFixed(2)} (${smallMs.toFixed(1)} → ${largeMs.toFixed(1)} ms)`,
  );
});

test('projectOf memoiza por identidad de texto', () => {
  const name = readdirSync(FIXTURES).find((f) => f.endsWith('.cade'))!;
  const text = readFileSync(join(FIXTURES, name), 'latin1');
  const state = createEditor(text);

  const first = projectOf(state);
  const second = projectOf(state);
  assert.equal(first, second, 'el mismo texto debe devolver el mismo Project, no uno reconstruido');

  const other = projectOf(createEditor(text.slice(0, -1) + ' '));
  assert.notEqual(other, first, 'un texto distinto no puede servirse del memo');
});
