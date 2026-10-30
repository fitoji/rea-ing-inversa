import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import type { JSX } from 'react';
import { GEOMETRY, boxOf, boundsOf, wirePoints, type CadeRecordModel } from '../model/project.ts';
import type { Rotation } from '../editor/state.ts';
import { attachPoints, type Point } from '../editor/pins.ts';
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
  onDragPreview: (dx: number, dy: number) => void;
  onDragCommit: (dx: number, dy: number) => void;
  onPlace: (x: number, y: number) => void;
  onZoom: (k: number) => void;
}

const MIN_K = 0.25;
const MAX_K = 24;

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
  } = props;

  const svgRef = useRef<SVGSVGElement | null>(null);
  const [view, setView] = useState<View>({ x: 0, y: 0, k: 4 });
  const [drag, setDrag] = useState<{ sx: number; sy: number; active: boolean } | null>(null);
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

  const onPointerDown = (e: React.PointerEvent): void => {
    const target = e.target as Element;
    const hit = target.closest('[data-id]') as HTMLElement | null;

    if (e.button === 1 || (e.button === 0 && e.altKey)) {
      setPan({ px: e.clientX, py: e.clientY, vx: view.x, vy: view.y });
      svgRef.current!.setPointerCapture(e.pointerId);
      return;
    }
    if (e.button !== 0) return;

    const world = toWorld(e.clientX, e.clientY);

    if (placing !== null) {
      onPlace(snapValue(world.x), snapValue(world.y));
      return;
    }

    if (hit) {
      const id = Number(hit.dataset.id);
      if (e.shiftKey) onSelect([id], true);
      else if (!selection.has(id)) onSelect([id], false);
      if (!e.shiftKey) setDrag({ sx: world.x, sy: world.y, active: true });
      svgRef.current!.setPointerCapture(e.pointerId);
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
    if (drag?.active) {
      const world = toWorld(e.clientX, e.clientY);
      onDragPreview(snapValue(world.x - drag.sx), snapValue(world.y - drag.sy));
      return;
    }
    if (marquee) {
      const world = toWorld(e.clientX, e.clientY);
      setMarquee({ ...marquee, x2: world.x, y2: world.y });
    }
  };

  const onPointerUp = (e: React.PointerEvent): void => {
    if (pan) {
      setPan(null);
      return;
    }
    if (drag?.active) {
      const world = toWorld(e.clientX, e.clientY);
      const dx = snapValue(world.x - drag.sx);
      const dy = snapValue(world.y - drag.sy);
      setDrag(null);
      if (dx !== 0 || dy !== 0) onDragCommit(dx, dy);
      else onDragPreview(0, 0);
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
        const overlaps = b.x < mx2 && b.x + b.w > mx1 && b.y < my2 && b.y + b.h > my1;
        if (overlaps) ids.push(rec.id);
      }
      if (ids.length > 0) onSelect(ids, e.shiftKey);
      setMarquee(null);
    }
  };

  const cursorClass = placing !== null ? 'canvas placing' : pan ? 'canvas panning' : 'canvas';

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
        arrastrá para mover · <b>alt</b>+arrastrar o botón central para desplazar · rueda para zoom ·{' '}
        <b>⌘Z</b> deshacer
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
      <rect
        className={selected ? 'body sel' : 'body'}
        x={0}
        y={0}
        width={box.width}
        height={box.height}
        rx={0.6}
      />
      <g transform={`translate(${inset} ${inset})`}>
        <SymbolGlyph
          code={rec.code}
          pinNames={rec.pins}
          w={iw}
          h={ih}
          rotation={rotation}
          selected={selected}
        />
      </g>

      {pins.map((p, i) => (
        <circle
          key={`pin-${i}`}
          className={selected ? 'pin sel' : 'pin'}
          cx={p.x - x}
          cy={p.y - y}
          r={0.9}
        />
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
    return <circle className={selected ? 'junction sel' : 'junction'} cx={pts.x1} cy={pts.y1} r={1.4} />;
  }
  return (
    <path
      data-id={rec.id}
      className={selected ? 'wire sel' : `wire${rec.code === 4019 ? ' alt' : ''}`}
      d={`M${pts.x1} ${pts.y1}L${pts.x2} ${pts.y2}`}
      style={{ cursor: 'pointer' }}
    />
  );
}
