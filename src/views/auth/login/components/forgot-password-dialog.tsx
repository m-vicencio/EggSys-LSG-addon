"use client";

import { useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { forgotPassword } from "@/services/auth.service";

export function ForgotPasswordDialog() {
  const [email, setEmail] = useState("");
  const [isOpen, setIsOpen] = useState(false);

  const forgotPasswordMutation = useMutation({
    mutationFn: forgotPassword,
    onSuccess: () => {
      toast.info(
        "Si existe una cuenta con ese correo, se ha enviado un enlace para restablecer la contraseña.",
      );
      setIsOpen(false);
      setEmail("");
    },
    onError: (error) => {
      console.error("Error al enviar el enlace de restablecimiento:", error);
      toast.error(
        "Ocurrió un error al procesar la solicitud. Inténtalo de nuevo.",
      );
    },
  });

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    forgotPasswordMutation.mutate(email);
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button
          variant="link"
          className="p-0 h-auto font-medium text-blue-600 hover:underline"
        >
          ¿Olvidaste tu contraseña?
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-106.25">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Restablecer contraseña</DialogTitle>
            <DialogDescription>
              Introduce tu dirección de correo y te enviaremos un enlace para
              restablecer tu contraseña.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="email-forgot" className="text-right">
                Correo electrónico
              </Label>
              <Input
                id="email-forgot"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="col-span-3"
                required
                disabled={forgotPasswordMutation.isPending}
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="submit" disabled={forgotPasswordMutation.isPending}>
              {forgotPasswordMutation.isPending
                ? "Enviando..."
                : "Enviar enlace de restablecimiento"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
