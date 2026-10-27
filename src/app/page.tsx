"use client";

import { useQuery } from "@tanstack/react-query";
import { ArrowRight, Loader2, Sparkles, UserPlus } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { useEffect, useMemo } from "react";

import logo from "@/assets/logo.png";
import { Button } from "@/components/ui/button";
import { accountsApi } from "@/lib/api";

export default function Home() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const { data: accounts, isLoading: isLoadingAccounts } = useQuery({
    queryKey: ["accounts-check", session?.user?.id],
    queryFn: accountsApi.getAll,
    enabled: status === "authenticated",
    staleTime: Infinity,
    retry: 1,
  });

  useEffect(() => {
    if (status === "authenticated" && accounts !== undefined) {
      const target = accounts.length > 0 ? "/dashboard" : "/onboarding";
      router.replace(target);
    }
  }, [status, accounts, router]);

  const isRedirecting = useMemo(() => {
    return (
      status === "loading" ||
      (status === "authenticated" &&
        (isLoadingAccounts || accounts !== undefined))
    );
  }, [status, isLoadingAccounts, accounts]);

  if (isRedirecting) {
    return (
      <div className="flex h-dvh w-full items-center justify-center ">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="fixed inset-0 flex h-dvh w-full flex-col items-center justify-center overflow-hidden  px-6">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_120%,rgba(120,119,198,0.15),transparent)]" />

      <main className="relative z-10 flex w-full max-w-[90rem] lg:max-w-5xl flex-col lg:flex-row items-center justify-center lg:justify-between gap-12 lg:gap-8">
        <div className="flex flex-col items-center lg:items-start text-center lg:text-left animate-in fade-in zoom-in duration-1000">
          <Image
            src={logo}
            alt="EggSys Logo"
            width={120}
            height={120}
            className="size-28 lg:size-32 object-contain mb-6 lg:mb-8 drop-shadow-xl"
            priority
          />

          <h1 className="text-5xl lg:text-6xl font-black tracking-tighter italic mb-4">
            EGG<span className="text-primary not-italic">SYS</span>
          </h1>

          <div className="space-y-3 lg:max-w-md mx-auto lg:mx-0">
            <p className=" text-sm lg:text-base leading-relaxed max-w-[65ch] lg:max-w-none mx-auto lg:mx-0">
              Controla tu dinero e{" "}
              <span className="font-extrabold">incuba tus metas</span>.
            </p>

            <div className="flex items-center justify-center lg:justify-start gap-1.5 text-[11px] lg:text-xs font-semibold text-primary uppercase tracking-widest">
              <Sparkles className="size-3.5 shrink-0" />
              <span>Gastos • Gráficos • Ahorros</span>
            </div>
          </div>
        </div>

        <div className="flex w-full flex-col gap-4 lg:w-[26.25rem] lg:rounded-3xl lg:border lg:border-white/5 lg:bg-white/[0.02] lg:p-8 lg:backdrop-blur-sm animate-in fade-in slide-in-from-bottom-8 lg:slide-in-from-right-8 duration-1000 lg:delay-150 lg:animate-fill-both shadow-2xl">
          <Button
            variant="default"
            size="lg"
            className="group h-14 w-full text-base font-bold shadow-lg shadow-primary/20 transition-all hover:shadow-primary/40 active:scale-95"
            asChild
          >
            <Link href="/login">
              <ArrowRight className="mr-2 h-5 w-5 transition-transform group-hover:translate-x-1" />
              Iniciar sesión
            </Link>
          </Button>

          <Button
            variant="outline"
            size="lg"
            className="h-14 w-full border-white/10 bg-white/5 text-base font-semibold backdrop-blur-sm transition-all  active:scale-95"
            asChild
          >
            <Link href="/register">
              <UserPlus className="mr-2 h-5 w-5 text-primary" />
              Crear cuenta gratuita
            </Link>
          </Button>
        </div>
      </main>

      <footer className="absolute bottom-8 flex items-center justify-center gap-2 text-[10px] font-medium uppercase tracking-[0.2em] text-gray-500 opacity-60 transition-opacity hover:opacity-100">
        <Sparkles className="size-3 text-primary" />
        EggSys v1.0.1
      </footer>
    </div>
  );
}
