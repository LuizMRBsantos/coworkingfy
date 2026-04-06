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

// Senha opcional no schema unificado — obrigatória em modo criação via onSubmit
const schema = z.object({
  name:     z.string().min(1, "Nome é obrigatório"),
  email:    z.string().email("Email inválido"),
  password: z.string().min(6, "Senha deve ter pelo menos 6 caracteres").optional(),
  role:     z.enum(["ADMIN", "RECEPTIONIST", "MEMBER"] as const),
  unitIds:  z.array(z.string()),
});

type FormData = z.infer<typeof schema>;

interface UserFormDefaultValues {
  name?:    string;
  email?:   string;
  role?:    "ADMIN" | "RECEPTIONIST" | "MEMBER";
  unitIds?: string[];
}

interface UserFormProps {
  units:          { id: string; name: string }[];
  userId?:        string;
  defaultValues?: UserFormDefaultValues;
}

const ROLE_OPTIONS = [
  { value: "ADMIN",        label: "Administrador" },
  { value: "RECEPTIONIST", label: "Recepcionista" },
  { value: "MEMBER",       label: "Membro" },
];

export function UserForm({ units, userId, defaultValues }: UserFormProps) {
  const router = useRouter();
  const [apiError, setApiError] = useState<string | null>(null);
  const isEditMode = !!userId;

  const {
    register,
    handleSubmit,
    control,
    watch,
    getValues,
    setValue,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      name:    defaultValues?.name    ?? "",
      email:   defaultValues?.email   ?? "",
      role:    defaultValues?.role,
      unitIds: defaultValues?.unitIds ?? [],
    },
  });

  const selectedRole = watch("role");
  const showUnits = selectedRole && selectedRole !== "MEMBER";

  function toggleUnit(unitId: string) {
    const current = getValues("unitIds");
    setValue(
      "unitIds",
      current.includes(unitId) ? current.filter((id) => id !== unitId) : [...current, unitId],
    );
  }

  async function onSubmit(data: FormData) {
    // Em modo criação, senha é obrigatória
    if (!isEditMode && !data.password) {
      setError("password", { message: "Senha é obrigatória" });
      return;
    }

    setApiError(null);

    const payload = isEditMode
      ? { name: data.name, email: data.email, role: data.role, unitIds: data.unitIds }
      : data;

    const res = await fetch(isEditMode ? `/api/users/${userId}` : "/api/users", {
      method: isEditMode ? "PUT" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const json = await res.json().catch(() => ({}));
      setApiError(json.error ?? "Erro ao salvar usuário. Tente novamente.");
      return;
    }

    router.push("/dashboard/admin/users");
  }

  return (
    <Card>
      <CardContent className="pt-6">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
          {/* Nome */}
          <div className="space-y-1">
            <Label htmlFor="name">Nome</Label>
            <Input id="name" placeholder="Nome completo" {...register("name")} />
            {errors.name && <p className="text-sm text-red-500">{errors.name.message}</p>}
          </div>

          {/* Email */}
          <div className="space-y-1">
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" placeholder="email@exemplo.com" {...register("email")} />
            {errors.email && <p className="text-sm text-red-500">{errors.email.message}</p>}
          </div>

          {/* Senha — só em modo criação */}
          {!isEditMode && (
            <div className="space-y-1">
              <Label htmlFor="password">Senha</Label>
              <Input id="password" type="password" placeholder="Mínimo 6 caracteres" {...register("password")} />
              {errors.password && <p className="text-sm text-red-500">{errors.password.message}</p>}
            </div>
          )}

          {/* Perfil */}
          <div className="space-y-1">
            <Label htmlFor="role">Perfil</Label>
            <Controller
              name="role"
              control={control}
              render={({ field }) => (
                <Select value={field.value ?? ""} onValueChange={field.onChange}>
                  <SelectTrigger id="role" className="w-full">
                    <SelectValue placeholder="Selecione o perfil" />
                  </SelectTrigger>
                  <SelectContent alignItemWithTrigger={false}>
                    {ROLE_OPTIONS.map((r) => (
                      <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
            {errors.role && <p className="text-sm text-red-500">{errors.role.message}</p>}
          </div>

          {/* Unidades — só para ADMIN e RECEPTIONIST */}
          {showUnits && (
            <Controller
              name="unitIds"
              control={control}
              render={({ field }) => (
                <div className="space-y-2">
                  <Label>Unidades</Label>
                  <div className="border border-gray-200 rounded-lg p-3 space-y-2 max-h-48 overflow-y-auto">
                    {units.map((unit) => (
                      <div key={unit.id} className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          id={`unit-${unit.id}`}
                          checked={field.value.includes(unit.id)}
                          onChange={() => toggleUnit(unit.id)}
                          className="h-4 w-4 rounded border-gray-300 accent-yellow-500 cursor-pointer"
                        />
                        <label
                          htmlFor={`unit-${unit.id}`}
                          className="text-sm text-gray-700 cursor-pointer"
                        >
                          {unit.name}
                        </label>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            />
          )}

          {apiError && <p className="text-sm text-red-500">{apiError}</p>}

          <div className="flex gap-3 pt-1">
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting
                ? isEditMode ? "Salvando..." : "Criando..."
                : isEditMode ? "Salvar alterações" : "Criar Usuário"
              }
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => router.push("/dashboard/admin/users")}
            >
              Cancelar
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
