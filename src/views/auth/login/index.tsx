"use client";

import { useMutation } from "@tanstack/react-query";
import { Loader2, Sparkles } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import logo from "@/assets/logo.png";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { signInWithCredentials } from "@/services/auth.service";
import { ForgotPasswordDialog } from "./components/forgot-password-dialog";

export function LoginView() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const router = useRouter();
  const { status } = useSession();

  useEffect(() => {
    if (status === "authenticated") {
      router.push("/");
    }
  }, [status, router]);

  const loginMutation = useMutation({
    mutationFn: async (credentials: Record<"email" | "password", string>) => {
      return signInWithCredentials(credentials.email, credentials.password);
    },
    onSuccess: () => {
      router.push("/");
    },
    onError: (error: any) => {
      console.error("Error durante el inicio de sesión:", error);
      const errStr = error.message;
      const errorMessages: Record<string, string> = {
        CredentialsSignin: "Correo o contraseña incorrectos.",
      };
      const friendlyMessage =
        errorMessages[errStr] ||
        (errStr.includes("CredentialsSignin")
          ? "Correo o contraseña incorrectos."
          : "Credenciales inválidas. Inténtalo de nuevo.");
      toast.error(friendlyMessage);
    },
  });

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    loginMutation.mutate({ email, password });
  };

  if (status === "loading" || status === "authenticated") {
    return (
      <div className="flex h-dvh w-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="relative min-h-dvh w-full flex flex-col items-center justify-center overflow-y-auto px-6 py-8">
      {/* Fondo con gradiente radial fijo para que no se mueva al scrollear */}
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_50%_120%,rgba(120,119,198,0.15),transparent)]" />

      {/* Main con gap-2 en móvil para compactar logo y form */}
      <main className="relative z-10 flex w-full max-w-[22rem] sm:max-w-md lg:max-w-5xl flex-col lg:flex-row items-center justify-center lg:justify-between gap-2 lg:gap-8">
        {/* Columna Izquierda: Branding */}
        <div className="flex flex-col items-center lg:items-start text-center lg:text-left animate-in fade-in zoom-in duration-1000 mb-4 lg:mb-0">
          <Image
            src={logo}
            alt="EggSys Logo"
            width={120}
            height={120}
            className="size-20 lg:size-32 object-contain mb-2 lg:mb-8 drop-shadow-xl"
            priority
          />

          <h1 className="text-4xl lg:text-6xl font-black tracking-tighter italic pr-2 lg:pr-0">
            EGG<span className="text-primary not-italic">SYS</span>
          </h1>

          <div className="hidden lg:block mt-4 space-y-3 lg:max-w-md mx-auto lg:mx-0">
            <p className="text-sm lg:text-base leading-relaxed">
              Bienvenido de vuelta. <br />
              <span className="font-extrabold">Retoma el control</span> de tus
              finanzas.
            </p>
            <div className="flex items-center justify-start gap-1.5 text-xs font-semibold text-primary uppercase tracking-widest">
              <Sparkles className="size-3.5 shrink-0" />
              <span>Acceso Seguro</span>
            </div>
          </div>
        </div>

        {/* Columna Derecha: Formulario */}
        <div className="flex w-full flex-col gap-6 lg:w-[26.25rem] rounded-2xl lg:rounded-3xl border border-border/10 lg:border-white/5 bg-background/50 lg:bg-white/[0.02] p-6 lg:p-8 backdrop-blur-sm animate-in fade-in slide-in-from-bottom-8 lg:slide-in-from-right-8 duration-1000 lg:delay-150 lg:[animation-fill-mode:both] shadow-2xl">
          <div className="text-left space-y-1">
            <h2 className="text-2xl font-bold tracking-tight">
              Iniciar sesión
            </h2>
            <p className="text-sm text-muted-foreground">
              Ingresa tus credenciales para continuar
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-sm font-semibold">
                Correo Electrónico
              </Label>
              <Input
                id="email"
                type="email"
                placeholder="nombre@ejemplo.com"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={loginMutation.isPending}
                className="h-11 bg-background/50"
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password" className="text-sm font-semibold">
                  Contraseña
                </Label>
                <ForgotPasswordDialog />
              </div>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={loginMutation.isPending}
                className="h-11 bg-background/50"
              />
            </div>

            <Button
              type="submit"
              className="w-full h-11 text-base font-bold shadow-lg shadow-primary/20 transition-all hover:shadow-primary/40 active:scale-95 mt-2"
              disabled={loginMutation.isPending}
            >
              {loginMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Iniciando
                  sesión...
                </>
              ) : (
                "Entrar a mi cuenta"
              )}
            </Button>
          </form>

          <p className="text-center text-sm text-muted-foreground mt-2">
            ¿No tienes una cuenta?{" "}
            <Link
              href="/register"
              className="font-semibold text-primary hover:underline transition-all"
            >
              Regístrate aquí
            </Link>
          </p>
        </div>
      </main>

      <footer className="mt-8 lg:absolute lg:bottom-8 flex items-center justify-center gap-2 text-[10px] font-medium uppercase tracking-[0.2em] text-gray-500 opacity-60">
        <Sparkles className="size-3 text-primary" />
        EggSys v1.0.1
      </footer>
    </div>
  );
}
