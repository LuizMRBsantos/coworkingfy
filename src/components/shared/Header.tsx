"use client";
// Precisa de signOut (ação client), estado do dropdown e navegação por URL

import { usePathname, useSearchParams, useRouter } from "next/navigation";
import { signOut } from "next-auth/react";
import { ChevronDown, LogOut, Building2, Check } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import type { Role } from "@prisma/client";

interface Unit {
  id:   string;
  name: string;
}

interface HeaderProps {
  role:      Role;
  userName:  string;
  userEmail: string;
  units:     Unit[];
}

export function Header({ role, userName, userEmail, units }: HeaderProps) {
  const pathname    = usePathname();
  const searchParams = useSearchParams();
  const router      = useRouter();

  const currentUnitId   = searchParams.get("unitId") ?? undefined;
  const currentUnit     = units.find((u) => u.id === currentUnitId);
  const showUnitPicker  = role === "ADMIN" || role === "RECEPTIONIST";

  const initials = userName
    .split(" ")
    .slice(0, 2)
    .map((n) => n[0])
    .join("")
    .toUpperCase();

  function navigateToUnit(unitId: string | undefined) {
    const params = new URLSearchParams(searchParams.toString());
    if (unitId) {
      params.set("unitId", unitId);
    } else {
      params.delete("unitId");
    }
    // Reset page when changing unit filter
    params.delete("page");
    const qs = params.toString();
    router.push(`${pathname}${qs ? `?${qs}` : ""}`);
  }

  return (
    <header className="h-14 bg-white border-b border-gray-100 flex items-center justify-between px-6 shrink-0">
      {showUnitPicker && units.length > 0 ? (
        <DropdownMenu>
          <DropdownMenuTrigger className="flex items-center gap-2 h-8 px-2.5 rounded-md border border-gray-200 bg-white text-sm font-medium hover:bg-gray-50 transition-colors outline-none focus-visible:ring-2 focus-visible:ring-gray-200">
            <Building2 className="h-4 w-4 text-gray-500" />
            {currentUnit ? currentUnit.name : `Todas (${units.length})`}
            <ChevronDown className="h-3.5 w-3.5 text-gray-400" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-56">
            {role === "ADMIN" && (
              <>
                <DropdownMenuItem
                  className="cursor-pointer"
                  onClick={() => navigateToUnit(undefined)}
                >
                  <span className="flex-1">Todas as Unidades</span>
                  {!currentUnitId && <Check className="h-3.5 w-3.5 text-gray-500" />}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
              </>
            )}
            {units.map((unit) => (
              <DropdownMenuItem
                key={unit.id}
                className="cursor-pointer"
                onClick={() => navigateToUnit(unit.id)}
              >
                <span className="flex-1">{unit.name}</span>
                {currentUnitId === unit.id && <Check className="h-3.5 w-3.5 text-gray-500" />}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      ) : (
        <div />
      )}

      <DropdownMenu>
        <DropdownMenuTrigger className="flex items-center gap-2 h-8 px-2 rounded-md hover:bg-gray-50 transition-colors outline-none focus-visible:ring-2 focus-visible:ring-gray-200">
          <Avatar className="h-7 w-7">
            <AvatarFallback className="bg-zinc-900 text-white text-xs font-medium">
              {initials}
            </AvatarFallback>
          </Avatar>
          <div className="text-left hidden sm:block">
            <p className="text-sm font-medium text-gray-900 leading-none">{userName}</p>
            <p className="text-xs text-gray-400 mt-0.5">{userEmail}</p>
          </div>
          <ChevronDown className="h-3.5 w-3.5 text-gray-400" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <div className="px-2 py-1.5">
            <p className="text-sm font-medium text-gray-900">{userName}</p>
            <p className="text-xs text-gray-400">{userEmail}</p>
          </div>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onClick={() => signOut({ callbackUrl: "/login" })}
            className="text-red-600 focus:text-red-600 cursor-pointer"
          >
            <LogOut className="mr-2 h-4 w-4" />
            Sair
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </header>
  );
}
