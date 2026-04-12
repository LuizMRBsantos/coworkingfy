import { vi, describe, test, expect, beforeEach } from "vitest";

vi.mock("@/lib/auth", () => ({ auth: vi.fn() }));
vi.mock("@/lib/db", () => ({
  db: {
    user: {
      findMany:   vi.fn(),
      findUnique: vi.fn(),
      create:     vi.fn(),
      update:     vi.fn(),
      delete:     vi.fn(),
    },
    ticket:       { count: vi.fn().mockResolvedValue(0) },
    serviceOrder: { count: vi.fn().mockResolvedValue(0) },
  },
}));
vi.mock("bcryptjs", () => ({
  default: { hash: vi.fn().mockResolvedValue("hashed-password") },
}));

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { GET, POST } from "@/app/api/users/route";
import { GET as GET_ID, PUT, DELETE } from "@/app/api/users/[id]/route";

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

const mockUser = {
  id: "user-1",
  name: "João Alves",
  email: "joao.alves@gmail.com",
  role: "MEMBER",
  active: true,
  createdAt: new Date(),
  userUnits: [],
};

// ── GET /api/users ────────────────────────────────────────────────────────────

describe("GET /api/users", () => {
  beforeEach(() => vi.clearAllMocks());

  test("401 sem sessão", async () => {
    vi.mocked(auth).mockResolvedValue(null);
    const res = await GET();
    expect(res.status).toBe(401);
  });

  test("403 para RECEPTIONIST", async () => {
    vi.mocked(auth).mockResolvedValue(receptionistSession as never);
    const res = await GET();
    expect(res.status).toBe(403);
  });

  test("403 para MEMBER", async () => {
    vi.mocked(auth).mockResolvedValue(memberSession as never);
    const res = await GET();
    expect(res.status).toBe(403);
  });

  test("200 ADMIN lista todos os usuários", async () => {
    vi.mocked(auth).mockResolvedValue(adminSession as never);
    vi.mocked(db.user.findMany).mockResolvedValue([mockUser] as never);
    const res = await GET();
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json).toHaveLength(1);
    expect(json[0].email).toBe("joao.alves@gmail.com");
  });
});

// ── POST /api/users ───────────────────────────────────────────────────────────

describe("POST /api/users", () => {
  beforeEach(() => vi.clearAllMocks());

  const validBody = {
    name: "Maria Silva",
    email: "maria.silva@gmail.com",
    password: "Senha123",
    role: "MEMBER",
    unitIds: [],
  };

  test("401 sem sessão", async () => {
    vi.mocked(auth).mockResolvedValue(null);
    const res = await POST(new Request("http://localhost/api/users", {
      method: "POST", body: JSON.stringify(validBody),
    }));
    expect(res.status).toBe(401);
  });

  test("403 para RECEPTIONIST", async () => {
    vi.mocked(auth).mockResolvedValue(receptionistSession as never);
    const res = await POST(new Request("http://localhost/api/users", {
      method: "POST", body: JSON.stringify(validBody),
    }));
    expect(res.status).toBe(403);
  });

  test("400 com email inválido", async () => {
    vi.mocked(auth).mockResolvedValue(adminSession as never);
    const res = await POST(new Request("http://localhost/api/users", {
      method: "POST",
      body: JSON.stringify({ ...validBody, email: "nao-e-email" }),
    }));
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.code).toBe("VALIDATION_ERROR");
  });

  test("400 com senha curta", async () => {
    vi.mocked(auth).mockResolvedValue(adminSession as never);
    const res = await POST(new Request("http://localhost/api/users", {
      method: "POST",
      body: JSON.stringify({ ...validBody, password: "123" }),
    }));
    expect(res.status).toBe(400);
  });

  test("400 sem nome", async () => {
    vi.mocked(auth).mockResolvedValue(adminSession as never);
    const res = await POST(new Request("http://localhost/api/users", {
      method: "POST",
      body: JSON.stringify({ ...validBody, name: "" }),
    }));
    expect(res.status).toBe(400);
  });

  test("409 quando email já existe", async () => {
    vi.mocked(auth).mockResolvedValue(adminSession as never);
    vi.mocked(db.user.findUnique).mockResolvedValue(mockUser as never);
    const res = await POST(new Request("http://localhost/api/users", {
      method: "POST", body: JSON.stringify(validBody),
    }));
    expect(res.status).toBe(409);
    const json = await res.json();
    expect(json.code).toBe("EMAIL_EXISTS");
  });

  test("201 ADMIN cria usuário com sucesso", async () => {
    vi.mocked(auth).mockResolvedValue(adminSession as never);
    vi.mocked(db.user.findUnique).mockResolvedValue(null);
    vi.mocked(db.user.create).mockResolvedValue(mockUser as never);
    const res = await POST(new Request("http://localhost/api/users", {
      method: "POST", body: JSON.stringify(validBody),
    }));
    expect(res.status).toBe(201);
  });
});

// ── GET /api/users/[id] ───────────────────────────────────────────────────────

