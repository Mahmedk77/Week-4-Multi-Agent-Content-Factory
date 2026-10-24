// Small inline SVG icons. All are decorative (aria-hidden); text next to them carries the meaning.
type IconProps = { size?: number; className?: string };

function Svg({ size = 16, className, children, strokeWidth = 2 }: IconProps & { children: React.ReactNode; strokeWidth?: number }) {
    return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth}
            strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className={className}>
            {children}
        </svg>
    );
}

export const CheckIcon = (p: IconProps) => <Svg {...p} strokeWidth={2.4}><path d="M5 12.5l4.5 4.5L19 7.5" /></Svg>;
export const CrossIcon = (p: IconProps) => <Svg {...p} strokeWidth={2.4}><path d="M6 6l12 12M18 6L6 18" /></Svg>;
export const RewriteIcon = (p: IconProps) => <Svg {...p} strokeWidth={1.8}><path d="M20 11a8 8 0 00-14-4M4 5v4h4M4 13a8 8 0 0014 4M20 19v-4h-4" /></Svg>;
export const PersonIcon = (p: IconProps) => <Svg {...p} strokeWidth={1.8}><circle cx="12" cy="8" r="3.5" /><path d="M5 20c1-4 4-5.5 7-5.5s6 1.5 7 5.5" /></Svg>;
export const SearchIcon = (p: IconProps) => <Svg {...p} strokeWidth={1.8}><circle cx="11" cy="11" r="6.5" /><path d="M20 20l-4-4" /></Svg>;
export const PenIcon = (p: IconProps) => <Svg {...p} strokeWidth={1.8}><path d="M4 20h4L19 9l-4-4L4 16v4zM14 6l4 4" /></Svg>;
export const ShieldIcon = (p: IconProps) => <Svg {...p} strokeWidth={1.8}><path d="M12 3l7 3v6c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V6l7-3z" /><path d="M9 12l2 2 4-4" /></Svg>;
export const AlertIcon = (p: IconProps) => <Svg {...p}><circle cx="12" cy="12" r="9" /><path d="M12 7.5v5M12 16v.5" /></Svg>;
export const OfflineIcon = (p: IconProps) => <Svg {...p}><path d="M2 9a15 15 0 0120 0M5.5 12.5a10 10 0 0113 0M9 16a5 5 0 016 0M12 19.5v.1" /><path d="M4 4l16 16" /></Svg>;
export const DocIcon = (p: IconProps) => <Svg {...p} strokeWidth={1.8}><path d="M7 3h7l5 5v13H7V3z" /><path d="M14 3v5h5M10 13h6M10 17h6" /></Svg>;
export const ArrowIcon = (p: IconProps) => <Svg {...p}><path d="M5 12h14M13 6l6 6-6 6" /></Svg>;
export const SunIcon = (p: IconProps) => <Svg {...p} strokeWidth={1.8}><circle cx="12" cy="12" r="4" /><path d="M12 2.5v2M12 19.5v2M2.5 12h2M19.5 12h2M5.3 5.3l1.4 1.4M17.3 17.3l1.4 1.4M5.3 18.7l1.4-1.4M17.3 6.7l1.4-1.4" /></Svg>;
export const MoonIcon = (p: IconProps) => <Svg {...p} strokeWidth={1.8}><path d="M20 14.5A8 8 0 019.5 4a8 8 0 1010.5 10.5z" /></Svg>;
export const ChevronIcon = (p: IconProps) => <Svg {...p}><path d="M6 9l6 6 6-6" /></Svg>;
export const TrashIcon = (p: IconProps) => <Svg {...p} strokeWidth={1.8}><path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3" /></Svg>;
export const PlusIcon =(p: IconProps) => <Svg {...p}><path d="M12 5v14M5 12h14" /></Svg>;
export const DocCheckIcon = (p: IconProps) => <Svg {...p} strokeWidth={1.8}><path d="M6 3h9l4 4v14H6z" /><path d="M9 14l2 2 4-4" /></Svg>;
export const DocLinesIcon = (p: IconProps) => <Svg {...p} strokeWidth={1.8}><path d="M6 3h9l4 4v14H6z" /><path d="M9 13h6M9 17h4" /></Svg>;
export const CircleCheckIcon = (p: IconProps) => <Svg {...p} strokeWidth={1.8}><circle cx="12" cy="12" r="8" /><path d="M8.5 12.5l2.5 2.5 4.5-5" /></Svg>;
export const WarnIcon = (p: IconProps) => <Svg {...p}><path d="M12 3l10 18H2z" /><path d="M12 10v5M12 18v.1" /></Svg>;
export const BangIcon = (p: IconProps) => <Svg {...p} strokeWidth={2.4}><path d="M12 6v8M12 18v.1" /></Svg>;
export const BackIcon = (p: IconProps) => <Svg {...p}><path d="M15 5l-7 7 7 7" /></Svg>;
export const ChevronRightIcon = (p: IconProps) => <Svg {...p}><path d="M9 6l6 6-6 6" /></Svg>;
export const ChevronUpIcon = (p: IconProps) => <Svg {...p}><path d="M6 15l6-6 6 6" /></Svg>;
export const LinkIcon = (p: IconProps) => <Svg {...p} strokeWidth={1.8}><path d="M10 14a4 4 0 005.7 0l3-3a4 4 0 00-5.7-5.7l-1 1M14 10a4 4 0 00-5.7 0l-3 3a4 4 0 005.7 5.7l1-1" /></Svg>;
export const ExternalIcon = (p: IconProps) => <Svg {...p}><path d="M8 16L16 8M9 8h7v7" /></Svg>;

export function BrandMark() {
    return (
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6"
            strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M2.5 11.5L8 4l5.5 7.5" />
            <circle cx="2.5" cy="11.5" r="1.2" fill="currentColor" />
            <circle cx="8" cy="4" r="1.2" fill="currentColor" />
            <circle cx="13.5" cy="11.5" r="1.2" fill="currentColor" />
        </svg>
    );
}

export function Spinner({ onAccent = false, size = 16 }: { onAccent?: boolean; size?: number }) {
    return <span className={`spin ${onAccent ? "spin-on-accent" : ""}`} style={{ width: size, height: size }} aria-hidden="true" />;
}
