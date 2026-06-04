import { ok, preflight } from "@/lib/api/v1/respond";

export const dynamic = "force-dynamic";

/** GET /api/v1/health - liveness/version probe for the Meu Prontuário apps. */
export function GET(req: Request) {
  return ok(req, { status: "ok", api: "v1", time: new Date().toISOString() });
}

export const OPTIONS = preflight;
