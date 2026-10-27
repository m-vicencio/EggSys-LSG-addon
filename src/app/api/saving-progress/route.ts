// CRUD para SavingProgress
import { type NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const progress = await prisma.savingProgress.findMany();
  return NextResponse.json(progress);
}

export async function POST(req: NextRequest) {
  const data = await req.json();
  const progress = await prisma.savingProgress.create({ data });
  return NextResponse.json(progress);
}
