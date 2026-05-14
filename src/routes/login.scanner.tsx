import { createFileRoute } from "@tanstack/react-router";
import { RoleLogin } from "@/components/role-login";
export const Route = createFileRoute("/login/scanner")({
  component: () => <RoleLogin role="scanner" title="Scanner Login" subtitle="Entry & exit scanning." redirectTo="/scanner" />,
});
