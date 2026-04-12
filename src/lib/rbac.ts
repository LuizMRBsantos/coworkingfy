import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import type { Role } from "@prisma/client";

// ---------------------------------------------------------------------------
// Tipos
// ---------------------------------------------------------------------------

interface AuthenticatedSession {
  user: {
    id: string;
    role: Role;
    unitIds: string[];
    name?: string | null;
    email?: string | null;
  };
}

// ---------------------------------------------------------------------------
// Helpers de verificação (para uso direto em lógicas internas)
// ---------------------------------------------------------------------------

const ROLE_HIERARCHY: Record<Role, number> = {
  MEMBER: 0,
  RECEPTIONIST: 1,
  ADMIN: 2,
};

/**
 * Verifica se o role do usuário está no nível mínimo exigido.
 * Ex: isAtLeast("RECEPTIONIST", "ADMIN") → true
 */
export function isAtLeast(userRole: Role, minimumRole: Role): boolean {
  return ROLE_HIERARCHY[userRole] >= ROLE_HIERARCHY[minimumRole];
}

/**
 * Verifica se o role do usuário está na lista de roles permitidos.
 */
export function hasRole(userRole: Role, allowedRoles: Role[]): boolean {
  return allowedRoles.includes(userRole);
}

// ---------------------------------------------------------------------------
// Wrapper para Route Handlers
// ---------------------------------------------------------------------------

type AuthenticatedHandler<T = unknown> = (
  req: NextRequest,
  session: AuthenticatedSession,
  context: T,
) => Promise<Response>;

/**
 * Envolve um Route Handler exigindo autenticação e (opcionalmente) roles.
 *
 * @example
 * // Qualquer usuário autenticado
 * export const GET = withAuth(async (req, session) => { ... });
 *
 * // Apenas ADMIN
 * export const POST = withAuth(async (req, session) => { ... }, ["ADMIN"]);
 *
 * // ADMIN ou RECEPTIONIST
 * export const PUT = withAuth(async (req, session) => { ... }, ["ADMIN", "RECEPTIONIST"]);
 */
export function withAuth<T = unknown>(
  handler: AuthenticatedHandler<T>,
  allowedRoles?: Role[],
) {
  return async (req: NextRequest, context: T) => {
    const session = await auth();

    if (!session) {
      return NextResponse.json(
        { error: "Não autenticado" },
        { status: 401 },
      );
    }

    if (allowedRoles && !hasRole(session.user.role, allowedRoles)) {
      return NextResponse.json(
        { error: "Sem permissão" },
        { status: 403 },
      );
    }

    return handler(req, session as AuthenticatedSession, context);
  };
}
