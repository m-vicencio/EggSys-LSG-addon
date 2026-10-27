"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Check, Pencil, X, Zap } from "lucide-react";
import { useEffect, useState } from "react";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { petsApi } from "@/lib/api";
import { accountsApi } from "@/lib/api/accounts";
import { usePet } from "@/views/core/dashboard/hooks/usePet";
import { usePetMessages } from "@/views/core/dashboard/hooks/usePetMessages";
import { usePetSound } from "@/views/core/dashboard/hooks/usePetSound";
import type { AppAccount } from "@/views/core/dashboard/interfaces/dashboard";
import { STAGE_ORDER, STAGE_TRANSLATIONS } from "../../utils/stageEgg";
import { PetImage } from "./PetImage";
import { PetSpeechBubble } from "./PetSpeechBubble";

interface PetEggProps {
  account: AppAccount;
  saldo: string;
}

export function PetEgg({ account, saldo }: PetEggProps) {
  const [meta, setMeta] = useState<number>(account.savingGoal ?? 1000000);
  const [editing, setEditing] = useState(false);
  const [showSpeechBubble, setShowSpeechBubble] = useState(false);
  const queryClient = useQueryClient();

  const metaMutation = useMutation({
    mutationFn: async (newMeta: number): Promise<AppAccount> => {
      const updated = await accountsApi.update(account.id, {
        savingGoal: newMeta,
      });
      return updated as AppAccount;
    },
    onSuccess: (updated: AppAccount) => {
      setMeta(updated.savingGoal ?? meta);
      queryClient.invalidateQueries({ queryKey: ["accounts"] });
      queryClient.invalidateQueries({ queryKey: ["pet", account.id] });
    },
    onError: (error: Error) => {
      alert(error?.message || "Error al guardar la meta");
    },
  });

  const [editingName, setEditingName] = useState(false);
  const [nameInput, setNameInput] = useState("");
  const { pet } = usePet(account);
  const currentStageName = pet?.petStage ?? STAGE_ORDER[0];
  const { getPetMessage } = usePetMessages(pet, currentStageName, saldo);
  const { playPetSound } = usePetSound(pet, currentStageName);

  const numericSaldo = Number(saldo.replace(/[^0-9,-]+/g, "")) || 0;
  const progressPercentage =
    meta > 0
      ? Math.min(100, Math.max(0, Math.round((numericSaldo / meta) * 100)))
      : 0;

  useEffect(() => {
    if (pet?.name) setNameInput(pet.name);
  }, [pet?.name]);

  useEffect(() => {
    setMeta(account.savingGoal ?? 1000000);
  }, [account.savingGoal]);

  useEffect(() => {
    const showInterval = setInterval(() => {
      setShowSpeechBubble(true);
      setTimeout(() => setShowSpeechBubble(false), 4000);
    }, 15000);
    return () => clearInterval(showInterval);
  }, []);

  const handlePetClick = () => {
    if (playPetSound) playPetSound();
    if (!showSpeechBubble) {
      setShowSpeechBubble(true);
      setTimeout(() => setShowSpeechBubble(false), 3000);
    }
  };

  const renameMutation = useMutation({
    mutationFn: ({ petId, name }: { petId: string; name: string }) =>
      petsApi.rename(petId, name),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pet", account.id] });
    },
  });

  function commitRename() {
    const trimmed = nameInput.trim();
    if (trimmed && pet && trimmed !== pet.name) {
      renameMutation.mutate({ petId: pet.id, name: trimmed });
    }
    setEditingName(false);
  }

  const assetUrl = pet?.stageAssets?.find(
    (a) => a.stageName === currentStageName,
  )?.assetUrl;

  return (
    <Card className="overflow-visible rounded-2xl border-none shadow-xl bg-linear-to-b from-card to-secondary/10 relative transition-all">
      {/* ── Header: mismo patrón que DashboardPieChart ── */}
      <CardHeader className="pt-6 pb-2">
        <Label className="text-sm font-bold tracking-widest uppercase text-muted-foreground">
          Tu progreso y compañero
        </Label>
      </CardHeader>

      {/* ── Body ── */}
      <CardContent className="flex flex-col items-center pt-2 pb-6">
        {/* Mascota */}
        <div className="relative group mb-8">
          <div className="absolute -inset-4 bg-linear-to-r from-primary/20 to-purple-500/20 rounded-full blur-2xl opacity-0 group-hover:opacity-100 transition duration-1000" />
          <button
            type="button"
            className="relative block cursor-pointer transition-transform hover:scale-105 active:scale-95 appearance-none border-none bg-transparent"
            onClick={handlePetClick}
          >
            {pet && <PetImage assetUrl={assetUrl} />}
            <PetSpeechBubble
              message={getPetMessage()}
              isVisible={showSpeechBubble}
            />
          </button>
        </div>

        {/* Saldo vs Meta */}
        <div className="w-full flex flex-col items-center space-y-4">
          <div className="flex items-baseline gap-2">
            <span className="text-lg font-black tracking-tight text-primary">
              {saldo}
            </span>
            <span className="text-sm font-bold text-muted-foreground/60 uppercase tracking-tighter">
              de
            </span>
            {editing ? (
              <Input
                type="number"
                value={meta}
                onChange={(e) => setMeta(Number(e.target.value))}
                className="h-9 w-32 text-center font-bold rounded-xl"
                autoFocus
                onBlur={() => {
                  setEditing(false);
                  metaMutation.mutate(meta);
                }}
              />
            ) : (
              <button
                type="button"
                onClick={() => setEditing(true)}
                className="text-lg font-black tracking-tight text-muted-foreground hover:text-primary transition-colors"
              >
                ${new Intl.NumberFormat("es-CL").format(meta)}
              </button>
            )}
          </div>

          {/* Barra de progreso */}
          <div className="w-full px-2">
            <div className="relative w-full h-5 mb-2">
              <Progress
                value={progressPercentage}
                className="h-full bg-muted/40 rounded-full"
              />
              <span className="absolute top-1/2 -translate-y-1/2 text-[10px] font-black drop-shadow-sm px-2 text-white right-0">
                {progressPercentage}%
              </span>
            </div>
            <div className="flex justify-between text-[10px] font-bold text-muted-foreground/70 uppercase tracking-widest">
              <span>$0</span>
              <span>Meta mensual</span>
            </div>
          </div>
        </div>
      </CardContent>

      {/* ── Footer: mismo patrón que DashboardPieChart ── */}
      <CardFooter className="flex flex-col gap-4 bg-secondary/5 pt-4 pb-5 rounded-b-2xl border-t border-border/40">
        {pet && (
          <div className="w-full space-y-3">
            {/* Nombre + Nivel */}
            <div className="flex items-center justify-between">
              {editingName ? (
                <div className="flex items-center gap-1.5">
                  <Input
                    value={nameInput}
                    onChange={(e) => setNameInput(e.target.value)}
                    className="h-8 text-sm font-bold w-40 rounded-lg"
                    autoFocus
                  />
                  <ConfirmDialog
                    trigger={
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8 text-emerald-600"
                        disabled={
                          renameMutation.isPending ||
                          !nameInput.trim() ||
                          nameInput.trim() === pet.name
                        }
                      >
                        <Check className="h-4 w-4" />
                      </Button>
                    }
                    title="Cambiar nombre de mascota"
                    description={`¿Deseas cambiar el nombre a "${nameInput.trim()}"?`}
                    confirmText="Guardar"
                    cancelText="Cancelar"
                    onConfirm={commitRename}
                  />
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    className="h-8 w-8"
                    onClick={() => setEditingName(false)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setEditingName(true)}
                  className="font-black text-base text-foreground flex items-center gap-2 hover:text-primary transition-colors"
                >
                  {pet.name}
                  <Pencil size={12} className="text-muted-foreground/50" />
                </button>
              )}

              {/* Badge de nivel: separador visual igual al de la pie chart */}
              <div className="flex items-center gap-1.5 bg-primary/10 text-primary px-3 py-1 rounded-full border border-primary/10 shadow-sm">
                <span className="text-[10px] font-black uppercase tracking-tighter">
                  Nv.
                </span>
                <span className="text-sm font-black">{pet.level}</span>
              </div>
            </div>

            {/* XP */}
            <div className="space-y-1.5">
              <Progress
                value={Math.round((pet.currentXp / pet.xpToNextLevel) * 100)}
                className="h-1.5 bg-muted/30"
              />
              <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-widest">
                <span className="flex items-center gap-1 text-yellow-600 dark:text-yellow-500">
                  <Zap size={10} className="fill-current" />
                  {pet.currentXp} / {pet.xpToNextLevel} XP
                </span>
                <span className="text-muted-foreground">
                  {STAGE_TRANSLATIONS[currentStageName] || currentStageName}
                </span>
              </div>
            </div>
          </div>
        )}
      </CardFooter>
    </Card>
  );
}
