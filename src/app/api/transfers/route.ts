import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import {
  createTransfer,
  getTransfersByAccount,
} from "@/services/transfer.service";

const createTransferSchema = z.object({
  fromAccountId: z.string().min(1),
  toAccountId: z.string().min(1),
  amount: z.number().positive(),
  date: z.string().optional(),
  comment: z.string().max(500).optional(),
});

// GET /api/transfers?accountId=xxx
export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }
    const { searchParams } = new URL(req.url);
    const accountId = searchParams.get("accountId") ?? undefined;

    const data = await getTransfersByAccount(session.user.id, accountId);
    return NextResponse.json({ data }, { status: 200 });
  } catch (error) {
    console.error("🐛 get transfers error", error);
    return NextResponse.json(
      { message: "Error fetching transfers" },
      { status: 500 },
    );
  }
}

// POST /api/transfers
export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }
    const json = await req.json();
    const parse = createTransferSchema.safeParse(json);
    if (!parse.success) {
      return NextResponse.json(
        {
          message: "Validation error",
          errors: parse.error.flatten().fieldErrors,
        },
        { status: 400 },
      );
    }
    const transfer = await createTransfer({
      ...parse.data,
      userId: session.user.id,
    });
    return NextResponse.json(transfer, { status: 201 });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Error creating transfer";
    console.error("🐛 create transfer error", error);
    return NextResponse.json({ message }, { status: 400 });
  }
}
