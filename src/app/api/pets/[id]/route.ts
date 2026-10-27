import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

type Ctx = { params: Promise<{ id: string }> };

const updatePetSchema = z.object({
  name: z.string().min(1).optional(),
  // IDs de PetItem a equipar (des-equipa el resto automáticamente)
  equippedItems: z.array(z.string()).optional(),
});

// GET /api/pets/[id]
export async function GET(_req: Request, { params }: Ctx) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }
    const { id } = await params;
    const pet = await prisma.pet.findUnique({
      where: { id },
      include: {
        petItems: {
          include: { itemDefinition: true },
        },
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
    if (!pet) {
      return NextResponse.json({ message: "Pet not found" }, { status: 404 });
    }
    if (pet.userId !== session.user.id) {
      return NextResponse.json({ message: "Forbidden" }, { status: 403 });
    }
    // Buscar assetUrl según tipo y etapa
    let assetUrl: string | undefined;
    if (pet?.type?.id && pet?.stage?.id) {
      const asset = await prisma.petTypeStageAsset.findFirst({
        where: {
          petTypeId: pet.type.id,
          stageId: pet.stage.id,
        },
      });
      assetUrl = asset?.assetUrl;
    }
    const petWithAsset = {
      ...pet,
      assetUrl,
    };
    return NextResponse.json(petWithAsset, { status: 200 });
  } catch (error) {
    console.error("🐛 get pet error", error);
    return NextResponse.json(
      { message: "Error fetching pet" },
      { status: 500 },
    );
  }
}

// PATCH /api/pets/[id]
export async function PATCH(req: Request, { params }: Ctx) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }
    const { id } = await params;
    const json: unknown = await req.json();
    const parse = updatePetSchema.safeParse(json);
    if (!parse.success) {
      return NextResponse.json(
        {
          message: "Validation error",
          errors: parse.error.flatten().fieldErrors,
        },
        { status: 400 },
      );
    }
    const pet = await prisma.pet.findUnique({ where: { id } });
    if (!pet) {
      return NextResponse.json({ message: "Pet not found" }, { status: 404 });
    }
    if (pet.userId !== session.user.id) {
      return NextResponse.json({ message: "Forbidden" }, { status: 403 });
    }

    const { name, equippedItems } = parse.data;

    // Actualizar nombre si viene
    if (name) {
      await prisma.pet.update({ where: { id }, data: { name } });
    }

    // Actualizar items equipados
    if (equippedItems !== undefined) {
      // Des-equipar todo
      await prisma.petItem.updateMany({
        where: { petId: id },
        data: { isEquipped: false },
      });
      // Equipar los indicados (solo si pertenecen a esta mascota)
      if (equippedItems.length > 0) {
        await prisma.petItem.updateMany({
          where: { id: { in: equippedItems }, petId: id },
          data: { isEquipped: true },
        });
      }
    }

    const updatedPet = await prisma.pet.findUnique({
      where: { id },
      include: {
        petItems: { include: { itemDefinition: true } },
      },
    });
    return NextResponse.json(updatedPet, { status: 200 });
  } catch (error) {
    console.error("🐛 update pet error", error);
    return NextResponse.json(
      { message: "Error updating pet" },
      { status: 500 },
    );
  }
}
