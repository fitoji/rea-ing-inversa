import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import type { JSX } from 'react';
import { GEOMETRY, boxOf, boundsOf, wirePoints, type CadeRecordModel } from '../model/project.ts';
import type { DragOp, Rotation } from '../editor/state.ts';
import { attachPoints, type Point } from '../editor/pins.ts';
import { buildNetwork, cableSegments } from '../editor/network.ts';
import { SymbolGlyph } from './SymbolGlyph.tsx';

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
  onZoom: (k: number) => void;
  onInsertVertex: (id: number, x: number, y: number) => void;
  onMergeVertex: (x: number, y: number) => void;
}

const MIN_K = 0.25;
const MAX_K = 24;
const PIN_SNAP = 6;

type DragState =
  | { kind: 'move'; sx: number; sy: number; moved: boolean }
  | { kind: 'endpoint'; id: number; end: 0 | 1; sx: number; sy: number; moved: boolean; ox: number; oy: number };

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
    onZoom,
    onInsertVertex,
    onMergeVertex,
  } = props;

  const svgRef = useRef<SVGSVGElement | null>(null);
  const [view, setView] = useState<View>({ x: 0, y: 0, k: 4 });
  const [drag, setDrag] = useState<DragState | null>(null);
  const [pan, setPan] = useState<{ px: number; py: number; vx: number; vy: number } | null>(null);
  const [marquee, setMarquee] = useState<{ x1: number; y1: number; x2: number; y2: number } | null>(null);

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

  const pins = useMemo(() => attachPoints(records), [records]);
  const network = useMemo(() => buildNetwork(records), [records]);
  const pinList = useMemo(() => [...pins.values()].flat(), [pins]);

  /** Snap magnético: primero al borne más cercano, después a la grilla. */
  const snapPoint = useCallback(
    (world: Point): Point => {
      let best: Point | null = null;
      let bestDist = PIN_SNAP;
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
    [pinList, snap],
  );

  /**
   * Golpe sobre cable por distancia, no por orden de pintado.
   *
   * Las cajas de los componentes se pintan encima de los cables (un cable pasa
   * por detrás del símbolo al llegar a un borne), así que confiar en el orden
   * del DOM hacía que un clic sobre el cable seleccionara el componente.
   */
  const hitWire = useCallback(
    (world: Point, tolerance: number): number | null => {
      let best: number | null = null;
      let bestDist = tolerance;
      for (const rec of records) {
        const pts = wirePoints(rec);
        if (!pts || (pts.x1 === pts.x2 && pts.y1 === pts.y2)) continue;
        const dx = pts.x2 - pts.x1;
        const dy = pts.y2 - pts.y1;
        const len2 = dx * dx + dy * dy;
        const t = len2 === 0 ? 0 : Math.max(0, Math.min(1, ((world.x - pts.x1) * dx + (world.y - pts.y1) * dy) / len2));
        const px = pts.x1 + t * dx;
        const py = pts.y1 + t * dy;
        const d = Math.hypot(world.x - px, world.y - py);
        if (d < bestDist) {
          bestDist = d;
          best = rec.id;
        }
      }
      return best;
    },
    [records],
  );

  const onPointerDown = (e: React.PointerEvent): void => {
    if (e.button === 1 || (e.button === 0 && e.altKey)) {
      setPan({ px: e.clientX, py: e.clientY, vx: view.x, vy: view.y });
      svgRef.current!.setPointerCapture(e.pointerId);
      return;
    }
    if (e.button !== 0) return;

    const world = toWorld(e.clientX, e.clientY);
    const target = e.target as Element;

    if (placing !== null) {
      onPlace(snapPoint(world).x, snapPoint(world).y);
      return;
    }

    const handle = target.closest('[data-endpoint]') as HTMLElement | null;
    if (handle) {
      e.stopPropagation();
      const id = Number(handle.dataset.wire);
      const end = Number(handle.dataset.endpoint) as 0 | 1;
      const rec = records.find((r) => r.id === id);
      const pts = rec ? wirePoints(rec) : null;
      if (!pts) return;
      const at = end === 0 ? { x: pts.x1, y: pts.y1 } : { x: pts.x2, y: pts.y2 };
      setDrag({ kind: 'endpoint', id, end, sx: world.x, sy: world.y, moved: false, ox: at.x, oy: at.y });
      svgRef.current!.setPointerCapture(e.pointerId);
      return;
    }

    // Un cable manda sobre la caja del componente que lo tapa.
    const wireHit = hitWire(world, 4 / view.k);
    const domHit = target.closest('[data-id]') as HTMLElement | null;
    const hitId = wireHit ?? (domHit ? Number(domHit.dataset.id) : null);
    if (hitId !== null) {
      const id = hitId;
      const rec = records.find((r) => r.id === id);
      const group = rec && rec.kind === 'connection' ? cableSegments(network, id) : [id];
      const already = group.some((g) => selection.has(g));
      if (e.shiftKey) onSelect(group, true);
      else if (!already) onSelect(group, false);
      if (!e.shiftKey) {
        setDrag({ kind: 'move', sx: world.x, sy: world.y, moved: false });
        svgRef.current!.setPointerCapture(e.pointerId);
      }
      return;
    }

    if (!e.shiftKey) onSelect([], false);
    setMarquee({ x1: world.x, y1: world.y, x2: world.x, y2: world.y });
    svgRef.current!.setPointerCapture(e.pointerId);
  };

  const onPointerMove = (e: React.PointerEvent): void => {
    if (pan) {
      setView((v) => ({ ...v, x: pan.vx + (e.clientX - pan.px), y: pan.vy + (e.clientY - pan.py) }));
      return;
    }
    const world = toWorld(e.clientX, e.clientY);

    if (drag?.kind === 'move') {
      const dx = snapValue(world.x - drag.sx);
      const dy = snapValue(world.y - drag.sy);
      if (dx !== 0 || dy !== 0) setDrag({ ...drag, moved: true });
      onDragPreview({ kind: 'move', dx, dy });
      return;
    }
    if (drag?.kind === 'endpoint') {
      if (Math.hypot(world.x - drag.sx, world.y - drag.sy) > 0.5) setDrag({ ...drag, moved: true });
      const p = snapPoint(world);
      onDragPreview({ kind: 'endpoint', id: drag.id, end: drag.end, x: p.x, y: p.y });
      return;
    }
    if (marquee) {
      setMarquee({ ...marquee, x2: world.x, y2: world.y });
    }
  };

  const onPointerUp = (e: React.PointerEvent): void => {
    if (pan) {
      setPan(null);
      return;
    }
    if (drag?.kind === 'move') {
      const world = toWorld(e.clientX, e.clientY);
      const dx = snapValue(world.x - drag.sx);
      const dy = snapValue(world.y - drag.sy);
      setDrag(null);
      if (dx !== 0 || dy !== 0) onDragCommit({ kind: 'move', dx, dy });
      else onDragPreview(null);
      return;
    }
    if (drag?.kind === 'endpoint') {
      const world = toWorld(e.clientX, e.clientY);
      const moved = Math.hypot(world.x - drag.sx, world.y - drag.sy) > 0.5;
      const p = snapPoint(world);
      setDrag(null);
      if (moved) onDragCommit({ kind: 'endpoint', id: drag.id, end: drag.end, x: p.x, y: p.y });
      else {
        onDragPreview(null);
        onMergeVertex(drag.ox, drag.oy);
      }
      return;
    }
    if (marquee) {
      const mx1 = Math.min(marquee.x1, marquee.x2);
      const mx2 = Math.max(marquee.x1, marquee.x2);
      const my1 = Math.min(marquee.y1, marquee.y2);
      const my2 = Math.max(marquee.y1, marquee.y2);
      const ids: number[] = [];
      for (const rec of records) {
        if (rec.kind !== 'component') continue;
        const b = boundsOf(rec);
        if (!b) continue;
        if (b.x < mx2 && b.x + b.w > mx1 && b.y < my2 && b.y + b.h > my1) ids.push(rec.id);
      }
      if (ids.length > 0) onSelect(ids, e.shiftKey);
      setMarquee(null);
    }
  };

  const onDoubleClick = (e: React.MouseEvent): void => {
    const world = toWorld(e.clientX, e.clientY);
    const id = hitWire(world, 5 / view.k);
    if (id === null) return;
    const rec = records.find((r) => r.id === id);
    const pts = rec ? wirePoints(rec) : null;
    if (!pts) return;

    // El vértice tiene que caer SOBRE el tramo: se snapea sólo la coordenada
    // libre, se conserva la fija y se exige que quede entre los dos extremos.
    const vertical = Math.abs(pts.x1 - pts.x2) < 0.01;
    const lo = vertical ? Math.min(pts.y1, pts.y2) : Math.min(pts.x1, pts.x2);
    const hi = vertical ? Math.max(pts.y1, pts.y2) : Math.max(pts.x1, pts.x2);
    const raw = vertical ? snapValue(world.y) : snapValue(world.x);
    const value = Math.max(lo + 1, Math.min(hi - 1, raw));
    if (value <= lo || value >= hi) return;

    onInsertVertex(id, vertical ? pts.x1 : value, vertical ? value : pts.y1);
  };

  const cursorClass = placing !== null ? 'canvas placing' : pan ? 'canvas panning' : 'canvas';

  const selectedWires = records.filter((r) => r.kind === 'connection' && selection.has(r.id));

  return (
    <div className="canvas-wrap">
      <svg
        ref={svgRef}
        className={cursorClass}
        onWheel={onWheel}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onDoubleClick={onDoubleClick}
      >
        <defs>
          <pattern id="grid" width="10" height="10" patternUnits="userSpaceOnUse">
            <path d="M10 0H0V10" fill="none" stroke="#1a1f28" strokeWidth="1" vectorEffect="non-scaling-stroke" />
          </pattern>
          <pattern id="grid-major" width="50" height="50" patternUnits="userSpaceOnUse">
            <path d="M50 0H0V50" fill="none" stroke="#232a35" strokeWidth="1" vectorEffect="non-scaling-stroke" />
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
            if (rec.kind === 'connection') return <Wire key={rec.id} rec={rec} selected={selection.has(rec.id)} />;
            if (rec.kind !== 'component') return null;
            return (
              <Component
                key={rec.id}
                rec={rec}
                selected={selection.has(rec.id)}
                rotation={rotation[rec.id] ?? 0}
                pins={pins.get(rec.id) ?? []}
              />
            );
          })}

          {[...network.nodes.values()]
            .filter((n) => n.junction)
            .map((n) => (
              <circle key={`j-${n.key}`} className="junction" cx={n.x} cy={n.y} r={1.15} />
            ))}

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

          {marquee && (
            <rect
              className="marquee"
              x={Math.min(marquee.x1, marquee.x2)}
              y={Math.min(marquee.y1, marquee.y2)}
              width={Math.abs(marquee.x2 - marquee.x1)}
              height={Math.abs(marquee.y2 - marquee.y1)}
            />
          )}
        </g>
      </svg>

      <div className="canvas-hint">
        arrastrá componentes · <b>doble clic</b> en un cable agrega un vértice · <b>clic</b> en un vértice lo une ·{' '}
        <b>alt</b>+arrastrar para desplazar
      </div>
      <div className="zoom-tag">{Math.round(view.k * 100)}%</div>
    </div>
  );
}

