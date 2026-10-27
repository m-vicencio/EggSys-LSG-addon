"use client";

import { useMutation } from "@tanstack/react-query";
import { AlertTriangle, Loader2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import { useState } from "react";
import { toast } from "sonner";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { deleteAccountWithCredentials } from "@/services/auth.service";

export function DeleteAccountView() {
  const router = useRouter();
  const { status } = useSession();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [firstConfirmationAccepted, setFirstConfirmationAccepted] =
    useState(false);

  const deleteMutation = useMutation({
    mutationFn: deleteAccountWithCredentials,
    onSuccess: async () => {
      toast.success("Tu cuenta fue eliminada correctamente.");

      if (status === "authenticated") {
        await signOut({ redirect: false });
      }

      router.push("/login");
    },
    onError: (error) => {
      toast.error(error.message || "No se pudo eliminar la cuenta.");
    },
  });

  const canRunFinalDelete =
    firstConfirmationAccepted && email.trim().length > 0 && password.length > 0;

  return (
    <div className="flex min-h-dvh items-center justify-center bg-muted/30 p-4">
      <Card className="w-full max-w-md border-destructive/30 shadow-lg">
        <CardHeader>
          <div className="mb-3 inline-flex h-10 w-10 items-center justify-center rounded-full bg-destructive/10 text-destructive">
            <AlertTriangle className="h-5 w-5" />
          </div>
          <CardTitle className="text-destructive">Borrar cuenta</CardTitle>
          <CardDescription>
            Esta acción es irreversible. Debes confirmar dos veces e ingresar
            tus credenciales para continuar.
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="delete-email">Correo electrónico</Label>
            <Input
              id="delete-email"
              type="email"
              placeholder="nombre@ejemplo.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={deleteMutation.isPending}
              required
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="delete-password">Contraseña</Label>
            <Input
              id="delete-password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={deleteMutation.isPending}
              required
            />
          </div>

          <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-3 text-sm text-muted-foreground">
            Se eliminarán tus cuentas, categorías, presupuestos, transacciones,
            transferencias, configuraciones y progreso de mascota.
          </div>
        </CardContent>

        <CardFooter className="flex flex-col items-stretch gap-2 border-t pt-4">
          <ConfirmDialog
            trigger={
              <Button
                type="button"
                variant="outline"
                className="w-full"
                disabled={deleteMutation.isPending || firstConfirmationAccepted}
              >
                ESTO ELIMINARA TODOS TUS DATOS
              </Button>
            }
            title="Esto eliminará todos tus datos"
            description="Si continúas, pasarás a la confirmación final para borrar tu cuenta definitivamente."
            confirmText="Entiendo"
            cancelText="Cancelar"
            onConfirm={() => {
              setFirstConfirmationAccepted(true);
              toast.warning("Primera confirmación aceptada.");
            }}
          />

          <ConfirmDialog
            trigger={
              <Button
                type="button"
                variant="destructive"
                className="w-full font-bold"
                disabled={deleteMutation.isPending || !canRunFinalDelete}
              >
                {deleteMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Eliminando cuenta...
                  </>
                ) : (
                  "ESTAS SEGURO?"
                )}
              </Button>
            }
            title="¿Estás completamente seguro?"
            description="Esta acción no se puede deshacer. La cuenta y todos los datos asociados serán eliminados permanentemente."
            confirmText="Sí, borrar todo"
            cancelText="Cancelar"
            confirmDisabled={!canRunFinalDelete || deleteMutation.isPending}
            onConfirm={() => {
              deleteMutation.mutate({ email: email.trim(), password });
            }}
          />

          <div className="pt-1 text-center text-sm text-muted-foreground">
            <Link
              href="/login"
              className="font-medium text-blue-600 hover:underline"
            >
              Volver a iniciar sesión
            </Link>
          </div>
        </CardFooter>
      </Card>
    </div>
  );
}

export default DeleteAccountView;
