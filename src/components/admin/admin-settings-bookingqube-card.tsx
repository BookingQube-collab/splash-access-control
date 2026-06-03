"use client";

import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from "react";
import { useQuery } from "@tanstack/react-query";
import { Globe, KeyRound, Link2 } from "lucide-react";
import { toast } from "sonner";
import { SecretInput } from "@/components/secret-input";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { AdminSettingsActionBtn } from "@/components/admin/admin-settings-action-btn";
import {
  AdminSettingsBadge,
  AdminSettingsSection,
  adminSettingsFieldClass,
  adminSettingsLabelClass,
} from "@/components/admin/admin-settings-section";
import {
  adminCountAllRegistrations,
  adminCountUnsyncedRegistrations,
  adminFetchBookingQubeForm,
  adminGetBookingQubeBootstrapSql,
  adminGetBookingQubeFieldMappings,
  adminGetBookingQubeSettings,
  adminListBookingQubeSyncLogs,
  adminResyncAllRegistrations,
  adminSyncUnsyncedRegistrations,
  adminListEvents,
  adminSaveBookingQubeFieldMappings,
  adminSaveBookingQubeSettings,
  adminTestBookingQubeGet,
  adminTestBookingQubePost,
  adminUpsertBookingQubeEventMapping,
} from "@/lib/admin.functions";
import { BOOKINGQUBE_BOOTSTRAP_MIGRATION_FILE } from "@/lib/bookingqube.integration";
import {
  LOCAL_REGISTRATION_FIELD_LABELS,
  LOCAL_REGISTRATION_FIELDS,
} from "@/lib/bookingqube.constants";
import {
  dedupeSchemaFieldsByLabel,
  formatBookingQubeFieldOption,
  formatFieldErrorLine,
  parseCachedFormSchemaMeta,
  parseBookingQubeSubmitErrors,
  refreshFieldMappingsFromFetchedSchema,
  schemaFieldOptionsFromFetch,
  schemaHasEventMetadata,
  slugifyEventName,
  urlTemplateNeedsFormContext,
  type BookingQubeFieldErrorDetail,
  type BookingQubeSchemaField,
} from "@/lib/bookingqube.mapping";

const BQ_ADMIN_SELECTED_EVENT_KEY = "bq-admin-selected-event";
import { formatActionError } from "@/lib/utils";

export type AdminSettingsBookingQubeCardHandle = {
  /** Runs Step 1 GET test (saved GET URL). */
  testConnection: () => Promise<void>;
  scrollToSyncLog: () => void;
};

function StepHeading({ step, title }: { step: number; title: string }) {
  return (
    <h3 className="mb-4 text-sm font-semibold text-[#134e4a]">
      <span className="text-[10px] font-bold uppercase tracking-wide text-[#64748b]">
        Step {step}
      </span>
      <span className="text-[#64748b]"> — </span>
      {title}
    </h3>
  );
}

type SyncLogRow = {
  id: string;
  direction: string;
  status: string;
  error: string | null;
  payload: unknown;
  created_at: string;
  registration_id: string | null;
};

function formatSyncLogPayload(value: unknown): string {
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
}

function formatSyncLogFieldErrors(
  fieldErrors: unknown,
  response: unknown,
): string[] {
  if (Array.isArray(fieldErrors) && fieldErrors.length > 0) {
    return (fieldErrors as BookingQubeFieldErrorDetail[]).map((d) =>
      formatFieldErrorLine(d.fieldKey, d.message),
    );
  }
  return parseBookingQubeSubmitErrors(response).map((d) =>
    formatFieldErrorLine(d.fieldKey, d.message),
  );
}

function syncLogStatusClass(status: string): string {
  if (status === "success") return "text-emerald-700";
  if (status === "skipped") return "text-amber-700";
  if (status === "error") return "text-red-600";
  return "text-[#334155]";
}

