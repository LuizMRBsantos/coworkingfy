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
  Users,
  UserCheck,
  BarChart3,
  UserCog,
  Building,
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
          { label: "Painel", href: "/dashboard/admin", icon: LayoutDashboard },
          { label: "Tickets / SLA", href: "/dashboard/admin/tickets", icon: FileText },
          { label: "Ordens de Serviço", href: "/dashboard/admin/service-orders", icon: ClipboardList },
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
          { label: "Recorrentes", href: "/dashboard/admin/providers/recurring", icon: Users },
          { label: "Pontuais", href: "/dashboard/admin/providers/punctual", icon: UserCheck },
        ],
      },
      {
        title: "GESTÃO",
        items: [
          { label: "Relatórios", href: "/dashboard/admin/reports", icon: BarChart3 },
          { label: "Usuários", href: "/dashboard/admin/users", icon: UserCog },
          { label: "Unidades", href: "/dashboard/admin/units", icon: Building },
        ],
      },
    ];
  }

  if (role === "RECEPTIONIST") {
    return [
      {
        title: "PRINCIPAL",
        items: [
          { label: "Painel", href: "/dashboard/reception", icon: LayoutDashboard },
          { label: "Tickets / SLA", href: "/dashboard/admin/tickets", icon: FileText },
          { label: "Ordens de Serviço", href: "/dashboard/admin/service-orders", icon: ClipboardList },
        ],
      },
      {
        title: "PRESTADORES",
        items: [
          { label: "Recorrentes", href: "/dashboard/reception/providers/recurring", icon: Users },
          { label: "Pontuais", href: "/dashboard/reception/providers/punctual", icon: UserCheck },
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
    <aside className="w-60 bg-white border-r border-gray-100 flex flex-col shrink-0">
      <div className="h-14 flex items-center px-5 border-b border-gray-100">
        <span className="font-bold text-base tracking-tight text-gray-900">
          Coworkingfy
        </span>
      </div>

      <nav className="flex-1 overflow-y-auto py-3 px-3">
        {sections.map((section, i) => (
          <div key={section.title} className={i > 0 ? "mt-5" : ""}>
            <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider px-2 mb-1">
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
                  className={`flex items-center gap-2.5 px-2 py-2 rounded-lg text-sm font-medium transition-colors mb-0.5 ${
                    isActive
                      ? "bg-yellow-50 text-yellow-800"
                      : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                  }`}
                >
                  <Icon
                    className={`h-4 w-4 shrink-0 ${
                      isActive ? "text-yellow-600" : "text-gray-400"
                    }`}
                  />
                  {item.label}
                </Link>
              );
            })}
          </div>
        ))}
      </nav>

      <Separator />

      <div className="p-3 flex items-center gap-3">
        <Avatar className="h-8 w-8 shrink-0">
          <AvatarFallback className="bg-yellow-100 text-yellow-800 text-xs font-semibold">
            {initials}
          </AvatarFallback>
        </Avatar>
        <div className="min-w-0">
          <p className="text-sm font-medium text-gray-900 truncate">{userName}</p>
          <p className="text-xs text-gray-400">{ROLE_LABEL[role]}</p>
        </div>
      </div>
    </aside>
  );
}
