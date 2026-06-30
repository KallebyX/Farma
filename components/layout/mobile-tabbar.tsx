"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Icon } from "@/components/ui";
import { cx } from "@/components/ui/utils";
import { navItems, isNavActive, type NavCounts } from "./nav-items";

/**
 * iOS-HIG bottom tab bar (phones only, lg:hidden) — matches the Claude Design
 * native layout: a translucent bar with icon + caption, the brand green as the
 * active tint, and a "Mais" tab that opens a sheet with the full navigation.
 */

const PRIMARY: { href: string; label: string; icon: keyof typeof Icon; countKey?: keyof NavCounts; alertKey?: keyof NavCounts }[] = [
  { href: "/dashboard", label: "Início", icon: "Home" },
  { href: "/patients", label: "Pacientes", icon: "Users" },
  { href: "/ram", label: "Vigilância", icon: "Alert", countKey: "ramPending", alertKey: "ramSevere" },
  { href: "/returns", label: "Retornos", icon: "Cart", countKey: "returnsAsked" },
];

const PRIMARY_HREFS = new Set(PRIMARY.map((t) => t.href));

export function MobileTabBar({ counts }: { counts: NavCounts }) {
  const pathname = usePathname();
  const [moreOpen, setMoreOpen] = useState(false);

  useEffect(() => { setMoreOpen(false); }, [pathname]);
  useEffect(() => {
    document.body.style.overflow = moreOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [moreOpen]);

  const onPrimary = [...PRIMARY_HREFS].some((h) => isNavActive(pathname, h));

  return (
    <>
      <nav
        className="lg:hidden fixed inset-x-0 bottom-0 z-40 border-t border-slate-200/80 bg-white/85 backdrop-blur-xl"
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
        aria-label="Navegação principal"
      >
        <div className="grid grid-cols-5">
          {PRIMARY.map((tab) => {
            const active = isNavActive(pathname, tab.href);
            const IconComp = Icon[tab.icon];
            const count = tab.countKey ? counts[tab.countKey] : 0;
            const alert = tab.alertKey ? counts[tab.alertKey] > 0 : false;
            return (
              <Link key={tab.href} href={tab.href} aria-current={active ? "page" : undefined}
                className={cx("relative flex flex-col items-center justify-center gap-1 pt-2 pb-1.5 text-[10px] font-medium transition-colors",
                  active ? "text-brand-600" : "text-slate-400")}>
                <span className="relative">
                  <IconComp size={23} />
                  {count > 0 && (
                    <span className={cx("absolute -top-1.5 -right-2 min-w-[15px] h-[15px] px-1 rounded-full text-[9px] font-bold leading-[15px] text-white tabular-nums",
                      alert ? "bg-rose-500" : "bg-brand-500")}>
                      {count > 9 ? "9+" : count}
                    </span>
                  )}
                </span>
                {tab.label}
              </Link>
            );
          })}
          <button onClick={() => setMoreOpen(true)} aria-label="Mais opções"
            className={cx("flex flex-col items-center justify-center gap-1 pt-2 pb-1.5 text-[10px] font-medium transition-colors",
              !onPrimary ? "text-brand-600" : "text-slate-400")}>
            <Icon.Settings size={23} />
            Mais
          </button>
        </div>
      </nav>

      {moreOpen && (
        <div className="lg:hidden fixed inset-0 z-50">
          <div className="absolute inset-0 bg-slate-900/40 animate-[fadein_.2s_ease]" onClick={() => setMoreOpen(false)} />
          <div className="absolute inset-x-0 bottom-0 rounded-t-[20px] bg-white pb-[env(safe-area-inset-bottom)] shadow-pop animate-[slidein_.25s_cubic-bezier(0.32,0.72,0,1)]">
            <div className="flex justify-center pt-2.5 pb-1">
              <span className="h-1.5 w-10 rounded-full bg-slate-300" />
            </div>
            <div className="flex items-center justify-between px-5 pt-1 pb-2">
              <h2 className="text-[17px] font-semibold text-slate-900">Tudo no Farma</h2>
              <button onClick={() => setMoreOpen(false)} aria-label="Fechar" className="h-8 w-8 flex items-center justify-center rounded-full bg-slate-100 text-slate-500">
                <Icon.X size={16} />
              </button>
            </div>
            <div className="grid grid-cols-4 gap-1 px-3 pb-5">
              {navItems.map((item) => {
                const IconComp = Icon[item.icon];
                const active = isNavActive(pathname, item.href);
                const count = item.countKey ? counts[item.countKey] : 0;
                const alert = item.alertKey ? counts[item.alertKey] > 0 : false;
                return (
                  <Link key={item.href} href={item.href} onClick={() => setMoreOpen(false)}
                    className="flex flex-col items-center gap-1.5 rounded-xl px-1 py-3 active:bg-slate-100 transition-colors">
                    <span className={cx("relative flex h-12 w-12 items-center justify-center rounded-2xl",
                      active ? "bg-brand-500 text-white" : "bg-brand-50 text-brand-700")}>
                      <IconComp size={22} />
                      {count > 0 && (
                        <span className={cx("absolute -top-1 -right-1 min-w-[16px] h-4 px-1 rounded-full text-[9px] font-bold leading-4 text-white",
                          alert ? "bg-rose-500" : "bg-brand-600")}>
                          {count > 9 ? "9+" : count}
                        </span>
                      )}
                    </span>
                    <span className="text-[11px] font-medium text-slate-600 text-center leading-tight">{item.label}</span>
                  </Link>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
