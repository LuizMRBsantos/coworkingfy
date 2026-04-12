import { vi, describe, test, expect, beforeEach } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/lib/auth", () => ({ auth: vi.fn() }));
vi.mock("@/lib/db", () => ({
  db: {
    space: {
      findMany:  vi.fn(),
      findUnique: vi.fn(),
      count:     vi.fn(),
      create:    vi.fn(),
      update:    vi.fn(),
    },
    unit: { findUnique: vi.fn() },
  },
}));

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { GET, POST } from "@/app/api/spaces/route";
import { GET as GET_ID, PUT } from "@/app/api/spaces/[id]/route";

// ── Sessões ───────────────────────────────────────────────────────────────────

const adminSession = {
  user: { id: "admin-id", role: "ADMIN" as const, unitIds: [], name: "Admin", email: "admin@test.com" },
};
const receptionistSession = {
  user: { id: "recep-id", role: "RECEPTIONIST" as const, unitIds: ["unit-coworking"], name: "Recep", email: "recep@test.com" },
};
const memberSession = {
  user: { id: "member-id", role: "MEMBER" as const, unitIds: [], name: "Member", email: "member@test.com" },
};

// ── Mocks ─────────────────────────────────────────────────────────────────────

const mockUnit = { id: "unit-coworking", name: "Coworking", type: "COWORKING" };
const mockBtsUnit = { id: "unit-bts", name: "Prudential CG", type: "BTS" };

const mockSpace = {
  id: "space-1",
  unitId: "unit-coworking",
  name: "Sala de Reunião — Ipê",
  description: "Sala para 8 pessoas",
  capacity: 8,
  type: "MEETING_ROOM",
  status: "ACTIVE",
  createdAt: new Date(),
  updatedAt: new Date(),
  unit: { id: "unit-coworking", name: "Coworking" },
  _count: { bookings: 3, serviceOrders: 0 },
};

function makeReq(url = "http://localhost/api/spaces", opts?: RequestInit) {
  return new NextRequest(url, opts);
}

// ── GET /api/spaces ───────────────────────────────────────────────────────────

describe("GET /api/spaces", () => {
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

  test("200 ADMIN lista todos os espaços", async () => {
    vi.mocked(auth).mockResolvedValue(adminSession as never);
    vi.mocked(db.space.findMany).mockResolvedValue([mockSpace] as never);
    vi.mocked(db.space.count).mockResolvedValue(1 as never);
    const res = await GET(makeReq());
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.data).toHaveLength(1);
    expect(json.data[0].name).toBe("Sala de Reunião — Ipê");
    expect(json.meta.total).toBe(1);
  });

  test("200 RECEPTIONIST filtra por suas unidades", async () => {
    vi.mocked(auth).mockResolvedValue(receptionistSession as never);
    vi.mocked(db.space.findMany).mockResolvedValue([mockSpace] as never);
    vi.mocked(db.space.count).mockResolvedValue(1 as never);
    const res = await GET(makeReq());
    expect(res.status).toBe(200);
    expect(vi.mocked(db.space.findMany)).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ unitId: { in: ["unit-coworking"] } }),
      })
    );
  });

  test("filtra por tipo", async () => {
    vi.mocked(auth).mockResolvedValue(adminSession as never);
    vi.mocked(db.space.findMany).mockResolvedValue([mockSpace] as never);
    vi.mocked(db.space.count).mockResolvedValue(1 as never);
    await GET(makeReq("http://localhost/api/spaces?type=MEETING_ROOM"));
    expect(vi.mocked(db.space.findMany)).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ type: "MEETING_ROOM" }),
      })
    );
  });

  test("filtra por status", async () => {
    vi.mocked(auth).mockResolvedValue(adminSession as never);
    vi.mocked(db.space.findMany).mockResolvedValue([mockSpace] as never);
    vi.mocked(db.space.count).mockResolvedValue(1 as never);
    await GET(makeReq("http://localhost/api/spaces?status=MAINTENANCE"));
    expect(vi.mocked(db.space.findMany)).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ status: "MAINTENANCE" }),
      })
    );
  });
});

// ── POST /api/spaces ──────────────────────────────────────────────────────────

