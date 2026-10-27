// CRUD para ItemDefinition
import { type NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const items = await prisma.itemDefinition.findMany();
  return NextResponse.json(items);
}

export async function POST(req: NextRequest) {
  const data = await req.json();
  const item = await prisma.itemDefinition.create({ data });
  return NextResponse.json(item);
}
