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
};

export function IntlPhoneInput({
  value, onChange, placeholder = "Mobile number", className,
  defaultCountry = "IN", required, autoFocus, id,
}: Props) {
  return (
    <div className={cn("intl-phone-wrap", className)}>
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
        className="flex h-11 items-center gap-2 rounded-md border border-input bg-background px-3"
      />
    </div>
  );
}
