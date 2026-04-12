// 'use client' — formulário interativo com react-hook-form
"use client";

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
import type { PurchaseCategory } from "@prisma/client";

export const PURCHASE_CATEGORY_LABEL: Record<PurchaseCategory, string> = {
  CLEANING:       "Limpeza",
  COFFEE:         "Café",
  OFFICE_SUPPLIES: "Material de escritório",
};

export const PURCHASE_CATEGORY_CLASS: Record<PurchaseCategory, string> = {
  CLEANING:       "bg-blue-100 text-blue-700 border-none",
  COFFEE:         "bg-amber-100 text-amber-700 border-none",
  OFFICE_SUPPLIES: "bg-purple-100 text-purple-700 border-none",
};

const CATEGORIES = Object.entries(PURCHASE_CATEGORY_LABEL) as [PurchaseCategory, string][];

const schema = z.object({
  unitId:      z.string().min(1, "Unidade é obrigatória"),
  category:    z.enum(["CLEANING", "COFFEE", "OFFICE_SUPPLIES"] as const),
  description: z.string().min(1, "Descrição é obrigatória").max(200),
  value:       z.number({ error: "Valor inválido" }).positive("Valor deve ser positivo"),
  purchasedAt: z.string().min(1, "Data é obrigatória"),
  notes:       z.string().optional(),
});

type FormData = z.infer<typeof schema>;

interface PurchaseFormProps {
  purchaseId?:    string;
  defaultValues?: Partial<FormData>;
  units:          { id: string; name: string }[];
  fixedUnitId?:   string;
  backHref:       string;
}

export function PurchaseForm({ purchaseId, defaultValues, units, fixedUnitId, backHref }: PurchaseFormProps) {
  const router     = useRouter();
  const isEditMode = !!purchaseId;

  const {
    register, handleSubmit, control,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      unitId:      fixedUnitId ?? "",
      purchasedAt: new Date().toISOString().slice(0, 10),
      ...defaultValues,
    },
  });

  async function onSubmit(data: FormData) {
    const res = await fetch(
      isEditMode ? `/api/purchases/${purchaseId}` : "/api/purchases",
      {
        method:  isEditMode ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify(data),
      },
    );

    if (!res.ok) {
      const json = await res.json().catch(() => ({}));
      toast.error((json as { error?: string }).error ?? "Erro ao salvar compra.");
      return;
    }

    toast.success(isEditMode ? "Compra atualizada." : "Compra registrada.");
    router.push(backHref);
    router.refresh();
  }

  return (
    <Card>
      <CardContent className="pt-6">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">

            {/* Unidade */}
            {fixedUnitId ? (
              <input type="hidden" {...register("unitId")} value={fixedUnitId} />
            ) : (
              <div className="space-y-1">
                <Label htmlFor="unitId">Unidade</Label>
                <Controller
                  name="unitId"
                  control={control}
                  render={({ field }) => (
                    <Select
                      value={field.value ?? ""}
                      onValueChange={field.onChange}
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
                {errors.unitId && <p className="text-sm text-red-500">{errors.unitId.message}</p>}
              </div>
            )}

            {/* Categoria */}
            <div className="space-y-1">
              <Label htmlFor="category">Categoria</Label>
              <Controller
                name="category"
                control={control}
                render={({ field }) => (
                  <Select value={field.value ?? ""} onValueChange={field.onChange}>
                    <SelectTrigger id="category"><SelectValue placeholder="Selecione" /></SelectTrigger>
                    <SelectContent alignItemWithTrigger={false}>
                      {CATEGORIES.map(([v, l]) => (
                        <SelectItem key={v} value={v}>{l}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
              {errors.category && <p className="text-sm text-red-500">{errors.category.message}</p>}
            </div>

            {/* Valor */}
            <div className="space-y-1">
              <Label htmlFor="value">Valor (R$)</Label>
              <Input
                id="value"
                type="number"
                step="0.01"
                min="0"
                placeholder="0,00"
                {...register("value", { valueAsNumber: true })}
              />
              {errors.value && <p className="text-sm text-red-500">{errors.value.message}</p>}
            </div>

            {/* Data */}
            <div className="space-y-1">
              <Label htmlFor="purchasedAt">Data da compra</Label>
              <Input id="purchasedAt" type="date" {...register("purchasedAt")} />
              {errors.purchasedAt && <p className="text-sm text-red-500">{errors.purchasedAt.message}</p>}
            </div>
          </div>

          {/* Descrição */}
          <div className="space-y-1">
            <Label htmlFor="description">Descrição</Label>
            <Input id="description" placeholder="Ex: Detergente, papel toalha, café 500g..." {...register("description")} />
            {errors.description && <p className="text-sm text-red-500">{errors.description.message}</p>}
          </div>

          {/* Notas */}
          <div className="space-y-1">
            <Label htmlFor="notes">
              Observações <span className="text-gray-400 font-normal">(opcional)</span>
            </Label>
            <Textarea id="notes" rows={2} placeholder="Fornecedor, nota fiscal, etc." {...register("notes")} />
          </div>

          <div className="flex gap-3 pt-1">
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Salvando..." : isEditMode ? "Salvar alterações" : "Registrar compra"}
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
