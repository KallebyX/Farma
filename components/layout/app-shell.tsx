"use client";
import React from "react";
import { Sidebar } from "./sidebar";
import { Topbar } from "./topbar";
import { ToastProvider } from "@/components/ui/toast";

interface AppShellProps {
  children: React.ReactNode;
  pharmacy: { fantasia: string | null; razaoSocial: string; cnpj: string | null } | null;
  user: { name: string | null; email: string; role: string } | null;
  counts: { ramPending: number; ramSevere: number; returnsAsked: number; activePatients: number };
  signOutSlot?: React.ReactNode;
}

export function AppShell({ children, pharmacy, user, counts, signOutSlot }: AppShellProps) {
  return (
    <ToastProvider>
      <div className="min-h-screen flex bg-[#FAFBFC]">
        <Sidebar pharmacy={pharmacy} user={user} counts={counts} signOutSlot={signOutSlot}/>
        <div className="flex-1 min-w-0 flex flex-col">
          <Topbar counts={counts}/>
          <main className="flex-1 min-w-0">{children}</main>
        </div>
      </div>
    </ToastProvider>
  );
}
