// 'use client' — formulário interativo com react-hook-form + submit para API
"use client";

import { useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem,
} from "@/components/ui/select";
import { ASSET_TYPE_LABEL, ASSET_STATUS_LABEL } from "@/components/shared/AssetCard";
import type { AssetStatus, AssetType, SpaceType } from "@prisma/client";

const schema = z.object({
  unitId:            z.string().min(1, "Unidade é obrigatória"),
  spaceId:           z.string().optional(),
  code:              z.string().min(1, "Etiqueta é obrigatória").max(20),
  name:              z.string().min(1, "Nome é obrigatório").max(100),
  description:       z.string().optional(),
  type:              z.enum([
    "AC","ELECTRONIC","HYDRAULIC","CLEANING",
    "HVAC","FIRE_SAFETY","ELECTRICAL","PLUMBING","ELEVATOR","APPLIANCE","IT_INFRA","FURNITURE","OTHER",
  ] as const),
  brand:             z.string().optional(),
  assetModel:        z.string().optional(),
  serialNumber:      z.string().optional(),
  purchasedAt:       z.string().optional(),
  warrantyExpiresAt: z.string().optional(),
  notes:             z.string().optional(),
  status:            z.enum(["ACTIVE","INACTIVE","MAINTENANCE","UNDER_MAINTENANCE","DECOMMISSIONED"] as const).optional(),
});

type FormData = z.infer<typeof schema>;

interface AssetFormProps {
  assetId?:       string;
  defaultValues?: Partial<FormData>;
  units:          { id: string; name: string }[];
  spaces:         { id: string; name: string; unitId: string; type: SpaceType }[];
  backHref:       string;
}

const ASSET_TYPES = Object.entries(ASSET_TYPE_LABEL) as [AssetType, string][];
const ASSET_STATUSES: [AssetStatus, string][] = [
  ["ACTIVE",            "Ativo"],
  ["INACTIVE",          "Inativo"],
  ["UNDER_MAINTENANCE", "Em manutenção"],
  ["DECOMMISSIONED",    "Baixado"],
];

