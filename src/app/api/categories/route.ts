import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import {
  createCategory,
  getCategoriesByUser,
} from "@/services/category.service";

const createCategorySchema = z.object({
  name: z.string().min(1),
  type: z.enum(["INCOME", "EXPENSE"]),
  iconName: z.string().min(1),
  color: z.string().min(4),
  isActive: z.boolean().optional(),
});

// GET /api/categories: devuelve las categorías del usuario autenticado
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const categories = await getCategoriesByUser(session.user.id);
    return NextResponse.json({ data: categories }, { status: 200 });
  } catch (error) {
    console.error("🐛 get categories error", error);
    return NextResponse.json(
      { message: "Error fetching categories" },
      { status: 500 },
    );
  }
}

// POST /api/categories
export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const json = await req.json();
    const parse = createCategorySchema.safeParse(json);
    if (!parse.success) {
      return NextResponse.json(
        {
          message: "Validation error",
          errors: parse.error.flatten().fieldErrors,
        },
        { status: 400 },
      );
    }

    const category = await createCategory({
      ...parse.data,
      userId: session.user.id,
      isDefault: false,
    });

    return NextResponse.json(category, { status: 201 });
  } catch (error) {
    console.error("🐛 create category error", error);
    return NextResponse.json(
      { message: "Error creating category" },
      { status: 500 },
    );
  }
}
