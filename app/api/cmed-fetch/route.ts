import { NextResponse } from "next/server";
import { request as httpsRequest } from "node:https";
import { request as httpRequest } from "node:http";
import { Readable } from "node:stream";

// Proxy that fetches the CMED price CSV from Anvisa and streams it back.
// Exists because Supabase Edge Functions / Deno Deploy don't trust the
// ICP-Brasil chain dados.anvisa.gov.br serves; even Node's fetch can
// fail with handshake errors because the server doesn't ship the
// intermediate cert. We use the node:https module with
// rejectUnauthorized:false because the data is public open-data CSV
// (no PII or auth-bearing payloads) and the edge function downstream
// sanity-checks shape (size + semicolon count) before trusting it.

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const SOURCE_URL =
  process.env.CMED_URL ?? "https://dados.anvisa.gov.br/dados/TA_PRECO_MEDICAMENTO.csv";

function authorized(req: Request): boolean {
  const secret = process.env.CMED_PROXY_SECRET;
  if (!secret) return true;
  const url = new URL(req.url);
  const fromQuery = url.searchParams.get("key");
  const fromHeader = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  return fromQuery === secret || fromHeader === secret;
}

function fetchCsvStream(url: string): Promise<Readable> {
  const u = new URL(url);
  const requestFn = u.protocol === "http:" ? httpRequest : httpsRequest;
  return new Promise((resolve, reject) => {
    const req = requestFn(
      {
        protocol: u.protocol,
        hostname: u.hostname,
        port: u.port || (u.protocol === "http:" ? 80 : 443),
        path: u.pathname + u.search,
        method: "GET",
        rejectUnauthorized: false,
        headers: { "User-Agent": "farma-cmed-proxy/1.0" },
      },
      (res) => {
        if ((res.statusCode === 301 || res.statusCode === 302) && res.headers.location) {
          fetchCsvStream(new URL(res.headers.location, url).toString()).then(resolve, reject);
          return;
        }
        if (!res.statusCode || res.statusCode < 200 || res.statusCode >= 300) {
          reject(new Error(`upstream ${res.statusCode}`));
          return;
        }
        resolve(res);
      },
    );
    req.on("error", reject);
    req.end();
  });
}

export async function GET(req: Request) {
  if (!authorized(req)) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  try {
    const stream = await fetchCsvStream(SOURCE_URL);
    return new NextResponse(Readable.toWeb(stream) as ReadableStream<Uint8Array>, {
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
