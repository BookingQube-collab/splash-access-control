import { Pacifico } from "next/font/google";

const pacifico = Pacifico({
  subsets: ["latin"],
  weight: "400",
  variable: "--font-script",
});

export default function RegisterLayout({ children }: { children: React.ReactNode }) {
  return <div className={pacifico.variable}>{children}</div>;
}
