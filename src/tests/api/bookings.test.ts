import { vi, describe, test, expect, beforeEach } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/lib/auth", () => ({ auth: vi.fn() }));
vi.mock("@/lib/db", () => ({
  db: {
    booking: {
      findMany:  vi.fn(),
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      count:     vi.fn(),
      create:    vi.fn(),
      update:    vi.fn(),
    },
    space: { findUnique: vi.fn() },
    $transaction: vi.fn(),
  },
}));

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { GET, POST } from "@/app/api/bookings/route";
import { GET as GET_ID, PUT, DELETE } from "@/app/api/bookings/[id]/route";

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

// ── Dados base ────────────────────────────────────────────────────────────────

const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000);
tomorrow.setHours(9, 0, 0, 0);
const tomorrowEnd = new Date(tomorrow);
tomorrowEnd.setHours(10, 0, 0, 0);

const mockSpace = {
  id: "space-1", name: "Sala A", type: "MEETING_ROOM", status: "ACTIVE",
  unitId: "unit-1",
  unit: { id: "unit-1", name: "Coworking" },
};

const mockBookingPending = {
  id: "booking-1",
  userId: "member-id",
  spaceId: "space-1",
  startTime: tomorrow,
  endTime: tomorrowEnd,
  status: "PENDING_APPROVAL" as const,
  approvedById: null,
  approvedAt: null,
  createdAt: new Date(),
  updatedAt: new Date(),
  space: { id: "space-1", name: "Sala A", type: "MEETING_ROOM", unitId: "unit-1", unit: { id: "unit-1", name: "Coworking" } },
  user: { id: "member-id", name: "Member", email: "member@test.com" },
  approvedBy: null,
};

const mockBookingConfirmed = {
  ...mockBookingPending,
  id: "booking-2",
  status: "CONFIRMED" as const,
  userId: "recep-id",
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function makePostRequest(body: unknown) {
  return new Request("http://localhost/api/bookings", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

function makePutRequest(body: unknown) {
  return new Request("http://localhost/api/bookings/booking-1", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

function makeDeleteRequest() {
  return new Request("http://localhost/api/bookings/booking-1", { method: "DELETE" });
}

const idParams = Promise.resolve({ id: "booking-1" });

const validBody = {
  spaceId: "space-1",
  startTime: tomorrow.toISOString(),
  endTime: tomorrowEnd.toISOString(),
};

// ── beforeEach ────────────────────────────────────────────────────────────────

beforeEach(() => {
  vi.clearAllMocks();
});

// ── GET /api/bookings ─────────────────────────────────────────────────────────

describe("GET /api/bookings", () => {
  test("sem sessão retorna 401", async () => {
    vi.mocked(auth).mockResolvedValue(null as never);
    const res = await GET(new NextRequest("http://localhost/api/bookings"));
    expect(res.status).toBe(401);
  });

  test("MEMBER recebe só as próprias reservas", async () => {
    vi.mocked(auth).mockResolvedValue(memberSession as never);
    vi.mocked(db.booking.findMany).mockResolvedValue([mockBookingPending] as never);
    vi.mocked(db.booking.count).mockResolvedValue(1 as never);

    const res = await GET(new NextRequest("http://localhost/api/bookings"));
    expect(res.status).toBe(200);
    expect(db.booking.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ userId: "member-id" }) })
    );
  });

  test("RECEPTIONIST filtra por unitId da sua unidade", async () => {
    vi.mocked(auth).mockResolvedValue(receptionistSession as never);
    vi.mocked(db.booking.findMany).mockResolvedValue([mockBookingConfirmed] as never);
    vi.mocked(db.booking.count).mockResolvedValue(1 as never);

    const res = await GET(new NextRequest("http://localhost/api/bookings"));
    expect(res.status).toBe(200);
    expect(db.booking.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ space: { unitId: { in: ["unit-1"] } } }),
      })
    );
  });

  test("ADMIN recebe todas sem filtro de userId", async () => {
    vi.mocked(auth).mockResolvedValue(adminSession as never);
    vi.mocked(db.booking.findMany).mockResolvedValue([mockBookingPending, mockBookingConfirmed] as never);
    vi.mocked(db.booking.count).mockResolvedValue(2 as never);

    const res = await GET(new NextRequest("http://localhost/api/bookings"));
    expect(res.status).toBe(200);
    expect(db.booking.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.not.objectContaining({ userId: expect.anything() }) })
    );
  });
});

// ── POST /api/bookings ────────────────────────────────────────────────────────

