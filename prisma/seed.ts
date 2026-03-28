import { PrismaClient, UnitType, SpaceType, SpaceStatus, Role, ProviderType, ProviderStatus, ServiceOrderStatus, ServiceType, Priority } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcryptjs";
import "dotenv/config";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log("🌱 Iniciando seed...\n");

  // ---------------------------------------------------------------------------
  // 1. Unidades
  // ---------------------------------------------------------------------------

  const coworking = await prisma.unit.upsert({
    where: { id: "unit-coworking" },
    update: {},
    create: { id: "unit-coworking", name: "Coworking", type: UnitType.COWORKING },
  });

  const prudentialCG = await prisma.unit.upsert({
    where: { id: "unit-prudential-cg" },
    update: {},
    create: { id: "unit-prudential-cg", name: "Prudential Campina Grande", type: UnitType.BTS },
  });

  const prudentialDourados = await prisma.unit.upsert({
    where: { id: "unit-prudential-dourados" },
    update: {},
    create: { id: "unit-prudential-dourados", name: "Prudential Dourados", type: UnitType.BTS },
  });

  const prudentialIpatinga = await prisma.unit.upsert({
    where: { id: "unit-prudential-ipatinga" },
    update: {},
    create: { id: "unit-prudential-ipatinga", name: "Prudential Ipatinga", type: UnitType.BTS },
  });

  const stefaniniCG = await prisma.unit.upsert({
    where: { id: "unit-stefanini-cg" },
    update: {},
    create: { id: "unit-stefanini-cg", name: "Stefanini Campina Grande", type: UnitType.BTS },
  });

  console.log("✅ Unidades criadas:");
  console.log(`   - ${coworking.name} (${coworking.type})`);
  console.log(`   - ${prudentialCG.name} (${prudentialCG.type})`);
  console.log(`   - ${prudentialDourados.name} (${prudentialDourados.type})`);
  console.log(`   - ${prudentialIpatinga.name} (${prudentialIpatinga.type})`);
  console.log(`   - ${stefaniniCG.name} (${stefaniniCG.type})\n`);

  // ---------------------------------------------------------------------------
  // 2. Usuários
  // ---------------------------------------------------------------------------

  const users = [
    {
      id: "user-admin",
      email: "admin@coworkingfy.com",
      name: "Admin",
      password: "Admin123",
      role: Role.ADMIN,
      unitId: null,
    },
    {
      id: "user-recepcao",
      email: "recepcao@coworkingfy.com",
      name: "Recepção Coworking",
      password: "Recepcao123",
      role: Role.RECEPTIONIST,
      unitId: coworking.id,
    },
    {
      id: "user-membro",
      email: "membro@coworkingfy.com",
      name: "Membro Teste",
      password: "Membro123",
      role: Role.MEMBER,
      unitId: coworking.id,
    },
    {
      id: "user-ops-prudential",
      email: "ops.prudential@coworkingfy.com",
      name: "Ops Prudential CG",
      password: "Ops123",
      role: Role.RECEPTIONIST,
      unitId: prudentialCG.id,
    },
  ];

  console.log("✅ Usuários criados:");
  for (const user of users) {
    const hashed = await bcrypt.hash(user.password, 10);
    await prisma.user.upsert({
      where: { email: user.email },
      update: {},
      create: {
        id: user.id,
        email: user.email,
        name: user.name,
        password: hashed,
        role: user.role,
        unitId: user.unitId,
      },
    });
    console.log(`   - ${user.email} (${user.role}${user.unitId ? ` — ${user.unitId}` : " — sem unidade fixa"})`);
  }
  console.log();

  // ---------------------------------------------------------------------------
  // 3. Espaços do coworking
  // ---------------------------------------------------------------------------

  const spaces: { id: string; name: string; type: SpaceType; capacity: number }[] = [
    // Salas de reunião
    { id: "space-meeting-1", name: "Sala de Reunião 1", type: SpaceType.MEETING_ROOM, capacity: 8 },
    { id: "space-meeting-2", name: "Sala de Reunião 2", type: SpaceType.MEETING_ROOM, capacity: 8 },
    { id: "space-meeting-3", name: "Sala de Reunião 3", type: SpaceType.MEETING_ROOM, capacity: 8 },
    // Salas privativas
    { id: "space-office-101", name: "Sala Privativa 101", type: SpaceType.PRIVATE_OFFICE, capacity: 4 },
    { id: "space-office-102", name: "Sala Privativa 102", type: SpaceType.PRIVATE_OFFICE, capacity: 4 },
    { id: "space-office-103", name: "Sala Privativa 103", type: SpaceType.PRIVATE_OFFICE, capacity: 4 },
    { id: "space-office-104", name: "Sala Privativa 104", type: SpaceType.PRIVATE_OFFICE, capacity: 4 },
    { id: "space-office-105", name: "Sala Privativa 105", type: SpaceType.PRIVATE_OFFICE, capacity: 4 },
    // Estações de trabalho
    { id: "space-ws-1",  name: "Estação 1",  type: SpaceType.WORKSTATION, capacity: 1 },
    { id: "space-ws-2",  name: "Estação 2",  type: SpaceType.WORKSTATION, capacity: 1 },
    { id: "space-ws-3",  name: "Estação 3",  type: SpaceType.WORKSTATION, capacity: 1 },
    { id: "space-ws-4",  name: "Estação 4",  type: SpaceType.WORKSTATION, capacity: 1 },
    { id: "space-ws-5",  name: "Estação 5",  type: SpaceType.WORKSTATION, capacity: 1 },
    { id: "space-ws-6",  name: "Estação 6",  type: SpaceType.WORKSTATION, capacity: 1 },
    { id: "space-ws-7",  name: "Estação 7",  type: SpaceType.WORKSTATION, capacity: 1 },
    { id: "space-ws-8",  name: "Estação 8",  type: SpaceType.WORKSTATION, capacity: 1 },
    { id: "space-ws-9",  name: "Estação 9",  type: SpaceType.WORKSTATION, capacity: 1 },
    { id: "space-ws-10", name: "Estação 10", type: SpaceType.WORKSTATION, capacity: 1 },
  ];

  console.log("✅ Espaços criados:");
  for (const space of spaces) {
    await prisma.space.upsert({
      where: { id: space.id },
      update: {},
      create: {
        id: space.id,
        unitId: coworking.id,
        name: space.name,
        type: space.type,
        capacity: space.capacity,
        status: SpaceStatus.ACTIVE,
      },
    });
    console.log(`   - ${space.name} (${space.type}, cap. ${space.capacity})`);
  }
  console.log();

  // ---------------------------------------------------------------------------
  // 4. Prestadores do coworking
  // ---------------------------------------------------------------------------

  const providers = [
    {
      id: "provider-limpeza",
      name: "Limpeza Geral",
      specialty: "CLEANING" as const,
      type: ProviderType.RECURRING,
    },
    {
      id: "provider-eletrica",
      name: "Elétrica Rápida",
      specialty: "ELECTRICAL" as const,
      type: ProviderType.PUNCTUAL,
    },
  ];

  console.log("✅ Prestadores criados:");
  for (const provider of providers) {
    await prisma.provider.upsert({
      where: { id: provider.id },
      update: {},
      create: {
        id: provider.id,
        unitId: coworking.id,
        name: provider.name,
        specialty: provider.specialty,
        type: provider.type,
        status: ProviderStatus.ACTIVE,
      },
    });
    console.log(`   - ${provider.name} (${provider.specialty}, ${provider.type})`);
  }
  console.log();

  // ---------------------------------------------------------------------------
  // 5. Ordens de Serviço de exemplo
  // ---------------------------------------------------------------------------

  const now = new Date();
  const slaDeadline = new Date(now.getTime() + 24 * 60 * 60 * 1000); // URGENT = 24h

  const serviceOrders: {
    id: string;
    number: string;
    unitId: string;
    createdById: string;
    serviceType: ServiceType;
    description: string;
    priority: Priority;
    status: ServiceOrderStatus;
    approvedById?: string;
    approvedAt?: Date;
    slaDeadline?: Date;
    providerId?: string;
  }[] = [
    {
      id: "os-draft-001",
      number: "OS-2026-0001",
      unitId: coworking.id,
      createdById: "user-recepcao",
      serviceType: ServiceType.CLEANING,
      description: "Limpeza geral da área de trabalho compartilhada após evento",
      priority: Priority.MEDIUM,
      status: ServiceOrderStatus.DRAFT,
    },
    {
      id: "os-pending-001",
      number: "OS-2026-0002",
      unitId: prudentialCG.id,
      createdById: "user-ops-prudential",
      serviceType: ServiceType.ELECTRICAL,
      description: "Tomadas do corredor principal com falha intermitente, precisa de vistoria urgente",
      priority: Priority.HIGH,
      status: ServiceOrderStatus.PENDING_APPROVAL,
    },
    {
      id: "os-approved-001",
      number: "OS-2026-0003",
      unitId: stefaniniCG.id,
      createdById: "user-admin",
      serviceType: ServiceType.HYDRAULIC,
      description: "Vazamento identificado no banheiro do 2º andar — risco de dano estrutural",
      priority: Priority.URGENT,
      status: ServiceOrderStatus.APPROVED,
      approvedById: "user-admin",
      approvedAt: now,
      slaDeadline,
    },
    {
      id: "os-inprogress-001",
      number: "OS-2026-0004",
      unitId: prudentialDourados.id,
      createdById: "user-admin",
      serviceType: ServiceType.CLEANING,
      description: "Limpeza periódica das áreas comuns conforme contrato mensal",
      priority: Priority.LOW,
      status: ServiceOrderStatus.IN_PROGRESS,
      providerId: "provider-limpeza",
    },
    {
      id: "os-done-001",
      number: "OS-2026-0005",
      unitId: prudentialIpatinga.id,
      createdById: "user-admin",
      serviceType: ServiceType.ELECTRICAL,
      description: "Substituição das luminárias da sala de reunião principal",
      priority: Priority.MEDIUM,
      status: ServiceOrderStatus.DONE,
      providerId: "provider-eletrica",
    },
  ];

  console.log("✅ Ordens de Serviço criadas:");
  for (const os of serviceOrders) {
    await prisma.serviceOrder.upsert({
      where: { id: os.id },
      update: {},
      create: {
        id: os.id,
        number: os.number,
        unitId: os.unitId,
        createdById: os.createdById,
        serviceType: os.serviceType,
        description: os.description,
        priority: os.priority,
        status: os.status,
        ...(os.approvedById ? { approvedById: os.approvedById } : {}),
        ...(os.approvedAt ? { approvedAt: os.approvedAt } : {}),
        ...(os.slaDeadline ? { slaDeadline: os.slaDeadline } : {}),
        ...(os.providerId ? { providerId: os.providerId } : {}),
      },
    });
    console.log(`   - ${os.number} | ${os.status} | ${os.priority} | ${os.unitId}`);
  }
  console.log();

  console.log("🎉 Seed concluído com sucesso!");
}

main()
  .catch((e) => {
    console.error("❌ Erro no seed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
