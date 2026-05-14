import { createFileRoute } from "@tanstack/react-router";
import { RoleLogin } from "@/components/role-login";
export const Route = createFileRoute("/login/pos")({
  component: () => <RoleLogin role="pos" title="POS Login" subtitle="Counter staff registration." redirectTo="/pos" />,
});
