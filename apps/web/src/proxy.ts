import NextAuth from "next-auth";
import { authConfig } from "./auth.config";
import { NextResponse } from "next/server";

const { auth } = NextAuth(authConfig);

export default auth((req) => {
  const { pathname } = req.nextUrl;
  const session = req.auth;
  const role = (session?.user as { role?: string })?.role;

  const isAdminRoute     = pathname.startsWith("/admin");
  const isDashboardRoute = pathname.startsWith("/dashboard");
  const isSalonRoute     = pathname.startsWith("/salon");
  const isStylistRoute   = pathname.startsWith("/stylist");

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
