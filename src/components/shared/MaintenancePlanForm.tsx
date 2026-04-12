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
import {
  PLAN_FREQUENCY_LABEL,
  PLAN_SERVICE_TYPE_LABEL,
  PLAN_PRIORITY_LABEL,
} from "@/components/shared/MaintenancePlanCard";
import type { PlanFrequency, Priority, ServiceType, SpaceType } from "@prisma/client";

const schema = z.object({
  unitId:      z.string().min(1, "Unidade é obrigatória"),
  assetId:     z.string().optional(),
  spaceId:     z.string().optional(),
  providerId:  z.string().optional(),
  name:        z.string().min(1, "Nome é obrigatório").max(100),
  description: z.string().optional(),
  frequency:   z.enum(["DAILY","WEEKLY","MONTHLY","QUARTERLY","SEMI_ANNUALLY","ANNUALLY"] as const),
  serviceType: z.enum(["CLEANING","ELECTRICAL","HYDRAULIC","OTHER"] as const),
  priority:    z.enum(["LOW","MEDIUM","HIGH","URGENT"] as const),
  nextRunAt:   z.string().min(1, "Data é obrigatória"),
  isActive:    z.boolean().optional(),
});

type FormData = z.infer<typeof schema>;

interface MaintenancePlanFormProps {
  planId?:       string;
  defaultValues?: Partial<FormData>;
  units:         { id: string; name: string }[];
  assets:        { id: string; name: string; code: string; unitId: string }[];
  spaces:        { id: string; name: string; unitId: string; type: SpaceType }[];
  providers?:    { id: string; name: string }[];
  backHref:      string;
}

const FREQUENCIES  = Object.entries(PLAN_FREQUENCY_LABEL)    as [PlanFrequency, string][];
const SERVICE_TYPES = Object.entries(PLAN_SERVICE_TYPE_LABEL) as [ServiceType, string][];
const PRIORITIES    = Object.entries(PLAN_PRIORITY_LABEL)     as [Priority, string][];

