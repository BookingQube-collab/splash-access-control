"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import {
  ArrowRight,
  Eye,
  EyeOff,
  Fingerprint,
  Lock,
  Mail,
  User,
} from "lucide-react";
import { toast } from "sonner";
import { PasskeyEnrollDialog } from "@/components/passkey-enroll-dialog";
import { LoginBeachLayout, LoginWaveMark } from "@/components/public/login-beach-layout";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import {
  assertStaffAccess,
  countMyPasskeys,
  getPasskeysDashboardUrl,
  getPasskeysStatusSync,
  isPasskeySupported,
  shouldOfferPasskeyEnrollment,
  signInWithPasskeyForStaff,
} from "@/lib/passkey-auth";
import { isEmailLikeStaffIdentifier } from "@/lib/staff-auth";
import { resolveStaffLoginEmail } from "@/lib/staff-login.server";
import { cn } from "@/lib/utils";

const REMEMBER_KEY = "splash-staff-remember";
const REMEMBER_EMAIL_KEY = "splash-staff-remember-email";

interface StaffLoginProps {
  title: string;
  subtitle: string;
}

const fieldLabelClass =
  "mb-2 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.2em] text-[#00a8b5]";

const fieldInputClass =
  "h-12 rounded-xl border border-[#d1dde0] bg-white pr-11 text-base text-[#0a4a52] shadow-none placeholder:text-[#5a7a80]/55 focus-visible:border-[#00a8b5] focus-visible:ring-2 focus-visible:ring-[#00a8b5]/25";

