"use client";
import React from "react";
import { cx } from "./utils";

type ToastTone = "success" | "error" | "info";
interface Toast { id: string; title: string; desc?: string; tone?: ToastTone; duration?: number; }
interface ToastCtx { push: (t: Omit<Toast, "id">) => void; }

const ToastContext = React.createContext<ToastCtx>({ push: () => {} });

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = React.useState<Toast[]>([]);
  const push = React.useCallback((t: Omit<Toast, "id">) => {
    const id = Math.random().toString(36).slice(2);
    setToasts((arr) => [...arr, { id, ...t }]);
    setTimeout(() => setToasts((arr) => arr.filter((x) => x.id !== id)), t.duration ?? 3800);
  }, []);

  return (
    <ToastContext.Provider value={{ push }}>
      {children}
      <div className="fixed bottom-6 right-6 z-[100] flex flex-col gap-2 pointer-events-none">
        {toasts.map((t) => (
          <div key={t.id}
            className="pointer-events-auto bg-white border border-slate-200 rounded-xl shadow-[0_10px_30px_-12px_rgba(15,23,42,0.25)] px-4 py-3 min-w-[280px] max-w-sm flex items-start gap-3 animate-[slidein_180ms_ease-out]">
            <span className={cx("mt-0.5 w-7 h-7 rounded-full flex items-center justify-center shrink-0 text-[13px]",
              t.tone === "success" ? "bg-emerald-50 text-emerald-600" :
              t.tone === "error" ? "bg-rose-50 text-rose-600" :
              "bg-brand-50 text-brand-600")}>
              {t.tone === "success" ? "✓" : t.tone === "error" ? "!" : "i"}
            </span>
            <div className="flex-1 min-w-0">
              <p className="text-[13px] font-semibold text-slate-800">{t.title}</p>
              {t.desc && <p className="text-[12px] text-slate-500 mt-0.5">{t.desc}</p>}
            </div>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export const useToast = () => React.useContext(ToastContext);
