"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Waves, ArrowLeft, Mail, Lock, ChevronRight } from "lucide-react";
import { toast } from "sonner";
import type { AppRole } from "@/hooks/use-auth";
import { BeachBg } from "@/components/beach-bg";

interface RoleLoginProps {
  role: AppRole;
  title: string;
  subtitle: string;
  redirectTo: string;
}

export function RoleLogin({ role, title, subtitle, redirectTo }: RoleLoginProps) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error || !data.user) {
      setLoading(false);
      toast.error(error?.message || "Login failed");
      return;
    }
    const { data: rolesData } = await supabase.from("user_roles").select("role").eq("user_id", data.user.id);
    const roles = ((rolesData ?? []) as { role: AppRole }[]).map((r) => r.role);
    if (!roles.includes(role) && !roles.includes("admin")) {
      await supabase.auth.signOut();
      setLoading(false);
      toast.error(`This account doesn't have ${role} access.`);
      return;
    }
    toast.success("Signed in");
    router.push(redirectTo);
  };

  return (
    <div className="relative grid min-h-screen place-items-center px-4">
      <BeachBg variant="aurora" />

      <Link href="/" className="absolute left-6 top-6 z-10 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> Home
      </Link>

      <motion.div
        initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}
        className="relative z-10 w-full max-w-md"
      >
        <div className="absolute -inset-6 -z-10 rounded-[2rem] bg-aurora opacity-40 blur-3xl" />
        <div className="overflow-hidden rounded-3xl glass-strong p-8 shadow-soft">
          <div className="mb-6 text-center">
            <div className="mx-auto inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-ocean shadow-glow-aqua">
              <Waves className="h-6 w-6 text-primary-foreground" />
            </div>
            <h1 className="mt-4 font-display text-2xl font-bold">{title}</h1>
            <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>
          </div>

          <form onSubmit={onSubmit} className="space-y-4">
            <div>
              <Label className="mb-1.5 flex items-center gap-1.5 text-xs uppercase tracking-wider text-muted-foreground">
                <Mail className="h-3.5 w-3.5" /> Email
              </Label>
              <Input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email"
                className="h-12 border-0 bg-foreground/5 text-base" />
            </div>
            <div>
              <Label className="mb-1.5 flex items-center gap-1.5 text-xs uppercase tracking-wider text-muted-foreground">
                <Lock className="h-3.5 w-3.5" /> Password
              </Label>
              <Input type="password" required value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password"
                className="h-12 border-0 bg-foreground/5 text-base" />
            </div>
            <button type="submit" disabled={loading}
              className="group relative inline-flex h-12 w-full items-center justify-center gap-2 overflow-hidden rounded-xl bg-sunset font-semibold text-foreground shadow-glow-sunset disabled:opacity-50">
              <span>{loading ? "Signing in…" : "Sign in"}</span>
              <ChevronRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
              <span className="absolute inset-0 animate-shimmer opacity-50" />
            </button>
          </form>
        </div>
      </motion.div>
    </div>
  );
}
