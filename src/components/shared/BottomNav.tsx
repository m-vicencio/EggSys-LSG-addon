"use client";

import { BarChart3, CreditCard, Home, Settings, Wallet } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useIsMobile } from "@/hooks/useIsMobile";
import { cn } from "@/lib/utils";

export function BottomNav() {
  const isMobile = useIsMobile();
  const pathname = usePathname();

  if (!isMobile) return null;

  const hideOnRoutes = [
    "/",
    "/register",
    "/login",
    "/onboarding",
    "/delete-account",
    "/terms-and-conditions",
    "/privacy-policy",
  ];
  if (hideOnRoutes.includes(pathname)) return null;

  const navItems = [
    { name: "Dashboard", href: "/dashboard", icon: Home },
    { name: "Presupuesto", href: "/budget", icon: Wallet },
    { name: "Cuentas", href: "/accounts", icon: CreditCard },
    { name: "Informes", href: "/graphics", icon: BarChart3 },
    { name: "Ajustes", href: "/configuration", icon: Settings },
  ];

  return (
    <nav className="fixed bottom-0 left-0 w-full z-50 bg-background/90 backdrop-blur-lg border-t shadow-[0_-4px_10px_-4px_rgba(0,0,0,0.05)] pb-[env(safe-area-inset-bottom)]">
      <div className="flex justify-around items-center h-16 px-2">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href;

          return (
            <Link
              key={item.name}
              href={item.href}
              aria-label={item.name}
              className="flex flex-col items-center justify-center w-full h-full gap-1 pt-1 group"
            >
              <div
                className={cn(
                  "flex items-center justify-center rounded-full transition-all duration-300",
                  "px-4 py-1",
                  isActive
                    ? "bg-primary/15"
                    : "bg-transparent scale-95 group-hover:bg-muted/50",
                )}
              >
                <Icon
                  className={cn(
                    "size-5 transition-all duration-300",
                    isActive ? "text-primary" : "text-muted-foreground",
                  )}
                />
              </div>

              <span
                className={cn(
                  "text-[10px] font-medium transition-colors duration-300",
                  isActive ? "text-primary" : "text-muted-foreground",
                )}
              >
                {item.name}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
