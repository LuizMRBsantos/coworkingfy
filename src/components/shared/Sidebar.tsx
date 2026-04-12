"use client";
// Precisa de usePathname para highlight da rota ativa

import { usePathname } from "next/navigation";
import Link from "next/link";
import {
  LayoutDashboard,
  ClipboardList,
  FileText,
  Building2,
  Calendar,
  CalendarClock,
  Users,
  BarChart3,
  UserCog,
  Building,
  Package,
  Wrench,
  Activity,
  ShoppingCart,
} from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import type { Role } from "@prisma/client";

interface NavItem {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
}

interface NavSection {
  title: string;
  items: NavItem[];
}

function getNavSections(role: Role): NavSection[] {
  if (role === "ADMIN") {
    return [
      {
        title: "PRINCIPAL",
        items: [
          { label: "Painel",           href: "/dashboard/admin",          icon: LayoutDashboard },
          { label: "Saúde",            href: "/dashboard/admin/overview", icon: Activity        },
          { label: "Tickets / SLA",    href: "/dashboard/admin/tickets",  icon: FileText        },
          { label: "Ordens de Serviço",href: "/dashboard/admin/service-orders", icon: ClipboardList },
        ],
      },
      {
        title: "ESPAÇOS",
        items: [
          { label: "Espaços", href: "/dashboard/admin/spaces", icon: Building2 },
          { label: "Reservas", href: "/dashboard/admin/bookings", icon: Calendar },
        ],
      },
      {
        title: "PRESTADORES",
        items: [
          { label: "Prestadores", href: "/dashboard/admin/providers", icon: Users },
        ],
      },
      {
        title: "ATIVOS",
        items: [
          { label: "Equipamentos",       href: "/dashboard/admin/assets",              icon: Package },
          { label: "Planos de Manutenção", href: "/dashboard/admin/maintenance-plans", icon: Wrench  },
        ],
      },
      {
        title: "GESTÃO",
        items: [
          { label: "Compras",    href: "/dashboard/admin/purchases", icon: ShoppingCart },
          { label: "Calendário", href: "/dashboard/admin/calendar",  icon: CalendarClock },
          { label: "Relatórios", href: "/dashboard/admin/reports",   icon: BarChart3 },
          { label: "Usuários",   href: "/dashboard/admin/users",     icon: UserCog },
          { label: "Unidades",   href: "/dashboard/admin/units",     icon: Building },
        ],
      },
    ];
  }

  if (role === "RECEPTIONIST") {
    return [
      {
        title: "PRINCIPAL",
        items: [
          { label: "Painel",           href: "/dashboard/reception",              icon: LayoutDashboard },
          { label: "Reservas",         href: "/dashboard/reception/bookings",     icon: Calendar },
          { label: "Tickets / SLA",    href: "/dashboard/admin/tickets",          icon: FileText },
          { label: "Ordens de Serviço",href: "/dashboard/admin/service-orders",   icon: ClipboardList },
        ],
      },
      {
        title: "PRESTADORES",
        items: [
          { label: "Prestadores", href: "/dashboard/reception/providers", icon: Users },
        ],
      },
    ];
  }

  return [
    {
      title: "PRINCIPAL",
      items: [
        { label: "Painel", href: "/dashboard/member", icon: LayoutDashboard },
        { label: "Minhas Reservas", href: "/dashboard/member/bookings", icon: Calendar },
      ],
    },
  ];
}

interface SidebarProps {
  role: Role;
  userName: string;
  userEmail: string;
}

const ROLE_LABEL: Record<Role, string> = {
  ADMIN: "Administrador",
  RECEPTIONIST: "Recepcionista",
  MEMBER: "Membro",
};

const ROOT_PATHS = ["/dashboard/admin", "/dashboard/reception", "/dashboard/member"];

export function Sidebar({ role, userName }: SidebarProps) {
  const pathname = usePathname();
  const sections = getNavSections(role);

  const initials = userName
    .split(" ")
    .slice(0, 2)
    .map((n) => n[0])
    .join("")
    .toUpperCase();

  return (
    <aside className="w-60 bg-[#111111] text-gray-300 border-r border-[#222222] flex flex-col shrink-0">
      <div className="h-14 flex items-center px-5 border-b border-[#222222]">
        <span className="font-bold text-base tracking-tight text-white">
          Coworkingfy
        </span>
      </div>

      <nav className="flex-1 overflow-y-auto py-3 px-3 no-scrollbar">
        {sections.map((section, i) => (
          <div key={section.title} className={i > 0 ? "mt-5" : ""}>
            <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider px-2 mb-1">
              {section.title}
            </p>
            {section.items.map((item) => {
              const Icon = item.icon;
              const isRoot = ROOT_PATHS.includes(item.href);
              const isActive = isRoot
                ? pathname === item.href
                : pathname.startsWith(item.href);

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors mb-0.5 ${
                    isActive
                      ? "bg-[#222222] text-white"
                      : "text-gray-400 hover:bg-[#1a1a1a] hover:text-gray-200"
                  }`}
                >
                  <Icon
                    className={`h-4 w-4 shrink-0 ${
                      isActive ? "text-gray-200" : "text-gray-500"
                    }`}
                  />
                  {item.label}
                </Link>
              );
            })}
          </div>
        ))}
      </nav>

      <Separator className="bg-[#222222]" />

      <div className="p-3 flex items-center gap-3 hover:bg-[#1a1a1a] transition-colors rounded-xl mx-2 mb-2 cursor-pointer mt-1">
        <Avatar className="h-9 w-9 shrink-0 border border-[#333333]">
          <AvatarFallback className="bg-[#222222] text-white text-xs font-semibold">
            {initials}
          </AvatarFallback>
        </Avatar>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-white truncate">{userName}</p>
          <p className="text-xs text-gray-500">{ROLE_LABEL[role]}</p>
        </div>
      </div>
    </aside>
  );
}
