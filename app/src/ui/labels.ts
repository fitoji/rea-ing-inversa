/**
 * Colocación de los rótulos del lienzo.
 *
 * CADeSimu rotula cada borne con su nombre a la derecha del punto de conexión
 * y pone el designador del aparato a la izquierda del símbolo. Son dos reglas
 * de presentación, pero gobiernan todo lo que se lee en la hoja, así que viven
 * acá y no sueltas en el JSX: son lo que se puede verificar con un test.
 */

/** Margen entre el borne y su rótulo. */
export const PIN_LABEL_DX = 1.2;
/** Margen vertical entre el borne y su rótulo. */
export const PIN_LABEL_DY = 0.4;
/** Margen entre el designador y el borde izquierdo del símbolo. */
export const DESIGNATOR_DX = 1.2;

export interface LabelPoint {
  x: number;
  y: number;
}

/** Punto donde va el rótulo de un borne. */
export function pinLabelAt(pin: LabelPoint): LabelPoint {
  return { x: pin.x + PIN_LABEL_DX, y: pin.y + PIN_LABEL_DY };
}

/**
 * Punto donde va el designador del aparato: a la izquierda del marco del
 * símbolo y a la mitad de su alto.
 */
export function designatorAt(frame: { x: number; y: number; w: number; h: number }): LabelPoint {
  return { x: frame.x - DESIGNATOR_DX, y: frame.y + frame.h / 2 };
}
