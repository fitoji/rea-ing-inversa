import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { JSX } from 'react';
import {
  FolderOpenIcon,
  FilePlusIcon,
  Grid3x3Icon,
  MagnetIcon,
  Maximize2Icon,
  MoonIcon,
  PlayIcon,
  SquareIcon,
  Redo2Icon,
  RotateCwIcon,
  SaveIcon,
  SunIcon,
  Trash2Icon,
  Undo2Icon,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  createEditor,
  projectOf,
  select,
  deleteSelection,
  copySelection,
  paste,
  addComponent,
  rotateSelection,
  setDesignator,
  setCableNumber,
  setSupply,
  insertVertex,
  deleteVertex,
  selectVertex,
  addJunction,
  addWire,
  applyDrag,
  undo,
  redo,
  type DragOp,
  type EditorState,
} from '../editor/state.ts';
import { buildNetwork, validate } from '../editor/network.ts';
import { roundTrips } from '../model/project.ts';
import type { Point } from '../editor/pins.ts';
import { Canvas } from './Canvas.tsx';
import { Palette } from './Palette.tsx';
import { Inspector } from './Inspector.tsx';
import { SAMPLES, loadSample, loadFile, downloadCade } from './samples.ts';
import { JUNCTION_TEMPLATE, WIRE_TEMPLATES } from '../symbols/templates.ts';
import { templateForPlacement } from '../symbols/place.ts';
import { blankDocument } from '../format/blank.ts';
import { circuitFrom } from '../sim/circuit.ts';
import { simulate } from '../sim/solver.ts';
import { partKey } from '../sim/netlist.ts';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Spinner } from '@/components/ui/spinner';
import { Toaster } from '@/components/ui/sonner';
import { Toggle } from '@/components/ui/toggle';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

/** Pulsadores que la simulación puede apretar. */
const PUSH_CODES = new Set([8000, 8001, 8002, 8004, 8005, 8006, 8100]);

const MODE_KEY = 'simuelectro:mode';

type Mode = 'dark' | 'light';

/** El tema vive fuera de React: la clase en <html> es la que manda. */
function readMode(): Mode {
  try {
    return localStorage.getItem(MODE_KEY) === 'light' ? 'light' : 'dark';
  } catch {
    return 'dark';
  }
}

