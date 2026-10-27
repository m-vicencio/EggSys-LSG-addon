import type { Category } from "@/views/core/dashboard/interfaces/dashboard";

export type CategoryType = "INCOME" | "EXPENSE";

export type CreateCategoryInput = {
  name: string;
  type: CategoryType;
  iconName: string;
  color: string;
  isActive?: boolean;
};

export type UpdateCategoryInput = Partial<CreateCategoryInput>;

async function handleResponse<T>(
  res: Response | Promise<Response>,
): Promise<T> {
  const response = await res;
  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(body?.message ?? `Error ${response.status}`);
  }
  return response.json();
}

export const categoriesApi = {
  /** Obtiene todas las categorías disponibles */
  getAll: async (): Promise<Category[]> => {
    const json = await handleResponse<{ data?: Category[] } | Category[]>(
      fetch("/api/categories"),
    );
    return Array.isArray(json) ? json : (json?.data ?? []);
  },

  create: (data: CreateCategoryInput) =>
    handleResponse<Category>(
      fetch("/api/categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      }),
    ),

  update: (id: string, data: UpdateCategoryInput) =>
    handleResponse<Category>(
      fetch(`/api/categories/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      }),
    ),

  delete: (id: string) =>
    handleResponse(fetch(`/api/categories/${id}`, { method: "DELETE" })),
};
