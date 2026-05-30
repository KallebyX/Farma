import { NextResponse } from "next/server";
import { request as httpsRequest } from "node:https";
import { request as httpRequest } from "node:http";
import { Readable } from "node:stream";

// Proxy that fetches the CMED price CSV. Anvisa 403s requests from
// every datacenter IP we can reach (Vercel/AWS, GitHub Actions/Azure,
// even WebFetch sandbox), so we fall through a chain of mirrors:
//   1. Anvisa direct (works from residential IPs only)
//   2. Wayback Machine cached snapshot — Cloudflare-fronted, always
//      reachable, content as-served at snapshot time
//   3. dados.gov.br CKAN — Brazilian central open-data portal that
//      sometimes mirrors the file
// First one to return a CSV-shaped body (>= 100 KB, plenty of ;) wins.

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const ANVISA_URL =
  process.env.CMED_URL ?? "https://dados.anvisa.gov.br/dados/TA_PRECO_MEDICAMENTO.csv";

const SOURCE_URLS = [
  ANVISA_URL,
  // Wayback Machine — `web/2*/<url>` returns latest snapshot, served
  // through Cloudflare regardless of upstream availability.
  `https://web.archive.org/web/2024/${ANVISA_URL}`,
  `https://web.archive.org/web/${ANVISA_URL}`,
];

const BROWSER_HEADERS: Record<string, string> = {
  "User-Agent":
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36",
  "Accept": "text/csv,application/vnd.ms-excel,application/octet-stream,*/*;q=0.8",
  "Accept-Language": "pt-BR,pt;q=0.9,en;q=0.8",
  "Accept-Encoding": "identity",
};

function authorized(req: Request): boolean {
  const secret = process.env.CMED_PROXY_SECRET;
  if (!secret) return true;
  const url = new URL(req.url);
  const fromQuery = url.searchParams.get("key");
  const fromHeader = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  return fromQuery === secret || fromHeader === secret;
}

type FetchResult = { url: string; body: Buffer };

function fetchOne(url: string, depth = 0): Promise<FetchResult> {
  if (depth > 10) return Promise.reject(new Error("too many redirects"));
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
        const chunks: Buffer[] = [];
        res.on("data", (c: Buffer) => chunks.push(c));
        res.on("end", () => resolve({ url, body: Buffer.concat(chunks) }));
        res.on("error", reject);
      },
    );
    req.on("error", reject);
    req.setTimeout(45_000, () => req.destroy(new Error("timeout")));
    req.end();
  });
}

function looksLikeCmed(body: Buffer): boolean {
  if (body.length < 100_000) return false;
  const head = body.slice(0, 50_000).toString("latin1");
  const semis = (head.match(/;/g) ?? []).length;
  return semis >= 100 && /SUBST[ÂA]NCIA|GGREM/i.test(head);
}

async function fetchCsv(): Promise<FetchResult> {
  const errs: string[] = [];
  for (const u of SOURCE_URLS) {
    try {
      const res = await fetchOne(u);
      if (!looksLikeCmed(res.body)) {
        errs.push(`${u} -> body ${res.body.length}b not CMED-shaped`);
        continue;
      }
      return res;
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
    const { url: usedUrl, body } = await fetchCsv();
    return new NextResponse(new Uint8Array(body), {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Length": String(body.length),
        "X-Cmed-Source": usedUrl,
        "Cache-Control": "private, max-age=300",
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ ok: false, error: `fetch failed: ${message}` }, { status: 502 });
  }
}
