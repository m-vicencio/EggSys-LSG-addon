"use client";

import { useMutation } from "@tanstack/react-query";
import { Loader2, Sparkles, UserPlus } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

import logo from "@/assets/logo.png";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { registerUser } from "@/services/auth.service";

export function RegisterView() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const router = useRouter();

  const registerMutation = useMutation({
    mutationFn: registerUser,
    onSuccess: () => {
      toast.success("¡Registro exitoso! Redirigiendo al login...");
      setTimeout(() => {
        router.push("/login");
      }, 2000);
    },
    onError: (error: unknown) => {
      console.error("Error durante el registro:", error);
      const errorMessage =
        error instanceof Error
          ? error.message
          : "Ocurrió un error inesperado.";
      toast.error(errorMessage);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!name || !email || !password) {
      toast.error("Todos los campos son obligatorios.");
      return;
    }

    registerMutation.mutate({ name, email, password });
  };

  return (
    <div className="relative min-h-dvh w-full flex flex-col items-center justify-center overflow-y-auto px-6 py-8">
      {" "}
      {/* Fondo con gradiente radial */}
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_50%_120%,rgba(120,119,198,0.15),transparent)]" />{" "}
      <main className="relative z-10 flex w-full max-w-88 sm:max-w-md lg:max-w-5xl flex-col lg:flex-row items-center justify-center lg:justify-between gap-2 lg:gap-8">
        {" "}
        {/* Columna Izquierda: Branding */}
        <div className="flex flex-col items-center lg:items-start text-center lg:text-left animate-in fade-in zoom-in duration-1000 mb-4 lg:mb-0">
          {" "}
          <Image
            src={logo}
            alt="EggSys Logo"
            width={120}
            height={120}
            className="size-24 lg:size-32 object-contain mb-2 lg:mb-8 drop-shadow-xl"
            priority
          />
          <h1 className="text-4xl lg:text-6xl font-black tracking-tighter italic mb-0 lg:mb-4 pr-2 lg:pr-0">
            EGG<span className="text-primary not-italic">SYS</span>
          </h1>
          <div className="hidden lg:block space-y-3 lg:max-w-md mx-auto lg:mx-0">
            <p className="text-sm lg:text-base leading-relaxed max-w-65 lg:max-w-none mx-auto lg:mx-0">
              Únete a la comunidad. <br className="hidden lg:block" />
              Empieza a{" "}
              <span className="font-extrabold">incubar tus ahorros</span> hoy
              mismo.
            </p>

            <div className="flex items-center justify-center lg:justify-start gap-1.5 text-[11px] lg:text-xs font-semibold text-primary uppercase tracking-widest">
              <Sparkles className="size-3.5 shrink-0" />
              <span>Cuenta Gratuita</span>
            </div>
          </div>
        </div>
        {/* Columna Derecha: Formulario de Registro */}
        <div className="flex w-full flex-col gap-6 lg:w-105 rounded-2xl lg:rounded-3xl border border-border/10 lg:border-white/5 bg-background/50 lg:bg-white/2 p-6 lg:p-8 backdrop-blur-sm animate-in fade-in slide-in-from-bottom-8 lg:slide-in-from-right-8 duration-1000 lg:delay-150 lg:fill-mode-both shadow-2xl">
          <div className="text-left space-y-1">
            <h2 className="text-2xl font-bold tracking-tight">Crear cuenta</h2>
            <p className="text-sm text-muted-foreground">
              Completa tus datos para comenzar
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name" className="text-sm font-semibold">
                Nombre completo
              </Label>
              <Input
                id="name"
                placeholder="Ej. Jorge Gonzales"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                disabled={registerMutation.isPending}
                className="h-11 bg-background/50"
              />
            </div>

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
                disabled={registerMutation.isPending}
                className="h-11 bg-background/50"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="text-sm font-semibold">
                Contraseña
              </Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={registerMutation.isPending}
                className="h-11 bg-background/50"
              />
            </div>

            <Button
              type="submit"
              className="w-full h-11 text-base font-bold shadow-lg shadow-primary/20 transition-all hover:shadow-primary/40 active:scale-95 mt-2"
              disabled={
                registerMutation.isPending || registerMutation.isSuccess
              }
            >
              {registerMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  Creando cuenta...
                </>
              ) : (
                <>
                  <UserPlus className="mr-2 h-5 w-5" />
                  Registrarme ahora
                </>
              )}
            </Button>
          </form>

          <p className="text-center text-sm text-muted-foreground mt-2">
            ¿Ya tienes una cuenta?{" "}
            <Link
              href="/login"
              className="font-semibold text-primary hover:underline transition-all"
            >
              Inicia sesión
            </Link>
          </p>
        </div>
      </main>
      <footer className="mt-12 lg:absolute lg:bottom-8 flex items-center justify-center gap-2 text-[10px] font-medium uppercase tracking-[0.2em] text-gray-500 opacity-60">
        {" "}
        <Sparkles className="size-3 text-primary" />
        EggSys v1.0.1
      </footer>
    </div>
  );
}
