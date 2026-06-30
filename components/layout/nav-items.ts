import { Icon } from "@/components/ui";

export type NavCounts = { ramPending: number; ramSevere: number; returnsAsked: number; activePatients: number };

export type NavItem = {
  href: string;
  label: string;
  icon: keyof typeof Icon;
  countKey?: keyof NavCounts;
  alertKey?: keyof NavCounts;
};

export type NavSection = { header?: string; items: NavItem[] };

/**
 * Grouped navigation, mirroring the Claude Design web sidebar (iPadOS Settings
 * style): an ungrouped Início at the top, then Clínico / Crescimento / Gestão /
 * Sistema sections. Single source of truth for the sidebar + mobile sheet.
 */
export const navSections: NavSection[] = [
  { items: [{ href: "/dashboard", label: "Início", icon: "Home" }] },
  {
    header: "Clínico",
    items: [
      { href: "/patients", label: "Pacientes", icon: "Users", countKey: "activePatients" },
      { href: "/receitas", label: "Receitas", icon: "Pill" },
      { href: "/ram", label: "Farmacovigilância", icon: "Alert", countKey: "ramPending", alertKey: "ramSevere" },
      { href: "/returns", label: "Retornos", icon: "Cart", countKey: "returnsAsked" },
      { href: "/catalog", label: "Catálogo", icon: "Book" },
    ],
  },
  {
    header: "Crescimento",
    items: [
      { href: "/afiliados", label: "Laboratórios", icon: "TrendUp" },
      { href: "/engajamento", label: "Gamificação", icon: "Heart" },
    ],
  },
  {
    header: "Gestão",
    items: [
      { href: "/relatorios", label: "Relatórios", icon: "TrendUp" },
      { href: "/settings/team", label: "Equipe", icon: "Users" },
    ],
  },
  {
    header: "Sistema",
    items: [
      { href: "/integracoes", label: "Integrações", icon: "Link" },
      { href: "/configuracoes", label: "Configurações", icon: "Settings" },
    ],
  },
];

/** Flat list (mobile "Mais" sheet, breadcrumbs). */
export const navItems: NavItem[] = navSections.flatMap((s) => s.items);

export function isNavActive(pathname: string, href: string): boolean {
  return href === "/dashboard" ? pathname === "/dashboard" : pathname === href || pathname.startsWith(href + "/");
}
