import { RoleLogin } from "@/components/role-login";

export default function DashboardLoginPage() {
  return (
    <RoleLogin role="dashboard" title="Dashboard Login" subtitle="Live operations dashboard." redirectTo="/dashboard" />
  );
}
