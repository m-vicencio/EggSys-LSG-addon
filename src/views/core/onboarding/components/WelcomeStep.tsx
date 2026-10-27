import { BarChart3, CreditCard, Wallet } from "lucide-react";
import type { Session } from "next-auth";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

interface WelcomeStepProps {
  session: Session | null;
  onNext: () => void;
}

export function WelcomeStep({ session, onNext }: WelcomeStepProps) {
  return (
    <Card className="animate-in fade-in slide-in-from-bottom-4 duration-500">
      <CardHeader className="text-center pb-2">
        <div className="flex justify-center mb-6">
          <div className="bg-primary/10 rounded-full p-5 ring-8 ring-primary/5">
            <Wallet className="h-10 w-10 text-primary" />
          </div>
        </div>
        <CardTitle className="text-3xl font-bold tracking-tight">
          ¡Bienvenido al Gestor!
        </CardTitle>
        <CardDescription className="text-base mt-2">
          Hola,{" "}
          <span className="font-semibold text-foreground">
            {session?.user?.name || session?.user?.email}
          </span>{" "}
          👋
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6 text-center pt-2">
        <p className="text-muted-foreground text-sm px-4">
          Controla tus ingresos y gastos de manera sencilla. En unos pasos
          rápidos configuraremos tu espacio personal.
        </p>
        <div className="grid grid-cols-3 gap-4 py-4">
          {[
            {
              icon: CreditCard,
              label: "Cuentas",
              color: "text-blue-500",
              bg: "bg-blue-500/10",
            },
            {
              icon: Wallet,
              label: "Presupuestos",
              color: "text-emerald-500",
              bg: "bg-emerald-500/10",
            },
            {
              icon: BarChart3,
              label: "Estadísticas",
              color: "text-violet-500",
              bg: "bg-violet-500/10",
            },
          ].map((item) => (
            <div
              key={item.label}
              className="flex flex-col items-center gap-3 rounded-2xl border border-border/50 bg-card p-4 transition-all hover:border-primary/30 hover:shadow-md group"
            >
              <div
                className={`rounded-full p-3 ${item.bg} transition-transform group-hover:scale-110`}
              >
                <item.icon className={`h-6 w-6 ${item.color}`} />
              </div>
              <span className="text-[11px] font-bold uppercase tracking-tight text-muted-foreground">
                {item.label}
              </span>
            </div>
          ))}
        </div>
        <Button size="lg" className="w-full text-md h-12" onClick={onNext}>
          Empezar configuración
        </Button>
      </CardContent>
    </Card>
  );
}
