import { vi, describe, test, expect, beforeEach } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/lib/auth", () => ({ auth: vi.fn() }));
vi.mock("@/lib/db", () => ({
  db: {
    provider: {
      findMany:  vi.fn(),
      findUnique: vi.fn(),
      count:     vi.fn(),
      create:    vi.fn(),
      update:    vi.fn(),
    },
  },
}));

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { GET, POST } from "@/app/api/providers/route";
import { GET as GET_ID, PUT } from "@/app/api/providers/[id]/route";

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

// ── Mocks ─────────────────────────────────────────────────────────────────────

const mockProvider = {
  id: "provider-1",
  unitId: "unit-1",
  name: "Limpeza Total",
  specialty: "CLEANING",
  type: "RECURRING",
  status: "ACTIVE",
  phone: "(83) 99999-0000",
  email: "limpeza@total.com",
  createdAt: new Date(),
  unit: { id: "unit-1", name: "Coworking" },
  _count: { serviceOrders: 2 },
};

function makeReq(url = "http://localhost/api/providers", opts?: RequestInit) {
  return new NextRequest(url, opts);
}

// ── GET /api/providers ────────────────────────────────────────────────────────

describe("GET /api/providers", () => {
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

  test("200 ADMIN lista todos os prestadores", async () => {
    vi.mocked(auth).mockResolvedValue(adminSession as never);
    vi.mocked(db.provider.findMany).mockResolvedValue([mockProvider] as never);
    vi.mocked(db.provider.count).mockResolvedValue(1 as never);
    const res = await GET(makeReq());
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.data).toHaveLength(1);
    expect(json.data[0].name).toBe("Limpeza Total");
    expect(json.meta.total).toBe(1);
  });

  test("200 RECEPTIONIST filtra por suas unidades", async () => {
    vi.mocked(auth).mockResolvedValue(receptionistSession as never);
    vi.mocked(db.provider.findMany).mockResolvedValue([mockProvider] as never);
    vi.mocked(db.provider.count).mockResolvedValue(1 as never);
    const res = await GET(makeReq());
    expect(res.status).toBe(200);
    expect(vi.mocked(db.provider.findMany)).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ unitId: { in: ["unit-1"] } }),
      })
    );
  });

  test("filtra por tipo RECURRING", async () => {
    vi.mocked(auth).mockResolvedValue(adminSession as never);
    vi.mocked(db.provider.findMany).mockResolvedValue([mockProvider] as never);
    vi.mocked(db.provider.count).mockResolvedValue(1 as never);
    await GET(makeReq("http://localhost/api/providers?type=RECURRING"));
    expect(vi.mocked(db.provider.findMany)).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ type: "RECURRING" }),
      })
    );
  });

  test("filtra por especialidade", async () => {
    vi.mocked(auth).mockResolvedValue(adminSession as never);
    vi.mocked(db.provider.findMany).mockResolvedValue([mockProvider] as never);
    vi.mocked(db.provider.count).mockResolvedValue(1 as never);
    await GET(makeReq("http://localhost/api/providers?specialty=CLEANING"));
    expect(vi.mocked(db.provider.findMany)).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ specialty: "CLEANING" }),
      })
    );
  });
});

// ── POST /api/providers ───────────────────────────────────────────────────────

describe("POST /api/providers", () => {
  beforeEach(() => vi.clearAllMocks());

  const validBody = {
    unitId: "unit-1",
    name: "Elétrica Rápida",
    specialty: "ELECTRICAL",
    type: "PUNCTUAL",
  };

  test("401 sem sessão", async () => {
    vi.mocked(auth).mockResolvedValue(null);
    const res = await POST(new Request("http://localhost/api/providers", {
      method: "POST", body: JSON.stringify(validBody),
    }));
    expect(res.status).toBe(401);
  });

  test("403 para MEMBER", async () => {
    vi.mocked(auth).mockResolvedValue(memberSession as never);
    const res = await POST(new Request("http://localhost/api/providers", {
      method: "POST", body: JSON.stringify(validBody),
    }));
    expect(res.status).toBe(403);
  });

  test("400 com dados inválidos — sem nome", async () => {
    vi.mocked(auth).mockResolvedValue(adminSession as never);
    const res = await POST(new Request("http://localhost/api/providers", {
      method: "POST",
      body: JSON.stringify({ unitId: "unit-1", specialty: "ELECTRICAL", type: "PUNCTUAL" }),
    }));
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.code).toBe("VALIDATION_ERROR");
  });

  test("400 com email inválido", async () => {
    vi.mocked(auth).mockResolvedValue(adminSession as never);
    const res = await POST(new Request("http://localhost/api/providers", {
      method: "POST",
      body: JSON.stringify({ ...validBody, email: "nao-e-email" }),
    }));
    expect(res.status).toBe(400);
  });

  test("403 RECEPTIONIST tenta criar em unidade diferente da sua", async () => {
    vi.mocked(auth).mockResolvedValue(receptionistSession as never);
    const res = await POST(new Request("http://localhost/api/providers", {
      method: "POST",
      body: JSON.stringify({ ...validBody, unitId: "unit-outra" }),
    }));
    expect(res.status).toBe(403);
  });

  test("201 ADMIN cria prestador com sucesso", async () => {
    vi.mocked(auth).mockResolvedValue(adminSession as never);
    vi.mocked(db.provider.create).mockResolvedValue(mockProvider as never);
    const res = await POST(new Request("http://localhost/api/providers", {
      method: "POST", body: JSON.stringify(validBody),
    }));
    expect(res.status).toBe(201);
  });

  test("201 RECEPTIONIST cria prestador na sua unidade", async () => {
    vi.mocked(auth).mockResolvedValue(receptionistSession as never);
    vi.mocked(db.provider.create).mockResolvedValue(mockProvider as never);
    const res = await POST(new Request("http://localhost/api/providers", {
      method: "POST", body: JSON.stringify(validBody),
    }));
    expect(res.status).toBe(201);
  });
});

