import { compare, hash } from "bcryptjs";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(8),
});

// POST /api/users/change-password
export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const json = await req.json();
    const parse = changePasswordSchema.safeParse(json);
    if (!parse.success) {
      return NextResponse.json(
        {
          message: "Validation error",
          errors: parse.error.flatten().fieldErrors,
        },
        { status: 400 },
      );
    }

    const { currentPassword, newPassword } = parse.data;

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
    });
    if (!user || !user.hashedPassword) {
      return NextResponse.json(
        { message: "User not found or no password set" },
        { status: 404 },
      );
    }

    const isValid = await compare(currentPassword, user.hashedPassword);
    if (!isValid) {
      return NextResponse.json(
        { message: "Current password is incorrect" },
        { status: 400 },
      );
    }

    const newHash = await hash(newPassword, 10);
    await prisma.user.update({
      where: { id: session.user.id },
      data: { hashedPassword: newHash },
    });

    return NextResponse.json({ message: "Password updated" }, { status: 200 });
  } catch (error) {
    console.error("🐛 change password error", error);
    return NextResponse.json(
      { message: "Error changing password" },
      { status: 500 },
    );
  }
}
