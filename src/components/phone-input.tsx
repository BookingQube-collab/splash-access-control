import PhoneInput from "react-phone-number-input";
import "react-phone-number-input/style.css";
import { cn } from "@/lib/utils";

type Props = {
  value: string;
  onChange: (val: string) => void;
  placeholder?: string;
  className?: string;
  defaultCountry?: string;
  required?: boolean;
  autoFocus?: boolean;
  id?: string;
  /** Visual variant: 'soft' (POS bg-foreground/5) or 'outline' (default border) */
  variant?: "soft" | "outline";
};

export function IntlPhoneInput({
  value, onChange, placeholder = "Mobile number", className,
  defaultCountry = "IN", required, autoFocus, id, variant = "soft",
}: Props) {
  const shell =
    variant === "soft"
      ? "h-11 rounded-md bg-foreground/5 px-3"
      : "h-11 rounded-md border border-input bg-background px-3";
  return (
    <div className={cn("intl-phone-wrap flex items-center", shell, className)}>
      <PhoneInput
        id={id}
        international
        defaultCountry={defaultCountry as any}
        value={value || undefined}
        onChange={(v) => onChange(v ?? "")}
        placeholder={placeholder}
        required={required}
        autoFocus={autoFocus}
        countryCallingCodeEditable={false}
        className="flex h-full w-full items-center"
      />
    </div>
  );
}
