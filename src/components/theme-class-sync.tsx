"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";

/** Admin uses light cream cards; dashboard uses dark staff chrome. */
const STAFF_PREFIX = /^\/dashboard(\/|$)/;

/** Applies `theme-staff` on `<html>` for dashboard; `/pos` and `/scanner` use light beach chrome. */
export function ThemeClassSync() {
  const pathname = usePathname();

  useEffect(() => {
    const staff = STAFF_PREFIX.test(pathname ?? "");
    document.documentElement.classList.toggle("theme-staff", staff);
    return () => {
      document.documentElement.classList.remove("theme-staff");
    };
  }, [pathname]);

  return null;
}