describe("GET /api/users/[id]", () => {
  beforeEach(() => vi.clearAllMocks());

  test("401 sem sessão", async () => {
    vi.mocked(auth).mockResolvedValue(null);
    const res = await GET_ID(new Request("http://localhost"), { params: Promise.resolve({ id: "user-1" }) });
    expect(res.status).toBe(401);
  });

  test("403 para MEMBER", async () => {
    vi.mocked(auth).mockResolvedValue(memberSession as never);
    const res = await GET_ID(new Request("http://localhost"), { params: Promise.resolve({ id: "user-1" }) });
    expect(res.status).toBe(403);
  });

  test("404 quando usuário não existe", async () => {
    vi.mocked(auth).mockResolvedValue(adminSession as never);
    vi.mocked(db.user.findUnique).mockResolvedValue(null);
    const res = await GET_ID(new Request("http://localhost"), { params: Promise.resolve({ id: "nao-existe" }) });
    expect(res.status).toBe(404);
  });

  test("200 ADMIN retorna usuário", async () => {
    vi.mocked(auth).mockResolvedValue(adminSession as never);
    vi.mocked(db.user.findUnique).mockResolvedValue(mockUser as never);
    const res = await GET_ID(new Request("http://localhost"), { params: Promise.resolve({ id: "user-1" }) });
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.email).toBe("joao.alves@gmail.com");
  });
});

// ── PUT /api/users/[id] ───────────────────────────────────────────────────────

describe("PUT /api/users/[id]", () => {
  beforeEach(() => vi.clearAllMocks());

  test("401 sem sessão", async () => {
    vi.mocked(auth).mockResolvedValue(null);
    const res = await PUT(
      new Request("http://localhost/api/users/user-1", {
        method: "PUT", body: JSON.stringify({ name: "Novo Nome", email: "novo@gmail.com", role: "MEMBER", unitIds: [] }),
      }),
      { params: Promise.resolve({ id: "user-1" }) }
    );
    expect(res.status).toBe(401);
  });

  test("403 para RECEPTIONIST", async () => {
    vi.mocked(auth).mockResolvedValue(receptionistSession as never);
    const res = await PUT(
      new Request("http://localhost/api/users/user-1", {
        method: "PUT", body: JSON.stringify({ name: "Novo Nome", email: "novo@gmail.com", role: "MEMBER", unitIds: [] }),
      }),
      { params: Promise.resolve({ id: "user-1" }) }
    );
    expect(res.status).toBe(403);
  });

  test("404 quando usuário não existe", async () => {
    vi.mocked(auth).mockResolvedValue(adminSession as never);
    vi.mocked(db.user.findUnique).mockResolvedValue(null);
    const res = await PUT(
      new Request("http://localhost/api/users/nao-existe", {
        method: "PUT", body: JSON.stringify({ name: "Novo Nome", email: "novo@gmail.com", role: "MEMBER", unitIds: [] }),
      }),
      { params: Promise.resolve({ id: "nao-existe" }) }
    );
    expect(res.status).toBe(404);
  });

  test("200 ADMIN atualiza usuário", async () => {
    vi.mocked(auth).mockResolvedValue(adminSession as never);
    vi.mocked(db.user.findUnique).mockResolvedValue(mockUser as never);
    vi.mocked(db.user.update).mockResolvedValue({ ...mockUser, name: "Novo Nome" } as never);
    const res = await PUT(
      new Request("http://localhost/api/users/user-1", {
        method: "PUT", body: JSON.stringify({ name: "Novo Nome", email: "joao.alves@gmail.com", role: "MEMBER", unitIds: [] }),
      }),
      { params: Promise.resolve({ id: "user-1" }) }
    );
    expect(res.status).toBe(200);
  });
});

// ── DELETE /api/users/[id] ────────────────────────────────────────────────────

describe("DELETE /api/users/[id]", () => {
  beforeEach(() => vi.clearAllMocks());

  test("401 sem sessão", async () => {
    vi.mocked(auth).mockResolvedValue(null);
    const res = await DELETE(new Request("http://localhost"), { params: Promise.resolve({ id: "user-1" }) });
    expect(res.status).toBe(401);
  });

  test("403 para RECEPTIONIST", async () => {
    vi.mocked(auth).mockResolvedValue(receptionistSession as never);
    const res = await DELETE(new Request("http://localhost"), { params: Promise.resolve({ id: "user-1" }) });
    expect(res.status).toBe(403);
  });

  test("403 para MEMBER", async () => {
    vi.mocked(auth).mockResolvedValue(memberSession as never);
    const res = await DELETE(new Request("http://localhost"), { params: Promise.resolve({ id: "user-1" }) });
    expect(res.status).toBe(403);
  });

  test("404 quando usuário não existe", async () => {
    vi.mocked(auth).mockResolvedValue(adminSession as never);
    vi.mocked(db.user.findUnique).mockResolvedValue(null);
    const res = await DELETE(new Request("http://localhost"), { params: Promise.resolve({ id: "nao-existe" }) });
    expect(res.status).toBe(404);
  });

  test("200 ADMIN deleta usuário", async () => {
    vi.mocked(auth).mockResolvedValue(adminSession as never);
    vi.mocked(db.user.findUnique).mockResolvedValue(mockUser as never);
    vi.mocked(db.user.delete).mockResolvedValue(mockUser as never);
    const res = await DELETE(new Request("http://localhost"), { params: Promise.resolve({ id: "user-1" }) });
    expect(res.status).toBe(200);
    expect(vi.mocked(db.user.delete)).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: "user-1" } })
    );
  });
});
