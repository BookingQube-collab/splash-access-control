"use client";

export function AdminSettingsActionBtn({
  label,
  onClick,
  loading,
  primary,
  disabled,
}: {
  label: string;
  onClick: () => void;
  loading?: boolean;
  primary?: boolean;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      disabled={loading || disabled}
      onClick={onClick}
      className={
        primary
          ? "rounded-[14px] bg-[#0f766e] px-4 py-2 text-sm font-semibold text-white shadow-sm disabled:opacity-60"
          : "rounded-[14px] border border-[#e2e8f0] bg-white px-4 py-2 text-sm font-semibold text-[#134e4a] disabled:opacity-60 hover:border-[#cbd5e1]"
      }
    >
      {loading ? "Saving…" : label}
    </button>
  );
}
