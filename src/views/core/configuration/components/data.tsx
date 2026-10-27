"use client";

import { useRouter } from "next/navigation";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export function DataSettings() {
  const router = useRouter();

  return (
    <Card className="rounded-2xl border-destructive/20 shadow-sm">
      <CardHeader>
        <CardTitle className="text-destructive">Zona de peligro</CardTitle>
        <CardDescription>
          Acciones irreversibles sobre tus datos.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 border rounded-2xl border-destructive/20 bg-destructive/5">
          <div className="space-y-1">
            <p className="font-semibold text-foreground">
              Borrar todos mis datos
            </p>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Elimina tu cuenta y todos tus datos asociados de forma permanente.
            </p>
          </div>

          <ConfirmDialog
            trigger={
              <Button variant="destructive" className="rounded-xl font-bold">
                Borrar datos
              </Button>
            }
            title="Esto eliminará todos tus datos"
            description="Serás redirigido a una pantalla de verificación final donde deberás ingresar tu correo y contraseña."
            confirmText="Continuar"
            cancelText="Cancelar"
            onConfirm={() => router.push("/delete-account")}
          />
        </div>
      </CardContent>
    </Card>
  );
}

export default DataSettings;
