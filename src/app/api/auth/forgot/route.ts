import crypto from "node:crypto";
import { type NextRequest, NextResponse } from "next/server";
import { sendPasswordResetEmail } from "@/lib/mailer";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const email = body?.email;

    const isValidEmail =
      typeof email === "string" && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

    if (!isValidEmail) {
      return NextResponse.json({ error: "Invalid email" }, { status: 400 });
    }
    const user = await prisma.user.findUnique({ where: { email } });

    // If user doesn't exist, don't reveal it: wait a short time and return
    // a generic success response so callers can't enumerate users.
    if (!user) {
      await new Promise((r) => setTimeout(r, 500));
      return NextResponse.json(
        {
          message:
            "Si existe una cuenta con ese correo, se ha enviado un enlace para restablecer la contraseña.",
        },
        { status: 202 },
      );
    }

    const passwordResetToken = crypto.randomBytes(32).toString("base64url");
    const today = new Date();
    const expiryDate = new Date(today.setDate(today.getDate() + 1)); // 1 day to expire

    await prisma.user.update({
      where: { id: user.id },
      data: {
        passwordResetToken,
        passwordResetExpires: expiryDate,
      },
    });

    await sendPasswordResetEmail(user.email, passwordResetToken);

    return NextResponse.json(
      {
        message:
          "Si existe una cuenta con ese correo, se ha enviado un enlace para restablecer la contraseña.",
      },
      { status: 202 },
    );
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}
