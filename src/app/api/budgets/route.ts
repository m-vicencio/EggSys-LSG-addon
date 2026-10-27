import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { createBudget, getBudgetsByUser } from "@/services/budget.service";

const createBudgetSchema = z.object({
  name: z.string().min(1),
  idealAmount: z.number().positive(),
  categoryId: z.string().min(1),
  accountId: z.string().min(1),
});

// GET /api/budgets[?accountId=xxx]
export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }
    const { searchParams } = new URL(req.url);
    const accountId = searchParams.get("accountId") ?? undefined;
    const budgets = await getBudgetsByUser(session.user.id, accountId);
    return NextResponse.json(budgets, { status: 200 });
  } catch (error) {
    console.error("🐛 get budgets error", error);
    return NextResponse.json(
      { message: "Error fetching budgets" },
      { status: 500 },
    );
  }
}

// POST /api/budgets
export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }
    const json = await req.json();
    const parse = createBudgetSchema.safeParse(json);
    if (!parse.success) {
      return NextResponse.json(
        {
          message: "Validation error",
          errors: parse.error.flatten().fieldErrors,
        },
        { status: 400 },
      );
    }
    const budget = await createBudget({
      ...parse.data,
      userId: session.user.id,
    });
    return NextResponse.json(budget, { status: 201 });
  } catch (error) {
    console.error("🐛 create budget error", error);
    return NextResponse.json(
      { message: "Error creating budget" },
      { status: 500 },
    );
  }
}
