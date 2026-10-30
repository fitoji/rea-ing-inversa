import type { JSX } from 'react';
import { symbolList, type SymbolGroup } from '../symbols/library.ts';
import { TEMPLATE_CODES } from '../symbols/templates.ts';
import { SymbolGlyph } from './SymbolGlyph.tsx';
import type { Sheet } from '../model/project.ts';

const GROUP_LABEL: Record<SymbolGroup, string> = {
  motor: 'Motores',
  potencia: 'Potencia',
  proteccion: 'Protección',
  mando: 'Mando y señalización',
  borne: 'Borneras',
  carga: 'Cargas',
  otro: 'Otros',
};

const GROUP_ORDER: SymbolGroup[] = ['motor', 'potencia', 'proteccion', 'mando', 'carga', 'borne', 'otro'];

interface Props {
  placing: number | null;
  onPick: (code: number | null) => void;
  sheets: Sheet[];
  activeSheet: number;
  onSheet: (index: number) => void;
}

export function Palette({ placing, onPick, sheets, activeSheet, onSheet }: Props): JSX.Element {
  const available = symbolList().filter((s) => TEMPLATE_CODES.includes(s.code));
  const byGroup = new Map<SymbolGroup, typeof available>();
  for (const sym of available) {
    const list = byGroup.get(sym.group) ?? [];
    list.push(sym);
    byGroup.set(sym.group, list);
  }

  return (
    <aside className="palette">
      <div className="panel-head">Insertar componente</div>
      <div className="palette-body">
        {GROUP_ORDER.filter((g) => byGroup.has(g)).map((group) => (
          <div key={group}>
            <div className="group-title">{GROUP_LABEL[group]}</div>
            {byGroup.get(group)!.map((sym) => (
              <button
                key={sym.code}
                className={placing === sym.code ? 'pal-item on' : 'pal-item'}
                onClick={() => onPick(placing === sym.code ? null : sym.code)}
                title={`${sym.name} — código ${sym.code}`}
              >
                <span className="pal-swatch">
                  <svg width={30} height={26} viewBox="-4 -6 26 24">
                    <SymbolGlyph code={sym.code} pinNames={sym.pins.map((p) => p.name)} w={18} h={15} />
                  </svg>
                </span>
                <span className="pal-name">{sym.name}</span>
                <span className="pal-code">{sym.code}</span>
              </button>
            ))}
          </div>
        ))}
        {available.length === 0 && (
          <div className="empty-state">Sin plantillas. Corré `node scripts/make-templates.ts`.</div>
        )}
      </div>

      <div className="sheets">
        <div className="group-title">Hojas</div>
        {sheets.map((sheet, i) => (
          <button
            key={sheet.index}
            className={i === activeSheet ? 'sheet-item on' : 'sheet-item'}
            onClick={() => onSheet(i)}
          >
            <span className="sheet-badge">{String(i + 1).padStart(2, '0')}</span>
            Hoja {i + 1}
            {sheet.titleBlock?.raw.includes('CADe_S1') ? ' · PLC' : ''}
          </button>
        ))}
      </div>
    </aside>
  );
}
