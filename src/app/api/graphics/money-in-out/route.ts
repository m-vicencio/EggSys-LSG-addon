import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getMoneyInOut } from "@/services/graphics.service";

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id)
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const month =
      Number(searchParams.get("month")) || new Date().getMonth() + 1;
    const year = Number(searchParams.get("year")) || new Date().getFullYear();
    const accountId = searchParams.get("accountId") || undefined;

    const data = await getMoneyInOut(session.user.id, month, year, accountId);
    return NextResponse.json({ data }, { status: 200 });
  } catch (error) {
    console.error("🐛 money-in-out error", error);
    return NextResponse.json(
      { message: "Error fetching money in/out" },
      { status: 500 },
    );
  }
}
