import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { generatePassQrPngBuffer } from "@/lib/pass-qr-image";

const tokenSchema = z.string().uuid();

/** PNG QR code for pass links (used in transactional emails). */
export async function GET(req: NextRequest) {
  const raw = req.nextUrl.searchParams.get("token")?.trim() ?? "";
  const parsed = tokenSchema.safeParse(raw);
  if (!parsed.success) {
    return new NextResponse("Invalid token", { status: 400 });
  }

  const png = await generatePassQrPngBuffer(parsed.data);

  return new NextResponse(new Uint8Array(png), {
    headers: {
      "Content-Type": "image/png",
      "Cache-Control": "public, max-age=86400",
    },
  });
}
