"use client";

import { ArrowLeftIcon, HomeIcon } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  const router = useRouter();

  return (
    <main className="min-h-screen flex flex-col items-center justify-center bg-slate-50 p-6 relative overflow-hidden">
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-150 h-150 bg-indigo-100/40 rounded-full blur-3xl -z-10" />
      <div className="max-w-md w-full text-center space-y-6 z-10">
        <div className="flex flex-col items-center justify-center space-y-4">
          <Image
            src="/eggsys.svg"
            alt="Logo de Eggsys"
            width={72}
            height={72}
            className="object-contain"
          />

          <h1 className="text-4xl font-black  tracking-widest">404</h1>
        </div>
        <div className="space-y-3 px-2">
          <h2 className="text-2xl md:text-3xl font-bold tracking-tight text-slate-900">
            ¡Ups! Te saliste del mapa
          </h2>
          <p className="text-slate-500 text-[15px] leading-relaxed">
            Lo sentimos, pero no pudimos encontrar la página que buscabas. Es
            posible que el enlace esté roto o la página ya no exista.
          </p>
        </div>

        <div className="flex flex-col gap-3 pt-4 sm:px-6">
          <Button
            asChild
            size="lg"
            className="w-full text-base h-12 rounded-xl"
          >
            <Link href="/">
              <HomeIcon className="w-5 h-5 mr-2" />
              Ir al Inicio
            </Link>
          </Button>
          <Button
            variant="outline"
            size="lg"
            className="w-full text-base h-12 rounded-xl text-slate-600 border-slate-200 hover:bg-slate-100"
            onClick={() => router.back()}
          >
            <ArrowLeftIcon className="w-5 h-5 mr-2" />
            Volver atrás
          </Button>
        </div>
      </div>
    </main>
  );
}
