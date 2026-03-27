import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";

export default async function DashboardPage() {
  const session = await auth();
  if (!session) redirect("/login");

  return (
    <main className="p-8">
      <h1 className="text-2xl font-semibold">Olá, {session.user.name}</h1>
      <p className="text-gray-500 mt-1">Role: {session.user.role}</p>
    </main>
  );
}
