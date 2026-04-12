import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { ServiceCalendar } from "@/components/shared/ServiceCalendar";

export default async function CalendarPage() {
  const session = await auth();
  if (!session) redirect("/login");
  if (session.user.role !== "ADMIN") redirect("/dashboard");

  const serviceOrders = await db.serviceOrder.findMany({
    where: {
      OR: [
        { status: { notIn: ["DRAFT"] } },
        { maintenancePlanId: { not: null } }, // alertas preventivos ainda DRAFT
      ],
    },
    orderBy: { scheduledDate: "asc" },
    include: {
      unit:            { select: { id: true, name: true } },
      provider:        { select: { id: true, name: true, type: true } },
      ticket:          { select: { number: true } },
      maintenancePlan: { select: { id: true, name: true } },
    },
  });

  // Serializar para o Client Component (Date → string)
  const orders = serviceOrders.map((os) => ({
    id:                os.id,
    number:            os.number,
    description:       os.description,
    serviceType:       os.serviceType,
    status:            os.status,
    scheduledDate:     os.scheduledDate ? os.scheduledDate.toISOString() : null,
    isRecurring:       os.provider?.type === "RECURRING",
    maintenancePlanId: os.maintenancePlan?.id ?? null,
    isPlanAlert:       os.maintenancePlan !== null && ["DRAFT", "PENDING_APPROVAL"].includes(os.status),
    unitName:          os.unit.name,
    ticketNumber:      os.ticket?.number ?? null,
    providerName:      os.provider?.name ?? null,
  }));

  return <ServiceCalendar orders={orders} />;
}
