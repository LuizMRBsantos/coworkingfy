import { vi, describe, test, expect, beforeEach } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/lib/auth", () => ({ auth: vi.fn() }));
vi.mock("@/lib/db", () => ({
  db: {
    ticket: {
      findMany:  vi.fn(),
      findUnique: vi.fn(),
      count:     vi.fn(),
      create:    vi.fn(),
      update:    vi.fn(),
    },
    $transaction: vi.fn(),
  },
}));

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { GET, POST } from "@/app/api/tickets/route";
import { GET as GET_ID, PUT } from "@/app/api/tickets/[id]/route";

// ── Sessões ───────────────────────────────────────────────────────────────────

const adminSession = {
  user: { id: "admin-id", role: "ADMIN" as const, unitIds: [], name: "Admin", email: "admin@test.com" },
};
const receptionistSession = {
  user: { id: "recep-id", role: "RECEPTIONIST" as const, unitIds: ["unit-1"], name: "Recep", email: "recep@test.com" },
};
const memberSession = {
  user: { id: "member-id", role: "MEMBER" as const, unitIds: [], name: "Member", email: "member@test.com" },
};

// ── Mock de ticket ────────────────────────────────────────────────────────────

const mockTicket = {
  id: "ticket-1",
  number: "TK-2026-0001",
  unitId: "unit-1",
  description: "Problema elétrico no corredor",
  priority: "HIGH",
  status: "OPEN",
  externalTicketId: null,
  createdById: "admin-id",
  createdAt: new Date(),
  updatedAt: new Date(),
  unit: { id: "unit-1", name: "Prudential CG" },
  createdBy: { id: "admin-id", name: "Admin" },
  _count: { serviceOrders: 0 },
};

function makeReq(url = "http://localhost/api/tickets", opts?: RequestInit) {
  return new NextRequest(url, opts);
}

// ── GET /api/tickets ──────────────────────────────────────────────────────────

describe("GET /api/tickets", () => {
  beforeEach(() => vi.clearAllMocks());

  test("401 sem sessão", async () => {
    vi.mocked(auth).mockResolvedValue(null);
    const res = await GET(makeReq());
    expect(res.status).toBe(401);
  });

  test("403 para MEMBER", async () => {
    vi.mocked(auth).mockResolvedValue(memberSession as never);
    const res = await GET(makeReq());
    expect(res.status).toBe(403);
  });

  test("ADMIN recebe todos os tickets", async () => {
    vi.mocked(auth).mockResolvedValue(adminSession as never);
    vi.mocked(db.ticket.findMany).mockResolvedValue([mockTicket] as never);
    vi.mocked(db.ticket.count).mockResolvedValue(1 as never);
    const res = await GET(makeReq());
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.data).toHaveLength(1);
    expect(json.data[0].number).toBe("TK-2026-0001");
    expect(json.meta.total).toBe(1);
  });

  test("RECEPTIONIST filtra por suas unidades", async () => {
    vi.mocked(auth).mockResolvedValue(receptionistSession as never);
    vi.mocked(db.ticket.findMany).mockResolvedValue([mockTicket] as never);
    vi.mocked(db.ticket.count).mockResolvedValue(1 as never);
    const res = await GET(makeReq());
    expect(res.status).toBe(200);
    expect(vi.mocked(db.ticket.findMany)).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ unitId: { in: ["unit-1"] } }),
      })
    );
  });

  test("ADMIN filtra por unitId via query param", async () => {
    vi.mocked(auth).mockResolvedValue(adminSession as never);
    vi.mocked(db.ticket.findMany).mockResolvedValue([mockTicket] as never);
    vi.mocked(db.ticket.count).mockResolvedValue(1 as never);
    const res = await GET(makeReq("http://localhost/api/tickets?unitId=unit-1"));
    expect(res.status).toBe(200);
    expect(vi.mocked(db.ticket.findMany)).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ unitId: "unit-1" }),
      })
    );
  });

  test("filtra por status", async () => {
    vi.mocked(auth).mockResolvedValue(adminSession as never);
    vi.mocked(db.ticket.findMany).mockResolvedValue([mockTicket] as never);
    vi.mocked(db.ticket.count).mockResolvedValue(1 as never);
    await GET(makeReq("http://localhost/api/tickets?status=OPEN"));
    expect(vi.mocked(db.ticket.findMany)).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ status: "OPEN" }),
      })
    );
  });
});

// ── POST /api/tickets ─────────────────────────────────────────────────────────

