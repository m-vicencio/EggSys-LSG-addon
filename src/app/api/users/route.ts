import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// GET /api/users: lista todos los usuarios (sin exponer la contraseña)
export async function GET() {
  try {
    const users = await prisma.user.findMany({
      select: { id: true, email: true, name: true, createdAt: true },
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json(users, { status: 200 });
  } catch (error) {
    console.error("🐛 get users error", error);
    return NextResponse.json(
      { message: "Error fetching users" },
      { status: 500 },
    );
  }
}
