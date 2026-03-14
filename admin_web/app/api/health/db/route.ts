import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const result = await prisma.$queryRawUnsafe("SELECT NOW()");

    return NextResponse.json({
      ok: true,
      db: "connected",
      time: result
    });

  } catch (error) {
    console.error(error);

    return NextResponse.json(
      {
        ok: false,
        db: "error"
      },
      { status: 500 }
    );
  }
}