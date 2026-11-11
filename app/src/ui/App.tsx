import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';
import type { JSX } from 'react';
import {
  BookOpenIcon,
  ClipboardPasteIcon,
  CopyIcon,
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
import { isPushable } from '../model/component-spec.ts';
import type { Point } from '../editor/pins.ts';
import { Canvas } from './Canvas.tsx';
import { Palette } from './Palette.tsx';
import { Inspector } from './Inspector.tsx';
import { SAMPLES, loadSample, loadFile, downloadCade } from './samples.ts';
import { JUNCTION_TEMPLATE, WIRE_TEMPLATES } from '../symbols/templates.ts';
import { templateForPlacement } from '../symbols/place.ts';
import { blankDocument } from '../format/blank.ts';
import { DEFAULT_FILE_NAME, cadFileName } from '../format/filename.ts';
import { circuitFrom } from '../sim/circuit.ts';
import { simulate } from '../sim/solver.ts';
import { visualStatesOf } from '../sim/visual.ts';
import { isProtectionCode, partKey } from '../sim/netlist.ts';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Menubar,
  MenubarLabel,
  MenubarCheckboxItem,
  MenubarContent,
  MenubarGroup,
  MenubarItem,
  MenubarMenu,
  MenubarRadioGroup,
  MenubarRadioItem,
  MenubarSeparator,
  MenubarShortcut,
  MenubarSub,
  MenubarSubContent,
  MenubarSubTrigger,
  MenubarTrigger,
} from '@/components/ui/menubar';
import { Separator } from '@/components/ui/separator';
import { Spinner } from '@/components/ui/spinner';
import { Toaster } from '@/components/ui/sonner';
import { getPack, setPack, subscribePack, type SymbolPack } from '../symbols/pack.ts';
import { getScope, setScope, subscribeScope } from '../symbols/scope.ts';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

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
  /** Paquete de dibujos: base (propio + EN 60617) o la hoja DXF. */
  const pack = useSyncExternalStore(subscribePack, getPack, getPack);
  const scope = useSyncExternalStore(subscribeScope, getScope, getScope);
  /** Primer clic de un cable: origen. El segundo clic lo cierra. */
  const [wireStart, setWireStart] = useState<{ x: number; y: number } | null>(null);
  const [running, setRunning] = useState(false);
  /** Pulsadores apretados durante la simulación (ids de registro). */
  const [pressedRecords, setPressedRecords] = useState<number[]>([]);
  /** Protecciones abiertas/disparadas durante la simulación. */
  const [openProtections, setOpenProtections] = useState<number[]>([]);
  /** Reloj de simulación para temporizadores (ms desde que arrancó). */
  const [tick, setTick] = useState(0);
  const timerStartRef = useRef(new Map<string, number>());
  const timerDeStartRef = useRef(new Map<string, number>());
  const timerReadyRef = useRef(new Set<number>());

  useEffect(() => {
    if (!running) {
      timerStartRef.current.clear();
      timerDeStartRef.current.clear();
      setTick(0);
      return;
    }
    const id = window.setInterval(() => setTick((t) => t + 100), 100);
    return () => window.clearInterval(id);
  }, [running]);
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

  /** Proyecto nuevo: si hay cambios sin guardar, primero pregunta. */
  const newProject = useCallback(() => {
    if (!state) return;
    if (state.dirty && !window.confirm('Hay cambios sin guardar. ¿Empezar un proyecto nuevo igual?')) return;
    openText(blankDocument(), DEFAULT_FILE_NAME);
    toast('proyecto nuevo');
  }, [state, openText]);

  /** Guardar: si el documento no re-parsea igual, no se escribe nada. */
  const saveDocument = useCallback(() => {
    if (!state) return;
    if (!roundTrips(state.text)) {
      flash('no se guardó: el documento no re-parsea igual');
      return;
    }
    // Se guarda siempre `.cad`: abrir un `.cade` y guardarlo lo deja con la
    // extensión del CAD. El nombre en pantalla acompaña al archivo escrito.
    const name = cadFileName(fileName);
    downloadCade(state.text, name);
    setFileName(name);
  }, [state, fileName, flash]);

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

  /**
   * Circuito armado desde el dibujo: la alimentación sale de los símbolos de
   * alimentación (3000/3001/…) y de los tipos de cable, como en CADe_SIMU.
   * No hay marcas manuales de fase/neutro.
   */
  const built = useMemo(() => {
    if (!project) return null;
    return circuitFrom(project.records, { openRecords: new Set(openProtections) });
  }, [project, openProtections]);

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

    // Temporizadores: se acumula el tiempo mientras el coil está energizado.
    const timerParts = new Set(built.circuit.devices.filter((d) => d.timer).map((d) => d.part));
    const timers = new Map<string, { onReady: boolean; offReady: boolean }>();
    for (const part of timerParts) {
      const coilOn = lastEnergized.current.has(part);
      if (coilOn) {
        if (!timerStartRef.current.has(part)) {
          timerStartRef.current.set(part, tick);
          timerDeStartRef.current.delete(part);
        }
        const elapsed = tick - (timerStartRef.current.get(part) ?? tick);
        timers.set(part, { onReady: elapsed >= 1000, offReady: false });
      } else {
        timerStartRef.current.delete(part);
        if (!timerDeStartRef.current.has(part)) timerDeStartRef.current.set(part, tick);
        const elapsed = tick - (timerDeStartRef.current.get(part) ?? tick);
        timers.set(part, { onReady: false, offReady: elapsed < 1000 });
      }
    }

    const timerReadyIds = new Set<number>();
    for (const d of built.circuit.devices) {
      if (d.timer && timers.get(d.part)?.onReady) timerReadyIds.add(Number(d.id.split(':')[0]));
    }
    timerReadyRef.current = timerReadyIds;

    const state = simulate(built.circuit, { pressed, initialEnergized: lastEnergized.current, timers, latched: lastEnergized.current });
    lastEnergized.current = state.energized;
    return state;
  }, [running, built, pressed, tick]);

  /** Registros cuyo aparato quedó energizado: bobina, lámpara o motor. */
  const live = useMemo(() => {
    const out = new Set<number>();
    if (!simulation || !project) return out;
    const loaded = new Set<number>();
    for (const id of simulation.loads) loaded.add(Number(id.split(':')[0]));
    for (const rec of project.records) {
      if (rec.kind !== 'component') continue;
      if (simulation.energized.has(partKey(rec.designator)) || loaded.has(rec.id)) out.add(rec.id);
    }
    return out;
  }, [simulation, project]);

  /**
   * Contactos cerrados en este estado: la hoja se dibuja apoyada.
   *
   * El solver informa los dispositivos que conducen, pero un contacto auxiliar
   * no está entre ellos: su estado lo manda el aparato del mismo designador.
   * Por eso además se miran los contactos NA (7000/2001) de un aparato
   * energizado y se abren los NC (7001) del mismo aparato.
   */
  const closedContacts = useMemo(() => {
    const out = new Set<number>();
    if (!simulation || !project) return out;
    for (const id of simulation.closed) out.add(Number(id.split(':')[0]));
    for (const rec of project.records) {
      if (rec.kind !== 'component') continue;
      if (rec.code !== 7000 && rec.code !== 7001 && rec.code !== 2001) continue;
      const live = simulation.energized.has(partKey(rec.designator));
      if (rec.code === 7001) {
        if (!live) out.add(rec.id);
        else out.delete(rec.id);
      } else if (live) {
        out.add(rec.id);
      }
    }
    return out;
  }, [simulation, project]);

  /**
   * Tramos con corriente: los que tocan una red viva y también los del retorno
   * cuando una carga está cerrada. Sin eso el flujo se corta en la lámpara y no
   * se ve el circuito completo.
   */
  const liveWires = useMemo(() => {
    const out = new Set<number>();
    if (!simulation || !built) return out;
    const carrying = new Set<number>(simulation.liveNets);
    for (const id of simulation.loads) {
      const device = built.circuit.devices.find((d) => d.id === id);
      if (!device) continue;
      carrying.add(device.a);
      carrying.add(device.b);
    }
    for (const [recordId, nets] of built.recordNets) {
      if (nets.some((net) => carrying.has(net))) out.add(recordId);
    }
    return out;
  }, [simulation, built]);

  /** Estado visual por componente para animar el lienzo. */
  const visualStates = useMemo(
    () =>
      visualStatesOf(project?.records ?? [], {
        simulating: running,
        live,
        closed: closedContacts,
        pressed: new Set(pressedRecords),
        tripped: new Set(openProtections),
        timerReady: timerReadyRef.current,
      }),
    [project, running, live, closedContacts, pressedRecords, openProtections, tick],
  );

  const toggleSimulation = (): void => {
    if (running) {
      setRunning(false);
      setPressedRecords([]);
      setOpenProtections([]);
      lastEnergized.current = new Set();
      return;
    }
    if (!built) {
      flash('el dibujo no tiene alimentación: agregá un símbolo de fase y otro de neutro');
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
    // Con la simulación activa, un clic sobre un pulsador lo aprieta/suelta y
    // sobre una protección la abre/dispara (o la rearma).
    if (running && ids.length === 1) {
      const id = ids[0]!;
      const code = projectOf(state!).records.find((r) => r.id === id)?.code ?? -1;
      if (isPushable(code)) {
        setPressedRecords((prev) => (prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id]));
        return;
      }
      if (isProtectionCode(code)) {
        setOpenProtections((prev) => (prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id]));
        return;
      }
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

  /**
   * Cancelar lo que esté en curso: selección, vértice enfocado, cable a medio
   * dibujar y componente a medio colocar. Lo usan Escape y el botón derecho.
   */
  const cancel = useCallback(() => {
    setPlacing(null);
    setWireStart(null);
    setState((s) => (s ? selectVertex(select(s, [], false), null) : s));
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
        cancel();
        return;
      }
      if (typing) return;
      // Durante la simulación el circuito es de solo lectura: nada de
      // deshacer, pegar, borrar ni rotar.
      if (running) return;

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
  }, [flash, cancel, running]);

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

  const palette = (
    <Palette
      placing={placing}
      onPick={(code) => {
        if (running) {
          flash('detené la simulación para editar el circuito');
          return;
        }
        setWireStart(null);
        setPlacing(code);
      }}
      sheets={project.sheets}
      activeSheet={activeSheet}
      onSheet={setActiveSheet}
    />
  );

  return (
    <TooltipProvider delayDuration={400}>
      <div className="flex h-full flex-col" data-pack={pack}>
        <header className="relative z-10 flex h-[46px] shrink-0 items-center gap-2 border-b border-border bg-card px-3 shadow-chrome-down">
          <div className="mr-0.5 flex shrink-0 items-baseline gap-1.5">
            <strong className="text-[13.5px] font-semibold tracking-tight">Electro-Simulador</strong>
            <span className="font-mono text-[10.5px] text-muted-foreground">v0.3</span>
          </div>

          <Menubar>
            <MenubarMenu>
              <MenubarTrigger>Archivo</MenubarTrigger>
              <MenubarContent>
                <MenubarGroup>
                  <MenubarItem onSelect={newProject}>
                    <FilePlusIcon />
                    Nuevo
                  </MenubarItem>
                  <MenubarItem onSelect={() => fileInput.current?.click()}>
                    <FolderOpenIcon />
                    Abrir…
                  </MenubarItem>
                  <MenubarSub>
                    <MenubarSubTrigger>
                      <BookOpenIcon />
                      Ejemplos
                    </MenubarSubTrigger>
                    <MenubarSubContent>
                      <MenubarGroup>
                        {SAMPLES.map((s) => (
                          <MenubarItem
                            key={s.name}
                            onSelect={() => {
                              void loadSample(s).then((text) => openText(text, s.name));
                            }}
                          >
                            {s.label}
                            {cadFileName(fileName) === cadFileName(s.name) && <MenubarShortcut>actual</MenubarShortcut>}
                          </MenubarItem>
                        ))}
                      </MenubarGroup>
                    </MenubarSubContent>
                  </MenubarSub>
                </MenubarGroup>
                <MenubarSeparator />
                <MenubarGroup>
                  <MenubarItem onSelect={saveDocument}>
                    <SaveIcon />
                    Guardar .cad
                  </MenubarItem>
                </MenubarGroup>
              </MenubarContent>
            </MenubarMenu>

            <MenubarMenu>
              <MenubarTrigger>Editar</MenubarTrigger>
              <MenubarContent>
                <MenubarGroup>
                  <MenubarItem disabled={running || state.past.length === 0} onSelect={() => setState(undo(state))}>
                    <Undo2Icon />
                    Deshacer
                    <MenubarShortcut>⌘Z</MenubarShortcut>
                  </MenubarItem>
                  <MenubarItem disabled={running || state.future.length === 0} onSelect={() => setState(redo(state))}>
                    <Redo2Icon />
                    Rehacer
                    <MenubarShortcut>⇧⌘Z</MenubarShortcut>
                  </MenubarItem>
                </MenubarGroup>
                <MenubarSeparator />
                <MenubarGroup>
                  <MenubarItem
                    disabled={running || state.selection.length === 0}
                    onSelect={() => {
                      setState((s) => (s ? copySelection(s) : s));
                      flash('copiado');
                    }}
                  >
                    <CopyIcon />
                    Copiar
                    <MenubarShortcut>⌘C</MenubarShortcut>
                  </MenubarItem>
                  <MenubarItem disabled={running} onSelect={() => setState((s) => (s ? paste(s) : s))}>
                    <ClipboardPasteIcon />
                    Pegar
                    <MenubarShortcut>⌘V</MenubarShortcut>
                  </MenubarItem>
                </MenubarGroup>
                <MenubarSeparator />
                <MenubarGroup>
                  <MenubarItem disabled={running} onSelect={() => setState(rotateSelection(state))}>
                    <RotateCwIcon />
                    Rotar 90°
                    <MenubarShortcut>R</MenubarShortcut>
                  </MenubarItem>
                  <MenubarItem variant="destructive" disabled={running || state.selection.length === 0} onSelect={() => setState(deleteSelection(state))}>
                    <Trash2Icon />
                    Borrar selección
                    <MenubarShortcut>⌫</MenubarShortcut>
                  </MenubarItem>
                </MenubarGroup>
              </MenubarContent>
            </MenubarMenu>

            <MenubarMenu>
              <MenubarTrigger>Ver</MenubarTrigger>
              <MenubarContent>
                <MenubarGroup>
                  <MenubarCheckboxItem checked={showGrid} onCheckedChange={(checked) => setShowGrid(checked === true)}>
                    <Grid3x3Icon />
                    Grilla
                  </MenubarCheckboxItem>
                  <MenubarCheckboxItem checked={snap} onCheckedChange={(checked) => setSnap(checked === true)}>
                    <MagnetIcon />
                    Snap (paso de 3)
                  </MenubarCheckboxItem>
                  <MenubarItem onSelect={() => setFitToken((t) => t + 1)}>
                    <Maximize2Icon />
                    Encuadrar
                    <MenubarShortcut>⌘0</MenubarShortcut>
                  </MenubarItem>
                </MenubarGroup>
                <MenubarSeparator />
                <MenubarLabel>Tema</MenubarLabel>
                <MenubarRadioGroup value={mode} onValueChange={(value) => setMode(value as Mode)}>
                  <MenubarRadioItem value="light">
                    <SunIcon />
                    Modo día
                  </MenubarRadioItem>
                  <MenubarRadioItem value="dark">
                    <MoonIcon />
                    Modo noche
                  </MenubarRadioItem>
                </MenubarRadioGroup>
                <MenubarSeparator />
                <MenubarLabel>Dibujos</MenubarLabel>
                <MenubarRadioGroup value={pack} onValueChange={(value) => setPack(value as SymbolPack)}>
                  <MenubarRadioItem value="base">Base (propio + EN 60617)</MenubarRadioItem>
                  <MenubarRadioItem value="dxf">Hoja DXF</MenubarRadioItem>
                  <MenubarRadioItem value="cadesimu">CADe_SIMU (clásico)</MenubarRadioItem>
                </MenubarRadioGroup>
                <MenubarSeparator />
                <MenubarCheckboxItem
                  checked={scope === 'cadesimu'}
                  onCheckedChange={(checked) => setScope(checked === true ? 'cadesimu' : 'all')}
                >
                  Solo componentes CADe_SIMU
                </MenubarCheckboxItem>
              </MenubarContent>
            </MenubarMenu>

            <MenubarMenu>
              <MenubarTrigger>Simulación</MenubarTrigger>
              <MenubarContent>
                <MenubarGroup>
                  <MenubarItem onSelect={toggleSimulation}>
                    {running ? <SquareIcon /> : <PlayIcon />}
                    {running ? 'Detener simulación' : 'Simular'}
                  </MenubarItem>
                </MenubarGroup>
              </MenubarContent>
            </MenubarMenu>
          </Menubar>

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

          <span className="max-w-[200px] shrink-0 truncate font-mono text-[11px] text-muted-foreground">{fileName}</span>

          <div className="flex-1" />

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

          <Separator orientation="vertical" className="mx-0.5 h-5" />

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

          <Separator orientation="vertical" className="mx-0.5 h-5" />

          <Button size="sm" onClick={saveDocument}>
            <SaveIcon data-icon="inline-start" />
            Guardar .cad
          </Button>
        </header>

        <div className="flex min-h-0 flex-1 flex-col">
          {pack === 'cadesimu' && palette}
          <div className="flex min-h-0 flex-1">
            {pack !== 'cadesimu' && palette}

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
            states={visualStates}
            liveWires={liveWires}
            closedContacts={closedContacts}
            simulating={running}
            highlight={highlight}
            onZoom={setZoom}
            onInsertVertex={onInsertVertex}
            onVertexSelect={onVertexSelect}
            onCancel={cancel}
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
            readOnly={running}
            onAddJunction={(x, y) => setState(addJunction(state, x, y, JUNCTION_TEMPLATE ?? undefined))}
            onFocusFinding={(f) => setHighlight({ ids: f.ids, at: f.at ?? null })}
          />
          </div>
        </div>

        <footer className="relative z-10 flex h-[26px] shrink-0 items-center gap-3.5 border-t border-border bg-card px-3 font-mono text-[11px] tabular-nums text-muted-foreground shadow-chrome-up">
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
          {built ? (
            <span>alimentación detectada</span>
          ) : (
            <span>sin alimentación en el dibujo</span>
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
