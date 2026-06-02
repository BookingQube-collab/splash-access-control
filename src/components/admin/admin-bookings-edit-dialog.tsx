"use client";

import { useEffect, useState } from "react";
import { ADMIN_TEAL } from "@/components/admin/admin-theme";
import type { AdminRegistrationRow } from "@/lib/admin-filter-utils";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SearchableSelect, type SelectOption } from "@/components/searchable-select";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { REGISTRATION_STATUS_OPTIONS } from "@/lib/admin-filters.types";

const pillInput =
  "h-11 w-full rounded-[14px] border border-[#e2e8f0] bg-white px-3.5 text-sm font-medium text-[#134e4a] shadow-sm outline-none transition placeholder:text-[#94a3b8] hover:border-[#cbd5e1] focus:border-[#0d9488] focus:ring-2 focus:ring-[#0d9488]/15";

export type BookingEditForm = {
  customer_name: string;
  mobile: string;
  email: string;
  guest_count: number;
  slot_id: string;
  status: string;
  booking_date: string;
};

export function registrationToEditForm(row: AdminRegistrationRow): BookingEditForm {
  return {
    customer_name: row.customer_name,
    mobile: row.mobile,
    email: row.email ?? "",
    guest_count: row.guest_count,
    slot_id: row.slot_id ?? row.slots?.id ?? "",
    status: row.status,
    booking_date: row.created_at.slice(0, 10),
  };
}

export function AdminBookingsEditDialog({
  row,
  slotOptions,
  statusOptions,
  saving,
  onClose,
  onSave,
}: {
  row: AdminRegistrationRow | null;
  slotOptions: SelectOption[];
  statusOptions: SelectOption[];
  saving: boolean;
  onClose: () => void;
  onSave: (form: BookingEditForm) => void | Promise<void>;
}) {
  const [form, setForm] = useState<BookingEditForm | null>(null);

  useEffect(() => {
    if (row) setForm(registrationToEditForm(row));
    else setForm(null);
  }, [row]);

  const patch = (patch: Partial<BookingEditForm>) => {
    setForm((f) => (f ? { ...f, ...patch } : f));
  };

  return (
    <Dialog open={!!row} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[90vh] max-w-lg overflow-y-auto rounded-[20px]">
        {row && form ? (
          <>
            <DialogHeader>
              <DialogTitle className="font-display text-xl text-[#134e4a]">
                Edit registration
              </DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 py-2">
              <div>
                <Label className="mb-1.5 block text-xs font-semibold text-[#64748b]">
                  Name
                </Label>
                <Input
                  value={form.customer_name}
                  onChange={(e) => patch({ customer_name: e.target.value })}
                  className={pillInput}
                />
              </div>
              <div>
                <Label className="mb-1.5 block text-xs font-semibold text-[#64748b]">
                  Mobile
                </Label>
                <Input
                  value={form.mobile}
                  onChange={(e) => patch({ mobile: e.target.value })}
                  className={pillInput}
                />
              </div>
              <div>
                <Label className="mb-1.5 block text-xs font-semibold text-[#64748b]">
                  Email
                </Label>
                <Input
                  type="email"
                  value={form.email}
                  onChange={(e) => patch({ email: e.target.value })}
                  placeholder="Optional"
                  className={pillInput}
                />
              </div>
              <div>
                <Label className="mb-1.5 block text-xs font-semibold text-[#64748b]">
                  Guests
                </Label>
                <Input
                  type="number"
                  min={1}
                  max={20}
                  value={form.guest_count}
                  onChange={(e) =>
                    patch({ guest_count: Math.max(1, parseInt(e.target.value, 10) || 1) })
                  }
                  className={pillInput}
                />
              </div>
              <div>
                <Label className="mb-1.5 block text-xs font-semibold text-[#64748b]">
                  Booking date
                </Label>
                <Input
                  type="date"
                  value={form.booking_date}
                  onChange={(e) => patch({ booking_date: e.target.value })}
                  className={pillInput}
                />
              </div>
              <div>
                <Label className="mb-1.5 block text-xs font-semibold text-[#64748b]">
                  Slot
                </Label>
                <SearchableSelect
                  value={form.slot_id}
                  onChange={(v) => patch({ slot_id: v })}
                  options={slotOptions}
                  placeholder="Select slot"
                  className="h-11 w-full rounded-[14px] border border-[#e2e8f0] bg-white text-sm font-medium text-[#134e4a] shadow-sm"
                />
              </div>
              <div>
                <Label className="mb-1.5 block text-xs font-semibold text-[#64748b]">
                  Status
                </Label>
                <SearchableSelect
                  value={form.status}
                  onChange={(v) => patch({ status: v })}
                  options={
                    statusOptions.length > 0
                      ? statusOptions
                      : REGISTRATION_STATUS_OPTIONS.map((o) => ({
                          value: o.value,
                          label: o.label,
                        }))
                  }
                  searchable={false}
                  className="h-11 w-full rounded-[14px] border border-[#e2e8f0] bg-white text-sm font-medium text-[#134e4a] shadow-sm"
                />
              </div>
            </div>
            <DialogFooter className="gap-2 sm:gap-2">
              <button
                type="button"
                onClick={onClose}
                disabled={saving}
                className="inline-flex h-10 items-center justify-center rounded-[12px] border border-[#e2e8f0] bg-white px-4 text-sm font-semibold text-[#334155] disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={saving || !form.slot_id}
                onClick={() => void onSave(form)}
                className="inline-flex h-10 items-center justify-center rounded-[12px] px-5 text-sm font-semibold text-white shadow-sm disabled:opacity-50"
                style={{ background: ADMIN_TEAL }}
              >
                {saving ? "Saving…" : "Save changes"}
              </button>
            </DialogFooter>
          </>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
