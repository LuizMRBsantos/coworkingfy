import { notFound, redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { ProviderForm } from "@/components/shared/ProviderForm";
import { Badge } from "@/components/ui/badge";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function ReceptionProviderDetailPage({ params }: PageProps) {
  const session = await auth();
  if (!session) redirect("/login");
  if (session.user.role === "MEMBER") redirect("/dashboard");

  const { unitIds } = session.user;
  const { id } = await params;

  const provider = await db.provider.findUnique({
    where:   { id },
    include: { unit: { select: { id: true, name: true } } },
  });

  if (!provider) notFound();

  // RECEPTIONIST só acessa prestadores da sua unidade
  if (session.user.role === "RECEPTIONIST" && !unitIds.includes(provider.unitId)) {
    redirect("/dashboard/reception/providers");
  }

  return (
    <div className="space-y-6 max-w-lg">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">{provider.name}</h1>
          <p className="text-sm text-gray-500 mt-1">{provider.unit.name}</p>
        </div>
        <Badge className={provider.status === "ACTIVE"
          ? "bg-green-100 text-green-700 hover:bg-green-100"
          : "bg-red-100 text-red-700 hover:bg-red-100"
        }>
          {provider.status === "ACTIVE" ? "Ativo" : "Inativo"}
        </Badge>
      </div>

      <ProviderForm
        providerId={provider.id}
        units={[provider.unit]}
        defaultValues={{
          name:      provider.name,
          specialty: provider.specialty,
          type:      provider.type,
          phone:     provider.phone  ?? undefined,
          email:     provider.email  ?? undefined,
          status:    provider.status,
          unitId:    provider.unitId,
        }}
        backHref="/dashboard/reception/providers"
      />
    </div>
  );
}
