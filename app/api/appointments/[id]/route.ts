import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth/session";
import { UnauthorizedError } from "@/lib/auth/permissions";
import { updateAppointment } from "@/lib/appointments";

/** PATCH /api/appointments/[id] { status?, notes? } - staff updates (tenant-scoped). */
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const ctx = await requireSession();
    const { id } = await params;
    const b = (await req.json().catch(() => ({}))) as { status?: string; notes?: string };
    const res = await updateAppointment(id, ctx.pharmacyId, b);
    if (res.count === 0) return NextResponse.json({ ok: false, error: "Nada atualizado" }, { status: 404 });
    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof UnauthorizedError) return NextResponse.json({ ok: false, error: err.message }, { status: 401 });
    return NextResponse.json({ ok: false, error: "Erro" }, { status: 500 });
  }
}
