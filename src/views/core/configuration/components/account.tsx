"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Gamepad2, ImageIcon, Loader2, Upload } from "lucide-react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { type ChangeEvent, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import * as z from "zod";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAppStore } from "@/store/useAppStore";
import { useUserStore } from "@/store/userStore";

// --- 1. ESQUEMAS DE VALIDACIÓN ---
const profileSchema = z.object({
  name: z
    .string()
    .min(2, { message: "El nombre debe tener al menos 2 caracteres." })
    .max(50, { message: "El nombre no puede exceder los 50 caracteres." }),
});

const passwordSchema = z
  .object({
    currentPassword: z.string().min(1, { message: "Requerido" }),
    newPassword: z.string().min(8, { message: "Mínimo 8 caracteres" }),
    confirmPassword: z.string(),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "Las contraseñas no coinciden.",
    path: ["confirmPassword"],
  });

type ProfileFormValues = z.infer<typeof profileSchema>;
type PasswordFormValues = z.infer<typeof passwordSchema>;

export function AccountSettings() {
  const isOnline = useAppStore((state) => state.isOnline);
  const { data: session, update } = useSession();
  const userName = useUserStore((s) => s.name);
  const userImage = useUserStore((s) => s.image);

  // Estados para Avatar
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const initials = (userName || session?.user?.name || "US")
    .substring(0, 2)
    .toUpperCase();

  // --- 2. INICIALIZACIÓN DE FORMULARIOS ---
  const profileForm = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    values: {
      name: userName || session?.user?.name || "",
    },
  });

  const passwordForm = useForm<PasswordFormValues>({
    resolver: zodResolver(passwordSchema),
    defaultValues: {
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    },
  });

  // --- 3. LÓGICA DE AVATAR (Cloudinary) ---
  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0] ?? null;
    setSelectedFile(f);
    if (!f) return setPreview(null);
    const reader = new FileReader();
    reader.onload = () => setPreview(String(reader.result));
    reader.readAsDataURL(f);
  };

  const uploadAvatar = async () => {
    if (!selectedFile) return toast.error("Selecciona una imagen primero");
    setIsUploading(true);
    try {
      const signRes = await fetch("/api/users/cloudinary/sign", {
        method: "POST",
      });
      const signJson = await signRes.json();
      if (!signRes.ok) throw new Error(signJson?.message || "Error signing");

      const { timestamp, signature, apiKey, cloudName } = signJson;
      const formData = new FormData();
      formData.append("file", selectedFile);
      formData.append("api_key", apiKey);
      formData.append("timestamp", String(timestamp));
      formData.append("signature", signature);

      const uploadRes = await fetch(
        `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`,
        { method: "POST", body: formData },
      );
      const uploadJson = await uploadRes.json();
      if (!uploadRes.ok) throw new Error("Error en Cloudinary");

      const url = uploadJson.secure_url;
      const persistRes = await fetch("/api/users/cloudinary/callback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
      });

      if (!persistRes.ok) throw new Error("Error al guardar en BD");

      await update({ image: url });
      useUserStore.getState().setUser({ image: url });
      toast.success("Foto actualizada");
      setSelectedFile(null);
      setPreview(null);
    } catch (error: unknown) {
      toast.error((error as Error).message || "Error al subir");
    } finally {
      setIsUploading(false);
    }
  };

  // --- 4. FUNCIONES DE ENVÍO (Submit) ---
  const onProfileSubmit = async (values: ProfileFormValues) => {
    try {
      if (!session?.user?.id) throw new Error("No hay sesión activa");
      const res = await fetch(`/api/users/${session.user.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: values.name }),
      });
      if (!res.ok) throw new Error("Error al actualizar perfil");

      await update({ name: values.name });
      useUserStore.getState().setUser({ name: values.name });
      toast.success("Nombre actualizado");
    } catch (error: unknown) {
      toast.error((error as Error).message || "Error al actualizar");
    }
  };

  const onPasswordSubmit = async (values: PasswordFormValues) => {
    try {
      const res = await fetch("/api/users/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          currentPassword: values.currentPassword,
          newPassword: values.newPassword,
        }),
      });
      const json = await res.json();
      if (!res.ok)
        throw new Error(json?.message || "Error al cambiar contraseña");

      passwordForm.reset();
      toast.success("Contraseña actualizada");
    } catch (error: unknown) {
      toast.error((error as Error).message || "Contraseña actual incorrecta");
    }
  };

  return (
    <div className="space-y-6">
      <Card className="rounded-2xl shadow-sm border-border">
        <CardHeader>
          <CardTitle>Perfil</CardTitle>
          <CardDescription>Actualiza tu foto y nombre visible.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-8 pb-6">
          <div className="flex flex-col sm:flex-row items-center gap-6 p-5 rounded-2xl bg-muted/20 border border-dashed border-border/60">
            <Avatar className="h-24 w-24 border-2 border-background shadow-xl">
              <AvatarImage
                src={preview || userImage || session?.user?.image || ""}
                className="object-cover"
              />
              <AvatarFallback className="text-3xl">{initials}</AvatarFallback>
            </Avatar>
            <div className="flex flex-col gap-3 flex-1">
              <div className="flex flex-wrap gap-2">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleFileChange}
                  className="hidden"
                />
                <Button
                  variant="secondary"
                  size="sm"
                  className="rounded-xl font-bold"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploading}
                >
                  <ImageIcon className="mr-2 h-4 w-4" />
                  {preview ? "Cambiar" : "Seleccionar"}
                </Button>
                {preview && (
                  <Button
                    size="sm"
                    className="rounded-xl font-bold"
                    onClick={uploadAvatar}
                    disabled={isUploading || !isOnline}
                  >
                    {isUploading ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Upload className="mr-2 h-4 w-4" />
                    )}
                    {!isOnline ? "Sin conexión" : "Subir foto"}
                  </Button>
                )}
              </div>
            </div>
          </div>

          <Form {...profileForm}>
            <form className="space-y-6">
              <div className="grid gap-4 md:grid-cols-2">
                <FormField
                  control={profileForm.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
                        Nombre
                      </FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Tu nombre"
                          className="h-12 bg-background border border-border focus:border-primary/50 transition-all font-medium rounded-xl placeholder:text-muted-foreground/60"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="space-y-2">
                  <Label className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground block">
                    Email
                  </Label>
                  <Input
                    value={session?.user?.email || ""}
                    disabled
                    className="h-12 bg-muted/50 border border-border font-medium rounded-xl text-muted-foreground"
                  />
                </div>
              </div>
              <ConfirmDialog
                trigger={
                  <Button
                    type="button"
                    className="rounded-xl font-bold"
                    disabled={
                      profileForm.formState.isSubmitting ||
                      !profileForm.formState.isDirty ||
                      !isOnline
                    }
                  >
                    {profileForm.formState.isSubmitting && (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    )}
                    {!isOnline ? "Sin conexión" : "Guardar perfil"}
                  </Button>
                }
                title="Actualizar perfil"
                description="¿Estás seguro de que deseas guardar estos cambios en tu perfil?"
                confirmText="Guardar"
                cancelText="Cancelar"
                onConfirm={() => profileForm.handleSubmit(onProfileSubmit)()}
              />
            </form>
          </Form>
        </CardContent>
      </Card>

      <Card className="rounded-2xl shadow-sm border-border">
        <CardHeader>
          <CardTitle>Seguridad</CardTitle>
          <CardDescription>
            Cambia tu contraseña para mantener tu cuenta segura.
          </CardDescription>
        </CardHeader>
        <Form {...passwordForm}>
          <form>
            <CardContent className="space-y-5 max-w-md pb-6">
              <FormField
                control={passwordForm.control}
                name="currentPassword"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
                      Contraseña actual
                    </FormLabel>
                    <FormControl>
                      <Input
                        type="password"
                        className="h-12 bg-background border border-border focus:border-primary/50 transition-all font-medium rounded-xl placeholder:text-muted-foreground/60"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={passwordForm.control}
                name="newPassword"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
                      Nueva contraseña
                    </FormLabel>
                    <FormControl>
                      <Input
                        type="password"
                        className="h-12 bg-background border border-border focus:border-primary/50 transition-all font-medium rounded-xl placeholder:text-muted-foreground/60"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={passwordForm.control}
                name="confirmPassword"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
                      Confirmar contraseña
                    </FormLabel>
                    <FormControl>
                      <Input
                        type="password"
                        className="h-12 bg-background border border-border focus:border-primary/50 transition-all font-medium rounded-xl placeholder:text-muted-foreground/60"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
            <CardFooter className="border-t px-6 py-4">
              <ConfirmDialog
                trigger={
                  <Button
                    type="button"
                    className="rounded-xl font-bold"
                    disabled={
                      passwordForm.formState.isSubmitting ||
                      !passwordForm.formState.isDirty ||
                      !isOnline
                    }
                  >
                    {passwordForm.formState.isSubmitting && (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    )}
                    {!isOnline ? "Sin conexión" : "Actualizar contraseña"}
                  </Button>
                }
                title="Cambiar contraseña"
                description="¿Estás seguro de que deseas cambiar tu contraseña? Por seguridad, tendrás que iniciar sesión nuevamente."
                confirmText="Cambiar"
                cancelText="Cancelar"
                onConfirm={() => passwordForm.handleSubmit(onPasswordSubmit)()}
              />
            </CardFooter>
          </form>
        </Form>
      </Card>

      <Card className="rounded-2xl shadow-sm border-border">
        <CardHeader>
          <CardTitle>Conexiones</CardTitle>
          <CardDescription>
            Vincula tu cuenta con otros servicios.
          </CardDescription>
        </CardHeader>
        <CardContent className="pb-6">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-primary/10">
              <Gamepad2 className="h-5 w-5 text-primary" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="font-medium">LifeSync Games</p>
              <p className="text-sm text-muted-foreground">
                Convierte tus hábitos financieros en puntos de juego.
              </p>
            </div>
            <Button asChild variant="outline" className="rounded-xl font-bold">
              <Link href="/lifesync">Gestionar</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default AccountSettings;
