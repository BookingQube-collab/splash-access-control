import { createFileRoute } from "@tanstack/react-router";
import { RoleLogin } from "@/components/role-login";
export const Route = createFileRoute("/login/dashboard")({
  component: () => <RoleLogin role="dashboard" title="Dashboard Login" subtitle="Live operations dashboard." redirectTo="/dashboard" />,
});
