import { PhoneInput } from "react-international-phone";
import "react-international-phone/style.css";
import { cn } from "@/lib/utils";

type Props = {
  value: string;
  onChange: (val: string) => void;
  onBlur?: () => void;
  placeholder?: string;
  className?: string;
  defaultCountry?: string;
  required?: boolean;
  autoFocus?: boolean;
  id?: string;
  variant?: "soft" | "outline";
  disabled?: boolean;
};

export function IntlPhoneInput({
  value, onChange, onBlur, placeholder = "Mobile number", className,
  defaultCountry = "qa", required, autoFocus, id, variant = "soft", disabled,
}: Props) {
  const shell =
    variant === "soft"
      ? "rip-soft"
      : "rip-outline";
  return (
    <div className={cn("rip-wrap", shell, className)}>
      <PhoneInput
        defaultCountry={defaultCountry.toLowerCase()}
        value={value}
        onChange={(v) => onChange(v ?? "")}
        placeholder={placeholder}
        disabled={disabled}
        inputProps={{ id, required, autoFocus, onBlur, disabled, readOnly: disabled }}
      />
    </div>
  );
}
