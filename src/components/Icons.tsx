type P = { className?: string };
const base = (d: React.ReactNode, className = "h-6 w-6") => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden>
    {d}
  </svg>
);

export const MapIcon = ({ className }: P) =>
  base(<><path d="M9 4 3 6v14l6-2 6 2 6-2V4l-6 2-6-2Z" /><path d="M9 4v14M15 6v14" /></>, className);
export const ListIcon = ({ className }: P) =>
  base(<><path d="m3 6 2 2 4-4" /><path d="m3 14 2 2 4-4" /><path d="M13 6h8M13 14h8M13 20h8" /></>, className);
export const LayersIcon = ({ className }: P) =>
  base(<><path d="m12 3 9 5-9 5-9-5 9-5Z" /><path d="m3 13 9 5 9-5" /></>, className);
export const BellIcon = ({ className }: P) =>
  base(<><path d="M6 8a6 6 0 1 1 12 0c0 7 3 9 3 9H3s3-2 3-9" /><path d="M10.3 21a1.9 1.9 0 0 0 3.4 0" /></>, className);
export const PlusIcon = ({ className }: P) => base(<path d="M12 5v14M5 12h14" />, className);
export const BackIcon = ({ className }: P) => base(<path d="m15 18-6-6 6-6" />, className);
export const SearchIcon = ({ className }: P) => base(<><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></>, className);
export const PinIcon = ({ className }: P) =>
  base(<><path d="M12 22s7-6.2 7-12a7 7 0 1 0-14 0c0 5.8 7 12 7 12Z" /><circle cx="12" cy="10" r="2.5" /></>, className);
export const ChevronIcon = ({ className }: P) => base(<path d="m9 18 6-6-6-6" />, className);
export const XIcon = ({ className }: P) => base(<path d="M18 6 6 18M6 6l12 12" />, className);
