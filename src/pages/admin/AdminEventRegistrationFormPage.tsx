import { useCallback, useEffect, useId, useRef, useState } from "react";
import { AdminModal } from "../../components/admin/AdminModal";
import { MemberNamePillsInput } from "../../components/registration/MemberNamePillsInput";
import {
  DEFAULT_REGISTRATION_FORM_DESCRIPTION,
  ensureEventRegistrationForm,
  getEventById,
  getRegistrationFormForEvent,
  registrationFormDescription,
  saveEventRegistrationOptions,
  updateFormDefinition,
  type FormDefinitionRecord,
} from "../../lib/appDataStore";
import type { FormFieldDefinition, FormFieldType } from "../../types/forms";

type AdminEventRegistrationFormPageProps = {
  eventId: string;
};

const FIELD_TYPES: FormFieldType[] = [
  "text",
  "email",
  "number",
  "textarea",
  "select",
  "checkbox",
  "date",
];

const TYPE_BADGE: Record<FormFieldType, string> = {
  text: "Text",
  email: "Email",
  number: "Number",
  textarea: "Long text",
  select: "Dropdown",
  checkbox: "Checkbox",
  date: "Date",
};

function newFieldId(label: string, existing: FormFieldDefinition[]): string {
  const base =
    label
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "_")
      .replace(/^_|_$/g, "") || "field";
  let id = base;
  let n = 2;
  const used = new Set(existing.map((f) => f.id));
  while (used.has(id)) {
    id = `${base}_${n}`;
    n += 1;
  }
  return id;
}

function emptyDraftField(): FormFieldDefinition {
  return {
    id: "",
    label: "",
    type: "text",
    required: false,
    placeholder: "",
    layout: { mdColSpan: 1 },
  };
}

function cloneFields(fields: FormFieldDefinition[]): FormFieldDefinition[] {
  return structuredClone(fields);
}