describe("POST /api/bookings", () => {
  test("sem sessão retorna 401", async () => {
    vi.mocked(auth).mockResolvedValue(null as never);
    const res = await POST(makePostRequest(validBody));
    expect(res.status).toBe(401);
  });

  test("body inválido retorna 400 VALIDATION_ERROR", async () => {
    vi.mocked(auth).mockResolvedValue(memberSession as never);
    const res = await POST(makePostRequest({ spaceId: "" }));
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.code).toBe("VALIDATION_ERROR");
  });

  test("horário fora do funcionamento retorna 400 OUT_OF_HOURS", async () => {
    vi.mocked(auth).mockResolvedValue(memberSession as never);
    const early = new Date(tomorrow);
    early.setHours(5, 0, 0, 0);
    const earlyEnd = new Date(tomorrow);
    earlyEnd.setHours(6, 0, 0, 0);
    const res = await POST(makePostRequest({ spaceId: "space-1", startTime: early.toISOString(), endTime: earlyEnd.toISOString() }));
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.code).toBe("OUT_OF_HOURS");
  });

  test("duração menor que 30min retorna 400 TOO_SHORT", async () => {
    vi.mocked(auth).mockResolvedValue(memberSession as never);
    const start = new Date(tomorrow);
    start.setHours(9, 0, 0, 0);
    const end = new Date(tomorrow);
    end.setHours(9, 20, 0, 0);
    const res = await POST(makePostRequest({ spaceId: "space-1", startTime: start.toISOString(), endTime: end.toISOString() }));
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.code).toBe("TOO_SHORT");
  });

  test("data no passado retorna 400 PAST_DATE", async () => {
    vi.mocked(auth).mockResolvedValue(memberSession as never);
    const past    = new Date(Date.now() - 2 * 60 * 60 * 1000); // 2h atrás
    past.setHours(9, 0, 0, 0);
    const pastEnd = new Date(Date.now() - 1 * 60 * 60 * 1000);
    pastEnd.setHours(10, 0, 0, 0);
    const res = await POST(makePostRequest({ spaceId: "space-1", startTime: past.toISOString(), endTime: pastEnd.toISOString() }));
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.code).toBe("PAST_DATE");
  });

  test("espaço em MAINTENANCE retorna 409 SPACE_MAINTENANCE", async () => {
    vi.mocked(auth).mockResolvedValue(memberSession as never);
    vi.mocked(db.$transaction).mockImplementation(async (fn: Parameters<typeof db.$transaction>[0]) => {
      const mockTx = {
        space:   { findUnique: vi.fn().mockResolvedValue({ ...mockSpace, status: "MAINTENANCE" }) },
        booking: { findFirst: vi.fn(), create: vi.fn() },
      };
      return fn(mockTx as never);
    });
    const res = await POST(makePostRequest(validBody));
    expect(res.status).toBe(409);
    const json = await res.json();
    expect(json.code).toBe("SPACE_MAINTENANCE");
  });

  test("MEMBER cria reserva como PENDING_APPROVAL (sem conflito)", async () => {
    vi.mocked(auth).mockResolvedValue(memberSession as never);
    vi.mocked(db.$transaction).mockImplementation(async (fn: Parameters<typeof db.$transaction>[0]) => {
      const mockTx = {
        space:   { findUnique: vi.fn().mockResolvedValue(mockSpace) },
        booking: {
          findFirst: vi.fn().mockResolvedValue(null),
          create: vi.fn().mockResolvedValue({ ...mockBookingPending, status: "PENDING_APPROVAL" }),
        },
      };
      return fn(mockTx as never);
    });
    const res = await POST(makePostRequest(validBody));
    expect(res.status).toBe(201);
    const json = await res.json();
    expect(json.status).toBe("PENDING_APPROVAL");
  });

  test("STAFF cria reserva como CONFIRMED e verifica conflito", async () => {
    vi.mocked(auth).mockResolvedValue(receptionistSession as never);
    vi.mocked(db.$transaction).mockImplementation(async (fn: Parameters<typeof db.$transaction>[0]) => {
      const mockTx = {
        space:   { findUnique: vi.fn().mockResolvedValue(mockSpace) },
        booking: {
          findFirst: vi.fn().mockResolvedValue(null), // sem conflito
          create: vi.fn().mockResolvedValue({ ...mockBookingConfirmed, status: "CONFIRMED" }),
        },
      };
      return fn(mockTx as never);
    });
    const res = await POST(makePostRequest(validBody));
    expect(res.status).toBe(201);
    const json = await res.json();
    expect(json.status).toBe("CONFIRMED");
  });

  test("STAFF com conflito de horário retorna 409 CONFLICT", async () => {
    vi.mocked(auth).mockResolvedValue(adminSession as never);
    vi.mocked(db.$transaction).mockImplementation(async (fn: Parameters<typeof db.$transaction>[0]) => {
      const mockTx = {
        space:   { findUnique: vi.fn().mockResolvedValue(mockSpace) },
        booking: {
          findFirst: vi.fn().mockResolvedValue(mockBookingConfirmed), // conflito!
          create: vi.fn(),
        },
      };
      return fn(mockTx as never);
    });
    const res = await POST(makePostRequest(validBody));
    expect(res.status).toBe(409);
    const json = await res.json();
    expect(json.code).toBe("CONFLICT");
  });
});

