import { z } from "zod";

export const CreatePurchaseSchema = z.object({
  unitId:      z.string().min(1, "Unidade é obrigatória"),
  category:    z.enum(["CLEANING", "COFFEE", "OFFICE_SUPPLIES"] as const),
  description: z.string().min(1, "Descrição é obrigatória").max(200),
  value:       z.number().positive("Valor deve ser positivo"),
  purchasedAt: z.string().min(1, "Data é obrigatória"),
  notes:       z.string().optional(),
});

export const UpdatePurchaseSchema = z.object({
  category:    z.enum(["CLEANING", "COFFEE", "OFFICE_SUPPLIES"] as const).optional(),
  description: z.string().min(1).max(200).optional(),
  value:       z.number().positive().optional(),
  purchasedAt: z.string().optional(),
  notes:       z.string().optional(),
});

export type CreatePurchaseInput = z.infer<typeof CreatePurchaseSchema>;
export type UpdatePurchaseInput = z.infer<typeof UpdatePurchaseSchema>;
