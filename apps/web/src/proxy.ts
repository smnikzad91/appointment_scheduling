import NextAuth from "next-auth";
import { authConfig } from "./auth.config";
import { NextResponse } from "next/server";

const { auth } = NextAuth(authConfig);

export default auth((req) => {
  const { pathname } = req.nextUrl;
  const session = req.auth;
  const role = (session?.user as { role?: string })?.role;

  // Whole path segments only: "/salons" (public search) must not count as the "/salon" panel.
  const under = (base: string) => pathname === base || pathname.startsWith(`${base}/`);
  const isAdminRoute     = under("/admin");
  const isDashboardRoute = under("/dashboard");
  const isSalonRoute     = under("/salon");
  const isStylistRoute   = under("/stylist");

  if ((isAdminRoute || isDashboardRoute || isSalonRoute || isStylistRoute) && !session) {
    return NextResponse.redirect(new URL("/signin", req.url));
  }

  if (isAdminRoute && role !== "PLATFORM_ADMIN") {
    return NextResponse.redirect(new URL("/dashboard", req.url));
  }

  if (isSalonRoute && role !== "SALON_OWNER") {
    return NextResponse.redirect(new URL("/dashboard", req.url));
  }

  if (isStylistRoute && role !== "STYLIST") {
    return NextResponse.redirect(new URL("/dashboard", req.url));
  }

  return NextResponse.next();
});

export const config = {
  matcher: ["/admin/:path*", "/dashboard/:path*", "/salon/:path*", "/stylist/:path*"],
};
