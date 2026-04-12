import { z } from "zod";
import { ServiceType, ProviderType } from "@prisma/client";

export const CreateProviderSchema = z.object({
  unitId:    z.string().min(1),
  name:      z.string().min(1, "Nome é obrigatório"),
  specialty: z.nativeEnum(ServiceType),
  type:      z.nativeEnum(ProviderType),
  phone:     z.string().optional(),
  email:     z.string().email("Email inválido").optional().or(z.literal("")),
});

export type CreateProviderInput = z.infer<typeof CreateProviderSchema>;
