/** POS customer demographics — stored on `registrations`. */

export const POS_NATIONALITY_OPTIONS = [
  { value: "resident", label: "Resident" },
  { value: "tourist", label: "Tourist" },
] as const;

export const POS_AGE_GROUP_OPTIONS = [
  { value: "child", label: "Child", range: "0–12 years" },
  { value: "teen", label: "Teen", range: "13–17 years" },
  { value: "adult", label: "Adult", range: "18–59 years" },
  { value: "senior", label: "Senior Citizen", range: "60+ years" },
] as const;

export type PosNationality = (typeof POS_NATIONALITY_OPTIONS)[number]["value"];
export type PosAgeGroup = (typeof POS_AGE_GROUP_OPTIONS)[number]["value"];

export const POS_DEFAULT_NATIONALITY: PosNationality = "resident";
export const POS_DEFAULT_AGE_GROUP: PosAgeGroup = "adult";

export function posNationalityLabel(value: PosNationality): string {
  return POS_NATIONALITY_OPTIONS.find((o) => o.value === value)?.label ?? value;
}

export function posAgeGroupLabel(value: PosAgeGroup): string {
  const row = POS_AGE_GROUP_OPTIONS.find((o) => o.value === value);
  if (!row) return value;
  return `${row.label} (${row.range})`;
}
