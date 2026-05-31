import { useMemo, useState } from "react";
import { Search } from "lucide-react";

import { Input } from "@/components/ui/input";

export type SearchSuggestion = {
  id: string;
  label: string;
  detail: string;
  value: string;
};

export function SearchBox({
  value,
  onChange,
  placeholder,
  suggestions = [],
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  suggestions?: SearchSuggestion[];
}) {
  const [open, setOpen] = useState(false);
  const visibleSuggestions = useMemo(
    () => suggestions.slice(0, 8),
    [suggestions],
  );

  return (
    <div className="relative w-full md:max-w-sm">
      <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
      <Input
        className="pl-9"
        placeholder={placeholder}
        value={value}
        onChange={(event) => {
          onChange(event.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => {
          window.setTimeout(() => setOpen(false), 120);
        }}
      />
      {open && value.trim().length > 0 && visibleSuggestions.length > 0 ? (
        <div className="absolute z-30 mt-2 max-h-72 w-full overflow-auto rounded-md border bg-card shadow-lg">
          {visibleSuggestions.map((option) => (
            <button
              key={option.id}
              type="button"
              className="block w-full border-b px-3 py-2 text-left last:border-b-0 hover:bg-muted"
              onMouseDown={() => {
                onChange(option.value);
                setOpen(false);
              }}
            >
              <p className="text-sm font-semibold text-foreground">{option.label}</p>
              <p className="text-xs text-muted-foreground">{option.detail}</p>
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
