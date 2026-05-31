import { redirect } from "next/navigation";
import { getSessionContext } from "@/lib/auth/session";
import { isAtLeast } from "@/lib/auth/permissions";
import { Role } from "@prisma/client";
import { prisma } from "@/lib/db";
import { PageShell, PageHeader } from "@/components/ui";
import { SettingsClient } from "./settings-client";
import { ProductsClient } from "./products-client";

export const dynamic = "force-dynamic";

export default async function ConfiguracoesPage() {
  const ctx = await getSessionContext();
  if (!ctx) redirect("/sign-in");

  const pharmacy = await prisma.pharmacy.findUnique({
    where: { id: ctx.pharmacyId },
    select: {
      fantasia: true, razaoSocial: true, chainName: true, addressLine: true, city: true, state: true,
      latitude: true, longitude: true, referralEnabled: true, referralPoints: true,
    },
  });
  if (!pharmacy) redirect("/dashboard");

  return (
    <PageShell narrow>
      <PageHeader eyebrow={pharmacy.fantasia ?? pharmacy.razaoSocial} title="Configurações" subtitle="Localização, rede e programa de indicação da sua farmácia." />
      <div className="mt-8 space-y-6">
        <SettingsClient initial={pharmacy} canEdit={isAtLeast(ctx.role, Role.OWNER)} />
        <ProductsClient canEdit={isAtLeast(ctx.role, Role.OWNER)} />
      </div>
    </PageShell>
  );
}