export function AdminEventRegistrationFormPage({
  eventId,
}: AdminEventRegistrationFormPageProps) {
  const fieldFormId = useId();
  const [form, setForm] = useState<FormDefinitionRecord | null>(null);
  const [fields, setFields] = useState<FormFieldDefinition[]>([]);
  const [formTitle, setFormTitle] = useState("School & teacher details");
  const [formDescription, setFormDescription] = useState(
    DEFAULT_REGISTRATION_FORM_DESCRIPTION,
  );
  const [teamsEnabled, setTeamsEnabled] = useState(true);
  const [countries, setCountries] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [usingSharedDefault, setUsingSharedDefault] = useState(false);

  const [editIndex, setEditIndex] = useState<number | null>(null);
  const [draftField, setDraftField] = useState<FormFieldDefinition>(
    emptyDraftField(),
  );
  const [fieldModalOpen, setFieldModalOpen] = useState(false);
  const [isNewField, setIsNewField] = useState(false);
  const loadGen = useRef(0);

  function noteEdit() {
    loadGen.current += 1;
  }

  const load = useCallback(async () => {
    const gen = ++loadGen.current;
    setLoading(true);
    setError(null);
    try {
      const [event, regForm] = await Promise.all([
        getEventById(eventId),
        getRegistrationFormForEvent(eventId),
      ]);
      if (gen !== loadGen.current) return;
      setTeamsEnabled(event?.registrationTeamsEnabled !== false);
      setCountries(event?.registrationCountries ?? []);
      if (regForm) {
        setForm(regForm);
        setFields(cloneFields(regForm.fields));
        setUsingSharedDefault(regForm.eventId !== eventId);
        const title =
          !regForm.title.trim() ||
          regForm.title === "Teacher Registration Form"
            ? "School & teacher details"
            : regForm.title;
        setFormTitle(title);
        setFormDescription(registrationFormDescription(regForm.description) ?? "");
      } else {
        setForm(null);
        setFields([]);
        setUsingSharedDefault(true);
        setFormTitle("School & teacher details");
        setFormDescription(DEFAULT_REGISTRATION_FORM_DESCRIPTION);
      }
    } catch (e) {
      console.warn(e);
      if (gen !== loadGen.current) return;
      setError(e instanceof Error ? e.message : "Could not load form settings.");
    } finally {
      if (gen === loadGen.current) setLoading(false);
    }
  }, [eventId]);

  useEffect(() => {
    void load();
  }, [load]);

  function openAddField() {
    setIsNewField(true);
    setEditIndex(null);
    setDraftField(emptyDraftField());
    setFieldModalOpen(true);
  }

  function openEditField(index: number) {
    const f = fields[index];
    if (!f) return;
    setIsNewField(false);
    setEditIndex(index);
    setDraftField(structuredClone(f));
    setFieldModalOpen(true);
  }

  function closeFieldModal() {
    setFieldModalOpen(false);
    setEditIndex(null);
    setIsNewField(false);
  }

  function applyFieldModal() {
    const label = draftField.label.trim();
    if (!label) {
      setError("Field needs a label.");
      return;
    }
    if (
      draftField.type === "select" &&
      (!("options" in draftField) ||
        !draftField.options ||
        draftField.options.length === 0)
    ) {
      setError("Dropdown fields need at least one option.");
      return;
    }
    setError(null);
    if (isNewField) {
      const id = newFieldId(label, fields);
      const next: FormFieldDefinition =
        draftField.type === "select"
          ? {
              ...draftField,
              id,
              label,
              type: "select",
              options:
                "options" in draftField && draftField.options?.length
                  ? draftField.options
                  : ["Option 1"],
            }
          : { ...draftField, id, label, type: draftField.type };
      setFields((cur) => [...cur, next]);
    } else if (editIndex != null) {
      setFields((cur) =>
        cur.map((f, i) => {
          if (i !== editIndex) return f;
          if (draftField.type === "select") {
            return {
              ...draftField,
              id: f.id,
              label,
              type: "select",
              options:
                "options" in draftField && draftField.options?.length
                  ? draftField.options
                  : ["Option 1"],
            };
          }
          const { options: _o, ...rest } = draftField as FormFieldDefinition & {
            options?: string[];
          };
          return { ...rest, id: f.id, label, type: draftField.type };
        }),
      );
    }
    closeFieldModal();
  }

  function moveField(index: number, dir: -1 | 1) {
    setFields((cur) => {
      const next = [...cur];
      const j = index + dir;
      if (j < 0 || j >= next.length) return cur;
      const tmp = next[index]!;
      next[index] = next[j]!;
      next[j] = tmp;
      return next;
    });
  }

  function removeField(index: number) {
    const f = fields[index];
    if (!f) return;
    if (!confirm(`Remove “${f.label}”?`)) return;
    setFields((cur) => cur.filter((_, i) => i !== index));
  }

  async function handleSaveAll() {
    setMessage(null);
    setError(null);
    if (!formTitle.trim()) {
      setError("Form needs a section title.");
      return;
    }
    if (fields.length === 0) {
      setError("Add at least one field before saving.");
      return;
    }
    for (const f of fields) {
      if (!f.label.trim()) {
        setError("Every field needs a label.");
        return;
      }
    }

    const title = formTitle.trim();
    const description = formDescription.trim();
    noteEdit();
    setSaving(true);
    try {
      let target = form?.eventId === eventId ? form : null;
      if (!target) {
        const created = await ensureEventRegistrationForm(eventId, {
          title,
          description: description || null,
          fields,
        });
        target = created;
        setForm(created);
        setUsingSharedDefault(false);
      }
      const updated = await updateFormDefinition(target.id, {
        fields,
        title,
        description: description || null,
        isActive: true,
      });
      const storedDescription = updated.description?.trim() ?? "";
      if (updated.title !== title || storedDescription !== description) {
        throw new Error(
          "The section header was not stored. Save again, and if this stays, the form row is not the one this page reloads.",
        );
      }
      setForm(updated);
      setFields(cloneFields(updated.fields));
      setFormTitle(updated.title);
      setFormDescription(updated.description ?? "");
      setUsingSharedDefault(updated.eventId !== eventId);

      const opts = await saveEventRegistrationOptions(eventId, {
        registrationTeamsEnabled: teamsEnabled,
        registrationCountries: countries,
      });
      setTeamsEnabled(opts.registrationTeamsEnabled);
      setCountries(opts.registrationCountries);
      setMessage("Saved.");
    } catch (e) {
      console.warn(e);
      const message =
        e instanceof Error
          ? e.message
          : e && typeof e === "object" && "message" in e && typeof e.message === "string"
            ? e.message
            : "Save failed.";
      setError(message);
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <p className="text-sm font-semibold text-slate-600">
          Loading registration form…
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-8 pb-10">
      <div>
        <h2 className="text-2xl font-black tracking-tight text-slate-900 md:text-3xl">
          Registration form
        </h2>
        <p className="mt-2 max-w-xl text-sm leading-relaxed text-slate-600">
          Toggle teams, pick countries, and shape the fields teachers fill out.
          {usingSharedDefault
            ? " Using the shared default until you save."
            : ""}
        </p>
      </div>

      {message ? (
        <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-800">
          {message}
        </p>
      ) : null}
      {error ? (
        <p className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm font-medium text-rose-800">
          {error}
        </p>
      ) : null}

      {/* Teams — Neopply-style toggle card */}
      <section className="space-y-3">
        <h3 className="flex items-center gap-2 text-lg font-bold text-slate-900">
          <span className="h-7 w-1 rounded-sm bg-slate-800" aria-hidden />
          Teams
        </h3>
        <label
          className={`flex cursor-pointer items-start gap-4 rounded-xl border-2 px-5 py-4 transition ${
            teamsEnabled
              ? "border-red-700/40 bg-red-50/40"
              : "border-dashed border-gray-300 bg-white hover:border-indigo-300 hover:bg-indigo-50/30"
          }`}
        >
          <input
            type="checkbox"
            checked={teamsEnabled}
            onChange={(e) => setTeamsEnabled(e.target.checked)}
            className="mt-1 h-5 w-5 rounded border-slate-300 text-red-700 focus:ring-red-600"
          />
          <span className="min-w-0">
            <span className="block text-base font-bold text-slate-900">
              Collect teams on registration
            </span>
            <span className="mt-0.5 block text-sm text-slate-600">
              Teachers add countries and member names. Turn off for events that
              only need school details.
            </span>
          </span>
        </label>

        {teamsEnabled ? (
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-sm font-bold text-slate-900">Country list</p>
            <p className="mt-1 text-xs text-slate-500">
              Paste a Google Sheet column, or type and press Enter. Empty list =
              free-text country names.
            </p>
            <MemberNamePillsInput
              names={countries}
              onChange={(next) =>
                setCountries(
                  [...next].sort((a, b) =>
                    a.localeCompare(b, undefined, { sensitivity: "base" }),
                  ),
                )
              }
              placeholder="Paste countries, or type and press Enter"
              className="mt-3 min-h-[3.5rem]"
            />
            <p className="mt-2 text-xs text-slate-500">
              {countries.length === 0
                ? "No countries yet."
                : `${countries.length} countr${countries.length === 1 ? "y" : "ies"}`}
            </p>
          </div>
        ) : null}
      </section>

      {/* Form heading + fields */}
      <section className="space-y-3">
        <h3 className="flex items-center gap-2 text-lg font-bold text-slate-900">
          <span className="h-7 w-1 rounded-sm bg-slate-800" aria-hidden />
          Form
        </h3>

        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm font-bold text-slate-900">Section header</p>
          <p className="mt-1 text-xs text-slate-500">
            Shown above the fields on the teacher registration page.
          </p>
          <label className="mt-3 block text-xs font-semibold uppercase tracking-wide text-slate-500">
            Title
            <input
              value={formTitle}
              onChange={(e) => {
                noteEdit();
                setFormTitle(e.target.value);
              }}
              placeholder="School & teacher details"
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm font-normal normal-case tracking-normal text-slate-900"
            />
          </label>
          <label className="mt-3 block text-xs font-semibold uppercase tracking-wide text-slate-500">
            Helper text
            <input
              value={formDescription}
              onChange={(e) => {
                noteEdit();
                setFormDescription(e.target.value);
              }}
              placeholder="Optional short description"
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm font-normal normal-case tracking-normal text-slate-900"
            />
          </label>
        </div>

        <p className="pt-1 text-xs font-semibold uppercase tracking-wide text-slate-500">
          Fields
        </p>

        <ul className="space-y-3">
          {fields.map((field, index) => (
            <li key={`${field.id}-${index}`}>
              <div className="group flex items-stretch gap-2">
                <button
                  type="button"
                  onClick={() => openEditField(index)}
                  className="flex min-w-0 flex-1 items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3.5 text-left shadow-sm transition hover:border-indigo-300 hover:bg-indigo-50/40"
                >
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-slate-100 text-sm font-bold text-slate-600">
                    {index + 1}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-base font-bold text-slate-900">
                      {field.label || "Untitled"}
                      {field.required ? (
                        <span className="ml-1 text-red-600" aria-hidden>
                          *
                        </span>
                      ) : null}
                    </span>
                    <span className="mt-0.5 inline-flex items-center gap-2 text-xs text-slate-500">
                      <span className="rounded-md bg-slate-100 px-2 py-0.5 font-semibold text-slate-700">
                        {TYPE_BADGE[field.type]}
                      </span>
                      {field.placeholder ? (
                        <span className="truncate italic">
                          {field.placeholder}
                        </span>
                      ) : null}
                    </span>
                  </span>
                </button>
                <div className="flex flex-col justify-center gap-1 opacity-70 transition group-hover:opacity-100">
                  <button
                    type="button"
                    disabled={index === 0}
                    onClick={() => moveField(index, -1)}
                    className="rounded-md border border-slate-200 bg-white px-2 py-1 text-xs font-semibold text-slate-600 disabled:opacity-30"
                    aria-label="Move up"
                  >
                    ↑
                  </button>
                  <button
                    type="button"
                    disabled={index === fields.length - 1}
                    onClick={() => moveField(index, 1)}
                    className="rounded-md border border-slate-200 bg-white px-2 py-1 text-xs font-semibold text-slate-600 disabled:opacity-30"
                    aria-label="Move down"
                  >
                    ↓
                  </button>
                  <button
                    type="button"
                    onClick={() => removeField(index)}
                    className="rounded-md border border-rose-200 bg-rose-50 px-2 py-1 text-xs font-semibold text-rose-800"
                    aria-label="Remove"
                  >
                    ×
                  </button>
                </div>
              </div>
            </li>
          ))}
        </ul>

        <button
          type="button"
          onClick={openAddField}
          className="group flex h-28 w-full flex-col items-center justify-center gap-1.5 overflow-hidden rounded-xl border-2 border-dashed border-gray-300 px-4 transition-all duration-200 hover:border-indigo-400 hover:bg-indigo-50/50"
        >
          <span className="flex h-10 w-10 items-center justify-center rounded-full bg-red-700 text-2xl font-light leading-none text-white shadow-md ring-4 ring-red-700/[0.12] transition group-hover:scale-105 group-hover:bg-red-800">
            +
          </span>
          <span className="text-sm font-bold text-red-800">Add field</span>
        </button>
      </section>

      {error ? (
        <p className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm font-medium text-rose-800">
          {error}
        </p>
      ) : null}

      <div className="sticky bottom-4 z-10 flex justify-end">
        <button
          type="button"
          disabled={saving}
          onClick={() => void handleSaveAll()}
          className="rounded-xl bg-slate-900 px-6 py-3 text-sm font-bold text-white shadow-lg transition hover:bg-slate-800 disabled:opacity-60"
        >
          {saving ? "Saving…" : "Save"}
        </button>
      </div>

      <AdminModal
        open={fieldModalOpen}
        title={isNewField ? "Add field" : "Edit field"}
        description="Keep labels short. Teachers see this on the registration page."
        onClose={closeFieldModal}
        footer={
          <div className="flex flex-wrap justify-end gap-2">
            <button
              type="button"
              onClick={closeFieldModal}
              className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-800 hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              form={fieldFormId}
              className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800"
            >
              {isNewField ? "Add" : "Done"}
            </button>
          </div>
        }
      >
        <form
          id={fieldFormId}
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            applyFieldModal();
          }}
        >
          <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500">
            Label
            <input
              required
              value={draftField.label}
              onChange={(e) =>
                setDraftField((d) => ({ ...d, label: e.target.value }))
              }
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm font-normal normal-case tracking-normal"
              placeholder="e.g. School Name"
            />
          </label>
          <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500">
            Type
            <select
              value={draftField.type}
              onChange={(e) => {
                const type = e.target.value as FormFieldType;
                setDraftField((d) => {
                  if (type === "select") {
                    return {
                      ...d,
                      type: "select",
                      options:
                        "options" in d && d.options?.length
                          ? d.options
                          : ["Option 1"],
                    };
                  }
                  const { options: _o, ...rest } = d as FormFieldDefinition & {
                    options?: string[];
                  };
                  return { ...rest, type };
                });
              }}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm font-normal normal-case tracking-normal"
            >
              {FIELD_TYPES.map((t) => (
                <option key={t} value={t}>
                  {TYPE_BADGE[t]}
                </option>
              ))}
            </select>
          </label>
          {draftField.type !== "checkbox" ? (
            <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500">
              Placeholder
              <input
                value={draftField.placeholder ?? ""}
                onChange={(e) =>
                  setDraftField((d) => ({
                    ...d,
                    placeholder: e.target.value,
                  }))
                }
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm font-normal normal-case tracking-normal"
              />
            </label>
          ) : null}
          {draftField.type === "select" ? (
            <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500">
              Options (one per line)
              <textarea
                rows={4}
                value={
                  "options" in draftField
                    ? draftField.options.join("\n")
                    : ""
                }
                onChange={(e) =>
                  setDraftField((d) => ({
                    ...d,
                    type: "select",
                    options: e.target.value
                      .split("\n")
                      .map((s) => s.trim())
                      .filter(Boolean),
                  }))
                }
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm font-normal normal-case tracking-normal"
              />
            </label>
          ) : null}
          <label className="flex items-center gap-2 text-sm font-medium text-slate-800">
            <input
              type="checkbox"
              checked={Boolean(draftField.required)}
              onChange={(e) =>
                setDraftField((d) => ({ ...d, required: e.target.checked }))
              }
              className="h-4 w-4 rounded border-slate-300"
            />
            Required
          </label>
        </form>
      </AdminModal>
    </div>
  );
}
