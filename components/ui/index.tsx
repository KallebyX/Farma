import React from "react";
import { cx } from "./utils";

// Interactive (stateful) components live in a "use client" module so the rest
// of this module stays server-safe. Re-exported here for a single import path.
export { Tabs, Modal } from "./interactive";

// ── Icons (lucide-style, stroke 1.75) ──────────────────────────────────────
const SvgIcon = ({ d, size = 18, className }: { d: React.ReactNode; size?: number; className?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"
    aria-hidden="true" className={className}>
    {d}
  </svg>
);

export const Icon = {
  Pill: (p: { size?: number; className?: string }) => <SvgIcon {...p} d={<><path d="M10.5 20.5a7 7 0 0 1-7-7 7 7 0 0 1 2.05-4.95l6.95-6.95a7 7 0 0 1 9.9 9.9l-6.95 6.95A7 7 0 0 1 10.5 20.5z"/><path d="M7.5 8.5l8 8"/></>} />,
  Heart: (p: { size?: number; className?: string }) => <SvgIcon {...p} d={<path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 1 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>} />,
  Home: (p: { size?: number; className?: string }) => <SvgIcon {...p} d={<path d="M3 9.5 12 3l9 6.5V20a1 1 0 0 1-1 1h-5v-7h-6v7H4a1 1 0 0 1-1-1z"/>} />,
  Users: (p: { size?: number; className?: string }) => <SvgIcon {...p} d={<><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></>} />,
  Inbox: (p: { size?: number; className?: string }) => <SvgIcon {...p} d={<><polyline points="22 12 16 12 14 15 10 15 8 12 2 12"/><path d="M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z"/></>} />,
  ArrowBack: (p: { size?: number; className?: string }) => <SvgIcon {...p} d={<><path d="M9 14 4 9l5-5"/><path d="M4 9h10.5a5.5 5.5 0 0 1 0 11H10"/></>} />,
  Book: (p: { size?: number; className?: string }) => <SvgIcon {...p} d={<><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></>} />,
  Settings: (p: { size?: number; className?: string }) => <SvgIcon {...p} d={<><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></>} />,
  Search: (p: { size?: number; className?: string }) => <SvgIcon {...p} d={<><circle cx="11" cy="11" r="7"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></>} />,
  Plus: (p: { size?: number; className?: string }) => <SvgIcon {...p} d={<><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></>} />,
  X: (p: { size?: number; className?: string }) => <SvgIcon {...p} d={<><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></>} />,
  Check: (p: { size?: number; className?: string }) => <SvgIcon {...p} d={<polyline points="20 6 9 17 4 12"/>} />,
  Alert: (p: { size?: number; className?: string }) => <SvgIcon {...p} d={<><path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></>} />,
  Bell: (p: { size?: number; className?: string }) => <SvgIcon {...p} d={<><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></>} />,
  WhatsApp: (p: { size?: number; className?: string }) => <SvgIcon {...p} d={<path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8z"/>} />,
  Mail: (p: { size?: number; className?: string }) => <SvgIcon {...p} d={<><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></>} />,
  Link: (p: { size?: number; className?: string }) => <SvgIcon {...p} d={<><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.72-1.71"/></>} />,
  Copy: (p: { size?: number; className?: string }) => <SvgIcon {...p} d={<><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></>} />,
  Logout: (p: { size?: number; className?: string }) => <SvgIcon {...p} d={<><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></>} />,
  Calendar: (p: { size?: number; className?: string }) => <SvgIcon {...p} d={<><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></>} />,
  TrendUp: (p: { size?: number; className?: string }) => <SvgIcon {...p} d={<><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></>} />,
  Phone: (p: { size?: number; className?: string }) => <SvgIcon {...p} d={<path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/>} />,
  Clock: (p: { size?: number; className?: string }) => <SvgIcon {...p} d={<><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></>} />,
  ChevronRight: (p: { size?: number; className?: string }) => <SvgIcon {...p} d={<polyline points="9 18 15 12 9 6"/>} />,
  ChevronDown: (p: { size?: number; className?: string }) => <SvgIcon {...p} d={<polyline points="6 9 12 15 18 9"/>} />,
  Shield: (p: { size?: number; className?: string }) => <SvgIcon {...p} d={<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>} />,
  Activity: (p: { size?: number; className?: string }) => <SvgIcon {...p} d={<polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>} />,
  Cart: (p: { size?: number; className?: string }) => <SvgIcon {...p} d={<><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.7 13.4a2 2 0 0 0 2 1.6h9.7a2 2 0 0 0 2-1.6L23 6H6"/></>} />,
  Filter: (p: { size?: number; className?: string }) => <SvgIcon {...p} d={<polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/>} />,
};

// ── Logo ────────────────────────────────────────────────────────────────────
export function FarmaLogo({ size = 32 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" fill="none" aria-hidden="true">
      <rect x="2" y="2" width="36" height="36" rx="10" fill="url(#fl-grad)"/>
      <path d="M14 12h7a5 5 0 0 1 0 10h-3v6h-4V12z" fill="white"/>
      <circle cx="29" cy="27" r="3.5" fill="#0ABF77" stroke="white" strokeWidth="1.5"/>
      <defs>
        <linearGradient id="fl-grad" x1="0" y1="0" x2="40" y2="40">
          <stop offset="0" stopColor="#2E6AA5"/>
          <stop offset="1" stopColor="#163659"/>
        </linearGradient>
      </defs>
    </svg>
  );
}

// ── Illustrations ────────────────────────────────────────────────────────────
export const Illus = {
  PillBottle: ({ size = 110 }: { size?: number }) => (
    <svg width={size} height={size} viewBox="0 0 160 160" fill="none">
      <rect x="40" y="40" width="80" height="100" rx="14" fill="#EBF4FB" stroke="#A6CBE9" strokeWidth="1.5"/>
      <rect x="40" y="40" width="80" height="22" rx="11" fill="#D2E5F4" stroke="#A6CBE9" strokeWidth="1.5"/>
      <rect x="50" y="28" width="60" height="18" rx="6" fill="#7AB1DE" stroke="#3B82C4" strokeWidth="1.5"/>
      <path d="M55 80h50" stroke="#2E6AA5" strokeWidth="2.5" strokeLinecap="round"/>
      <path d="M80 65v30" stroke="#2E6AA5" strokeWidth="2.5" strokeLinecap="round"/>
      <circle cx="60" cy="120" r="6" fill="#0ABF77"/>
      <circle cx="80" cy="120" r="6" fill="#D2E5F4"/>
      <circle cx="100" cy="120" r="6" fill="#D2E5F4"/>
    </svg>
  ),
  Chat: ({ size = 110 }: { size?: number }) => (
    <svg width={size} height={size} viewBox="0 0 160 160" fill="none">
      <rect x="20" y="35" width="90" height="60" rx="14" fill="#EBF4FB" stroke="#A6CBE9" strokeWidth="1.5"/>
      <path d="M50 95l-5 14 18-10" fill="#EBF4FB" stroke="#A6CBE9" strokeWidth="1.5" strokeLinejoin="round"/>
      <rect x="50" y="70" width="80" height="60" rx="14" fill="#DCFCE7" stroke="#86EFAC" strokeWidth="1.5"/>
      <path d="M118 130l5 14-18-10" fill="#DCFCE7" stroke="#86EFAC" strokeWidth="1.5" strokeLinejoin="round"/>
      <path d="M65 95h40" stroke="#0ABF77" strokeWidth="2" strokeLinecap="round"/>
      <path d="M65 105h28" stroke="#0ABF77" strokeWidth="2" strokeLinecap="round"/>
      <path d="M35 55h60" stroke="#3B82C4" strokeWidth="2" strokeLinecap="round"/>
      <path d="M35 70h40" stroke="#3B82C4" strokeWidth="2" strokeLinecap="round"/>
    </svg>
  ),
  Empty: ({ size = 110 }: { size?: number }) => (
    <svg width={size} height={size} viewBox="0 0 160 160" fill="none">
      <ellipse cx="80" cy="125" rx="48" ry="6" fill="#F1F5F9"/>
      <rect x="40" y="50" width="80" height="60" rx="10" fill="#F8FAFC" stroke="#E2E8F0" strokeWidth="1.5"/>
      <path d="M55 70h50M55 85h50M55 100h30" stroke="#CBD5E1" strokeWidth="2" strokeLinecap="round"/>
      <circle cx="118" cy="48" r="14" fill="#EBF4FB" stroke="#7AB1DE" strokeWidth="1.5"/>
      <path d="M118 42v12M112 48h12" stroke="#3B82C4" strokeWidth="2" strokeLinecap="round"/>
    </svg>
  ),
};

// ── Avatar ────────────────────────────────────────────────────────────────────
export function Avatar({ name, size = 36 }: { name: string; size?: number }) {
  const initials = (name || "??").split(/\s+/).filter(Boolean).slice(0, 2).map((s) => s[0]).join("").toUpperCase();
  let h = 0;
  for (let i = 0; i < name.length; i++) h = ((h * 31 + name.charCodeAt(i)) >>> 0);
  const palette: [string, string][] = [
    ["bg-brand-100", "text-brand-800"],
    ["bg-emerald-100", "text-emerald-800"],
    ["bg-amber-100", "text-amber-800"],
    ["bg-sky-100", "text-sky-800"],
    ["bg-violet-100", "text-violet-800"],
  ];
  const [bg, fg] = palette[h % palette.length];
  return (
    <span className={cx("rounded-full flex items-center justify-center font-semibold text-[11.5px] shrink-0", bg, fg)}
      style={{ width: size, height: size }}>
      {initials}
    </span>
  );
}

// ── Button ────────────────────────────────────────────────────────────────────
interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "ghost" | "danger" | "success" | "soft";
  size?: "sm" | "md" | "lg";
  icon?: React.ReactNode;
  iconRight?: React.ReactNode;
}

export function Button({ children, variant = "primary", size = "md", icon, iconRight, className, ...rest }: ButtonProps) {
  const variants = {
    primary: "bg-brand-700 text-white hover:bg-brand-800 border border-brand-700 shadow-[inset_0_1px_0_rgba(255,255,255,0.15),0_1px_2px_rgba(22,54,89,0.18)]",
    secondary: "bg-white text-slate-700 hover:bg-slate-50 border border-slate-300",
    ghost: "bg-transparent text-slate-600 hover:bg-slate-100 border border-transparent",
    danger: "bg-rose-600 text-white hover:bg-rose-700 border border-rose-600",
    success: "bg-emerald-600 text-white hover:bg-emerald-700 border border-emerald-600",
    soft: "bg-brand-50 text-brand-800 hover:bg-brand-100 border border-brand-100",
  };
  const sizes = {
    sm: "h-8 px-2.5 text-[12.5px] gap-1.5 rounded-md",
    md: "h-9 px-3.5 text-[13px] gap-1.5 rounded-lg",
    lg: "h-11 px-5 text-sm gap-2 rounded-lg",
  };
  return (
    <button type="button" className={cx("inline-flex items-center justify-center font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400 focus-visible:ring-offset-1", variants[variant], sizes[size], className)} {...rest}>
      {icon}{children}{iconRight}
    </button>
  );
}

// ── Input ────────────────────────────────────────────────────────────────────
interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  icon?: React.ReactNode;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(({ className, icon, ...rest }, ref) => (
  <div className={cx("relative", className)}>
    {icon && <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">{icon}</span>}
    <input ref={ref} {...rest}
      className={cx("w-full h-10 rounded-lg border border-slate-300 bg-white text-[13.5px] text-slate-800 placeholder:text-slate-400 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100 transition",
        icon ? "pl-9 pr-3" : "px-3")} />
  </div>
));
Input.displayName = "Input";

// ── Select ────────────────────────────────────────────────────────────────────
export function Select({ className, children, ...rest }: React.SelectHTMLAttributes<HTMLSelectElement> & { className?: string }) {
  return (
    <div className={cx("relative", className)}>
      <select {...rest} className="appearance-none w-full h-10 rounded-lg border border-slate-300 bg-white pl-3 pr-9 text-[13.5px] text-slate-800 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100">
        {children}
      </select>
      <span className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400">
        <Icon.ChevronDown size={16}/>
      </span>
    </div>
  );
}

// ── Textarea ──────────────────────────────────────────────────────────────────
export function Textarea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea {...props}
      className={cx("w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-[13.5px] text-slate-800 placeholder:text-slate-400 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100 transition resize-none", props.className)} />
  );
}

// ── Card ──────────────────────────────────────────────────────────────────────
export function Card({ children, className, ...rest }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cx("rounded-xl bg-white border border-slate-200/80 shadow-[0_1px_2px_rgba(15,23,42,0.04)]", className)} {...rest}>
      {children}
    </div>
  );
}

