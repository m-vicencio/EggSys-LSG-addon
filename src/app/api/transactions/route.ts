import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import {
  createTransaction,
  getSpentByCategory,
  getTransactions,
} from "@/services/transaction.service";

const createTransactionSchema = z.object({
  name: z.string().min(1),
  amount: z.number().positive(),
  date: z.string().datetime().optional(),
  month: z.number().int().min(1).max(12),
  year: z.number().int().min(2000),
  type: z.enum(["INCOME", "EXPENSE"]),
  source: z.enum(["FATHER", "MOTHER", "SIBLING", "BOSS", "SELF"]).optional(),
  accountId: z.string().min(1),
  categoryId: z.string().min(1),
  tags: z.array(z.string()).optional(),
  comment: z.string().max(500).optional(),
});

// GET /api/transactions?accountId=yyy
// GET /api/transactions?summaryByCategory=1[&accountId=yyy]
export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }
    const { searchParams } = new URL(req.url);
    const accountId = searchParams.get("accountId") ?? undefined;
    const summary = searchParams.get("summaryByCategory");

    if (summary === "1") {
      const now = new Date();
      const month = Number(searchParams.get("month")) || now.getMonth() + 1;
      const year = Number(searchParams.get("year")) || now.getFullYear();
      const data = await getSpentByCategory(
        session.user.id,
        month,
        year,
        accountId,
      );
      return NextResponse.json({ data }, { status: 200 });
    }

    const transactions = await getTransactions(session.user.id, accountId);
    return NextResponse.json({ data: transactions }, { status: 200 });
  } catch (error) {
    console.error("🐛 get transactions error", error);
    return NextResponse.json(
      { message: "Error fetching transactions" },
      { status: 500 },
    );
  }
}

// POST /api/transactions
export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }
    const json = await req.json();
    const parse = createTransactionSchema.safeParse(json);
    if (!parse.success) {
      return NextResponse.json(
        {
          message: "Validation error",
          errors: parse.error.flatten().fieldErrors,
        },
        { status: 400 },
      );
    }
    const transaction = await createTransaction({
      ...parse.data,
      userId: session.user.id,
    });
    return NextResponse.json(transaction, { status: 201 });
  } catch (error) {
    console.error("🐛 create transaction error", error);
    return NextResponse.json(
      { message: "Error creating transaction" },
      { status: 500 },
    );
  }
}
