import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Building2, Phone, Mail, ClipboardList } from "lucide-react";
import type { ServiceType, ProviderType, ProviderStatus } from "@prisma/client";

const SPECIALTY_LABEL: Record<ServiceType, string> = {
  CLEANING:   "Limpeza",
  ELECTRICAL: "Elétrica",
  HYDRAULIC:  "Hidráulica",
  OTHER:      "Outros",
};

const TYPE_LABEL: Record<ProviderType, string> = {
  RECURRING: "Recorrente",
  PUNCTUAL:  "Pontual",
};

const TYPE_CLASS: Record<ProviderType, string> = {
  RECURRING: "bg-blue-100 text-blue-700 hover:bg-blue-100",
  PUNCTUAL:  "bg-orange-100 text-orange-700 hover:bg-orange-100",
};

const STATUS_CLASS: Record<ProviderStatus, string> = {
  ACTIVE:   "bg-green-100 text-green-700 hover:bg-green-100",
  INACTIVE: "bg-red-100 text-red-700 hover:bg-red-100",
};

interface ProviderCardProps {
  provider: {
    id:        string;
    name:      string;
    specialty: ServiceType;
    type:      ProviderType;
    status:    ProviderStatus;
    phone:     string | null;
    email:     string | null;
    unit:      { id: string; name: string };
    _count:    { serviceOrders: number };
  };
  href: string;
}

export function ProviderCard({ provider, href }: ProviderCardProps) {
  return (
    <Link href={href} className="block">
      <Card className="hover:border-gray-300 transition-colors cursor-pointer">
        <CardContent className="p-4">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-medium text-gray-900">{provider.name}</span>
                <Badge className={TYPE_CLASS[provider.type]}>{TYPE_LABEL[provider.type]}</Badge>
                <Badge variant="outline">{SPECIALTY_LABEL[provider.specialty]}</Badge>
                <Badge className={STATUS_CLASS[provider.status]}>
                  {provider.status === "ACTIVE" ? "Ativo" : "Inativo"}
                </Badge>
              </div>

              <div className="flex items-center gap-4 mt-2 text-xs text-gray-400 flex-wrap">
                <span className="flex items-center gap-1">
                  <Building2 className="h-3 w-3" />
                  {provider.unit.name}
                </span>
                {provider.phone && (
                  <span className="flex items-center gap-1">
                    <Phone className="h-3 w-3" />
                    {provider.phone}
                  </span>
                )}
                {provider.email && (
                  <span className="flex items-center gap-1">
                    <Mail className="h-3 w-3" />
                    {provider.email}
                  </span>
                )}
                <span className="flex items-center gap-1">
                  <ClipboardList className="h-3 w-3" />
                  {provider._count.serviceOrders} OS
                </span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
