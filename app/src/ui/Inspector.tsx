import { useEffect, useState } from 'react';
import type { JSX, ReactNode } from 'react';
import { InfoIcon, MousePointerClickIcon, RotateCwIcon, Trash2Icon, TriangleAlertIcon } from 'lucide-react';
import { GEOMETRY, boxOf, wirePoints, LAMP_COLORS, type CadeRecordModel, type LampColor } from '../model/project.ts';
import { hasColorSlot } from '../model/component-spec.ts';
import { resolveSymbol } from '../symbols/library.ts';
import type { Rotation } from '../editor/state.ts';
import { cableLength, cableNumberOf, cableSegments, type Finding, type Network } from '../editor/network.ts';
import type { Point } from '../editor/pins.ts';
import { PanelHead } from './PanelHead.tsx';
import { cn } from '@/lib/utils';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '@/components/ui/empty';
import { Field, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';

const DL = 'grid grid-cols-[88px_1fr] gap-x-2 gap-y-1 text-xs';
const DT = 'text-muted-foreground';
const DD = 'font-mono text-[11.5px] text-foreground/80 [overflow-wrap:anywhere]';

interface Props {
  selected: CadeRecordModel[];
  rotation: Record<number, Rotation>;
  network: Network;
  findings: Finding[];
  onDesignator: (id: number, value: string) => void;
  onLampColor: (id: number, color: LampColor) => void;
  onRotate: () => void;
  onDelete: () => void;
  onCableNumber: (ids: number[], value: number) => void;
  onAddJunction: (x: number, y: number) => void;
  /** Lleva el lienzo al lugar del aviso y lo resalta. */
  onFocusFinding: (finding: Finding) => void;
  vertex: Point | null;
  onDeleteVertex: () => void;
  /** En simulación el circuito es de solo lectura. */
  readOnly: boolean;
}

export function Inspector(props: Props): JSX.Element {
  const { selected, findings, onAddJunction, onFocusFinding, vertex, onDeleteVertex, readOnly } = props;

  const vertexBlock = vertex ? (
    <div className="flex flex-col gap-2">
      <SectionLabel>Vértice seleccionado</SectionLabel>
      <dl className={DL}>
        <Row label="Posición" value={`${vertex.x}, ${vertex.y}`} />
      </dl>
      <Button variant="outline" size="sm" className="self-start" onClick={onDeleteVertex} disabled={readOnly}>
        <Trash2Icon data-icon="inline-start" />
        Eliminar vértice (⌫)
      </Button>
    </div>
  ) : null;

  if (selected.length === 0) {
    return (
      <InspectorShell>
        {vertexBlock}
        <Empty className="px-0 py-4">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <MousePointerClickIcon />
            </EmptyMedia>
            <EmptyTitle>Nada seleccionado</EmptyTitle>
            <EmptyDescription className="text-xs">
              Clic en un componente o en un cable. <b>Shift</b>+clic suma a la selección; arrastrar sobre el lienzo
              vacío selecciona varios. <b>Arrastrá un cable</b> para doblarlo; los cuadrados azules son sus vértices y se
              borran con <b>⌫</b>.
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
        <Findings findings={findings} onAddJunction={onAddJunction} onFocusFinding={onFocusFinding} readOnly={readOnly} />
      </InspectorShell>
    );
  }

  if (selected.length > 1) {
    const wires = selected.filter((r) => r.kind === 'connection');

    // Un cable son varios tramos y el lienzo los selecciona juntos. Si toda la
    // selección es el MISMO cable, se muestra el panel del cable (con
    // alimentación y vértices) en vez del panel de multi-selección: si no, un
    // cable de 3 tramos no se podía marcar como fase ni como neutro.
    const sameCable =
      wires.length === selected.length && wires.length > 0 && new Set(wires.map((w) => cableNumberOf(w))).size === 1;
    if (sameCable) {
      return <Single key={wires[0]!.id} rec={wires[0]!} vertexBlock={vertexBlock} {...props} />;
    }

    return (
      <InspectorShell>
        <SectionLabel>Selección</SectionLabel>
        <dl className={DL}>
          <Row label="Registros" value={selected.length} />
          {wires.length > 0 && (
            <>
              <Row label="Cable" value={`nº ${cableNumberOf(wires[0]!)}`} />
              <Row label="Longitud" value={`${cableLength(props.network, wires.map((w) => w.id))} u`} />
            </>
          )}
        </dl>
        {vertexBlock}
        <div className="flex flex-wrap gap-1">
          {selected.slice(0, 24).map((r) => (
            <Badge key={r.id} variant="outline" className="h-5 px-1.5 font-mono text-[10.5px] font-normal">
              {r.designator || `#${r.id}`}
            </Badge>
          ))}
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={props.onRotate}>
            <RotateCwIcon data-icon="inline-start" />
            Rotar
          </Button>
          <Button variant="outline" size="sm" onClick={props.onDelete}>
            <Trash2Icon data-icon="inline-start" />
            Borrar
          </Button>
        </div>
        <Findings findings={findings} onAddJunction={onAddJunction} onFocusFinding={onFocusFinding} readOnly={readOnly} />
      </InspectorShell>
    );
  }

  const rec = selected[0]!;
  return <Single key={rec.id} rec={rec} vertexBlock={vertexBlock} {...props} />;
}

function InspectorShell({ children }: { children: ReactNode }): JSX.Element {
  return (
    <aside className="relative z-10 flex min-h-0 w-[268px] shrink-0 flex-col border-l border-border bg-card shadow-chrome-left">
      <PanelHead>Propiedades</PanelHead>
      <ScrollArea className="min-h-0 flex-1">
        <div className="flex flex-col gap-3 px-3 pb-3">{children}</div>
      </ScrollArea>
    </aside>
  );
}

function SectionLabel({ children }: { children: ReactNode }): JSX.Element {
  return (
    <div className="text-[10px] font-semibold tracking-[0.7px] text-muted-foreground uppercase">{children}</div>
  );
}

function Row({ label, value }: { label: string; value: ReactNode }): JSX.Element {
  return (
    <>
      <dt className={DT}>{label}</dt>
      <dd className={DD}>{value}</dd>
    </>
  );
}

function Findings({
  findings,
  onAddJunction,
  onFocusFinding,
  readOnly,
}: {
  findings: Finding[];
  onAddJunction: (x: number, y: number) => void;
  onFocusFinding: (finding: Finding) => void;
  readOnly: boolean;
}): JSX.Element | null {
  if (findings.length === 0) return null;
  return (
    <div className="flex flex-col gap-2">
      <SectionLabel>Avisos ({findings.length})</SectionLabel>
      {findings.slice(0, 10).map((f, i) => (
        <Alert
          key={`${f.code}-${i}`}
          variant={f.level === 'error' ? 'destructive' : 'default'}
          role="button"
          tabIndex={0}
          title="Ir al lugar del aviso"
          className="cursor-pointer transition-colors hover:bg-muted/40 focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:outline-none"
          onClick={() => onFocusFinding(f)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              onFocusFinding(f);
            }
          }}
        >
          <TriangleAlertIcon />
          <AlertDescription className="text-xs">
            {f.message}
            {f.code === 'tee-without-junction' && f.at && (
              <Button
                variant="secondary"
                size="xs"
                className="mt-1.5"
                disabled={readOnly}
                onClick={() => onAddJunction(f.at!.x, f.at!.y)}
              >
                Crear unión
              </Button>
            )}
          </AlertDescription>
        </Alert>
      ))}
    </div>
  );
}

