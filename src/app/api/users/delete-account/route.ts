import { compare } from "bcryptjs";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  getConnection,
  lsgAddonEnabled,
  unlinkConnection,
} from "@/services/lsg.service";

const deleteAccountSchema = z.object({
  email: z.string().email("Correo inválido"),
  password: z.string().min(1, "La contraseña es obligatoria"),
});

// POST /api/users/delete-account
export async function POST(req: Request) {
  try {
    const json = await req.json();
    const parse = deleteAccountSchema.safeParse(json);

    if (!parse.success) {
      return NextResponse.json(
        {
          message: "Validation error",
          errors: parse.error.flatten().fieldErrors,
        },
        { status: 400 },
      );
    }

    const { email, password } = parse.data;
    const session = await getServerSession(authOptions);

    const user = session?.user?.id
      ? await prisma.user.findUnique({
          where: { id: session.user.id },
          select: { id: true, email: true, hashedPassword: true },
        })
      : await prisma.user.findUnique({
          where: { email },
          select: { id: true, email: true, hashedPassword: true },
        });

    // Evita usar sesión para borrar una cuenta distinta a la autenticada.
    if (session?.user?.id && user?.email !== email) {
      return NextResponse.json(
        {
          message: "El correo no coincide con la cuenta autenticada",
        },
        { status: 403 },
      );
    }

    if (!user || !user.hashedPassword) {
      return NextResponse.json(
        { message: "Correo o contraseña incorrectos" },
        { status: 400 },
      );
    }

    const isPasswordValid = await compare(password, user.hashedPassword);
    if (!isPasswordValid) {
      return NextResponse.json(
        { message: "Correo o contraseña incorrectos" },
        { status: 400 },
      );
    }

    // El vínculo LSG se borra en el adaptador antes que la cuenta: la cascada
    // local no le llega, y sin esto el adaptador seguiría renovando el token
    // (y guardando la contraseña) de una cuenta que ya no existe.
    if (await getConnection(user.id)) {
      try {
        await unlinkConnection(user.id);
      } catch (error) {
        // Con el addon apagado el adaptador puede no existir: no bloquear el
        // borrado por él.
        if (lsgAddonEnabled()) {
          console.error("🐛 delete account lsg unlink error", error);
          return NextResponse.json(
            {
              message:
                "No pudimos desvincular tu perfil de LifeSync-Games, así que la cuenta no se borró. Inténtalo de nuevo en unos minutos.",
            },
            { status: 503 },
          );
        }
      }
    }

    await prisma.$transaction(async (tx) => {
      const ownedAccounts = await tx.appAccount.findMany({
        where: { userId: user.id },
        select: { id: true },
      });

      if (ownedAccounts.length > 0) {
        await tx.appAccount.deleteMany({
          where: { id: { in: ownedAccounts.map((account) => account.id) } },
        });
      }

      await tx.user.delete({ where: { id: user.id } });
    });

    return NextResponse.json(
      { message: "Cuenta y datos eliminados correctamente" },
      { status: 200 },
    );
  } catch (error) {
    console.error("🐛 delete full account error", error);
    return NextResponse.json(
      { message: "Error al eliminar la cuenta" },
      { status: 500 },
    );
  }
}
