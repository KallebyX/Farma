"use client";
import React from "react";
import { Sidebar } from "./sidebar";
import { Topbar } from "./topbar";
import { MobileTabBar } from "./mobile-tabbar";
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
      <div className="min-h-screen flex bg-[#F2F2F7]">
        <Sidebar pharmacy={pharmacy} user={user} counts={counts} signOutSlot={signOutSlot}/>
        <div className="flex-1 min-w-0 flex flex-col">
          <Topbar counts={counts}/>
          {/* pb on mobile clears the fixed bottom tab bar (+ safe-area). */}
          <main className="flex-1 min-w-0 pb-[calc(72px+env(safe-area-inset-bottom))] lg:pb-0">{children}</main>
        </div>
        <MobileTabBar counts={counts}/>
      </div>
    </ToastProvider>
  );
}
