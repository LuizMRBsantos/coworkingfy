import { redirect, notFound } from "next/navigation";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { Badge } from "@/components/ui/badge";
import { UserForm } from "@/components/shared/UserForm";
import { UserDeactivateButton } from "@/components/shared/UserDeactivateButton";
import type { Role } from "@prisma/client";

interface PageProps {
  params: Promise<{ id: string }>;
}

const ROLE_LABEL: Record<Role, string> = {
  ADMIN:        "Admin",
  RECEPTIONIST: "Recepcionista",
  MEMBER:       "Membro",
};

const ROLE_CLASS: Record<Role, string> = {
  ADMIN:        "bg-purple-100 text-purple-800 hover:bg-purple-100",
  RECEPTIONIST: "bg-blue-100 text-blue-800 hover:bg-blue-100",
  MEMBER:       "bg-gray-100 text-gray-600 hover:bg-gray-100",
};

export default async function UserDetailPage({ params }: PageProps) {
  const session = await auth();
  if (!session) redirect("/login");
  if (session.user.role !== "ADMIN") redirect("/dashboard");

  const { id } = await params;

  const [user, units] = await Promise.all([
    db.user.findUnique({
      where: { id },
      select: {
        id: true, name: true, email: true, role: true, active: true,
        userUnits: { select: { unitId: true, unit: { select: { id: true, name: true } } } },
      },
    }),
    db.unit.findMany({ select: { id: true, name: true }, orderBy: { name: "asc" } }),
  ]);

  if (!user) notFound();

  const defaultValues = {
    name:    user.name ?? "",
    email:   user.email,
    role:    user.role,
    unitIds: user.userUnits.map((uu) => uu.unitId),
  };

  return (
    <div className="max-w-xl space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-2xl font-semibold text-gray-900">{user.name ?? user.email}</h1>
            <Badge className={ROLE_CLASS[user.role]}>{ROLE_LABEL[user.role]}</Badge>
            <Badge className={user.active
              ? "bg-green-100 text-green-700 hover:bg-green-100"
              : "bg-red-100 text-red-700 hover:bg-red-100"
            }>
              {user.active ? "Ativo" : "Inativo"}
            </Badge>
          </div>
          <p className="text-sm text-gray-500 mt-1">{user.email}</p>
        </div>
        <UserDeactivateButton
          userId={user.id}
          active={user.active}
          isSelf={user.id === session.user.id}
        />
      </div>

      <UserForm units={units} userId={user.id} defaultValues={defaultValues} />
    </div>
  );
}
