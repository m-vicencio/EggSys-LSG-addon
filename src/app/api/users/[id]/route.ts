import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

type Ctx = { params: Promise<{ id: string }> };

const updateUserSchema = z.object({
  name: z.string().min(1).optional(),
  email: z.string().email().optional(),
});

// GET /api/users/[id]
export async function GET(_req: Request, { params }: Ctx) {
  try {
    const { id } = await params;
    const user = await prisma.user.findUnique({
      where: { id },
      select: { id: true, email: true, name: true, createdAt: true },
    });
    if (!user)
      return NextResponse.json({ message: "User not found" }, { status: 404 });
    return NextResponse.json(user, { status: 200 });
  } catch (error) {
    console.error("🐛 get user error", error);
    return NextResponse.json(
      { message: "Error fetching user" },
      { status: 500 },
    );
  }
}

// PATCH /api/users/[id]
export async function PATCH(req: Request, { params }: Ctx) {
  try {
    const { id } = await params;
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }
    if (session.user.id !== id) {
      return NextResponse.json({ message: "Forbidden" }, { status: 403 });
    }
    const json = await req.json();
    const parse = updateUserSchema.safeParse(json);
    if (!parse.success) {
      return NextResponse.json(
        {
          message: "Validation error",
          errors: parse.error.flatten().fieldErrors,
        },
        { status: 400 },
      );
    }
    const user = await prisma.user.update({
      where: { id },
      data: parse.data,
      select: { id: true, email: true, name: true, updatedAt: true },
    });
    return NextResponse.json(user, { status: 200 });
  } catch (error) {
    console.error("🐛 update user error", error);
    return NextResponse.json(
      { message: "Error updating user" },
      { status: 500 },
    );
  }
}

// DELETE /api/users/[id]
export async function DELETE(_req: Request, { params }: Ctx) {
  try {
    const { id } = await params;
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }
    if (session.user.id !== id) {
      return NextResponse.json({ message: "Forbidden" }, { status: 403 });
    }

    await prisma.user.delete({ where: { id } });
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.error("🐛 delete user error", error);
    return NextResponse.json(
      { message: "Error deleting user" },
      { status: 500 },
    );
  }
}
