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
import type { ServiceType, ProviderType, ProviderStatus } from "@prisma/client";

const schema = z.object({
  name:      z.string().min(1, "Nome é obrigatório"),
  specialty: z.enum(["CLEANING", "ELECTRICAL", "HYDRAULIC", "OTHER"] as const),
  type:      z.enum(["RECURRING", "PUNCTUAL"] as const),
  phone:     z.string().optional(),
  email:     z.string().email("Email inválido").optional().or(z.literal("")),
  status:    z.enum(["ACTIVE", "INACTIVE"] as const).optional(),
  unitId:    z.string().min(1, "Unidade é obrigatória"),
});

type FormData = z.infer<typeof schema>;

const SPECIALTY_OPTIONS: { value: ServiceType; label: string }[] = [
  { value: "CLEANING",   label: "Limpeza" },
  { value: "ELECTRICAL", label: "Elétrica" },
  { value: "HYDRAULIC",  label: "Hidráulica" },
  { value: "OTHER",      label: "Outros" },
];

const TYPE_OPTIONS: { value: ProviderType; label: string }[] = [
  { value: "RECURRING", label: "Recorrente (contrato fixo)" },
  { value: "PUNCTUAL",  label: "Pontual (avulso por OS)" },
];

const STATUS_OPTIONS: { value: ProviderStatus; label: string }[] = [
  { value: "ACTIVE",   label: "Ativo" },
  { value: "INACTIVE", label: "Inativo" },
];

interface ProviderFormDefaultValues {
  name?:      string;
  specialty?: ServiceType;
  type?:      ProviderType;
  phone?:     string;
  email?:     string;
  status?:    ProviderStatus;
  unitId?:    string;
}

interface ProviderFormProps {
  units:          { id: string; name: string }[];
  providerId?:    string;
  defaultValues?: ProviderFormDefaultValues;
  backHref:       string;
  /** Em modo reception, a unidade é pré-fixada e não pode ser alterada */
  fixedUnitId?:   string;
}

export function ProviderForm({ units, providerId, defaultValues, backHref, fixedUnitId }: ProviderFormProps) {
  const router = useRouter();
  const [apiError, setApiError] = useState<string | null>(null);
  const isEditMode = !!providerId;

  const {
    register,
    handleSubmit,
    control,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      name:      defaultValues?.name      ?? "",
      specialty: defaultValues?.specialty,
      type:      defaultValues?.type,
      phone:     defaultValues?.phone     ?? "",
      email:     defaultValues?.email     ?? "",
      status:    defaultValues?.status    ?? "ACTIVE",
      unitId:    fixedUnitId ?? defaultValues?.unitId ?? "",
    },
  });

  async function onSubmit(data: FormData) {
    setApiError(null);

    const res = await fetch(isEditMode ? `/api/providers/${providerId}` : "/api/providers", {
      method:  isEditMode ? "PUT" : "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify(data),
    });

    if (!res.ok) {
      const json = await res.json().catch(() => ({}));
      setApiError((json as { error?: string }).error ?? "Erro ao salvar prestador. Tente novamente.");
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
            <Input id="name" placeholder="Nome do prestador ou empresa" {...register("name")} />
            {errors.name && <p className="text-sm text-red-500">{errors.name.message}</p>}
          </div>

          {/* Especialidade */}
          <div className="space-y-1">
            <Label htmlFor="specialty">Especialidade</Label>
            <Controller
              name="specialty"
              control={control}
              render={({ field }) => (
                <Select value={field.value ?? ""} onValueChange={field.onChange}>
                  <SelectTrigger id="specialty" className="w-full">
                    <SelectValue placeholder="Selecione a especialidade" />
                  </SelectTrigger>
                  <SelectContent alignItemWithTrigger={false}>
                    {SPECIALTY_OPTIONS.map((o) => (
                      <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
            {errors.specialty && <p className="text-sm text-red-500">{errors.specialty.message}</p>}
          </div>

          {/* Tipo */}
          <div className="space-y-1">
            <Label htmlFor="type">Tipo de contratação</Label>
            <Controller
              name="type"
              control={control}
              render={({ field }) => (
                <Select value={field.value ?? ""} onValueChange={field.onChange}>
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
          </div>

          {/* Telefone */}
          <div className="space-y-1">
            <Label htmlFor="phone">Telefone <span className="text-gray-400">(opcional)</span></Label>
            <Input id="phone" placeholder="(67) 99999-9999" {...register("phone")} />
          </div>

          {/* Email */}
          <div className="space-y-1">
            <Label htmlFor="email">Email <span className="text-gray-400">(opcional)</span></Label>
            <Input id="email" type="email" placeholder="contato@empresa.com" {...register("email")} />
            {errors.email && <p className="text-sm text-red-500">{errors.email.message}</p>}
          </div>

          {/* Status — só em edição */}
          {isEditMode && (
            <div className="space-y-1">
              <Label htmlFor="status">Status</Label>
              <Controller
                name="status"
                control={control}
                render={({ field }) => (
                  <Select value={field.value ?? "ACTIVE"} onValueChange={field.onChange}>
                    <SelectTrigger id="status" className="w-full">
                      <SelectValue />
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

          {/* Unidade — oculta se fixedUnitId */}
          {!fixedUnitId && !isEditMode && (
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
                : isEditMode ? "Salvar alterações" : "Criar Prestador"
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
