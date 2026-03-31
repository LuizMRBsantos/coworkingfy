import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { UserForm } from "@/components/shared/UserForm";

export default async function NewUserPage() {
  const session = await auth();
  if (!session) redirect("/login");
  if (session.user.role !== "ADMIN") redirect("/dashboard");

  const units = await db.unit.findMany({
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });

  return (
    <div className="max-w-xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">Novo Usuário</h1>
        <p className="text-sm text-gray-500 mt-1">Crie um novo usuário no sistema</p>
      </div>
      <UserForm units={units} />
    </div>
  );
}
