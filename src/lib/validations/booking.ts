import { z } from "zod";

export const CreateBookingSchema = z.object({
  spaceId:   z.string().min(1, "Espaço obrigatório"),
  startTime: z.string().min(1, "Horário de início obrigatório"),
  endTime:   z.string().min(1, "Horário de término obrigatório"),
});

export const UpdateBookingSchema = z.object({
  action: z.enum(["approve", "reject", "cancel"]),
});

export type CreateBookingInput = z.infer<typeof CreateBookingSchema>;
export type UpdateBookingInput = z.infer<typeof UpdateBookingSchema>;
