import type { Metadata, Viewport } from "next";
import { Suspense } from "react";
import MyPassesPage from "@/routes/my-passes";

export const metadata: Metadata = {
  title: "My Passes — SummerSplash",
  description: "View your beach festival passes and entry QR codes.",
};

export const viewport: Viewport = {
  themeColor: "#00A9BC",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default function Page() {
  return (
    <Suspense
      fallback={
        <div className="grid min-h-screen place-items-center bg-[#faf8f4]">
          <div className="h-12 w-12 animate-spin rounded-full border-2 border-brand-teal/30 border-t-brand-teal" />
        </div>
      }
    >
      <MyPassesPage />
    </Suspense>
  );
}
