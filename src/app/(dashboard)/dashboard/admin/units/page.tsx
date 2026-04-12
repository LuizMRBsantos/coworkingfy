import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Building2, Users, FileText, ClipboardList, Plus, Pencil } from "lucide-react";
import type { UnitType } from "@prisma/client";

const UNIT_TYPE_LABEL: Record<UnitType, string> = {
  COWORKING: "Coworking",
  BTS:       "BTS",
};

const UNIT_TYPE_CLASS: Record<UnitType, string> = {
  COWORKING: "bg-yellow-100 text-yellow-800",
  BTS:       "bg-blue-100 text-blue-700",
};

export default async function UnitsPage() {
  const session = await auth();
  if (!session) redirect("/login");
  if (session.user.role !== "ADMIN") redirect("/dashboard");

  const units = await db.unit.findMany({
    orderBy: [{ type: "asc" }, { name: "asc" }],
    include: {
      _count: {
        select: {
          spaces:        true,
          tickets:       true,
          serviceOrders: true,
          providers:     true,
        },
      },
      userUnits: {
        select: { user: { select: { id: true, name: true, role: true } } },
      },
    },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Unidades</h1>
          <p className="text-sm text-gray-500 mt-1">
            {units.length} unidade{units.length !== 1 ? "s" : ""} cadastrada{units.length !== 1 ? "s" : ""}
          </p>
        </div>
        <Link href="/dashboard/admin/units/new">
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            Nova Unidade
          </Button>
        </Link>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {units.map((unit) => {
          const receptionist = unit.userUnits
            .filter((uu) => uu.user.role === "RECEPTIONIST")
            .map((uu) => uu.user.name ?? "—");

          return (
            <Card key={unit.id}>
              <CardContent className="p-5 space-y-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-gray-100">
                      <Building2 className="h-5 w-5 text-gray-500" />
                    </div>
                    <div className="min-w-0">
                      <p className="font-semibold text-gray-900 truncate">{unit.name}</p>
                      <p className="text-xs text-gray-400">
                        Criada em {new Date(unit.createdAt).toLocaleDateString("pt-BR")}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Badge className={UNIT_TYPE_CLASS[unit.type]}>
                      {UNIT_TYPE_LABEL[unit.type]}
                    </Badge>
                    <Link href={`/dashboard/admin/units/${unit.id}`}>
                      <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                        <Pencil className="h-3.5 w-3.5 text-gray-400" />
                      </Button>
                    </Link>
                  </div>
                </div>

                {/* Contadores */}
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                  {unit.type === "COWORKING" && (
                    <div className="rounded-lg bg-gray-50 p-3 text-center">
                      <Building2 className="h-4 w-4 text-gray-400 mx-auto mb-1" />
                      <p className="text-lg font-bold text-gray-900">{unit._count.spaces}</p>
                      <p className="text-[10px] text-gray-500 uppercase tracking-wide">Espaços</p>
                    </div>
                  )}
                  <div className="rounded-lg bg-gray-50 p-3 text-center">
                    <FileText className="h-4 w-4 text-gray-400 mx-auto mb-1" />
                    <p className="text-lg font-bold text-gray-900">{unit._count.tickets}</p>
                    <p className="text-[10px] text-gray-500 uppercase tracking-wide">Tickets</p>
                  </div>
                  <div className="rounded-lg bg-gray-50 p-3 text-center">
                    <ClipboardList className="h-4 w-4 text-gray-400 mx-auto mb-1" />
                    <p className="text-lg font-bold text-gray-900">{unit._count.serviceOrders}</p>
                    <p className="text-[10px] text-gray-500 uppercase tracking-wide">OS</p>
                  </div>
                  <div className="rounded-lg bg-gray-50 p-3 text-center">
                    <Users className="h-4 w-4 text-gray-400 mx-auto mb-1" />
                    <p className="text-lg font-bold text-gray-900">{unit._count.providers}</p>
                    <p className="text-[10px] text-gray-500 uppercase tracking-wide">Prestadores</p>
                  </div>
                </div>

                {/* Recepcionistas vinculadas */}
                {receptionist.length > 0 && (
                  <div className="border-t border-gray-100 pt-3">
                    <p className="text-xs text-gray-500 mb-1">
                      Recepcionista{receptionist.length > 1 ? "s" : ""}
                    </p>
                    <div className="flex flex-wrap gap-1">
                      {receptionist.map((name, i) => (
                        <span
                          key={i}
                          className="inline-flex items-center rounded-full bg-blue-50 px-2 py-0.5 text-xs text-blue-700"
                        >
                          {name}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {units.length === 0 && (
        <div className="text-center py-16 text-gray-400">
          Nenhuma unidade cadastrada.
        </div>
      )}
    </div>
  );
}
