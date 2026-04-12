import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { withAuth } from "@/lib/rbac";
import { CreateUserSchema } from "@/lib/validations/user";
import bcrypt from "bcryptjs";

const userSelect = {
  id: true, name: true, email: true, role: true, active: true, createdAt: true,
  userUnits: { select: { unit: { select: { id: true, name: true } } } },
} as const;

export const GET = withAuth(
  async () => {
    const users = await db.user.findMany({ orderBy: { createdAt: "desc" }, select: userSelect });
    return NextResponse.json(users);
  },
  ["ADMIN"],
);

export const POST = withAuth(
  async (req) => {
    const body   = await req.json();
    const parsed = CreateUserSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Dados inválidos", code: "VALIDATION_ERROR" }, { status: 400 });
    }

    const { name, email, password, role, unitIds } = parsed.data;

    const existing = await db.user.findUnique({ where: { email } });
    if (existing) {
      return NextResponse.json({ error: "Email já cadastrado", code: "EMAIL_EXISTS" }, { status: 409 });
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    const user = await db.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
        role,
        userUnits: { create: unitIds.map((unitId) => ({ unitId })) },
      },
      select: userSelect,
    });

    return NextResponse.json(user, { status: 201 });
  },
  ["ADMIN"],
);
