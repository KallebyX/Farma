import { NextResponse } from "next/server";

/**
 * Shared helpers for the public, versioned patient API (`/api/v1/*`) consumed by
 * the Meu Prontuário apps (web/iOS/Android). Stable response envelope:
 *   success → { ok: true, data, nextCursor? }
 *   error   → { ok: false, error }
 * CORS is permissive for GET/POST/PATCH so the apps (own domains / native) can call it.
 */

const ALLOWED_HEADERS = "Authorization, Content-Type";
const ALLOWED_METHODS = "GET, POST, PATCH, DELETE, OPTIONS";

function corsHeaders(origin: string | null): Record<string, string> {
  // Reflect the caller's origin (apps live on their own domains); native apps send none.
  return {
    "Access-Control-Allow-Origin": origin ?? "*",
    "Access-Control-Allow-Methods": ALLOWED_METHODS,
    "Access-Control-Allow-Headers": ALLOWED_HEADERS,
    "Access-Control-Max-Age": "86400",
    Vary: "Origin",
  };
}

export function ok<T>(req: Request, data: T, status = 200): NextResponse {
  return NextResponse.json({ ok: true, data }, { status, headers: corsHeaders(req.headers.get("origin")) });
}

export function paginated<T>(req: Request, items: T[], nextCursor: string | null = null): NextResponse {
  return NextResponse.json({ ok: true, data: items, nextCursor }, { headers: corsHeaders(req.headers.get("origin")) });
}

export function fail(req: Request, error: string, status = 400): NextResponse {
  return NextResponse.json({ ok: false, error }, { status, headers: corsHeaders(req.headers.get("origin")) });
}

/** Standard CORS preflight handler — re-export as `OPTIONS` from each route. */
export function preflight(req: Request): NextResponse {
  return new NextResponse(null, { status: 204, headers: corsHeaders(req.headers.get("origin")) });
}
