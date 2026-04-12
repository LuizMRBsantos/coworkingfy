import { z } from "zod";

export const CreateMaintenancePlanSchema = z.object({
  unitId:      z.string().min(1, "Unidade é obrigatória"),
  assetId:     z.string().optional(),
  spaceId:     z.string().optional(),
  providerId:  z.string().optional(), // prestador padrão para OS geradas pelo cron
  name:        z.string().min(1, "Nome é obrigatório").max(100),
  description: z.string().optional(),
  frequency:   z.enum(["DAILY","WEEKLY","MONTHLY","QUARTERLY","SEMI_ANNUALLY","ANNUALLY"]),
  serviceType: z.enum(["CLEANING","ELECTRICAL","HYDRAULIC","OTHER"]),
  priority:    z.enum(["LOW","MEDIUM","HIGH","URGENT"]).optional().default("MEDIUM"),
  nextRunAt:   z.string().min(1, "Data da próxima execução é obrigatória"),
});

export const UpdateMaintenancePlanSchema = z.object({
  assetId:     z.string().optional(),
  spaceId:     z.string().optional(),
  providerId:  z.string().optional(),
  name:        z.string().min(1).max(100).optional(),
  description: z.string().optional(),
  frequency:   z.enum(["DAILY","WEEKLY","MONTHLY","QUARTERLY","SEMI_ANNUALLY","ANNUALLY"]).optional(),
  serviceType: z.enum(["CLEANING","ELECTRICAL","HYDRAULIC","OTHER"]).optional(),
  priority:    z.enum(["LOW","MEDIUM","HIGH","URGENT"]).optional(),
  nextRunAt:   z.string().optional(),
  isActive:    z.boolean().optional(),
  // array de strings: substitui todos os itens do checklist
  checklists:  z.array(z.string().min(1)).optional(),
});

export type CreateMaintenancePlanInput = z.infer<typeof CreateMaintenancePlanSchema>;
export type UpdateMaintenancePlanInput = z.infer<typeof UpdateMaintenancePlanSchema>;
