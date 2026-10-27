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

export type PetData = {
  id: string;
  name: string;
  type: string;
  stage: string;
  petType?: string;
  petStage?: string;
  stageAssets?: { stageName: string; assetUrl: string }[];
  level: number;
  currentXp: number;
  xpToNextLevel: number;
  account?: {
    id: string;
    balance: number;
    savingGoal: number;
  };
};

export const petsApi = {
  /** Obtiene la mascota asociada a una cuenta de ahorro */
  getByAccount: (accountId: string): Promise<PetData> =>
    handleResponse(fetch(`/api/pets/by-account/${accountId}`)),

  /** Cambia el nombre de la mascota */
  rename: (petId: string, name: string): Promise<PetData> =>
    handleResponse(
      fetch(`/api/pets/${petId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      }),
    ),
};
