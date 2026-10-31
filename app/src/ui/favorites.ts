/** Favoritos de la paleta: se guardan como lista de códigos en el navegador. */

export const FAVORITES_KEY = 'simuelectro:favoritos';

/** Lee una lista de códigos tolerando basura: sin duplicados y sólo enteros. */
export function parseFavorites(raw: string | null): number[] {
  if (!raw) return [];
  let data: unknown;
  try {
    data = JSON.parse(raw);
  } catch {
    return [];
  }
  if (!Array.isArray(data)) return [];
  const out: number[] = [];
  for (const value of data) {
    if (typeof value !== 'number' || !Number.isInteger(value) || value <= 0) continue;
    if (!out.includes(value)) out.push(value);
  }
  return out;
}

export function readFavorites(): number[] {
  try {
    return parseFavorites(localStorage.getItem(FAVORITES_KEY));
  } catch {
    return [];
  }
}

export function writeFavorites(codes: number[]): void {
  try {
    localStorage.setItem(FAVORITES_KEY, JSON.stringify(codes));
  } catch {
    // Modo privado o storage bloqueado: los favoritos valen para esta sesión.
  }
}
