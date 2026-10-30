import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { JSX } from 'react';
import {
  createEditor,
  projectOf,
  select,
  moveSelection,
  deleteSelection,
  copySelection,
  paste,
  addComponent,
  rotateSelection,
  setDesignator,
  undo,
  redo,
  type EditorState,
} from '../editor/state.ts';
import { Canvas } from './Canvas.tsx';
import { Palette } from './Palette.tsx';
import { Inspector } from './Inspector.tsx';
import { SAMPLES, loadSample, loadFile, downloadCade } from './samples.ts';
import { templateFor } from '../symbols/templates.ts';

export function App(): JSX.Element {
  const [state, setState] = useState<EditorState | null>(null);
  const [fileName, setFileName] = useState('');
  const [activeSheet, setActiveSheet] = useState(0);
  const [placing, setPlacing] = useState<number | null>(null);
  const [preview, setPreview] = useState<{ dx: number; dy: number } | null>(null);
  const [showGrid, setShowGrid] = useState(true);
  const [snap, setSnap] = useState(true);
  const [fitToken, setFitToken] = useState(0);
  const [zoom, setZoom] = useState(4);
  const [toast, setToast] = useState<string | null>(null);
  const fileInput = useRef<HTMLInputElement | null>(null);

  const flash = useCallback((message: string) => {
    setToast(message);
    window.setTimeout(() => setToast(null), 2200);
  }, []);

  const openText = useCallback((text: string, name: string) => {
    setState(createEditor(text));
    setFileName(name);
    setActiveSheet(0);
    setPlacing(null);
    setPreview(null);
    setFitToken((t) => t + 1);
  }, []);

  useEffect(() => {
    void loadSample(SAMPLES[0]!).then((text) => openText(text, SAMPLES[0]!.name));
  }, [openText]);

  const project = useMemo(() => (state ? projectOf(state) : null), [state]);

  const display = useMemo(() => {
    if (!state || !preview) return project;
    if (preview.dx === 0 && preview.dy === 0) return project;
    return projectOf(moveSelection(state, preview.dx, preview.dy));
  }, [state, preview, project]);

  const sheet = display?.sheets[Math.min(activeSheet, display.sheets.length - 1)];
  const records = useMemo(() => {
    if (!display || !sheet) return [];
    return display.records.slice(sheet.startRecord, sheet.endRecord);
  }, [display, sheet]);

  const selection = useMemo(() => new Set(state?.selection ?? []), [state]);

  const selectedRecords = useMemo(() => {
    if (!project || !state) return [];
    const ids = new Set(state.selection);
    return project.records.filter((r) => ids.has(r.id));
  }, [project, state]);

  const onSelect = useCallback((ids: number[], additive: boolean) => {
    setState((s) => (s ? select(s, ids, additive) : s));
    setPlacing(null);
  }, []);

  const onDragPreview = useCallback((dx: number, dy: number) => {
    setPreview({ dx, dy });
  }, []);

  const onDragCommit = useCallback((dx: number, dy: number) => {
    setState((s) => {
      if (!s) return s;
      const next = moveSelection(s, dx, dy);
      return next;
    });
    setPreview(null);
  }, []);

  const onPlace = useCallback(
    (x: number, y: number) => {
      if (placing === null) return;
      const template = templateFor(placing);
      if (!template) {
        flash(`sin plantilla para el código ${placing}`);
        return;
      }
      setState((s) => (s ? addComponent(s, template, x, y) : s));
    },
    [placing, flash],
  );

  // --- atajos ---------------------------------------------------------------

  useEffect(() => {
    const onKey = (e: KeyboardEvent): void => {
      const el = e.target as HTMLElement | null;
      const typing = el !== null && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA');
      const mod = e.metaKey || e.ctrlKey;

      if (e.key === 'Escape') {
        setPlacing(null);
        setState((s) => (s ? select(s, [], false) : s));
        return;
      }
      if (typing) return;

      if (mod && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        setState((s) => (s ? (e.shiftKey ? redo(s) : undo(s)) : s));
        return;
      }
      if (mod && e.key.toLowerCase() === 'c') {
        e.preventDefault();
        setState((s) => (s ? copySelection(s) : s));
        flash('copiado');
        return;
      }
      if (mod && e.key.toLowerCase() === 'v') {
        e.preventDefault();
        setState((s) => (s ? paste(s) : s));
        return;
      }
      if (mod && e.key === '0') {
        e.preventDefault();
        setFitToken((t) => t + 1);
        return;
      }
      if (e.key === 'Delete' || e.key === 'Backspace') {
        e.preventDefault();
        setState((s) => (s ? deleteSelection(s) : s));
        return;
      }
      if (e.key.toLowerCase() === 'r') {
        setState((s) => (s ? rotateSelection(s) : s));
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [flash]);

  if (!state || !project) {
    return <div className="empty-state" style={{ padding: 40 }}>Cargando…</div>;
  }

  const componentCount = project.records.filter((r) => r.kind === 'component').length;
  const wireCount = project.records.filter((r) => r.kind === 'connection').length;

  return (
    <div className="app">
      <header className="toolbar">
        <div className="brand">
          <strong>simuElectro</strong>
          <span>v0.1</span>
        </div>

        <select
          className="btn"
          value={fileName}
          onChange={(e) => {
            const sample = SAMPLES.find((s) => s.name === e.target.value);
            if (!sample) return;
            void loadSample(sample).then((text) => openText(text, sample.name));
          }}
          style={{ height: 28, paddingLeft: 6 }}
        >
          {SAMPLES.map((s) => (
            <option key={s.name} value={s.name}>
              {s.label}
            </option>
          ))}
        </select>

        <button className="btn" onClick={() => fileInput.current?.click()}>
          Abrir…
        </button>
        <input
          ref={fileInput}
          type="file"
          accept=".cade,.cad"
          style={{ display: 'none' }}
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (!file) return;
            void loadFile(file).then(({ text, name }) => openText(text, name));
            e.target.value = '';
          }}
        />

        <div className="sep" />

        <button className="btn icon" title="Deshacer (⌘Z)" disabled={state.past.length === 0} onClick={() => setState(undo(state))}>
          ↶
        </button>
        <button className="btn icon" title="Rehacer (⇧⌘Z)" disabled={state.future.length === 0} onClick={() => setState(redo(state))}>
          ↷
        </button>

        <div className="sep" />

        <button className="btn" title="Rotar 90° (R)" onClick={() => setState(rotateSelection(state))}>
          Rotar
        </button>
        <button className="btn" title="Borrar (⌫)" onClick={() => setState(deleteSelection(state))}>
          Borrar
        </button>

        <div className="sep" />

        <button className={showGrid ? 'btn on' : 'btn'} onClick={() => setShowGrid((v) => !v)}>
          Grilla
        </button>
        <button className={snap ? 'btn on' : 'btn'} onClick={() => setSnap((v) => !v)} title="Paso de 3 unidades">
          Snap
        </button>
        <button className="btn" onClick={() => setFitToken((t) => t + 1)} title="Encuadrar (⌘0)">
          Encuadrar
        </button>

        <div className="spacer" />

        <button className="btn primary" onClick={() => downloadCade(state.text, fileName)}>
          Guardar .cade
        </button>
      </header>

      <Palette
        placing={placing}
        onPick={setPlacing}
        sheets={project.sheets}
        activeSheet={activeSheet}
        onSheet={setActiveSheet}
      />

      <Canvas
        records={records}
        selection={selection}
        rotation={state.rotation}
        showGrid={showGrid}
        snap={snap}
        placing={placing}
        fitToken={fitToken}
        onSelect={onSelect}
        onDragPreview={onDragPreview}
        onDragCommit={onDragCommit}
        onPlace={onPlace}
        onZoom={setZoom}
      />

      <Inspector
        selected={selectedRecords}
        rotation={state.rotation}
        onDesignator={(id, value) => setState(setDesignator(state, id, value))}
        onRotate={() => setState(rotateSelection(state))}
        onDelete={() => setState(deleteSelection(state))}
      />

      <footer className="statusbar">
        <span className={state.dirty ? 'dot dirty' : 'dot'} />
        <span>{fileName}</span>
        <span>{project.records.length} registros</span>
        <span>{componentCount} componentes</span>
        <span>{wireCount} cables</span>
        <span>{project.sheets.length} hoja{project.sheets.length === 1 ? '' : 's'}</span>
        <span className="spacer" style={{ flex: 1 }} />
        {state.selection.length > 0 && <span>{state.selection.length} seleccionados</span>}
        <span>{Math.round(zoom * 100)}%</span>
        {placing !== null && <span>colocando código {placing} · esc para salir</span>}
      </footer>

      {toast && <div className="toast">{toast}</div>}
    </div>
  );
}
