import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { Sidebar } from "@/components/shared/Sidebar";
import { Header } from "@/components/shared/Header";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session) redirect("/login");

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
        />
        <main className="flex-1 overflow-y-auto p-6">{children}</main>
      </div>
    </div>
  );
}
