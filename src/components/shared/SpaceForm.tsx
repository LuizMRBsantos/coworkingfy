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
import type { SpaceType, SpaceStatus } from "@prisma/client";

const schema = z.object({
  name:        z.string().min(1, "Nome é obrigatório"),
  description: z.string().optional(),
  capacity:    z.number().int().min(1, "Capacidade deve ser ao menos 1"),
  type:        z.enum(["MEETING_ROOM", "PRIVATE_OFFICE", "WORKSTATION"] as const),
  status:      z.enum(["ACTIVE", "MAINTENANCE", "INACTIVE"] as const),
  unitId:      z.string().min(1, "Unidade é obrigatória"),
});

type FormData = z.infer<typeof schema>;

const TYPE_OPTIONS: { value: SpaceType; label: string }[] = [
  { value: "MEETING_ROOM",   label: "Sala de Reunião" },
  { value: "PRIVATE_OFFICE", label: "Sala Privativa" },
  { value: "WORKSTATION",    label: "Estação de Trabalho" },
];

const STATUS_OPTIONS: { value: SpaceStatus; label: string }[] = [
  { value: "ACTIVE",      label: "Ativo" },
  { value: "MAINTENANCE", label: "Em Manutenção" },
  { value: "INACTIVE",    label: "Inativo" },
];

interface SpaceFormDefaultValues {
  name?:        string;
  description?: string;
  capacity?:    number;
  type?:        SpaceType;
  status?:      SpaceStatus;
  unitId?:      string;
}

interface SpaceFormProps {
  units:          { id: string; name: string }[];
  spaceId?:       string;
  defaultValues?: SpaceFormDefaultValues;
  backHref:       string;
}

export function SpaceForm({ units, spaceId, defaultValues, backHref }: SpaceFormProps) {
  const router = useRouter();
  const [apiError, setApiError] = useState<string | null>(null);
  const isEditMode = !!spaceId;

  const {
    register,
    handleSubmit,
    control,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      name:        defaultValues?.name        ?? "",
      description: defaultValues?.description ?? "",
      capacity:    defaultValues?.capacity    ?? 1,
      type:        defaultValues?.type,
      status:      defaultValues?.status      ?? "ACTIVE",
      unitId:      defaultValues?.unitId      ?? "",
    },
  });

  async function onSubmit(data: FormData) {
    setApiError(null);

    const res = await fetch(isEditMode ? `/api/spaces/${spaceId}` : "/api/spaces", {
      method:  isEditMode ? "PUT" : "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify(data),
    });

    if (!res.ok) {
      const json = await res.json().catch(() => ({}));
      setApiError((json as { error?: string }).error ?? "Erro ao salvar espaço. Tente novamente.");
      return;
    }

    router.push(backHref);
  }

  return (
    <Card>
      <CardContent className="pt-6">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
          {/* Nome */}
          <div className="space-y-1">
            <Label htmlFor="name">Nome</Label>
            <Input id="name" placeholder="Ex: Sala de Reunião A" {...register("name")} />
            {errors.name && <p className="text-sm text-red-500">{errors.name.message}</p>}
          </div>

          {/* Descrição */}
          <div className="space-y-1">
            <Label htmlFor="description">Descrição <span className="text-gray-400">(opcional)</span></Label>
            <Textarea id="description" placeholder="Detalhes do espaço..." rows={2} {...register("description")} />
          </div>

          {/* Capacidade */}
          <div className="space-y-1">
            <Label htmlFor="capacity">Capacidade (pessoas)</Label>
            <Input id="capacity" type="number" min={1} {...register("capacity", { valueAsNumber: true })} />
            {errors.capacity && <p className="text-sm text-red-500">{errors.capacity.message}</p>}
          </div>

          {/* Tipo */}
          <div className="space-y-1">
            <Label htmlFor="type">Tipo</Label>
            <Controller
              name="type"
              control={control}
              render={({ field }) => (
                <Select value={field.value ?? ""} onValueChange={field.onChange} disabled={isEditMode}>
                  <SelectTrigger id="type" className="w-full">
                    <SelectValue placeholder="Selecione o tipo" />
                  </SelectTrigger>
                  <SelectContent alignItemWithTrigger={false}>
                    {TYPE_OPTIONS.map((o) => (
                      <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
            {errors.type && <p className="text-sm text-red-500">{errors.type.message}</p>}
            {isEditMode && <p className="text-xs text-gray-400">O tipo não pode ser alterado após a criação.</p>}
          </div>

          {/* Status — só em edição */}
          {isEditMode && (
            <div className="space-y-1">
              <Label htmlFor="status">Status</Label>
              <Controller
                name="status"
                control={control}
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger id="status" className="w-full">
                      <SelectValue placeholder="Selecione o status" />
                    </SelectTrigger>
                    <SelectContent alignItemWithTrigger={false}>
                      {STATUS_OPTIONS.map((o) => (
                        <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
          )}

          {/* Unidade — só em criação */}
          {!isEditMode && (
            <div className="space-y-1">
              <Label htmlFor="unitId">Unidade</Label>
              <Controller
                name="unitId"
                control={control}
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger id="unitId" className="w-full">
                      <SelectValue placeholder="Selecione a unidade" />
                    </SelectTrigger>
                    <SelectContent alignItemWithTrigger={false}>
                      {units.map((u) => (
                        <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
              {errors.unitId && <p className="text-sm text-red-500">{errors.unitId.message}</p>}
            </div>
          )}

          {apiError && <p className="text-sm text-red-500">{apiError}</p>}

          <div className="flex gap-3 pt-1">
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting
                ? isEditMode ? "Salvando..." : "Criando..."
                : isEditMode ? "Salvar alterações" : "Criar Espaço"
              }
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