export function AssetForm({ assetId, defaultValues, units, spaces, backHref }: AssetFormProps) {
  const router     = useRouter();
  const isEditMode = !!assetId;
  const [selectedUnitId, setSelectedUnitId] = useState<string>(defaultValues?.unitId ?? "");

  const {
    register, handleSubmit, control, watch,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: defaultValues ?? {},
  });

  const watchedUnit = watch("unitId");
  const activeUnit  = watchedUnit || selectedUnitId;
  const unitSpaces  = spaces.filter((s) => s.unitId === activeUnit);

  async function onSubmit(data: FormData) {
    const payload = {
      ...data,
      purchasedAt:       data.purchasedAt       ? new Date(data.purchasedAt).toISOString()       : undefined,
      warrantyExpiresAt: data.warrantyExpiresAt ? new Date(data.warrantyExpiresAt).toISOString() : undefined,
      spaceId:           data.spaceId || undefined,
    };

    const res = await fetch(isEditMode ? `/api/assets/${assetId}` : "/api/assets", {
      method:  isEditMode ? "PUT" : "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify(payload),
    });

    if (!res.ok) {
      const json = await res.json().catch(() => ({}));
      toast.error((json as { error?: string }).error ?? "Erro ao salvar ativo.");
      return;
    }

    toast.success(isEditMode ? "Ativo atualizado." : "Ativo criado.");
    router.push(backHref);
    router.refresh();
  }

  return (
    <Card>
      <CardContent className="pt-6">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            {/* Unidade */}
            <div className="space-y-1">
              <Label htmlFor="unitId">Unidade</Label>
              <Controller
                name="unitId"
                control={control}
                render={({ field }) => (
                  <Select
                    value={field.value ?? ""}
                    onValueChange={(v) => { field.onChange(v ?? ""); setSelectedUnitId(v ?? ""); }}
                    disabled={isEditMode}
                  >
                    <SelectTrigger id="unitId" className={isEditMode ? "bg-gray-50 text-gray-500" : ""}>
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
              {isEditMode && <p className="text-xs text-gray-400">A unidade não pode ser alterada após a criação.</p>}
              {errors.unitId && <p className="text-sm text-red-500">{errors.unitId.message}</p>}
            </div>

            {/* Espaço */}
            <div className="space-y-1">
              <Label htmlFor="spaceId">
                Espaço <span className="text-gray-400 font-normal">(opcional)</span>
              </Label>
              <Controller
                name="spaceId"
                control={control}
                render={({ field }) => (
                  <Select value={field.value ?? ""} onValueChange={field.onChange}>
                    <SelectTrigger id="spaceId">
                      <SelectValue placeholder="Selecione o espaço" />
                    </SelectTrigger>
                    <SelectContent alignItemWithTrigger={false}>
                      {unitSpaces.length === 0
                        ? <SelectItem value="_none" disabled>Selecione a unidade primeiro</SelectItem>
                        : unitSpaces.map((s) => (
                            <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                          ))
                      }
                    </SelectContent>
                  </Select>
                )}
              />
            </div>

            {/* Etiqueta */}
            <div className="space-y-1">
              <Label htmlFor="code">Etiqueta <span className="text-xs text-gray-400">(ex: AC-001)</span></Label>
              <Input id="code" placeholder="AC-001" disabled={isEditMode} {...register("code")} className={isEditMode ? "bg-gray-50 text-gray-500" : ""} />
              {isEditMode && <p className="text-xs text-gray-400">A etiqueta não pode ser alterada.</p>}
              {errors.code && <p className="text-sm text-red-500">{errors.code.message}</p>}
            </div>

            {/* Tipo */}
            <div className="space-y-1">
              <Label htmlFor="type">Categoria</Label>
              <Controller
                name="type"
                control={control}
                render={({ field }) => (
                  <Select value={field.value ?? ""} onValueChange={field.onChange} disabled={isEditMode}>
                    <SelectTrigger id="type" className={isEditMode ? "bg-gray-50 text-gray-500" : ""}>
                      <SelectValue placeholder="Selecione a categoria" />
                    </SelectTrigger>
                    <SelectContent alignItemWithTrigger={false}>
                      {ASSET_TYPES.map(([v, l]) => (
                        <SelectItem key={v} value={v}>{l}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
              {isEditMode && <p className="text-xs text-gray-400">A categoria não pode ser alterada.</p>}
              {errors.type && <p className="text-sm text-red-500">{errors.type.message}</p>}
            </div>
          </div>

          {/* Nome */}
          <div className="space-y-1">
            <Label htmlFor="name">Nome / Descrição curta</Label>
            <Input id="name" placeholder="Ex: Ar-condicionado Split 12.000 BTUs" {...register("name")} />
            {errors.name && <p className="text-sm text-red-500">{errors.name.message}</p>}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            {/* Marca */}
            <div className="space-y-1">
              <Label htmlFor="brand">Fabricante <span className="text-gray-400 font-normal">(opcional)</span></Label>
              <Input id="brand" placeholder="Ex: Midea" {...register("brand")} />
            </div>

            {/* Modelo */}
            <div className="space-y-1">
              <Label htmlFor="assetModel">Modelo <span className="text-gray-400 font-normal">(opcional)</span></Label>
              <Input id="assetModel" placeholder="Ex: MSV-12CR" {...register("assetModel")} />
            </div>

            {/* Nº de série */}
            <div className="space-y-1">
              <Label htmlFor="serialNumber">Nº de série <span className="text-gray-400 font-normal">(opcional)</span></Label>
              <Input id="serialNumber" placeholder="SN-XXXX" {...register("serialNumber")} />
            </div>

            {/* Status (só em edição) */}
            {isEditMode && (
              <div className="space-y-1">
                <Label htmlFor="status">Status</Label>
                <Controller
                  name="status"
                  control={control}
                  render={({ field }) => (
                    <Select value={field.value ?? ""} onValueChange={field.onChange}>
                      <SelectTrigger id="status"><SelectValue placeholder="Selecione o status" /></SelectTrigger>
                      <SelectContent alignItemWithTrigger={false}>
                        {ASSET_STATUSES.map(([v, l]) => (
                          <SelectItem key={v} value={v}>{l}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
              </div>
            )}

            {/* Data de compra */}
            <div className="space-y-1">
              <Label htmlFor="purchasedAt">Data de compra <span className="text-gray-400 font-normal">(opcional)</span></Label>
              <Input id="purchasedAt" type="date" {...register("purchasedAt")} />
            </div>

            {/* Vencimento garantia */}
            <div className="space-y-1">
              <Label htmlFor="warrantyExpiresAt">Vencimento da garantia <span className="text-gray-400 font-normal">(opcional)</span></Label>
              <Input id="warrantyExpiresAt" type="date" {...register("warrantyExpiresAt")} />
            </div>
          </div>

          {/* Descrição */}
          <div className="space-y-1">
            <Label htmlFor="description">Descrição <span className="text-gray-400 font-normal">(opcional)</span></Label>
            <Textarea id="description" rows={2} placeholder="Detalhes adicionais sobre o equipamento..." {...register("description")} />
          </div>

          {/* Notas internas */}
          <div className="space-y-1">
            <Label htmlFor="notes">Notas internas <span className="text-gray-400 font-normal">(opcional)</span></Label>
            <Textarea id="notes" rows={2} placeholder="Localização exata, observações de manutenção..." {...register("notes")} />
          </div>

          <div className="flex gap-3 pt-1">
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Salvando..." : isEditMode ? "Salvar alterações" : "Cadastrar ativo"}
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
