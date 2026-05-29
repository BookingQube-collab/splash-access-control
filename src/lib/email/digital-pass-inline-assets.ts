import "server-only";

import { readFile } from "fs/promises";
import path from "path";
import { generatePassQrPngBuffer } from "@/lib/pass-qr-image";
import { BRAND_LOGO } from "@/lib/public-assets";

export const PASS_QR_FILENAME = "pass-qr.png";
export const LOGO_FILENAME = "summer-splash-logo.png";

export type MailInlineAttachment = {
  filename: string;
  content: Buffer;
  /** Value for HTML `src="cid:…"` (matches filename for Mailgun; nodemailer uses this as cid). */
  cid: string;
  contentType: string;
};

/** HTML `src` for an inline attachment referenced by filename. */
export function cidImageSrc(filename: string): string {
  return `cid:${filename}`;
}

function publicAssetPath(relativePath: string): string {
  const normalized = relativePath.replace(/^\//, "");
  return path.join(process.cwd(), "public", normalized);
}

/** Logo + QR as inline attachments so they render without fetching the site URL. */
export async function buildDigitalPassInlineAssets(qrToken: string): Promise<{
  attachments: MailInlineAttachment[];
  logoUrl: string;
  qrImageUrl: string;
}> {
  const logoPath = publicAssetPath(BRAND_LOGO);
  const [logoBuffer, qrBuffer] = await Promise.all([
    readFile(logoPath),
    generatePassQrPngBuffer(qrToken),
  ]);

  const attachments: MailInlineAttachment[] = [
    {
      filename: LOGO_FILENAME,
      content: logoBuffer,
      cid: LOGO_FILENAME,
      contentType: "image/png",
    },
    {
      filename: PASS_QR_FILENAME,
      content: qrBuffer,
      cid: PASS_QR_FILENAME,
      contentType: "image/png",
    },
  ];

  return {
    attachments,
    logoUrl: cidImageSrc(LOGO_FILENAME),
    qrImageUrl: cidImageSrc(PASS_QR_FILENAME),
  };
}
