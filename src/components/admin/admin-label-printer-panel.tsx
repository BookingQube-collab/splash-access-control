"use client";

import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { Printer } from "lucide-react";
import { AdminPanel } from "@/components/admin/admin-panel";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  adminGetPrinterSettings,
  adminListLabelTemplates,
  adminSaveLabelTemplate,
  adminSavePrinterSettings,
  adminSetDefaultLabelTemplate,
  adminTestLabelPrint,
} from "@/lib/label-print.functions";
import { LabelTemplateVisualPreview } from "@/components/admin/label-template-visual-preview";
import { LABEL_PRESET_META } from "@/lib/zebra/presets";
import { SAMPLE_LABEL_DATA } from "@/lib/zebra/sample-label-data";
import { buildEntryPassZpl } from "@/lib/zebra/zpl-builder";
import { LABEL_PLACEHOLDERS, type LabelLayoutOptions, type PrinterSettings } from "@/lib/zebra/types";
import { formatActionError, cn } from "@/lib/utils";
import { printEntryPassLabel, fetchLabelPrintBundle } from "@/lib/zebra/print-entry-pass";

export function AdminLabelPrinterPanel({ embedded = false }: { embedded?: boolean }) {
  const { data, refetch } = useQuery({
    queryKey: ["label-templates"],
    queryFn: async () => ({
      ...(await adminListLabelTemplates()),
      ...(await adminGetPrinterSettings()),
    }),
  });

  const templates = data?.templates ?? [];
  const [printer, setPrinter] = useState<PrinterSettings | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [presetKey, setPresetKey] = useState("classic");
  const [layout, setLayout] = useState<LabelLayoutOptions>({});
  const [zplCustom, setZplCustom] = useState("");
  const [useCustomZpl, setUseCustomZpl] = useState(false);
  const [busy, setBusy] = useState(false);
  const [synced, setSynced] = useState(false);

  const selected = useMemo(
    () => templates.find((t) => t.id === selectedId) ?? templates[0] ?? null,
    [templates, selectedId],
  );

  useEffect(() => {
    if (!synced && data?.printer) {
      setPrinter(data.printer);
      if (templates[0]) setSelectedId(templates[0].id);
      setSynced(true);
    }
  }, [data, synced, templates]);

  useEffect(() => {
    if (!selected) return;
    setName(selected.name);
    setPresetKey(selected.preset_key);
    setLayout(selected.layout_json ?? {});
    setZplCustom(selected.zpl_template ?? "");
    setUseCustomZpl(!!selected.zpl_template?.trim());
  }, [selected?.id]);

  const previewZpl = useMemo(() => {
    if (!printer) return "";
    return buildEntryPassZpl(
      SAMPLE_LABEL_DATA,
      {
        preset_key: presetKey,
        layout_json: layout,
        zpl_template: useCustomZpl && zplCustom.trim() ? zplCustom : null,
      },
      printer,
    );
  }, [presetKey, layout, zplCustom, useCustomZpl, printer]);

  const savePrinter = async () => {
    if (!printer) return;
    setBusy(true);
    try {
      await adminSavePrinterSettings(printer);
      toast.success("Printer settings saved");
      await refetch();
    } catch (e: unknown) {
      toast.error(formatActionError(e));
    } finally {
      setBusy(false);
    }
  };

  const saveTemplate = async (asDefault?: boolean) => {
    setBusy(true);
    try {
      await adminSaveLabelTemplate({
        id: selected?.id,
        name,
        preset_key: presetKey,
        layout_json: layout,
        zpl_template: useCustomZpl ? zplCustom : null,
        is_default: asDefault,
      });
      toast.success(asDefault ? "Template saved as default" : "Template saved");
      await refetch();
    } catch (e: unknown) {
      toast.error(formatActionError(e));
    } finally {
      setBusy(false);
    }
  };

  const applyPreset = (key: string) => {
    const meta = LABEL_PRESET_META.find((p) => p.key === key);
    if (!meta) return;
    setPresetKey(key);
    setLayout({ ...meta.defaultLayout });
    setUseCustomZpl(false);
    setZplCustom("");
  };

  const testPrint = async () => {
    setBusy(true);
    try {
      const res = await adminTestLabelPrint({
        preset_key: presetKey,
        layout_json: layout,
        zpl_template: useCustomZpl ? zplCustom : null,
      });
      if (res.method === "network") {
        toast.success("Test label sent to network printer");
        return;
      }
      const bundle = await fetchLabelPrintBundle();
      if (!bundle?.template) throw new Error("No template");
      const printRes = await printEntryPassLabel(
        {
          customer_name: "Test Guest",
          mobile: "+974 5000 0000",
          slot_name: "Test Slot",
          slot_starts_at: new Date().toISOString(),
          guest_count: 1,
          qr_token: "00000000-0000-4000-8000-000000000001",
          registration_id: "00000000-0000-4000-8000-000000000099",
          event_name: "Summer Splash",
        },
        {
          ...bundle,
          template: {
            ...bundle.template,
            preset_key: presetKey,
            layout_json: layout,
            zpl_template: useCustomZpl ? zplCustom : null,
          },
        },
      );
      if (printRes.ok) toast.success("Test label sent to printer");
      else toast.message(printRes.message);
    } catch (e: unknown) {
      toast.error(formatActionError(e));
    } finally {
      setBusy(false);
    }
  };

  if (!printer) return null;

  const body = (
      <div className="space-y-8">
        <div className="max-w-2xl space-y-4">
          <div className="flex items-center justify-between rounded-2xl border border-[#e8e4dc] bg-[#faf8f4] p-4">
            <div>
              <p className="font-medium text-[#0a4a52]">Enable Zebra label printing</p>
              <p className="text-xs text-muted-foreground">
                Registration and POS can print entry pass labels when enabled.
              </p>
            </div>
            <Switch
              checked={printer.enabled}
              onCheckedChange={(v) => setPrinter({ ...printer, enabled: v })}
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label className="mb-1.5 block text-xs uppercase tracking-wider text-muted-foreground">
                Connection
              </Label>
              <select
                value={printer.connection}
                onChange={(e) =>
                  setPrinter({
                    ...printer,
                    connection: e.target.value as PrinterSettings["connection"],
                  })
                }
                className="h-11 w-full rounded-xl border-0 bg-foreground/5 px-3 text-sm"
              >
                <option value="browser_print">Zebra Browser Print (USB / local)</option>
                <option value="network">Network (IP :9100)</option>
              </select>
            </div>
            {printer.connection === "network" && (
              <>
                <div>
                  <Label className="mb-1.5 block text-xs uppercase tracking-wider text-muted-foreground">
                    Printer IP / host
                  </Label>
                  <Input
                    value={printer.network_host}
                    onChange={(e) => setPrinter({ ...printer, network_host: e.target.value })}
                    placeholder="192.168.1.50"
                    className="h-11 border-0 bg-foreground/5"
                  />
                </div>
                <div>
                  <Label className="mb-1.5 block text-xs uppercase tracking-wider text-muted-foreground">
                    Port
                  </Label>
                  <Input
                    type="number"
                    value={printer.network_port}
                    onChange={(e) =>
                      setPrinter({ ...printer, network_port: Number(e.target.value) || 9100 })
                    }
                    className="h-11 border-0 bg-foreground/5"
                  />
                </div>
              </>
            )}
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <div>
              <Label className="mb-1.5 block text-xs uppercase tracking-wider text-muted-foreground">
                Label width (in)
              </Label>
              <Input
                type="number"
                step="0.5"
                value={printer.label_width_in}
                onChange={(e) =>
                  setPrinter({ ...printer, label_width_in: Number(e.target.value) || 4 })
                }
                className="h-11 border-0 bg-foreground/5"
              />
            </div>
            <div>
              <Label className="mb-1.5 block text-xs uppercase tracking-wider text-muted-foreground">
                Label height (in)
              </Label>
              <Input
                type="number"
                step="0.5"
                value={printer.label_height_in}
                onChange={(e) =>
                  setPrinter({ ...printer, label_height_in: Number(e.target.value) || 2 })
                }
                className="h-11 border-0 bg-foreground/5"
              />
            </div>
            <div>
              <Label className="mb-1.5 block text-xs uppercase tracking-wider text-muted-foreground">
                DPI
              </Label>
              <select
                value={printer.dpi}
                onChange={(e) =>
                  setPrinter({ ...printer, dpi: Number(e.target.value) as 203 | 300 })
                }
                className="h-11 w-full rounded-xl border-0 bg-foreground/5 px-3 text-sm"
              >
                <option value={203}>203</option>
                <option value={300}>300</option>
              </select>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled={busy}
              onClick={savePrinter}
              className="rounded-xl bg-[#0a4a52] px-4 py-2 text-sm font-semibold text-white"
            >
              Save printer settings
            </button>
            <button
              type="button"
              disabled={busy || !printer.enabled}
              onClick={testPrint}
              className="rounded-xl border border-[#0a4a52]/30 px-4 py-2 text-sm font-semibold text-[#0a4a52]"
            >
              Test print
            </button>
          </div>
        </div>

        <div className="border-t border-[#e8e4dc] pt-8">
          <h3 className="font-display text-lg font-bold text-[#0a4a52]">Label templates</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Choose a preset, customize visible fields, or edit raw ZPL for advanced layouts.
          </p>

          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {LABEL_PRESET_META.map((p) => (
              <button
                key={p.key}
                type="button"
                onClick={() => applyPreset(p.key)}
                className={cn(
                  "rounded-2xl border p-4 text-left transition",
                  presetKey === p.key
                    ? "border-[#0a4a52] bg-[#0a4a52]/5 ring-1 ring-[#0a4a52]/30"
                    : "border-[#e8e4dc] bg-white hover:border-[#0a4a52]/40",
                )}
              >
                <div className="font-semibold text-[#0a4a52]">{p.name}</div>
                <p className="mt-1 text-xs text-muted-foreground">{p.description}</p>
              </button>
            ))}
          </div>

          {templates.length > 0 && (
            <div className="mt-4 flex flex-wrap gap-2">
              {templates.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setSelectedId(t.id)}
                  className={cn(
                    "rounded-full px-3 py-1 text-xs font-semibold",
                    selectedId === t.id
                      ? "bg-[#0a4a52] text-white"
                      : "bg-foreground/10 text-foreground",
                  )}
                >
                  {t.name}
                  {t.is_default ? " · default" : ""}
                </button>
              ))}
            </div>
          )}

          <div className="mt-6 grid gap-6 lg:grid-cols-2">
            <div className="space-y-4">
              <div>
                <Label className="mb-1.5 block text-xs uppercase tracking-wider text-muted-foreground">
                  Template name
                </Label>
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="h-11 border-0 bg-foreground/5"
                />
              </div>

              <div className="space-y-2 rounded-2xl border border-[#e8e4dc] bg-[#faf8f4] p-4">
                <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Visible fields
                </p>
                {(
                  [
                    ["show_mobile", "Mobile"],
                    ["show_slot", "Slot name"],
                    ["show_date", "Date"],
                    ["show_time", "Time"],
                    ["show_guests", "Guest count"],
                    ["show_booking_ref", "Booking ref"],
                    ["show_event_name", "Event name"],
                    ["receipt_tall", "Taller receipt label (6 in)"],
                  ] as const
                ).map(([key, label]) => (
                  <label key={key} className="flex items-center justify-between gap-2 text-sm">
                    <span>{label}</span>
                    <Switch
                      checked={!!layout[key]}
                      onCheckedChange={(v) => setLayout({ ...layout, [key]: v })}
                    />
                  </label>
                ))}
                <div>
                  <Label className="mb-1 block text-xs text-muted-foreground">Font size</Label>
                  <select
                    value={layout.fontSize ?? "medium"}
                    onChange={(e) =>
                      setLayout({
                        ...layout,
                        fontSize: e.target.value as LabelLayoutOptions["fontSize"],
                      })
                    }
                    className="h-10 w-full rounded-lg border-0 bg-white px-2 text-sm"
                  >
                    <option value="small">Small</option>
                    <option value="medium">Medium</option>
                    <option value="large">Large</option>
                  </select>
                </div>
              </div>

              <label className="flex items-center gap-2 text-sm">
                <Switch checked={useCustomZpl} onCheckedChange={setUseCustomZpl} />
                Advanced: custom ZPL template
              </label>
              {useCustomZpl && (
                <div>
                  <p className="mb-1 text-xs text-muted-foreground">
                    Placeholders: {LABEL_PLACEHOLDERS.join(", ")}
                  </p>
                  <textarea
                    value={zplCustom}
                    onChange={(e) => setZplCustom(e.target.value)}
                    rows={8}
                    className="w-full rounded-xl border border-[#e8e4dc] bg-white p-3 font-mono text-xs"
                    placeholder="^XA ... ^XZ"
                  />
                </div>
              )}

              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => saveTemplate(false)}
                  className="rounded-xl bg-[#0a4a52] px-4 py-2 text-sm font-semibold text-white"
                >
                  Save template
                </button>
                <button
                  type="button"
                  disabled={busy || !selected}
                  onClick={() => saveTemplate(true)}
                  className="rounded-xl border border-[#0a4a52]/30 px-4 py-2 text-sm font-semibold text-[#0a4a52]"
                >
                  Set as default
                </button>
                {selected && !selected.is_default && (
                  <button
                    type="button"
                    disabled={busy}
                    onClick={async () => {
                      await adminSetDefaultLabelTemplate({ id: selected.id });
                      toast.success("Default template updated");
                      refetch();
                    }}
                    className="text-sm font-semibold text-[#0a4a52] underline"
                  >
                    Mark default only
                  </button>
                )}
              </div>
            </div>

            <div className="rounded-2xl border border-[#e8e4dc] bg-[#faf8f4] p-5">
              <p className="mb-3 text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Preview
              </p>
              <LabelTemplateVisualPreview presetKey={presetKey} layout={layout} />
              <pre className="mt-4 max-h-40 overflow-auto rounded-lg bg-black/5 p-2 text-[9px] leading-tight text-muted-foreground">
                {previewZpl.slice(0, 600)}
                {previewZpl.length > 600 ? "…" : ""}
              </pre>
            </div>
          </div>
        </div>
      </div>
  );

  if (embedded) return body;

  return (
    <AdminPanel title="Label printer" action={<Printer className="h-5 w-5 text-[#0a4a52]/60" />}>
      {body}
    </AdminPanel>
  );
}
