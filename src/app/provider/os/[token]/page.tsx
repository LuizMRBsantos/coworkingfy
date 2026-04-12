import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { ProviderOSClient } from "./ProviderOSClient";
import type { ServiceOrderStatus } from "@prisma/client";

interface PageProps {
  params: Promise<{ token: string }>;
}

export default async function ProviderOSPage({ params }: PageProps) {
  const { token } = await params;

  const providerToken = await db.providerToken.findUnique({
    where:  { token },
    select: {
      id:        true,
      expiresAt: true,
      usedAt:    true,
      serviceOrder: {
        select: {
          id:            true,
          number:        true,
          status:        true,
          description:   true,
          isRemote:      true,
          scheduledDate: true,
          unit: {
            select: {
              name:    true,
              address: true,
              lat:     true,
              lng:     true,
            },
          },
          provider: { select: { name: true } },
        },
      },
    },
  });

  if (!providerToken) notFound();

  const { serviceOrder } = providerToken;

  // Token expirado — mostrar estado informativo ao prestador
  const isExpired = providerToken.expiresAt < new Date();

  // Statuses que o prestador pode operar
  const activeStatuses: ServiceOrderStatus[] = ["APPROVED", "IN_PROGRESS"];
  const isOperable = !isExpired && activeStatuses.includes(serviceOrder.status);

  const hasUnitCoords =
    serviceOrder.unit.lat !== null && serviceOrder.unit.lng !== null;

  return (
    <ProviderOSClient
      serviceOrderId={serviceOrder.id}
      osNumber={serviceOrder.number}
      status={serviceOrder.status}
      description={serviceOrder.description}
      isRemote={serviceOrder.isRemote}
      scheduledDate={serviceOrder.scheduledDate?.toISOString() ?? null}
      unitName={serviceOrder.unit.name}
      unitAddress={serviceOrder.unit.address ?? null}
      providerName={serviceOrder.provider?.name ?? null}
      token={token}
      isExpired={isExpired}
      isOperable={isOperable}
      hasUnitCoords={hasUnitCoords}
    />
  );
}
