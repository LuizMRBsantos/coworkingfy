import { z } from "zod";
import { ServiceType } from "@prisma/client";

export const CreateServiceOrderSchema = z.object({
  ticketId:           z.string().min(1, "Ticket é obrigatório"),
  unitId:             z.string().min(1),
  spaceId:            z.string().optional(),
  serviceType:        z.enum(ServiceType),
  description:        z.string().min(10, "Descrição deve ter pelo menos 10 caracteres"),
  providerId:         z.string().optional(),
  scheduledDate:      z.iso.datetime().optional(),
  value:              z.number().positive().optional(),
  isRemote:           z.boolean().optional(),
  specialInstructions: z.string().optional(),
});

// Status alcançáveis via PUT — DRAFT é só criação
export const UpdateServiceOrderStatusSchema = z.object({
  status: z.enum([
    "PENDING_APPROVAL",
    "APPROVED",
    "REJECTED",
    "IN_PROGRESS",
    "DONE",
    "VALIDATED",
    "CANCELLED",
  ]),
  providerId:         z.string().optional(),
  cancellationReason: z.string().optional(),
  executionReport:    z.string().optional(),
});

export const CreateAttachmentSchema = z.object({
  name: z.string().min(1, "Nome é obrigatório"),
  url:  z.string().url("URL inválida"),
});

export type CreateServiceOrderInput  = z.infer<typeof CreateServiceOrderSchema>;
export type UpdateServiceOrderStatusInput = z.infer<typeof UpdateServiceOrderStatusSchema>;
export type CreateAttachmentInput    = z.infer<typeof CreateAttachmentSchema>;
