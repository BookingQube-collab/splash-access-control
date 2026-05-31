import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import {
  canAccessPosModule,
  canAccessScannerModule,
  resolveStaffRedirect,
  UNIFIED_LOGIN_PATH,
  userHasRoleAccess,
  type AppRole,
} from "@/lib/staff-auth";

type StaffRoute = { prefix: string; role: AppRole };

const STAFF_ROUTES: StaffRoute[] = [
  { prefix: "/admin", role: "admin" },
  { prefix: "/dashboard", role: "dashboard" },
  { prefix: "/pos", role: "pos" },
  { prefix: "/scanner", role: "scanner" },
];

function matchStaffRoute(pathname: string): StaffRoute | null {
  for (const route of STAFF_ROUTES) {
    if (pathname === route.prefix || pathname.startsWith(`${route.prefix}/`)) {
      return route;
    }
  }
  return null;
}

function hasStaffRouteAccess(roles: AppRole[], route: StaffRoute): boolean {
  if (route.role === "pos") return canAccessPosModule(roles);
  if (route.role === "scanner") return canAccessScannerModule(roles);
  return userHasRoleAccess(roles, route.role);
}

async function fetchUserRoles(
  supabase: ReturnType<typeof createServerClient>,
  userId: string,
): Promise<AppRole[]> {
  const { data } = await supabase.from("user_roles").select("role").eq("user_id", userId);
  return ((data ?? []) as { role: AppRole }[]).map((row) => row.role);
}

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });
  const pathname = request.nextUrl.pathname;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL;
  const key =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? process.env.SUPABASE_PUBLISHABLE_KEY;

  if (!url || !key) {
    return supabaseResponse;
  }

  const supabase = createServerClient(url, key, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        supabaseResponse = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) =>
          supabaseResponse.cookies.set(name, value, options),
        );
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (pathname.startsWith("/login/") && pathname !== UNIFIED_LOGIN_PATH) {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = UNIFIED_LOGIN_PATH;
    return NextResponse.redirect(loginUrl);
  }

  const staffRoute = matchStaffRoute(pathname);

  if (staffRoute) {
    if (!user) {
      const loginUrl = request.nextUrl.clone();
      loginUrl.pathname = UNIFIED_LOGIN_PATH;
      loginUrl.searchParams.set("next", pathname);
      return NextResponse.redirect(loginUrl);
    }

    const roles = await fetchUserRoles(supabase, user.id);
    if (!hasStaffRouteAccess(roles, staffRoute)) {
      const loginUrl = request.nextUrl.clone();
      loginUrl.pathname = UNIFIED_LOGIN_PATH;
      loginUrl.searchParams.set("error", "access_denied");
      return NextResponse.redirect(loginUrl);
    }
  }

  if (pathname === UNIFIED_LOGIN_PATH && user) {
    const roles = await fetchUserRoles(supabase, user.id);
    const redirectTo = resolveStaffRedirect(roles);
    if (redirectTo) {
      const next = request.nextUrl.searchParams.get("next");
      const target = request.nextUrl.clone();
      target.pathname = next && next.startsWith("/") ? next : redirectTo;
      target.search = "";
      return NextResponse.redirect(target);
    }
  }

  return supabaseResponse;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
