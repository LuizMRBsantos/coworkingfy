import { NextResponse } from "next/server";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { withAuth } from "@/lib/rbac";
import { uploadUnitDocument, getUnitDocumentSignedUrl } from "@/lib/supabase-storage";
import type { UnitChecklistItemType } from "@prisma/client";

// Todos os 6 tipos canônicos — usados para montar a lista completa mesmo sem rows no banco
const ALL_ITEM_TYPES: UnitChecklistItemType[] = [
  "UNIT_CONTRACT",
  "CLEANING_CONTRACT",
  "INTERNET_CONTRACT",
  "EQUIPMENT_INVENTORY",
  "LEASE_CONTRACT",
  "PRINTER_CONTRACT",
];

interface RouteContext {
  params: Promise<{ id: string }>;
}

// GET — lista o checklist completo com status de completude
export const GET = withAuth(
  async (_req, session, { params }: RouteContext) => {
    const { role, unitIds } = session.user;
    const { id: unitId } = await params;

    if (role === "RECEPTIONIST" && !unitIds.includes(unitId)) {
      return NextResponse.json({ error: "Sem permissão" }, { status: 403 });
    }

    const [unit, rows, assetCount] = await Promise.all([
      db.unit.findUnique({ where: { id: unitId }, select: { id: true } }),
      db.unitChecklistItem.findMany({ where: { unitId } }),
      db.asset.count({ where: { unitId, status: { not: "DECOMMISSIONED" } } }),
    ]);

    if (!unit) return NextResponse.json({ error: "Unidade não encontrada" }, { status: 404 });

    // Gera signed URLs para itens com documentUrl
    const rowsWithUrls = await Promise.all(
      rows.map(async (row) => {
        if (!row.documentUrl) return { ...row, signedUrl: null };
        try {
          const signedUrl = await getUnitDocumentSignedUrl(row.documentUrl);
          return { ...row, signedUrl };
        } catch {
          return { ...row, signedUrl: null };
        }
      }),
    );

    const rowMap = new Map(rowsWithUrls.map((r) => [r.itemType, r]));

    // Monta a lista completa com os 6 tipos (com ou sem row existente)
    const checklist = ALL_ITEM_TYPES.map((itemType) => {
      const row = rowMap.get(itemType) ?? null;
      const isInventory = itemType === "EQUIPMENT_INVENTORY";
      const isComplete = isInventory
        ? assetCount > 0 || row?.documentUrl != null
        : row?.documentUrl != null;

      return {
        itemType,
        id:          row?.id ?? null,
        documentUrl: row?.documentUrl ?? null,
        fileName:    row?.fileName ?? null,
        uploadedAt:  row?.uploadedAt ?? null,
        notes:       row?.notes ?? null,
        signedUrl:   (row as (typeof rowsWithUrls)[0] | null)?.signedUrl ?? null,
        isComplete,
        ...(isInventory ? { assetCount } : {}),
      };
    });

    const completedCount = checklist.filter((i) => i.isComplete).length;

    return NextResponse.json({ checklist, completedCount, total: ALL_ITEM_TYPES.length });
  },
  ["ADMIN", "RECEPTIONIST"],
);

const PostSchema = z.object({
  itemType: z.enum([
    "UNIT_CONTRACT",
    "CLEANING_CONTRACT",
    "INTERNET_CONTRACT",
    "EQUIPMENT_INVENTORY",
    "LEASE_CONTRACT",
    "PRINTER_CONTRACT",
  ]),
  notes: z.string().optional(),
});

// POST — faz upload de documento e upsert no checklist
export const POST = withAuth(
  async (req, session, { params }: RouteContext) => {
    const { role, unitIds } = session.user;
    const { id: unitId } = await params;

    if (role === "RECEPTIONIST" && !unitIds.includes(unitId)) {
      return NextResponse.json({ error: "Sem permissão" }, { status: 403 });
    }

    const unit = await db.unit.findUnique({ where: { id: unitId }, select: { id: true } });
    if (!unit) return NextResponse.json({ error: "Unidade não encontrada" }, { status: 404 });

    let formData: FormData;
    try {
      formData = await req.formData();
    } catch {
      return NextResponse.json({ error: "Formato inválido — multipart/form-data esperado" }, { status: 400 });
    }

    const parsed = PostSchema.safeParse({
      itemType: formData.get("itemType"),
      notes:    formData.get("notes") ?? undefined,
    });
    if (!parsed.success) {
      return NextResponse.json({ error: "Dados inválidos", code: "VALIDATION_ERROR" }, { status: 400 });
    }

    const { itemType, notes } = parsed.data;
    const file = formData.get("file") as File | null;

    let documentUrl: string | undefined;
    let fileName: string | undefined;

    if (file && file.size > 0) {
      try {
        documentUrl = await uploadUnitDocument(file, unitId, itemType);
        fileName    = file.name;
      } catch (err) {
        console.error("[checklist] upload error:", err);
        return NextResponse.json({ error: "Falha no upload do documento. Tente novamente.", code: "UPLOAD_FAILED" }, { status: 500 });
      }
    }

    // Upsert com retry para tratar race condition na unique constraint
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        const row = await db.unitChecklistItem.upsert({
          where:  { unitId_itemType: { unitId, itemType } },
          create: {
            unitId,
            itemType,
            documentUrl,
            fileName,
            uploadedAt: documentUrl ? new Date() : undefined,
            notes,
          },
          update: {
            ...(documentUrl ? { documentUrl, fileName, uploadedAt: new Date() } : {}),
            ...(notes !== undefined ? { notes } : {}),
          },
        });
        return NextResponse.json(row, { status: 200 });
      } catch (e) {
        const isUnique = e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002";
        if (isUnique && attempt < 2) continue;
        throw e;
      }
    }

    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  },
  ["ADMIN", "RECEPTIONIST"],
);
