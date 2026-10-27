import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { flushOutbox, getEvents } from "@/services/lsg.service";

// GET /api/lsg/events?limit=50: historial del outbox con estado de sync
export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }
    const { searchParams } = new URL(req.url);
    const limit = Number(searchParams.get("limit")) || 50;

    // Reintento oportunista de eventos pendientes al consultar el historial
    await flushOutbox(session.user.id).catch(() => {});

    const events = await getEvents(session.user.id, limit);
    return NextResponse.json({ data: events });
  } catch (error) {
    console.error("🐛 get lsg events error", error);
    return NextResponse.json(
      { message: "Error obteniendo eventos LSG" },
      { status: 500 },
    );
  }
}
