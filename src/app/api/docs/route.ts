import { ApiReference } from "@scalar/nextjs-api-reference";

// GET /api/docs: UI interactiva de la documentación (Scalar / OpenAPI 3.0)
// El spec se carga desde /api/openapi.json
export const GET = ApiReference({
  url: "/api/openapi.json",
  pageTitle: "EggSys — API Docs",
});
