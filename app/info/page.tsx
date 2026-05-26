import type { Metadata } from "next";
import InfoPage from "@/routes/info";

export const metadata: Metadata = {
  title: "Info — SummerSplash",
  description: "Festival dates, rules, what to bring, and FAQ for SummerSplash Beach Festival.",
};

export default function Page() {
  return <InfoPage />;
}
