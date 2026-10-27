import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getBudgetsSummary } from "@/services/graphics.service";

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id)
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const accountId = searchParams.get("accountId") || undefined;
    const month =
      Number(searchParams.get("month")) || new Date().getMonth() + 1;
    const year = Number(searchParams.get("year")) || new Date().getFullYear();

    const data = await getBudgetsSummary(
      session.user.id,
      month,
      year,
      accountId,
    );
    return NextResponse.json({ data }, { status: 200 });
  } catch (error) {
    console.error("🐛 budgets-summary error", error);
    return NextResponse.json(
      { message: "Error fetching budgets summary" },
      { status: 500 },
    );
  }
}
