export const runtime = "nodejs";

import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";
import type { Role } from "@prisma/client";

const PUBLIC_ROUTES = ["/login", "/api/auth"];

function getRoleRedirect(role: Role): string {
  if (role === "ADMIN") return "/dashboard/admin";
  if (role === "RECEPTIONIST") return "/dashboard/reception";
  return "/dashboard/member";
}

export default auth((req) => {
  const { nextUrl } = req;
  const session = req.auth;
  const pathname = nextUrl.pathname;

  // Rotas públicas — passar direto
  if (PUBLIC_ROUTES.some((route) => pathname.startsWith(route))) {
    return NextResponse.next();
  }

  // Não autenticado → /login
  if (!session) {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  const role = session.user.role;

  // /dashboard exato → redireciona para área do role
  if (pathname === "/dashboard") {
    return NextResponse.redirect(new URL(getRoleRedirect(role), req.url));
  }

  // /dashboard/admin/* → só ADMIN
  if (pathname.startsWith("/dashboard/admin") && role !== "ADMIN") {
    return NextResponse.redirect(new URL("/dashboard", req.url));
  }

  // /dashboard/reception/* → ADMIN + RECEPTIONIST
  if (
    pathname.startsWith("/dashboard/reception") &&
    role !== "ADMIN" &&
    role !== "RECEPTIONIST"
  ) {
    return NextResponse.redirect(new URL("/dashboard", req.url));
  }

  return NextResponse.next();
});

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
