// GET /api/gacha-history?petId=xxx
import { type NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const petId = req.nextUrl.searchParams.get("petId");
    if (!petId) {
      return NextResponse.json(
        { message: "El parámetro petId es requerido" },
        { status: 400 },
      );
    }

    // Verificar que la mascota pertenece al usuario
    const pet = await prisma.pet.findUnique({ where: { id: petId } });
    if (!pet) {
      return NextResponse.json({ message: "Pet not found" }, { status: 404 });
    }
    if (pet.userId !== session.user.id) {
      return NextResponse.json({ message: "Forbidden" }, { status: 403 });
    }

    const history = await prisma.gachaHistory.findMany({
      where: { petId },
      include: { itemDefinition: true },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ data: history }, { status: 200 });
  } catch (error) {
    console.error("🐛 get gacha history error", error);
    return NextResponse.json(
      { message: "Error fetching gacha history" },
      { status: 500 },
    );
  }
}
