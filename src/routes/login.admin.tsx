import { createFileRoute } from "@tanstack/react-router";
import { RoleLogin } from "@/components/role-login";
export const Route = createFileRoute("/login/admin")({
  component: () => <RoleLogin role="admin" title="Admin Login" subtitle="Full access to the SummerSplash admin panel." redirectTo="/admin" />,
});
