import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { withAuth } from "@/lib/rbac";
import type { ActivityEntityType } from "@prisma/client";

const VALID_ENTITY_TYPES: ActivityEntityType[] = ["SERVICE_ORDER", "TICKET"];

export const GET = withAuth(
  async (req, session) => {
    const { role, unitIds } = session.user;
    const sp = req.nextUrl.searchParams;

    const entityTypeRaw = sp.get("entityType");
    const entityId      = sp.get("entityId");

    if (!entityId || !entityTypeRaw) {
      return NextResponse.json(
        { error: "entityType e entityId são obrigatórios", code: "PARAMS_REQUIRED" },
        { status: 400 },
      );
    }

    if (!VALID_ENTITY_TYPES.includes(entityTypeRaw as ActivityEntityType)) {
      return NextResponse.json(
        { error: "entityType inválido", code: "INVALID_ENTITY_TYPE" },
        { status: 400 },
      );
    }

    const entityType = entityTypeRaw as ActivityEntityType;

    // RECEPTIONIST só acessa logs de entidades da sua unidade
    if (role === "RECEPTIONIST") {
      if (entityType === "SERVICE_ORDER") {
        const os = await db.serviceOrder.findUnique({
          where:  { id: entityId },
          select: { unitId: true },
        });
        if (!os || !unitIds.includes(os.unitId)) {
          return NextResponse.json({ error: "Sem permissão" }, { status: 403 });
        }
      } else {
        const ticket = await db.ticket.findUnique({
          where:  { id: entityId },
          select: { unitId: true },
        });
        if (!ticket || !unitIds.includes(ticket.unitId)) {
          return NextResponse.json({ error: "Sem permissão" }, { status: 403 });
        }
      }
    }

    const logs = await db.activityLog.findMany({
      where:   { entityType, entityId },
      orderBy: { createdAt: "asc" },
      select: {
        id:              true,
        action:          true,
        fromStatus:      true,
        toStatus:        true,
        performedByName: true,
        lat:             true,
        lng:             true,
        createdAt:       true,
      },
    });

    return NextResponse.json({ data: logs });
  },
  ["ADMIN", "RECEPTIONIST"],
);
