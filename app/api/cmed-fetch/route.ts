import { NextResponse } from "next/server";
import { request as httpsRequest } from "node:https";
import { request as httpRequest } from "node:http";
import { Readable } from "node:stream";

// Proxy that fetches the CMED price CSV from Anvisa and streams it back.
// Anvisa's HTTPS chain isn't fully trusted (rejectUnauthorized:false) and
// they 403 generic User-Agents (so we send a browser UA + browser-y
// Accept headers). The data is public open-data CSV — no PII.

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const SOURCE_URLS = [
  process.env.CMED_URL,
  "https://dados.anvisa.gov.br/dados/TA_PRECO_MEDICAMENTO.csv",
  "https://www.gov.br/anvisa/pt-br/assuntos/medicamentos/cmed/precos/arquivos/TA_PRECO_MEDICAMENTO.csv",
].filter((u): u is string => Boolean(u));

const BROWSER_HEADERS: Record<string, string> = {
  "User-Agent":
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36",
  "Accept": "text/csv,application/vnd.ms-excel,application/octet-stream,*/*;q=0.8",
  "Accept-Language": "pt-BR,pt;q=0.9,en;q=0.8",
  "Accept-Encoding": "identity",
  "Cache-Control": "no-cache",
  "Pragma": "no-cache",
};

function authorized(req: Request): boolean {
  const secret = process.env.CMED_PROXY_SECRET;
  if (!secret) return true;
  const url = new URL(req.url);
  const fromQuery = url.searchParams.get("key");
  const fromHeader = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  return fromQuery === secret || fromHeader === secret;
}

function fetchOne(url: string, depth = 0): Promise<{ url: string; stream: Readable }> {
  if (depth > 5) return Promise.reject(new Error("too many redirects"));
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
        headers: BROWSER_HEADERS,
      },
      (res) => {
        if (
          res.statusCode &&
          res.statusCode >= 300 &&
          res.statusCode < 400 &&
          res.headers.location
        ) {
          fetchOne(new URL(res.headers.location, url).toString(), depth + 1).then(resolve, reject);
          return;
        }
        if (!res.statusCode || res.statusCode < 200 || res.statusCode >= 300) {
          reject(new Error(`upstream ${res.statusCode}`));
          return;
        }
        resolve({ url, stream: res });
      },
    );
    req.on("error", reject);
    req.setTimeout(40_000, () => req.destroy(new Error("timeout")));
    req.end();
  });
}

async function fetchCsv(): Promise<{ url: string; stream: Readable }> {
  const errs: string[] = [];
  for (const u of SOURCE_URLS) {
    try {
      return await fetchOne(u);
    } catch (err) {
      errs.push(`${u} -> ${err instanceof Error ? err.message : String(err)}`);
    }
  }
  throw new Error(`all sources failed: ${errs.join(" | ")}`);
}

export async function GET(req: Request) {
  if (!authorized(req)) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  try {
    const { url: usedUrl, stream } = await fetchCsv();
    return new NextResponse(Readable.toWeb(stream) as ReadableStream<Uint8Array>, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "X-Cmed-Source": usedUrl,
        "Cache-Control": "private, max-age=300",
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ ok: false, error: `fetch failed: ${message}` }, { status: 502 });
  }
}
