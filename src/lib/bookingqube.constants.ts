/** Client-safe BookingQube types (no server imports). */

export const BOOKINGQUBE_HTTP_METHODS = ["GET", "POST", "PUT", "PATCH", "DELETE"] as const;
export type BookingQubeHttpMethod = (typeof BOOKINGQUBE_HTTP_METHODS)[number];

/** Sync uses endpoints tagged with these roles when present. */
export const BOOKINGQUBE_ENDPOINT_ROLES = ["submit", "form_fetch"] as const;
export type BookingQubeEndpointRole = (typeof BOOKINGQUBE_ENDPOINT_ROLES)[number];

export type BookingQubeCustomEndpoint = {
  id: string;
  name: string;
  method: BookingQubeHttpMethod;
  path: string;
  role?: BookingQubeEndpointRole | null;
  /** When true, Test/sync substitute path params and body from event mapping + local registration. */
  mergeWithEventData?: boolean;
};

export const DEFAULT_BOOKINGQUBE_API_VERSION = "v1";

/** Helper text for optional BookingQube API authentication. */
export const BOOKINGQUBE_API_KEY_HINT =
  "Optional — only if your API requires authentication";

export const LOCAL_REGISTRATION_FIELDS = [
  "customer_name",
  "mobile",
  "email",
  "guest_count",
  "booking_date",
  "slot_id",
  "slot_name",
  "slot_time",
  "event_name",
  "bookingqube_ticket_id",
  "qr_token",
  "metadata",
] as const;

export type LocalRegistrationField = (typeof LOCAL_REGISTRATION_FIELDS)[number];

/** Human-readable labels for admin field-mapping dropdowns. */
export const LOCAL_REGISTRATION_FIELD_LABELS: Record<LocalRegistrationField, string> = {
  customer_name: "Customer name",
  mobile: "Mobile",
  email: "Email",
  guest_count: "Guest count",
  booking_date: "Booking date",
  slot_id: "Slot ID",
  slot_name: "Slot name",
  slot_time: "Slot time (start – end)",
  event_name: "Event name",
  bookingqube_ticket_id: "BookingQube ticket ID",
  qr_token: "QR token",
  metadata: "Metadata",
};
