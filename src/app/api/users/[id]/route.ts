import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { Role } from "@prisma/client";
import { z } from "zod";

const UpdateUserSchema = z.object({
  name:    z.string().min(1).optional(),
  email:   z.string().email().optional(),
  role:    z.nativeEnum(Role).optional(),
  unitIds: z.array(z.string()).optional(),
  active:  z.boolean().optional(),
});

const userSelect = {
  id: true, name: true, email: true, role: true, active: true, createdAt: true,
  userUnits: { select: { unit: { select: { id: true, name: true } } } },
} as const;

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  if (session.user.role !== "ADMIN") return NextResponse.json({ error: "Sem permissão" }, { status: 403 });

  const { id } = await params;
  const user = await db.user.findUnique({ where: { id }, select: userSelect });
  if (!user) return NextResponse.json({ error: "Usuário não encontrado" }, { status: 404 });
  return NextResponse.json(user);
}

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  if (session.user.role !== "ADMIN") return NextResponse.json({ error: "Sem permissão" }, { status: 403 });

  const { id } = await params;
  const user = await db.user.findUnique({ where: { id } });
  if (!user) return NextResponse.json({ error: "Usuário não encontrado" }, { status: 404 });

  const body = await req.json();
  const parsed = UpdateUserSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Dados inválidos", code: "VALIDATION_ERROR" }, { status: 400 });
  }

  const { name, email, role, unitIds, active } = parsed.data;

  if (email && email !== user.email) {
    const existing = await db.user.findUnique({ where: { email } });
    if (existing) {
      return NextResponse.json({ error: "Email já cadastrado", code: "EMAIL_EXISTS" }, { status: 409 });
    }
  }

  const updated = await db.user.update({
    where: { id },
    data: {
      ...(name   !== undefined ? { name }   : {}),
      ...(email  !== undefined ? { email }  : {}),
      ...(role   !== undefined ? { role }   : {}),
      ...(active !== undefined ? { active } : {}),
      ...(unitIds !== undefined ? {
        userUnits: { deleteMany: {}, create: unitIds.map((unitId) => ({ unitId })) },
      } : {}),
    },
    select: userSelect,
  });

  return NextResponse.json(updated);
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  if (session.user.role !== "ADMIN") return NextResponse.json({ error: "Sem permissão" }, { status: 403 });

  const { id } = await params;

  if (id === session.user.id) {
    return NextResponse.json({ error: "Não é possível desativar sua própria conta" }, { status: 400 });
  }

  const user = await db.user.findUnique({ where: { id } });
  if (!user) return NextResponse.json({ error: "Usuário não encontrado" }, { status: 404 });

  await db.user.update({ where: { id }, data: { active: false } });
  return NextResponse.json({ message: "Usuário desativado com sucesso" });
}
