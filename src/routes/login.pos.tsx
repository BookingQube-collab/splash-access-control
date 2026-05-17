import { RoleLogin } from "@/components/role-login";

export default function PosLoginPage() {
  return (
    <RoleLogin role="pos" title="POS Login" subtitle="Counter staff registration." redirectTo="/pos" />
  );
}
