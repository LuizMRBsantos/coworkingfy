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

const schema = z.object({
  unitId:           z.string().min(1, "Unidade é obrigatória"),
  externalTicketId: z.string().optional(),
  description:      z.string().min(10, "Descrição deve ter pelo menos 10 caracteres"),
  priority:         z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"] as const),
});

type FormData = z.infer<typeof schema>;

interface TicketFormProps {
  units: { id: string; name: string }[];
}

const PRIORITY_OPTIONS = [
  { value: "LOW",    label: "Baixa" },
  { value: "MEDIUM", label: "Média" },
  { value: "HIGH",   label: "Alta" },
  { value: "URGENT", label: "Urgente" },
];

export function TicketForm({ units }: TicketFormProps) {
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
    const res = await fetch("/api/tickets", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });

    if (!res.ok) {
      const json = await res.json().catch(() => ({}));
      setApiError(json.error ?? "Erro ao criar ticket. Tente novamente.");
      return;
    }

    router.push("/dashboard/admin/tickets");
  }

  return (
    <Card>
      <CardContent className="pt-6">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
          {/* Unidade */}
          <div className="space-y-1">
            <Label htmlFor="unitId">Unidade</Label>
            <Controller
              name="unitId"
              control={control}
              render={({ field }) => (
                <Select value={field.value ?? ""} onValueChange={field.onChange}>
                  <SelectTrigger id="unitId">
                    <SelectValue placeholder="Selecione a unidade" />
                  </SelectTrigger>
                  <SelectContent alignItemWithTrigger={false}>
                    {units.map((u) => (
                      <SelectItem key={u.id} value={u.id}>
                        {u.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
            {errors.unitId && (
              <p className="text-sm text-red-500">{errors.unitId.message}</p>
            )}
          </div>

          {/* Número externo */}
          <div className="space-y-1">
            <Label htmlFor="externalTicketId">
              Nº do chamado externo{" "}
              <span className="text-gray-400 font-normal">(opcional)</span>
            </Label>
            <Input
              id="externalTicketId"
              placeholder="ex: TICK-2026-0847"
              {...register("externalTicketId")}
            />
          </div>

          {/* Descrição */}
          <div className="space-y-1">
            <Label htmlFor="description">Descrição do problema</Label>
            <Textarea
              id="description"
              placeholder="Descreva o problema relatado pelo cliente..."
              rows={4}
              {...register("description")}
            />
            {errors.description && (
              <p className="text-sm text-red-500">{errors.description.message}</p>
            )}
          </div>

          {/* Prioridade */}
          <div className="space-y-1">
            <Label htmlFor="priority">Prioridade</Label>
            <Controller
              name="priority"
              control={control}
              render={({ field }) => (
                <Select value={field.value ?? ""} onValueChange={field.onChange}>
                  <SelectTrigger id="priority">
                    <SelectValue placeholder="Selecione a prioridade" />
                  </SelectTrigger>
                  <SelectContent alignItemWithTrigger={false}>
                    {PRIORITY_OPTIONS.map((p) => (
                      <SelectItem key={p.value} value={p.value}>
                        {p.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
            {errors.priority && (
              <p className="text-sm text-red-500">{errors.priority.message}</p>
            )}
          </div>

          {apiError && <p className="text-sm text-red-500">{apiError}</p>}

          <div className="flex gap-3 pt-1">
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Criando..." : "Criar Ticket"}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => router.push("/dashboard/admin/tickets")}
            >
              Cancelar
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
