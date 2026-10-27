// CRUD para Pet
import { type NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const pets = await prisma.pet.findMany({
    include: {
      type: true,
      stage: true,
    },
  });
  // Agregar assetUrl a cada mascota
  const petsWithAssets = await Promise.all(
    pets.map(async (pet: (typeof pets)[number]) => {
      let assetUrl: string | undefined;
      if (pet.type && pet.stage) {
        const asset = await prisma.petTypeStageAsset.findFirst({
          where: {
            petTypeId: pet.type.id,
            stageId: pet.stage.id,
          },
        });
        assetUrl = asset?.assetUrl;
      }
      return { ...pet, assetUrl };
    }),
  );
  return NextResponse.json(petsWithAssets);
}

export async function POST(req: NextRequest) {
  const data = await req.json();
  const pet = await prisma.pet.create({ data });
  return NextResponse.json(pet);
}
