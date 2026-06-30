import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth/session";
import { ForbiddenError, UnauthorizedError, isAtLeast } from "@/lib/auth/permissions";
import { Role } from "@prisma/client";
import {
  isPartnerKey,
  upsertConnection,
  disconnect,
  testConnection,
  type ConnectInput,
} from "@/lib/integrations/ecosystem";

export const dynamic = "force-dynamic";

/**
 * Manage ecosystem partner connections (AtendeBem / Meu Prontuário). Owner-only.
 * Body: { action: "connect"|"test"|"disconnect", partner, baseUrl?, secret?, flags... }
 */
export async function POST(req: Request) {
  try {
    const session = await requireSession();
    if (!isAtLeast(session.role, Role.OWNER)) {
      return NextResponse.json({ ok: false, error: "Apenas o proprietário pode gerenciar integrações" }, { status: 403 });
    }

    const body = (await req.json().catch(() => ({}))) as {
      action?: string;
      partner?: string;
      baseUrl?: string;
      secret?: string;
      autoPushDispensations?: boolean;
      autoAcceptPrescriptions?: boolean;
      shareAdherence?: boolean;
    };

    const partner = body.partner ?? "";
    if (!isPartnerKey(partner)) {
      return NextResponse.json({ ok: false, error: "Parceiro inválido" }, { status: 400 });
    }

    switch (body.action) {
      case "connect": {
        const input: ConnectInput = {
          baseUrl: body.baseUrl,
          ...(body.secret !== undefined ? { secret: body.secret } : {}),
          ...(body.autoPushDispensations !== undefined ? { autoPushDispensations: body.autoPushDispensations } : {}),
          ...(body.autoAcceptPrescriptions !== undefined ? { autoAcceptPrescriptions: body.autoAcceptPrescriptions } : {}),
          ...(body.shareAdherence !== undefined ? { shareAdherence: body.shareAdherence } : {}),
        };
        const conn = await upsertConnection(session.pharmacyId, partner, input);
        // Immediately probe so the UI reflects a real status.
        const result = await testConnection(session.pharmacyId, partner);
        return NextResponse.json({ ok: true, secret: conn.secret, status: result.ok ? "CONNECTED" : "ERROR", detail: result.detail });
      }
      case "test": {
        const result = await testConnection(session.pharmacyId, partner);
        return NextResponse.json({ ok: result.ok, detail: result.detail });
      }
      case "disconnect": {
        await disconnect(session.pharmacyId, partner);
        return NextResponse.json({ ok: true });
      }
      default:
        return NextResponse.json({ ok: false, error: "Ação inválida" }, { status: 400 });
    }
  } catch (err) {
    if (err instanceof UnauthorizedError) return NextResponse.json({ ok: false, error: err.message }, { status: 401 });
    if (err instanceof ForbiddenError) return NextResponse.json({ ok: false, error: err.message }, { status: 403 });
    console.error("[api/integracoes/ecosystem]", err);
    return NextResponse.json({ ok: false, error: "Erro inesperado" }, { status: 500 });
  }
}