// ── GET /api/providers/[id] ───────────────────────────────────────────────────

describe("GET /api/providers/[id]", () => {
  beforeEach(() => vi.clearAllMocks());

  test("401 sem sessão", async () => {
    vi.mocked(auth).mockResolvedValue(null);
    const res = await GET_ID(makeReq(), { params: Promise.resolve({ id: "provider-1" }) });
    expect(res.status).toBe(401);
  });

  test("403 para MEMBER", async () => {
    vi.mocked(auth).mockResolvedValue(memberSession as never);
    const res = await GET_ID(makeReq(), { params: Promise.resolve({ id: "provider-1" }) });
    expect(res.status).toBe(403);
  });

  test("404 quando prestador não existe", async () => {
    vi.mocked(auth).mockResolvedValue(adminSession as never);
    vi.mocked(db.provider.findUnique).mockResolvedValue(null);
    const res = await GET_ID(makeReq(), { params: Promise.resolve({ id: "nao-existe" }) });
    expect(res.status).toBe(404);
  });

  test("200 retorna prestador", async () => {
    vi.mocked(auth).mockResolvedValue(adminSession as never);
    vi.mocked(db.provider.findUnique).mockResolvedValue(mockProvider as never);
    const res = await GET_ID(makeReq(), { params: Promise.resolve({ id: "provider-1" }) });
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.id).toBe("provider-1");
  });
});

// ── PUT /api/providers/[id] ───────────────────────────────────────────────────

describe("PUT /api/providers/[id]", () => {
  beforeEach(() => vi.clearAllMocks());

  test("401 sem sessão", async () => {
    vi.mocked(auth).mockResolvedValue(null);
    const res = await PUT(
      new Request("http://localhost/api/providers/provider-1", {
        method: "PUT", body: JSON.stringify({ name: "Novo nome" }),
      }),
      { params: Promise.resolve({ id: "provider-1" }) }
    );
    expect(res.status).toBe(401);
  });

  test("403 para MEMBER", async () => {
    vi.mocked(auth).mockResolvedValue(memberSession as never);
    const res = await PUT(
      new Request("http://localhost/api/providers/provider-1", {
        method: "PUT", body: JSON.stringify({ name: "Novo nome" }),
      }),
      { params: Promise.resolve({ id: "provider-1" }) }
    );
    expect(res.status).toBe(403);
  });

  test("403 RECEPTIONIST edita prestador de unidade diferente", async () => {
    vi.mocked(auth).mockResolvedValue(receptionistSession as never);
    vi.mocked(db.provider.findUnique).mockResolvedValue(
      { ...mockProvider, unitId: "unit-outra" } as never
    );
    const res = await PUT(
      new Request("http://localhost/api/providers/provider-1", {
        method: "PUT", body: JSON.stringify({ name: "Atualizado" }),
      }),
      { params: Promise.resolve({ id: "provider-1" }) }
    );
    expect(res.status).toBe(403);
  });

  test("404 quando prestador não existe", async () => {
    vi.mocked(auth).mockResolvedValue(adminSession as never);
    vi.mocked(db.provider.findUnique).mockResolvedValue(null);
    const res = await PUT(
      new Request("http://localhost/api/providers/nao-existe", {
        method: "PUT", body: JSON.stringify({ name: "Atualizado" }),
      }),
      { params: Promise.resolve({ id: "nao-existe" }) }
    );
    expect(res.status).toBe(404);
  });

  test("200 ADMIN atualiza prestador", async () => {
    vi.mocked(auth).mockResolvedValue(adminSession as never);
    vi.mocked(db.provider.findUnique).mockResolvedValue(mockProvider as never);
    vi.mocked(db.provider.update).mockResolvedValue({ ...mockProvider, name: "Atualizado" } as never);
    const res = await PUT(
      new Request("http://localhost/api/providers/provider-1", {
        method: "PUT", body: JSON.stringify({ name: "Atualizado", specialty: "CLEANING", type: "RECURRING" }),
      }),
      { params: Promise.resolve({ id: "provider-1" }) }
    );
    expect(res.status).toBe(200);
  });
});
