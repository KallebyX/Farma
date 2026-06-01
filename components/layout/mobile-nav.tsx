"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { FarmaLogo, Icon } from "@/components/ui";
import { cx } from "@/components/ui/utils";
import { navItems, isNavActive, type NavCounts } from "./nav-items";

/** Hamburger + slide-in drawer for the app navigation on phones (lg:hidden). */
export function MobileNav({ counts }: { counts: NavCounts }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  // Close on route change.
  useEffect(() => { setOpen(false); }, [pathname]);
  // Lock body scroll while open.
  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  return (
    <>
      <button onClick={() => setOpen(true)} aria-label="Abrir menu"
        className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-600 hover:bg-slate-100">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <line x1="3" y1="6" x2="21" y2="6" /><line x1="3" y1="12" x2="21" y2="12" /><line x1="3" y1="18" x2="21" y2="18" />
        </svg>
      </button>

      {open && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-slate-900/40" onClick={() => setOpen(false)} />
          <div className="absolute left-0 top-0 h-full w-[78%] max-w-[300px] bg-white shadow-xl flex flex-col">
            <div className="flex items-center justify-between px-4 py-4 border-b border-slate-100">
              <Link href="/dashboard" className="flex items-center gap-2.5" onClick={() => setOpen(false)}>
                <FarmaLogo size={28} />
                <span className="text-[15px] font-bold text-brand-900">Farma</span>
              </Link>
              <button onClick={() => setOpen(false)} aria-label="Fechar menu" className="h-8 w-8 flex items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100">
                <Icon.X size={18} />
              </button>
            </div>
            <nav className="flex-1 overflow-y-auto px-3 py-3 space-y-0.5">
              {navItems.map((item) => {
                const active = isNavActive(pathname, item.href);
                const IconComp = Icon[item.icon];
                const count = item.countKey ? counts[item.countKey] : undefined;
                const isAlert = item.alertKey ? counts[item.alertKey] > 0 : false;
                return (
                  <Link key={item.href} href={item.href} onClick={() => setOpen(false)}
                    className={cx("flex items-center gap-3 px-3 py-2.5 rounded-lg text-[14px] font-medium",
                      active ? "bg-brand-50 text-brand-900" : "text-slate-600 hover:bg-slate-50")}>
                    <span className={active ? "text-brand-700" : "text-slate-400"}><IconComp size={18} /></span>
                    <span className="flex-1">{item.label}</span>
                    {typeof count === "number" && count > 0 && (
                      <span className={cx("text-[11px] font-semibold px-1.5 py-0.5 rounded-full",
                        isAlert ? "bg-rose-100 text-rose-700" : "bg-slate-100 text-slate-600")}>{count}</span>
                    )}
                  </Link>
                );
              })}
            </nav>
          </div>
        </div>
      )}
    </>
  );
}
