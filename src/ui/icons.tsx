// Extra stroke icons for the UI shell (1.5px, no fills). Kept separate from kit.tsx to avoid edit clashes.
export type UIIconName =
  | 'home' | 'walk' | 'map' | 'globe' | 'book' | 'help' | 'close' | 'reset' | 'play' | 'pause'
  | 'stepBack' | 'stepForward' | 'sun' | 'moon' | 'chevronUp' | 'chevronDown' | 'eye';

export function UIIcon({ name, size = 16 }: { name: UIIconName; size?: number }) {
  const p = {
    width: size, height: size, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.5,
    strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const, 'aria-hidden': true,
  };
  switch (name) {
    case 'home': return <svg {...p}><path d="M4 11l8-7 8 7" /><path d="M6 10v10h12V10" /><path d="M10 20v-6h4v6" /></svg>;
    case 'walk': return <svg {...p}><circle cx="13" cy="4.5" r="1.8" /><path d="M10 21l2.5-6 2.5 2.5V21" /><path d="M12.5 15l-1-5 3.5 2 2.5 1" /><path d="M11.5 10l-3 2-1 3" /></svg>;
    case 'map': return <svg {...p}><path d="M9 4L3 6v14l6-2 6 2 6-2V4l-6 2z" /><path d="M9 4v14M15 6v14" /></svg>;
    case 'globe': return <svg {...p}><circle cx="12" cy="12" r="9" /><path d="M3 12h18M12 3c3 3.5 3 14.5 0 18M12 3c-3 3.5-3 14.5 0 18" /></svg>;
    case 'book': return <svg {...p}><path d="M4 5a2 2 0 0 1 2-2h13v16H6a2 2 0 0 0-2 2z" /><path d="M4 19V5" /></svg>;
    case 'help': return <svg {...p}><circle cx="12" cy="12" r="9" /><path d="M9.5 9a2.5 2.5 0 1 1 3.5 2.3c-.6.3-1 .9-1 1.6V14M12 17h.01" /></svg>;
    case 'close': return <svg {...p}><path d="M6 6l12 12M18 6L6 18" /></svg>;
    case 'reset': return <svg {...p}><path d="M3 12a9 9 0 1 0 3-6.7" /><path d="M3 4v5h5" /></svg>;
    case 'play': return <svg {...p}><path d="M7 5l12 7-12 7z" /></svg>;
    case 'pause': return <svg {...p}><path d="M8 5v14M16 5v14" /></svg>;
    case 'stepBack': return <svg {...p}><path d="M6 5v14" /><path d="M18 5l-9 7 9 7z" /></svg>;
    case 'stepForward': return <svg {...p}><path d="M18 5v14" /><path d="M6 5l9 7-9 7z" /></svg>;
    case 'sun': return <svg {...p}><circle cx="12" cy="12" r="4" /><path d="M12 2v2M12 20v2M2 12h2M20 12h2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" /></svg>;
    case 'moon': return <svg {...p}><path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5z" /></svg>;
    case 'chevronUp': return <svg {...p}><path d="M6 15l6-6 6 6" /></svg>;
    case 'chevronDown': return <svg {...p}><path d="M6 9l6 6 6-6" /></svg>;
    case 'eye': return <svg {...p}><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z" /><circle cx="12" cy="12" r="3" /></svg>;
  }
}
