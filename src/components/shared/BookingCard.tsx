import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Building2, Clock, Users } from "lucide-react";
import type { BookingStatus, SpaceType } from "@prisma/client";

const STATUS_LABEL: Record<BookingStatus, string> = {
  PENDING_APPROVAL: "Aguardando aprovação",
  CONFIRMED:        "Confirmada",
  CANCELLED:        "Cancelada",
  REJECTED:         "Rejeitada",
};

const STATUS_CLASS: Record<BookingStatus, string> = {
  PENDING_APPROVAL: "bg-yellow-100 text-yellow-800 hover:bg-yellow-100",
  CONFIRMED:        "bg-green-100 text-green-700 hover:bg-green-100",
  CANCELLED:        "bg-red-100 text-red-700 hover:bg-red-100",
  REJECTED:         "bg-red-100 text-red-700 hover:bg-red-100",
};

const TYPE_LABEL: Record<SpaceType, string> = {
  MEETING_ROOM:   "Sala de Reunião",
  PRIVATE_OFFICE: "Sala Privativa",
  WORKSTATION:    "Estação de Trabalho",
};

interface BookingCardProps {
  booking: {
    id:        string;
    startTime: Date;
    endTime:   Date;
    status:    BookingStatus;
    space: {
      id:   string;
      name: string;
      type: SpaceType;
      unit: { id: string; name: string };
    };
    user: { id: string; name: string | null; email: string };
  };
  showUser?: boolean;
  actions?: React.ReactNode;
}

function formatTime(date: Date) {
  return new Date(date).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
}

function formatDate(date: Date) {
  return new Date(date).toLocaleDateString("pt-BR", { weekday: "short", day: "2-digit", month: "short" });
}

export function BookingCard({ booking, showUser = false, actions }: BookingCardProps) {
  const isPast    = new Date(booking.endTime) < new Date();
  const isDimmed  = booking.status === "CANCELLED" || booking.status === "REJECTED";

  return (
    <Card className={`transition-colors ${isDimmed ? "opacity-60" : ""}`}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-medium text-gray-900">{booking.space.name}</span>
              <Badge variant="outline">{TYPE_LABEL[booking.space.type]}</Badge>
              <Badge className={STATUS_CLASS[booking.status]}>{STATUS_LABEL[booking.status]}</Badge>
              {isPast && booking.status === "CONFIRMED" && (
                <Badge className="bg-gray-100 text-gray-500 hover:bg-gray-100">Concluída</Badge>
              )}
            </div>

            <div className="flex items-center gap-4 mt-2 text-xs text-gray-500 flex-wrap">
              <span className="flex items-center gap-1 font-medium text-gray-700">
                <Clock className="h-3 w-3" />
                {formatDate(booking.startTime)} · {formatTime(booking.startTime)} – {formatTime(booking.endTime)}
              </span>
              <span className="flex items-center gap-1">
                <Building2 className="h-3 w-3" />
                {booking.space.unit.name}
              </span>
              {showUser && (
                <span className="flex items-center gap-1">
                  <Users className="h-3 w-3" />
                  {booking.user.name ?? booking.user.email}
                </span>
              )}
            </div>
          </div>

          {actions && <div className="shrink-0">{actions}</div>}
        </div>
      </CardContent>
    </Card>
  );
}
