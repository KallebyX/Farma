import { Icon } from "@/components/ui";

export type NavCounts = { ramPending: number; ramSevere: number; returnsAsked: number; activePatients: number };

export type NavItem = {
  href: string;
  label: string;
  icon: keyof typeof Icon;
  countKey?: keyof NavCounts;
  alertKey?: keyof NavCounts;
};

/** Single source of truth for the app navigation (sidebar + mobile drawer). */
export const navItems: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: "Home" },
  { href: "/patients", label: "Pacientes", icon: "Users", countKey: "activePatients" },
  { href: "/agenda", label: "Agenda", icon: "Calendar" },
  { href: "/ram", label: "RAM", icon: "Alert", countKey: "ramPending", alertKey: "ramSevere" },
  { href: "/returns", label: "Retornos", icon: "Cart", countKey: "returnsAsked" },
  { href: "/engajamento", label: "Engajamento", icon: "Heart" },
  { href: "/afiliados", label: "Afiliados", icon: "TrendUp" },
  { href: "/saude-conectada", label: "Saúde conectada", icon: "Activity" },
  { href: "/catalog", label: "Catálogo", icon: "Book" },
  { href: "/integracoes", label: "Integrações", icon: "Link" },
  { href: "/settings/team", label: "Equipe", icon: "Settings" },
];

export function isNavActive(pathname: string, href: string): boolean {
  return href === "/dashboard" ? pathname === "/dashboard" : pathname === href || pathname.startsWith(href + "/");
}
