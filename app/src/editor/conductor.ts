/**
 * Color y trazo del conductor, por su tipo en el archivo.
 *
 * Lo que muestran las dos capturas reales de CADeSimu:
 * - `data/samples/tests01/test01.png` (el automático y la lámpara);
 * - `app/test_simu/PR1_Rodolfo_Giusti_03.png` (el cuadro completo del PR1).
 *
 * | código | color | trazo |
 * |---|---|---|
 * | 4000 (conductor) | granate `#800000` | continuo |
 * | 4009 | azul `#0000ff` | continuo |
 * | 4010 | verde `#008000` | punteado (raya y hueco de 0,75 unidades) |
 *
 * El color lo trae el **tipo de conductor**, no el papel eléctrico del tramo.
 * En el PR1 el tramo `4000` que cierra sobre la red del neutro (la salida de
 * H3) va granate igual que todos los demás `4000`: si el color fuera por
 * alimentación, ése sería azul. Y el `4009` es azul aunque sea un conductor de
 * control en otro plano.
 *
 * `4019` es una variante del `4000` con la misma geometría: va granate.
 */

/** Tono del conductor: el color y el trazo con que lo dibuja CADeSimu. */
export type ConductorTone = 'conductor' | 'neutro' | 'tierra';

const TONE_BY_CODE: Record<number, ConductorTone> = {
  4000: 'conductor',
  4009: 'neutro',
  4010: 'tierra',
};

/**
 * Tono de un conductor. Los códigos desconocidos se dibujan como el conductor
 * común, que es lo que hace CADeSimu con un tramo sin tipo asignado.
 */
export function conductorToneOf(code: number): ConductorTone {
  return TONE_BY_CODE[code] ?? 'conductor';
}
