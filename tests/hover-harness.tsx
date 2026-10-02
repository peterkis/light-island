// Loaded explicitly by the Vite browser regression, never imported by application code.
import { StrictMode, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { useIslandHover } from '../src/hooks/useIslandHover';
import type { IslandController } from '../src/hooks/useIsland';
export function mountHoverHarness(element: HTMLElement) {
  const stats = { modes: [] as string[], hovered: [] as boolean[] };
  let changeMode: (value: string) => void = () => {};
  function Harness() {
    const ref = useRef<HTMLDivElement>(null);
    const [mode, setMode] = useState('compact'), [hovered, setHovered] = useState(false);
    changeMode = setMode;
    const live = { mode, hovered, unread: [{}], todo: [],
      setMode: (value: string) => { stats.modes.push(value); setMode(value); },
      setHovered: (value: boolean) => { stats.hovered.push(value); setHovered(value); } } as unknown as IslandController;
    const pointer = useIslandHover(live, ref);
    return <div ref={ref} data-testid="hover-harness" style={{position:'fixed',left:20,top:500,width:120,height:60,background:'#456',zIndex:100}}
      onMouseEnter={pointer.enter} onMouseLeave={pointer.leave}>{mode}</div>;
  }
  const root = createRoot(element); root.render(<StrictMode><Harness/></StrictMode>);
  return { stats, unmount: () => root.unmount(), setMode: (mode: string) => changeMode(mode) };
}
