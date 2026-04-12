import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { withAuth } from "@/lib/rbac";
import { logActivity } from "@/lib/activity-logger";
import { uploadOsPhoto } from "@/lib/supabase-storage";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export const POST = withAuth(
  async (req, session, { params }: RouteContext) => {
    const { role, unitIds, id: userId, name: userName } = session.user;
    const { id } = await params;

    let formData: FormData;
    try {
      formData = await req.formData();
    } catch {
      return NextResponse.json(
        { error: "Formato inválido — multipart/form-data esperado", code: "INVALID_FORMAT" },
        { status: 400 },
      );
    }

    const executionReport = formData.get("executionReport");
    const photoFiles      = formData.getAll("photos") as File[];

    if (!executionReport || typeof executionReport !== "string" || !executionReport.trim()) {
      return NextResponse.json(
        { error: "Relatório de execução obrigatório", code: "REPORT_REQUIRED" },
        { status: 400 },
      );
    }

    const serviceOrder = await db.serviceOrder.findUnique({
      where:  { id },
      select: { id: true, status: true, unitId: true },
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

    if (role === "RECEPTIONIST" && !unitIds.includes(serviceOrder.unitId)) {
      return NextResponse.json({ error: "Sem permissão" }, { status: 403 });
    }

    // Upload das fotos (opcional — gestor pode concluir sem fotos)
    let photoUrls: string[] = [];
    if (photoFiles.length > 0) {
      try {
        photoUrls = await Promise.all(photoFiles.map((f) => uploadOsPhoto(f, id)));
      } catch (err) {
        console.error("[finish-manual] upload error:", err);
        return NextResponse.json(
          { error: "Falha no upload das fotos. Tente novamente.", code: "UPLOAD_FAILED" },
          { status: 500 },
        );
      }
    }

    const now = new Date();

    await db.$transaction(async (tx) => {
      await tx.serviceOrder.update({
        where: { id },
        data: {
          status:          "DONE",
          completedAt:     now,
          executionReport: executionReport.trim(),
          ...(photoUrls.length > 0 ? { photos: { push: photoUrls } } : {}),
        },
      });
      await logActivity({
        tx,
        entityType:      "SERVICE_ORDER",
        entityId:        id,
        action:          "STATUS_CHANGED",
        fromStatus:      "IN_PROGRESS",
        toStatus:        "DONE",
        performedById:   userId,
        performedByName: userName ?? null,
        metadata: {
          source:     "manual_finish",
          photoCount: photoUrls.length,
        },
      });
    });

    return NextResponse.json({ ok: true });
  },
  ["ADMIN", "RECEPTIONIST"],
);
