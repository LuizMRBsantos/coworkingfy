import { z } from "zod";

export const CreateTicketSchema = z.object({
  unitId:           z.string().min(1),
  externalTicketId: z.string().optional(),
  description:      z.string().min(10, "Descrição deve ter pelo menos 10 caracteres"),
  priority:         z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]),
});

export type CreateTicketInput = z.infer<typeof CreateTicketSchema>;
