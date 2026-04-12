import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { Sidebar } from "@/components/shared/Sidebar";
import { Header } from "@/components/shared/Header";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session) redirect("/login");

  // Busca unidades para o seletor do header
  const units = session.user.role === "ADMIN"
    ? await db.unit.findMany({ select: { id: true, name: true }, orderBy: { name: "asc" } })
    : session.user.unitIds.length > 0
      ? await db.unit.findMany({
          where: { id: { in: session.user.unitIds } },
          select: { id: true, name: true },
          orderBy: { name: "asc" },
        })
      : [];

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar
        role={session.user.role}
        userName={session.user.name ?? "Usuário"}
        userEmail={session.user.email ?? ""}
      />
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        <Header
          role={session.user.role}
          userName={session.user.name ?? "Usuário"}
          userEmail={session.user.email ?? ""}
          units={units}
        />
        <main className="flex-1 overflow-y-auto p-6 no-scrollbar">{children}</main>
      </div>
    </div>
  );
}
