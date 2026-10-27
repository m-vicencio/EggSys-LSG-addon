import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import {
  deleteCategory,
  getCategoryById,
  updateCategory,
} from "@/services/category.service";

type Ctx = { params: Promise<{ id: string }> };

const updateCategorySchema = z.object({
  name: z.string().min(1).optional(),
  type: z.enum(["INCOME", "EXPENSE"]).optional(),
  iconName: z.string().min(1).optional(),
  color: z.string().min(4).optional(),
  isActive: z.boolean().optional(),
});

export async function PATCH(req: Request, { params }: Ctx) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const json = await req.json();
    const parse = updateCategorySchema.safeParse(json);
    if (!parse.success) {
      return NextResponse.json(
        {
          message: "Validation error",
          errors: parse.error.flatten().fieldErrors,
        },
        { status: 400 },
      );
    }

    const category = await updateCategory(id, session.user.id, parse.data);
    return NextResponse.json(category, { status: 200 });
  } catch (error) {
    console.error("🐛 update category error", error);
    return NextResponse.json(
      { message: "Error updating category" },
      { status: 500 },
    );
  }
}

export async function DELETE(_req: Request, { params }: Ctx) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const category = await getCategoryById(id, session.user.id);
    if (!category) {
      return NextResponse.json(
        { message: "Category not found" },
        { status: 404 },
      );
    }

    await deleteCategory(id, session.user.id);
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    if (error instanceof Error && error.message === "DEFAULT_CATEGORY") {
      return NextResponse.json(
        { message: "No puedes eliminar una categoría por defecto" },
        { status: 400 },
      );
    }

    console.error("🐛 delete category error", error);
    return NextResponse.json(
      { message: "Error deleting category" },
      { status: 500 },
    );
  }
}
