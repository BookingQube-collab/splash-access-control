import { RoleLogin } from "@/components/role-login";

export default function AdminLoginPage() {
  return (
    <RoleLogin role="admin" title="Admin Login" subtitle="Full access to the SummerSplash admin panel." redirectTo="/admin" />
  );
}
