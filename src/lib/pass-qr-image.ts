import QRCode from "qrcode";
import { passUrl } from "@/lib/public-url";

/** PNG buffer for a pass QR code (pass link URL encoded). */
export async function generatePassQrPngBuffer(qrToken: string): Promise<Buffer> {
  const url = passUrl(qrToken);
  return QRCode.toBuffer(url, {
    type: "png",
    width: 280,
    margin: 1,
    errorCorrectionLevel: "H",
    color: { dark: "#102A43", light: "#ffffff" },
  });
}
