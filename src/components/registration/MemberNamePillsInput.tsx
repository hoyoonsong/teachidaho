import {
  useEffect,
  useRef,
  useState,
  type ClipboardEvent,
  type KeyboardEvent,
} from "react";

type MemberNamePillsInputProps = {
  names: string[];
  onChange: (names: string[]) => void;
  disabled?: boolean;
  placeholder?: string;
  className?: string;
  size?: "default" | "sm";
  /** Called when Enter is pressed with an empty draft and at least one pill (e.g. submit team). */
  onEnterWhenEmpty?: () => void;
};

/** Split typed or pasted text (Google Sheet columns paste as newlines / tabs). */
function splitTokens(raw: string): string[] {
  return raw
    .split(/[\n\r\t,;]+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

function commitDraft(
  draft: string,
  names: string[],
): { next: string[]; leftover: string } {
  const pieces = splitTokens(draft);
  if (pieces.length === 0) return { next: names, leftover: draft };
  const next = [...names];
  for (const p of pieces) {
    if (!next.some((n) => n.toLowerCase() === p.toLowerCase())) {
      next.push(p);
    }
  }
  return { next, leftover: "" };
}

export function MemberNamePillsInput({
  names,
  onChange,
  disabled = false,
  placeholder = "Type a name, then Enter",
  className = "",
  size = "default",
  onEnterWhenEmpty,
}: MemberNamePillsInputProps) {
  const [draft, setDraft] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (disabled) setDraft("");
  }, [disabled]);

  function onKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      if (!draft.trim()) {
        onEnterWhenEmpty?.();
        return;
      }
      const result = commitDraft(draft, names);
      onChange(result.next);
      setDraft(result.leftover);
      return;
    }
    if (e.key === "Backspace" && draft === "" && names.length > 0) {
      e.preventDefault();
      onChange(names.slice(0, -1));
    }
  }

  function onPaste(e: ClipboardEvent<HTMLInputElement>) {
    const text = e.clipboardData.getData("text");
    if (!text || !/[\n\r\t]/.test(text)) return;
    e.preventDefault();
    const combined = `${draft}${text}`;
    const result = commitDraft(combined, names);
    onChange(result.next);
    setDraft(result.leftover);
  }

  const shell =
    size === "sm"
      ? "mt-0.5 min-h-[2rem] rounded-md border border-slate-300 px-1.5 py-1"
      : "mt-1 min-h-[2.5rem] rounded-lg border border-slate-300 px-2 py-1.5";
  const pill =
    size === "sm"
      ? "rounded-full bg-slate-200/90 px-2 py-0.5 text-[11px] font-medium text-slate-800"
      : "rounded-full bg-slate-200/90 px-2.5 py-0.5 text-xs font-medium text-slate-800";
  const inputSize = size === "sm" ? "text-xs" : "text-sm";

  return (
    <div
      className={`${shell} flex flex-wrap items-center gap-1.5 bg-white focus-within:border-slate-400 focus-within:ring-1 focus-within:ring-slate-300 ${
        disabled ? "opacity-60" : ""
      } ${className}`}
      onClick={() => {
        if (!disabled) inputRef.current?.focus();
      }}
    >
      {names.map((name) => (
        <span key={name} className={`inline-flex items-center gap-1 ${pill}`}>
          {name}
          {!disabled ? (
            <button
              type="button"
              aria-label={`Remove ${name}`}
              className="rounded-full text-slate-500 hover:bg-slate-300/80 hover:text-slate-800"
              onClick={(e) => {
                e.stopPropagation();
                onChange(names.filter((n) => n !== name));
              }}
            >
              ×
            </button>
          ) : null}
        </span>
      ))}
      <input
        ref={inputRef}
        type="text"
        value={draft}
        disabled={disabled}
        placeholder={names.length === 0 ? placeholder : ""}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={onKeyDown}
        onPaste={onPaste}
        onBlur={() => {
          if (draft.trim()) {
            const result = commitDraft(draft, names);
            onChange(result.next);
            setDraft(result.leftover);
          }
        }}
        className={`min-w-[8rem] flex-1 border-0 bg-transparent p-0.5 outline-none ${inputSize}`}
      />
    </div>
  );
}

/** Display-only pills for a saved team row. */
export function MemberNamePillsDisplay({
  names,
  size = "default",
}: {
  names: string[];
  size?: "default" | "sm";
}) {
  if (names.length === 0) return null;
  const pill =
    size === "sm"
      ? "rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-700 ring-1 ring-slate-200/80"
      : "rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-700 ring-1 ring-slate-200/80";
  return (
    <ul
      className={`flex flex-wrap gap-1.5 ${size === "sm" ? "mt-0.5" : "mt-1"}`}
    >
      {names.map((n) => (
        <li key={n} className={pill}>
          {n}
        </li>
      ))}
    </ul>
  );
}
