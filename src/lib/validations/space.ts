import { z } from "zod";
import { SpaceType, SpaceStatus } from "@prisma/client";

export const CreateSpaceSchema = z.object({
  unitId:      z.string().min(1),
  name:        z.string().min(1, "Nome é obrigatório"),
  description: z.string().optional(),
  capacity:    z.number().int().min(1, "Capacidade deve ser ao menos 1"),
  type:        z.nativeEnum(SpaceType),
  status:      z.nativeEnum(SpaceStatus).optional(),
});

export type CreateSpaceInput = z.infer<typeof CreateSpaceSchema>;
