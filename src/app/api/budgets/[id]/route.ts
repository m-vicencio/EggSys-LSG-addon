import { NextResponse } from "next/server";
import { z } from "zod";
import {
  deleteBudget,
  getBudgetById,
  updateBudget,
} from "@/services/budget.service";

type Ctx = { params: Promise<{ id: string }> };

const updateBudgetSchema = z.object({
  name: z.string().min(1).optional(),
  idealAmount: z.number().positive().optional(),
  categoryId: z.string().min(1).optional(),
});

// GET /api/budgets/[id]
export async function GET(_req: Request, { params }: Ctx) {
  try {
    const { id } = await params;
    const budget = await getBudgetById(id);
    if (!budget)
      return NextResponse.json(
        { message: "Budget not found" },
        { status: 404 },
      );
    return NextResponse.json(budget, { status: 200 });
  } catch (error) {
    console.error("🐛 get budget error", error);
    return NextResponse.json(
      { message: "Error fetching budget" },
      { status: 500 },
    );
  }
}

// PATCH /api/budgets/[id]
export async function PATCH(req: Request, { params }: Ctx) {
  try {
    const { id } = await params;
    const json = await req.json();
    const parse = updateBudgetSchema.safeParse(json);
    if (!parse.success) {
      return NextResponse.json(
        {
          message: "Validation error",
          errors: parse.error.flatten().fieldErrors,
        },
        { status: 400 },
      );
    }
    const budget = await updateBudget(id, parse.data);
    return NextResponse.json(budget, { status: 200 });
  } catch (error) {
    console.error("🐛 update budget error", error);
    return NextResponse.json(
      { message: "Error updating budget" },
      { status: 500 },
    );
  }
}

// DELETE /api/budgets/[id]
export async function DELETE(_req: Request, { params }: Ctx) {
  try {
    const { id } = await params;
    await deleteBudget(id);
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.error("🐛 delete budget error", error);
    return NextResponse.json(
      { message: "Error deleting budget" },
      { status: 500 },
    );
  }
}
