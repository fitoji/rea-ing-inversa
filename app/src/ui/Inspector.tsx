import { useEffect, useState } from 'react';
import type { JSX } from 'react';
import { GEOMETRY, boxOf, wirePoints, type CadeRecordModel } from '../model/project.ts';
import { resolveSymbol } from '../symbols/library.ts';
import type { Rotation } from '../editor/state.ts';
import { cableLength, cableNumberOf, cableSegments, type Finding, type Network } from '../editor/network.ts';
import type { Point } from '../editor/pins.ts';

interface Props {
  selected: CadeRecordModel[];
  rotation: Record<number, Rotation>;
  network: Network;
  findings: Finding[];
  onDesignator: (id: number, value: string) => void;
  onRotate: () => void;
  onDelete: () => void;
  onCableNumber: (ids: number[], value: number) => void;
  onAddJunction: (x: number, y: number) => void;
  vertex: Point | null;
  onDeleteVertex: () => void;
}

export function Inspector(props: Props): JSX.Element {
  const { selected, findings, onAddJunction, vertex, onDeleteVertex } = props;

  const vertexBlock = vertex ? (
    <>
      <div className="section-label">Vértice seleccionado</div>
      <dl className="kv">
        <dt>Posición</dt>
        <dd>
          {vertex.x}, {vertex.y}
        </dd>
      </dl>
      <div style={{ display: 'flex', gap: 6, padding: '0 12px 12px' }}>
        <button className="btn" onClick={onDeleteVertex}>
          Eliminar vértice (⌫)
        </button>
      </div>
    </>
  ) : null;

  if (selected.length === 0) {
    return (
      <aside className="inspector">
        <div className="panel-head">Propiedades</div>
        {vertexBlock}
        <div className="empty-state">
          Nada seleccionado.
          <br />
          Clic en un componente o en un cable. <b>Shift</b>+clic suma a la selección; arrastrar sobre el lienzo vacío
          selecciona varios. <b>Arrastrá un cable</b> para doblarlo; los cuadrados azules son sus vértices y se borran
          con <b>⌫</b>.
        </div>
        <Findings findings={findings} onAddJunction={onAddJunction} />
      </aside>
    );
  }

  if (selected.length > 1) {
    const wires = selected.filter((r) => r.kind === 'connection');
    return (
      <aside className="inspector">
        <div className="panel-head">Propiedades</div>
        <div className="kv">
          <dt>Selección</dt>
          <dd>{selected.length} registros</dd>
          {wires.length > 0 && (
            <>
              <dt>Cable</dt>
              <dd>nº {cableNumberOf(wires[0]!)}</dd>
              <dt>Longitud</dt>
              <dd>{cableLength(props.network, wires.map((w) => w.id))} u</dd>
            </>
          )}
        </div>
        {vertexBlock}
        <div className="pins">
          {selected.slice(0, 24).map((r) => (
            <span className="chip" key={r.id}>
              {r.designator || `#${r.id}`}
            </span>
          ))}
        </div>
        <div style={{ display: 'flex', gap: 6, padding: '0 12px' }}>
          <button className="btn" onClick={props.onRotate}>
            Rotar
          </button>
          <button className="btn" onClick={props.onDelete}>
            Borrar
          </button>
        </div>
        <Findings findings={findings} onAddJunction={onAddJunction} />
      </aside>
    );
  }

  const rec = selected[0]!;
  return <Single key={rec.id} rec={rec} vertexBlock={vertexBlock} {...props} />;
}

function Findings({
  findings,
  onAddJunction,
}: {
  findings: Finding[];
  onAddJunction: (x: number, y: number) => void;
}): JSX.Element | null {
  if (findings.length === 0) return null;
  return (
    <>
      <div className="section-label">Avisos ({findings.length})</div>
      <div className="findings">
        {findings.slice(0, 10).map((f, i) => (
          <div className="finding" key={`${f.code}-${i}`}>
            <span className={f.level === 'error' ? 'finding-dot err' : 'finding-dot'} />
            <span>{f.message}</span>
            {f.code === 'tee-without-junction' && f.at && (
              <button className="btn tiny" onClick={() => onAddJunction(f.at!.x, f.at!.y)}>
                Crear unión
              </button>
            )}
          </div>
        ))}
      </div>
    </>
  );
}