// ── Badge ────────────────────────────────────────────────────────────────────
type BadgeTone = "slate" | "brand" | "emerald" | "amber" | "rose" | "danger" | "sky" | "violet";

export function Badge({ children, tone = "slate", className, dot, size = "md" }: {
  children: React.ReactNode; tone?: BadgeTone; className?: string; dot?: boolean; size?: "sm" | "md";
}) {
  const tones: Record<BadgeTone, string> = {
    slate: "bg-slate-100 text-slate-700 border-slate-200",
    brand: "bg-brand-50 text-brand-800 border-brand-100",
    emerald: "bg-emerald-50 text-emerald-700 border-emerald-100",
    amber: "bg-amber-50 text-amber-700 border-amber-200",
    rose: "bg-rose-50 text-rose-700 border-rose-200",
    danger: "bg-rose-100 text-rose-800 border-rose-200",
    sky: "bg-sky-50 text-sky-700 border-sky-100",
    violet: "bg-violet-50 text-violet-700 border-violet-100",
  };
  const dotColors: Record<BadgeTone, string> = {
    slate: "bg-slate-400", brand: "bg-brand-500", emerald: "bg-emerald-500",
    amber: "bg-amber-500", rose: "bg-rose-500", danger: "bg-rose-600",
    sky: "bg-sky-500", violet: "bg-violet-500",
  };
  const sizes = { sm: "px-1.5 py-0.5 text-[10.5px] gap-1", md: "px-2 py-0.5 text-[11px] gap-1.5" };
  return (
    <span className={cx("inline-flex items-center rounded-full border font-medium tracking-wide", tones[tone], sizes[size], className)}>
      {dot && <span className={cx("w-1.5 h-1.5 rounded-full", dotColors[tone])}/>}
      {children}
    </span>
  );
}

