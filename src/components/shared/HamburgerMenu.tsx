"use client";

import {
  BarChart3,
  CreditCard,
  Home,
  LogOut,
  Menu,
  Settings,
  Wallet,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import { useState } from "react";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import { useUserStore } from "@/store/userStore";

const NAV_LINKS = [
  { name: "Dashboard", href: "/dashboard", icon: Home },
  { name: "Presupuesto", href: "/budget", icon: Wallet },
  { name: "Cuentas", href: "/accounts", icon: CreditCard },
  { name: "Informes", href: "/graphics", icon: BarChart3 },
  { name: "Configuración", href: "/configuration", icon: Settings },
];

export function HamburgerMenu() {
  const [open, setOpen] = useState(false);
  const { data: session } = useSession();
  const userName = useUserStore((s) => s.name);
  const userImage = useUserStore((s) => s.image);
  const pathname = usePathname();

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
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" aria-label="Abrir menú">
          <Menu className="h-6 w-6" />
        </Button>
      </SheetTrigger>

      <SheetContent side="left" className="w-72 p-0 flex flex-col">
        <SheetHeader className="p-4 border-b text-left">
          <div className="flex items-center gap-3">
            <Avatar className="h-10 w-10 border border-border/50">
              {userImage || session?.user?.image ? (
                <AvatarImage
                  src={userImage ?? (session?.user?.image || undefined)}
                  alt={displayName || "Avatar"}
                />
              ) : null}
              <AvatarFallback className="bg-primary/10 text-primary font-medium">
                {initials}
              </AvatarFallback>
            </Avatar>
            <div className="flex flex-col">
              <SheetTitle className="text-base font-semibold leading-none">
                {displayName || "Usuario"}
              </SheetTitle>
              <span className="text-xs text-muted-foreground mt-1 truncate max-w-48">
                {session?.user?.email || "Sin correo asociado"}
              </span>
            </div>
          </div>
        </SheetHeader>

        <nav className="flex-1 overflow-y-auto p-3">
          <div className="flex flex-col gap-1">
            {NAV_LINKS.map((link) => {
              const isActive = pathname === link.href;
              const Icon = link.icon;

              return (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setOpen(false)}
                  className={cn(
                    "relative flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                    isActive
                      ? "bg-secondary text-secondary-foreground"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground",
                  )}
                >
                  {isActive && (
                    <span className="absolute left-0 top-1/2 -translate-y-1/2 h-4 w-1 bg-primary rounded-r-md" />
                  )}

                  <Icon
                    className={cn("h-5 w-5", isActive ? "text-primary" : "")}
                  />
                  {link.name}
                </Link>
              );
            })}
          </div>
        </nav>

        <div className="p-4 border-t mt-auto">
          <ConfirmDialog
            trigger={
              <Button
                variant="destructive"
                className="w-full flex items-center justify-center gap-2"
              >
                <LogOut className="h-5 w-5" />
                <span className="font-medium">Cerrar sesión</span>
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
      </SheetContent>
    </Sheet>
  );
}
