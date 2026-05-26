import type { Metadata, Viewport } from "next";
import { Suspense } from "react";
import MyPassesPage from "@/routes/my-passes";

export const metadata: Metadata = {
  title: "Your pass — SummerSplash",
  description: "Guest pass and entry QR code.",
};

export const viewport: Viewport = {
  themeColor: "#00A9BC",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

type Props = { params: Promise<{ passId: string }> };

export default async function MyPassByIdPage({ params }: Props) {
  const { passId } = await params;
  return (
    <Suspense
      fallback={
        <div className="grid min-h-screen place-items-center bg-[#f4f6f8]">
          <div className="h-12 w-12 animate-spin rounded-full border-2 border-[#0a6b76]/30 border-t-[#0a6b76]" />
        </div>
      }
    >
      <MyPassesPage routePassId={decodeURIComponent(passId)} />
    </Suspense>
  );
}
