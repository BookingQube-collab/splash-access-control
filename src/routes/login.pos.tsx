import { redirect } from "next/navigation";
import { UNIFIED_LOGIN_PATH } from "@/lib/staff-auth";

export default function PosLoginPage() {
  redirect(UNIFIED_LOGIN_PATH);
}