/** Aviso informativo del panel (no es un error de red). */
function Note({ children }: { children: ReactNode }): JSX.Element {
  return (
    <Alert>
      <InfoIcon />
      <AlertDescription className="text-xs">{children}</AlertDescription>
    </Alert>
  );
}

function Single({
  rec,
  rotation,
  onFocusFinding,
  network,
  findings,
  onDesignator,
  onLampColor,
  onRotate,
  onDelete,
  onCableNumber,
  onAddJunction,
  vertexBlock,
  readOnly,
}: Props & { rec: CadeRecordModel; vertexBlock: JSX.Element | null }): JSX.Element {
  const [draft, setDraft] = useState(rec.designator);
  const [cableDraft, setCableDraft] = useState(String(cableNumberOf(rec)));
  useEffect(() => setDraft(rec.designator), [rec.designator]);
  useEffect(() => setCableDraft(String(cableNumberOf(rec))), [rec.raw]);

  const sym = resolveSymbol(rec.code, rec.pins);
  const box = boxOf(rec);
  const deg = rotation[rec.id] ?? 0;

  return (
    <InspectorShell>
      {vertexBlock}

      {rec.kind === 'component' ? (
        <>
          <Field className="gap-1.5">
            <FieldLabel htmlFor="designator" className="text-[10px] tracking-[0.6px] text-muted-foreground uppercase">
              Designador
            </FieldLabel>
            <Input
              id="designator"
              className="h-7 font-mono text-xs"
              disabled={readOnly}
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onBlur={() => {
                if (draft !== rec.designator) onDesignator(rec.id, draft);
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
              }}
            />
          </Field>

          {hasColorSlot(rec.code) && (
            <Field className="gap-1.5">
              <FieldLabel className="text-[10px] tracking-[0.6px] text-muted-foreground uppercase">
                Color
              </FieldLabel>
              {/* El menú "Indicador color" de CADe_SIMU: el índice se guarda en
                  la cabecera del registro y tiñe el vidrio de la lámpara. */}
              <div className="flex gap-1.5" role="group" aria-label="Color de la señalización óptica">
                {LAMP_COLORS.map((name, i) => (
                  <button
                    key={name}
                    type="button"
                    title={name}
                    aria-label={name}
                    aria-pressed={rec.lampColor === i}
                    disabled={readOnly}
                    onClick={() => onLampColor(rec.id, i as LampColor)}
                    className={cn(
                      'size-6 rounded-full border-2 transition-[border-color,box-shadow] disabled:opacity-50',
                      rec.lampColor === i
                        ? 'border-foreground ring-1 ring-foreground/40'
                        : 'border-transparent hover:border-muted-foreground/50',
                    )}
                    style={{ background: `var(--lamp-${name})` }}
                  />
                ))}
              </div>
            </Field>
          )}

          <dl className={DL}>
            <Row label="Tipo" value={sym.name} />
            <Row label="Código" value={rec.code} />
            <Row label="Posición" value={`${rec.geometry[GEOMETRY.x]}, ${rec.geometry[GEOMETRY.y]}`} />
            {box && <Row label="Tamaño" value={`${box.width} × ${box.height}`} />}
            <Row label="Registro" value={`#${rec.id}`} />
          </dl>

          <SectionLabel>Bornes ({rec.pins.length})</SectionLabel>
          <div className="flex flex-wrap gap-1">
            {rec.pins.map((pin, i) => (
              <Badge key={`${pin}-${i}`} variant="outline" className="h-5 px-1.5 font-mono text-[10.5px] font-normal">
                {pin}
              </Badge>
            ))}
            {rec.pins.length === 0 && (
              <Badge variant="outline" className="h-5 px-1.5 text-[10.5px] font-normal">
                sin bornes declarados
              </Badge>
            )}
          </div>

          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={onRotate} disabled={readOnly}>
              <RotateCwIcon data-icon="inline-start" />
              Rotar 90° {deg > 0 && <span className="text-muted-foreground">({deg}°)</span>}
            </Button>
            <Button variant="outline" size="sm" onClick={onDelete} disabled={readOnly}>
              <Trash2Icon data-icon="inline-start" />
              Borrar
            </Button>
          </div>

          {deg > 0 && (
            <Note>
              La rotación es visual y todavía no se guarda: el formato no expuso aún el campo de orientación.
            </Note>
          )}
        </>
      ) : (
        <CablePanel
          rec={rec}
          network={network}
          onDelete={onDelete}
          onCableNumber={onCableNumber}
          cableDraft={cableDraft}
          setCableDraft={setCableDraft}
          readOnly={readOnly}
        />
      )}

      <Findings findings={findings} onAddJunction={onAddJunction} onFocusFinding={onFocusFinding} readOnly={readOnly} />
    </InspectorShell>
  );
}

