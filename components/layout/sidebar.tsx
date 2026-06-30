"use client";
import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { FarmaLogo, Icon, Avatar } from "@/components/ui";
import { cx, roleLabel } from "@/components/ui/utils";
import { navSections, isNavActive, type NavCounts } from "./nav-items";

interface SidebarProps {
  pharmacy: { fantasia: string | null; razaoSocial: string; cnpj: string | null } | null;
  user: { name: string | null; email: string; role: string } | null;
  counts: NavCounts;
  signOutSlot?: React.ReactNode;
}

/**
 * Desktop sidebar — iPadOS-Settings grouped navigation (Claude Design):
 * brand + rede, ungrouped Início, then Clínico / Crescimento / Gestão / Sistema
 * sections with section headers, count/alert badges, and a hover chevron.
 */
export function Sidebar({ pharmacy, user, counts, signOutSlot }: SidebarProps) {
  const pathname = usePathname();
  const orgName = pharmacy?.fantasia ?? pharmacy?.razaoSocial ?? "Rede São João";

  return (
    <aside className="hidden lg:flex flex-col w-[240px] bg-white border-r border-slate-200/80 shrink-0 sticky top-0 h-screen">
      <div className="px-4 pt-5 pb-4">
        <Link href="/dashboard" className="flex items-center gap-2.5 w-full text-left">
          <FarmaLogo size={32} />
          <div className="min-w-0">
            <p className="text-[15px] font-bold tracking-tight text-slate-900 leading-none">Farma</p>
            <p className="text-[11px] text-slate-500 mt-1 leading-none truncate">{orgName}</p>
          </div>
        </Link>
      </div>

      <nav className="flex-1 px-2.5 pb-3 overflow-y-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {navSections.map((sec, si) => (
          <div key={si} className="mb-1.5">
            {sec.header && (
              <p className="px-2.5 pt-3 pb-1 text-[11px] font-semibold uppercase tracking-[0.06em] text-slate-400">
                {sec.header}
              </p>
            )}
            <div className="flex flex-col gap-0.5">
              {sec.items.map((item) => {
                const active = isNavActive(pathname, item.href);
                const IconComp = Icon[item.icon];
                const count = item.countKey ? counts[item.countKey] : undefined;
                const isAlert = item.alertKey ? counts[item.alertKey] > 0 : false;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    aria-current={active ? "page" : undefined}
                    className={cx(
                      "group flex items-center gap-2.5 px-2.5 py-2 rounded-[9px] text-[14px] font-medium transition-colors",
                      active ? "bg-brand-50 text-brand-700" : "text-slate-700 hover:bg-slate-100/80",
                    )}
                  >
                    <IconComp size={19} className={cx("shrink-0", active ? "text-brand-600" : "text-slate-400 group-hover:text-slate-600")} />
                    <span className="flex-1 min-w-0 truncate">{item.label}</span>
                    {typeof count === "number" && count > 0 ? (
                      <span
                        className={cx(
                          "text-[11px] font-semibold px-1.5 py-0.5 rounded-full tabular-nums shrink-0",
                          isAlert ? "bg-rose-500 text-white" : active ? "bg-brand-100 text-brand-700" : "bg-slate-100 text-slate-500",
                        )}
                      >
                        {count}
                      </span>
                    ) : (
                      <Icon.ChevronRight size={15} className="shrink-0 text-slate-300 opacity-0 group-hover:opacity-100 transition-opacity" />
                    )}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      <div className="border-t border-slate-100 p-3">
        <div className="flex items-center gap-2.5 rounded-lg hover:bg-slate-50 px-2 py-2 transition">
          <Avatar name={user?.name ?? "??"} size={32} />
          <div className="flex-1 min-w-0">
            <p className="text-[13px] font-semibold text-slate-800 truncate">{user?.name}</p>
            <p className="text-[11px] text-slate-500 truncate">{roleLabel(user?.role ?? "")}</p>
          </div>
          {signOutSlot}
        </div>
      </div>
    </aside>
  );
}
