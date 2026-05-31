"use client";
import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Icon } from "@/components/ui";
import { cx } from "@/components/ui/utils";
import { MobileNav } from "./mobile-nav";
import type { NavCounts } from "./nav-items";

interface TopbarProps {
  counts: NavCounts;
}

const breadcrumbMap: Record<string, string> = {
  "/dashboard": "Dashboard",
  "/patients": "Pacientes",
  "/receitas": "Receitas",
  "/ram": "Inbox de RAM",
  "/returns": "Retornos",
  "/afiliados": "Laboratórios",
  "/engajamento": "Gamificação",
  "/catalog": "Catálogo",
  "/integracoes": "Integrações",
  "/configuracoes": "Configurações",
  "/settings/team": "Equipe",
};

function getBreadcrumb(pathname: string): string {
  if (breadcrumbMap[pathname]) return breadcrumbMap[pathname];
  for (const [key, label] of Object.entries(breadcrumbMap)) {
    if (pathname.startsWith(key + "/")) return label;
  }
  return "Farma";
}

export function Topbar({ counts }: TopbarProps) {
  const pathname = usePathname();
  const crumb = getBreadcrumb(pathname);

  return (
    <header className="lg:hidden flex items-center justify-between px-4 py-3 bg-white border-b border-slate-200 sticky top-0 z-30">
      <div className="flex items-center gap-2">
        <MobileNav counts={counts} />
        <p className="text-[13px] font-semibold text-slate-800">{crumb}</p>
      </div>
      <div className="flex items-center gap-2">
        {counts.ramPending > 0 && (
          <Link href="/ram" className={cx(
            "flex items-center gap-1 px-2 py-1 rounded-full text-[11px] font-semibold",
            counts.ramSevere > 0 ? "bg-rose-100 text-rose-700" : "bg-amber-100 text-amber-700"
          )}>
            <Icon.Alert size={12}/>
            {counts.ramPending}
          </Link>
        )}
        {counts.returnsAsked > 0 && (
          <Link href="/returns" className="flex items-center gap-1 px-2 py-1 rounded-full text-[11px] font-semibold bg-brand-50 text-brand-700">
            <Icon.Cart size={12}/>
            {counts.returnsAsked}
          </Link>
        )}
      </div>
    </header>
  );
}
