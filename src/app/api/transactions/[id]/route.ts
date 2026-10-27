import { NextResponse } from "next/server";
import { z } from "zod";
import {
  deleteTransaction,
  getTransactionById,
  updateTransaction,
} from "@/services/transaction.service";

type Ctx = { params: Promise<{ id: string }> };

const updateTransactionSchema = z.object({
  name: z.string().min(1).optional(),
  amount: z.number().positive().optional(),
  date: z.string().datetime().optional(),
  month: z.number().int().min(1).max(12).optional(),
  year: z.number().int().min(2000).optional(),
  type: z.enum(["INCOME", "EXPENSE"]).optional(),
  source: z.enum(["FATHER", "MOTHER", "SIBLING", "BOSS", "SELF"]).optional(),
  categoryId: z.string().min(1).optional(),
  accountId: z.string().min(1).optional(),
});

// GET /api/transactions/[id]
export async function GET(_req: Request, { params }: Ctx) {
  try {
    const { id } = await params;
    const transaction = await getTransactionById(id);
    if (!transaction)
      return NextResponse.json(
        { message: "Transaction not found" },
        { status: 404 },
      );
    return NextResponse.json(transaction, { status: 200 });
  } catch (error) {
    console.error("🐛 get transaction error", error);
    return NextResponse.json(
      { message: "Error fetching transaction" },
      { status: 500 },
    );
  }
}

// PATCH /api/transactions/[id]
export async function PATCH(req: Request, { params }: Ctx) {
  try {
    const { id } = await params;
    const json = await req.json();
    const parse = updateTransactionSchema.safeParse(json);
    if (!parse.success) {
      console.error(
        "[API] PATCH /api/transactions/[id] validation error",
        parse.error.flatten().fieldErrors,
        "input:",
        json,
      );
      return NextResponse.json(
        {
          message: "Validation error",
          errors: parse.error.flatten().fieldErrors,
          input: json,
        },
        { status: 400 },
      );
    }
    const transaction = await updateTransaction(id, parse.data);
    return NextResponse.json(transaction, { status: 200 });
  } catch (error) {
    console.error("🐛 update transaction error", error);
    return NextResponse.json(
      { message: "Error updating transaction" },
      { status: 500 },
    );
  }
}

// DELETE /api/transactions/[id]
export async function DELETE(_req: Request, { params }: Ctx) {
  try {
    const { id } = await params;
    await deleteTransaction(id);
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.error("🐛 delete transaction error", error);
    return NextResponse.json(
      { message: "Error deleting transaction" },
      { status: 500 },
    );
  }
}
