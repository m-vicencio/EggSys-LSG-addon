"use client";

import { LogOut, Settings } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import logo from "@/assets/logo.png";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { HamburgerMenu } from "@/components/shared/HamburgerMenu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useIsMobile } from "@/hooks/useIsMobile";
import { useUserStore } from "@/store/userStore";

export function Navbar() {
  const isMobile = useIsMobile();
  const pathname = usePathname();
  const { data: session } = useSession();
  const userName = useUserStore((s) => s.name);
  const userImage = useUserStore((s) => s.image);

  const hideOnRoutes = [
    "/",
    "/register",
    "/login",
    "/delete-account",
    "/terms-and-conditions",
    "/privacy-policy",
  ];
  if (hideOnRoutes.includes(pathname)) return null;

  const displayName = userName ?? session?.user?.name;

  const initials = displayName
    ? displayName
        .split(" ")
        .map((n) => n[0])
        .slice(0, 2)
        .join("")
        .toUpperCase()
    : "US";

  return (
    <nav className="sticky top-0 left-0 w-full z-50 border-b bg-background/95 backdrop-blur supports-backdrop-filter:bg-background/60 shadow-sm px-4 md:px-6">
      <div className="grid grid-cols-3 items-center h-14">
        <div className="flex items-center gap-3 justify-start">
          {!isMobile && <HamburgerMenu />}
          <Link
            href="/dashboard"
            className="flex items-center gap-2 transition-opacity hover:opacity-80"
          >
            <Image
              src={logo}
              alt="Logo de EggSys"
              width={28}
              height={28}
              style={{ width: "auto", height: "auto" }}
              className="rounded-md"
            />
            <span className="font-bold text-lg tracking-tight hidden sm:inline-block">
              EggSys
            </span>
          </Link>
        </div>

        <div className="flex justify-center">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                className="relative h-9 w-9 rounded-full"
                aria-label="Ver configuración"
              >
                <Avatar className="h-9 w-9 border border-border/50">
                  <AvatarImage
                    src={userImage ?? session?.user?.image ?? undefined}
                    alt={displayName || "Avatar"}
                  />
                  <AvatarFallback className="bg-primary/10 text-primary font-medium">
                    {initials}
                  </AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>

            <DropdownMenuContent className="w-56" align="center" forceMount>
              <DropdownMenuLabel className="font-normal text-center">
                <div className="flex flex-col space-y-1">
                  <p className="text-sm font-medium leading-none">
                    {displayName || "Usuario"}
                  </p>
                  <p className="text-xs leading-none text-muted-foreground mt-1">
                    {session?.user?.email || "Sin correo asociado"}
                  </p>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link
                  href="/configuration"
                  className="cursor-pointer flex items-center justify-center"
                >
                  <Settings className="mr-2 h-4 w-4" />
                  <span>Configuración</span>
                </Link>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <div className="flex justify-end">
          <ConfirmDialog
            trigger={
              <Button
                variant="outline"
                size="icon"
                className="text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                aria-label="Cerrar sesión"
                title="Cerrar sesión"
              >
                <LogOut className="size-4" />
              </Button>
            }
            title="Cerrar sesión"
            description="¿Estás seguro de que deseas cerrar sesión?"
            confirmText="Cerrar sesión"
            cancelText="Cancelar"
            confirmVariant="destructive"
            onConfirm={() => signOut({ callbackUrl: "/" })}
          />
        </div>
      </div>
    </nav>
  );
}
