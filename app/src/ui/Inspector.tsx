import { useEffect, useState } from 'react';
import type { JSX } from 'react';
import { GEOMETRY, boxOf, wirePoints, type CadeRecordModel } from '../model/project.ts';
import { resolveSymbol } from '../symbols/library.ts';
import type { Rotation } from '../editor/state.ts';

interface Props {
  selected: CadeRecordModel[];
  rotation: Record<number, Rotation>;
  onDesignator: (id: number, value: string) => void;
  onRotate: () => void;
  onDelete: () => void;
}

export function Inspector({ selected, rotation, onDesignator, onRotate, onDelete }: Props): JSX.Element {
  if (selected.length === 0) {
    return (
      <aside className="inspector">
        <div className="panel-head">Propiedades</div>
        <div className="empty-state">
          Nada seleccionado.
          <br />
          Clic en un componente para verlo. Arrastrá para mover, <b>shift</b>+clic para sumar a la selección,
          o arrastrá sobre el lienzo vacío para seleccionar varios.
        </div>
      </aside>
    );
  }

  if (selected.length > 1) {
    return (
      <aside className="inspector">
        <div className="panel-head">Propiedades</div>
        <div className="kv">
          <dt>Selección</dt>
          <dd>{selected.length} registros</dd>
        </div>
        <div className="pins">
          {selected.slice(0, 24).map((r) => (
            <span className="chip" key={r.id}>
              {r.designator || `#${r.id}`}
            </span>
          ))}
        </div>
        <div style={{ display: 'flex', gap: 6, padding: '0 12px' }}>
          <button className="btn" onClick={onRotate}>
            Rotar
          </button>
          <button className="btn" onClick={onDelete}>
            Borrar
          </button>
        </div>
      </aside>
    );
  }

  const rec = selected[0]!;
  return <Single key={rec.id} rec={rec} rotation={rotation} onDesignator={onDesignator} onRotate={onRotate} onDelete={onDelete} />;
}

function Single({
  rec,
  rotation,
  onDesignator,
  onRotate,
  onDelete,
}: {
  rec: CadeRecordModel;
  rotation: Record<number, Rotation>;
  onDesignator: (id: number, value: string) => void;
  onRotate: () => void;
  onDelete: () => void;
}): JSX.Element {
  const [draft, setDraft] = useState(rec.designator);
  useEffect(() => setDraft(rec.designator), [rec.designator]);

  const sym = resolveSymbol(rec.code, rec.pins);
  const box = boxOf(rec);
  const pts = wirePoints(rec);
  const deg = rotation[rec.id] ?? 0;

  return (
    <aside className="inspector">
      <div className="panel-head">Propiedades</div>

      {rec.kind === 'component' ? (
        <>
          <div className="field">
            <label>Designador</label>
            <input
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onBlur={() => {
                if (draft !== rec.designator) onDesignator(rec.id, draft);
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
              }}
            />
          </div>

          <dl className="kv">
            <dt>Tipo</dt>
            <dd>{sym.name}</dd>
            <dt>Código</dt>
            <dd>{rec.code}</dd>
            <dt>Posición</dt>
            <dd>
              {rec.geometry[GEOMETRY.x]}, {rec.geometry[GEOMETRY.y]}
            </dd>
            {box && (
              <>
                <dt>Tamaño</dt>
                <dd>
                  {box.width} × {box.height}
                </dd>
              </>
            )}
            <dt>Registro</dt>
            <dd>#{rec.id}</dd>
          </dl>

          <div className="section-label">Bornes ({rec.pins.length})</div>
          <div className="pins">
            {rec.pins.map((pin, i) => (
              <span className="chip" key={`${pin}-${i}`}>
                {pin}
              </span>
            ))}
            {rec.pins.length === 0 && <span className="chip">sin bornes declarados</span>}
          </div>

          <div style={{ display: 'flex', gap: 6, padding: '0 12px 12px' }}>
            <button className="btn" onClick={onRotate}>
              Rotar 90° {deg > 0 && <span style={{ opacity: 0.7 }}>({deg}°)</span>}
            </button>
            <button className="btn" onClick={onDelete}>
              Borrar
            </button>
          </div>

          {deg > 0 && (
            <div className="note">
              La rotación es visual y todavía no se guarda: el formato no expuso aún el campo de orientación.
              El símbolo rota en pantalla, el archivo no cambia.
            </div>
          )}
        </>
      ) : (
        <>
          <dl className="kv">
            <dt>Tipo</dt>
            <dd>{rec.code === 4019 ? 'Cable (variante)' : 'Cable / conexión'}</dd>
            <dt>Código</dt>
            <dd>{rec.code}</dd>
            <dt>Desde</dt>
            <dd>
              {pts?.x1}, {pts?.y1}
            </dd>
            <dt>Hasta</dt>
            <dd>
              {pts?.x2}, {pts?.y2}
            </dd>
            <dt>Longitud</dt>
            <dd>{pts ? Math.round(Math.hypot(pts.x2 - pts.x1, pts.y2 - pts.y1)) : '—'} u</dd>
            <dt>Registro</dt>
            <dd>#{rec.id}</dd>
          </dl>
          <div style={{ display: 'flex', gap: 6, padding: '0 12px' }}>
            <button className="btn" onClick={onDelete}>
              Borrar cable
            </button>
          </div>
        </>
      )}
    </aside>
  );
}
