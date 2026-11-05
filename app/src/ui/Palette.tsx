import type { CSSProperties, JSX } from 'react';
import { useEffect, useState, useSyncExternalStore } from 'react';
import { BoxesIcon, ChevronDownIcon, StarIcon } from 'lucide-react';
import { lineList, symbolList, type SymbolDef, type SymbolGroup } from '../symbols/library.ts';
import { CATALOG } from '../symbols/catalog.ts';
import { getScope, subscribeScope } from '../symbols/scope.ts';
import { getPack, subscribePack } from '../symbols/pack.ts';
import { SymbolGlyph } from './SymbolGlyph.tsx';
import { PanelHead } from './PanelHead.tsx';
import type { Sheet } from '../model/project.ts';
import { readFavorites, writeFavorites } from './favorites.ts';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '@/components/ui/empty';
import { ScrollArea } from '@/components/ui/scroll-area';

const GROUP_LABEL: Record<SymbolGroup, string> = {
  motor: 'Motores',
  potencia: 'Potencia',
  proteccion: 'Protección',
  mando: 'Mando',
  alimentacion: 'Alimentación',
  senalizacion: 'Señalización y pulsadores',
  sensor: 'Sensores',
  linea: 'Líneas y cables',
  borne: 'Borneras',
  carga: 'Cargas',
  otro: 'Otros',
};

const GROUP_ORDER: SymbolGroup[] = [
  'alimentacion',
  'motor',
  'potencia',
  'proteccion',
  'mando',
  'senalizacion',
  'sensor',
  'linea',
  'carga',
  'borne',
  'otro',
];

/** Tono por familia: pinta las miniaturas, no el esquema. */
const GROUP_TONE: Record<SymbolGroup, string> = {
  alimentacion: 'var(--tone-alimentacion)',
  motor: 'var(--tone-motor)',
  potencia: 'var(--tone-potencia)',
  proteccion: 'var(--tone-proteccion)',
  mando: 'var(--tone-mando)',
  senalizacion: 'var(--tone-senalizacion)',
  sensor: 'var(--tone-sensor)',
  linea: 'var(--wire)',
  carga: 'var(--tone-otro)',
  borne: 'var(--tone-otro)',
  otro: 'var(--tone-otro)',
};

interface Props {
  placing: number | null;
  onPick: (code: number | null) => void;
  sheets: Sheet[];
  activeSheet: number;
  onSheet: (index: number) => void;
}

