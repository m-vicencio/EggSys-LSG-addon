import { NextResponse } from "next/server";
import { openApiSpec } from "@/lib/openapi";

// GET /api/openapi.json: spec en formato JSON (útil para importar en Postman, Insomnia, etc.)
export function GET() {
  return NextResponse.json(openApiSpec);
}
