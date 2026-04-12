import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Building2, Tag, Wrench, ClipboardList, AlertTriangle } from "lucide-react";
import type { AssetStatus, AssetType } from "@prisma/client";

interface AssetCardProps {
  asset: {
    id:               string;
    code:             string;
    name:             string;
    type:             AssetType;
    status:           AssetStatus;
    brand:            string | null;
    warrantyExpiresAt: Date | null;
    unit:   { id: string; name: string };
    space:  { id: string; name: string } | null;
    _count: { serviceOrders: number };
  };
}

export const ASSET_TYPE_LABEL: Record<AssetType, string> = {
  AC:              "Ar-condicionado",
  ELECTRONIC:      "Eletrônico",
  HYDRAULIC:       "Hidráulico",
  CLEANING:        "Limpeza",
  HVAC:            "HVAC / Climatização",
  FIRE_SAFETY:     "Segurança contra incêndio",
  ELECTRICAL:      "Elétrica / Energia",
  PLUMBING:        "Hidráulica / Água",
  ELEVATOR:        "Elevador",
  APPLIANCE:       "Eletrodoméstico",
  IT_INFRA:        "TI / Infraestrutura",
  FURNITURE:       "Mobiliário",
  OTHER:           "Outro",
};

export const ASSET_STATUS_LABEL: Record<AssetStatus, string> = {
  ACTIVE:            "Ativo",
  INACTIVE:          "Inativo",
  MAINTENANCE:       "Em manutenção",
  UNDER_MAINTENANCE: "Em manutenção",
  DECOMMISSIONED:    "Baixado",
};

export const ASSET_STATUS_CLASS: Record<AssetStatus, string> = {
  ACTIVE:            "bg-emerald-100 text-emerald-700 border-none",
  INACTIVE:          "bg-gray-100 text-gray-500 border-none",
  MAINTENANCE:       "bg-amber-100 text-amber-700 border-none",
  UNDER_MAINTENANCE: "bg-amber-100 text-amber-700 border-none",
  DECOMMISSIONED:    "bg-red-100 text-red-600 border-none",
};

export function AssetCard({ asset }: AssetCardProps) {
  const warrantyExpired =
    asset.warrantyExpiresAt && new Date(asset.warrantyExpiresAt) < new Date();
  const warrantyExpiringSoon =
    !warrantyExpired &&
    asset.warrantyExpiresAt &&
    new Date(asset.warrantyExpiresAt).getTime() - Date.now() < 30 * 24 * 60 * 60 * 1000;

  return (
    <Link href={`/dashboard/admin/assets/${asset.id}`} className="block">
      <Card className="hover:border-gray-300 transition-colors cursor-pointer shadow-sm border-gray-200">
        <CardContent className="p-5">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              {/* Código e badges */}
              <div className="flex flex-wrap items-center gap-2 mb-2">
                <span className="font-mono text-sm font-semibold text-gray-900 flex items-center gap-1">
                  <Tag className="h-3.5 w-3.5 text-gray-400" />
                  {asset.code}
                </span>
                <Badge className={`font-medium rounded-full text-xs ${ASSET_STATUS_CLASS[asset.status]}`}>
                  {ASSET_STATUS_LABEL[asset.status]}
                </Badge>
                {warrantyExpired && (
                  <span className="flex items-center gap-1 text-xs text-red-600 font-medium">
                    <AlertTriangle className="h-3 w-3" />
                    Garantia vencida
                  </span>
                )}
                {warrantyExpiringSoon && (
                  <span className="flex items-center gap-1 text-xs text-amber-600 font-medium">
                    <AlertTriangle className="h-3 w-3" />
                    Garantia vencendo
                  </span>
                )}
              </div>

              {/* Nome e tipo */}
              <p className="text-sm font-medium text-gray-900 truncate">{asset.name}</p>
              <p className="text-xs text-gray-500 mt-0.5">
                {ASSET_TYPE_LABEL[asset.type]}
                {asset.brand ? ` · ${asset.brand}` : ""}
              </p>

              {/* Metadados */}
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-3 text-xs text-gray-500">
                <span className="flex items-center gap-1">
                  <Building2 className="h-3.5 w-3.5" />
                  {asset.unit.name}
                </span>
                {asset.space && (
                  <span className="flex items-center gap-1">
                    <Wrench className="h-3.5 w-3.5" />
                    {asset.space.name}
                  </span>
                )}
                <span className="flex items-center gap-1">
                  <ClipboardList className="h-3.5 w-3.5" />
                  {asset._count.serviceOrders} OS
                </span>
              </div>
            </div>

            {/* Garantia */}
            {asset.warrantyExpiresAt && (
              <div className={`text-right shrink-0 text-xs ${warrantyExpired ? "text-red-600" : warrantyExpiringSoon ? "text-amber-600" : "text-gray-400"}`}>
                <p className="font-medium">Garantia</p>
                <p>{new Date(asset.warrantyExpiresAt).toLocaleDateString("pt-BR")}</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
