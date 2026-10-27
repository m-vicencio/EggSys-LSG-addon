import bcrypt from "bcryptjs";
import { type NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { token, password } = body ?? {};

    // Basic server-side validation for token and password
    if (typeof token !== "string" || typeof password !== "string") {
      return NextResponse.json(
        { error: "Invalid token or password" },
        { status: 400 },
      );
    }

    // Enforce minimum length and basic complexity (at least one letter and one digit)
    const passwordIsValidLength = password.length >= 8;
    const passwordHasLetterAndNumber = /[A-Za-z]/.test(password) && /\d/.test(password);

    if (!passwordIsValidLength || !passwordHasLetterAndNumber) {
      return NextResponse.json(
        { error: "Password does not meet complexity requirements" },
        { status: 400 },
      );
    }
    const user = await prisma.user.findUnique({
      where: {
        passwordResetToken: token,
      },
    });

    const now = new Date();

    if (
      !user ||
      !user.passwordResetExpires ||
      user.passwordResetExpires < now
    ) {
      return NextResponse.json(
        { error: "Invalid or expired token" },
        { status: 400 },
      );
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    await prisma.user.update({
      where: { id: user.id },
      data: {
        hashedPassword,
        passwordResetToken: null,
        passwordResetExpires: null,
      },
    });

    return NextResponse.json({ message: "Password has been reset" });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}
