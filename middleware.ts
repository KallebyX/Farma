import NextAuth from "next-auth";
import { NextResponse } from "next/server";
import { authEdgeConfig } from "@/lib/auth/config-edge";

const { auth } = NextAuth(authEdgeConfig);

const PUBLIC_PATHS = [
  /^\/$/,
  /^\/sign-in$/,
  /^\/sign-up$/,
  /^\/legal\//,
  /^\/accept-invite\//,
  /^\/api\/accept-invite\//,
  /^\/api\/sign-up$/,
  /^\/api\/cmed-fetch$/,
  /^\/api\/auth\//,
  /^\/api\/cron\//,
  /^\/api\/whatsapp\//,
];

export default auth((req) => {
  const { pathname } = req.nextUrl;
  const isPublic = PUBLIC_PATHS.some((rx) => rx.test(pathname));
  if (isPublic) return NextResponse.next();

  if (!req.auth) {
    const url = req.nextUrl.clone();
    url.pathname = "/sign-in";
    url.searchParams.set("from", pathname);
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
});

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:png|jpg|jpeg|svg|ico|css)).*)",
  ],
};
