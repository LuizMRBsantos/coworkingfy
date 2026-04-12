import type { ActivityEntityType, Prisma } from "@prisma/client";

interface LogActivityParams {
  tx:              Prisma.TransactionClient;
  entityType:      ActivityEntityType;
  entityId:        string;
  action:          string;
  fromStatus?:     string;
  toStatus?:       string;
  performedById?:  string;
  performedByName?: string | null;
  lat?:            number | null;
  lng?:            number | null;
  metadata?:       Prisma.InputJsonValue;
}

/**
 * Registra um evento imutável na tabela activity_logs.
 * Deve ser chamado DENTRO de uma db.$transaction para garantir atomicidade.
 */
export async function logActivity({
  tx,
  entityType,
  entityId,
  action,
  fromStatus,
  toStatus,
  performedById,
  performedByName,
  lat,
  lng,
  metadata,
}: LogActivityParams): Promise<void> {
  await tx.activityLog.create({
    data: {
      entityType,
      entityId,
      action,
      fromStatus,
      toStatus,
      performedById,
      performedByName,
      lat:      lat  != null ? lat  : undefined,
      lng:      lng  != null ? lng  : undefined,
      metadata: metadata,
    },
  });
}
