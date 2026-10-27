import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getCategoryDetail } from "@/services/graphics.service";

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id)
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const categoryId = searchParams.get("categoryId");
    if (!categoryId)
      return NextResponse.json(
        { message: "categoryId required" },
        { status: 400 },
      );

    const month =
      Number(searchParams.get("month")) || new Date().getMonth() + 1;
    const year = Number(searchParams.get("year")) || new Date().getFullYear();
    const accountId = searchParams.get("accountId") || undefined;

    const data = await getCategoryDetail(
      session.user.id,
      categoryId,
      month,
      year,
      accountId,
    );
    return NextResponse.json({ data }, { status: 200 });
  } catch (error) {
    console.error("🐛 category-detail error", error);
    return NextResponse.json(
      { message: "Error fetching category detail" },
      { status: 500 },
    );
  }
}
