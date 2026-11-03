/**
 * Carga de archivos `.cade` en el navegador.
 *
 * Detalle importante: se decodifica como latin1 (un byte = un carácter) en vez
 * de UTF-8. El formato es texto de un byte por carácter y decodificarlo como
 * UTF-8 corrompería los acentos y rompería el round-trip.
 */

import arranqueUrl from '../../test/fixtures/arranque-paro-motor-3f.cad?url';
import ej0defUrl from '../../test/fixtures/ej0def.cad?url';
import inversionUrl from '../../test/fixtures/inversion-giro-cej.cade?url';
import pr1Url from '../../test/fixtures/pr1-rodolfo-giusti.cad?url';
import demoUrl from '../../test/fixtures/luz-con-interruptor.cade?url';

export interface Sample {
  name: string;
  label: string;
  url: string;
}

export const SAMPLES: Sample[] = [
  { name: 'arranque-paro-motor-3f.cad', label: 'Arranque y paro 3F', url: arranqueUrl },
  { name: 'ej0def.cad', label: 'Ejemplo básico (Q1 + térmico)', url: ej0defUrl },
  { name: 'inversion-giro-cej.cade', label: 'Inversión de giro con PLC', url: inversionUrl },
  { name: 'pr1-rodolfo-giusti.cad', label: 'PR1 · motor con guardamotor y contactor', url: pr1Url },
  { name: 'luz-con-interruptor.cade', label: 'Interruptor y lámpara (probar simulación)', url: demoUrl },
];

const decoder = new TextDecoder('latin1');

export async function loadSample(sample: Sample): Promise<string> {
  const res = await fetch(sample.url);
  if (!res.ok) throw new Error(`no se pudo abrir ${sample.name}: ${res.status}`);
  return decoder.decode(await res.arrayBuffer());
}

export async function loadFile(file: File): Promise<{ text: string; name: string }> {
  const buf = await file.arrayBuffer();
  return { text: decoder.decode(buf), name: file.name };
}

/** Codifica de vuelta a bytes: un carácter por byte, sin tocar nada. */
export function encodeLatin1(text: string): Uint8Array {
  const out = new Uint8Array(text.length);
  for (let i = 0; i < text.length; i++) out[i] = text.charCodeAt(i) & 0xff;
  return out;
}

export function downloadCade(text: string, name: string): void {
  const blob = new Blob([encodeLatin1(text).buffer as ArrayBuffer], { type: 'application/octet-stream' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  a.click();
  URL.revokeObjectURL(url);
}