export function StaffLogin({ title, subtitle }: StaffLoginProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [loginId, setLoginId] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [remember, setRemember] = useState(false);
  const [loading, setLoading] = useState(false);
  const [passkeyLoading, setPasskeyLoading] = useState(false);
  const [enrollUserId, setEnrollUserId] = useState<string | null>(null);
  const [showPasskeySignIn, setShowPasskeySignIn] = useState(false);
  const [pendingRedirect, setPendingRedirect] = useState("/admin");

  const nextPath = searchParams.get("next");

  useEffect(() => {
    const savedRemember = localStorage.getItem(REMEMBER_KEY) === "1";
    setRemember(savedRemember);
    if (savedRemember) {
      const savedEmail = localStorage.getItem(REMEMBER_EMAIL_KEY);
      if (savedEmail) setLoginId(savedEmail);
    }
  }, []);

  useEffect(() => {
    if (searchParams.get("error") === "access_denied") {
      toast.error("You don't have access to that portal.");
    }
  }, [searchParams]);

  useEffect(() => {
    if (!isPasskeySupported()) return;
    setShowPasskeySignIn(getPasskeysStatusSync());
  }, []);

  const persistRemember = (checked: boolean, value: string) => {
    if (typeof window === "undefined") return;
    if (checked) {
      localStorage.setItem(REMEMBER_KEY, "1");
      localStorage.setItem(REMEMBER_EMAIL_KEY, value);
    } else {
      localStorage.removeItem(REMEMBER_KEY);
      localStorage.removeItem(REMEMBER_EMAIL_KEY);
    }
  };

  const finishSignIn = async (userId: string, redirectTo: string) => {
    setPendingRedirect(redirectTo);
    if (shouldOfferPasskeyEnrollment(userId)) {
      if (!getPasskeysStatusSync()) {
        router.push(nextPath || redirectTo);
        return;
      }
      const count = await countMyPasskeys();
      if (count === null) {
        router.push(nextPath || redirectTo);
        return;
      }
      if (count === 0) {
        setEnrollUserId(userId);
        return;
      }
    }
    router.push(nextPath || redirectTo);
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const resolved = await resolveStaffLoginEmail(loginId);
    if ("error" in resolved) {
      setLoading(false);
      toast.error(resolved.error);
      return;
    }
    const { data, error } = await supabase.auth.signInWithPassword({
      email: resolved.email,
      password,
    });
    if (error || !data.user) {
      setLoading(false);
      toast.error(error?.message || "Login failed");
      return;
    }
    const check = await assertStaffAccess(data.user.id);
    if (!check.ok) {
      setLoading(false);
      toast.error(check.message);
      return;
    }
    persistRemember(remember, loginId);
    toast.success("Signed in");
    setLoading(false);
    await finishSignIn(data.user.id, check.redirectTo);
  };

  const onPasskeySignIn = async () => {
    setPasskeyLoading(true);
    const result = await signInWithPasskeyForStaff();
    setPasskeyLoading(false);
    if (!result.ok) {
      toast.error(result.message, {
        duration: 10_000,
        action: {
          label: "Supabase Passkeys",
          onClick: () => window.open(getPasskeysDashboardUrl(), "_blank", "noopener"),
        },
      });
      return;
    }
    const {
      data: { user },
    } = await supabase.auth.getUser();
    toast.success("Signed in with passkey");
    if (user) await finishSignIn(user.id, result.redirectTo);
    else router.push(nextPath || result.redirectTo);
  };

  const onForgotPassword = async () => {
    const trimmed = loginId.trim();
    if (!trimmed) {
      toast.info("Enter your email above, or contact your administrator for access.");
      return;
    }
    if (!isEmailLikeStaffIdentifier(trimmed)) {
      toast.info("Password reset requires your email address. Enter your email, or contact your administrator.");
      return;
    }
    const redirectUrl =
      typeof window !== "undefined" ? `${window.location.origin}${window.location.pathname}` : undefined;
    const { error } = await supabase.auth.resetPasswordForEmail(trimmed, {
      redirectTo: redirectUrl,
    });
    if (error) {
      toast.info("Password reset isn't available. Please contact your administrator.");
      return;
    }
    toast.success("Check your email for a password reset link.");
  };

  return (
    <LoginBeachLayout>
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45 }}
        className="flex w-full max-w-[400px] flex-col items-center"
      >
        <LoginWaveMark className="mb-5" />
        <h1 className="text-center font-display text-[1.65rem] font-extrabold tracking-tight text-[#0a4a52] drop-shadow-sm">
          {title}
        </h1>
        <p className="mt-2 max-w-[22rem] text-center text-sm leading-relaxed text-[#5a7a80]">{subtitle}</p>

        <form
          onSubmit={onSubmit}
          className="mt-8 w-full rounded-[20px] bg-white p-6 shadow-[0_20px_60px_rgba(10,74,82,0.14)] sm:p-7"
        >
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1, duration: 0.35 }}
            className="space-y-5"
          >
            <div>
              <Label htmlFor="staff-login-id" className={fieldLabelClass}>
                <Mail className="h-3.5 w-3.5" />
                Email or username
              </Label>
              <motion.div className="relative" whileFocus={{ scale: 1.01 }}>
                <Input
                  id="staff-login-id"
                  type="text"
                  required
                  value={loginId}
                  onChange={(e) => setLoginId(e.target.value)}
                  autoComplete="username"
                  placeholder="Email or username"
                  className={fieldInputClass}
                />
                <User
                  className="pointer-events-none absolute right-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#5a7a80]/45"
                  aria-hidden
                />
              </motion.div>
            </div>

            <motion.div
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2, duration: 0.35 }}
            >
              <Label htmlFor="staff-password" className={fieldLabelClass}>
                <Lock className="h-3.5 w-3.5" />
                Password
              </Label>
              <motion.div className="relative" whileFocus={{ scale: 1.01 }}>
                <Input
                  id="staff-password"
                  type={showPassword ? "text" : "password"}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
                  placeholder="Enter your password"
                  className={cn(fieldInputClass, "pr-12")}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 rounded-md p-1 text-[#5a7a80]/60 transition hover:text-[#0a4a52]"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </motion.div>
            </motion.div>

            <div className="flex items-center justify-between gap-3 pt-0.5">
              <label className="flex cursor-pointer items-center gap-2 text-sm text-[#5a7a80]">
                <Checkbox
                  checked={remember}
                  onCheckedChange={(v) => {
                    const next = v === true;
                    setRemember(next);
                    persistRemember(next, loginId);
                  }}
                  className="border-[#00a8b5] data-[state=checked]:bg-[#00a8b5] data-[state=checked]:text-white"
                />
                Remember me
              </label>
              <button
                type="button"
                onClick={() => void onForgotPassword()}
                className="text-sm font-semibold text-[#00a8b5] transition hover:text-[#0a4a52]"
              >
                Forgot password?
              </button>
            </div>

            <motion.button
              type="submit"
              disabled={loading || passkeyLoading}
              whileHover={{ scale: loading || passkeyLoading ? 1 : 1.01 }}
              whileTap={{ scale: loading || passkeyLoading ? 1 : 0.99 }}
              className="group flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#00a8b5] font-semibold text-white shadow-[0_10px_28px_rgba(0,168,181,0.35)] transition hover:brightness-[1.04] disabled:opacity-55"
            >
              <span>{loading ? "Signing in…" : "Sign in"}</span>
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
            </motion.button>

            {showPasskeySignIn && (
              <button
                type="button"
                disabled={passkeyLoading || loading}
                onClick={onPasskeySignIn}
                className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl border-2 border-[#00a8b5] bg-white font-semibold text-[#00a8b5] transition hover:bg-[#00a8b5]/8 disabled:opacity-50"
              >
                <Fingerprint className="h-5 w-5" />
                {passkeyLoading ? "Waiting for device…" : "Sign in with passkey"}
              </button>
            )}
          </motion.div>
        </form>

        <p className="mt-6 text-center text-sm text-[#5a7a80]">
          Need help?{" "}
          <Link href="/#footer" className="font-semibold text-[#00a8b5] transition hover:text-[#0a4a52]">
            Contact support
          </Link>
        </p>
      </motion.div>

      {enrollUserId && (
        <PasskeyEnrollDialog
          open
          userId={enrollUserId}
          onComplete={() => {
            setEnrollUserId(null);
            router.push(nextPath || pendingRedirect);
          }}
        />
      )}
    </LoginBeachLayout>
  );
}

/** @deprecated Legacy export — use StaffLogin */
export const RoleLogin = StaffLogin;
