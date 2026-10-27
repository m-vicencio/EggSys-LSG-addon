import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { CURRENCY_CODES } from "@/lib/currencies";
import {
  createAccount,
  createSavingsAccountWithPet,
  getAccountsByUser,
} from "@/services/account.service";

const createAccountSchema = z
  .object({
    name: z.string().min(1),
    balance: z.number().optional(),
    currency: z.enum([...CURRENCY_CODES]).default("CLP"),
    isSavings: z.boolean().optional(),
    savingGoal: z.number().positive().optional(),
    petName: z.string().min(1).optional(),
  })
  .refine((d) => !d.isSavings || d.savingGoal !== undefined, {
    message: "savingGoal es requerido para cuentas de ahorro",
    path: ["savingGoal"],
  });

// GET /api/accounts
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }
    const accounts = await getAccountsByUser(session.user.id);
    return NextResponse.json({ data: accounts }, { status: 200 });
  } catch (error) {
    console.error("🐛 get accounts error", error);
    return NextResponse.json(
      { message: "Error fetching accounts" },
      { status: 500 },
    );
  }
}

// POST /api/accounts
export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }
    const json = await req.json();
    const parse = createAccountSchema.safeParse(json);
    if (!parse.success) {
      return NextResponse.json(
        {
          message: "Validation error",
          errors: parse.error.flatten().fieldErrors,
        },
        { status: 400 },
      );
    }

    const { isSavings, savingGoal, petName, ...rest } = parse.data;

    // Cuenta de ahorro: crear cuenta + mascota en una transacción
    if (isSavings) {
      // savingGoal está garantizado por el .refine() del schema
      if (savingGoal === undefined) {
        return NextResponse.json(
          { message: "savingGoal es requerido para cuentas de ahorro" },
          { status: 400 },
        );
      }
      const result = await createSavingsAccountWithPet({
        ...rest,
        userId: session.user.id,
        savingGoal,
        petName,
      });
      return NextResponse.json(result, { status: 201 });
    }

    // Cuenta normal
    const account = await createAccount({
      ...rest,
      userId: session.user.id,
    });
    return NextResponse.json({ account }, { status: 201 });
  } catch (error) {
    console.error("🐛 create account error", error);
    return NextResponse.json(
      { message: "Error creating account" },
      { status: 500 },
    );
  }
}
