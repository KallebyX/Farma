"use client";
import React from "react";
import { cx } from "./utils";
import { Icon } from "./index";

// ── Tabs ────────────────────────────────────────────────────────────────────
export function Tabs({ tabs, value, onChange }: {
  tabs: { value: string; label: string; count?: number }[];
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="inline-flex items-center gap-1 p-1 bg-slate-100 rounded-lg">
      {tabs.map((t) => (
        <button type="button" key={t.value} onClick={() => onChange(t.value)}
          className={cx("h-8 px-3 text-[12.5px] font-medium rounded-md transition",
            value === t.value ? "bg-white text-brand-800 shadow-[0_1px_2px_rgba(15,23,42,0.06)]" : "text-slate-600 hover:text-slate-800")}>
          {t.label}
          {t.count != null && <span className="ml-1.5 text-slate-400">{t.count}</span>}
        </button>
      ))}
    </div>
  );
}

// ── Modal ────────────────────────────────────────────────────────────────────
export function Modal({ open, onClose, title, subtitle, children, footer, width = "max-w-xl" }: {
  open: boolean; onClose?: () => void; title: string; subtitle?: string;
  children: React.ReactNode; footer?: React.ReactNode; width?: string;
}) {
  React.useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose?.();
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => { window.removeEventListener("keydown", onKey); document.body.style.overflow = ""; };
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-[2px] px-4 py-6 animate-[fadein_120ms_ease-out]" onClick={onClose}>
      <div role="dialog" aria-modal="true" aria-labelledby="modal-title" className={cx("w-full bg-white rounded-2xl shadow-[0_20px_50px_-12px_rgba(15,23,42,0.25)] border border-slate-200 animate-[scalein_140ms_ease-out]", width)} onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between gap-4 px-6 py-5 border-b border-slate-100">
          <div>
            <h2 id="modal-title" className="text-[15px] font-semibold text-slate-900">{title}</h2>
            {subtitle && <p className="text-[12.5px] text-slate-500 mt-0.5">{subtitle}</p>}
          </div>
          <button type="button" onClick={onClose} aria-label="Fechar" className="text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-md p-1 -m-1">
            <Icon.X size={18}/>
          </button>
        </div>
        <div className="px-6 py-5 max-h-[70vh] overflow-y-auto">{children}</div>
        {footer && <div className="px-6 py-4 border-t border-slate-100 bg-slate-50/50 rounded-b-2xl flex items-center justify-end gap-2">{footer}</div>}
      </div>
    </div>
  );
}
