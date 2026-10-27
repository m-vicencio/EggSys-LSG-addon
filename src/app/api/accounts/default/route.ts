import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { unsetDefaultAccount } from "@/services/account.service";

export async function PATCH(_req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    await unsetDefaultAccount(session.user.id);

    return NextResponse.json(
      { message: "Cuenta predeterminada eliminada" },
      { status: 200 },
    );
  } catch (error) {
    console.error("🐛 unset default account error", error);
    return NextResponse.json(
      { message: "Error al desmarcar la cuenta predeterminada" },
      { status: 500 },
    );
  }
}
