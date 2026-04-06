// 'use client' — formulário interativo com react-hook-form + submit para API
"use client";

import { useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import type { SpaceType } from "@prisma/client";

const TYPE_LABEL: Record<SpaceType, string> = {
  MEETING_ROOM:   "Sala de Reunião",
  PRIVATE_OFFICE: "Sala Privativa",
  WORKSTATION:    "Estação de Trabalho",
};

const schema = z.object({
  spaceId:   z.string().min(1, "Selecione um espaço"),
  date:      z.string().min(1, "Data obrigatória"),
  startTime: z.string().min(1, "Horário de início obrigatório"),
  endTime:   z.string().min(1, "Horário de término obrigatório"),
});

type FormData = z.infer<typeof schema>;

interface SpaceOption {
  id:       string;
  name:     string;
  type:     SpaceType;
  capacity: number;
}

interface BookingFormProps {
  spaces:   SpaceOption[];
  backHref: string;
}

// Data mínima = hoje
function todayString() {
  return new Date().toISOString().split("T")[0];
}

export function BookingForm({ spaces, backHref }: BookingFormProps) {
  const router   = useRouter();
  const [apiError, setApiError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    control,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { spaceId: "", date: "", startTime: "", endTime: "" },
  });

  const selectedSpaceId = watch("spaceId");
  const selectedSpace   = spaces.find((s) => s.id === selectedSpaceId);

  async function onSubmit(data: FormData) {
    setApiError(null);

    // Combinar data + hora em ISO string (sem timezone, assume local)
    const startTime = `${data.date}T${data.startTime}:00`;
    const endTime   = `${data.date}T${data.endTime}:00`;

    const res = await fetch("/api/bookings", {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ spaceId: data.spaceId, startTime, endTime }),
    });

    if (!res.ok) {
      const json = await res.json().catch(() => ({}));
      setApiError((json as { error?: string }).error ?? "Erro ao criar reserva. Tente novamente.");
      return;
    }

    router.push(backHref);
    router.refresh();
  }

  return (
    <Card>
      <CardContent className="pt-6">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
          {/* Espaço */}
          <div className="space-y-1">
            <Label htmlFor="spaceId">Espaço</Label>
            <Controller
              name="spaceId"
              control={control}
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger id="spaceId" className="w-full">
                    <SelectValue placeholder="Selecione um espaço" />
                  </SelectTrigger>
                  <SelectContent alignItemWithTrigger={false}>
                    {spaces.map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.name} — {TYPE_LABEL[s.type]} ({s.capacity} {s.capacity === 1 ? "pessoa" : "pessoas"})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
            {errors.spaceId && <p className="text-sm text-red-500">{errors.spaceId.message}</p>}
            {selectedSpace && (
              <p className="text-xs text-gray-400">
                {TYPE_LABEL[selectedSpace.type]} · capacidade: {selectedSpace.capacity} {selectedSpace.capacity === 1 ? "pessoa" : "pessoas"}
              </p>
            )}
          </div>

          {/* Data */}
          <div className="space-y-1">
            <Label htmlFor="date">Data</Label>
            <Input id="date" type="date" min={todayString()} {...register("date")} />
            {errors.date && <p className="text-sm text-red-500">{errors.date.message}</p>}
          </div>

          {/* Horários */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label htmlFor="startTime">Início</Label>
              <Input id="startTime" type="time" min="07:00" max="22:00" step={1800} {...register("startTime")} />
              {errors.startTime && <p className="text-sm text-red-500">{errors.startTime.message}</p>}
            </div>
            <div className="space-y-1">
              <Label htmlFor="endTime">Término</Label>
              <Input id="endTime" type="time" min="07:00" max="22:00" step={1800} {...register("endTime")} />
              {errors.endTime && <p className="text-sm text-red-500">{errors.endTime.message}</p>}
            </div>
          </div>
          <p className="text-xs text-gray-400">Horário de funcionamento: 7h–22h. Duração mínima: 30 minutos.</p>

          {apiError && <p className="text-sm text-red-500">{apiError}</p>}

          <div className="flex gap-3 pt-1">
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Criando..." : "Confirmar Reserva"}
            </Button>
            <Button type="button" variant="outline" onClick={() => router.push(backHref)}>
              Cancelar
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
