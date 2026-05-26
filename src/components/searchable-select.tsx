import * as React from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Check, ChevronsUpDown, Search } from "lucide-react";
import { cn } from "@/lib/utils";

export type SelectOption = {
  value: string;
  label: React.ReactNode;
  /** Plain-text representation used for fuzzy search */
  search?: string;
  /** Compact label for the closed trigger when `label` is multi-line or wide */
  triggerLabel?: React.ReactNode;
};

interface SearchableSelectProps {
  value: string;
  onChange: (v: string) => void;
  options: SelectOption[];
  placeholder?: string;
  searchPlaceholder?: string;
  emptyText?: string;
  className?: string;
  disabled?: boolean;
  /** Hide the search input for tiny option sets */
  searchable?: boolean;
}

export function SearchableSelect({
  value,
  onChange,
  options,
  placeholder = "Select…",
  searchPlaceholder = "Search…",
  emptyText = "No results",
  className,
  disabled,
  searchable = true,
}: SearchableSelectProps) {
  const [open, setOpen] = React.useState(false);
  const selected = options.find((o) => o.value === value);

  const triggerDisplay = selected
    ? selected.triggerLabel ??
      (typeof selected.label === "string" ? selected.label : selected.search ?? selected.value)
    : placeholder;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          disabled={disabled}
          className={cn(
            "group flex h-11 w-full items-center justify-between gap-2 rounded-xl border-0 bg-foreground/5 px-3 text-left text-sm font-medium text-foreground transition hover:bg-foreground/10 focus:outline-none focus:ring-2 focus:ring-aqua/40 disabled:opacity-50",
            className,
          )}
        >
          <span className={cn("truncate", !selected && "text-muted-foreground font-normal")}>
            {triggerDisplay}
          </span>
          <ChevronsUpDown className="h-4 w-4 shrink-0 text-muted-foreground transition group-hover:text-foreground" />
        </button>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        sideOffset={6}
        className="z-50 min-w-[var(--radix-popover-trigger-width)] w-max max-w-[min(20rem,90vw)] overflow-hidden rounded-2xl border border-foreground/10 bg-popover/95 p-0 text-popover-foreground shadow-2xl backdrop-blur-xl"
      >
        <Command className="bg-transparent">
          {searchable && (
            <div className="flex items-center gap-2 border-b border-foreground/10 px-3">
              <Search className="h-4 w-4 text-muted-foreground" />
              <CommandInput
                placeholder={searchPlaceholder}
                className="h-11 border-0 bg-transparent text-sm placeholder:text-muted-foreground focus:ring-0"
              />
            </div>
          )}
          <CommandList className="max-h-64 overflow-y-auto p-1">
            <CommandEmpty className="py-6 text-center text-xs text-muted-foreground">
              {emptyText}
            </CommandEmpty>
            <CommandGroup>
              {options.map((o) => {
                const isActive = o.value === value;
                return (
                  <CommandItem
                    key={o.value}
                    value={o.search ?? (typeof o.label === "string" ? o.label : o.value)}
                    onSelect={() => {
                      onChange(o.value);
                      setOpen(false);
                    }}
                    className={cn(
                      "group flex cursor-pointer items-start gap-2 rounded-lg px-3 py-2.5 text-sm aria-selected:bg-aqua/15 aria-selected:text-foreground",
                      isActive && "bg-aqua/10 text-foreground",
                    )}
                  >
                    <span className="min-w-0 flex-1 whitespace-normal leading-snug">{o.label}</span>
                    {isActive && <Check className="mt-0.5 h-4 w-4 shrink-0 text-aqua" />}
                  </CommandItem>
                );
              })}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
