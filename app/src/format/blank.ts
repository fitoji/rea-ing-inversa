// GENERADO por scripts/make-blank.ts — no editar a mano.
// Hoja en blanco: el bloque de título es un registro real de CADe_SIMU con el
// id en 0 y sin nombre de proyecto ni fecha (el CAD los reescribe al guardar).

const SHEET_TITLE = "*0*20000#XXX#########*0*0*0*0*0*0*0*0*42*486*0*0*0*0*0*0*0*0*0*0*0*0*0#$$$*1*1*1*2*5*0*1*0*0*279*210&&&*           *           *           *           *                         *                         *@DATE@*1          *1          *                     *1*1*1*1*1*1*1*1*1*1*1*1*1*1***$$$&&&";

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** Misma fecha que escribe CADe_SIMU: DD-Mon-YYYY. */
export function cadeDate(now: Date): string {
  const day = String(now.getDate()).padStart(2, '0');
  return `${day}-${MONTHS[now.getMonth()]}-${now.getFullYear()}`;
}

/** Documento nuevo: cabecera + una hoja vacía con su bloque de título. */
export function blankDocument(now: Date = new Date()): string {
  return 'CADe_SIMU' + SHEET_TITLE.replace('@DATE@', cadeDate(now));
}
