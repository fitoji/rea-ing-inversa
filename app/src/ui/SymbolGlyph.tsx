import type { JSX } from 'react';
import { resolveSymbol } from '../symbols/library.ts';

interface Props {
  code: number;
  pinNames: string[];
  w: number;
  h: number;
  rotation?: number;
  selected?: boolean;
}

/** Dibuja un símbolo en su caja local (0,0)–(w,h). */
export function SymbolGlyph({ code, pinNames, w, h, rotation = 0, selected = false }: Props): JSX.Element {
  const sym = resolveSymbol(code, pinNames);
  const shapes = sym.shapes(w, h);
  const labels = sym.labels?.(w, h) ?? [];
  const cx = w / 2;
  const cy = h / 2;

  return (
    <g className={selected ? 'sym sel' : 'sym'} transform={`rotate(${rotation} ${cx} ${cy})`}>
      {shapes.map((s, i) => (
        <path key={`s${i}`} d={s.d} className={s.fill ? 'fill' : s.thin ? 'thin' : undefined} />
      ))}
      {sym.pins.map((p) => (
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
