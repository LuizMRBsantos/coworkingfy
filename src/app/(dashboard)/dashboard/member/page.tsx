import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";

export default async function MemberPage() {
  const session = await auth();
  if (!session) redirect("/login");

  return (
    <main className="p-8">
      <h1 className="text-2xl font-semibold">Área Membro</h1>
      <p className="text-gray-500 mt-1">Role: {session.user.role}</p>
      <p className="text-gray-400 mt-4">Página em construção</p>
    </main>
  );
}