export function MaintenancePlanForm({
  planId, defaultValues, units, assets, spaces, providers = [], backHref,
}: MaintenancePlanFormProps) {
  const router     = useRouter();
  const isEditMode = !!planId;
  const [selectedUnitId, setSelectedUnitId] = useState<string>(defaultValues?.unitId ?? "");

  const {
    register, handleSubmit, control, watch,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      priority:  "MEDIUM",
      isActive:  true,
      ...defaultValues,
    },
  });

  const watchedUnit   = watch("unitId");
  const activeUnit    = watchedUnit || selectedUnitId;
  const unitAssets    = assets.filter((a) => a.unitId === activeUnit);
  const unitSpaces    = spaces.filter((s) => s.unitId === activeUnit);

  async function onSubmit(data: FormData) {
    const res = await fetch(
      isEditMode ? `/api/maintenance-plans/${planId}` : "/api/maintenance-plans",
      {
        method:  isEditMode ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({
          ...data,
          assetId:    data.assetId    || undefined,
          spaceId:    data.spaceId    || undefined,
          providerId: data.providerId || undefined,
        }),
      },
    );

    if (!res.ok) {
      const json = await res.json().catch(() => ({}));
      toast.error((json as { error?: string }).error ?? "Erro ao salvar plano.");
      return;
    }

    toast.success(isEditMode ? "Plano atualizado." : "Plano criado.");
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
              {isEditMode && <p className="text-xs text-gray-400">A unidade não pode ser alterada.</p>}
              {errors.unitId && <p className="text-sm text-red-500">{errors.unitId.message}</p>}
            </div>

            {/* Frequência */}
            <div className="space-y-1">
              <Label htmlFor="frequency">Frequência</Label>
              <Controller
                name="frequency"
                control={control}
                render={({ field }) => (
                  <Select value={field.value ?? ""} onValueChange={field.onChange}>
                    <SelectTrigger id="frequency"><SelectValue placeholder="Selecione" /></SelectTrigger>
                    <SelectContent alignItemWithTrigger={false}>
                      {FREQUENCIES.map(([v, l]) => (
                        <SelectItem key={v} value={v}>{l}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
              {errors.frequency && <p className="text-sm text-red-500">{errors.frequency.message}</p>}
            </div>

            {/* Tipo de serviço */}
            <div className="space-y-1">
              <Label htmlFor="serviceType">Tipo de serviço</Label>
              <Controller
                name="serviceType"
                control={control}
                render={({ field }) => (
                  <Select value={field.value ?? ""} onValueChange={field.onChange}>
                    <SelectTrigger id="serviceType"><SelectValue placeholder="Selecione" /></SelectTrigger>
                    <SelectContent alignItemWithTrigger={false}>
                      {SERVICE_TYPES.map(([v, l]) => (
                        <SelectItem key={v} value={v}>{l}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
              {errors.serviceType && <p className="text-sm text-red-500">{errors.serviceType.message}</p>}
            </div>

            {/* Prioridade */}
            <div className="space-y-1">
              <Label htmlFor="priority">Prioridade</Label>
              <Controller
                name="priority"
                control={control}
                render={({ field }) => (
                  <Select value={field.value ?? "MEDIUM"} onValueChange={field.onChange}>
                    <SelectTrigger id="priority"><SelectValue /></SelectTrigger>
                    <SelectContent alignItemWithTrigger={false}>
                      {PRIORITIES.map(([v, l]) => (
                        <SelectItem key={v} value={v}>{l}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>

            {/* Ativo vinculado */}
            <div className="space-y-1">
              <Label htmlFor="assetId">
                Ativo vinculado <span className="text-gray-400 font-normal">(opcional)</span>
              </Label>
              <Controller
                name="assetId"
                control={control}
                render={({ field }) => (
                  <Select value={field.value ?? ""} onValueChange={field.onChange}>
                    <SelectTrigger id="assetId"><SelectValue placeholder="Nenhum ativo" /></SelectTrigger>
                    <SelectContent alignItemWithTrigger={false}>
                      {unitAssets.length === 0
                        ? <SelectItem value="_none" disabled>Selecione a unidade primeiro</SelectItem>
                        : unitAssets.map((a) => (
                            <SelectItem key={a.id} value={a.id}>{a.code} — {a.name}</SelectItem>
                          ))
                      }
                    </SelectContent>
                  </Select>
                )}
              />
            </div>

            {/* Espaço vinculado */}
            <div className="space-y-1">
              <Label htmlFor="spaceId">
                Espaço vinculado <span className="text-gray-400 font-normal">(opcional)</span>
              </Label>
              <Controller
                name="spaceId"
                control={control}
                render={({ field }) => (
                  <Select value={field.value ?? ""} onValueChange={field.onChange}>
                    <SelectTrigger id="spaceId"><SelectValue placeholder="Nenhum espaço" /></SelectTrigger>
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

            {/* Prestador padrão */}
            <div className="space-y-1">
              <Label htmlFor="providerId">
                Prestador padrão <span className="text-gray-400 font-normal">(opcional)</span>
              </Label>
              <Controller
                name="providerId"
                control={control}
                render={({ field }) => (
                  <Select value={field.value ?? ""} onValueChange={(v) => field.onChange(v || undefined)}>
                    <SelectTrigger id="providerId"><SelectValue placeholder="Nenhum prestador" /></SelectTrigger>
                    <SelectContent alignItemWithTrigger={false}>
                      {providers.map((p) => (
                        <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>

            {/* Próxima execução */}
            <div className="space-y-1">
              <Label htmlFor="nextRunAt">Próxima execução</Label>
              <Input id="nextRunAt" type="date" {...register("nextRunAt")} />
              {errors.nextRunAt && <p className="text-sm text-red-500">{errors.nextRunAt.message}</p>}
            </div>

            {/* Status (só edição) */}
            {isEditMode && (
              <div className="space-y-1 flex items-end">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" {...register("isActive")} className="h-4 w-4 rounded border-gray-300" />
                  <span className="text-sm font-medium text-gray-700">Plano ativo</span>
                </label>
              </div>
            )}
          </div>

          {/* Nome */}
          <div className="space-y-1">
            <Label htmlFor="name">Nome do plano</Label>
            <Input id="name" placeholder="Ex: Manutenção mensal de AC" {...register("name")} />
            {errors.name && <p className="text-sm text-red-500">{errors.name.message}</p>}
          </div>

          {/* Descrição */}
          <div className="space-y-1">
            <Label htmlFor="description">
              Descrição <span className="text-gray-400 font-normal">(opcional)</span>
            </Label>
            <Textarea
              id="description"
              rows={2}
              placeholder="Detalhes sobre a manutenção, checklist esperado..."
              {...register("description")}
            />
          </div>

          <div className="flex gap-3 pt-1">
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Salvando..." : isEditMode ? "Salvar alterações" : "Criar plano"}
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
