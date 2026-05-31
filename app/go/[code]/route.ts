import { NextResponse } from "next/server";
import { recordClick } from "@/lib/affiliate/service";

/**
 * Public affiliate redirect. Records the click and 302-redirects to the partner
 * pharmacy with UTM tags + our click ref (echoed back on conversion).
 *   GET /go/<code>
 */
export async function GET(req: Request, ctx: { params: Promise<{ code: string }> }) {
  const { code } = await ctx.params;
  const result = await recordClick(code, {
    userAgent: req.headers.get("user-agent") ?? undefined,
    referer: req.headers.get("referer") ?? undefined,
  });
  if (!result) {
    return NextResponse.redirect(new URL("/", req.url), { status: 302 });
  }
  return NextResponse.redirect(result.url, { status: 302 });
}
