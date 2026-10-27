// prisma/seed.js
require("dotenv").config();
const { PrismaPg } = require("@prisma/adapter-pg");
const { PrismaClient, ItemType, ItemRarity } = require("@prisma/client");
const { Pool } = require("pg");

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });
const items = [
  {
    type: ItemType.HAT,
    name: "Gorra Azul",
    rarity: ItemRarity.COMMON,
    assetUrl: "https://i.imgur.com/ystc2r9.png",
  },
  {
    type: ItemType.HAT,
    name: "Sombrero Mágico",
    rarity: ItemRarity.RARE,
    assetUrl: "https://i.imgur.com/EPOTg0u.png",
  },
  {
    type: ItemType.HAT,
    name: "Corona Real",
    rarity: ItemRarity.EPIC,
    assetUrl: "https://i.imgur.com/hPW5n5Z.png",
  },
  {
    type: ItemType.BACKGROUND,
    name: "Césped",
    rarity: ItemRarity.COMMON,
    assetUrl: "https://i.imgur.com/DObpmq3.png",
  },
  {
    type: ItemType.BACKGROUND,
    name: "Atardecer",
    rarity: ItemRarity.RARE,
    assetUrl: "https://i.imgur.com/qeY5ANL.png",
  },
  {
    type: ItemType.BACKGROUND,
    name: "Galaxia",
    rarity: ItemRarity.EPIC,
    assetUrl: "https://i.imgur.com/f6AnU4P.png",
  },
];

const petTypes = [
  { name: "BUNNY" },
  { name: "CAT" },
  { name: "ERIZO" },
  { name: "PANDA" },
];

const petStages = [
  { name: "EGG" },
  { name: "CRUZADA1" },
  { name: "CRUZADA2" },
  { name: "CRUZADA3" },
  { name: "HATCHED" },
  { name: "PET" },
];

const petTypeStageAssets = {
  BUNNY: {
    EGG: "https://i.imgur.com/BImH1LG.png",
    CRUZADA1: "https://i.imgur.com/b51VzxH.png",
    CRUZADA2: "https://i.imgur.com/aQYAdcq.png",
    CRUZADA3: "https://i.imgur.com/UjH0GpV.png",
    HATCHED: "https://i.imgur.com/TeARchl.png",
    PET: "https://i.imgur.com/7Xxqgu2.png",
  },
  CAT: {
    EGG: "https://i.imgur.com/BImH1LG.png",
    CRUZADA1: "https://i.imgur.com/b51VzxH.png",
    CRUZADA2: "https://i.imgur.com/aQYAdcq.png",
    CRUZADA3: "https://i.imgur.com/UjH0GpV.png",
    HATCHED: "https://i.imgur.com/8LGT0tt.png",
    PET: "https://i.imgur.com/jma7kDS.pngg",
  },
  ERIZO: {
    EGG: "https://i.imgur.com/BImH1LG.png",
    CRUZADA1: "https://i.imgur.com/b51VzxH.png",
    CRUZADA2: "https://i.imgur.com/aQYAdcq.png",
    CRUZADA3: "https://i.imgur.com/UjH0GpV.png",
    HATCHED: "https://i.imgur.com/JZCmXwr.png",
    PET: "https://i.imgur.com/udGsesP.png",
  },
  PANDA: {
    EGG: "https://i.imgur.com/BImH1LG.png",
    CRUZADA1: "https://i.imgur.com/b51VzxH.png",
    CRUZADA2: "https://i.imgur.com/aQYAdcq.png",
    CRUZADA3: "https://i.imgur.com/UjH0GpV.png",
    HATCHED: "https://i.imgur.com/k9Ppmkw.png",
    PET: "https://i.imgur.com/NQfqMZw.png",
  },
};

async function main() {
  console.log("🌱 Seeding item definitions...");
  for (const item of items) {
    await prisma.itemDefinition.upsert({
      where: { name: item.name },
      update: { type: item.type, rarity: item.rarity, assetUrl: item.assetUrl },
      create: item,
    });
  }
  console.log(`✅ ${items.length} items seeded.`);

  console.log("🌱 Seeding pet types...");
  for (const petType of petTypes) {
    await prisma.PetTypeDefinition.upsert({
      where: { name: petType.name },
      update: {},
      create: petType,
    });
  }
  console.log(`✅ ${petTypes.length} pet types seeded.`);

  console.log("🌱 Seeding pet stages...");
  for (const petStage of petStages) {
    await prisma.PetStageDefinition.upsert({
      where: { name: petStage.name },
      update: {},
      create: { name: petStage.name },
    });
  }
  console.log(`✅ ${petStages.length} pet stages seeded.`);

  console.log("🌱 Seeding pet type stage assets...");
  for (const petType of petTypes) {
    const type = await prisma.PetTypeDefinition.findUnique({
      where: { name: petType.name },
    });
    for (const petStage of petStages) {
      const stage = await prisma.PetStageDefinition.findUnique({
        where: { name: petStage.name },
      });
      const typeAssets =
        petTypeStageAssets[petType.name as keyof typeof petTypeStageAssets];
      const assetUrl = typeAssets[petStage.name as keyof typeof typeAssets];
      if (assetUrl) {
        await prisma.PetTypeStageAsset.upsert({
          where: {
            petTypeId_stageId: { petTypeId: type.id, stageId: stage.id },
          },
          update: { assetUrl },
          create: { petTypeId: type.id, stageId: stage.id, assetUrl },
        });
      }
    }
  }
  console.log("✅ Pet type stage assets seeded.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
