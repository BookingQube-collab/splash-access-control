/** Shared route-level loading placeholder (App Router `loading.tsx`). */
export function RouteLoadingSpinner({ label }: { label?: string }) {
  return (
    <div className="grid min-h-screen place-items-center bg-[#faf8f4] px-6">
      <div className="flex flex-col items-center gap-3">
        <div
          className="h-11 w-11 animate-spin rounded-full border-2 border-[#00A9BC]/30 border-t-[#00A9BC]"
          role="status"
          aria-label={label ?? "Loading"}
        />
        {label ? <p className="text-sm text-[#102A43]/60">{label}</p> : null}
      </div>
    </div>
  );
}
