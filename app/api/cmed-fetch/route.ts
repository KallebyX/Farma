import { NextResponse } from "next/server";
import { Agent } from "undici";

// Proxy that fetches the CMED price CSV from Anvisa and streams it back.
// Exists because Supabase Edge Functions / Deno Deploy don't trust the
// ICP-Brasil chain that dados.anvisa.gov.br serves; even Node's fetch
// occasionally chokes on it because the server doesn't ship the
// intermediate cert. We use undici's Agent with rejectUnauthorized:false
// because the data is public and integrity is verified by row count + CSV
// shape downstream — no PII or sensitive bytes.

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const SOURCE_URL =
  process.env.CMED_URL ?? "https://dados.anvisa.gov.br/dados/TA_PRECO_MEDICAMENTO.csv";

const insecureAgent = new Agent({ connect: { rejectUnauthorized: false } });

function authorized(req: Request): boolean {
  const secret = process.env.CMED_PROXY_SECRET;
  if (!secret) return true;
  const url = new URL(req.url);
  const fromQuery = url.searchParams.get("key");
  const fromHeader = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  return fromQuery === secret || fromHeader === secret;
}

export async function GET(req: Request) {
  if (!authorized(req)) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  try {
    const upstream = await fetch(SOURCE_URL, {
      // @ts-expect-error — Next.js type for fetch doesn't surface dispatcher,
      // but the runtime is undici-based and accepts it.
      dispatcher: insecureAgent,
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
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ ok: false, error: `fetch failed: ${message}` }, { status: 502 });
  }
}
