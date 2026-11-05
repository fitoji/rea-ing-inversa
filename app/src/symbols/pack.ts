/**
 * Paquete de dibujos activo.
 *
 * Los códigos, los bornes y la geometría del registro no cambian nunca: esto
 * sólo elige qué trazo se pinta para cada código. `base` es el dibujo propio del
 * proyecto más lo importado de EN 60617; `dxf` reemplaza los códigos que la hoja
 * `SIMBOELE.dxf` cubre y deja el resto en `base`.
 *
 * Vive fuera de React para que `resolveSymbol()` pueda consultarlo sin contexto;
 * la UI se suscribe con `useSyncExternalStore`.
 */
export type SymbolPack = 'base' | 'dxf' | 'cadesimu';

const KEY = 'simuelectro:dibujos';
const listeners = new Set<() => void>();

function read(): SymbolPack {
  try {
    const stored = localStorage.getItem(KEY);
    return stored === 'dxf' || stored === 'cadesimu' ? stored : 'base';
  } catch {
    // Sin storage (SSR, modo privado, tests): el paquete base.
    return 'base';
  }
}

let current: SymbolPack = read();

export function getPack(): SymbolPack {
  return current;
}

export function setPack(next: SymbolPack): void {
  if (next === current) return;
  current = next;
  try {
    localStorage.setItem(KEY, next);
  } catch {
    // Sin storage: la elección vale sólo para esta sesión.
  }
  for (const listener of listeners) listener();
}

export function subscribePack(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
