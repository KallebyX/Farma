import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatRelativeDays(target: Date): string {
  const ms = target.getTime() - Date.now();
  const days = Math.ceil(ms / (1000 * 60 * 60 * 24));
  if (days < 0) return `expirou há ${Math.abs(days)}d`;
  if (days === 0) return "expira hoje";
  if (days === 1) return "expira amanhã";
  return `expira em ${days}d`;
}

export function maskEmail(email: string): string {
  const [user, domain] = email.split("@");
  if (!user || !domain) return email;
  if (user.length <= 2) return `${user[0]}*@${domain}`;
  return `${user[0]}${"*".repeat(Math.min(user.length - 2, 4))}${user.slice(-1)}@${domain}`;
}
