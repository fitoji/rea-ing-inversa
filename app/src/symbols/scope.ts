/**
 * Alcance de la paleta de componentes.
 *
 * `cadesimu` muestra únicamente los códigos del catálogo extraído del binario;
 * `all` vuelve a incluir los símbolos propios que CADe_SIMU no tiene. El
 * catálogo completo queda documentado en `docs/re/componentes-completo.md`.
 *
 * Vive fuera de React para que la paleta y el menú compartan el valor; la UI se
 * suscribe con `useSyncExternalStore`.
 */
export type PaletteScope = 'cadesimu' | 'all';

const KEY = 'simuelectro:paleta';
const listeners = new Set<() => void>();

function read(): PaletteScope {
  try {
    return localStorage.getItem(KEY) === 'all' ? 'all' : 'cadesimu';
  } catch {
    // Sin storage (SSR, modo privado, tests): solo CADe_SIMU.
    return 'cadesimu';
  }
}

let current: PaletteScope = read();

export function getScope(): PaletteScope {
  return current;
}

export function setScope(next: PaletteScope): void {
  if (next === current) return;
  current = next;
  try {
    localStorage.setItem(KEY, next);
  } catch {
    // Sin storage: la elección vale sólo para esta sesión.
  }
  for (const listener of listeners) listener();
}

export function subscribeScope(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
