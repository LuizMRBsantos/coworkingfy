import { z } from "zod";
import { ServiceType, Priority } from "@prisma/client";

export const CreateServiceOrderSchema = z.object({
  unitId: z.string().min(1),
  spaceId: z.string().optional(),
  serviceType: z.nativeEnum(ServiceType),
  description: z.string().min(10, "Descrição deve ter pelo menos 10 caracteres"),
  priority: z.nativeEnum(Priority),
  providerId: z.string().optional(),
});

// Apenas status alcançáveis via PUT — DRAFT é só criação
export const UpdateServiceOrderStatusSchema = z.object({
  status: z.enum([
    "PENDING_APPROVAL",
    "APPROVED",
    "REJECTED",
    "IN_PROGRESS",
    "DONE",
    "CANCELLED",
  ]),
  providerId: z.string().optional(),
});

export type CreateServiceOrderInput = z.infer<typeof CreateServiceOrderSchema>;
export type UpdateServiceOrderStatusInput = z.infer<typeof UpdateServiceOrderStatusSchema>;
