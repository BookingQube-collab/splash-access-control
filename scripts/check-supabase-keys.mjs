import fs from "node:fs";

function parseEnv(content) {
  const map = {};
  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const eq = line.indexOf("=");
    if (eq <= 0) continue;
    const key = line.slice(0, eq).trim();
    let value = line.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    map[key] = value;
  }
  return map;
}

function load(name) {
  try {
    return parseEnv(fs.readFileSync(name, "utf8"));
  } catch {
    return {};
  }
}

function describeKey(name, value) {
  if (!value) return `${name}: (missing)`;
  let kind = "unknown — may be invalid";
  if (value.startsWith("eyJ")) {
    kind =
      name === "SERVICE_ROLE"
        ? "legacy JWT (ok if role=service_role and project ref matches URL)"
        : "legacy JWT";
  } else if (value.startsWith("sb_secret_")) kind = "new secret key";
  else if (value.startsWith("sb_publishable_")) {
    kind =
      name === "PUBLISHABLE"
        ? "publishable key (correct for anon/client)"
        : "WRONG — publishable key, not service role";
  } else if (value.startsWith("sbp_")) kind = "WRONG — personal access token, not project API key";
  return `${name}: len=${value.length} prefix=${value.slice(0, 14)}… → ${kind}`;
}

const env = { ...load(".env"), ...load(".env.local") };
console.log(describeKey("SERVICE_ROLE", env.SUPABASE_SERVICE_ROLE_KEY));
console.log(describeKey("PUBLISHABLE", env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY));
console.log("URL:", (env.NEXT_PUBLIC_SUPABASE_URL || env.SUPABASE_URL || "(missing)").slice(0, 50));

function jwtClaims(token) {
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  try {
    return JSON.parse(Buffer.from(parts[1], "base64url").toString());
  } catch {
    return null;
  }
}

const url = env.NEXT_PUBLIC_SUPABASE_URL || env.SUPABASE_URL;
const projectRef = url?.match(/https:\/\/([^.]+)\.supabase\.co/)?.[1];
const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY;
const publishable = env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

if (serviceKey?.startsWith("eyJ")) {
  const claims = jwtClaims(serviceKey);
  if (claims) {
    console.log("Service JWT role:", claims.role ?? "(missing)");
    console.log("Service JWT ref:", claims.ref ?? "(missing)");
    if (projectRef && claims.ref && claims.ref !== projectRef) {
      console.log("MISMATCH: key is for project", claims.ref, "but URL is", projectRef);
    }
    if (claims.role && claims.role !== "service_role") {
      console.log("WRONG ROLE: expected service_role, got", claims.role, "(you may have pasted the anon key)");
    }
  }
}

async function probe(label, key) {
  if (!url || !key) return;
  const base = url.replace(/\/$/, "");
  const res = await fetch(`${base}/auth/v1/health`, {
    headers: { apikey: key, Authorization: `Bearer ${key}` },
  });
  console.log(`${label} health:`, res.status, res.status === 200 ? "OK" : "FAILED");
}

await probe("Service role", serviceKey);
await probe("Publishable", publishable);
