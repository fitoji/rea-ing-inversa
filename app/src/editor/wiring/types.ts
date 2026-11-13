/**
 * Tipos del dominio de cableado (fase 1 del plan de
 * `docs/WIRING_ARCHITECTURE.md`, revisado en `docs/WIRING_ARCHITECTURE_REVIEW.md`).
 *
 * Correspondencia con el formato CADe_SIMU:
 *
 * | entidad         | registro fuente                                        |
 * |-----------------|--------------------------------------------------------|
 * | `WirePath`      | grupo de registros 4xxx con el mismo número de cable   |
 * |                 | (`geometry[21]`) en la misma hoja                      |
 * | `JunctionPoint` | registro 4001 (`geometry[8..9]` = x, y)                |
 * | ancla de pin    | un punto de `attachPoints` del componente (pins.ts)    |
 * | ancla libre     | extremo de tramo sin borne ni unión                    |
 *
 * Importante: el formato **no guarda anclas**. La conectividad es siempre
 * geométrica y se re-deriva al parsear (`buildNetwork`, editor/network.ts).
 * Estos tipos son la representación editable durante un gesto (el
 * `WiringDraft`), no un modelo persistente: al confirmar, los comandos
 * escriben registros 4xxx/4001 y las anclas vuelven a derivarse.
 */

import type { Point } from '../pins.ts';

/**
 * Extremo de un cable. La identidad es explícita durante la edición (el snap
 * la resuelve), aunque el archivo solo guarde la coordenada resultante.
 */
export type Anchor =
  /** Borne de un componente: el índice dentro de la lista de `attachPoints`. */
  | { kind: 'pin'; componentId: number; pinIndex: number }
  /** Punto de unión declarado por un registro 4001. */
  | { kind: 'junction'; recordId: number }
  /** Extremo suelto, sin borne ni unión: es el estado de un cable a medio dibujar. */
  | { kind: 'free'; point: Point };

/** Cable lógico: el grupo de tramos que el usuario ve como un solo cable. */
export interface WirePath {
  /** Ids de los registros 4xxx del grupo, en orden de archivo. */
  segmentIds: number[];
  sheet: number;
  /** Número de cable (`geometry[21]`); 0 = sin número. */
  cable: number;
  from: Anchor;
  to: Anchor;
  /**
   * Vértices interiores, sin los extremos (convención del proyecto). La
   * polilínea completa es `[puntoDe(from), ...vertices, puntoDe(to)]`.
   */
  vertices: Point[];
  routing: 'manual' | 'auto';
}

/** Punto de unión declarado por un registro 4001. */
export interface JunctionPoint {
  recordId: number;
  sheet: number;
  point: Point;
}

/**
 * Borrador transitorio de un gesto: se construye al empezar, se renderiza como
 * preview y se confirma una sola vez al soltar. Nunca entra al historial; lo
 * que entra es el texto confirmado por el comando.
 */
export interface WiringDraft {
  paths: Map<number, WirePath>;
  junctions: Map<number, JunctionPoint>;
}
