import { z } from "zod";
import { Role } from "@prisma/client";

export const CreateUserSchema = z.object({
  name:     z.string().min(1, "Nome é obrigatório"),
  email:    z.string().email("Email inválido"),
  password: z.string().min(6, "Senha deve ter pelo menos 6 caracteres"),
  role:     z.nativeEnum(Role),
  unitIds:  z.array(z.string()).default([]),
});

export type CreateUserInput = z.infer<typeof CreateUserSchema>;