function CablePanel({
  rec,
  network,
  onDelete,
  onCableNumber,
  cableDraft,
  setCableDraft,
  readOnly,
}: {
  rec: CadeRecordModel;
  network: Network;
  onDelete: () => void;
  onCableNumber: (ids: number[], value: number) => void;
  cableDraft: string;
  setCableDraft: (v: string) => void;
  readOnly: boolean;
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
      <dl className={DL}>
        <Row label="Tipo" value={isJunction ? 'Punto de unión' : rec.code === 4019 ? 'Cable (variante)' : 'Cable'} />
        <Row label="Código" value={rec.code} />
        <Row label="Tramos" value={segments.length} />
        <Row label="Longitud" value={`${cableLength(network, segments)} u`} />
        {pts && !isJunction && (
          <>
            <Row label="Desde" value={`${pts.x1}, ${pts.y1}`} />
            <Row label="Hasta" value={`${pts.x2}, ${pts.y2}`} />
          </>
        )}
        <Row label="Registro" value={`#${rec.id}`} />
      </dl>

      {!isJunction && (
        <Field className="gap-1.5">
          <FieldLabel htmlFor="cable-number" className="text-[10px] tracking-[0.6px] text-muted-foreground uppercase">
            Número de cable
          </FieldLabel>
          <Input
            id="cable-number"
            className="h-7 font-mono text-xs"
            disabled={readOnly}
            value={cableDraft}
            onChange={(e) => setCableDraft(e.target.value)}
            onBlur={commitNumber}
            onKeyDown={(e) => {
              if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
            }}
          />
        </Field>
      )}

      {segments.length > 1 && (
        <Note>
          Este cable son {segments.length} tramos que comparten el número. Cambiar el número los mueve a todos.
        </Note>
      )}

      <Note>
        Arrastrá un cuadrado azul para mover ese vértice. Un clic lo enfoca y <b>⌫</b> lo elimina sin borrar el cable.
      </Note>

      <Button variant="outline" size="sm" className="self-start" onClick={onDelete} disabled={readOnly}>
        <Trash2Icon data-icon="inline-start" />
        Borrar cable
      </Button>
    </>
  );
}
