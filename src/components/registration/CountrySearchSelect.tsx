import { useEffect, useId, useMemo, useRef, useState } from "react";

type CountrySearchSelectProps = {
  countries: string[];
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  placeholder?: string;
  id?: string;
  className?: string;
  /** Compact styles for embedded admin cards. */
  size?: "default" | "sm";
};

export function CountrySearchSelect({
  countries,
  value,
  onChange,
  disabled = false,
  placeholder = "Search countries…",
  id,
  className = "",
  size = "default",
}: CountrySearchSelectProps) {
  const listId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState(value);

  useEffect(() => {
    setQuery(value);
  }, [value]);

  useEffect(() => {
    if (!open) return;
    function onDoc(e: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false);
        setQuery(value);
      }
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setOpen(false);
        setQuery(value);
      }
    }
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [open, value]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return countries;
    return countries.filter((c) => c.toLowerCase().includes(q));
  }, [countries, query]);

  const inputClass =
    size === "sm"
      ? "mt-0.5 w-full rounded-md border border-slate-300 px-2 py-1.5 text-xs"
      : "mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm";

  return (
    <div ref={rootRef} className={`relative ${className}`}>
      <input
        id={id}
        type="text"
        role="combobox"
        aria-expanded={open}
        aria-controls={listId}
        aria-autocomplete="list"
        disabled={disabled}
        value={query}
        placeholder={placeholder}
        autoComplete="off"
        onFocus={() => {
          if (!disabled) setOpen(true);
        }}
        onChange={(e) => {
          setQuery(e.target.value);
          setOpen(true);
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            const exact = filtered.find(
              (c) => c.toLowerCase() === query.trim().toLowerCase(),
            );
            const pick = exact ?? filtered[0];
            if (pick) {
              onChange(pick);
              setQuery(pick);
              setOpen(false);
            }
          }
        }}
        className={inputClass}
      />
      {open && !disabled ? (
        <ul
          id={listId}
          role="listbox"
          className="absolute z-30 mt-1 max-h-48 w-full overflow-auto rounded-lg border border-slate-200 bg-white py-1 shadow-lg ring-1 ring-black/5"
        >
          {filtered.length === 0 ? (
            <li className="px-3 py-2 text-sm text-slate-500">No matches</li>
          ) : (
            filtered.map((c) => (
              <li key={c} role="presentation">
                <button
                  type="button"
                  role="option"
                  aria-selected={c === value}
                  className={`block w-full px-3 py-2 text-left text-sm hover:bg-slate-50 ${
                    c === value ? "bg-slate-100 font-semibold" : ""
                  }`}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => {
                    onChange(c);
                    setQuery(c);
                    setOpen(false);
                  }}
                >
                  {c}
                </button>
              </li>
            ))
          )}
        </ul>
      ) : null}
    </div>
  );
}
