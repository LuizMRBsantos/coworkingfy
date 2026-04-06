import { notFound, redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { SpaceForm } from "@/components/shared/SpaceForm";
import { Badge } from "@/components/ui/badge";

const STATUS_LABEL = { ACTIVE: "Ativo", MAINTENANCE: "Em Manutenção", INACTIVE: "Inativo" } as const;
const STATUS_CLASS  = {
  ACTIVE:      "bg-green-100 text-green-700 hover:bg-green-100",
  MAINTENANCE: "bg-yellow-100 text-yellow-700 hover:bg-yellow-100",
  INACTIVE:    "bg-red-100 text-red-700 hover:bg-red-100",
} as const;

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function SpaceDetailPage({ params }: PageProps) {
  const session = await auth();
  if (!session) redirect("/login");
  if (session.user.role !== "ADMIN") redirect("/dashboard");

  const { id } = await params;

  const space = await db.space.findUnique({
    where:   { id },
    include: { unit: { select: { id: true, name: true } } },
  });

  if (!space) notFound();

  return (
    <div className="space-y-6 max-w-lg">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">{space.name}</h1>
          <p className="text-sm text-gray-500 mt-1">{space.unit.name}</p>
        </div>
        <Badge className={STATUS_CLASS[space.status]}>{STATUS_LABEL[space.status]}</Badge>
      </div>

      <SpaceForm
        spaceId={space.id}
        units={[space.unit]}
        defaultValues={{
          name:        space.name,
          description: space.description ?? undefined,
          capacity:    space.capacity,
          type:        space.type,
          status:      space.status,
          unitId:      space.unitId,
        }}
        backHref="/dashboard/admin/spaces"
      />
    </div>
  );
}
