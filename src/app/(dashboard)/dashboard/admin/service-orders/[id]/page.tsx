import { notFound, redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { Badge } from "@/components/ui/badge";
import { OSTabs } from "@/components/shared/OSTabs";
import { ServiceOrderActions } from "@/components/shared/ServiceOrderActions";
import { Wifi } from "lucide-react";
import type { ServiceOrderStatus } from "@prisma/client";

interface PageProps {
  params: Promise<{ id: string }>;
}

const STATUS_LABEL: Record<ServiceOrderStatus, string> = {
  DRAFT:            "Rascunho",
  PENDING_APPROVAL: "Aguardando aprovação",
  APPROVED:         "Aprovada",
  IN_PROGRESS:      "Em andamento",
  DONE:             "Concluída",
  VALIDATED:        "Validada",
  REJECTED:         "Rejeitada",
  CANCELLED:        "Cancelada",
};

const STATUS_CLASS: Record<ServiceOrderStatus, string> = {
  DRAFT:            "bg-gray-100 text-gray-700 hover:bg-gray-100 border-none",
  PENDING_APPROVAL: "bg-amber-100 text-amber-800 hover:bg-amber-100 border-none",
  APPROVED:         "bg-blue-100 text-blue-800 hover:bg-blue-100 border-none",
  IN_PROGRESS:      "bg-purple-100 text-purple-800 hover:bg-purple-100 border-none",
  DONE:             "bg-emerald-100 text-emerald-800 hover:bg-emerald-100 border-none",
  VALIDATED:        "bg-teal-100 text-teal-800 hover:bg-teal-100 border-none",
  REJECTED:         "bg-red-100 text-red-800 hover:bg-red-100 border-none",
  CANCELLED:        "bg-gray-200 text-gray-600 hover:bg-gray-200 border-none",
};

export default async function ServiceOrderDetailPage({ params }: PageProps) {
  const session = await auth();
  if (!session) redirect("/login");

  const { role, unitIds } = session.user;
  if (role === "MEMBER") redirect("/dashboard");

  const { id } = await params;

  const os = await db.serviceOrder.findUnique({
    where:   { id },
    include: {
      unit:        { select: { id: true, name: true, address: true, clientName: true, clientContact: true } },
      space:       { select: { id: true, name: true } },
      asset:       { select: { id: true, name: true, code: true } },
      ticket:      { select: { id: true, number: true, description: true, priority: true, createdAt: true } },
      createdBy:   { select: { id: true, name: true } },
      approvedBy:  { select: { id: true, name: true } },
      provider:    { select: { id: true, name: true, type: true, phone: true, email: true } },
      checklists:  true,
      attachments: {
        include: { uploadedBy: { select: { id: true, name: true } } },
        orderBy: { createdAt: "asc" },
      },
    },
  });

  if (!os) notFound();

  if (role === "RECEPTIONIST" && !unitIds.includes(os.unitId)) {
    redirect("/dashboard/admin/service-orders");
  }

  const canEdit = role === "ADMIN" || (role === "RECEPTIONIST" && unitIds.includes(os.unitId));

  return (
    <div className="max-w-3xl space-y-6">
      {/* Cabeçalho */}
      <div className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-mono text-xl font-bold text-gray-900">{os.number}</span>
          <Badge className={STATUS_CLASS[os.status]}>{STATUS_LABEL[os.status]}</Badge>
          {os.isRemote && (
            <span className="flex items-center gap-1 text-xs font-medium text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">
              <Wifi className="h-3 w-3" />
              Remoto
            </span>
          )}
        </div>

        <p className="text-sm text-gray-500">{os.unit.name}</p>

        <ServiceOrderActions
          osId={os.id}
          status={os.status}
          isRemote={os.isRemote}
          role={role}
          unitId={os.unitId}
          userUnitIds={unitIds}
        />
      </div>

      {/* Tabs */}
      <OSTabs os={{ ...os, value: os.value?.toString() ?? null }} canEdit={canEdit} />
    </div>
  );
}
