import { Suspense } from "react";
import LoginPage from "@/routes/login";

export default function Page() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center text-muted-foreground">Loading…</div>
      }
    >
      <LoginPage />
    </Suspense>
  );
}
