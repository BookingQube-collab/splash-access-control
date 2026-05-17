import { RoleLogin } from "@/components/role-login";

export default function ScannerLoginPage() {
  return (
    <RoleLogin role="scanner" title="Scanner Login" subtitle="Entry & exit scanning." redirectTo="/scanner" />
  );
}