function Component({
  rec,
  selected,
  rotation,
  pins,
}: {
  rec: CadeRecordModel;
  selected: boolean;
  rotation: Rotation;
  pins: Point[];
}): JSX.Element | null {
  const box = boxOf(rec);
  if (!box) return null;
  const x = rec.geometry[GEOMETRY.x] ?? 0;
  const y = rec.geometry[GEOMETRY.y] ?? 0;
  const label = rec.designator;

  // El símbolo se dibuja dentro de la caja con un margen, para que los puntos de
  // conexión del borde queden libres y el cable se vea llegar al componente.
  const inset = Math.min(2.2, box.width * 0.14, box.height * 0.14);
  const iw = Math.max(0.1, box.width - inset * 2);
  const ih = Math.max(0.1, box.height - inset * 2);

  return (
    <g data-id={rec.id} transform={`translate(${x} ${y})`} style={{ cursor: 'move' }}>
      <rect className="hitbox" x={0} y={0} width={box.width} height={box.height} />
      <rect className={selected ? 'body sel' : 'body'} x={0} y={0} width={box.width} height={box.height} rx={0.6} />
      <g transform={`translate(${inset} ${inset})`}>
        <SymbolGlyph code={rec.code} pinNames={rec.pins} w={iw} h={ih} rotation={rotation} selected={selected} />
      </g>

      {pins.map((p, i) => (
        <circle key={`pin-${i}`} className={selected ? 'pin sel' : 'pin'} cx={p.x - x} cy={p.y - y} r={0.9} />
      ))}

      {label !== '' && (
        <text className="designator" x={box.width / 2} y={-0.9} dominantBaseline="text-after-edge">
          {label}
        </text>
      )}
    </g>
  );
}

function Wire({ rec, selected }: { rec: CadeRecordModel; selected: boolean }): JSX.Element | null {
  const pts = wirePoints(rec);
  if (!pts) return null;
  if (pts.x1 === pts.x2 && pts.y1 === pts.y2) {
    // Registro de unión (4001): geometría de longitud cero.
    return <circle className={selected ? 'junction sel' : 'junction'} cx={pts.x1} cy={pts.y1} r={1.15} />;
  }
  return (
    <path
      data-id={rec.id}
      data-wire={rec.id}
      className={selected ? 'wire sel' : `wire${rec.code === 4019 ? ' alt' : ''}`}
      d={`M${pts.x1} ${pts.y1}L${pts.x2} ${pts.y2}`}
    />
  );
}
