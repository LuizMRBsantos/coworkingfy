import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Building2, Users, CalendarDays, Wrench } from "lucide-react";
import type { SpaceType, SpaceStatus } from "@prisma/client";

const TYPE_LABEL: Record<SpaceType, string> = {
  MEETING_ROOM:    "Sala de Reunião",
  PRIVATE_OFFICE:  "Sala Privativa",
  WORKSTATION:     "Estação de Trabalho",
};

const STATUS_LABEL: Record<SpaceStatus, string> = {
  ACTIVE:      "Ativo",
  MAINTENANCE: "Manutenção",
  INACTIVE:    "Inativo",
};

const STATUS_CLASS: Record<SpaceStatus, string> = {
  ACTIVE:      "bg-emerald-100 text-emerald-700 hover:bg-emerald-200 border-none",
  MAINTENANCE: "bg-amber-100 text-amber-700 hover:bg-amber-200 border-none",
  INACTIVE:    "bg-rose-100 text-rose-700 hover:bg-rose-200 border-none",
};

const TYPE_CLASS: Record<SpaceType, string> = {
  MEETING_ROOM:   "bg-blue-50 border-blue-200 text-blue-700 hover:bg-blue-100",
  PRIVATE_OFFICE: "bg-purple-50 border-purple-200 text-purple-700 hover:bg-purple-100",
  WORKSTATION:    "bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100",
};

interface SpaceCardProps {
  space: {
    id:          string;
    name:        string;
    description: string | null;
    capacity:    number;
    type:        SpaceType;
    status:      SpaceStatus;
    unit:        { id: string; name: string };
    _count:      { bookings: number; serviceOrders: number };
  };
  href: string;
}

export function SpaceCard({ space, href }: SpaceCardProps) {
  return (
    <Link href={href} className="block">
      <Card className="hover:border-gray-300 transition-colors cursor-pointer shadow-sm border-gray-200">
        <CardContent className="p-5">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-semibold text-gray-900">{space.name}</span>
                <Badge variant="outline" className={`font-medium ${TYPE_CLASS[space.type]}`}>{TYPE_LABEL[space.type]}</Badge>
                <Badge className={`font-medium rounded-full ${STATUS_CLASS[space.status]}`}>{STATUS_LABEL[space.status]}</Badge>
              </div>

              {space.description && (
                <p className="text-sm text-gray-500 mt-1 line-clamp-1">{space.description}</p>
              )}

              <div className="flex items-center gap-4 mt-2 text-xs text-gray-400">
                <span className="flex items-center gap-1">
                  <Building2 className="h-3 w-3" />
                  {space.unit.name}
                </span>
                <span className="flex items-center gap-1">
                  <Users className="h-3 w-3" />
                  {space.capacity} {space.capacity === 1 ? "pessoa" : "pessoas"}
                </span>
                <span className="flex items-center gap-1">
                  <CalendarDays className="h-3 w-3" />
                  {space._count.bookings} reserva{space._count.bookings !== 1 ? "s" : ""}
                </span>
                {space._count.serviceOrders > 0 && (
                  <span className="flex items-center gap-1">
                    <Wrench className="h-3 w-3" />
                    {space._count.serviceOrders} OS
                  </span>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
