import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import type { JSX } from 'react';
import { GEOMETRY, boxOf, boundsOf, wirePoints, type CadeRecordModel } from '../model/project.ts';
import { resolveSymbol } from '../symbols/library.ts';
import { shapesBounds } from '../symbols/draw.ts';
import { designatorAt, pinLabelAt } from './labels.ts';
import type { DragOp, Rotation } from '../editor/state.ts';
import { idle, startBend, startMarquee, startMove, startPan, startVertex, step as advance, type Effect, type Gesture, type GestureEvent } from '../editor/wiring/controller.ts';
import { attachPoints, type Point } from '../editor/pins.ts';
import { buildNetwork, cableSegments } from '../editor/network.ts';
import { snapContext, snapTarget, type SnapTarget } from '../editor/wiring/snap.ts';
import { hitContext, hitTest } from '../editor/wiring/hitTest.ts';
import { WIRE_TEMPLATES } from '../symbols/templates.ts';
import { conductorToneOf, type ConductorTone } from '../editor/conductor.ts';
import { SymbolGlyph } from './SymbolGlyph.tsx';
import type { VisualState } from '../sim/visual.ts';

export interface View {
  x: number;
  y: number;
  k: number;
}

interface Props {
  records: CadeRecordModel[];
  selection: Set<number>;
  rotation: Record<number, Rotation>;
  showGrid: boolean;
  snap: boolean;
  placing: number | null;
  fitToken: number;
  onSelect: (ids: number[], additive: boolean) => void;
  onDragPreview: (op: DragOp | null) => void;
  onDragCommit: (op: DragOp) => void;
  onPlace: (x: number, y: number) => void;
  /** Origen del cable que se está dibujando (primer clic). */
  wireStart: Point | null;
  /** Componentes energizados por la simulación. */
  live: Set<number>;
  /** Estado visual por registro de componente. */
  states: Map<number, VisualState>;
  /** ids de registro de cable con tensión durante la simulación */
  liveWires: Set<number>;
  /** ids de cables cuya corriente va contra el sentido del trazo */
  reversedWires?: Set<number>;
  /** ids de componentes cuyo contacto está cerrado durante la simulación */
  closedContacts: Set<number>;
  /** Durante la simulación, un clic sobre un pulsador ya seleccionado lo aprieta. */
  simulating: boolean;
  /** Registros y punto marcados como falla desde un aviso. */
  highlight: { ids: number[]; at: Point | null } | null;
  onZoom: (k: number) => void;
  onInsertVertex: (id: number, x: number, y: number) => void;
  onVertexSelect: (vertex: Point | null) => void;
  /** Cancela lo que esté en curso: selección, vértice enfocado y colocación. */
  onCancel: () => void;
}

const MIN_K = 0.25;
const MAX_K = 24;
/**
 * Radio de imán a un borne, en píxeles de pantalla.
 *
 * En unidades de plano era 6, pero en este esquema los bornes están cada 6: el
 * punto siempre quedaba cerca de alguno y saltaba entre ellos, sin poder
 * soltarlo donde uno quería. En píxeles el imán sólo actúa cuando el cursor está
 * realmente encima dell borne.
 */
const PIN_SNAP_PX = 11;

