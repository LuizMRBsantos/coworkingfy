import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { logActivity } from "@/lib/activity-logger";

const BodySchema = z.object({
  token: z.string().min(1),
  lat:   z.number().optional(),
  lng:   z.number().optional(),
});

// Haversine — distância em metros entre dois pontos geográficos
function haversineMeters(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R  = 6_371_000;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
    Math.cos((lat2 * Math.PI) / 180) *
    Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function POST(req: Request, { params }: RouteContext) {
  const { id } = await params;

  const body   = await req.json();
  const parsed = BodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Dados inválidos", code: "VALIDATION_ERROR" }, { status: 400 });
  }

  const { token, lat, lng } = parsed.data;

  const providerToken = await db.providerToken.findUnique({
    where:  { token },
    select: { id: true, serviceOrderId: true, expiresAt: true, usedAt: true },
  });

  if (!providerToken || providerToken.serviceOrderId !== id) {
    return NextResponse.json({ error: "Token inválido", code: "INVALID_TOKEN" }, { status: 403 });
  }
  if (providerToken.expiresAt < new Date()) {
    return NextResponse.json({ error: "Token expirado", code: "TOKEN_EXPIRED" }, { status: 403 });
  }

  const serviceOrder = await db.serviceOrder.findUnique({
    where:  { id },
    select: { id: true, status: true, unit: { select: { lat: true, lng: true } } },
  });

  if (!serviceOrder) {
    return NextResponse.json({ error: "OS não encontrada" }, { status: 404 });
  }

  if (serviceOrder.status !== "APPROVED") {
    return NextResponse.json(
      { error: "OS não está aprovada para iniciar execução", code: "INVALID_STATUS" },
      { status: 400 },
    );
  }

  // Geofencing: raio máximo de 200m
  const unitLat = serviceOrder.unit.lat ? Number(serviceOrder.unit.lat) : null;
  const unitLng = serviceOrder.unit.lng ? Number(serviceOrder.unit.lng) : null;

  if (unitLat !== null && unitLng !== null) {
    if (lat === undefined || lng === undefined) {
      return NextResponse.json(
        { error: "Localização necessária para iniciar esta OS", code: "LOCATION_REQUIRED" },
        { status: 400 },
      );
    }
    const dist = haversineMeters(lat, lng, unitLat, unitLng);
    if (dist > 200) {
      return NextResponse.json(
        { error: `Você está a ${Math.round(dist)}m da unidade. Aproxime-se para iniciar (máx. 200m).`, code: "LOCATION_TOO_FAR" },
        { status: 403 },
      );
    }
  }

  const now = new Date();

  await db.$transaction(async (tx) => {
    await tx.serviceOrder.update({
      where: { id },
      data:  { status: "IN_PROGRESS", startedAt: now },
    });
    await tx.providerToken.update({
      where: { id: providerToken.id },
      data:  { usedAt: now },
    });
    await logActivity({
      tx,
      entityType: "SERVICE_ORDER",
      entityId:   id,
      action:     "STATUS_CHANGED",
      fromStatus: "APPROVED",
      toStatus:   "IN_PROGRESS",
      // performedById null — ação do prestador externo via token
      lat,
      lng,
      metadata: { source: "provider_checkin", token: providerToken.id },
    });
  });

  return NextResponse.json({ ok: true });
}
