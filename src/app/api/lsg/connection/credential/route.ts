import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { LsgLinkError, revokeCredential } from "@/services/lsg.service";

// DELETE /api/lsg/connection/credential: dejar de guardar la contraseña sin
// desvincular. La sesión actual sigue viva hasta que expire por su cuenta.
export async function DELETE() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }
    await revokeCredential(session.user.id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof LsgLinkError) {
      return NextResponse.json(
        { message: error.message },
        { status: error.status },
      );
    }
    console.error("🐛 revoke lsg credential error", error);
    return NextResponse.json(
      { message: "Error revocando la contraseña guardada" },
      { status: 500 },
    );
  }
}
