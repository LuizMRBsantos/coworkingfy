import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { logActivity } from "@/lib/activity-logger";
import { uploadOsPhoto } from "@/lib/supabase-storage";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function POST(req: Request, { params }: RouteContext) {
  const { id } = await params;

  let formData: FormData;
  try {
    formData = await req.formData();
  } catch {
    return NextResponse.json({ error: "Formato inválido — multipart/form-data esperado", code: "INVALID_FORMAT" }, { status: 400 });
  }

  const token           = formData.get("token");
  const executionReport = formData.get("executionReport");
  const latRaw          = formData.get("lat");
  const lngRaw          = formData.get("lng");
  const photoFiles      = formData.getAll("photos") as File[];

  // Validações básicas
  if (!token || typeof token !== "string") {
    return NextResponse.json({ error: "Token obrigatório", code: "TOKEN_REQUIRED" }, { status: 400 });
  }
  if (!executionReport || typeof executionReport !== "string" || !executionReport.trim()) {
    return NextResponse.json({ error: "Relatório de execução obrigatório", code: "REPORT_REQUIRED" }, { status: 400 });
  }
  if (photoFiles.length === 0) {
    return NextResponse.json({ error: "Pelo menos 1 foto de evidência é obrigatória", code: "PHOTOS_REQUIRED" }, { status: 400 });
  }

  const lat = latRaw ? parseFloat(latRaw as string) : undefined;
  const lng = lngRaw ? parseFloat(lngRaw as string) : undefined;

  // Validar token
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

  // Validar estado da OS
  const serviceOrder = await db.serviceOrder.findUnique({
    where:  { id },
    select: { id: true, status: true },
  });

  if (!serviceOrder) {
    return NextResponse.json({ error: "OS não encontrada" }, { status: 404 });
  }
  if (serviceOrder.status !== "IN_PROGRESS") {
    return NextResponse.json(
      { error: "OS precisa estar em andamento para ser concluída", code: "INVALID_STATUS" },
      { status: 400 },
    );
  }

  // Upload das fotos para o Supabase Storage
  let photoUrls: string[];
  try {
    photoUrls = await Promise.all(photoFiles.map((f) => uploadOsPhoto(f, id)));
  } catch (err) {
    console.error("[finish-by-provider] upload error:", err);
    return NextResponse.json({ error: "Falha no upload das fotos. Tente novamente.", code: "UPLOAD_FAILED" }, { status: 500 });
  }

  const now = new Date();

  await db.$transaction(async (tx) => {
    await tx.serviceOrder.update({
      where: { id },
      data: {
        status:          "DONE",
        completedAt:     now,
        executionReport: executionReport.trim(),
        photos:          { push: photoUrls },
      },
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
      fromStatus: "IN_PROGRESS",
      toStatus:   "DONE",
      lat,
      lng,
      metadata: {
        source:     "provider_finish",
        photoCount: photoUrls.length,
        token:      providerToken.id,
      },
    });
  });

  return NextResponse.json({ ok: true });
}