// ── PUT /api/bookings/[id] ────────────────────────────────────────────────────

describe("PUT /api/bookings/[id] — approve/reject/cancel", () => {
  test("MEMBER recebe 403", async () => {
    vi.mocked(auth).mockResolvedValue(memberSession as never);
    const res = await PUT(makePutRequest({ action: "approve" }), { params: idParams });
    expect(res.status).toBe(403);
  });

  test("body sem action retorna 400 VALIDATION_ERROR", async () => {
    vi.mocked(auth).mockResolvedValue(adminSession as never);
    const res = await PUT(makePutRequest({}), { params: idParams });
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.code).toBe("VALIDATION_ERROR");
  });

  test("approve de reserva PENDING_APPROVAL confirma e registra approvedBy", async () => {
    vi.mocked(auth).mockResolvedValue(adminSession as never);
    vi.mocked(db.$transaction).mockImplementation(async (fn: Parameters<typeof db.$transaction>[0]) => {
      const mockTx = {
        booking: {
          findUnique: vi.fn().mockResolvedValue({ ...mockBookingPending, space: { unitId: "unit-1" } }),
          findFirst:  vi.fn().mockResolvedValue(null), // sem conflito
          update:     vi.fn().mockResolvedValue({ ...mockBookingPending, status: "CONFIRMED", approvedById: "admin-id", approvedAt: new Date() }),
        },
      };
      return fn(mockTx as never);
    });

    const res = await PUT(makePutRequest({ action: "approve" }), { params: idParams });
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.status).toBe("CONFIRMED");
    expect(json.approvedById).toBe("admin-id");
  });

  test("approve com conflito de horário retorna 409 CONFLICT", async () => {
    vi.mocked(auth).mockResolvedValue(adminSession as never);
    vi.mocked(db.$transaction).mockImplementation(async (fn: Parameters<typeof db.$transaction>[0]) => {
      const mockTx = {
        booking: {
          findUnique: vi.fn().mockResolvedValue({ ...mockBookingPending, space: { unitId: "unit-1" } }),
          findFirst:  vi.fn().mockResolvedValue(mockBookingConfirmed), // conflito!
          update:     vi.fn(),
        },
      };
      return fn(mockTx as never);
    });

    const res = await PUT(makePutRequest({ action: "approve" }), { params: idParams });
    expect(res.status).toBe(409);
    const json = await res.json();
    expect(json.code).toBe("CONFLICT");
  });

  test("reject de reserva PENDING_APPROVAL atualiza para REJECTED", async () => {
    vi.mocked(auth).mockResolvedValue(receptionistSession as never);
    vi.mocked(db.$transaction).mockImplementation(async (fn: Parameters<typeof db.$transaction>[0]) => {
      const mockTx = {
        booking: {
          findUnique: vi.fn().mockResolvedValue({ ...mockBookingPending, space: { unitId: "unit-1" } }),
          findFirst:  vi.fn(),
          update:     vi.fn().mockResolvedValue({ ...mockBookingPending, status: "REJECTED", approvedById: "recep-id" }),
        },
      };
      return fn(mockTx as never);
    });

    const res = await PUT(makePutRequest({ action: "reject" }), { params: idParams });
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.status).toBe("REJECTED");
  });

  test("RECEPTIONIST não gerencia reservas de outra unidade (403)", async () => {
    vi.mocked(auth).mockResolvedValue(receptionistSession as never); // unitIds: ["unit-1"]
    vi.mocked(db.$transaction).mockImplementation(async (fn: Parameters<typeof db.$transaction>[0]) => {
      const mockTx = {
        booking: {
          findUnique: vi.fn().mockResolvedValue({ ...mockBookingPending, space: { unitId: "unit-outra" } }),
          findFirst: vi.fn(),
          update: vi.fn(),
        },
      };
      return fn(mockTx as never);
    });

    const res = await PUT(makePutRequest({ action: "approve" }), { params: idParams });
    expect(res.status).toBe(403);
  });

  test("approve de reserva que não é PENDING retorna 409 INVALID_STATUS", async () => {
    vi.mocked(auth).mockResolvedValue(adminSession as never);
    vi.mocked(db.$transaction).mockImplementation(async (fn: Parameters<typeof db.$transaction>[0]) => {
      const mockTx = {
        booking: {
          findUnique: vi.fn().mockResolvedValue({ ...mockBookingConfirmed, space: { unitId: "unit-1" } }),
          findFirst: vi.fn(),
          update: vi.fn(),
        },
      };
      return fn(mockTx as never);
    });

    const res = await PUT(makePutRequest({ action: "approve" }), { params: idParams });
    expect(res.status).toBe(409);
    const json = await res.json();
    expect(json.code).toBe("INVALID_STATUS");
  });

  test("cancel funciona para STAFF em qualquer status ativo", async () => {
    vi.mocked(auth).mockResolvedValue(receptionistSession as never);
    vi.mocked(db.$transaction).mockImplementation(async (fn: Parameters<typeof db.$transaction>[0]) => {
      const mockTx = {
        booking: {
          findUnique: vi.fn().mockResolvedValue({ ...mockBookingConfirmed, space: { unitId: "unit-1" } }),
          findFirst: vi.fn(),
          update: vi.fn().mockResolvedValue({ ...mockBookingConfirmed, status: "CANCELLED" }),
        },
      };
      return fn(mockTx as never);
    });

    const res = await PUT(makePutRequest({ action: "cancel" }), { params: idParams });
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.status).toBe("CANCELLED");
  });
});

