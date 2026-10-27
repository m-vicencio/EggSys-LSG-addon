import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { syncPetProgressByAccount } from "./pet.service";

// ─── Tipos ────────────────────────────────────────────────────────────────────

export type CreateAccountInput = {
  name: string;
  balance?: number;
  currency?: string;
  userId: string;
  isSavings?: boolean;
  savingGoal?: number;
};

export type CreateSavingsAccountInput = {
  name: string;
  balance?: number;
  currency?: string;
  userId: string;
  savingGoal: number;
  petName?: string; // nombre de la mascota, default "Mascota"
};

export type UpdateAccountInput = {
  name?: string;
  balance?: number;
  isSavings?: boolean;
  savingGoal?: number;
};

// ─── Operaciones ──────────────────────────────────────────────────────────────

export function getAccountsByUser(userId: string) {
  return prisma.appAccount.findMany({
    where: { userId },
    orderBy: { createdAt: "asc" },
    include: { pet: true },
  });
}

export function getAccountById(id: string) {
  return prisma.appAccount.findUnique({
    where: { id },
    include: { pet: true },
  });
}

export function createAccount(data: CreateAccountInput) {
  return prisma.appAccount.create({ data });
}

/**
 * Crea una cuenta de ahorro y su mascota asociada en una sola transacción.
 * Garantiza consistencia: si algo falla, ninguno se guarda.
 */
export async function createSavingsAccountWithPet(
  data: CreateSavingsAccountInput,
) {
  // Pet types según enum del schema
  const petTypes = ["BUNNY", "CAT", "ERIZO", "PANDA"];
  const randomType = petTypes[Math.floor(Math.random() * petTypes.length)];
  const result = await prisma.$transaction(
    async (tx: Prisma.TransactionClient) => {
      const account = await tx.appAccount.create({
        data: {
          name: data.name,
          balance: data.balance ?? 0,
          currency: data.currency ?? "CLP",
          userId: data.userId,
          isSavings: true,
          savingGoal: data.savingGoal,
        },
      });

      // Buscar id de tipo y etapa
      const petTypeDef = await tx.petTypeDefinition.findUnique({
        where: { name: randomType },
      });
      const petStageDef = await tx.petStageDefinition.findUnique({
        where: { name: "EGG" },
      });
      if (!petTypeDef || !petStageDef) {
        throw new Error(
          "PetTypeDefinition o PetStageDefinition no encontrado. Asegúrate de correr el seed.",
        );
      }
      const pet = await tx.pet.create({
        data: {
          userId: data.userId,
          accountId: account.id,
          name: data.petName ?? "Mascota",
          stageId: petStageDef.id,
          typeId: petTypeDef.id,
          level: 1,
          currentXp: 0,
          gachaTickets: 0,
        },
      });

      return { account, pet };
    },
  );

  await syncPetProgressByAccount(result.account.id).catch(() => {
    // No bloquear la creación de cuenta por fallos del sistema de mascota.
  });

  return result;
}

export async function updateAccount(id: string, data: UpdateAccountInput) {
  const updated = await prisma.appAccount.update({ where: { id }, data });

  await syncPetProgressByAccount(id).catch(() => {});

  return updated;
}

/**
 * Establece una cuenta como predeterminada para el usuario.
 * Primero desactiva todas las cuentas del usuario y luego activa la seleccionada.
 */
export async function setDefaultAccount(userId: string, accountId: string) {
  return prisma.$transaction([
    prisma.appAccount.updateMany({
      where: { userId },
      data: { isDefault: false },
    }),
    prisma.appAccount.update({
      where: { id: accountId },
      data: { isDefault: true },
    }),
  ]);
}

export async function unsetDefaultAccount(userId: string) {
  return prisma.appAccount.updateMany({
    where: { userId },
    data: { isDefault: false },
  });
}

export function deleteAccount(id: string) {
  return prisma.appAccount.delete({ where: { id } });
}

/**
 * Ajusta el saldo de una cuenta sumando `delta` (puede ser negativo).
 * Se usa internamente al crear/eliminar transacciones.
 */
export async function adjustBalance(id: string, delta: number | string) {
  const updated = await prisma.appAccount.update({
    where: { id },
    data: { balance: { increment: delta } },
  });

  await syncPetProgressByAccount(id).catch(() => {});

  return updated;
}
