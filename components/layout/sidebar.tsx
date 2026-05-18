"use client";
import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { FarmaLogo, Icon, Avatar } from "@/components/ui";
import { cx, roleLabel } from "@/components/ui/utils";

interface SidebarProps {
  pharmacy: { fantasia: string | null; razaoSocial: string; cnpj: string | null } | null;
  user: { name: string | null; email: string; role: string } | null;
  counts: { ramPending: number; ramSevere: number; returnsAsked: number; activePatients: number };
  signOutSlot?: React.ReactNode;
}

type NavItem = {
  href: string;
  label: string;
  icon: keyof typeof Icon;
  countKey?: keyof SidebarProps["counts"];
  alertKey?: keyof SidebarProps["counts"];
};

const navItems: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: "Home" },
  { href: "/patients", label: "Pacientes", icon: "Users", countKey: "activePatients" },
  { href: "/ram", label: "RAM", icon: "Alert", countKey: "ramPending", alertKey: "ramSevere" },
  { href: "/returns", label: "Retornos", icon: "Cart", countKey: "returnsAsked" },
  { href: "/catalog", label: "Catálogo", icon: "Book" },
  { href: "/settings/team", label: "Equipe", icon: "Settings" },
];

export function Sidebar({ pharmacy, user, counts, signOutSlot }: SidebarProps) {
  const pathname = usePathname();
  const isActive = (href: string) =>
    href === "/dashboard" ? pathname === "/dashboard" : pathname === href || pathname.startsWith(href + "/");

  return (
    <aside className="hidden lg:flex flex-col w-[232px] bg-white border-r border-slate-200 shrink-0 sticky top-0 h-screen">
      <div className="px-5 pt-5 pb-4 border-b border-slate-100">
        <Link href="/dashboard" className="flex items-center gap-2.5 w-full text-left">
          <FarmaLogo size={30}/>
          <div className="min-w-0">
            <p className="text-[14.5px] font-semibold tracking-tight text-brand-900 leading-none">Farma</p>
            <p className="text-[10.5px] text-slate-500 mt-1 leading-none">Adesão &amp; farmacovigilância</p>
          </div>
        </Link>
      </div>

      <div className="px-3 pt-1 pb-3 border-b border-slate-100">
        <div className="px-2 pt-3 pb-2">
          <p className="text-[10px] font-bold tracking-[0.18em] uppercase text-slate-400">Farmácia</p>
          <p className="mt-1 text-[12.5px] font-medium text-slate-800 leading-tight">
            {pharmacy?.fantasia ?? pharmacy?.razaoSocial ?? "Farma"}
          </p>
          {pharmacy?.cnpj && (
            <p className="text-[10.5px] text-slate-500 font-mono">{pharmacy.cnpj}</p>
          )}
        </div>
      </div>

      <nav className="flex-1 px-3 py-3 space-y-0.5 overflow-y-auto">
        {navItems.map((item) => {
          const active = isActive(item.href);
          const IconComp = Icon[item.icon];
          const count = item.countKey ? counts[item.countKey] : undefined;
          const isAlert = item.alertKey ? counts[item.alertKey] > 0 : false;
          return (
            <Link key={item.href} href={item.href}
              className={cx("w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-[13px] font-medium transition group",
                active ? "bg-brand-50 text-brand-900" : "text-slate-600 hover:bg-slate-50 hover:text-slate-900")}>
              <span className={cx(active ? "text-brand-700" : "text-slate-400 group-hover:text-slate-600")}>
                <IconComp size={16}/>
              </span>
              <span className="flex-1 text-left">{item.label}</span>
              {typeof count === "number" && count > 0 && (
                <span className={cx("text-[10.5px] font-semibold px-1.5 py-0.5 rounded-full tabular-nums",
                  isAlert ? "bg-rose-100 text-rose-700" :
                  active ? "bg-brand-200/70 text-brand-900" : "bg-slate-100 text-slate-600")}>
                  {count}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-slate-100 p-3">
        <div className="flex items-center gap-2.5 rounded-lg hover:bg-slate-50 px-2 py-2 transition">
          <Avatar name={user?.name ?? "??"} size={32}/>
          <div className="flex-1 min-w-0">
            <p className="text-[12.5px] font-medium text-slate-800 truncate">{user?.name}</p>
            <p className="text-[10.5px] text-slate-500 truncate">{roleLabel(user?.role ?? "")}</p>
          </div>
          {signOutSlot}
        </div>
      </div>
    </aside>
  );
}
