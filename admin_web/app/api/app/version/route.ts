import { NextResponse } from "next/server";

export async function GET() {
  const latestVersion = process.env.PECNOT_LATEST_VERSION?.trim() || "1.0.0";
  const downloadUrl = process.env.PECNOT_DOWNLOAD_URL?.trim() || "";
  const mandatory = process.env.PECNOT_UPDATE_MANDATORY?.trim() === "true";
  const notes = process.env.PECNOT_UPDATE_NOTES?.trim() || "";

  return NextResponse.json(
    {
      ok: true,
      latestVersion,
      downloadUrl,
      mandatory,
      notes,
    },
    {
      status: 200,
      headers: {
        "Cache-Control": "no-store, no-cache, must-revalidate",
      },
    }
  );
}