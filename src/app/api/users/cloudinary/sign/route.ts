import crypto from "node:crypto";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

// POST /api/users/cloudinary/sign
export async function POST() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const CLOUD_NAME = process.env.CLOUDINARY_CLOUD_NAME;
    const API_KEY = process.env.CLOUDINARY_API_KEY;
    const API_SECRET = process.env.CLOUDINARY_API_SECRET;

    if (!CLOUD_NAME || !API_KEY || !API_SECRET) {
      return NextResponse.json(
        { message: "Cloudinary not configured on server" },
        { status: 500 },
      );
    }

    const timestamp = Math.floor(Date.now() / 1000);
    const toSign = `timestamp=${timestamp}${API_SECRET}`;
    const signature = crypto.createHash("sha1").update(toSign).digest("hex");

    return NextResponse.json({
      timestamp,
      signature,
      apiKey: API_KEY,
      cloudName: CLOUD_NAME,
    });
  } catch (error) {
    console.error("cloudinary sign error", error);
    return NextResponse.json(
      { message: "Error generating signature" },
      { status: 500 },
    );
  }
}
