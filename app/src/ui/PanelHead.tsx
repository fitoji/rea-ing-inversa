import type { JSX, ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

/** Section title used by the side panels. */
export function PanelHead({ children }: Props): JSX.Element {
  return (
    <div className="shrink-0 px-3 pt-2.5 pb-1.5 text-[10.5px] font-semibold tracking-[0.7px] text-muted-foreground uppercase">
      {children}
    </div>
  );
}
