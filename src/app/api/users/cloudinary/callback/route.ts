import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const bodySchema = z.object({ url: z.string().url() });

// POST /api/users/cloudinary/callback
export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const json = await req.json();
    const parse = bodySchema.safeParse(json);
    if (!parse.success) {
      return NextResponse.json({ message: "Invalid payload" }, { status: 400 });
    }

    const { url } = parse.data;

    // Validate URL is https and host is allowlisted (Cloudinary)
    const allowedHosts = ["res.cloudinary.com"];
    const allowedHostSuffixes = [".cloudinary.com"];
    try {
      const parsed = new URL(url);
      if (parsed.protocol !== "https:") {
        return NextResponse.json(
          { message: "Only https URLs are allowed" },
          { status: 400 },
        );
      }
      const hostname = parsed.hostname.toLowerCase();
      const hostAllowed =
        allowedHosts.includes(hostname) ||
        allowedHostSuffixes.some((s) => hostname.endsWith(s));
      if (!hostAllowed) {
        return NextResponse.json(
          { message: "Host not allowed" },
          { status: 400 },
        );
      }
    } catch {
      return NextResponse.json({ message: "Invalid URL" }, { status: 400 });
    }

    await prisma.user.update({
      where: { id: session.user.id },
      data: { image: url },
    });

    return NextResponse.json({ url }, { status: 200 });
  } catch (error) {
    console.error("cloudinary callback error", error);
    return NextResponse.json(
      { message: "Error saving avatar" },
      { status: 500 },
    );
  }
}