function Single({
  rec,
  rotation,
  network,
  findings,
  onDesignator,
  onRotate,
  onDelete,
  onCableNumber,
  onAddJunction,
  vertexBlock,
}: Props & { rec: CadeRecordModel; vertexBlock: JSX.Element | null }): JSX.Element {
  const [draft, setDraft] = useState(rec.designator);
  const [cableDraft, setCableDraft] = useState(String(cableNumberOf(rec)));
  useEffect(() => setDraft(rec.designator), [rec.designator]);
  useEffect(() => setCableDraft(String(cableNumberOf(rec))), [rec.raw]);

  const sym = resolveSymbol(rec.code, rec.pins);
  const box = boxOf(rec);
  const deg = rotation[rec.id] ?? 0;

  return (
    <aside className="inspector">
      <div className="panel-head">Propiedades</div>
      {vertexBlock}

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
            </div>
          )}
        </>
      ) : (
        <CablePanel rec={rec} network={network} onDelete={onDelete} onCableNumber={onCableNumber} cableDraft={cableDraft} setCableDraft={setCableDraft} />
      )}

      <Findings findings={findings} onAddJunction={onAddJunction} />
    </aside>
  );
}

function CablePanel({
  rec,
  network,
  onDelete,
  onCableNumber,
  cableDraft,
  setCableDraft,
}: {
  rec: CadeRecordModel;
  network: Network;
  onDelete: () => void;
  onCableNumber: (ids: number[], value: number) => void;
  cableDraft: string;
  setCableDraft: (v: string) => void;
}): JSX.Element {
  const pts = wirePoints(rec);
  const segments = cableSegments(network, rec.id);
  const cable = cableNumberOf(rec);
  const isJunction = rec.code === 4001;

  const commitNumber = (): void => {
    const n = Number.parseInt(cableDraft, 10);
    if (!Number.isFinite(n) || n < 0) {
      setCableDraft(String(cable));
      return;
    }
    if (n !== cable) onCableNumber(segments, n);
  };

  return (
    <>
      <dl className="kv">
        <dt>Tipo</dt>
        <dd>{isJunction ? 'Punto de unión' : rec.code === 4019 ? 'Cable (variante)' : 'Cable'}</dd>
        <dt>Código</dt>
        <dd>{rec.code}</dd>
        <dt>Tramos</dt>
        <dd>{segments.length}</dd>
        <dt>Longitud</dt>
        <dd>{cableLength(network, segments)} u</dd>
        {pts && !isJunction && (
          <>
            <dt>Desde</dt>
            <dd>
              {pts.x1}, {pts.y1}
            </dd>
            <dt>Hasta</dt>
            <dd>
              {pts.x2}, {pts.y2}
            </dd>
          </>
        )}
        <dt>Registro</dt>
        <dd>#{rec.id}</dd>
      </dl>

      {!isJunction && (
        <div className="field">
          <label>Número de cable</label>
          <input
            value={cableDraft}
            onChange={(e) => setCableDraft(e.target.value)}
            onBlur={commitNumber}
            onKeyDown={(e) => {
              if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
            }}
          />
        </div>
      )}

      {segments.length > 1 && (
        <div className="note">
          Este cable son {segments.length} tramos que comparten el número. Cambiar el número los mueve a todos.
        </div>
      )}

      <div className="note" style={{ background: '#101820', borderColor: '#243240', color: '#8fa6c0' }}>
        Arrastrá un cuadrado azul para mover ese vértice. Un clic lo enfoca y <b>⌫</b> lo elimina sin borrar el cable.
      </div>

      <div style={{ display: 'flex', gap: 6, padding: '0 12px' }}>
        <button className="btn" onClick={onDelete}>
          Borrar cable
        </button>
      </div>
    </>
  );
}
