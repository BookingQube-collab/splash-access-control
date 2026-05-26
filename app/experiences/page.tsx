import type { Metadata } from "next";
import ExperiencesPage from "@/routes/experiences";

export const metadata: Metadata = {
  title: "Experiences — SummerSplash",
  description: "Waterpark attractions, timed slots, and VIP experiences at SummerSplash Beach Festival.",
};

export default function Page() {
  return <ExperiencesPage />;
}