// ── EmptyState ────────────────────────────────────────────────────────────────
export function EmptyState({ illustration, title, hint, action }: {
  illustration?: React.ReactNode; title: string; hint?: string; action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center text-center py-12 px-6">
      {illustration}
      <h3 className="mt-4 text-[14px] font-semibold text-slate-800">{title}</h3>
      {hint && <p className="mt-1 text-[12.5px] text-slate-500 max-w-sm">{hint}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

// ── Field ────────────────────────────────────────────────────────────────────
export function Field({ label, hint, error, required, children }: {
  label: string; hint?: string; error?: string; required?: boolean; children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="flex items-center gap-1.5 text-[12px] font-medium text-slate-700">
        {label}
        {required && <span className="text-rose-600">*</span>}
        {hint && <span className="text-[11px] text-slate-400 font-normal">— {hint}</span>}
      </span>
      <div className="mt-1.5">{children}</div>
      {error && <p className="mt-1 text-[11.5px] text-rose-700">{error}</p>}
    </label>
  );
}

// ── PageShell / PageHeader ─────────────────────────────────────────────────────
export function PageShell({ children, narrow }: { children: React.ReactNode; narrow?: boolean }) {
  return (
    <div className={cx("px-8 py-8", narrow ? "max-w-3xl" : "max-w-[1240px]", "mx-auto")}>
      {children}
    </div>
  );
}

export function PageHeader({ eyebrow, title, subtitle, className }: {
  eyebrow?: string; title: string; subtitle?: string; className?: string;
}) {
  return (
    <div className={className}>
      {eyebrow && <p className="text-[10.5px] font-bold tracking-[0.18em] text-brand-700 uppercase">{eyebrow}</p>}
      <h1 className="text-[26px] font-semibold tracking-tight text-slate-900 mt-1">{title}</h1>
      {subtitle && <p className="text-[13.5px] text-slate-500 mt-1 max-w-2xl">{subtitle}</p>}
    </div>
  );
}

// ── PatientStatusBadge / RxStatusBadge ────────────────────────────────────────
export function PatientStatusBadge({ status }: { status: string }) {
  const map: Record<string, [BadgeTone, string]> = {
    ACTIVE: ["emerald", "Ativo"],
    PAUSED: ["amber", "Pausado"],
    WITHDRAWN: ["slate", "Retirado"],
  };
  const [tone, label] = map[status] ?? ["slate", status];
  return <Badge tone={tone} dot>{label}</Badge>;
}

export function RxStatusBadge({ status }: { status: string }) {
  const map: Record<string, [BadgeTone, string]> = {
    ACTIVE: ["emerald", "ativo"],
    PAUSED: ["amber", "pausado"],
    COMPLETED: ["slate", "concluído"],
    CANCELLED: ["rose", "cancelado"],
  };
  const [tone, label] = map[status] ?? ["slate", status.toLowerCase()];
  return <Badge tone={tone} dot>{label}</Badge>;
}