export function Canvas(props: Props): JSX.Element {
  const {
    records,
    selection,
    rotation,
    showGrid,
    snap,
    placing,
    fitToken,
    onSelect,
    onDragPreview,
    onDragCommit,
    onPlace,
    wireStart,
    live,
    states,
    liveWires,
    reversedWires,
    closedContacts,
    simulating,
    highlight,
    onZoom,
    onInsertVertex,
    onVertexSelect,
    onCancel,
  } = props;

  const svgRef = useRef<SVGSVGElement | null>(null);
  const [view, setView] = useState<View>({ x: 0, y: 0, k: 4 });
  // Un solo estado de gesto (máquina de wiring/controller.ts): paneo, marquee,
  // arrastre de selección, de vértice y de doblez. Escape y pointercancel
  // cancelan; un gesto confirmado entra una sola vez al historial.
  const [gesture, setGesture] = useState<Gesture>(idle);
  const [hover, setHover] = useState<Point | null>(null);

  const toWorld = useCallback(
    (clientX: number, clientY: number) => {
      const rect = svgRef.current!.getBoundingClientRect();
      return {
        x: (clientX - rect.left - view.x) / view.k,
        y: (clientY - rect.top - view.y) / view.k,
      };
    },
    [view],
  );

  const fit = useCallback(() => {
    const el = svgRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;
    const push = (x: number, y: number): void => {
      if (x < minX) minX = x;
      if (y < minY) minY = y;
      if (x > maxX) maxX = x;
      if (y > maxY) maxY = y;
    };
    for (const rec of records) {
      if (rec.kind === 'component') {
        const b = boundsOf(rec);
        if (!b) continue;
        push(b.x, b.y);
        push(b.x + b.w, b.y + b.h);
      } else {
        const pts = wirePoints(rec);
        if (!pts) continue;
        push(pts.x1, pts.y1);
        push(pts.x2, pts.y2);
      }
    }
    if (!Number.isFinite(minX)) return;
    const pad = 40;
    const k = Math.min((rect.width - pad * 2) / Math.max(1, maxX - minX), (rect.height - pad * 2) / Math.max(1, maxY - minY), 16);
    const kk = Math.max(MIN_K, Math.min(MAX_K, k));
    setView({
      k: kk,
      x: rect.width / 2 - ((minX + maxX) / 2) * kk,
      y: rect.height / 2 - ((minY + maxY) / 2) * kk,
    });
    onZoom(kk);
  }, [records, onZoom]);

  useLayoutEffect(() => {
    fit();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fitToken]);

  useEffect(() => {
    onZoom(view.k);
  }, [view.k, onZoom]);

  const applyZoom = (factor: number, mx: number, my: number): void => {
    setView((v) => {
      const k = Math.max(MIN_K, Math.min(MAX_K, v.k * factor));
      return { k, x: mx - (mx - v.x) * (k / v.k), y: my - (my - v.y) * (k / v.k) };
    });
  };

  const onWheel = (e: React.WheelEvent): void => {
    e.preventDefault();
    const rect = svgRef.current!.getBoundingClientRect();
    applyZoom(Math.exp(-e.deltaY * 0.0016), e.clientX - rect.left, e.clientY - rect.top);
  };

  const step = snap ? 3 : 1;
  const snapValue = (n: number): number => Math.round(n / step) * step;

  /** Punto del tramo más cercano al cursor, snapeado y entre los dos extremos. */
  const bendPoint = useCallback(
    (rec: CadeRecordModel, world: Point): Point | null => {
      const pts = wirePoints(rec);
      if (!pts) return null;
      const vertical = Math.abs(pts.x1 - pts.x2) < 0.01;
      const lo = vertical ? Math.min(pts.y1, pts.y2) : Math.min(pts.x1, pts.x2);
      const hi = vertical ? Math.max(pts.y1, pts.y2) : Math.max(pts.x1, pts.x2);
      const raw = vertical ? snapValue(world.y) : snapValue(world.x);
      const value = Math.max(lo + 1, Math.min(hi - 1, raw));
      if (value <= lo || value >= hi) return null;
      return vertical ? { x: pts.x1, y: value } : { x: value, y: pts.y1 };
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [snap],
  );

  const pins = useMemo(() => attachPoints(records), [records]);
  const network = useMemo(() => buildNetwork(records), [records]);
  // Hoja que se está dibujando: los registros llegan recortados a esta página.
  const sheet = records[0]?.sheet ?? 0;
  const pinList = useMemo(() => [...pins.values()].flat(), [pins]);
  // Contexto de cableado de la hoja: alimenta el snap priorizado y el hit-test.
  const wiring = useMemo(() => snapContext(network, records, sheet), [network, records, sheet]);
  const hitCtx = useMemo(() => hitContext(network, records, sheet), [network, records, sheet]);
  const [snapMark, setSnapMark] = useState<Point | null>(null);

  /** Snap priorizado del cableado: borne → junction → derivación en T → grilla. */
  const snapOf = useCallback(
    (world: Point, exclude: number[] = []): SnapTarget =>
      snapTarget(world, wiring, PIN_SNAP_PX / view.k, step, exclude),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [wiring, snap, view.k],
  );

  /** Snap magnético simple (borne o grilla): el que usa la colocación de componentes. */
  const snapPoint = useCallback(
    (world: Point): Point => {
      let best: Point | null = null;
      let bestDist = PIN_SNAP_PX / view.k;
      for (const p of pinList) {
        const d = Math.hypot(p.x - world.x, p.y - world.y);
        if (d < bestDist) {
          bestDist = d;
          best = p;
        }
      }
      if (best) return { x: best.x, y: best.y };
      return { x: snapValue(world.x), y: snapValue(world.y) };
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [pinList, snap, view.k],
  );

  /**
   * Golpe sobre cable por distancia, no por orden de pintado.
   *
   * Las cajas de los componentes se pintan encima de los cables (un cable pasa
   * por detrás del símbolo al llegar a un borne), así que confiar en el orden
   * del DOM hacía que un clic sobre el cable seleccionara el componente.
   * El escaneo es el del módulo puro con los endpoints apagados: golpear la
   * punta del tramo sigue devolviendo el segmento.
   */
  const hitWire = useCallback(
    (world: Point, tolerance: number): number | null => {
      const out = hitTest(world, hitCtx, tolerance, { endpoints: false });
      return out.kind === 'segment' ? out.segmentId : null;
    },
    [hitCtx],
  );

  /** Aplica los efectos declarativos que la máquina de gestos emite. */
  const applyEffects = useCallback(
    (effects: Effect[]) => {
      for (const e of effects) {
        if (e.type === 'pan') {
          setView((v) => ({ ...v, x: e.x, y: e.y }));
        } else if (e.type === 'preview') {
          onDragPreview(e.op);
        } else if (e.type === 'commit') {
          onDragCommit(e.op);
        } else if (e.type === 'cancel') {
          onDragPreview(null);
          setSnapMark(null);
        } else if (e.type === 'select') {
          const { x1, y1, x2, y2 } = e.rect;
          const ids: number[] = [];
          for (const rec of records) {
            if (rec.kind !== 'component') continue;
            const b = boundsOf(rec);
            if (!b) continue;
            if (b.x < x2 && b.x + b.w > x1 && b.y < y2 && b.y + b.h > y1) ids.push(rec.id);
          }
          if (ids.length > 0) onSelect(ids, e.additive);
        }
      }
    },
    [onDragPreview, onDragCommit, onSelect, records],
  );

  /** Avanza la máquina de gestos y aplica sus efectos. */
  const dispatch = useCallback(
    (g: Gesture, ev: GestureEvent): void => {
      const out = advance(g, ev, { snap: (w, ex) => snapOf(w, ex).point, grid: snapValue });
      setGesture(out.next);
      applyEffects(out.effects);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [snapOf, snapValue, applyEffects],
  );

  const onPointerDown = (e: React.PointerEvent): void => {
    if (e.button === 1 || (e.button === 0 && e.altKey)) {
      setGesture(startPan({ x: e.clientX, y: e.clientY }, { x: view.x, y: view.y }));
      svgRef.current!.setPointerCapture(e.pointerId);
      return;
    }
    if (e.button !== 0) return;

    const world = toWorld(e.clientX, e.clientY);
    const target = e.target as Element;

    if (placing !== null) {
      // Durante la simulación no se insertan componentes.
      if (!simulating) {
        // Dibujar cable: snap priorizado (arrancar sobre un borne, una junction
        // o el interior de otro tramo). Colocar componente: snap simple.
        const wirePlacing = WIRE_TEMPLATES[placing] !== undefined;
        const s = wirePlacing || wireStart !== null ? snapOf(world).point : snapPoint(world);
        onPlace(s.x, s.y);
      }
      return;
    }

    if (!target.closest('[data-endpoint]')) onVertexSelect(null);

    const handle = target.closest('[data-endpoint]') as HTMLElement | null;
    if (handle) {
      // Los tiradores de vértice solo existen para editar: en simulación no.
      if (simulating) return;
      e.stopPropagation();
      const id = Number(handle.dataset.wire);
      const end = Number(handle.dataset.endpoint) as 0 | 1;
      const rec = records.find((r) => r.id === id);
      const pts = rec ? wirePoints(rec) : null;
      if (!pts) return;
      const at = end === 0 ? { x: pts.x1, y: pts.y1 } : { x: pts.x2, y: pts.y2 };
      // Enfocar el vértice permite borrarlo con Suprimir sin borrar el cable.
      onVertexSelect(at);
      // Los tramos que comparten el punto arrastrado no derivan sobre sí mismos.
      const exclude = records
        .filter((r) => {
          const rp = wirePoints(r);
          if (!rp) return false;
          const atA = Math.abs(rp.x1 - at.x) < 0.01 && Math.abs(rp.y1 - at.y) < 0.01;
          const atB = Math.abs(rp.x2 - at.x) < 0.01 && Math.abs(rp.y2 - at.y) < 0.01;
          return atA || atB;
        })
        .map((r) => r.id);
      setGesture(startVertex(at, world, exclude, sheet));
      svgRef.current!.setPointerCapture(e.pointerId);
      return;
    }

    // En edición un cable manda sobre la caja que tapa. En simulación el
    // componente tiene prioridad: si no, los pulsadores y protecciones no se
    // pueden accionar cuando un cable pasa cerca.
    const wireHit = hitWire(world, 4 / view.k);
    const domHit = target.closest('[data-id]') as HTMLElement | null;
    const domId = domHit ? Number(domHit.dataset.id) : null;
    const hitId = simulating && domId !== null ? domId : (wireHit ?? domId);
    if (hitId !== null) {
      const id = hitId;
      const rec = records.find((r) => r.id === id);
      const isWire = rec !== undefined && rec.kind === 'connection';
      const group = isWire ? cableSegments(network, id) : [id];
      const already = group.some((g) => selection.has(g));
      if (e.shiftKey) onSelect(group, true);
      // En simulación el clic sobre un pulsador ya seleccionado tiene que
      // llegar igual: el aparato aprieta/suelta y la selección no cambia.
      else if (!already || simulating) onSelect(group, false);
      // En simulación se puede seleccionar y accionar, pero no arrastrar.
      if (!e.shiftKey && !simulating) {
        const at = isWire && rec ? bendPoint(rec, world) : null;
        setGesture(at ? startBend(id, at, world, sheet) : startMove(world));
        svgRef.current!.setPointerCapture(e.pointerId);
      }
      return;
    }

    if (!e.shiftKey) onSelect([], false);
    if (!simulating) {
      setGesture(startMarquee(world, e.shiftKey));
      svgRef.current!.setPointerCapture(e.pointerId);
    }
  };

  const onPointerMove = (e: React.PointerEvent): void => {
    const world = toWorld(e.clientX, e.clientY);
    const client = { x: e.clientX, y: e.clientY };

    // Marcador del objetivo magnético durante el dibujo y los arrastres de cable.
    if (wireStart) {
      const t = snapOf(world);
      setHover(t.point);
      setSnapMark(t.kind === 'grid' ? null : t.point);
    } else if (gesture.kind === 'vertex') {
      const t = snapOf(world, gesture.exclude);
      setSnapMark(t.kind === 'grid' ? null : t.point);
    } else if (gesture.kind === 'bend') {
      const t = snapOf(world, [gesture.id]);
      setSnapMark(t.kind === 'grid' ? null : t.point);
    } else {
      setSnapMark(null);
    }

    dispatch(gesture, { type: 'move', world, client });
  };

  const onPointerUp = (e: React.PointerEvent): void => {
    const world = toWorld(e.clientX, e.clientY);
    const client = { x: e.clientX, y: e.clientY };
    dispatch(gesture, { type: 'up', world, client });
  };

  /**
   * `pointercancel` CANCELA: el gesto no entra al documento (antes delegaba en
   * `onPointerUp` y confirmaba lo que la interrupción dejó a medio hacer).
   */
  const onGestureCancel = (): void => {
    dispatch(gesture, { type: 'cancel' });
  };

  // Escape cancela el gesto del lienzo; App maneja su parte (selección,
  // vértice enfocado, cable a medio dibujar, componente a colocar).
  useEffect(() => {
    const onKey = (e: KeyboardEvent): void => {
      if (e.key !== 'Escape' || gesture.kind === 'idle') return;
      dispatch(gesture, { type: 'cancel' });
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [gesture, dispatch]);

  const onDoubleClick = (e: React.MouseEvent): void => {
    const world = toWorld(e.clientX, e.clientY);
    const id = hitWire(world, 5 / view.k);
    if (id === null) return;
    const rec = records.find((r) => r.id === id);
    const at = rec ? bendPoint(rec, world) : null;
    if (at) onInsertVertex(id, at.x, at.y);
  };

  /**
   * Botón derecho: cancela la selección, igual que Escape.
   *
   * `preventDefault` es parte del pedido: sin él, cancelar la selección abría
   * además el menú del navegador encima del lienzo.
   */
  const onContextMenu = (e: React.MouseEvent): void => {
    e.preventDefault();
    // Igual que Escape: cancela el gesto del lienzo y lo de App.
    if (gesture.kind !== 'idle') dispatch(gesture, { type: 'cancel' });
    onCancel();
  };

  const cursorClass =
    placing !== null ? 'canvas placing' : gesture.kind === 'panning' ? 'canvas panning' : 'canvas';

  const selectedWires = records.filter((r) => r.kind === 'connection' && selection.has(r.id));

  return (
    <div className="relative min-h-0 min-w-0 flex-1 overflow-hidden bg-background">
      <svg
        ref={svgRef}
        className={cursorClass}
        onWheel={onWheel}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onGestureCancel}
        onDoubleClick={onDoubleClick}
        onContextMenu={onContextMenu}
      >
        <defs>
          <pattern id="grid" width="10" height="10" patternUnits="userSpaceOnUse">
            <path className="grid-minor" d="M10 0H0V10" fill="none" strokeWidth="1" vectorEffect="non-scaling-stroke" />
          </pattern>
          <pattern id="grid-major" width="50" height="50" patternUnits="userSpaceOnUse">
            <path className="grid-major" d="M50 0H0V50" fill="none" strokeWidth="1" vectorEffect="non-scaling-stroke" />
          </pattern>
        </defs>

        <g transform={`translate(${view.x} ${view.y}) scale(${view.k})`}>
          {showGrid && (
            <>
              <rect x={-10000} y={-10000} width={20000} height={20000} fill="url(#grid)" />
              <rect x={-10000} y={-10000} width={20000} height={20000} fill="url(#grid-major)" />
            </>
          )}

          {records.map((rec) => {
            if (rec.kind === 'connection')
              return (
                <Wire
                  key={rec.id}
                  rec={rec}
                  selected={selection.has(rec.id)}
                  live={liveWires.has(rec.id)}
                  reverse={reversedWires?.has(rec.id) ?? false}
                  tone={conductorToneOf(rec.code)}
                />
              );
            if (rec.kind !== 'component') return null;
            return (
              <Component
                key={rec.id}
                rec={rec}
                selected={selection.has(rec.id)}
                live={live.has(rec.id)}
                state={states.get(rec.id) ?? 'idle'}
                closed={closedContacts.has(rec.id)}
                bad={highlight?.ids.includes(rec.id) ?? false}
                rotation={rotation[rec.id] ?? 0}
                pins={pins.get(rec.id) ?? []}
              />
            );
          })}

          {[...network.nodes.values()]
            .filter((n) => n.junction || n.kind === 'tee')
            .map((n) => (
              // El punto de una T: un extremo que cae en el medio de otro tramo
              // es una conexión real aunque el archivo no traiga un 4001 ahí.
              <circle key={`j-${n.key}`} className="junction" cx={n.x} cy={n.y} r={1.15} />
            ))}

          {snapMark && <circle className="snap-mark" cx={snapMark.x} cy={snapMark.y} r={2.4} />}

          {selectedWires.map((rec) => {
            const pts = wirePoints(rec);
            if (!pts) return null;
            return (
              <g key={`h-${rec.id}`}>
                <rect
                  className="handle"
                  data-endpoint="0"
                  data-wire={rec.id}
                  x={pts.x1 - 1.1}
                  y={pts.y1 - 1.1}
                  width={2.2}
                  height={2.2}
                />
                <rect
                  className="handle"
                  data-endpoint="1"
                  data-wire={rec.id}
                  x={pts.x2 - 1.1}
                  y={pts.y2 - 1.1}
                  width={2.2}
                  height={2.2}
                />
              </g>
            );
          })}

          {highlight?.at && (
            <g>
              <circle className="mark" cx={highlight.at.x} cy={highlight.at.y} r={5} />
              <path
                className="mark"
                d={`M${highlight.at.x - 3} ${highlight.at.y}H${highlight.at.x + 3}M${highlight.at.x} ${highlight.at.y - 3}V${highlight.at.y + 3}`}
                style={{ animation: 'none', strokeWidth: 0.3 }}
              />
            </g>
          )}

          {wireStart && hover && (
            <g className="ghost">
              <line className="wire" x1={wireStart.x} y1={wireStart.y} x2={hover.x} y2={hover.y} />
              <circle className="junction" cx={wireStart.x} cy={wireStart.y} r={1.15} />
            </g>
          )}

          {gesture.kind === 'marquee' && (
            <rect
              className="marquee"
              x={Math.min(gesture.start.x, gesture.current.x)}
              y={Math.min(gesture.start.y, gesture.current.y)}
              width={Math.abs(gesture.current.x - gesture.start.x)}
              height={Math.abs(gesture.current.y - gesture.start.y)}
            />
          )}
        </g>
      </svg>

      <div className="pointer-events-none absolute bottom-3 left-3 rounded-md border border-border/70 bg-background/85 px-2 py-1 text-[11px] text-muted-foreground backdrop-blur-sm">
        arrastrá componentes · <b>arrastrá un cable</b> para doblarlo · <b>⌫</b> borra el vértice enfocado ·{' '}
        <b>clic derecho</b> cancela · <b>alt</b>+arrastrar para desplazar
      </div>
      <div className="pointer-events-none absolute right-3 bottom-3 rounded-md border border-border/70 bg-background/85 px-2 py-0.5 font-mono text-[11px] text-muted-foreground backdrop-blur-sm">
        {Math.round(view.k * 100)}%
      </div>
    </div>
  );
}

function Component({
  rec,
  selected,
  live,
  state,
  closed,
  bad,
  rotation,
  pins,
}: {
  rec: CadeRecordModel;
  selected: boolean;
  live: boolean;
  state: VisualState;
  closed: boolean;
  bad: boolean;
  rotation: Rotation;
  pins: Point[];
}): JSX.Element | null {
  const box = boxOf(rec);
  if (!box) return null;
  const x = rec.geometry[GEOMETRY.x] ?? 0;
  const y = rec.geometry[GEOMETRY.y] ?? 0;
  const label = rec.designator;
  const sym = resolveSymbol(rec.code, rec.pins);

  // El símbolo se dibuja con su caja apoyada en el ORIGEN del registro, que es
  // donde CADeSimu pone el primer borne: la grilla de conexión de 6 unidades
  // cuenta desde ahí, no desde un marco con margen. Antes se aplicaba un
  // `inset` y todos los símbolos quedaban corridos respecto de sus cables.
  const iw = box.width;
  const ih = box.height;

  // Un símbolo anclado al origen trae su geometría en unidades del archivo y se
  // dibuja en el origen del registro, como en CADeSimu: la caja declarada es la
  // grilla de conexión, no el marco del dibujo. Sin marco visible: CADeSimu
  // muestra sólo la tinta del símbolo; los estados viven en la tinta y los
  // cables, no en un recuadro.
  const anchored = sym.anchor === 'origin';
  // El designador va a la izquierda del dibujo: para los anclados el marco de
  // referencia es la caja de la tinta; para el resto, la caja declarada.
  const ink = shapesBounds(sym.shapes(anchored ? box.width : iw, anchored ? box.height : ih));
  const labelFrame = anchored
    ? { x: ink.minX, y: ink.minY, w: ink.maxX - ink.minX, h: ink.maxY - ink.minY }
    : { x: 0, y: 0, w: box.width, h: box.height };

  return (
    <g data-id={rec.id} data-state={state} data-bad={bad || undefined} transform={`translate(${x} ${y})`} style={{ cursor: 'move' }}>
      <rect className="hitbox" x={0} y={0} width={box.width} height={box.height} />
      {anchored ? (
        <SymbolGlyph
          code={rec.code}
          pinNames={rec.pins}
          w={box.width}
          h={box.height}
          place="origin"
          rotation={rotation}
          selected={selected}
          closed={closed}
          lampColor={rec.lampColor}
          live={live}
        />
      ) : (
        <SymbolGlyph code={rec.code} pinNames={rec.pins} w={iw} h={ih} rotation={rotation} selected={selected} closed={closed} lampColor={rec.lampColor} live={live} />
      )}

      {pins.map((p, i) => (
        <circle key={`pin-${i}`} className={selected ? 'pin sel' : 'pin'} cx={p.x - x} cy={p.y - y} r={0.9} />
      ))}

      {/* Rótulo del borne: a la derecha del punto de conexión, como en CADeSimu. */}
      {pins.map((p, i) => {
        const name = rec.pins[i];
        if (!name) return null;
        const at = pinLabelAt(p);
        return (
          <text key={`pinlabel-${i}`} className="pinlabel" x={at.x - x} y={at.y - y}>
            {name}
          </text>
        );
      })}

      {label !== '' && (
        <text className="designator left" x={designatorAt(labelFrame).x} y={designatorAt(labelFrame).y} dominantBaseline="middle">
          {label}
        </text>
      )}
    </g>
  );
}

function Wire({
  rec,
  selected,
  live,
  reverse,
  tone,
}: {
  rec: CadeRecordModel;
  selected: boolean;
  live: boolean;
  reverse?: boolean;
  tone: ConductorTone;
}): JSX.Element | null {
  const pts = wirePoints(rec);
  if (!pts) return null;
  if (pts.x1 === pts.x2 && pts.y1 === pts.y2) {
    // Registro de unión (4001): geometría de longitud cero.
    return <circle className={selected ? 'junction sel' : live ? 'junction live' : 'junction'} cx={pts.x1} cy={pts.y1} r={1.15} />;
  }
  // El tono va siempre en la clase: es el color con que CADeSimu pinta el
  // conductor. Cuando el cable está seleccionado o energizado, mandan los
  // colores de estado.
  const cls = ['wire', tone];
  if (selected) cls.push('sel');
  else if (live) {
    cls.push('live');
    if (reverse) cls.push('rev');
  }
  return (
    <path
      data-id={rec.id}
      data-wire={rec.id}
      className={cls.join(' ')}
      d={`M${pts.x1} ${pts.y1}L${pts.x2} ${pts.y2}`}
    />
  );
}
