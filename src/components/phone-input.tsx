import { PhoneInput } from "react-international-phone";
import "react-international-phone/style.css";
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
  variant?: "soft" | "outline";
};

export function IntlPhoneInput({
  value, onChange, placeholder = "Mobile number", className,
  defaultCountry = "qa", required, autoFocus, id, variant = "soft",
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
        inputProps={{ id, required, autoFocus }}
      />
    </div>
  );
}
