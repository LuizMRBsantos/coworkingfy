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
import type { UnitType } from "@prisma/client";

const schema = z.object({
  name:         z.string().min(1, "Nome é obrigatório").max(100),
  type:         z.enum(["COWORKING", "BTS"] as const),
  address:      z.string().optional(),
  clientName:   z.string().optional(),
  clientContact: z.string().optional(),
});

type FormData = z.infer<typeof schema>;

const TYPE_OPTIONS: { value: UnitType; label: string }[] = [
  { value: "COWORKING", label: "Coworking" },
  { value: "BTS",       label: "BTS" },
];

interface UnitFormProps {
  unitId?:              string;
  defaultName?:         string;
  defaultType?:         UnitType;
  defaultAddress?:      string;
  defaultClientName?:   string;
  defaultClientContact?: string;
  backHref:             string;
}

export function UnitForm({
  unitId, defaultName, defaultType,
  defaultAddress, defaultClientName, defaultClientContact, backHref,
}: UnitFormProps) {
  const router     = useRouter();
  const [apiError, setApiError] = useState<string | null>(null);
  const isEditMode = !!unitId;

  const {
    register,
    handleSubmit,
    control,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      name:          defaultName ?? "",
      type:          defaultType ?? "BTS",
      address:       defaultAddress ?? "",
      clientName:    defaultClientName ?? "",
      clientContact: defaultClientContact ?? "",
    },
  });

  async function onSubmit(data: FormData) {
    setApiError(null);

    // In edit mode, type is immutable — send everything else
    const payload = isEditMode
      ? { name: data.name, address: data.address, clientName: data.clientName, clientContact: data.clientContact }
      : data;

    const res = await fetch(isEditMode ? `/api/units/${unitId}` : "/api/units", {
      method:  isEditMode ? "PUT" : "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify(payload),
    });

    if (!res.ok) {
      const json = await res.json().catch(() => ({}));
      setApiError((json as { error?: string }).error ?? "Erro ao salvar unidade. Tente novamente.");
      return;
    }

    router.push(backHref);
    router.refresh();
  }

  return (
    <Card>
      <CardContent className="pt-6">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
          {/* Nome */}
          <div className="space-y-1">
            <Label htmlFor="name">Nome</Label>
            <Input id="name" placeholder="Ex: Coworking Centro" {...register("name")} />
            {errors.name && <p className="text-sm text-red-500">{errors.name.message}</p>}
          </div>

          {/* Tipo */}
          <div className="space-y-1">
            <Label htmlFor="type">Tipo</Label>
            {isEditMode ? (
              <>
                <Input
                  id="type"
                  value={defaultType === "COWORKING" ? "Coworking" : "BTS"}
                  disabled
                  className="bg-gray-50 text-gray-500"
                />
                <p className="text-xs text-gray-400">O tipo não pode ser alterado após a criação.</p>
              </>
            ) : (
              <Controller
                name="type"
                control={control}
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
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
            )}
            {!isEditMode && errors.type && <p className="text-sm text-red-500">{errors.type.message}</p>}
          </div>

          {/* Endereço */}
          <div className="space-y-1">
            <Label htmlFor="address">
              Endereço <span className="text-gray-400 font-normal">(opcional)</span>
            </Label>
            <Input id="address" placeholder="Ex: Av. Paulista, 1000 – São Paulo" {...register("address")} />
          </div>

          {/* Nome do cliente */}
          <div className="space-y-1">
            <Label htmlFor="clientName">
              Nome do cliente <span className="text-gray-400 font-normal">(opcional)</span>
            </Label>
            <Input id="clientName" placeholder="Ex: Empresa XYZ" {...register("clientName")} />
          </div>

          {/* Contato do cliente */}
          <div className="space-y-1">
            <Label htmlFor="clientContact">
              Contato do cliente <span className="text-gray-400 font-normal">(opcional)</span>
            </Label>
            <Input id="clientContact" placeholder="E-mail ou telefone" {...register("clientContact")} />
          </div>

          {apiError && <p className="text-sm text-red-500">{apiError}</p>}

          <div className="flex gap-3 pt-1">
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting
                ? isEditMode ? "Salvando..." : "Criando..."
                : isEditMode ? "Salvar alterações" : "Criar Unidade"
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