export function App(): JSX.Element {
  const [state, setState] = useState<EditorState | null>(null);
  const [fileName, setFileName] = useState('');
  const [activeSheet, setActiveSheet] = useState(0);
  const [placing, setPlacing] = useState<number | null>(null);
  const [preview, setPreview] = useState<DragOp | null>(null);
  const [showGrid, setShowGrid] = useState(true);
  const [snap, setSnap] = useState(true);
  const [fitToken, setFitToken] = useState(0);
  const [zoom, setZoom] = useState(4);
  const [mode, setMode] = useState<Mode>(readMode);
  /** Primer clic de un cable: origen. El segundo clic lo cierra. */
  const [wireStart, setWireStart] = useState<{ x: number; y: number } | null>(null);
  const [running, setRunning] = useState(false);
  /** Pulsadores apretados durante la simulación (ids de registro). */
  const [pressedRecords, setPressedRecords] = useState<number[]>([]);
  /** Aviso enfocado: se resalta en rojo en el lienzo. */
  const [highlight, setHighlight] = useState<{ ids: number[]; at: Point | null } | null>(null);
  /** Estado retenido: un contactor no olvida entre pasos (enclavamientos). */
  const lastEnergized = useRef<Set<string>>(new Set());
  const fileInput = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', mode === 'dark');
    try {
      localStorage.setItem(MODE_KEY, mode);
    } catch {
      // Modo privado o storage bloqueado: el tema vale sólo para esta sesión.
    }
  }, [mode]);

  const flash = useCallback((message: string) => {
    toast(message, { duration: 2200 });
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
    return projectOf(applyDrag(state, preview));
  }, [state, preview, project]);

  const sheet = display?.sheets[Math.min(activeSheet, display.sheets.length - 1)];
  const records = useMemo(() => {
    if (!display || !sheet) return [];
    return display.records.slice(sheet.startRecord, sheet.endRecord);
  }, [display, sheet]);

  const selection = useMemo(() => new Set(state?.selection ?? []), [state]);

  const network = useMemo(() => buildNetwork(project?.records ?? []), [project]);
  const findings = useMemo(() => validate(project?.records ?? []), [project]);

  /** Circuito armado con la alimentación indicada; null si no hay fase/neutro. */
  const built = useMemo(() => {
    if (!project) return null;
    return circuitFrom(project.records, {
      phaseRecord: state?.supply.phase ?? null,
      neutralRecord: state?.supply.neutral ?? null,
    });
  }, [project, state?.supply.phase, state?.supply.neutral]);

  const pressed = useMemo(() => {
    const out = new Set<string>();
    if (!built) return out;
    for (const device of built.circuit.devices) {
      const recordId = Number(device.id.split(':')[0]);
      if (pressedRecords.includes(recordId)) out.add(device.id);
    }
    return out;
  }, [built, pressedRecords]);

  const simulation = useMemo(() => {
    if (!running || !built) return null;
    const state = simulate(built.circuit, { pressed, initialEnergized: lastEnergized.current });
    lastEnergized.current = state.energized;
    return state;
  }, [running, built, pressed]);

  /** Registros cuyo aparato quedó energizado en este estado. */
  const live = useMemo(() => {
    const out = new Set<number>();
    if (!simulation || !project) return out;
    for (const rec of project.records) {
      if (rec.kind !== 'component') continue;
      if (simulation.energized.has(partKey(rec.designator))) out.add(rec.id);
    }
    return out;
  }, [simulation, project]);

  const toggleSimulation = (): void => {
    if (running) {
      setRunning(false);
      setPressedRecords([]);
      lastEnergized.current = new Set();
      return;
    }
    if (!built) {
      flash('marcá un cable como Fase y otro como Neutro para simular');
      return;
    }
    setRunning(true);
    const first = simulate(built.circuit);
    flash(
      first.stable
        ? `simulando · ${first.energized.size} aparato${first.energized.size === 1 ? '' : 's'} energizado${first.energized.size === 1 ? '' : 's'}`
        : 'la maniobra no converge: revisá los enclavamientos',
    );
  };

  const selectedRecords = useMemo(() => {
    if (!project || !state) return [];
    const ids = new Set(state.selection);
    return project.records.filter((r) => ids.has(r.id));
  }, [project, state]);

  const onSelect = useCallback((ids: number[], additive: boolean) => {
    // Con la simulación activa, un clic sobre un pulsador lo aprieta/suelta.
    if (running && ids.length === 1 && PUSH_CODES.has(projectOf(state!).records.find((r) => r.id === ids[0])?.code ?? -1)) {
      const id = ids[0]!;
      setPressedRecords((prev) => (prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id]));
      return;
    }
    setState((s) => (s ? select(s, ids, additive) : s));
    setPlacing(null);
  }, [running, state]);

  const onDragPreview = useCallback((op: DragOp | null) => {
    setPreview(op);
  }, []);

  const onDragCommit = useCallback((op: DragOp) => {
    setState((s) => (s ? applyDrag(s, op) : s));
    setPreview(null);
  }, []);

  const onInsertVertex = useCallback((id: number, x: number, y: number) => {
    setState((s) => (s ? insertVertex(s, id, x, y) : s));
  }, []);

  const onVertexSelect = useCallback((vertex: { x: number; y: number } | null) => {
    setState((s) => (s ? selectVertex(s, vertex) : s));
  }, []);

  const onPlace = useCallback(
    (x: number, y: number) => {
      if (placing === null) return;
      const wire = WIRE_TEMPLATES[placing];
      if (wire) {
        // Dos clics: el primero marca el origen, el segundo cierra el tramo.
        if (!wireStart) {
          setWireStart({ x, y });
          return;
        }
        const from = wireStart;
        setWireStart(null);
        setState((s) => (s ? addWire(s, from, { x, y }, wire) : s));
        return;
      }
      const template = templateForPlacement(placing);
      if (!template) {
        flash(`sin plantilla para el código ${placing}`);
        return;
      }
      setState((s) => (s ? addComponent(s, template, x, y) : s));
    },
    [placing, flash, wireStart],
  );

  // --- atajos ---------------------------------------------------------------

  useEffect(() => {
    const onKey = (e: KeyboardEvent): void => {
      const el = e.target as HTMLElement | null;
      const typing = el !== null && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA');
      const mod = e.metaKey || e.ctrlKey;

      if (e.key === 'Escape') {
        setPlacing(null);
        setWireStart(null);
        setState((s) => (s ? selectVertex(select(s, [], false), null) : s));
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
        setState((s) => {
          if (!s) return s;
          // Con un vértice enfocado se borra el vértice; si no, la selección.
          return s.vertex ? deleteVertex(s, s.vertex) : deleteSelection(s);
        });
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
    return (
      <div className="grid h-full place-items-center">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Spinner />
          Cargando…
        </div>
      </div>
    );
  }

  const componentCount = project.records.filter((r) => r.kind === 'component').length;
  const wireCount = project.records.filter((r) => r.kind === 'connection').length;
  const sampleValue = SAMPLES.some((s) => s.name === fileName) ? fileName : undefined;

  return (
    <TooltipProvider delayDuration={400}>
      <div className="flex h-full flex-col">
        <header className="flex h-[46px] shrink-0 items-center gap-1.5 border-b border-border bg-card px-3">
          <div className="mr-1.5 flex items-baseline gap-1.5">
            <strong className="text-[13.5px] font-semibold tracking-tight">simuElectro</strong>
            <span className="font-mono text-[10.5px] text-muted-foreground">v0.1</span>
          </div>

          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              if (state.dirty && !window.confirm('Hay cambios sin guardar. ¿Empezar un proyecto nuevo igual?')) return;
              openText(blankDocument(), 'sin título.cade');
              toast('proyecto nuevo');
            }}
          >
            <FilePlusIcon data-icon="inline-start" />
            Nuevo
          </Button>

          <Select
            value={sampleValue}
            onValueChange={(name) => {
              const sample = SAMPLES.find((s) => s.name === name);
              if (!sample) return;
              void loadSample(sample).then((text) => openText(text, sample.name));
            }}
          >
            <SelectTrigger size="sm" className="w-[176px]">
              <SelectValue placeholder={fileName === '' ? 'Ejemplos' : fileName} />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                {SAMPLES.map((s) => (
                  <SelectItem key={s.name} value={s.name}>
                    {s.label}
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>

          <Button variant="ghost" size="sm" onClick={() => fileInput.current?.click()}>
            <FolderOpenIcon data-icon="inline-start" />
            Abrir…
          </Button>
          <input
            ref={fileInput}
            type="file"
            accept=".cade,.cad"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (!file) return;
              void loadFile(file).then(({ text, name }) => openText(text, name));
              e.target.value = '';
            }}
          />

          <Separator orientation="vertical" className="mx-1 h-5" />

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon-sm"
                aria-label="Deshacer"
                disabled={state.past.length === 0}
                onClick={() => setState(undo(state))}
              >
                <Undo2Icon />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Deshacer (⌘Z)</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon-sm"
                aria-label="Rehacer"
                disabled={state.future.length === 0}
                onClick={() => setState(redo(state))}
              >
                <Redo2Icon />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Rehacer (⇧⌘Z)</TooltipContent>
          </Tooltip>

          <Separator orientation="vertical" className="mx-1 h-5" />

          <Button variant="ghost" size="sm" title="Rotar 90° (R)" onClick={() => setState(rotateSelection(state))}>
            <RotateCwIcon data-icon="inline-start" />
            Rotar
          </Button>
          <Button variant="ghost" size="sm" title="Borrar (⌫)" onClick={() => setState(deleteSelection(state))}>
            <Trash2Icon data-icon="inline-start" />
            Borrar
          </Button>

          <Separator orientation="vertical" className="mx-1 h-5" />

          <Toggle pressed={showGrid} onPressedChange={setShowGrid} variant="outline" size="sm">
            <Grid3x3Icon data-icon="inline-start" />
            Grilla
          </Toggle>
          <Toggle
            pressed={snap}
            onPressedChange={setSnap}
            variant="outline"
            size="sm"
            title="Paso de 3 unidades"
          >
            <MagnetIcon data-icon="inline-start" />
            Snap
          </Toggle>
          <Button variant="ghost" size="sm" title="Encuadrar (⌘0)" onClick={() => setFitToken((t) => t + 1)}>
            <Maximize2Icon data-icon="inline-start" />
            Encuadrar
          </Button>

          <div className="flex-1" />

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant={running ? 'secondary' : 'ghost'}
                size="sm"
                aria-pressed={running}
                aria-label={running ? 'Detener simulación' : 'Simular'}
                onClick={toggleSimulation}
              >
                {running ? <SquareIcon data-icon="inline-start" /> : <PlayIcon data-icon="inline-start" />}
                {running ? 'Detener' : 'Simular'}
              </Button>
            </TooltipTrigger>
            <TooltipContent>{running ? 'Detener la simulación' : 'Simular con la alimentación indicada'}</TooltipContent>
          </Tooltip>

          <Separator orientation="vertical" className="mx-1 h-5" />

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon-sm"
                aria-label={mode === 'dark' ? 'Cambiar a modo día' : 'Cambiar a modo noche'}
                aria-pressed={mode === 'light'}
                onClick={() => setMode(mode === 'dark' ? 'light' : 'dark')}
              >
                {mode === 'dark' ? <SunIcon /> : <MoonIcon />}
              </Button>
            </TooltipTrigger>
            <TooltipContent>{mode === 'dark' ? 'Modo día' : 'Modo noche'}</TooltipContent>
          </Tooltip>

          <Separator orientation="vertical" className="mx-1 h-5" />

          <Button
            size="sm"
            onClick={() => {
              // Antes de escribir el archivo: si no re-parsea igual, no se guarda.
              if (!roundTrips(state.text)) {
                flash('no se guardó: el documento no re-parsea igual');
                return;
              }
              downloadCade(state.text, fileName);
            }}
          >
            <SaveIcon data-icon="inline-start" />
            Guardar .cade
          </Button>
        </header>

        <div className="flex min-h-0 flex-1">
          <Palette
            placing={placing}
            onPick={(code) => {
              setWireStart(null);
              setPlacing(code);
            }}
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
            wireStart={wireStart}
            live={live}
            highlight={highlight}
            onZoom={setZoom}
            onInsertVertex={onInsertVertex}
            onVertexSelect={onVertexSelect}
          />

          <Inspector
            selected={selectedRecords}
            rotation={state.rotation}
            network={network}
            findings={findings}
            vertex={state.vertex}
            onDeleteVertex={() => setState((s) => (s && s.vertex ? deleteVertex(s, s.vertex) : s))}
            onDesignator={(id, value) => setState(setDesignator(state, id, value))}
            onRotate={() => setState(rotateSelection(state))}
            onDelete={() => setState(deleteSelection(state))}
            onCableNumber={(ids, n) => setState(setCableNumber(state, ids, n))}
            supply={state.supply}
            onSetSupply={(which, id) => setState((s) => (s ? setSupply(s, which, id) : s))}
            onAddJunction={(x, y) => setState(addJunction(state, x, y, JUNCTION_TEMPLATE ?? undefined))}
            onFocusFinding={(f) => setHighlight({ ids: f.ids, at: f.at ?? null })}
          />
        </div>

        <footer className="flex h-[26px] shrink-0 items-center gap-3.5 border-t border-border bg-card px-3 font-mono text-[11px] text-muted-foreground">
          <span
            className={cn('size-1.5 shrink-0 rounded-full', state.dirty ? 'bg-warn' : 'bg-wire')}
            aria-hidden="true"
          />
          <span>{fileName}</span>
          <span>{project.records.length} registros</span>
          <span>{componentCount} componentes</span>
          <span>{wireCount} cables</span>
          <span>
            {project.sheets.length} hoja{project.sheets.length === 1 ? '' : 's'}
          </span>
          <span className="flex-1" />
          {state.supply.phase !== null && state.supply.neutral !== null ? (
            <span>alimentación indicada</span>
          ) : (
            <span>marcá un cable como fase y otro como neutro para simular</span>
          )}
          {simulation && (
            <Badge variant={simulation.stable ? 'secondary' : 'destructive'} className="h-4 px-1.5 text-[10px]">
              {simulation.stable ? 'simulación estable' : 'oscila'} · {simulation.energized.size}
            </Badge>
          )}
          {findings.length > 0 && (
            <Badge variant="destructive" className="h-4 px-1.5 text-[10px]">
              {findings.length} aviso{findings.length === 1 ? '' : 's'}
            </Badge>
          )}
          {state.selection.length > 0 && <span>{state.selection.length} seleccionados</span>}
          <span>{Math.round(zoom * 100)}%</span>
          {placing !== null && <span>colocando código {placing} · esc para salir</span>}
        </footer>
      </div>

      <Toaster theme={mode} position="top-center" />
    </TooltipProvider>
  );
}
