import type { Metadata } from "next";
import ContactPage from "@/routes/contact";

export const metadata: Metadata = {
  title: "Contact — SummerSplash",
  description: "Contact SummerSplash guest services for bookings, passes, and festival support.",
};

export default function Page() {
  return <ContactPage />;
}
