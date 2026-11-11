import type { CSSProperties, JSX } from 'react';
import { LAMP_COLORS, type LampColor } from '../model/project.ts';
import { resolveSymbol } from '../symbols/library.ts';
import { shapesBounds } from '../symbols/draw.ts';

interface Props {
  code: number;
  pinNames: string[];
  w: number;
  h: number;
  rotation?: number;
  selected?: boolean;
  /** Estado del contacto durante la simulación: cerrado o abierto. */
  closed?: boolean;
  /** Color guardado de la lámpara (códigos 9008/9009). `null` = tinta normal. */
  lampColor?: LampColor | null;
  /** Componente energizado por la simulación (pinta el rotor del motor). */
  live?: boolean;
  /**
   * Dónde se dibuja el símbolo:
   *
   * - `center` (default): dentro de la caja `(w, h)`. Es lo que usan las
   *   vistas previas de la paleta.
   * - `origin`: en el origen del registro, que es donde lo dibuja CADeSimu.
   *   Los símbolos anclados al origen (`SymbolDef.anchor`) traen su propia
   *   geometría en unidades del archivo, así que no se escalan con la caja.
   */
  place?: 'center' | 'origin';
}

/**
 * Estilo de una hoja móvil: gira sobre su pivote cuando el contacto cambia de
 * estado. El NC se dibuja apoyado, así que su giro (`deg` negativo) se aplica
 * cuando está abierto; el NA al revés.
 */
function bladeStyle(d: string, blade: { px: number; py: number; deg: number }, closed: boolean): CSSProperties | undefined {
  const m = /M(-?[\d.]+) (-?[\d.]+)L(-?[\d.]+) (-?[\d.]+)/.exec(d);
  if (!m) return undefined;
  const [x1, y1, x2, y2] = [Number(m[1]), Number(m[2]), Number(m[3]), Number(m[4])];
  const minX = Math.min(x1, x2);
  const minY = Math.min(y1, y2);
  const spanX = Math.abs(x2 - x1) || 1;
  const spanY = Math.abs(y2 - y1) || 1;
  const active = blade.deg > 0 ? closed : !closed;
  return {
    transformBox: 'fill-box',
    transformOrigin: `${((blade.px - minX) / spanX) * 100}% ${((blade.py - minY) / spanY) * 100}%`,
    transform: active ? `rotate(${blade.deg}deg)` : 'none',
    transition: 'transform 140ms cubic-bezier(0.2, 0.7, 0.3, 1)',
  };
}

/** Dibuja un símbolo en su caja local (0,0)–(w,h). */
export function SymbolGlyph({
  code,
  pinNames,
  w,
  h,
  rotation = 0,
  selected = false,
  closed = false,
  lampColor = null,
  live = false,
  place = 'center',
}: Props): JSX.Element {
  const sym = resolveSymbol(code, pinNames);
  const shapes = sym.shapes(w, h);
  const labels = sym.labels?.(w, h) ?? [];
  const cx = w / 2;
  const cy = h / 2;
  const rotor = live && sym.group === 'motor';
  const r = Math.min(w, h) * 0.42;
  const arrow = `M ${cx - r * 0.55} ${cy - r * 1.12} A ${r * 0.92} ${r * 0.92} 0 0 1 ${cx + r * 0.55} ${cy - r * 1.12}`;
  const head = `M ${cx + r * 0.55} ${cy - r * 1.12} l ${-r * 0.22} ${-r * 0.14} M ${cx + r * 0.55} ${cy - r * 1.12} l ${-r * 0.02} ${r * 0.28}`;

  // Un símbolo anclado al origen trae su geometría en unidades del archivo:
  // en el lienzo se dibuja tal cual (el origen del registro es el 0,0) y en
  // las vistas previas se centra en la caja.
  const anchored = sym.anchor === 'origin';
  const bounds = shapesBounds(shapes);
  const inkCx = (bounds.minX + bounds.maxX) / 2;
  const inkCy = (bounds.minY + bounds.maxY) / 2;
  const shift =
    anchored && place === 'origin'
      ? { x: 0, y: 0 }
      : anchored
        ? { x: cx - inkCx, y: cy - inkCy }
        : { x: 0, y: 0 };
  const pivot = anchored ? { x: inkCx + shift.x, y: inkCy + shift.y } : { x: cx, y: cy };

  return (
    <g
      className={selected ? 'sym sel' : 'sym'}
      data-lamp={lampColor === null ? undefined : LAMP_COLORS[lampColor]}
      transform={`translate(${shift.x} ${shift.y}) rotate(${rotation} ${pivot.x} ${pivot.y})`}
    >
      {shapes.map((s, i) => (
        <path
          key={`s${i}`}
          d={s.d}
          className={[s.fill ? 'fill' : '', s.thin ? 'thin' : '', s.lamp ? 'lamp' : ''].filter(Boolean).join(' ') || undefined}
          style={s.blade ? bladeStyle(s.d, s.blade, closed) : undefined}
        />
      ))}
      {rotor && (
        <g className="motor-rotor" style={{ transformOrigin: `${cx}px ${cy}px` }}>
          <path className="motor-arrow" d={arrow} />
          <path className="motor-arrow" d={head} />
        </g>
      )}
      {anchored
        ? (sym.originPins ?? []).map((p) => (
            <circle key={`op-${p.name}`} className="pin" cx={p.x} cy={p.y} r={1.4}>
              <title>{p.name}</title>
            </circle>
          ))
        : sym.pins.map((p) => (
            <circle key={`p-${p.name}`} className="pin" cx={p.nx * w} cy={p.ny * h} r={1.4}>
              <title>{p.name}</title>
            </circle>
          ))}
      {labels.map((l, i) => (
        <text
          key={`t${i}`}
          x={l.x}
          y={l.y}
          className="designator"
          style={{ fontSize: l.size }}
          textAnchor={l.anchor ?? 'middle'}
          dominantBaseline="middle"
        >
          {l.value}
        </text>
      ))}
    </g>
  );
}
