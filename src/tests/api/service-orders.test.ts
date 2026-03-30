import { vi, describe, test, expect, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// Mocks declarados antes dos imports dos módulos
vi.mock("@/lib/auth", () => ({ auth: vi.fn() }));
vi.mock("@/lib/db", () => ({
  db: {
    serviceOrder: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      count: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    $transaction: vi.fn(),
  },
}));

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { GET, POST } from "@/app/api/service-orders/route";
import { PUT } from "@/app/api/service-orders/[id]/route";

// ── Sessões ──────────────────────────────────────────────────────────────────

const adminSession = {
  user: { id: "admin-id", role: "ADMIN" as const, unitId: null, name: "Admin", email: "admin@test.com" },
};
const receptionistSession = {
  user: { id: "recep-id", role: "RECEPTIONIST" as const, unitId: "unit-1", name: "Recep", email: "recep@test.com" },
};
const memberSession = {
  user: { id: "member-id", role: "MEMBER" as const, unitId: "unit-1", name: "Member", email: "member@test.com" },
};

// ── Dados de teste ────────────────────────────────────────────────────────────

const mockOS = {
  id: "so-1",
  number: "OS-2026-0001",
  ticketId: "ticket-1",
  unitId: "unit-1",
  status: "DRAFT" as const,
  serviceType: "CLEANING" as const,
  description: "Limpeza geral da sala",
  createdById: "recep-id",
  providerId: null,
  approvedById: null,
  approvedAt: null,
  slaDeadline: null,
  spaceId: null,
  scheduledDate: null,
  value: null,
  photos: [],
  createdAt: new Date(),
  updatedAt: new Date(),
  unit: { id: "unit-1", name: "Coworking" },
  createdBy: { id: "recep-id", name: "Recep" },
  ticket: { priority: "HIGH" as const },
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeGetRequest(url = "http://localhost/api/service-orders") {
  return new NextRequest(url);
}

function makePostRequest(body: unknown) {
  return new Request("http://localhost/api/service-orders", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

function makePutRequest(body: unknown) {
  return new Request("http://localhost/api/service-orders/so-1", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

const idParams = Promise.resolve({ id: "so-1" });

// ── Testes ────────────────────────────────────────────────────────────────────

beforeEach(() => {
  vi.clearAllMocks();
});

describe("GET /api/service-orders", () => {
  test("MEMBER recebe 403", async () => {
    vi.mocked(auth).mockResolvedValue(memberSession as never);
    const res = await GET(makeGetRequest());
    expect(res.status).toBe(403);
  });

  test("RECEPTIONIST recebe só OS da sua unidade", async () => {
    vi.mocked(auth).mockResolvedValue(receptionistSession as never);
    vi.mocked(db.serviceOrder.findMany).mockResolvedValue([mockOS] as never);

    const res = await GET(makeGetRequest());
    expect(res.status).toBe(200);

    expect(db.serviceOrder.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ unitId: "unit-1" }) })
    );
  });

  test("ADMIN recebe todas as OS sem filtro de unidade", async () => {
    vi.mocked(auth).mockResolvedValue(adminSession as never);
    vi.mocked(db.serviceOrder.findMany).mockResolvedValue([mockOS] as never);

    const res = await GET(makeGetRequest());
    expect(res.status).toBe(200);

    expect(db.serviceOrder.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.not.objectContaining({ unitId: expect.anything() }) })
    );
  });

  test("ADMIN pode filtrar por unidade via query param", async () => {
    vi.mocked(auth).mockResolvedValue(adminSession as never);
    vi.mocked(db.serviceOrder.findMany).mockResolvedValue([mockOS] as never);

    const res = await GET(makeGetRequest("http://localhost/api/service-orders?unitId=unit-1"));
    expect(res.status).toBe(200);
    expect(db.serviceOrder.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ unitId: "unit-1" }) })
    );
  });
});

