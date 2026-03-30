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
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import type { ServiceType, SpaceType } from "@prisma/client";

const schema = z.object({
  serviceType:   z.enum(["CLEANING", "ELECTRICAL", "HYDRAULIC", "OTHER"] as const),
  description:   z.string().min(10, "Descrição deve ter pelo menos 10 caracteres"),
  providerId:    z.string().optional(),
  spaceId:       z.string().optional(),
  scheduledDate: z.string().optional(),
  value:         z.coerce.number().positive("Valor deve ser positivo").optional(),
});

type FormData = z.infer<typeof schema>;

interface TicketServiceOrderFormProps {
  ticketId:     string;
  ticketNumber: string;
  unitId:       string;
  providers:    { id: string; name: string; specialty: ServiceType }[];
  spaces:       { id: string; name: string; type: SpaceType }[];
  isCoworking:  boolean;
}

const SERVICE_TYPE_OPTIONS = [
  { value: "CLEANING",   label: "Limpeza" },
  { value: "ELECTRICAL", label: "Elétrica" },
  { value: "HYDRAULIC",  label: "Hidráulica" },
  { value: "OTHER",      label: "Outro" },
];

const SPACE_TYPE_LABEL: Record<SpaceType, string> = {
  MEETING_ROOM:   "Sala de Reunião",
  PRIVATE_OFFICE: "Sala Privativa",
  WORKSTATION:    "Estação de Trabalho",
};

export function TicketServiceOrderForm({
  ticketId,
  unitId,
  providers,
  spaces,
  isCoworking,
}: TicketServiceOrderFormProps) {
  const router = useRouter();
  const [apiError, setApiError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    control,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  async function onSubmit(data: FormData) {
    setApiError(null);

    const body = {
      ticketId,
      unitId,
      serviceType:   data.serviceType,
      description:   data.description,
      providerId:    data.providerId || undefined,
      spaceId:       data.spaceId || undefined,
      scheduledDate: data.scheduledDate
        ? new Date(data.scheduledDate).toISOString()
        : undefined,
      value: data.value,
    };

    const res = await fetch("/api/service-orders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const json = await res.json().catch(() => ({}));
      setApiError(json.error ?? "Erro ao criar OS. Tente novamente.");
      return;
    }

    router.push(`/dashboard/admin/tickets/${ticketId}`);
  }

  return (
    <Card>
      <CardContent className="pt-6">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
          {/* Tipo de serviço */}
          <div className="space-y-1">
            <Label htmlFor="serviceType">Tipo de serviço</Label>
            <Controller
              name="serviceType"
              control={control}
              render={({ field }) => (
                <Select value={field.value ?? ""} onValueChange={field.onChange}>
                  <SelectTrigger id="serviceType" className="w-full">
                    <SelectValue placeholder="Selecione o tipo" />
                  </SelectTrigger>
                  <SelectContent alignItemWithTrigger={false}>
                    {SERVICE_TYPE_OPTIONS.map((t) => (
                      <SelectItem key={t.value} value={t.value}>
                        {t.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
            {errors.serviceType && (
              <p className="text-sm text-red-500">{errors.serviceType.message}</p>
            )}
          </div>

          {/* Descrição */}
          <div className="space-y-1">
            <Label htmlFor="description">Descrição</Label>
            <Textarea
              id="description"
              placeholder="Descreva o serviço a ser executado..."
              rows={4}
              {...register("description")}
            />
            {errors.description && (
              <p className="text-sm text-red-500">{errors.description.message}</p>
            )}
          </div>

          {/* Prestador */}
          <div className="space-y-1">
            <Label htmlFor="providerId">
              Prestador{" "}
              <span className="text-gray-400 font-normal">(opcional)</span>
            </Label>
            <Controller
              name="providerId"
              control={control}
              render={({ field }) => (
                <Select value={field.value ?? ""} onValueChange={field.onChange}>
                  <SelectTrigger id="providerId" className="w-full">
                    <SelectValue placeholder="Selecione um prestador" />
                  </SelectTrigger>
                  <SelectContent className="min-w-70" alignItemWithTrigger={false}>
                    {providers.length === 0 ? (
                      <SelectItem value="_none" disabled>
                        Nenhum prestador ativo nesta unidade
                      </SelectItem>
                    ) : (
                      providers.map((p) => (
                        <SelectItem key={p.id} value={p.id}>
                          {p.name}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              )}
            />
          </div>

          {/* Espaço afetado — só para coworking */}
          {isCoworking && (
            <div className="space-y-1">
              <Label htmlFor="spaceId">
                Espaço afetado{" "}
                <span className="text-gray-400 font-normal">(opcional)</span>
              </Label>
              <Controller
                name="spaceId"
                control={control}
                render={({ field }) => (
                  <Select value={field.value ?? ""} onValueChange={field.onChange}>
                    <SelectTrigger id="spaceId" className="w-full">
                      <SelectValue placeholder="Selecione o espaço" />
                    </SelectTrigger>
                    <SelectContent className="min-w-70" alignItemWithTrigger={false}>
                      {spaces.map((s) => (
                        <SelectItem key={s.id} value={s.id}>
                          {s.name}{" "}
                          <span className="text-gray-400">
                            — {SPACE_TYPE_LABEL[s.type]}
                          </span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
          )}

          {/* Data agendada */}
          <div className="space-y-1">
            <Label htmlFor="scheduledDate">
              Data agendada{" "}
              <span className="text-gray-400 font-normal">(opcional)</span>
            </Label>
            <Input
              id="scheduledDate"
              type="date"
              {...register("scheduledDate")}
            />
          </div>

          {/* Valor estimado */}
          <div className="space-y-1">
            <Label htmlFor="value">
              Valor estimado (R$){" "}
              <span className="text-gray-400 font-normal">(opcional)</span>
            </Label>
            <Input
              id="value"
              type="number"
              min="0"
              step="0.01"
              placeholder="0,00"
              {...register("value")}
            />
            {errors.value && (
              <p className="text-sm text-red-500">{errors.value.message}</p>
            )}
          </div>

          {apiError && <p className="text-sm text-red-500">{apiError}</p>}

          <div className="flex gap-3 pt-1">
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Criando..." : "Criar OS"}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => router.push(`/dashboard/admin/tickets/${ticketId}`)}
            >
              Cancelar
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
