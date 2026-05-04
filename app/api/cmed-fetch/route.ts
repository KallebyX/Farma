import { NextResponse } from "next/server";

// Proxy that fetches the CMED price CSV from Anvisa and streams it back.
// Exists because Supabase Edge Functions / Deno Deploy don't trust
// ICP-Brasil's intermediate cert chain that dados.anvisa.gov.br serves —
// Vercel's Node runtime does, so we use this as a transit hop.
//
// Optional: protect with a shared secret to avoid being a generic
// open proxy. CMED_PROXY_SECRET must match the request's
// `Authorization: Bearer <secret>` header (or `?key=<secret>` query).

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const SOURCE_URL =
  process.env.CMED_URL ?? "https://dados.anvisa.gov.br/dados/TA_PRECO_MEDICAMENTO.csv";

function authorized(req: Request): boolean {
  const secret = process.env.CMED_PROXY_SECRET;
  if (!secret) return true; // open if not configured
  const url = new URL(req.url);
  const fromQuery = url.searchParams.get("key");
  const fromHeader = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  return fromQuery === secret || fromHeader === secret;
}

export async function GET(req: Request) {
  if (!authorized(req)) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  const upstream = await fetch(SOURCE_URL, {
    headers: { "User-Agent": "farma-cmed-proxy/1.0" },
    cache: "no-store",
  });

  if (!upstream.ok || !upstream.body) {
    return NextResponse.json(
      { ok: false, error: `upstream ${upstream.status}` },
      { status: 502 },
    );
  }

  return new NextResponse(upstream.body, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Cache-Control": "private, max-age=300",
    },
  });
}
