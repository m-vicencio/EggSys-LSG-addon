import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import {
  deleteAccount,
  getAccountById,
  setDefaultAccount,
  updateAccount,
} from "@/services/account.service";

type Ctx = { params: Promise<{ id: string }> };

const updateAccountSchema = z
  .object({
    name: z.string().min(1).optional(),
    balance: z.number().optional(),
    // savingGoal: permite actualizar la meta de la cuenta de ahorro
    savingGoal: z.number().positive().optional(),
  })
  .strict(); // no permite campos extra no declarados

// GET /api/accounts/[id]
export async function GET(_req: Request, { params }: Ctx) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }
    const { id } = await params;
    const account = await getAccountById(id);
    if (!account) {
      return NextResponse.json(
        { message: "Account not found" },
        { status: 404 },
      );
    }
    if (account.userId !== session.user.id) {
      return NextResponse.json({ message: "Forbidden" }, { status: 403 });
    }
    return NextResponse.json(account, { status: 200 });
  } catch (error) {
    console.error("🐛 get account error", error);
    return NextResponse.json(
      { message: "Error fetching account" },
      { status: 500 },
    );
  }
}

// PATCH /api/accounts/[id]
// Permite actualizar nombre y/o meta de ahorro (savingGoal), o marcar como predeterminada
export async function PATCH(req: Request, { params }: Ctx) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }
    const { id } = await params;
    const account = await getAccountById(id);
    if (!account) {
      return NextResponse.json(
        { message: "Account not found" },
        { status: 404 },
      );
    }
    if (account.userId !== session.user.id) {
      return NextResponse.json({ message: "Forbidden" }, { status: 403 });
    }

    const json = await req.json();

    // Caso especial: marcar como cuenta predeterminada
    if (json.isDefault === true) {
      await setDefaultAccount(session.user.id, id);
      return NextResponse.json(
        { message: "Cuenta predeterminada actualizada" },
        { status: 200 },
      );
    }

    // Solo cuentas de ahorro pueden cambiar la meta
    if (json.savingGoal !== undefined && !account.isSavings) {
      return NextResponse.json(
        { message: "Solo las cuentas de ahorro tienen meta de ahorro" },
        { status: 400 },
      );
    }
    const parse = updateAccountSchema.safeParse(json);
    if (!parse.success) {
      return NextResponse.json(
        {
          message: "Validation error",
          errors: parse.error.flatten().fieldErrors,
        },
        { status: 400 },
      );
    }
    const updated = await updateAccount(id, parse.data);
    return NextResponse.json(updated, { status: 200 });
  } catch (error) {
    console.error("🐛 update account error", error);
    return NextResponse.json(
      { message: "Error updating account" },
      { status: 500 },
    );
  }
}

// DELETE /api/accounts/[id]
export async function DELETE(_req: Request, { params }: Ctx) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }
    const { id } = await params;
    const account = await getAccountById(id);
    if (!account) {
      return NextResponse.json(
        { message: "Account not found" },
        { status: 404 },
      );
    }
    if (account.userId !== session.user.id) {
      return NextResponse.json({ message: "Forbidden" }, { status: 403 });
    }
    await deleteAccount(id);
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.error("🐛 delete account error", error);
    return NextResponse.json(
      { message: "Error deleting account" },
      { status: 500 },
    );
  }
}