export function Palette({ placing, onPick, sheets, activeSheet, onSheet }: Props): JSX.Element {
  const scope = useSyncExternalStore(subscribeScope, getScope, getScope);
  const pack = useSyncExternalStore(subscribePack, getPack, getPack);
  const horizontal = pack === 'cadesimu';
  const available = [...symbolList(), ...lineList()].filter(
    (sym) => scope === 'all' || CATALOG[sym.code] !== undefined,
  );
  const byGroup = new Map<SymbolGroup, typeof available>();
  for (const sym of available) {
    const list = byGroup.get(sym.group) ?? [];
    list.push(sym);
    byGroup.set(sym.group, list);
  }
  // Categorías plegadas: con el catálogo completo la lista no entra de una vista.
  const [open, setOpen] = useState<string[]>(['fav']);
  /** Categorías desplegadas en la barra horizontal; arrancan todas plegadas. */
  const [openCats, setOpenCats] = useState<string[]>([]);
  const [favorites, setFavorites] = useState<number[]>(readFavorites);

  useEffect(() => writeFavorites(favorites), [favorites]);

  const toggleFavorite = (code: number): void =>
    setFavorites((prev) => (prev.includes(code) ? prev.filter((c) => c !== code) : [...prev, code]));

  const favSymbols = favorites
    .map((code) => available.find((sym) => sym.code === code))
    .filter((sym): sym is (typeof available)[number] => sym !== undefined);

  const groups = GROUP_ORDER.filter((g) => byGroup.has(g));

  const categories = [
    ...(favSymbols.length > 0
      ? [{ key: 'fav', label: 'Favoritos', tone: 'var(--tone-senalizacion)', syms: favSymbols }]
      : []),
    ...groups.map((group) => ({
      key: group,
      label: GROUP_LABEL[group],
      tone: GROUP_TONE[group],
      syms: byGroup.get(group)!,
    })),
  ];

  const toggleCategory = (key: string): void => {
    setOpenCats((prev) => (prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]));
  };

  // Estilo CADe_SIMU: una categoría por ícono; se despliega al hacer clic.
  if (horizontal) {
    return (
      <aside className="relative z-10 flex w-full shrink-0 flex-col border-b border-border bg-card shadow-chrome-down">
        <div className="flex items-stretch gap-2 px-2 py-1.5">
          <div className="flex min-w-0 flex-1 items-center gap-1 overflow-x-auto">
            {categories.map((cat) => {
              const expanded = openCats.includes(cat.key);
              const first = cat.syms[0];
              return (
                <Button
                  key={cat.key}
                  variant={expanded ? 'secondary' : 'ghost'}
                  className="flex h-auto shrink-0 items-center gap-1.5 px-1.5 py-1"
                  title={cat.label}
                  aria-expanded={expanded}
                  onClick={() => toggleCategory(cat.key)}
                >
                  {first && (
                    <span
                      className="pal-tone grid size-[26px] shrink-0 place-items-center rounded-md border"
                      style={{ '--ink': cat.tone } as CSSProperties}
                    >
                      <svg className="size-[22px]" viewBox="-4 -6 26 24" aria-hidden="true">
                        <SymbolGlyph code={first.code} pinNames={first.pins.map((p) => p.name)} w={18} h={15} />
                      </svg>
                    </span>
                  )}
                  <span className="flex flex-col items-start leading-tight">
                    <span className="text-[9px] font-semibold tracking-[0.3px] uppercase">{cat.label}</span>
                    <span className="text-[8px] text-muted-foreground">{cat.syms.length}</span>
                  </span>
                  <ChevronDownIcon className={expanded ? 'size-3 rotate-180 transition-transform' : 'size-3 transition-transform'} />
                </Button>
              );
            })}
          </div>
          <div className="flex shrink-0 items-center gap-1 border-l border-border pl-2">
            {sheets.map((sheet, i) => (
              <Button
                key={sheet.index}
                variant={i === activeSheet ? 'secondary' : 'ghost'}
                size="icon-xs"
                className="font-mono text-[10px]"
                title={`Hoja ${i + 1}`}
                aria-current={i === activeSheet ? 'true' : undefined}
                onClick={() => onSheet(i)}
              >
                {String(i + 1).padStart(2, '0')}
              </Button>
            ))}
          </div>
        </div>
        {categories
          .filter((cat) => openCats.includes(cat.key))
          .map((cat) => (
            <div
              key={cat.key}
              className="flex items-center gap-1 overflow-x-auto border-t border-border/60 bg-background/40 px-2 py-1"
            >
              {cat.syms.map((sym) => (
                <SymbolTile key={sym.code} sym={sym} group={sym.group} active={placing === sym.code} onPick={onPick} />
              ))}
            </div>
          ))}
      </aside>
    );
  }

  return (
    <aside className="relative z-10 flex min-h-0 w-[232px] shrink-0 flex-col border-r border-border bg-card shadow-chrome-right">
      <PanelHead>Insertar componente</PanelHead>

      <ScrollArea className="min-h-0 flex-1">
        <div className="px-1.5 pb-3">
          <Accordion type="multiple" value={open} onValueChange={setOpen}>
            {favSymbols.length > 0 && (
              <AccordionItem value="fav" className="border-border/60">
                <AccordionTrigger className="items-center gap-1.5 px-1.5 py-1.5 text-[10px] font-semibold tracking-[0.5px] text-muted-foreground uppercase hover:text-foreground hover:no-underline">
                  <StarIcon className="size-3 shrink-0 fill-current text-[var(--tone-senalizacion)]" />
                  <span className="truncate">Favoritos</span>
                  <Badge variant="ghost" className="ml-auto h-4 shrink-0 px-1 font-mono text-[10px] font-normal">
                    {favSymbols.length}
                  </Badge>
                </AccordionTrigger>
                <AccordionContent className="pt-0.5 pb-1">
                  {favSymbols.map((sym) => (
                    <SymbolRow
                      key={sym.code}
                      sym={sym}
                      group={sym.group}
                      active={placing === sym.code}
                      favorite
                      onPick={onPick}
                      onToggleFavorite={toggleFavorite}
                    />
                  ))}
                </AccordionContent>
              </AccordionItem>
            )}

            {GROUP_ORDER.filter((g) => byGroup.has(g)).map((group) => (
              <AccordionItem key={group} value={group} className="border-border/60">
                <AccordionTrigger className="items-center gap-1.5 px-1.5 py-1.5 text-[10px] font-semibold tracking-[0.5px] text-muted-foreground uppercase hover:text-foreground hover:no-underline">
                  <span className="size-1.5 shrink-0 rounded-full" style={{ background: GROUP_TONE[group] }} />
                  <span className="truncate">{GROUP_LABEL[group]}</span>
                  <Badge variant="ghost" className="ml-auto h-4 shrink-0 px-1 font-mono text-[10px] font-normal">
                    {byGroup.get(group)!.length}
                  </Badge>
                </AccordionTrigger>
                <AccordionContent className="pt-0.5 pb-1">
                  {byGroup.get(group)!.map((sym) => (
                    <SymbolRow
                      key={sym.code}
                      sym={sym}
                      group={group}
                      active={placing === sym.code}
                      favorite={favorites.includes(sym.code)}
                      onPick={onPick}
                      onToggleFavorite={toggleFavorite}
                    />
                  ))}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>

          {available.length === 0 && (
            <Empty className="p-4">
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <BoxesIcon />
                </EmptyMedia>
                <EmptyTitle>Sin plantillas</EmptyTitle>
                <EmptyDescription className="text-xs">
                  Corré <span className="font-mono">node scripts/make-templates.ts</span>.
                </EmptyDescription>
              </EmptyHeader>
            </Empty>
          )}
        </div>
      </ScrollArea>

      <div className="shrink-0 border-t border-border p-1.5">
        <div className="px-1.5 pt-1 pb-1 text-[10px] tracking-[0.5px] text-muted-foreground uppercase">Hojas</div>
        {sheets.map((sheet, i) => (
          <Button
            key={sheet.index}
            variant={i === activeSheet ? 'secondary' : 'ghost'}
            size="sm"
            className="w-full justify-start gap-2 px-1.5 text-xs"
            aria-current={i === activeSheet ? 'true' : undefined}
            onClick={() => onSheet(i)}
          >
            <Badge variant="outline" className="h-4 shrink-0 px-1 font-mono text-[10px] font-normal">
              {String(i + 1).padStart(2, '0')}
            </Badge>
            <span className="min-w-0 flex-1 truncate text-left">
              Hoja {i + 1}
              {sheet.titleBlock?.raw.includes('CADe_S1') ? ' · PLC' : ''}
            </span>
          </Button>
        ))}
      </div>
    </aside>
  );
}

interface RowProps {
  sym: SymbolDef;
  group: SymbolGroup;
  active: boolean;
  favorite: boolean;
  onPick: (code: number | null) => void;
  onToggleFavorite: (code: number) => void;
}

/** Ícono compacto para la barra horizontal del estilo CADe_SIMU. */
function SymbolTile({
  sym,
  group,
  active,
  onPick,
}: {
  sym: SymbolDef;
  group: SymbolGroup;
  active: boolean;
  onPick: (code: number | null) => void;
}): JSX.Element {
  return (
    <Button
      variant={active ? 'secondary' : 'ghost'}
      className="flex h-auto w-[56px] flex-col items-center gap-0.5 px-0.5 py-1"
      title={`${sym.name} — código ${sym.code}`}
      aria-pressed={active}
      onClick={() => onPick(active ? null : sym.code)}
    >
      <span
        className="pal-tone grid size-[28px] shrink-0 place-items-center rounded-md border"
        style={{ '--ink': GROUP_TONE[group] } as CSSProperties}
      >
        <svg className="size-[24px]" viewBox="-4 -6 26 24" aria-hidden="true">
          <SymbolGlyph code={sym.code} pinNames={sym.pins.map((p) => p.name)} w={18} h={15} />
        </svg>
      </span>
      <span className="w-full truncate text-center text-[8px] leading-tight">{sym.name}</span>
    </Button>
  );
}

/** Una fila de la paleta: elegir el componente y marcarlo como favorito. */
function SymbolRow({ sym, group, active, favorite, onPick, onToggleFavorite }: RowProps): JSX.Element {
  return (
    <div className="flex items-center gap-0.5">
      <Button
        variant={active ? 'secondary' : 'ghost'}
        className="h-auto min-w-0 flex-1 justify-start gap-2 px-1.5 py-1"
        title={`${sym.name} — código ${sym.code}`}
        aria-pressed={active}
        onClick={() => onPick(active ? null : sym.code)}
      >
        <span
          className="pal-tone grid size-[30px] shrink-0 place-items-center rounded-md border"
          style={{ '--ink': GROUP_TONE[group] } as CSSProperties}
        >
          <svg className="size-[26px]" viewBox="-4 -6 26 24" aria-hidden="true">
            <SymbolGlyph code={sym.code} pinNames={sym.pins.map((p) => p.name)} w={18} h={15} />
          </svg>
        </span>
        <span className="min-w-0 flex-1 truncate text-left text-xs">{sym.name}</span>
        <Badge variant="outline" className="ml-auto h-4 shrink-0 px-1 font-mono text-[10px] font-normal">
          {sym.code}
        </Badge>
      </Button>
      <Button
        variant="ghost"
        size="icon-xs"
        className="shrink-0"
        aria-label={favorite ? `Quitar ${sym.name} de favoritos` : `Marcar ${sym.name} como favorito`}
        aria-pressed={favorite}
        title={favorite ? 'Quitar de favoritos' : 'Agregar a favoritos'}
        onClick={() => onToggleFavorite(sym.code)}
      >
        <StarIcon className={favorite ? 'fill-current text-[var(--tone-senalizacion)]' : 'text-muted-foreground'} />
      </Button>
    </div>
  );
}
