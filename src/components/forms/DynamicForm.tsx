import { useEffect, useMemo, useRef, useState } from "react";
import { validateFormValues } from "../../lib/formValidation";
import type {
  DynamicFormDefinition,
  FormFieldDefinition,
  FormSubmissionPayload,
} from "../../types/forms";

type DynamicFormProps = {
  definition: DynamicFormDefinition;
  submitLabel?: string;
  initialValues?: FormSubmissionPayload;
  /**
   * When auth (or similar) loads after mount, merge these into the form only for fields that are
   * still empty — avoids wiping fields the user already filled.
   */
  prefillIfEmpty?: Record<string, string | undefined>;
  disabled?: boolean;
  onSubmit: (values: FormSubmissionPayload) => Promise<void> | void;
};

function getDefaultValue(field: FormFieldDefinition) {
  if (field.type === "checkbox") return false;
  if (field.type === "select") return "";
  return "";
}

export function DynamicForm({
  definition,
  submitLabel = "Submit",
  disabled = false,
  initialValues,
  prefillIfEmpty,
  onSubmit,
}: DynamicFormProps) {
  const defaultValues = useMemo<FormSubmissionPayload>(() => {
    const seed: FormSubmissionPayload = {};
    definition.fields.forEach((field) => {
      seed[field.id] = initialValues?.[field.id] ?? getDefaultValue(field);
    });
    return seed;
  }, [definition.fields, initialValues]);

  const [values, setValues] = useState<FormSubmissionPayload>(defaultValues);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const lastInitialJson = useRef<string | null>(null);
  useEffect(() => {
    lastInitialJson.current = null;
  }, [definition.id]);

  /** When parent loads saved registration, apply once per distinct payload (stable vs {} placeholders). */
  useEffect(() => {
    const raw = initialValues ?? {};
    const j = JSON.stringify(raw);
    if (j === lastInitialJson.current) return;
    if (j === "{}") {
      lastInitialJson.current = j;
      return;
    }
    lastInitialJson.current = j;
    setValues((prev) => {
      const next = { ...prev };
      for (const field of definition.fields) {
        const v = raw[field.id];
        if (v === undefined) continue;
        if (field.type === "checkbox") {
          next[field.id] = Boolean(v);
          continue;
        }
        if (v === null) {
          next[field.id] = getDefaultValue(field);
          continue;
        }
        next[field.id] = v as string | number | boolean;
      }
      return next;
    });
  }, [definition.fields, initialValues]);

  useEffect(() => {
    if (!prefillIfEmpty) return;
    setValues((prev) => {
      let next = prev;
      let changed = false;
      for (const [key, v] of Object.entries(prefillIfEmpty)) {
        if (typeof v !== "string" || v.trim() === "") continue;
        const cur = prev[key];
        if (cur === "" || cur === undefined || cur === null) {
          if (!changed) {
            next = { ...prev };
            changed = true;
          }
          next[key] = v;
        }
      }
      return changed ? next : prev;
    });
  }, [prefillIfEmpty]);

  function updateField(fieldId: string, value: string | number | boolean) {
    setValues((current) => ({ ...current, [fieldId]: value }));
    setErrors((current) => {
      if (!current[fieldId]) return current;
      const next = { ...current };
      delete next[fieldId];
      return next;
    });
  }

  const useThreeColumnLayout = definition.fields.some(
    (field) => field.layout?.mdColSpan != null,
  );
  const gridClass = useThreeColumnLayout
    ? "grid gap-4 sm:grid-cols-3"
    : "grid gap-4 md:grid-cols-2";
  const submitColClass = useThreeColumnLayout ? "sm:col-span-3" : "md:col-span-2";

  function fieldColClass(field: FormFieldDefinition) {
    if (!useThreeColumnLayout) {
      return field.type === "textarea" ? "md:col-span-2" : "";
    }
    const span =
      field.layout?.mdColSpan ??
      (field.type === "textarea" || field.type === "checkbox" ? 3 : 1);
    if (span === 2) return "sm:col-span-2";
    if (span === 3) return "sm:col-span-3";
    return "sm:col-span-1";
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (disabled) return;

    const nextErrors = validateFormValues(definition, values);
    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      return;
    }

    setIsSubmitting(true);
    await onSubmit(values);
    setIsSubmitting(false);
  }

  return (
    <form className={gridClass} onSubmit={handleSubmit}>
      {definition.fields.map((field) => (
        <label
          key={field.id}
          className={`text-sm font-medium text-slate-700 ${fieldColClass(field)}`}
        >
          {field.label}
          {field.required ? " *" : ""}

          {field.type === "textarea" && (
            <textarea
              rows={4}
              value={String(values[field.id] ?? "")}
              onChange={(event) => updateField(field.id, event.target.value)}
              disabled={disabled}
              placeholder={field.placeholder}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
          )}

          {(field.type === "text" ||
            field.type === "email" ||
            field.type === "number" ||
            field.type === "date") && (
            <input
              type={field.type}
              value={String(values[field.id] ?? "")}
              onChange={(event) => updateField(field.id, event.target.value)}
              disabled={disabled}
              placeholder={field.placeholder}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
          )}

          {field.type === "select" && (
            <select
              value={String(values[field.id] ?? "")}
              onChange={(event) => updateField(field.id, event.target.value)}
              disabled={disabled}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            >
              <option value="">
                {field.required ? "Please make a selection…" : "No selection (optional)"}
              </option>
              {field.options.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          )}

          {field.type === "checkbox" && (
            <input
              type="checkbox"
              checked={Boolean(values[field.id])}
              onChange={(event) => updateField(field.id, event.target.checked)}
              disabled={disabled}
              className="mt-2 h-4 w-4 rounded border-slate-300"
            />
          )}

          {field.helperText && (
            <p className="mt-1 text-xs font-normal text-slate-500">
              {field.helperText}
            </p>
          )}
          {errors[field.id] && (
            <p className="mt-1 text-xs text-rose-600">{errors[field.id]}</p>
          )}
        </label>
      ))}
      <div className={submitColClass}>
        <button
          type="submit"
          disabled={disabled || isSubmitting}
          className="rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:bg-slate-300"
        >
          {isSubmitting ? "Submitting..." : submitLabel}
        </button>
      </div>
    </form>
  );
}
