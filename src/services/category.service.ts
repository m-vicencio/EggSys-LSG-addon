import { DEFAULT_CATEGORY_TEMPLATES } from "@/lib/categories";
import { prisma } from "@/lib/prisma";

type CategoryType = "INCOME" | "EXPENSE";

export type CreateCategoryInput = {
  userId: string;
  name: string;
  type: CategoryType;
  iconName: string;
  color: string;
  isActive?: boolean;
  isDefault?: boolean;
};

export type UpdateCategoryInput = Partial<
  Omit<CreateCategoryInput, "userId" | "isDefault">
>;

export async function ensureDefaultCategoriesForUser(userId: string) {
  const existingDefaults = await prisma.category.findMany({
    where: { userId, isDefault: true },
    select: { name: true, type: true },
  });

  const existingKey = new Set(
    existingDefaults.map((category) => `${category.name}::${category.type}`),
  );

  const missingDefaults = DEFAULT_CATEGORY_TEMPLATES.filter(
    (category) => !existingKey.has(`${category.name}::${category.type}`),
  );

  if (missingDefaults.length === 0) return;

  await prisma.category.createMany({
    data: missingDefaults.map((category) => ({
      userId,
      name: category.name,
      type: category.type,
      iconName: category.iconName,
      color: category.color,
      isActive: true,
      isDefault: true,
    })),
  });
}

export async function getCategoriesByUser(userId: string) {
  await ensureDefaultCategoriesForUser(userId);

  return prisma.category.findMany({
    where: { userId },
    orderBy: [{ isDefault: "desc" }, { type: "asc" }, { name: "asc" }],
  });
}

export function getCategoryById(id: string, userId: string) {
  return prisma.category.findFirst({ where: { id, userId } });
}

export function createCategory(data: CreateCategoryInput) {
  return prisma.$transaction(async (tx) => {
    const existingCategory = await tx.category.findFirst({
      where: {
        userId: data.userId,
        name: data.name,
        type: data.type,
      },
    });

    if (existingCategory) {
      if (existingCategory.isActive) {
        return existingCategory;
      }

      return tx.category.update({
        where: { id: existingCategory.id },
        data: {
          name: data.name,
          type: data.type,
          isActive: true,
          iconName: data.iconName,
          color: data.color,
        },
      });
    }

    return tx.category.create({ data });
  });
}

export async function updateCategory(
  id: string,
  userId: string,
  data: UpdateCategoryInput,
) {
  const category = await prisma.category.findFirstOrThrow({
    where: { id, userId },
  });

  return prisma.category.update({
    where: { id: category.id },
    data,
  });
}

export async function deleteCategory(id: string, userId: string) {
  const category = await prisma.category.findFirstOrThrow({
    where: { id, userId },
  });

  if (category.isDefault) {
    throw new Error("DEFAULT_CATEGORY");
  }

  return prisma.category.delete({ where: { id: category.id } });
}
