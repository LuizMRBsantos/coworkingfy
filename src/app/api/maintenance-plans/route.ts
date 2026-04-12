import { NextResponse } from "next/server";
import { z } from "zod";
import { PlanFrequency } from "@prisma/client";
import { db } from "@/lib/db";
import { withAuth } from "@/lib/rbac";
import { CreateMaintenancePlanSchema } from "@/lib/validations/maintenance-plan";
import { PAGE_SIZE } from "@/lib/constants";

const FrequencySchema = z.enum(PlanFrequency).optional();

export const GET = withAuth(
  async (req, session) => {
    const { role, unitIds } = session.user;
    const sp = req.nextUrl.searchParams;

    const unitFilter   = role === "ADMIN" ? sp.get("unitId") ?? undefined : undefined;
    const assetFilter  = sp.get("assetId")  ?? undefined;
    const freqParsed   = FrequencySchema.safeParse(sp.get("frequency") ?? undefined);
    const freqFilter   = freqParsed.success ? freqParsed.data : undefined;
    const activeFilter = sp.get("isActive") === "false" ? false : sp.get("isActive") === "true" ? true : undefined;

    const page  = Math.max(1, parseInt(sp.get("page") ?? "1", 10) || 1);
    const skip  = (page - 1) * PAGE_SIZE;

    const where = {
      ...(unitFilter  ? { unitId: unitFilter }              : role === "RECEPTIONIST" ? { unitId: { in: unitIds } } : {}),
      ...(assetFilter ? { assetId: assetFilter }            : {}),
      ...(freqFilter  ? { frequency: freqFilter }           : {}),
      ...(activeFilter !== undefined ? { isActive: activeFilter } : {}),
    };

    const [plans, total] = await Promise.all([
      db.maintenancePlan.findMany({
        where,
        orderBy: { nextRunAt: "asc" },
        skip,
        take: PAGE_SIZE,
        include: {
          unit:  { select: { id: true, name: true } },
          asset: { select: { id: true, name: true, code: true } },
          space: { select: { id: true, name: true } },
          _count: { select: { serviceOrders: true } },
        },
      }),
      db.maintenancePlan.count({ where }),
    ]);

    return NextResponse.json({
      data: plans,
      meta: { total, page, totalPages: Math.ceil(total / PAGE_SIZE) },
    });
  },
  ["ADMIN", "RECEPTIONIST"],
);

export const POST = withAuth(
  async (req) => {
    const body   = await req.json();
    const parsed = CreateMaintenancePlanSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Dados inválidos", code: "VALIDATION_ERROR" }, { status: 400 });
    }

    const data = parsed.data;

    const plan = await db.maintenancePlan.create({
      data: {
        unitId:      data.unitId,
        assetId:     data.assetId,
        spaceId:     data.spaceId,
        providerId:  data.providerId,
        name:        data.name,
        description: data.description,
        frequency:   data.frequency,
        serviceType: data.serviceType,
        priority:    data.priority,
        nextRunAt:   new Date(data.nextRunAt),
      },
      include: {
        unit:  { select: { id: true, name: true } },
        asset: { select: { id: true, name: true, code: true } },
      },
    });

    return NextResponse.json(plan, { status: 201 });
  },
  ["ADMIN"],
);
