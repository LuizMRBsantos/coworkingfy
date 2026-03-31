import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Plus, Building2 } from "lucide-react";
import type { Role } from "@prisma/client";

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

export default async function UsersPage() {
  const session = await auth();
  if (!session) redirect("/login");
  if (session.user.role !== "ADMIN") redirect("/dashboard");

  const users = await db.user.findMany({
    orderBy: { createdAt: "desc" },
    select: {
      id: true, name: true, email: true, role: true, active: true,
      userUnits: { select: { unit: { select: { id: true, name: true } } } },
    },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Usuários</h1>
          <p className="text-sm text-gray-500 mt-1">
            {users.length} usuário{users.length !== 1 ? "s" : ""} cadastrado{users.length !== 1 ? "s" : ""}
          </p>
        </div>
        <Link href="/dashboard/admin/users/new">
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            Novo Usuário
          </Button>
        </Link>
      </div>

      <div className="grid gap-3">
        {users.length === 0 ? (
          <div className="text-center py-16 text-gray-400">Nenhum usuário cadastrado.</div>
        ) : (
          users.map((user) => (
            <Link key={user.id} href={`/dashboard/admin/users/${user.id}`} className="block">
              <Card className="hover:border-gray-300 transition-colors cursor-pointer">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium text-gray-900">{user.name ?? "(sem nome)"}</span>
                        <Badge className={ROLE_CLASS[user.role]}>{ROLE_LABEL[user.role]}</Badge>
                        <Badge className={user.active
                          ? "bg-green-100 text-green-700 hover:bg-green-100"
                          : "bg-red-100 text-red-700 hover:bg-red-100"
                        }>
                          {user.active ? "Ativo" : "Inativo"}
                        </Badge>
                      </div>
                      <p className="text-sm text-gray-500 mt-0.5">{user.email}</p>
                      {user.userUnits.length > 0 && (
                        <p className="text-xs text-gray-400 mt-1 flex items-center gap-1">
                          <Building2 className="h-3 w-3" />
                          {user.userUnits.map((uu) => uu.unit.name).join(", ")}
                        </p>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))
        )}
      </div>
    </div>
  );
}
