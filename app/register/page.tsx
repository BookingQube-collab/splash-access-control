import { Suspense } from "react";
import RegisterPage from "@/routes/register";

export default function Page() {
  return (
    <Suspense
      fallback={
        <div className="grid min-h-screen place-items-center bg-[#faf8f4]">
          <div className="h-12 w-12 animate-spin rounded-full border-2 border-[#00a8b5]/30 border-t-[#00a8b5]" />
        </div>
      }
    >
      <RegisterPage />
    </Suspense>
  );
}
