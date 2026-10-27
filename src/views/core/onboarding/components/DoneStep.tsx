import { ArrowRight, CheckCircle2, Sparkles } from "lucide-react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export function DoneStep() {
  const router = useRouter();

  return (
    <Card className="animate-in zoom-in-95 fade-in duration-500 border-none shadow-2xl bg-transparent">
      <CardContent className="flex flex-col items-center gap-8 py-16 text-center">
        <div className="relative">
          <div className="absolute inset-0 bg-emerald-500/20 blur-3xl rounded-full animate-pulse" />

          <div className="relative z-10 flex items-center justify-center">
            <div className="bg-emerald-500 text-white rounded-3xl p-6 shadow-[0_0_40px_-10px_rgba(16,185,129,0.5)] animate-in zoom-in-50 bounce-in duration-700">
              <CheckCircle2 className="h-16 w-16" />
            </div>

            <Sparkles className="absolute -top-2 -right-2 h-8 w-8 text-yellow-500 animate-bounce delay-150" />
            <Sparkles className="absolute -bottom-4 -left-6 h-6 w-6 text-emerald-400 animate-pulse" />
          </div>
        </div>

        <div className="space-y-3 relative">
          <h2 className="text-4xl font-black tracking-tight bg-linear-to-b from-foreground to-foreground/70 bg-clip-text text-transparent">
            Configuración completa
          </h2>
          <p className="text-muted-foreground max-w-85 mx-auto text-lg leading-relaxed">
            Preparamos el espacio para que tomes el control de tus finanzas.
          </p>
        </div>

        <div className="w-full max-w-sm pt-4">
          <Button
            size="lg"
            className="relative w-full h-15 text-lg font-black rounded-2xl shadow-xl shadow-emerald-500/20 bg-emerald-600 hover:bg-emerald-500 transition-all hover:scale-[1.03] active:scale-[0.97] group"
            onClick={() => router.push("/dashboard")}
          >
            <span>Explorar mi dashboard</span>
            <ArrowRight className="absolute right-6 h-6 w-6 transition-transform group-hover:translate-x-2" />
          </Button>

          <p className="mt-4 text-[11px] font-bold uppercase tracking-[0.2em] text-muted-foreground/50">
            Redirigiendo a tu resumen financiero
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
