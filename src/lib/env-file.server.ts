import "server-only";

import fs from "fs/promises";
import path from "path";
import { getSupabaseServiceRoleConfigError } from "@/lib/supabase-service-role";

/** Env keys the app reads for Supabase (see integrations/supabase, middleware). */
export const SUPABASE_ENV_KEYS = [
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
  "SUPABASE_URL",
  "SUPABASE_PUBLISHABLE_KEY",
  "SUPABASE_SERVICE_ROLE_KEY",
] as const;

export type SupabaseEnvKey = (typeof SUPABASE_ENV_KEYS)[number];

const MANAGED_KEYS = new Set<string>(SUPABASE_ENV_KEYS);

function projectRoot() {
  return process.cwd();
}

function envPath(name: ".env" | ".env.local") {
  return path.join(projectRoot(), name);
}

function unquote(value: string): string {
  const v = value.trim();
  if (
    (v.startsWith('"') && v.endsWith('"')) ||
    (v.startsWith("'") && v.endsWith("'"))
  ) {
    return v.slice(1, -1);
  }
  return v;
}

function quoteEnvValue(value: string): string {
  if (/[\s#"'\\]/.test(value)) {
    return `"${value.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`;
  }
  return value;
}

export function parseEnvContent(content: string): Map<string, string> {
  const map = new Map<string, string>();
  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const eq = line.indexOf("=");
    if (eq <= 0) continue;
    const key = line.slice(0, eq).trim();
    const value = unquote(line.slice(eq + 1));
    map.set(key, value);
  }
  return map;
}

async function readEnvFile(name: ".env" | ".env.local"): Promise<Map<string, string>> {
  try {
    const content = await fs.readFile(envPath(name), "utf8");
    return parseEnvContent(content);
  } catch (e: unknown) {
    if (e && typeof e === "object" && "code" in e && (e as NodeJS.ErrnoException).code === "ENOENT") {
      return new Map();
    }
    throw e;
  }
}

/** Merged values: `.env.local` overrides `.env`, then `process.env` fills gaps. */
export async function readMergedSupabaseEnv(): Promise<Map<string, string>> {
  const merged = new Map<string, string>();
  for (const [k, v] of await readEnvFile(".env")) {
    if (MANAGED_KEYS.has(k) && v) merged.set(k, v);
  }
  for (const [k, v] of await readEnvFile(".env.local")) {
    if (MANAGED_KEYS.has(k) && v) merged.set(k, v);
  }
  for (const key of SUPABASE_ENV_KEYS) {
    if (!merged.has(key)) {
      const fromProcess = process.env[key]?.trim();
      if (fromProcess) merged.set(key, fromProcess);
    }
  }
  return merged;
}

export function maskSecret(value: string, visibleTail = 4): string | null {
  if (!value) return null;
  if (value.length <= visibleTail) return "••••";
  return `••••${value.slice(-visibleTail)}`;
}

export type SupabaseEnvForm = {
  supabaseUrl: string;
  publishableKey: string;
  serviceRoleKey: string;
  serviceRoleConfigured: boolean;
  serviceRoleHint: string | null;
  hasEnvLocal: boolean;
  hasEnvFile: boolean;
};

export async function getSupabaseEnvForm(): Promise<SupabaseEnvForm> {
  const merged = await readMergedSupabaseEnv();
  const supabaseUrl =
    merged.get("NEXT_PUBLIC_SUPABASE_URL") ?? merged.get("SUPABASE_URL") ?? "";
  const publishableKey =
    merged.get("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY") ??
    merged.get("SUPABASE_PUBLISHABLE_KEY") ??
    "";
  const serviceRole = merged.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

  let hasEnvLocal = false;
  let hasEnvFile = false;
  try {
    await fs.access(envPath(".env.local"));
    hasEnvLocal = true;
  } catch {
    /* missing */
  }
  try {
    await fs.access(envPath(".env"));
    hasEnvFile = true;
  } catch {
    /* missing */
  }

  return {
    supabaseUrl,
    publishableKey,
    serviceRoleKey: "",
    serviceRoleConfigured: Boolean(serviceRole),
    serviceRoleHint: maskSecret(serviceRole),
    hasEnvLocal,
    hasEnvFile,
  };
}

export type SaveSupabaseEnvInput = {
  supabaseUrl: string;
  publishableKey: string;
  /** Empty = keep existing service role key in .env.local */
  serviceRoleKey?: string;
};

export type SaveSupabaseEnvResult = {
  ok: true;
  restartRequired: true;
  wroteEnvLocal: boolean;
};

export async function saveSupabaseEnvToLocal(input: SaveSupabaseEnvInput): Promise<SaveSupabaseEnvResult> {
  const url = input.supabaseUrl.trim();
  const publishable = input.publishableKey.trim();
  const serviceRoleInput = input.serviceRoleKey?.trim() ?? "";

  if (!url) throw new Error("Supabase project URL is required");
  if (!publishable) throw new Error("Publishable (anon) key is required");
  try {
    const parsed = new URL(url);
    if (!["http:", "https:"].includes(parsed.protocol)) {
      throw new Error("URL must start with http:// or https://");
    }
  } catch {
    throw new Error("Enter a valid Supabase project URL");
  }

  const existing = await readMergedSupabaseEnv();
  const serviceRole =
    serviceRoleInput ||
    existing.get("SUPABASE_SERVICE_ROLE_KEY") ||
    "";
  if (!serviceRole) {
    throw new Error("Service role key is required for admin user management");
  }

  const configError = getSupabaseServiceRoleConfigError({
    supabaseUrl: url,
    serviceRoleKey: serviceRole,
  });
  if (configError) throw new Error(configError);

  const updates: Record<string, string> = {
    NEXT_PUBLIC_SUPABASE_URL: url,
    SUPABASE_URL: url,
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: publishable,
    SUPABASE_PUBLISHABLE_KEY: publishable,
    SUPABASE_SERVICE_ROLE_KEY: serviceRole,
  };

  const localPath = envPath(".env.local");
  let localMap = await readEnvFile(".env.local");
  const baseMap = await readEnvFile(".env");

  for (const [k, v] of Object.entries(updates)) {
    localMap.set(k, v);
  }

  const preserved = new Map<string, string>();
  for (const [k, v] of baseMap) {
    if (!MANAGED_KEYS.has(k)) preserved.set(k, v);
  }
  for (const [k, v] of localMap) {
    if (!MANAGED_KEYS.has(k)) preserved.set(k, v);
  }

  const lines: string[] = [
    "# SummerSplash — Supabase (managed from Admin → Settings)",
    `# Updated ${new Date().toISOString()}`,
    "",
  ];
  for (const key of SUPABASE_ENV_KEYS) {
    const value = localMap.get(key) ?? updates[key as SupabaseEnvKey];
    if (value) lines.push(`${key}=${quoteEnvValue(value)}`);
  }
  if (preserved.size > 0) {
    lines.push("", "# Other local overrides");
    for (const [k, v] of preserved) {
      lines.push(`${k}=${quoteEnvValue(v)}`);
    }
  }
  lines.push("");

  try {
    await fs.writeFile(localPath, lines.join("\n"), "utf8");
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Failed to write .env.local";
    if (/EROFS|read-only|EPERM/i.test(msg)) {
      throw new Error(
        "Cannot write .env.local in this environment (e.g. production hosting). Set variables in your host dashboard instead.",
      );
    }
    throw new Error(msg);
  }

  return { ok: true, restartRequired: true, wroteEnvLocal: true };
}