describe("POST /api/service-orders", () => {
  const validBody = {
    ticketId: "ticket-1",
    unitId: "unit-1",
    serviceType: "CLEANING",
    description: "Limpeza geral da sala de reunião",
  };

  test("MEMBER recebe 403", async () => {
    vi.mocked(auth).mockResolvedValue(memberSession as never);
    const res = await POST(makePostRequest(validBody));
    expect(res.status).toBe(403);
  });

  test("Dados inválidos retornam 400 com code VALIDATION_ERROR", async () => {
    vi.mocked(auth).mockResolvedValue(receptionistSession as never);
    const res = await POST(makePostRequest({ unitId: "unit-1" })); // sem campos obrigatórios
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.code).toBe("VALIDATION_ERROR");
  });

  test("RECEPTIONIST não cria OS em outra unidade (403)", async () => {
    vi.mocked(auth).mockResolvedValue(receptionistSession as never);
    const res = await POST(makePostRequest({ ...validBody, unitId: "unit-outra" }));
    expect(res.status).toBe(403);
  });

  test("RECEPTIONIST cria OS com status DRAFT", async () => {
    vi.mocked(auth).mockResolvedValue(receptionistSession as never);
    vi.mocked(db.$transaction).mockImplementation(async (fn: Parameters<typeof db.$transaction>[0]) => {
      const mockTx = {
        serviceOrder: {
          count: vi.fn().mockResolvedValue(0),
          create: vi.fn().mockResolvedValue({ ...mockOS, status: "DRAFT" }),
        },
      };
      return fn(mockTx as never);
    });

    const res = await POST(makePostRequest(validBody));
    expect(res.status).toBe(201);
    const json = await res.json();
    expect(json.status).toBe("DRAFT");
    expect(json.number).toMatch(/^OS-\d{4}-\d{4}$/);
  });
});

describe("PUT /api/service-orders/[id]", () => {
  test("Transição inválida retorna 400 com code INVALID_TRANSITION", async () => {
    vi.mocked(auth).mockResolvedValue(adminSession as never);
    vi.mocked(db.serviceOrder.findUnique).mockResolvedValue(mockOS as never); // DRAFT

    // DRAFT → DONE é inválido
    const res = await PUT(makePutRequest({ status: "DONE" }), { params: idParams });
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.code).toBe("INVALID_TRANSITION");
  });

  test("RECEPTIONIST não pode fazer APPROVED (403)", async () => {
    vi.mocked(auth).mockResolvedValue(receptionistSession as never);
    vi.mocked(db.serviceOrder.findUnique).mockResolvedValue({
      ...mockOS,
      status: "PENDING_APPROVAL",
    } as never);

    const res = await PUT(makePutRequest({ status: "APPROVED" }), { params: idParams });
    expect(res.status).toBe(403);
  });

  test("ADMIN pode fazer APPROVED — slaDeadline calculado", async () => {
    vi.mocked(auth).mockResolvedValue(adminSession as never);
    vi.mocked(db.serviceOrder.findUnique).mockResolvedValue({
      ...mockOS,
      status: "PENDING_APPROVAL",
    } as never);
    vi.mocked(db.serviceOrder.update).mockResolvedValue({
      ...mockOS,
      status: "APPROVED",
      approvedById: "admin-id",
      approvedAt: new Date(),
      slaDeadline: new Date(Date.now() + 48 * 60 * 60 * 1000), // HIGH = 48h
    } as never);

    const res = await PUT(makePutRequest({ status: "APPROVED" }), { params: idParams });
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.status).toBe("APPROVED");
    expect(json.slaDeadline).toBeTruthy();

    expect(db.serviceOrder.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          approvedById: "admin-id",
          approvedAt: expect.any(Date),
          slaDeadline: expect.any(Date),
        }),
      })
    );
  });

  test("CANCELLED funciona a partir de DRAFT", async () => {
    vi.mocked(auth).mockResolvedValue(receptionistSession as never);
    vi.mocked(db.serviceOrder.findUnique).mockResolvedValue(mockOS as never); // DRAFT
    vi.mocked(db.serviceOrder.update).mockResolvedValue({
      ...mockOS,
      status: "CANCELLED",
    } as never);

    const res = await PUT(makePutRequest({ status: "CANCELLED" }), { params: idParams });
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.status).toBe("CANCELLED");
  });

  test("CANCELLED funciona a partir de IN_PROGRESS", async () => {
    vi.mocked(auth).mockResolvedValue(adminSession as never);
    vi.mocked(db.serviceOrder.findUnique).mockResolvedValue({
      ...mockOS,
      status: "IN_PROGRESS",
    } as never);
    vi.mocked(db.serviceOrder.update).mockResolvedValue({
      ...mockOS,
      status: "CANCELLED",
    } as never);

    const res = await PUT(makePutRequest({ status: "CANCELLED" }), { params: idParams });
    expect(res.status).toBe(200);
  });
});
