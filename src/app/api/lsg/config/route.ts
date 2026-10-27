import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { getConnection, updateConfig } from "@/services/lsg.service";

const configSchema = z.object({
  enabled: z.boolean().optional(),
  disabledEvents: z.array(z.string()).optional(),
});

// GET /api/lsg/config: toggles por tipo de evento
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }
    const connection = await getConnection(session.user.id);
    if (!connection) {
      return NextResponse.json({ message: "No vinculado" }, { status: 404 });
    }
    return NextResponse.json({
      data: {
        enabled: connection.enabled,
        disabledEvents: connection.disabledEvents,
      },
    });
  } catch (error) {
    console.error("🐛 get lsg config error", error);
    return NextResponse.json(
      { message: "Error obteniendo configuración LSG" },
      { status: 500 },
    );
  }
}

// PATCH /api/lsg/config
export async function PATCH(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }
    const json = await req.json();
    const parse = configSchema.safeParse(json);
    if (!parse.success) {
      return NextResponse.json(
        {
          message: "Validation error",
          errors: parse.error.flatten().fieldErrors,
        },
        { status: 400 },
      );
    }
    const connection = await updateConfig(session.user.id, parse.data);
    return NextResponse.json({
      data: {
        enabled: connection.enabled,
        disabledEvents: connection.disabledEvents,
      },
    });
  } catch (error) {
    console.error("🐛 patch lsg config error", error);
    return NextResponse.json(
      { message: "Error actualizando configuración LSG" },
      { status: 500 },
    );
  }
}
