import {
  PrismaClient,
  UnitType,
  SpaceType,
  SpaceStatus,
  Role,
  ProviderType,
  ProviderStatus,
  ServiceOrderStatus,
  ServiceType,
  Priority,
  TicketStatus,
  BookingStatus,
} from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcryptjs";
import "dotenv/config";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

// Helpers de data
function daysAgo(n: number, hour = 9, minute = 0) {
  const d = new Date("2026-04-06T00:00:00");
  d.setDate(d.getDate() - n);
  d.setHours(hour, minute, 0, 0);
  return d;
}
function daysFromNow(n: number, hour = 9, minute = 0) {
  const d = new Date("2026-04-06T00:00:00");
  d.setDate(d.getDate() + n);
  d.setHours(hour, minute, 0, 0);
  return d;
}

async function main() {
  console.log("🌱 Iniciando seed...\n");

  // ---------------------------------------------------------------------------
  // 1. Unidades
  // ---------------------------------------------------------------------------

  const coworking = await prisma.unit.upsert({
    where: { id: "unit-coworking" },
    update: { name: "Coworking" },
    create: { id: "unit-coworking", name: "Coworking", type: UnitType.COWORKING },
  });

  const prudentialCG = await prisma.unit.upsert({
    where: { id: "unit-prudential-cg" },
    update: { name: "Prudential Campina Grande" },
    create: { id: "unit-prudential-cg", name: "Prudential Campina Grande", type: UnitType.BTS },
  });

  const prudentialDourados = await prisma.unit.upsert({
    where: { id: "unit-prudential-dourados" },
    update: { name: "Prudential Dourados" },
    create: { id: "unit-prudential-dourados", name: "Prudential Dourados", type: UnitType.BTS },
  });

  const prudentialIpatinga = await prisma.unit.upsert({
    where: { id: "unit-prudential-ipatinga" },
    update: { name: "Prudential Ipatinga" },
    create: { id: "unit-prudential-ipatinga", name: "Prudential Ipatinga", type: UnitType.BTS },
  });

  const stefaniniCG = await prisma.unit.upsert({
    where: { id: "unit-stefanini-cg" },
    update: { name: "Stefanini Campina Grande" },
    create: { id: "unit-stefanini-cg", name: "Stefanini Campina Grande", type: UnitType.BTS },
  });

  console.log("✅ Unidades criadas\n");

  // ---------------------------------------------------------------------------
  // 2. Usuários
  // ---------------------------------------------------------------------------

  const userData = [
    {
      id: "user-admin",
      email: "admin@coworkingfy.com",
      name: "Luiz Santos",
      password: "Admin123",
      role: Role.ADMIN,
    },
    {
      id: "user-recepcao",
      email: "ana.ferreira@coworkingfy.com",
      name: "Ana Ferreira",
      password: "Recepcao123",
      role: Role.RECEPTIONIST,
    },
    {
      id: "user-ops-prudential",
      email: "carlos.mendes@coworkingfy.com",
      name: "Carlos Mendes",
      password: "Recepcao123",
      role: Role.RECEPTIONIST,
    },
    {
      id: "user-ops-stefanini",
      email: "fernanda.lima@coworkingfy.com",
      name: "Fernanda Lima",
      password: "Recepcao123",
      role: Role.RECEPTIONIST,
    },
    {
      id: "user-membro",
      email: "joao.alves@gmail.com",
      name: "João Alves",
      password: "Membro123",
      role: Role.MEMBER,
    },
    {
      id: "user-membro-2",
      email: "mariana.costa@gmail.com",
      name: "Mariana Costa",
      password: "Membro123",
      role: Role.MEMBER,
    },
    {
      id: "user-membro-3",
      email: "pedro.souza@outlook.com",
      name: "Pedro Souza",
      password: "Membro123",
      role: Role.MEMBER,
    },
    {
      id: "user-membro-4",
      email: "leticia.nunes@gmail.com",
      name: "Leticia Nunes",
      password: "Membro123",
      role: Role.MEMBER,
    },
    {
      id: "user-membro-5",
      email: "rafael.moura@empresa.com",
      name: "Rafael Moura",
      password: "Membro123",
      role: Role.MEMBER,
    },
  ];

  console.log("✅ Usuários criados:");
  for (const u of userData) {
    const hashed = await bcrypt.hash(u.password, 10);
    await prisma.user.upsert({
      where: { id: u.id },
      update: { name: u.name, role: u.role, email: u.email, password: hashed },
      create: {
        id: u.id,
        email: u.email,
        name: u.name,
        password: hashed,
        role: u.role,
      },
    });
    console.log(`   - ${u.email} (${u.role})`);
  }
  console.log();

  // ---------------------------------------------------------------------------
  // 2b. Vínculos UserUnit
  // ---------------------------------------------------------------------------

  const userUnits = [
    { id: "uu-ana-coworking",             userId: "user-recepcao",       unitId: coworking.id },
    { id: "uu-membro-coworking",          userId: "user-membro",         unitId: coworking.id },
    { id: "uu-membro2-coworking",         userId: "user-membro-2",       unitId: coworking.id },
    { id: "uu-membro3-coworking",         userId: "user-membro-3",       unitId: coworking.id },
    { id: "uu-membro4-coworking",         userId: "user-membro-4",       unitId: coworking.id },
    { id: "uu-membro5-coworking",         userId: "user-membro-5",       unitId: coworking.id },
    { id: "uu-carlos-prudential-cg",      userId: "user-ops-prudential", unitId: prudentialCG.id },
    { id: "uu-carlos-prudential-drd",     userId: "user-ops-prudential", unitId: prudentialDourados.id },
    { id: "uu-fernanda-stefanini",        userId: "user-ops-stefanini",  unitId: stefaniniCG.id },
    { id: "uu-fernanda-prudential-ipa",   userId: "user-ops-stefanini",  unitId: prudentialIpatinga.id },
  ];

  for (const uu of userUnits) {
    await prisma.userUnit.upsert({
      where: { userId_unitId: { userId: uu.userId, unitId: uu.unitId } },
      update: {},
      create: uu,
    });
  }
  console.log("✅ Vínculos UserUnit criados\n");

  // ---------------------------------------------------------------------------
  // 3. Espaços do coworking
  // ---------------------------------------------------------------------------

  const spacesData: {
    id: string;
    name: string;
    description: string;
    type: SpaceType;
    capacity: number;
    status?: SpaceStatus;
  }[] = [
    {
      id: "space-meeting-1",
      name: "Sala Reunião — Ipê",
      description: "Sala para até 8 pessoas com TV, projetor e ar-condicionado. Ideal para apresentações.",
      type: SpaceType.MEETING_ROOM,
      capacity: 8,
    },
    {
      id: "space-meeting-2",
      name: "Sala Reunião — Aroeira",
      description: "Sala compacta para reuniões rápidas. TV 55'' e quadro branco.",
      type: SpaceType.MEETING_ROOM,
      capacity: 6,
      status: SpaceStatus.MAINTENANCE,
    },
    {
      id: "space-meeting-3",
      name: "Sala Reunião — Jacarandá",
      description: "Sala executiva para até 10 pessoas com sistema de videoconferência.",
      type: SpaceType.MEETING_ROOM,
      capacity: 10,
    },
    {
      id: "space-office-101",
      name: "Sala Privativa 101",
      description: "Sala individual com mesa, cadeira ergonômica e ponto de rede.",
      type: SpaceType.PRIVATE_OFFICE,
      capacity: 4,
    },
    {
      id: "space-office-102",
      name: "Sala Privativa 102",
      description: "Sala para pequenas equipes com 2 mesas e armário.",
      type: SpaceType.PRIVATE_OFFICE,
      capacity: 4,
    },
    {
      id: "space-office-103",
      name: "Sala Privativa 103",
      description: "Sala com vista para área externa, 2 mesas e iluminação natural.",
      type: SpaceType.PRIVATE_OFFICE,
      capacity: 4,
    },
    {
      id: "space-office-104",
      name: "Sala Privativa 104",
      description: "Sala corporativa com mesa de reunião interna para 4 pessoas.",
      type: SpaceType.PRIVATE_OFFICE,
      capacity: 4,
    },
    {
      id: "space-office-105",
      name: "Sala Privativa 105",
      description: "Sala premium com móveis planejados, frigobar e piso elevado.",
      type: SpaceType.PRIVATE_OFFICE,
      capacity: 4,
    },
    { id: "space-ws-1",  name: "Estação A1", description: "Estação de trabalho na área silenciosa.", type: SpaceType.WORKSTATION, capacity: 1 },
    { id: "space-ws-2",  name: "Estação A2", description: "Estação de trabalho na área silenciosa.", type: SpaceType.WORKSTATION, capacity: 1 },
    { id: "space-ws-3",  name: "Estação A3", description: "Estação de trabalho na área silenciosa.", type: SpaceType.WORKSTATION, capacity: 1 },
    { id: "space-ws-4",  name: "Estação B1", description: "Estação de trabalho na área colaborativa.", type: SpaceType.WORKSTATION, capacity: 1 },
    { id: "space-ws-5",  name: "Estação B2", description: "Estação de trabalho na área colaborativa.", type: SpaceType.WORKSTATION, capacity: 1 },
    { id: "space-ws-6",  name: "Estação B3", description: "Estação de trabalho na área colaborativa.", type: SpaceType.WORKSTATION, capacity: 1 },
    { id: "space-ws-7",  name: "Estação B4", description: "Estação de trabalho na área colaborativa.", type: SpaceType.WORKSTATION, capacity: 1 },
    { id: "space-ws-8",  name: "Estação C1", description: "Estação próxima à janela, área premium.", type: SpaceType.WORKSTATION, capacity: 1 },
    { id: "space-ws-9",  name: "Estação C2", description: "Estação próxima à janela, área premium.", type: SpaceType.WORKSTATION, capacity: 1 },
    { id: "space-ws-10", name: "Estação C3", description: "Estação próxima à janela, área premium.", type: SpaceType.WORKSTATION, capacity: 1 },
  ];

  for (const space of spacesData) {
    await prisma.space.upsert({
      where: { id: space.id },
      update: { name: space.name, description: space.description, status: space.status ?? SpaceStatus.ACTIVE },
      create: {
        id: space.id,
        unitId: coworking.id,
        name: space.name,
        description: space.description,
        type: space.type,
        capacity: space.capacity,
        status: space.status ?? SpaceStatus.ACTIVE,
      },
    });
  }
  console.log("✅ Espaços criados\n");

  // ---------------------------------------------------------------------------
  // 4. Prestadores
  // ---------------------------------------------------------------------------

  const providersData = [
    {
      id: "provider-limpeza",
      unitId: coworking.id,
      name: "Limpeza Total Serviços",
      specialty: ServiceType.CLEANING,
      phone: "(83) 98700-1234",
      email: "contato@limpezatotal.com",
      type: ProviderType.RECURRING,
    },
    {
      id: "provider-eletrica-cw",
      unitId: coworking.id,
      name: "Eletro Rápido Manutenção",
      specialty: ServiceType.ELECTRICAL,
      phone: "(83) 99100-5678",
      email: "eletrorapido@gmail.com",
      type: ProviderType.RECURRING,
    },
    {
      id: "provider-hidro",
      unitId: coworking.id,
      name: "HidroFix Soluções",
      specialty: ServiceType.HYDRAULIC,
      phone: "(83) 99200-9012",
      email: "hidrofix@servicos.com",
      type: ProviderType.PUNCTUAL,
    },
    {
      id: "provider-clima",
      unitId: coworking.id,
      name: "Clima & Conforto AC",
      specialty: ServiceType.OTHER,
      phone: "(83) 98300-3456",
      email: "climaconforto@ac.com",
      type: ProviderType.RECURRING,
    },
    {
      id: "provider-eletrica-cg",
      unitId: prudentialCG.id,
      name: "Elétrica Nordeste",
      specialty: ServiceType.ELECTRICAL,
      phone: "(83) 99400-7890",
      email: null,
      type: ProviderType.PUNCTUAL,
    },
    {
      id: "provider-manutencao-drd",
      unitId: prudentialDourados.id,
      name: "Manutenção Total",
      specialty: ServiceType.OTHER,
      phone: "(67) 99500-1111",
      email: "manutencaototal@ms.com",
      type: ProviderType.PUNCTUAL,
    },
  ];

  for (const p of providersData) {
    await prisma.provider.upsert({
      where: { id: p.id },
      update: { name: p.name, phone: p.phone, email: p.email },
      create: {
        id: p.id,
        unitId: p.unitId,
        name: p.name,
        specialty: p.specialty,
        phone: p.phone,
        email: p.email,
        type: p.type,
        status: ProviderStatus.ACTIVE,
      },
    });
  }
  console.log("✅ Prestadores criados\n");

  // ---------------------------------------------------------------------------
  // 5. Tickets
  // ---------------------------------------------------------------------------

  const ticketsData = [
    // --- Coworking ---
    {
      id: "ticket-001",
      number: "TK-2026-0001",
      unitId: coworking.id,
      description: "Torneira do banheiro masculino com vazamento contínuo",
      priority: Priority.HIGH,
      status: TicketStatus.CLOSED,
      createdAt: daysAgo(30),
    },
    {
      id: "ticket-002",
      number: "TK-2026-0002",
      unitId: coworking.id,
      description: "Ar-condicionado da Sala Ipê apresentando barulho e não resfria adequadamente",
      priority: Priority.MEDIUM,
      status: TicketStatus.IN_PROGRESS,
      createdAt: daysAgo(12),
    },
    {
      id: "ticket-003",
      number: "TK-2026-0003",
      unitId: coworking.id,
      description: "Limpeza profunda solicitada após evento corporativo de 3 dias",
      priority: Priority.LOW,
      status: TicketStatus.CLOSED,
      createdAt: daysAgo(20),
    },
    {
      id: "ticket-004",
      number: "TK-2026-0004",
      unitId: coworking.id,
      description: "Tomada com cheiro de queimado na Estação C1 — risco elétrico",
      priority: Priority.URGENT,
      status: TicketStatus.IN_PROGRESS,
      createdAt: daysAgo(2),
    },
    {
      id: "ticket-005",
      number: "TK-2026-0005",
      unitId: coworking.id,
      description: "Fechadura da Sala Privativa 103 com defeito, não fecha corretamente",
      priority: Priority.MEDIUM,
      status: TicketStatus.OPEN,
      createdAt: daysAgo(5),
    },
    // --- Prudential CG ---
    {
      id: "ticket-006",
      number: "TK-2026-0006",
      unitId: prudentialCG.id,
      externalTicketId: "TICK-2026-0847",
      description: "Falha elétrica no corredor principal — disjuntor caindo toda manhã",
      priority: Priority.HIGH,
      status: TicketStatus.OPEN,
      createdAt: daysAgo(7),
    },
    {
      id: "ticket-007",
      number: "TK-2026-0007",
      unitId: prudentialCG.id,
      externalTicketId: "TICK-2026-0902",
      description: "Infiltração na parede do servidor — urgente, risco para equipamentos",
      priority: Priority.URGENT,
      status: TicketStatus.IN_PROGRESS,
      createdAt: daysAgo(4),
    },
    {
      id: "ticket-008",
      number: "TK-2026-0008",
      unitId: prudentialCG.id,
      externalTicketId: "TICK-2026-0789",
      description: "Revisão geral do sistema de climatização antes do inverno",
      priority: Priority.LOW,
      status: TicketStatus.CLOSED,
      createdAt: daysAgo(45),
    },
    // --- Prudential Dourados ---
    {
      id: "ticket-009",
      number: "TK-2026-0009",
      unitId: prudentialDourados.id,
      description: "Limpeza periódica mensal das áreas comuns — contrato recorrente",
      priority: Priority.LOW,
      status: TicketStatus.IN_PROGRESS,
      createdAt: daysAgo(3),
    },
    {
      id: "ticket-010",
      number: "TK-2026-0010",
      unitId: prudentialDourados.id,
      externalTicketId: "TICK-2026-0930",
      description: "Câmera de segurança da entrada principal com imagem tremendo",
      priority: Priority.MEDIUM,
      status: TicketStatus.OPEN,
      createdAt: daysAgo(6),
    },
    // --- Prudential Ipatinga ---
    {
      id: "ticket-011",
      number: "TK-2026-0011",
      unitId: prudentialIpatinga.id,
      externalTicketId: "TICK-2026-0855",
      description: "Substituição de luminárias queimadas na sala de reunião principal",
      priority: Priority.MEDIUM,
      status: TicketStatus.CLOSED,
      createdAt: daysAgo(60),
    },
    {
      id: "ticket-012",
      number: "TK-2026-0012",
      unitId: prudentialIpatinga.id,
      description: "Porta corta-fogo do 3º andar não fecha automaticamente",
      priority: Priority.HIGH,
      status: TicketStatus.OPEN,
      createdAt: daysAgo(1),
    },
    // --- Stefanini CG ---
    {
      id: "ticket-013",
      number: "TK-2026-0013",
      unitId: stefaniniCG.id,
      externalTicketId: "TICK-2026-0901",
      description: "Vazamento hidráulico no banheiro do 2º andar — piso alagando",
      priority: Priority.URGENT,
      status: TicketStatus.IN_PROGRESS,
      createdAt: daysAgo(3),
    },
    {
      id: "ticket-014",
      number: "TK-2026-0014",
      unitId: stefaniniCG.id,
      description: "Pintura da fachada com manchas de mofo após chuvas",
      priority: Priority.LOW,
      status: TicketStatus.OPEN,
      createdAt: daysAgo(8),
    },
    {
      id: "ticket-015",
      number: "TK-2026-0015",
      unitId: stefaniniCG.id,
      externalTicketId: "TICK-2026-0875",
      description: "No-break da sala de TI com alarme de bateria fraca",
      priority: Priority.HIGH,
      status: TicketStatus.CLOSED,
      createdAt: daysAgo(25),
    },
  ];

  for (const t of ticketsData) {
    await prisma.ticket.upsert({
      where: { number: t.number },
      update: { status: t.status, description: t.description, priority: t.priority },
      create: {
        id: t.id,
        number: t.number,
        externalTicketId: t.externalTicketId ?? null,
        unitId: t.unitId,
        description: t.description,
        priority: t.priority,
        status: t.status,
        createdById: "user-admin",
        createdAt: t.createdAt,
      },
    });
  }
  console.log("✅ Tickets criados\n");

  // ---------------------------------------------------------------------------
  // 6. Ordens de Serviço
  // ---------------------------------------------------------------------------

  const serviceOrdersData = [
    {
      id: "os-001",
      number: "OS-2026-0001",
      ticketId: "ticket-001",
      unitId: coworking.id,
      createdById: "user-recepcao",
      serviceType: ServiceType.HYDRAULIC,
      description: "Substituição do vedante e reparo do sifão da torneira do banheiro masculino",
      status: ServiceOrderStatus.DONE,
      providerId: "provider-hidro",
      approvedById: "user-admin",
      approvedAt: daysAgo(29, 10),
      slaResolutionDeadline: daysAgo(27, 10),
      scheduledDate: daysAgo(28, 14),
    },
    {
      id: "os-002",
      number: "OS-2026-0002",
      ticketId: "ticket-002",
      unitId: coworking.id,
      createdById: "user-recepcao",
      serviceType: ServiceType.OTHER,
      description: "Limpeza dos filtros e recarga de gás do ar-condicionado da Sala Ipê",
      status: ServiceOrderStatus.APPROVED,
      approvedById: "user-admin",
      approvedAt: daysAgo(10, 11),
      slaResolutionDeadline: daysFromNow(2, 11),
      scheduledDate: daysFromNow(1, 9),
    },
    {
      id: "os-003",
      number: "OS-2026-0003",
      ticketId: "ticket-003",
      unitId: coworking.id,
      createdById: "user-recepcao",
      serviceType: ServiceType.CLEANING,
      description: "Limpeza profunda de piso, vidros, banheiros e áreas comuns pós-evento",
      status: ServiceOrderStatus.DONE,
      providerId: "provider-limpeza",
      approvedById: "user-admin",
      approvedAt: daysAgo(19, 9),
      slaResolutionDeadline: daysAgo(16, 9),
      scheduledDate: daysAgo(18, 7),
    },
    {
      id: "os-004",
      number: "OS-2026-0004",
      ticketId: "ticket-004",
      unitId: coworking.id,
      createdById: "user-recepcao",
      serviceType: ServiceType.ELECTRICAL,
      description: "Vistoria urgente e substituição de tomada com mau contato na Estação C1",
      status: ServiceOrderStatus.IN_PROGRESS,
      providerId: "provider-eletrica-cw",
      approvedById: "user-admin",
      approvedAt: daysAgo(2, 9),
      slaResolutionDeadline: daysAgo(1, 9), // SLA vencido — urgente
      scheduledDate: daysAgo(1, 14),
    },
    {
      id: "os-005",
      number: "OS-2026-0005",
      ticketId: "ticket-005",
      unitId: coworking.id,
      createdById: "user-recepcao",
      serviceType: ServiceType.OTHER,
      description: "Diagnóstico e reparo da fechadura da Sala Privativa 103",
      status: ServiceOrderStatus.PENDING_APPROVAL,
    },
    {
      id: "os-006",
      number: "OS-2026-0006",
      ticketId: "ticket-006",
      unitId: prudentialCG.id,
      createdById: "user-ops-prudential",
      serviceType: ServiceType.ELECTRICAL,
      description: "Vistoria do painel elétrico e troca do disjuntor 20A do corredor principal",
      status: ServiceOrderStatus.APPROVED,
      approvedById: "user-admin",
      approvedAt: daysAgo(6, 14),
      slaResolutionDeadline: daysFromNow(1, 14),
      scheduledDate: daysFromNow(1, 10),
    },
    {
      id: "os-007",
      number: "OS-2026-0007",
      ticketId: "ticket-007",
      unitId: prudentialCG.id,
      createdById: "user-ops-prudential",
      serviceType: ServiceType.HYDRAULIC,
      description: "Identificação e correção de infiltração na parede da sala de servidores",
      status: ServiceOrderStatus.IN_PROGRESS,
      providerId: "provider-eletrica-cg",
      approvedById: "user-admin",
      approvedAt: daysAgo(3, 16),
      slaResolutionDeadline: daysAgo(2, 16), // SLA vencido
    },
    {
      id: "os-008",
      number: "OS-2026-0008",
      ticketId: "ticket-008",
      unitId: prudentialCG.id,
      createdById: "user-ops-prudential",
      serviceType: ServiceType.OTHER,
      description: "Revisão geral de 4 splits: limpeza de filtros, verificação de dreno e recarga de gás",
      status: ServiceOrderStatus.DONE,
      providerId: "provider-eletrica-cg",
      approvedById: "user-admin",
      approvedAt: daysAgo(44, 10),
      slaResolutionDeadline: daysAgo(40, 10),
      scheduledDate: daysAgo(42, 9),
    },
    {
      id: "os-009",
      number: "OS-2026-0009",
      ticketId: "ticket-009",
      unitId: prudentialDourados.id,
      createdById: "user-ops-prudential",
      serviceType: ServiceType.CLEANING,
      description: "Limpeza mensal das áreas comuns, banheiros e recepção — contrato mensal abr/2026",
      status: ServiceOrderStatus.IN_PROGRESS,
      providerId: "provider-manutencao-drd",
      approvedById: "user-admin",
      approvedAt: daysAgo(2, 11),
      slaResolutionDeadline: daysFromNow(5, 11),
    },
    {
      id: "os-010",
      number: "OS-2026-0010",
      ticketId: "ticket-011",
      unitId: prudentialIpatinga.id,
      createdById: "user-ops-stefanini",
      serviceType: ServiceType.ELECTRICAL,
      description: "Substituição de 12 luminárias LED queimadas na sala de reunião principal",
      status: ServiceOrderStatus.DONE,
      approvedById: "user-admin",
      approvedAt: daysAgo(58, 10),
      slaResolutionDeadline: daysAgo(53, 10),
      scheduledDate: daysAgo(55, 9),
    },
    {
      id: "os-011",
      number: "OS-2026-0011",
      ticketId: "ticket-013",
      unitId: stefaniniCG.id,
      createdById: "user-ops-stefanini",
      serviceType: ServiceType.HYDRAULIC,
      description: "Reparo emergencial de vazamento no ramal hidráulico do banheiro do 2º andar",
      status: ServiceOrderStatus.APPROVED,
      approvedById: "user-admin",
      approvedAt: daysAgo(2, 17),
      slaResolutionDeadline: daysAgo(1, 17), // SLA vencido
      scheduledDate: daysFromNow(0, 14),
    },
    {
      id: "os-012",
      number: "OS-2026-0012",
      ticketId: "ticket-015",
      unitId: stefaniniCG.id,
      createdById: "user-ops-stefanini",
      serviceType: ServiceType.ELECTRICAL,
      description: "Substituição de baterias seladas do no-break APC 3kVA da sala de TI",
      status: ServiceOrderStatus.DONE,
      approvedById: "user-admin",
      approvedAt: daysAgo(24, 10),
      slaResolutionDeadline: daysAgo(22, 10),
      scheduledDate: daysAgo(23, 9),
    },
  ];

  for (const os of serviceOrdersData) {
    await prisma.serviceOrder.upsert({
      where: { number: os.number },
      update: { status: os.status, description: os.description },
      create: {
        id: os.id,
        number: os.number,
        ticketId: os.ticketId,
        unitId: os.unitId,
        createdById: os.createdById,
        serviceType: os.serviceType,
        description: os.description,
        status: os.status,
        ...(os.providerId   ? { providerId:   os.providerId }   : {}),
        ...(os.approvedById ? { approvedById: os.approvedById } : {}),
        ...(os.approvedAt   ? { approvedAt:   os.approvedAt }   : {}),
        ...(os.slaResolutionDeadline  ? { slaResolutionDeadline:  os.slaResolutionDeadline }  : {}),
        ...(os.scheduledDate ? { scheduledDate: os.scheduledDate } : {}),
      },
    });
  }
  console.log("✅ Ordens de Serviço criadas\n");

  // ---------------------------------------------------------------------------
  // 7. Reservas
  // ---------------------------------------------------------------------------

  type BookingInput = {
    id: string;
    userId: string;
    spaceId: string;
    startTime: Date;
    endTime: Date;
    status: BookingStatus;
    approvedById?: string;
    approvedAt?: Date;
  };

  const bookingsData: BookingInput[] = [
    // --- Passadas (confirmadas) ---
    {
      id: "booking-001",
      userId: "user-membro",
      spaceId: "space-meeting-1",
      startTime: daysAgo(14, 9),
      endTime: daysAgo(14, 11),
      status: BookingStatus.CONFIRMED,
      approvedById: "user-recepcao",
      approvedAt: daysAgo(15, 17),
    },
    {
      id: "booking-002",
      userId: "user-membro-2",
      spaceId: "space-office-101",
      startTime: daysAgo(12, 14),
      endTime: daysAgo(12, 17),
      status: BookingStatus.CONFIRMED,
      approvedById: "user-recepcao",
      approvedAt: daysAgo(13, 9),
    },
    {
      id: "booking-003",
      userId: "user-membro-3",
      spaceId: "space-ws-1",
      startTime: daysAgo(10, 8),
      endTime: daysAgo(10, 18),
      status: BookingStatus.CONFIRMED,
      approvedById: "user-recepcao",
      approvedAt: daysAgo(11, 10),
    },
    {
      id: "booking-004",
      userId: "user-membro",
      spaceId: "space-meeting-3",
      startTime: daysAgo(8, 10),
      endTime: daysAgo(8, 12),
      status: BookingStatus.CONFIRMED,
      approvedById: "user-recepcao",
      approvedAt: daysAgo(9, 16),
    },
    {
      id: "booking-005",
      userId: "user-membro-4",
      spaceId: "space-office-102",
      startTime: daysAgo(7, 9),
      endTime: daysAgo(7, 18),
      status: BookingStatus.CONFIRMED,
      approvedById: "user-recepcao",
      approvedAt: daysAgo(8, 8),
    },
    {
      id: "booking-006",
      userId: "user-membro-5",
      spaceId: "space-ws-4",
      startTime: daysAgo(6, 8),
      endTime: daysAgo(6, 12),
      status: BookingStatus.CONFIRMED,
      approvedById: "user-recepcao",
      approvedAt: daysAgo(7, 9),
    },
    {
      id: "booking-007",
      userId: "user-membro-2",
      spaceId: "space-meeting-1",
      startTime: daysAgo(5, 15),
      endTime: daysAgo(5, 17),
      status: BookingStatus.CONFIRMED,
      approvedById: "user-recepcao",
      approvedAt: daysAgo(6, 14),
    },
    {
      id: "booking-008",
      userId: "user-membro-3",
      spaceId: "space-office-105",
      startTime: daysAgo(4, 9),
      endTime: daysAgo(4, 18),
      status: BookingStatus.CONFIRMED,
      approvedById: "user-recepcao",
      approvedAt: daysAgo(5, 8),
    },
    // --- Canceladas ---
    {
      id: "booking-009",
      userId: "user-membro",
      spaceId: "space-meeting-3",
      startTime: daysAgo(3, 14),
      endTime: daysAgo(3, 16),
      status: BookingStatus.CANCELLED,
    },
    {
      id: "booking-010",
      userId: "user-membro-4",
      spaceId: "space-ws-8",
      startTime: daysAgo(2, 9),
      endTime: daysAgo(2, 13),
      status: BookingStatus.CANCELLED,
    },
    // --- Rejeitadas ---
    {
      id: "booking-011",
      userId: "user-membro-5",
      spaceId: "space-meeting-1",
      startTime: daysAgo(6, 9),
      endTime: daysAgo(6, 11),
      status: BookingStatus.REJECTED,
      approvedById: "user-recepcao",
      approvedAt: daysAgo(7, 10),
    },
    // --- Hoje (confirmadas) ---
    {
      id: "booking-012",
      userId: "user-membro",
      spaceId: "space-ws-2",
      startTime: daysAgo(0, 8),
      endTime: daysAgo(0, 18),
      status: BookingStatus.CONFIRMED,
      approvedById: "user-recepcao",
      approvedAt: daysAgo(1, 9),
    },
    {
      id: "booking-013",
      userId: "user-membro-2",
      spaceId: "space-meeting-3",
      startTime: daysAgo(0, 10),
      endTime: daysAgo(0, 12),
      status: BookingStatus.CONFIRMED,
      approvedById: "user-recepcao",
      approvedAt: daysAgo(1, 17),
    },
    // --- Futuras pendentes ---
    {
      id: "booking-014",
      userId: "user-membro-3",
      spaceId: "space-office-103",
      startTime: daysFromNow(1, 9),
      endTime: daysFromNow(1, 18),
      status: BookingStatus.PENDING_APPROVAL,
    },
    {
      id: "booking-015",
      userId: "user-membro-4",
      spaceId: "space-meeting-1",
      startTime: daysFromNow(2, 14),
      endTime: daysFromNow(2, 16),
      status: BookingStatus.PENDING_APPROVAL,
    },
    {
      id: "booking-016",
      userId: "user-membro-5",
      spaceId: "space-ws-6",
      startTime: daysFromNow(2, 8),
      endTime: daysFromNow(2, 12),
      status: BookingStatus.PENDING_APPROVAL,
    },
    {
      id: "booking-017",
      userId: "user-membro",
      spaceId: "space-meeting-3",
      startTime: daysFromNow(3, 9),
      endTime: daysFromNow(3, 11),
      status: BookingStatus.PENDING_APPROVAL,
    },
    // --- Futuras confirmadas ---
    {
      id: "booking-018",
      userId: "user-membro-2",
      spaceId: "space-office-104",
      startTime: daysFromNow(4, 9),
      endTime: daysFromNow(4, 18),
      status: BookingStatus.CONFIRMED,
      approvedById: "user-recepcao",
      approvedAt: daysAgo(1, 11),
    },
    {
      id: "booking-019",
      userId: "user-membro-3",
      spaceId: "space-ws-9",
      startTime: daysFromNow(5, 8),
      endTime: daysFromNow(5, 18),
      status: BookingStatus.CONFIRMED,
      approvedById: "user-recepcao",
      approvedAt: daysAgo(0, 14),
    },
    {
      id: "booking-020",
      userId: "user-membro-4",
      spaceId: "space-meeting-1",
      startTime: daysFromNow(7, 13),
      endTime: daysFromNow(7, 15),
      status: BookingStatus.PENDING_APPROVAL,
    },
  ];

  for (const b of bookingsData) {
    await prisma.booking.upsert({
      where: { id: b.id },
      update: { status: b.status },
      create: {
        id: b.id,
        userId: b.userId,
        spaceId: b.spaceId,
        startTime: b.startTime,
        endTime: b.endTime,
        status: b.status,
        ...(b.approvedById ? { approvedById: b.approvedById } : {}),
        ...(b.approvedAt   ? { approvedAt:   b.approvedAt }   : {}),
      },
    });
  }
  console.log("✅ Reservas criadas\n");

  console.log("=".repeat(50));
  console.log("🎉 Seed concluído!\n");
  console.log("Credenciais de acesso:");
  console.log("  admin@coworkingfy.com        Admin123   (ADMIN)");
  console.log("  ana.ferreira@coworkingfy.com Recepcao123 (RECEPTIONIST — Coworking)");
  console.log("  carlos.mendes@coworkingfy.com Recepcao123 (RECEPTIONIST — Prudential CG/Dourados)");
  console.log("  fernanda.lima@coworkingfy.com Recepcao123 (RECEPTIONIST — Stefanini/Ipatinga)");
  console.log("  joao.alves@gmail.com          Membro123  (MEMBER)");
  console.log("=".repeat(50));
}

main()
  .catch((e) => {
    console.error("❌ Erro no seed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