// ── DELETE /api/bookings/[id] ─────────────────────────────────────────────────

describe("DELETE /api/bookings/[id] — cancelamento pelo MEMBER", () => {
  test("MEMBER cancela a própria reserva PENDING", async () => {
    vi.mocked(auth).mockResolvedValue(memberSession as never);
    vi.mocked(db.booking.findUnique).mockResolvedValue(mockBookingPending as never);
    vi.mocked(db.booking.update).mockResolvedValue({ ...mockBookingPending, status: "CANCELLED" } as never);

    const res = await DELETE(makeDeleteRequest(), { params: idParams });
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.status).toBe("CANCELLED");
  });

  test("MEMBER não cancela reserva de outro usuário (403)", async () => {
    vi.mocked(auth).mockResolvedValue(memberSession as never);
    // reserva pertence ao recepcionista
    vi.mocked(db.booking.findUnique).mockResolvedValue({ ...mockBookingPending, userId: "outro-id" } as never);

    const res = await DELETE(makeDeleteRequest(), { params: idParams });
    expect(res.status).toBe(403);
  });

  test("cancelar reserva já CANCELLED retorna 409 ALREADY_CLOSED", async () => {
    vi.mocked(auth).mockResolvedValue(memberSession as never);
    vi.mocked(db.booking.findUnique).mockResolvedValue({ ...mockBookingPending, status: "CANCELLED" } as never);

    const res = await DELETE(makeDeleteRequest(), { params: idParams });
    expect(res.status).toBe(409);
    const json = await res.json();
    expect(json.code).toBe("ALREADY_CLOSED");
  });

  test("cancelar reserva CONFIRMED com menos de 2h de antecedência retorna 409 TOO_LATE", async () => {
    vi.mocked(auth).mockResolvedValue(memberSession as never);
    // startTime em 30 minutos — menos de 2h
    const soonStart = new Date(Date.now() + 30 * 60 * 1000);
    vi.mocked(db.booking.findUnique).mockResolvedValue({
      ...mockBookingPending,
      status: "CONFIRMED",
      userId: "member-id",
      startTime: soonStart,
    } as never);

    const res = await DELETE(makeDeleteRequest(), { params: idParams });
    expect(res.status).toBe(409);
    const json = await res.json();
    expect(json.code).toBe("TOO_LATE");
  });

  test("cancelar reserva CONFIRMED com antecedência suficiente funciona", async () => {
    vi.mocked(auth).mockResolvedValue(memberSession as never);
    // startTime em 5h — mais de 2h
    const futureStart = new Date(Date.now() + 5 * 60 * 60 * 1000);
    vi.mocked(db.booking.findUnique).mockResolvedValue({
      ...mockBookingPending,
      status: "CONFIRMED",
      userId: "member-id",
      startTime: futureStart,
    } as never);
    vi.mocked(db.booking.update).mockResolvedValue({ ...mockBookingPending, status: "CANCELLED" } as never);

    const res = await DELETE(makeDeleteRequest(), { params: idParams });
    expect(res.status).toBe(200);
  });
});
