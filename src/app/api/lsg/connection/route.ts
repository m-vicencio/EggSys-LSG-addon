import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import {
  getAdapterStatus,
  getConnection,
  LsgLinkError,
  linkConnection,
  lsgAddonEnabled,
  unlinkConnection,
} from "@/services/lsg.service";

const linkSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
  // Opt-in a que el adaptador guarde la contraseña cifrada y renueve la sesión
  // sola. Default false: sin marcarlo, la contraseña se descarta tras el login.
  storeCredential: z.boolean().default(false),
});

// GET /api/lsg/connection: estado del vínculo
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }
    if (!lsgAddonEnabled()) {
      return NextResponse.json({
        data: { addonEnabled: false, connection: null },
      });
    }
    const connection = await getConnection(session.user.id);
    if (!connection) {
      return NextResponse.json({
        data: { addonEnabled: true, connection: null },
      });
    }
    const status = await getAdapterStatus(session.user.id);
    return NextResponse.json({
      data: {
        addonEnabled: true,
        connection: {
          lsgPlayerId: connection.lsgPlayerId,
          lsgEmail: connection.lsgEmail,
          enabled: connection.enabled,
          disabledEvents: connection.disabledEvents,
          linkedAt: connection.linkedAt,
          lastSyncAt: connection.lastSyncAt,
          needsRelink: status.needsRelink,
          adapterReachable: status.reachable,
          credentialConsent: status.credentialConsent,
          credentialState: status.credentialState,
          brokenReason: status.brokenReason,
        },
      },
    });
  } catch (error) {
    console.error("🐛 get lsg connection error", error);
    return NextResponse.json(
      { message: "Error obteniendo el vínculo LSG" },
      { status: 500 },
    );
  }
}

// POST /api/lsg/connection: vincular. La contraseña solo se guarda (cifrada,
// en el adaptador) si el usuario marca storeCredential.
export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }
    if (!lsgAddonEnabled()) {
      return NextResponse.json(
        { message: "El addon LifeSync no está habilitado" },
        { status: 503 },
      );
    }
    const json = await req.json();
    const parse = linkSchema.safeParse(json);
    if (!parse.success) {
      return NextResponse.json(
        {
          message: "Validation error",
          errors: parse.error.flatten().fieldErrors,
        },
        { status: 400 },
      );
    }
    const connection = await linkConnection(
      session.user.id,
      parse.data.email,
      parse.data.password,
      parse.data.storeCredential,
    );
    return NextResponse.json(
      {
        lsgPlayerId: connection.lsgPlayerId,
        lsgEmail: connection.lsgEmail,
        enabled: connection.enabled,
        credentialConsent: connection.credentialConsent,
        credentialState: connection.credentialState,
      },
      { status: 201 },
    );
  } catch (error) {
    if (error instanceof LsgLinkError) {
      return NextResponse.json(
        { message: error.message },
        { status: error.status },
      );
    }
    console.error("🐛 link lsg connection error", error);
    return NextResponse.json(
      { message: "Error vinculando con LifeSync-Games" },
      { status: 500 },
    );
  }
}

// DELETE /api/lsg/connection: desvincular
export async function DELETE() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }
    await unlinkConnection(session.user.id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof LsgLinkError) {
      return NextResponse.json(
        { message: error.message },
        { status: error.status },
      );
    }
    console.error("🐛 unlink lsg connection error", error);
    return NextResponse.json(
      { message: "Error desvinculando de LifeSync-Games" },
      { status: 500 },
    );
  }
}