describe("POST /api/spaces", () => {
  beforeEach(() => vi.clearAllMocks());

  const validBody = {
    unitId: "unit-coworking",
    name: "Nova Sala",
    capacity: 6,
    type: "MEETING_ROOM",
  };

  test("401 sem sessão", async () => {
    vi.mocked(auth).mockResolvedValue(null);
    const res = await POST(new Request("http://localhost/api/spaces", {
      method: "POST", body: JSON.stringify(validBody),
    }));
    expect(res.status).toBe(401);
  });

  test("403 para RECEPTIONIST", async () => {
    vi.mocked(auth).mockResolvedValue(receptionistSession as never);
    const res = await POST(new Request("http://localhost/api/spaces", {
      method: "POST", body: JSON.stringify(validBody),
    }));
    expect(res.status).toBe(403);
  });

  test("403 para MEMBER", async () => {
    vi.mocked(auth).mockResolvedValue(memberSession as never);
    const res = await POST(new Request("http://localhost/api/spaces", {
      method: "POST", body: JSON.stringify(validBody),
    }));
    expect(res.status).toBe(403);
  });

  test("400 com dados inválidos — sem nome", async () => {
    vi.mocked(auth).mockResolvedValue(adminSession as never);
    const res = await POST(new Request("http://localhost/api/spaces", {
      method: "POST", body: JSON.stringify({ unitId: "unit-1", capacity: 4, type: "MEETING_ROOM" }),
    }));
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.code).toBe("VALIDATION_ERROR");
  });

  test("400 capacidade inválida (zero)", async () => {
    vi.mocked(auth).mockResolvedValue(adminSession as never);
    const res = await POST(new Request("http://localhost/api/spaces", {
      method: "POST",
      body: JSON.stringify({ unitId: "unit-1", name: "Sala", capacity: 0, type: "MEETING_ROOM" }),
    }));
    expect(res.status).toBe(400);
  });

  test("404 quando unidade não existe", async () => {
    vi.mocked(auth).mockResolvedValue(adminSession as never);
    vi.mocked(db.unit.findUnique).mockResolvedValue(null);
    const res = await POST(new Request("http://localhost/api/spaces", {
      method: "POST", body: JSON.stringify(validBody),
    }));
    expect(res.status).toBe(404);
  });

  test("400 quando unidade não é COWORKING", async () => {
    vi.mocked(auth).mockResolvedValue(adminSession as never);
    vi.mocked(db.unit.findUnique).mockResolvedValue(mockBtsUnit as never);
    const res = await POST(new Request("http://localhost/api/spaces", {
      method: "POST",
      body: JSON.stringify({ ...validBody, unitId: "unit-bts" }),
    }));
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.code).toBe("INVALID_UNIT_TYPE");
  });

  test("201 cria espaço com sucesso em unidade COWORKING", async () => {
    vi.mocked(auth).mockResolvedValue(adminSession as never);
    vi.mocked(db.unit.findUnique).mockResolvedValue(mockUnit as never);
    vi.mocked(db.space.create).mockResolvedValue(mockSpace as never);
    const res = await POST(new Request("http://localhost/api/spaces", {
      method: "POST", body: JSON.stringify(validBody),
    }));
    expect(res.status).toBe(201);
    const json = await res.json();
    expect(json.name).toBe("Sala de Reunião — Ipê");
  });
});

// ── GET /api/spaces/[id] ──────────────────────────────────────────────────────

describe("GET /api/spaces/[id]", () => {
  beforeEach(() => vi.clearAllMocks());

  test("401 sem sessão", async () => {
    vi.mocked(auth).mockResolvedValue(null);
    const res = await GET_ID(makeReq(), { params: Promise.resolve({ id: "space-1" }) });
    expect(res.status).toBe(401);
  });

  test("200 MEMBER consegue ver espaço individual (necessário para reservas)", async () => {
    vi.mocked(auth).mockResolvedValue(memberSession as never);
    vi.mocked(db.space.findUnique).mockResolvedValue(mockSpace as never);
    const res = await GET_ID(makeReq(), { params: Promise.resolve({ id: "space-1" }) });
    expect(res.status).toBe(200);
  });

  test("404 quando espaço não existe", async () => {
    vi.mocked(auth).mockResolvedValue(adminSession as never);
    vi.mocked(db.space.findUnique).mockResolvedValue(null);
    const res = await GET_ID(makeReq(), { params: Promise.resolve({ id: "nao-existe" }) });
    expect(res.status).toBe(404);
  });

  test("200 retorna espaço com detalhes", async () => {
    vi.mocked(auth).mockResolvedValue(adminSession as never);
    vi.mocked(db.space.findUnique).mockResolvedValue(mockSpace as never);
    const res = await GET_ID(makeReq(), { params: Promise.resolve({ id: "space-1" }) });
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.id).toBe("space-1");
  });
});

// ── PUT /api/spaces/[id] ──────────────────────────────────────────────────────

describe("PUT /api/spaces/[id]", () => {
  beforeEach(() => vi.clearAllMocks());

  test("401 sem sessão", async () => {
    vi.mocked(auth).mockResolvedValue(null);
    const res = await PUT(
      new Request("http://localhost/api/spaces/space-1", {
        method: "PUT", body: JSON.stringify({ status: "MAINTENANCE" }),
      }),
      { params: Promise.resolve({ id: "space-1" }) }
    );
    expect(res.status).toBe(401);
  });

  test("403 para RECEPTIONIST", async () => {
    vi.mocked(auth).mockResolvedValue(receptionistSession as never);
    const res = await PUT(
      new Request("http://localhost/api/spaces/space-1", {
        method: "PUT", body: JSON.stringify({ status: "MAINTENANCE" }),
      }),
      { params: Promise.resolve({ id: "space-1" }) }
    );
    expect(res.status).toBe(403);
  });

  test("404 quando espaço não existe", async () => {
    vi.mocked(auth).mockResolvedValue(adminSession as never);
    vi.mocked(db.space.findUnique).mockResolvedValue(null);
    const res = await PUT(
      new Request("http://localhost/api/spaces/nao-existe", {
        method: "PUT", body: JSON.stringify({ status: "MAINTENANCE" }),
      }),
      { params: Promise.resolve({ id: "nao-existe" }) }
    );
    expect(res.status).toBe(404);
  });

  test("200 ADMIN atualiza espaço", async () => {
    vi.mocked(auth).mockResolvedValue(adminSession as never);
    vi.mocked(db.space.findUnique).mockResolvedValue(mockSpace as never);
    vi.mocked(db.space.update).mockResolvedValue({ ...mockSpace, status: "MAINTENANCE" } as never);
    const res = await PUT(
      new Request("http://localhost/api/spaces/space-1", {
        method: "PUT",
        body: JSON.stringify({
          name: "Sala de Reunião — Ipê",
          capacity: 8,
          type: "MEETING_ROOM",
          status: "MAINTENANCE",
        }),
      }),
      { params: Promise.resolve({ id: "space-1" }) }
    );
    expect(res.status).toBe(200);
  });
});