describe("POST /api/tickets", () => {
  beforeEach(() => vi.clearAllMocks());

  test("401 sem sessão", async () => {
    vi.mocked(auth).mockResolvedValue(null);
    const res = await POST(makeReq("http://localhost/api/tickets", {
      method: "POST",
      body: JSON.stringify({ unitId: "unit-1", description: "Teste", priority: "HIGH" }),
    }));
    expect(res.status).toBe(401);
  });

  test("403 para RECEPTIONIST", async () => {
    vi.mocked(auth).mockResolvedValue(receptionistSession as never);
    const res = await POST(new Request("http://localhost/api/tickets", {
      method: "POST",
      body: JSON.stringify({ unitId: "unit-1", description: "Problema no corredor sul", priority: "HIGH" }),
    }));
    expect(res.status).toBe(403);
  });

  test("403 para MEMBER", async () => {
    vi.mocked(auth).mockResolvedValue(memberSession as never);
    const res = await POST(new Request("http://localhost/api/tickets", {
      method: "POST",
      body: JSON.stringify({ unitId: "unit-1", description: "Problema no corredor sul", priority: "HIGH" }),
    }));
    expect(res.status).toBe(403);
  });

  test("400 com dados inválidos — descrição curta", async () => {
    vi.mocked(auth).mockResolvedValue(adminSession as never);
    const res = await POST(new Request("http://localhost/api/tickets", {
      method: "POST",
      body: JSON.stringify({ unitId: "unit-1", description: "curto", priority: "HIGH" }),
    }));
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.code).toBe("VALIDATION_ERROR");
  });

  test("400 sem unitId", async () => {
    vi.mocked(auth).mockResolvedValue(adminSession as never);
    const res = await POST(new Request("http://localhost/api/tickets", {
      method: "POST",
      body: JSON.stringify({ description: "Problema no corredor sul da unidade", priority: "HIGH" }),
    }));
    expect(res.status).toBe(400);
  });

  test("201 cria ticket com sucesso", async () => {
    vi.mocked(auth).mockResolvedValue(adminSession as never);
    vi.mocked(db.$transaction).mockImplementation(async (fn) => fn({
      ticket: { count: vi.fn().mockResolvedValue(0), create: vi.fn().mockResolvedValue(mockTicket) },
    } as never));
    const res = await POST(new Request("http://localhost/api/tickets", {
      method: "POST",
      body: JSON.stringify({
        unitId: "unit-1",
        description: "Problema elétrico no corredor principal da unidade",
        priority: "HIGH",
      }),
    }));
    expect(res.status).toBe(201);
  });
});

// ── GET /api/tickets/[id] ─────────────────────────────────────────────────────

describe("GET /api/tickets/[id]", () => {
  beforeEach(() => vi.clearAllMocks());

  test("401 sem sessão", async () => {
    vi.mocked(auth).mockResolvedValue(null);
    const res = await GET_ID(makeReq(), { params: Promise.resolve({ id: "ticket-1" }) });
    expect(res.status).toBe(401);
  });

  test("403 para MEMBER", async () => {
    vi.mocked(auth).mockResolvedValue(memberSession as never);
    const res = await GET_ID(makeReq(), { params: Promise.resolve({ id: "ticket-1" }) });
    expect(res.status).toBe(403);
  });

  test("404 quando ticket não existe", async () => {
    vi.mocked(auth).mockResolvedValue(adminSession as never);
    vi.mocked(db.ticket.findUnique).mockResolvedValue(null);
    const res = await GET_ID(makeReq(), { params: Promise.resolve({ id: "nao-existe" }) });
    expect(res.status).toBe(404);
  });

  test("200 retorna ticket com detalhes", async () => {
    vi.mocked(auth).mockResolvedValue(adminSession as never);
    vi.mocked(db.ticket.findUnique).mockResolvedValue({
      ...mockTicket,
      serviceOrders: [],
    } as never);
    const res = await GET_ID(makeReq(), { params: Promise.resolve({ id: "ticket-1" }) });
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.number).toBe("TK-2026-0001");
  });
});

// ── PUT /api/tickets/[id] ─────────────────────────────────────────────────────

describe("PUT /api/tickets/[id]", () => {
  beforeEach(() => vi.clearAllMocks());

  test("401 sem sessão", async () => {
    vi.mocked(auth).mockResolvedValue(null);
    const res = await PUT(
      new Request("http://localhost/api/tickets/ticket-1", {
        method: "PUT",
        body: JSON.stringify({ status: "IN_PROGRESS" }),
      }),
      { params: Promise.resolve({ id: "ticket-1" }) }
    );
    expect(res.status).toBe(401);
  });

  test("403 para MEMBER", async () => {
    vi.mocked(auth).mockResolvedValue(memberSession as never);
    const res = await PUT(
      new Request("http://localhost/api/tickets/ticket-1", {
        method: "PUT",
        body: JSON.stringify({ status: "IN_PROGRESS" }),
      }),
      { params: Promise.resolve({ id: "ticket-1" }) }
    );
    expect(res.status).toBe(403);
  });

  test("404 quando ticket não existe", async () => {
    vi.mocked(auth).mockResolvedValue(adminSession as never);
    vi.mocked(db.ticket.findUnique).mockResolvedValue(null);
    const res = await PUT(
      new Request("http://localhost/api/tickets/nao-existe", {
        method: "PUT",
        body: JSON.stringify({ status: "IN_PROGRESS" }),
      }),
      { params: Promise.resolve({ id: "nao-existe" }) }
    );
    expect(res.status).toBe(404);
  });

  test("200 ADMIN atualiza status do ticket", async () => {
    vi.mocked(auth).mockResolvedValue(adminSession as never);
    vi.mocked(db.ticket.findUnique).mockResolvedValue(mockTicket as never);
    const updatedTicket = { ...mockTicket, status: "IN_PROGRESS" };
    vi.mocked(db.$transaction).mockImplementation(async (fn) => fn({
      ticket:      { update: vi.fn().mockResolvedValue(updatedTicket) },
      activityLog: { create: vi.fn().mockResolvedValue({}) },
    } as never));
    const res = await PUT(
      new Request("http://localhost/api/tickets/ticket-1", {
        method: "PUT",
        body: JSON.stringify({ status: "IN_PROGRESS" }),
      }),
      { params: Promise.resolve({ id: "ticket-1" }) }
    );
    expect(res.status).toBe(200);
  });
});
