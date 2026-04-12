import { z } from "zod";
import { UnitType } from "@prisma/client";

export const CreateUnitSchema = z.object({
  name:          z.string().min(1, "Nome é obrigatório").max(100),
  type:          z.nativeEnum(UnitType),
  address:       z.string().optional(),
  clientName:    z.string().optional(),
  clientContact: z.string().optional(),
});

export const UpdateUnitSchema = z.object({
  name:          z.string().min(1, "Nome é obrigatório").max(100),
  address:       z.string().optional(),
  clientName:    z.string().optional(),
  clientContact: z.string().optional(),
});

export type CreateUnitInput = z.infer<typeof CreateUnitSchema>;
export type UpdateUnitInput = z.infer<typeof UpdateUnitSchema>;
