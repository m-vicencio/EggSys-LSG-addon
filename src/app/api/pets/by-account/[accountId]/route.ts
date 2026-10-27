import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { xpForLevel } from "@/services/pet.service";

type Ctx = { params: Promise<{ accountId: string }> };

// GET /api/pets/by-account/[accountId]
export async function GET(_req: Request, ctx: Ctx) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      console.error("[API] No session user id");
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }
    // Desestructura params usando await
    const { accountId } = await ctx.params;
    console.log("[API] accountId param:", accountId);
    const pet = await prisma.pet.findFirst({
      where: { accountId },
      include: {
        petItems: { include: { itemDefinition: true } },
        gachaHistory: {
          include: { itemDefinition: true },
          orderBy: { createdAt: "desc" },
        },
        account: {
          select: { id: true, name: true, savingGoal: true, balance: true },
        },
        type: true,
        stage: true,
      },
    });
    console.log("[API] pet found:", pet);
    if (!pet) {
      console.warn("[API] No pet found for accountId", accountId);
      return NextResponse.json({ message: "Pet not found" }, { status: 404 });
    }
    if (pet.userId !== session.user.id) {
      console.warn("[API] Pet does not belong to user", {
        petUserId: pet.userId,
        sessionUserId: session.user.id,
      });
      return NextResponse.json({ message: "Forbidden" }, { status: 403 });
    }
    // Traer todos los assets del tipo de mascota (una entrada por etapa)
    let stageAssets: { stageName: string; assetUrl: string }[] = [];
    if (pet?.type) {
      const assets: { stage: { name: string }; assetUrl: string }[] =
        await prisma.petTypeStageAsset.findMany({
          where: { petTypeId: pet.type.id },
          include: { stage: { select: { name: true } } },
        });
      stageAssets = assets.map((a) => ({
        stageName: a.stage.name.toLowerCase(),
        assetUrl: a.assetUrl,
      }));
    }
    const petWithTypeAndAsset = {
      ...pet,
      petType: pet.type?.name ? pet.type.name.toLowerCase() : undefined,
      petStage: pet.stage?.name ? pet.stage.name.toLowerCase() : undefined,
      stageAssets,
      level: pet.level,
      currentXp: pet.currentXp,
      xpToNextLevel: xpForLevel(pet.level),
    };
    return NextResponse.json(petWithTypeAndAsset, { status: 200 });
  } catch (error) {
    console.error("🐛 get pet by account error", error);
    return NextResponse.json(
      { message: "Error fetching pet", error: String(error) },
      { status: 500 },
    );
  }
}
