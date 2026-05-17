import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { ZodError } from "zod";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Turn server-action / Zod failures into a short message for toasts. */
export function formatActionError(error: unknown): string {
  if (error instanceof ZodError) {
    return error.errors.map((e) => e.message).join(". ");
  }
  if (error instanceof Error) {
    const msg = error.message.trim();
    if (msg.startsWith("[")) {
      try {
        const parsed = JSON.parse(msg) as { message?: string }[];
        if (Array.isArray(parsed)) {
          return parsed.map((i) => i.message).filter(Boolean).join(". ");
        }
      } catch {
        /* not JSON */
      }
    }
    return msg || "Something went wrong";
  }
  return "Something went wrong";
}
