"use client";
// Precisa de signOut (ação client) e estado do dropdown

import { signOut } from "next-auth/react";
import { ChevronDown, LogOut, Building2 } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import type { Role } from "@prisma/client";

const UNITS = [
  "Coworking",
  "Prudential Campina Grande",
  "Prudential Dourados",
  "Prudential Ipatinga",
  "Stefanini Campina Grande",
];

interface HeaderProps {
  role: Role;
  userName: string;
  userEmail: string;
}

export function Header({ role, userName, userEmail }: HeaderProps) {
  const initials = userName
    .split(" ")
    .slice(0, 2)
    .map((n) => n[0])
    .join("")
    .toUpperCase();

  return (
    <header className="h-14 bg-white border-b border-gray-100 flex items-center justify-between px-6 shrink-0">
      {role === "ADMIN" ? (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="gap-2 text-sm font-medium">
              <Building2 className="h-4 w-4 text-gray-400" />
              Todas as Unidades ({UNITS.length})
              <ChevronDown className="h-3.5 w-3.5 text-gray-400" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-56">
            <DropdownMenuItem>Todas as Unidades</DropdownMenuItem>
            <DropdownMenuSeparator />
            {UNITS.map((unit) => (
              <DropdownMenuItem key={unit}>{unit}</DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      ) : (
        <div />
      )}

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="sm" className="gap-2 pr-1">
            <Avatar className="h-7 w-7">
              <AvatarFallback className="bg-yellow-100 text-yellow-800 text-xs font-semibold">
                {initials}
              </AvatarFallback>
            </Avatar>
            <ChevronDown className="h-3.5 w-3.5 text-gray-400" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuLabel className="font-normal">
            <div className="flex flex-col space-y-0.5">
              <p className="text-sm font-medium text-gray-900">{userName}</p>
              <p className="text-xs text-gray-400">{userEmail}</p>
            </div>
          </DropdownMenuLabel>
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