function BookingQubeSyncLogEntry({ log }: { log: SyncLogRow }) {
  const [open, setOpen] = useState(false);
  const payload =
    log.payload && typeof log.payload === "object" && !Array.isArray(log.payload)
      ? (log.payload as Record<string, unknown>)
      : null;
  const request = payload?.request;
  const apiErrors = payload?.apiErrors;
  const response = payload?.response;
  const fieldErrorLines = formatSyncLogFieldErrors(payload?.fieldErrors, response);
  const hasDetails = Boolean(request || apiErrors || response || log.error || fieldErrorLines.length);

  const messageClass =
    log.status === "skipped"
      ? "text-amber-800"
      : log.status === "error"
        ? "text-red-600"
        : "text-[#475569]";

  return (
    <li className="rounded-lg bg-[#f8fafc] px-3 py-2">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className={`font-medium ${syncLogStatusClass(log.status)}`}>
          {log.direction} · {log.status}
          {log.registration_id ? (
            <span className="ml-1 font-normal text-[#64748b]">
              · {log.registration_id.slice(0, 8)}…
            </span>
          ) : null}
        </span>
        <span className="text-[#94a3b8]">{new Date(log.created_at).toLocaleString()}</span>
        {hasDetails ? (
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            className="w-full text-left text-[11px] font-semibold text-[#0d9488] hover:underline"
          >
            {open ? "Hide request / errors" : "Show request / errors"}
          </button>
        ) : null}
      </div>
      {log.error ? (
        <p className={`mt-1 w-full font-medium ${messageClass}`}>{log.error}</p>
      ) : null}
      {fieldErrorLines.length > 0 ? (
        <ul className="mt-1.5 space-y-0.5">
          {fieldErrorLines.map((line) => (
            <li key={line} className="text-[11px] font-medium text-red-700">
              {line}
            </li>
          ))}
        </ul>
      ) : null}
      {open && hasDetails ? (
        <div className="mt-2 space-y-2 border-t border-[#e2e8f0] pt-2">
          {apiErrors ? (
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wide text-[#64748b]">
                API errors
              </p>
              <pre className="mt-1 max-h-32 overflow-auto whitespace-pre-wrap break-all rounded-md bg-white p-2 font-mono text-[10px] text-red-700">
                {typeof apiErrors === "string" ? apiErrors : formatSyncLogPayload(apiErrors)}
              </pre>
            </div>
          ) : null}
          {request ? (
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wide text-[#64748b]">
                Request JSON
              </p>
              <pre className="mt-1 max-h-40 overflow-auto whitespace-pre-wrap break-all rounded-md bg-white p-2 font-mono text-[10px] text-[#334155]">
                {formatSyncLogPayload(request)}
              </pre>
            </div>
          ) : null}
          {response ? (
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wide text-[#64748b]">
                Response
              </p>
              <pre className="mt-1 max-h-32 overflow-auto whitespace-pre-wrap break-all rounded-md bg-white p-2 font-mono text-[10px] text-[#475569]">
                {formatSyncLogPayload(response)}
              </pre>
            </div>
          ) : null}
        </div>
      ) : null}
    </li>
  );
}

type EventMappingRow = {
  id: string;
  local_event_id: string;
  bookingqube_form_id: string;
  bookingqube_event_id: string | null;
  events?: { name: string } | null;
};

type FieldMappingDraft = {
  bookingqube_field_id: string;
  bookingqube_label: string;
  local_field: string;
};

export const AdminSettingsBookingQubeCard = forwardRef<
  AdminSettingsBookingQubeCardHandle,
  { syncLogRef?: React.RefObject<HTMLDivElement | null> }
>(function AdminSettingsBookingQubeCard({ syncLogRef }, ref) {
  const { data, refetch } = useQuery({
    queryKey: ["bq-settings"],
    queryFn: () => adminGetBookingQubeSettings(),
  });
  const { data: eventsData } = useQuery({
    queryKey: ["a-events"],
    queryFn: () => adminListEvents(),
    staleTime: 60_000,
    refetchOnWindowFocus: false,
  });
  const [syncLogFilter, setSyncLogFilter] = useState<"all" | "errors">("all");
  const { data: syncLogs, refetch: refetchLogs } = useQuery({
    queryKey: ["bq-sync-logs", syncLogFilter],
    queryFn: () =>
      adminListBookingQubeSyncLogs({
        limit: syncLogFilter === "errors" ? 100 : 50,
        ...(syncLogFilter === "errors" ? { status: ["error"] as const } : {}),
      }),
  });
  const tablesReady = data?.tablesReady !== false;
  const { data: unsyncedData, refetch: refetchUnsynced } = useQuery({
    queryKey: ["bq-unsynced-count"],
    queryFn: () => adminCountUnsyncedRegistrations(),
    enabled: tablesReady,
  });
  const { data: allRegsData } = useQuery({
    queryKey: ["bq-all-registrations-count"],
    queryFn: () => adminCountAllRegistrations(),
    enabled: tablesReady,
  });

  const [enabled, setEnabled] = useState(false);
  const [apiKeyInput, setApiKeyInput] = useState("");
  const [apiKeyTouched, setApiKeyTouched] = useState(false);
  const [getApiUrl, setGetApiUrl] = useState("");
  const [postApiUrl, setPostApiUrl] = useState("");
  const [synced, setSynced] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);

  const [selectedEventId, setSelectedEventId] = useState<string>("");
  const [formId, setFormId] = useState("");
  const [bqEventId, setBqEventId] = useState("");
  const [fieldMappings, setFieldMappings] = useState<FieldMappingDraft[]>([]);
  const [schemaFields, setSchemaFields] = useState<BookingQubeSchemaField[]>([]);
  const [schemaEventMeta, setSchemaEventMeta] = useState<{
    eventId?: string;
    slug?: string;
    title?: string;
  }>({});
  const [copySqlBusy, setCopySqlBusy] = useState(false);
  const [resyncAllDialogOpen, setResyncAllDialogOpen] = useState(false);
  const lastLoadedEventIdRef = useRef<string>("");

  const events = eventsData?.events ?? [];
  const eventMappings = (data?.eventMappings ?? []) as EventMappingRow[];

  const selectedEvent = useMemo(
    () => events.find((e) => e.id === selectedEventId),
    [events, selectedEventId],
  );

  const selectedMapping = useMemo(
    () => eventMappings.find((m) => m.local_event_id === selectedEventId),
    [eventMappings, selectedEventId],
  );

  const getUrlNeedsFormId = urlTemplateNeedsFormContext(getApiUrl);
  const tablesError =
    data && "tablesError" in data && typeof data.tablesError === "string"
      ? data.tablesError
      : null;
  const hasStoredApiKey = data?.hasApiKey === true;
  const apiKeyFromEnv = data?.apiKeyFromEnv === true;

  const apiKeyPayload = () => (apiKeyInput.trim() ? { api_key: apiKeyInput.trim() } : {});

  useEffect(() => {
    if (!synced && data?.settings) {
      const s = data.settings as {
        enabled?: boolean;
        get_api_url?: string | null;
        post_api_url?: string | null;
        cached_form_schema?: unknown;
      };
      setEnabled(!!s.enabled);
      setGetApiUrl(s.get_api_url?.trim() ?? "");
      setPostApiUrl(s.post_api_url?.trim() ?? "");
      const cached = parseCachedFormSchemaMeta(s.cached_form_schema);
      if (cached.fields.length > 0) {
        setSchemaFields(dedupeSchemaFieldsByLabel(cached.fields));
      }
      if (schemaHasEventMetadata(cached)) {
        setSchemaEventMeta({
          eventId: cached.eventId,
          slug: cached.slug,
          title: cached.title,
        });
      }
      setSynced(true);
    }
  }, [data, synced]);

  useEffect(() => {
    if (events.length === 0) return;
    if (selectedEventId && events.some((e) => e.id === selectedEventId)) return;
    const stored =
      typeof window !== "undefined"
        ? sessionStorage.getItem(BQ_ADMIN_SELECTED_EVENT_KEY)
        : null;
    if (stored && events.some((e) => e.id === stored)) {
      setSelectedEventId(stored);
      return;
    }
    setSelectedEventId(events[0].id);
  }, [events, selectedEventId]);

  useEffect(() => {
    if (!selectedEventId) return;
    if (typeof window !== "undefined") {
      sessionStorage.setItem(BQ_ADMIN_SELECTED_EVENT_KEY, selectedEventId);
    }
  }, [selectedEventId]);

  useEffect(() => {
    if (!selectedEventId) return;
    const eventChanged = lastLoadedEventIdRef.current !== selectedEventId;
    if (eventChanged) {
      lastLoadedEventIdRef.current = selectedEventId;
      const mapping = eventMappings.find((m) => m.local_event_id === selectedEventId);
      const ev = events.find((e) => e.id === selectedEventId);
      setFormId(mapping?.bookingqube_form_id?.trim() ?? "");
      setBqEventId(mapping?.bookingqube_event_id?.trim() ?? "");
      if (!mapping?.bookingqube_form_id?.trim() && ev?.name && getUrlNeedsFormId) {
        setFormId(slugifyEventName(ev.name));
      }
      return;
    }
    const mapping = eventMappings.find((m) => m.local_event_id === selectedEventId);
    if (!mapping) return;
    setBqEventId((prev) => prev.trim() || mapping.bookingqube_event_id?.trim() || "");
    setFormId((prev) => prev.trim() || mapping.bookingqube_form_id?.trim() || "");
  }, [selectedEventId, eventMappings, events, getUrlNeedsFormId]);

  useEffect(() => {
    if (!selectedMapping?.id) {
      setFieldMappings([]);
      return;
    }
    void adminGetBookingQubeFieldMappings({ event_mapping_id: selectedMapping.id })
      .then((res) => {
        const rows = (res.mappings ?? []).map((m) => ({
          bookingqube_field_id: m.bookingqube_field_id?.trim() ?? "",
          bookingqube_label: m.bookingqube_label,
          local_field: m.local_field,
        }));
        setFieldMappings(
          schemaFields.length > 0
            ? refreshFieldMappingsFromFetchedSchema(rows, schemaFields).map((m) => ({
                bookingqube_field_id: m.bookingqube_field_id ?? "",
                bookingqube_label: m.bookingqube_label ?? "",
                local_field: m.local_field,
              }))
            : rows,
        );
      })
      .catch(() => setFieldMappings([]));
  }, [selectedMapping?.id, schemaFields]);

  const saveGlobalSettings = async () => {
    if (!getApiUrl.trim() || !postApiUrl.trim()) {
      toast.error("GET URL and POST URL are required");
      return;
    }
    setBusy("save");
    try {
      await adminSaveBookingQubeSettings({
        enabled,
        get_api_url: getApiUrl.trim(),
        post_api_url: postApiUrl.trim(),
        ...(apiKeyTouched ? { api_key: apiKeyInput.trim() || null } : {}),
      });
      if (apiKeyTouched) {
        setApiKeyInput("");
        setApiKeyTouched(false);
      }
      toast.success("BookingQube settings saved");
      await refetch();
    } catch (e: unknown) {
      toast.error(formatActionError(e));
    } finally {
      setBusy(null);
    }
  };

  const saveEventLink = async () => {
    if (!selectedEventId) {
      toast.error("Select a SummerSplash event first");
      return;
    }
    if (getUrlNeedsFormId && !formId.trim() && !selectedEvent?.name) {
      toast.error("Enter a BookingQube form id or choose an event with a name we can slugify");
      return;
    }
    setBusy("event");
    try {
      if (tablesReady && getApiUrl.trim()) {
        await adminSaveBookingQubeSettings({
          enabled,
          get_api_url: getApiUrl.trim(),
          ...(postApiUrl.trim() ? { post_api_url: postApiUrl.trim() } : {}),
          ...(apiKeyTouched ? { api_key: apiKeyInput.trim() || null } : {}),
        });
      }
      const { event_mapping_id } = await adminUpsertBookingQubeEventMapping({
        local_event_id: selectedEventId,
        bookingqube_form_id: formId.trim() || null,
        bookingqube_event_id: bqEventId.trim() || null,
        event_name: selectedEvent?.name,
      });
      if (fieldMappings.length > 0) {
        await adminSaveBookingQubeFieldMappings({
          event_mapping_id,
          mappings: fieldMappings.map((m) => ({
            bookingqube_field_id: m.bookingqube_field_id || null,
            bookingqube_label: m.bookingqube_label,
            local_field: m.local_field,
          })),
        });
      }
      toast.success("Event link and mappings saved");
      await refetch();
    } catch (e: unknown) {
      toast.error(formatActionError(e));
    } finally {
      setBusy(null);
    }
  };

  const copyBootstrapSql = async () => {
    setCopySqlBusy(true);
    try {
      const { sql } = await adminGetBookingQubeBootstrapSql();
      await navigator.clipboard.writeText(sql);
      toast.success("Migration SQL copied — paste into Supabase SQL Editor");
    } catch (e: unknown) {
      toast.error(formatActionError(e));
    } finally {
      setCopySqlBusy(false);
    }
  };

  const fetchSchema = async () => {
    if (!getApiUrl.trim()) {
      toast.error("Enter the BookingQube GET API URL first");
      return;
    }
    if (getUrlNeedsFormId && !selectedEventId) {
      toast.error("Select a SummerSplash event (GET URL uses {slug} or {formId})");
      return;
    }
    setBusy("fetch");
    try {
      if (tablesReady && postApiUrl.trim()) {
        try {
          await adminSaveBookingQubeSettings({
            enabled,
            get_api_url: getApiUrl.trim(),
            post_api_url: postApiUrl.trim(),
            ...(apiKeyTouched ? { api_key: apiKeyInput.trim() || null } : {}),
          });
          if (selectedEventId && (getUrlNeedsFormId || formId.trim())) {
            await adminUpsertBookingQubeEventMapping({
              local_event_id: selectedEventId,
              bookingqube_form_id: formId.trim() || null,
              bookingqube_event_id: bqEventId.trim() || null,
              event_name: selectedEvent?.name,
            });
          }
        } catch (saveErr: unknown) {
          toast.warning(
            `Could not save settings before fetch — ${formatActionError(saveErr)}. Fetching from API anyway.`,
          );
        }
      }

      const res = await adminFetchBookingQubeForm({
        local_event_id: selectedEventId || undefined,
        formId: formId.trim() || undefined,
        get_api_url: getApiUrl.trim(),
        post_api_url: postApiUrl.trim() || undefined,
        ...apiKeyPayload(),
      });
      const rawFields = res.fields ?? res.schema.fields ?? [];
      const fields = dedupeSchemaFieldsByLabel(rawFields);
      const eventId = res.eventId ?? res.schema.eventId ?? null;
      const slug = res.slug ?? res.schema.slug ?? null;
      const title = res.schema.title ?? null;
      setSchemaFields(fields);
      setSchemaEventMeta({
        eventId: eventId?.toString().trim() || undefined,
        slug: slug?.trim() || undefined,
        title: title?.trim() || undefined,
      });
      if (eventId != null && String(eventId).trim()) {
        setBqEventId(String(eventId).trim());
      }
      if (getUrlNeedsFormId && slug?.trim()) {
        setFormId(slug.trim());
      }
      if (fields.length > 0) {
        const refreshed = refreshFieldMappingsFromFetchedSchema(fieldMappings, fields).map(
          (m) => ({
            bookingqube_field_id: m.bookingqube_field_id ?? "",
            bookingqube_label: m.bookingqube_label ?? "",
            local_field: m.local_field,
          }),
        );
        setFieldMappings(refreshed);
        if (tablesReady && selectedMapping?.id) {
          try {
            await adminSaveBookingQubeFieldMappings({
              event_mapping_id: selectedMapping.id,
              mappings: refreshed.map((m) => ({
                bookingqube_field_id: m.bookingqube_field_id || null,
                bookingqube_label: m.bookingqube_label || m.bookingqube_field_id || "field",
                local_field: m.local_field,
              })),
            });
          } catch (saveMapErr: unknown) {
            toast.warning(
              `Schema loaded but mappings could not be saved — ${formatActionError(saveMapErr)}. Click Save event link.`,
            );
          }
        }
      }
      if (res.fieldsWarning) {
        toast.warning(res.fieldsWarning);
      } else if (res.cacheWarning) {
        toast.warning(
          fields.length > 0
            ? `Loaded ${fields.length} field(s) from BookingQube but could not cache in Supabase: ${res.cacheWarning}`
            : `Loaded BookingQube event metadata but could not cache in Supabase: ${res.cacheWarning}`,
        );
      } else {
        const count = fields.length;
        const idPart = eventId ? `, event id ${eventId}` : "";
        toast.success(
          count > 0
            ? `Loaded ${count} field${count === 1 ? "" : "s"}${idPart} — mappings updated to current schema ids`
            : eventId
              ? `Loaded event id ${eventId} — no form fields in response; map manually in Step 2`
              : "Fetched BookingQube form schema",
        );
      }
      await refetch();
    } catch (e: unknown) {
      toast.error(formatActionError(e));
    } finally {
      setBusy(null);
    }
  };

  const persistUrlsForTest = async () => {
    if (!getApiUrl.trim() || !postApiUrl.trim()) {
      toast.error("Enter GET and POST API URLs before testing");
      return false;
    }
    if (tablesReady) {
      await adminSaveBookingQubeSettings({
        enabled,
        get_api_url: getApiUrl.trim(),
        post_api_url: postApiUrl.trim(),
        ...(apiKeyTouched ? { api_key: apiKeyInput.trim() || null } : {}),
      });
    }
    return true;
  };

  const testGet = async () => {
    if (!getApiUrl.trim()) {
      toast.error("Enter the BookingQube GET API URL first (Step 1)");
      return;
    }
    if (getUrlNeedsFormId && !selectedEventId) {
      toast.error("Select an event in Step 2 — GET URL uses {slug} or {formId}");
      return;
    }
    setBusy("test-get");
    try {
      if (tablesReady && postApiUrl.trim()) {
        await persistUrlsForTest();
      }
      const res = await adminTestBookingQubeGet({
        local_event_id: selectedEventId || undefined,
        get_api_url: getApiUrl.trim(),
        post_api_url: postApiUrl.trim() || undefined,
        ...apiKeyPayload(),
      });
      toast.success(res.message);
      await refetchLogs();
    } catch (e: unknown) {
      toast.error(formatActionError(e));
    } finally {
      setBusy(null);
    }
  };

  const testPostMerged = async () => {
    if (!postApiUrl.trim()) {
      toast.error("Enter the BookingQube POST API URL first (Step 3)");
      return;
    }
    if (!selectedEventId) {
      toast.error("Select a SummerSplash event in Step 2");
      return;
    }
    const hasMappedBqFields = fieldMappings.some(
      (m) => m.bookingqube_field_id?.trim() && m.local_field?.trim(),
    );
    if (!hasMappedBqFields) {
      toast.error("Save event field mappings in Step 2 before testing POST");
      return;
    }
    setBusy("test-post");
    try {
      if (tablesReady) {
        await persistUrlsForTest();
        const { event_mapping_id } = await adminUpsertBookingQubeEventMapping({
          local_event_id: selectedEventId,
          bookingqube_form_id: formId.trim() || null,
          bookingqube_event_id: bqEventId.trim() || null,
          event_name: selectedEvent?.name,
        });
        await adminSaveBookingQubeFieldMappings({
          event_mapping_id,
          mappings: fieldMappings.map((m) => ({
            bookingqube_field_id: m.bookingqube_field_id || null,
            bookingqube_label: m.bookingqube_label,
            local_field: m.local_field,
          })),
        });
      }
      const res = await adminTestBookingQubePost({
        local_event_id: selectedEventId,
        get_api_url: getApiUrl.trim(),
        post_api_url: postApiUrl.trim(),
        ...apiKeyPayload(),
      });
      toast.success(res.message);
      await refetchLogs();
    } catch (e: unknown) {
      toast.error(formatActionError(e));
    } finally {
      setBusy(null);
    }
  };

  useImperativeHandle(ref, () => ({
    testConnection: async () => {
      await testGet();
    },
    scrollToSyncLog: () => {
      syncLogRef?.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    },
  }));

  const configured = Boolean(getApiUrl.trim()) && Boolean(postApiUrl.trim());
  const linked = eventMappings.length > 0;
  const connected = enabled && configured && linked;
  const unsyncedCount =
    unsyncedData?.tablesReady !== false ? (unsyncedData?.count ?? 0) : 0;
  const totalRegistrationCount =
    allRegsData?.tablesReady !== false ? (allRegsData?.count ?? 0) : 0;
  const canBulkSync = tablesReady && enabled && Boolean(postApiUrl.trim());

  const formatBulkSyncToast = (
    res: {
      synced: number;
      skipped?: number;
      failed: number;
      rateLimited?: number;
      total: number;
      errors?: { registrationId: string; error: string }[];
    },
    opts?: { resyncAll?: boolean },
  ) => {
    if (res.total === 0) {
      toast.success("No registrations to sync");
      return;
    }
    if (res.failed === 0 && (res.skipped ?? 0) === 0) {
      toast.success(
        `Synced ${res.synced} registration${res.synced === 1 ? "" : "s"} to BookingQube`,
      );
      return;
    }
    const parts: string[] = [];
    if (res.synced > 0) parts.push(`${res.synced} synced`);
    if ((res.skipped ?? 0) > 0) {
      parts.push(
        opts?.resyncAll
          ? `${res.skipped} skipped (validation or config)`
          : `${res.skipped} skipped (email already registered)`,
      );
    }
    if (res.failed > 0) parts.push(`${res.failed} failed`);
    let message = `${parts.join(", ")} of ${res.total}.`;
    const rateLimited = res.rateLimited ?? 0;
    const mostlyRateLimited =
      res.failed > 0 && rateLimited >= Math.max(1, Math.ceil(res.failed * 0.5));
    if (res.failed > 0) {
      if (mostlyRateLimited) {
        message +=
          " BookingQube rate limit — wait a minute, then run Resync all again for the failures.";
      } else {
        message += " Open sync log (Errors) for details.";
      }
      const sample = res.errors?.[0];
      if (sample) {
        const idShort = `${sample.registrationId.slice(0, 8)}…`;
        const errText =
          sample.error.length > 100 ? `${sample.error.slice(0, 97)}…` : sample.error;
        message += ` Example: ${idShort} — ${errText}`;
      }
    } else {
      message += " See sync log for details.";
    }
    toast.warning(message);
  };

  const syncAllUnsynced = async () => {
    setBusy("bulk-sync");
    try {
      const res = await adminSyncUnsyncedRegistrations();
      if (res.total === 0) {
        toast.success("All registrations are already synced to BookingQube");
      } else {
        formatBulkSyncToast(res);
        if (res.failed > 0) setSyncLogFilter("errors");
      }
      await Promise.all([refetchLogs(), refetchUnsynced()]);
    } catch (e: unknown) {
      toast.error(formatActionError(e));
    } finally {
      setBusy(null);
    }
  };

  const resyncAllAgain = async () => {
    setBusy("resync-all");
    try {
      const res = await adminResyncAllRegistrations();
      formatBulkSyncToast(res, { resyncAll: true });
      if (res.failed > 0) setSyncLogFilter("errors");
      await Promise.all([refetchLogs(), refetchUnsynced()]);
    } catch (e: unknown) {
      toast.error(formatActionError(e));
    } finally {
      setBusy(null);
      setResyncAllDialogOpen(false);
    }
  };

  const addMappingRow = () => {
    setFieldMappings((rows) => [
      ...rows,
      { bookingqube_field_id: "", bookingqube_label: "", local_field: "customer_name" },
    ]);
  };

  const updateMappingRow = (index: number, patch: Partial<FieldMappingDraft>) => {
    setFieldMappings((rows) => rows.map((r, i) => (i === index ? { ...r, ...patch } : r)));
  };

  const removeMappingRow = (index: number) => {
    setFieldMappings((rows) => rows.filter((_, i) => i !== index));
  };

  const schemaReady = schemaFields.length > 0;
  const eventMetaReady = schemaHasEventMetadata(schemaEventMeta);
  const canFetchSchema =
    Boolean(getApiUrl.trim()) &&
    (!getUrlNeedsFormId || Boolean(selectedEventId));
  const bqFieldOptions = useMemo(
    () => schemaFieldOptionsFromFetch(schemaFields),
    [schemaFields],
  );
  const canPickBqFields = schemaReady || bqFieldOptions.length > 0;
  const hasSavedStyleMappings = fieldMappings.some(
    (m) => m.bookingqube_field_id?.trim() && m.local_field?.trim(),
  );

  const selectBqField = (index: number, fieldId: string) => {
    const field = bqFieldOptions.find((f) => f.id === fieldId);
    updateMappingRow(index, {
      bookingqube_field_id: fieldId,
      bookingqube_label: field?.label?.trim() || fieldId,
    });
  };

  return (
    <AdminSettingsSection
      id="settings-bookingqube"
      icon={Link2}
      title="BookingQube"
      description="Sync registrations to BookingQube on POS and public sign-up when enabled."
      badge={
        <AdminSettingsBadge
          variant={connected ? "connected" : "neutral"}
          label={connected ? "Connected" : "Not configured"}
        />
      }
    >
      <div className="space-y-8">
        {!tablesReady ? (
          <div className="rounded-[16px] border border-amber-200 bg-amber-50 px-4 py-3.5 text-sm text-amber-950">
            <p className="font-semibold">Supabase tables not installed</p>
            <p className="mt-1 text-xs text-amber-900/90">
              {tablesError ??
                `Run ${BOOKINGQUBE_BOOTSTRAP_MIGRATION_FILE} in the Supabase SQL editor. You can still fetch the form schema from the BookingQube API; saving settings and mappings requires the migration.`}
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <AdminSettingsActionBtn
                label={copySqlBusy ? "Copying…" : "Copy migration SQL"}
                loading={copySqlBusy}
                onClick={() => void copyBootstrapSql()}
              />
            </div>
          </div>
        ) : null}

        <div className="flex items-center justify-between rounded-[16px] border border-[#e2e8f0] bg-[#f8fafc] px-4 py-3.5">
          <div>
            <p className="text-sm font-semibold text-[#134e4a]">Enable BookingQube sync</p>
            <p className="text-xs text-[#64748b]">
              Outbound POST on each POS and public registration when enabled.
            </p>
          </div>
          <Switch checked={enabled} onCheckedChange={setEnabled} />
        </div>

        <div className="rounded-[16px] border border-[#e2e8f0] bg-[#f8fafc]/60 p-4 sm:p-5">
          <Label className={adminSettingsLabelClass}>API key / token</Label>
          <p className="mb-2 text-xs text-[#64748b]">
            Optional — only if your API requires authentication. Save here or set{" "}
            <code className="text-[#0d9488]">BOOKINGQUBE_API_KEY</code> in{" "}
            <code className="text-[#0d9488]">.env</code> (settings value wins when both are set).
          </p>
          <div className="relative">
            <KeyRound className="pointer-events-none absolute left-3.5 top-1/2 z-10 h-4 w-4 -translate-y-1/2 text-[#94a3b8]" />
            <SecretInput
              value={apiKeyInput}
              onChange={(v) => {
                setApiKeyInput(v);
                setApiKeyTouched(true);
              }}
              placeholder={hasStoredApiKey ? "••••••••••••" : "Paste API key or token"}
              className={`${adminSettingsFieldClass} pl-10`}
            />
          </div>
          {hasStoredApiKey && !apiKeyTouched ? (
            <p className="mt-2 text-xs text-[#0d9488]">Key saved in settings.</p>
          ) : null}
          {apiKeyFromEnv && !hasStoredApiKey && !apiKeyInput.trim() ? (
            <p className="mt-2 text-xs text-[#64748b]">
              Using <code className="text-[#0d9488]">BOOKINGQUBE_API_KEY</code> from environment.
            </p>
          ) : null}
        </div>

        <div className="rounded-[16px] border border-[#e2e8f0] bg-[#f8fafc]/60 p-4 sm:p-5">
          <StepHeading step={1} title="Fetch form (GET)" />
          <p className="-mt-2 mb-4 text-xs text-[#64748b]">
            Load BookingQube form fields from your GET URL. Run this before linking fields in Step
            2.
          </p>
          <Label className={adminSettingsLabelClass}>BookingQube GET API URL</Label>
          <p className="mb-2 text-xs text-[#64748b]">
            Full URL to fetch the registration form schema. Use{" "}
            <code className="text-[#0d9488]">{"{slug}"}</code> or{" "}
            <code className="text-[#0d9488]">{"{formId}"}</code> only when the path needs an event
            segment (then select the event in Step 2 first).
          </p>
          <div className="relative">
            <Globe className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#94a3b8]" />
            <Input
              value={getApiUrl}
              onChange={(e) => setGetApiUrl(e.target.value)}
              placeholder="https://…/api/v1/registration-form/{slug}"
              className={`${adminSettingsFieldClass} pl-10`}
            />
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            <AdminSettingsActionBtn
              label="Fetch form schema"
              loading={busy === "fetch"}
              onClick={() => void fetchSchema()}
              primary
              disabled={!canFetchSchema}
            />
            <AdminSettingsActionBtn
              label="Test GET"
              loading={busy === "test-get"}
              onClick={() => void testGet()}
              disabled={!getApiUrl.trim()}
            />
          </div>
        </div>

        <div className="rounded-[16px] border border-[#e2e8f0] bg-[#f8fafc]/60 p-4 sm:p-5">
          <StepHeading step={2} title="Link event" />
          <p className="-mt-2 mb-4 text-xs text-[#64748b]">
            Map the selected SummerSplash event to BookingQube fields and the POST{" "}
            <code className="text-[#0d9488]">event_id</code>.
          </p>

          <div className="mt-4 space-y-4">
            <div>
              <Label className={adminSettingsLabelClass}>SummerSplash event</Label>
              <Select value={selectedEventId} onValueChange={setSelectedEventId}>
                <SelectTrigger className={adminSettingsFieldClass}>
                  <SelectValue placeholder="Select event" />
                </SelectTrigger>
                <SelectContent>
                  {events.map((e) => (
                    <SelectItem key={e.id} value={e.id}>
                      {e.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {getUrlNeedsFormId && (
              <div>
                <Label className={adminSettingsLabelClass}>BookingQube form id (GET path)</Label>
                <p className="mb-2 text-xs text-[#64748b]">
                  Substituted into <code className="text-[#0d9488]">{"{slug}"}</code> /{" "}
                  <code className="text-[#0d9488]">{"{formId}"}</code>. Leave blank to derive from
                  the event name ({selectedEvent?.name ? slugifyEventName(selectedEvent.name) : "—"}
                  ).
                </p>
                <Input
                  value={formId}
                  onChange={(e) => setFormId(e.target.value)}
                  placeholder="e.g. summer-splash-2026"
                  className={adminSettingsFieldClass}
                />
              </div>
            )}

            <div>
              <Label className={adminSettingsLabelClass}>BookingQube event id (POST)</Label>
              <p className="mb-2 text-xs text-[#64748b]">
                Numeric or string <code className="text-[#0d9488]">event_id</code> in the submit
                payload — often filled automatically when you fetch the form schema.
              </p>
              <Input
                value={bqEventId}
                onChange={(e) => setBqEventId(e.target.value)}
                placeholder="e.g. 42"
                className={adminSettingsFieldClass}
              />
            </div>

            <div>
              <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                <Label className={adminSettingsLabelClass}>Field mapping</Label>
                <button
                  type="button"
                  onClick={addMappingRow}
                  className="text-xs font-semibold text-[#0d9488] hover:underline"
                >
                  Add row
                </button>
              </div>
              {eventMetaReady && !schemaReady ? (
                <p className="mb-2 text-xs text-amber-700">
                  Event metadata loaded but the GET response had no fields array. Enter BookingQube
                  field ids manually below, or use a GET URL that returns form fields.
                </p>
              ) : null}
              {!eventMetaReady && !schemaReady ? (
                <p className="mb-2 text-xs text-amber-700">
                  Fetch form schema in Step 1 to load BookingQube fields and event id for this
                  link.
                </p>
              ) : null}
              {fieldMappings.length === 0 ? (
                <p className="text-xs text-[#64748b]">
                  No mappings yet — fetch the form schema to auto-map, or use Add row to enter BQ
                  field ids manually. You can save the event link with only a POST event id.
                </p>
              ) : (
                <div className="overflow-x-auto rounded-[12px] border border-[#e2e8f0] bg-white">
                  <table className="w-full min-w-[420px] text-left text-xs">
                    <thead className="border-b border-[#e2e8f0] bg-[#f8fafc] text-[10px] font-bold uppercase tracking-wide text-[#64748b]">
                      <tr>
                        <th className="px-3 py-2">Local field</th>
                        <th className="px-3 py-2">BQ field</th>
                        <th className="px-3 py-2 w-10" />
                      </tr>
                    </thead>
                    <tbody>
                      {fieldMappings.map((row, i) => (
                        <tr key={i} className="border-b border-[#f1f5f9] last:border-0">
                          <td className="px-2 py-1.5">
                            <Select
                              value={row.local_field ?? ""}
                              onValueChange={(v) => updateMappingRow(i, { local_field: v })}
                            >
                              <SelectTrigger className="h-9 text-xs">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {LOCAL_REGISTRATION_FIELDS.map((f) => (
                                  <SelectItem key={f} value={f}>
                                    {LOCAL_REGISTRATION_FIELD_LABELS[f] ?? f}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </td>
                          <td className="px-2 py-1.5">
                            {canPickBqFields ? (
                              <Select
                                value={row.bookingqube_field_id ?? ""}
                                onValueChange={(v) => selectBqField(i, v)}
                              >
                                <SelectTrigger className="h-9 text-xs">
                                  <SelectValue placeholder="Select BQ field" />
                                </SelectTrigger>
                                <SelectContent>
                                  {bqFieldOptions.map((f) => (
                                    <SelectItem key={f.id} value={f.id}>
                                      {formatBookingQubeFieldOption(f)}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            ) : (
                              <Input
                                value={row.bookingqube_field_id}
                                onChange={(e) =>
                                  updateMappingRow(i, {
                                    bookingqube_field_id: e.target.value,
                                    bookingqube_label:
                                      row.bookingqube_label?.trim() || e.target.value,
                                  })
                                }
                                placeholder="BQ field id (manual)"
                                className="h-9 text-xs"
                              />
                            )}
                            {row.bookingqube_label ? (
                              <p className="mt-1 truncate text-[10px] text-[#94a3b8]">
                                Label: {row.bookingqube_label}
                              </p>
                            ) : null}
                          </td>
                          <td className="px-2 py-1.5 text-center">
                            <button
                              type="button"
                              onClick={() => removeMappingRow(i)}
                              className="text-[#94a3b8] hover:text-red-600"
                              aria-label="Remove row"
                            >
                              ×
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            <AdminSettingsActionBtn
              label="Save event link"
              loading={busy === "event"}
              onClick={() => void saveEventLink()}
              primary
            />
          </div>
        </div>

        <div className="rounded-[16px] border border-[#e2e8f0] bg-[#f8fafc]/60 p-4 sm:p-5">
          <StepHeading step={3} title="Submit (POST)" />
          <p className="-mt-2 mb-4 text-xs text-[#64748b]">
            Submit merged registration data: local event values plus BookingQube field ids from
            Step 2.
          </p>
          <Label className={adminSettingsLabelClass}>BookingQube POST API URL</Label>
          <p className="mb-2 text-xs text-[#64748b]">
            Full URL to submit registrations after a successful transaction (and for Test POST).
          </p>
          <div className="relative">
            <Globe className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#94a3b8]" />
            <Input
              value={postApiUrl}
              onChange={(e) => setPostApiUrl(e.target.value)}
              placeholder="https://…/api/v1/registration-form/submit"
              className={`${adminSettingsFieldClass} pl-10`}
            />
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            <AdminSettingsActionBtn
              label="Test POST (merged)"
              loading={busy === "test-post"}
              onClick={() => void testPostMerged()}
              primary
              disabled={
                !postApiUrl.trim() || !selectedEventId || !hasSavedStyleMappings
              }
            />
          </div>
          {!hasSavedStyleMappings ? (
            <p className="mt-2 text-xs text-[#64748b]">
              Complete Step 2 (fetch schema, map fields, save event link) before testing POST.
            </p>
          ) : null}
        </div>

        <div className="flex flex-wrap gap-2">
          <AdminSettingsActionBtn
            label="Save settings"
            loading={busy === "save"}
            onClick={() => void saveGlobalSettings()}
            primary
          />
        </div>

        <div className="rounded-[16px] border border-[#e2e8f0] bg-[#f8fafc]/60 p-4 sm:p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h3 className="text-sm font-semibold text-[#134e4a]">Sync unsynced registrations</h3>
              <p className="mt-1 text-xs text-[#64748b]">
                One-click push for every registration that has not yet had a successful outbound
                BookingQube POST.
              </p>
            </div>
            {tablesReady && unsyncedCount > 0 ? (
              <span className="rounded-full bg-amber-100 px-2.5 py-1 text-xs font-semibold text-amber-900">
                {unsyncedCount} unsynced
              </span>
            ) : tablesReady ? (
              <span className="rounded-full bg-[#ecfdf5] px-2.5 py-1 text-xs font-semibold text-[#0f766e]">
                All synced
              </span>
            ) : null}
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            <AdminSettingsActionBtn
              label={
                unsyncedCount > 0
                  ? `Send ${unsyncedCount} unsynced to BookingQube`
                  : "Sync unsynced registrations"
              }
              loading={busy === "bulk-sync"}
              onClick={() => void syncAllUnsynced()}
              primary
              disabled={!canBulkSync}
            />
            <AdminSettingsActionBtn
              label="Resync all again"
              loading={busy === "resync-all"}
              onClick={() => setResyncAllDialogOpen(true)}
              disabled={!canBulkSync || totalRegistrationCount === 0}
            />
            <button
              type="button"
              onClick={() => syncLogRef?.current?.scrollIntoView({ behavior: "smooth", block: "start" })}
              className="rounded-[14px] border border-[#e2e8f0] bg-white px-4 py-2 text-sm font-semibold text-[#134e4a] hover:border-[#cbd5e1]"
            >
              View sync log
            </button>
          </div>
          <AlertDialog open={resyncAllDialogOpen} onOpenChange={setResyncAllDialogOpen}>
            <AlertDialogContent className="max-w-md rounded-[20px]">
              <AlertDialogHeader>
                <AlertDialogTitle className="font-display text-xl text-[#134e4a]">
                  Resync all registrations?
                </AlertDialogTitle>
                <AlertDialogDescription className="text-left text-sm leading-relaxed text-[#64748b]">
                  This will re-submit{" "}
                  <span className="font-semibold text-[#134e4a]">
                    {totalRegistrationCount} registration
                    {totalRegistrationCount === 1 ? "" : "s"}
                  </span>{" "}
                  to BookingQube, including ones already marked as synced. Every registration is
                  POSTed again; if BookingQube reports the email is already registered, it is
                  counted as synced.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter className="gap-2 sm:gap-2">
                <AlertDialogCancel
                  disabled={busy === "resync-all"}
                  className="rounded-[12px] border-[#e2e8f0]"
                >
                  Cancel
                </AlertDialogCancel>
                <button
                  type="button"
                  disabled={busy === "resync-all"}
                  onClick={() => void resyncAllAgain()}
                  className="inline-flex h-10 items-center justify-center rounded-[12px] bg-[#0d9488] px-5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#0f766e] disabled:opacity-50"
                >
                  {busy === "resync-all" ? "Resyncing…" : "Resync all"}
                </button>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
          {!enabled ? (
            <p className="mt-2 text-xs text-[#64748b]">Enable BookingQube sync above to use bulk sync.</p>
          ) : !postApiUrl.trim() ? (
            <p className="mt-2 text-xs text-[#64748b]">Set the POST API URL in Step 3 before bulk sync.</p>
          ) : null}
        </div>

        <div ref={syncLogRef} className="rounded-[16px] border border-[#e2e8f0] bg-white p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="text-sm font-semibold text-[#134e4a]">Sync log</h3>
            <div className="flex gap-1 rounded-lg bg-[#f1f5f9] p-0.5 text-[11px]">
              <button
                type="button"
                onClick={() => setSyncLogFilter("all")}
                className={`rounded-md px-2 py-1 font-semibold ${
                  syncLogFilter === "all"
                    ? "bg-white text-[#134e4a] shadow-sm"
                    : "text-[#64748b] hover:text-[#334155]"
                }`}
              >
                All
              </button>
              <button
                type="button"
                onClick={() => setSyncLogFilter("errors")}
                className={`rounded-md px-2 py-1 font-semibold ${
                  syncLogFilter === "errors"
                    ? "bg-white text-red-700 shadow-sm"
                    : "text-[#64748b] hover:text-[#334155]"
                }`}
              >
                Errors
              </button>
            </div>
          </div>
          <p className="mt-1 text-xs text-[#64748b]">
            {syncLogFilter === "errors"
              ? "Failed outbound sync attempts (validation, API, or config)."
              : "Recent outbound/inbound BookingQube sync attempts."}
          </p>
          <ul
            className={`mt-3 space-y-2 overflow-y-auto text-xs ${
              syncLogFilter === "errors" ? "max-h-64" : "max-h-48"
            }`}
          >
            {(syncLogs?.logs ?? []).length === 0 ? (
              <li className="text-[#94a3b8]">
                {syncLogFilter === "errors"
                  ? "No failed sync entries in the log."
                  : "No sync activity yet."}
              </li>
            ) : (
              (syncLogs?.logs ?? []).map((log) => (
                <BookingQubeSyncLogEntry key={log.id} log={log as SyncLogRow} />
              ))
            )}
          </ul>
        </div>
      </div>
    </AdminSettingsSection>
  );
});
