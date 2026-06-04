export const cx = (...args: (string | boolean | undefined | null)[]) =>
  args.filter(Boolean).join(" ");

export const fmtDateBR = (d: string | Date | null | undefined): string => {
  if (!d) return "-";
  const date = typeof d === "string" ? new Date(d) : d;
  return new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" }).format(date);
};

export const fmtDateTimeBR = (d: string | Date | null | undefined): string => {
  if (!d) return "-";
  const date = typeof d === "string" ? new Date(d) : d;
  return new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" }).format(date);
};

export const fmtRelative = (d: string | Date | null | undefined): string => {
  if (!d) return "-";
  const date = typeof d === "string" ? new Date(d) : d;
  const diff = date.getTime() - Date.now();
  const days = Math.round(diff / 86400000);
  const hrs = Math.round(diff / 3600000);
  if (Math.abs(hrs) < 24) {
    if (hrs >= 0) return `em ${hrs}h`;
    return `${Math.abs(hrs)}h atrás`;
  }
  if (days >= 0) return `em ${days} dia${days === 1 ? "" : "s"}`;
  return `há ${Math.abs(days)} dia${Math.abs(days) === 1 ? "" : "s"}`;
};

export const maskCpf = (cpf: string | null | undefined): string => {
  if (!cpf || cpf.length !== 11) return cpf ?? "";
  return `***.${cpf.slice(3, 6)}.${cpf.slice(6, 9)}-**`;
};

export const roleLabel = (r: string): string =>
  (({ OWNER: "Proprietário", PHARMACIST: "Farmacêutico(a)", ATTENDANT: "Atendente", READONLY: "Leitura" }) as Record<string, string>)[r] ?? r;

export const channelLabel = (c: string): string =>
  (({ EMAIL: "Email", WHATSAPP: "WhatsApp", LINK: "Link" }) as Record<string, string>)[c] ?? c;

export const severityLabel = (s: string): string =>
  (({ MILD: "Leve", MODERATE: "Moderada", SEVERE: "Grave" }) as Record<string, string>)[s] ?? s;

export const severityTone = (s: string): string =>
  (({ MILD: "sky", MODERATE: "amber", SEVERE: "danger" }) as Record<string, string>)[s] ?? "slate";
