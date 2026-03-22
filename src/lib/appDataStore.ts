import type { UserRole } from "../types/auth";
import type { DynamicFormDefinition, FormSubmissionPayload } from "../types/forms";
import { withNetworkRetries } from "./networkRetry";
import { hasSupabaseCredentials, supabase } from "./supabase";

export type EventStatus = "draft" | "published" | "active" | "closed" | "archived";
export type AnnouncementAudience =
  | "public"
  | "teachers"
  | "volunteers"
  | "students"
  | "admins";
export type SubmissionStatus = "pending" | "accepted" | "rejected";

/** Dynamic score columns + per-team cell values (stored on events.custom_settings.scoreboard). */
export type ScoreboardColumn = { id: string; label: string };
export type ScoreboardGridState = {
  columns: ScoreboardColumn[];
  cells: Record<string, Record<string, string>>;
};

export type EventRecord = {
  id: string;
  name: string;
  additionalInfo: string;
  eventDate: string;
  location: string;
  registrationDeadline: string;
  status: EventStatus;
  /** Stored in custom_settings; default true when unset. */
  scoreboardVisibleToParticipants: boolean;
  scoreboard?: ScoreboardGridState;
};

/** One team row for an event (flattened from registrations → teams). */
export type EventTeamRow = {
  id: string;
  teamName: string;
  registrationId: string;
  schoolName: string;
  teacherEmail: string;
};

/** Team row scoped to one registration (teacher or admin UI). */
export type RegistrationTeamRecord = {
  id: string;
  registrationId: string;
  /** Country or simulation team label (e.g. "Brazil"). */
  teamName: string;
  assignedCountry: string | null;
  /** Student / member names parsed from roster JSON. */
  memberNames: string[];
};

export type AnnouncementRecord = {
  id: string;
  title: string;
  body: string;
  audience: AnnouncementAudience;
  eventId: string | null;
  createdAt: string;
  /** Set when soft-deleted; row is purged after ~30 days. */
  deletedAt: string | null;
};

/** Announcement with optional linked event name (for feeds / notifications). */
export type AnnouncementFeedItem = AnnouncementRecord & {
  eventName: string | null;
};

export type AdminProfileRecord = {
  id: string;
  email: string;
  fullName: string | null;
  role: UserRole;
  schoolName: string | null;
  createdAt: string;
};

export type FormDefinitionRecord = DynamicFormDefinition & {
  version: number;
  isActive: boolean;
};

export type FormSubmissionRecord = {
  id: string;
  formDefinitionId: string;
  eventId: string | null;
  submittedBy: string;
  payload: FormSubmissionPayload;
  status: SubmissionStatus;
  createdAt: string;
};

/** Registration row with admin-editable fields (event-scoped lists). */
export type RegistrationDetailRecord = FormSubmissionRecord & {
  schoolName: string;
  className: string | null;
  teacherNotes: string | null;
  /** Auth user id — one registration per (event_id, teacher_id). */
  teacherId: string;
};

export type EventMembershipRecord = {
  id: string;
  eventId: string;
  personIdentifier: string;
  sourceSubmissionId: string;
  createdAt: string;
};

export type ScoreRecord = {
  id: string;
  eventId: string;
  teamName: string;
  score: number;
  note: string;
  createdAt: string;
};

type EventCustomSettings = {
  dateLabel?: string;
  scoreboard?: ScoreboardGridState;
  /** Default true when omitted — participants see Scoreboard tab + live board. */
  scoreboardVisibleToParticipants?: boolean;
};

type EventRow = {
  id: string;
  name: string;
  summary: string;
  location: string | null;
  start_date: string | null;
  end_date: string | null;
  registration_deadline: string | null;
  status: EventStatus;
  custom_settings: EventCustomSettings | null;
};

type AnnouncementRow = {
  id: string;
  title: string;
  body: string;
  audience: AnnouncementAudience;
  event_id: string | null;
  created_at: string;
  deleted_at: string | null;
};

type AnnouncementRowWithEvent = AnnouncementRow & {
  events?: { name: string } | null;
};

type FormDefinitionRow = {
  id: string;
  form_key: string;
  title: string;
  description: string | null;
  event_id: string | null;
  audience: "teachers" | "volunteers" | "public" | "students";
  fields: DynamicFormDefinition["fields"];
  version: number;
  is_active: boolean;
};

type RegistrationRow = {
  id: string;
  event_id: string;
  teacher_id: string;
  status: "draft" | "submitted" | "approved" | "rejected";
  school_name: string;
  class_name: string | null;
  teacher_notes: string | null;
  custom_fields: FormSubmissionPayload;
  submitted_at: string | null;
  created_at: string;
  profiles: { email: string } | null;
};

type TeamRow = {
  id: string;
  registration_id: string;
  team_name: string;
  score: number | null;
  ranking_note: string | null;
  created_at: string;
  registrations: { event_id: string } | null;
};

function makeSlug(name: string) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function formatDateOnly(value: string | null) {
  if (!value) return "TBD";
  const date = value.match(/^\d{4}-\d{2}-\d{2}/)?.[0];
  if (date) return date;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toISOString().slice(0, 10);
}

export function parseScoreboardGridFromSettings(
  settings: EventCustomSettings | null | undefined,
): ScoreboardGridState | undefined {
  const raw = settings?.scoreboard;
  if (!raw || typeof raw !== "object") return undefined;
  const columnsRaw = (raw as { columns?: unknown }).columns;
  const cellsRaw = (raw as { cells?: unknown }).cells;
  if (!Array.isArray(columnsRaw)) return undefined;
  const columns: ScoreboardColumn[] = columnsRaw.filter(
    (c): c is ScoreboardColumn =>
      Boolean(c) &&
      typeof c === "object" &&
      typeof (c as ScoreboardColumn).id === "string" &&
      typeof (c as ScoreboardColumn).label === "string",
  );
  const cells: Record<string, Record<string, string>> = {};
  if (cellsRaw && typeof cellsRaw === "object" && !Array.isArray(cellsRaw)) {
    for (const [teamId, row] of Object.entries(cellsRaw)) {
      if (row && typeof row === "object" && !Array.isArray(row)) {
        const out: Record<string, string> = {};
        for (const [k, v] of Object.entries(row)) {
          out[k] = v === undefined || v === null ? "" : String(v);
        }
        cells[teamId] = out;
      }
    }
  }
  return { columns, cells };
}

function toEventRecord(row: EventRow): EventRecord {
  const scoreboard = parseScoreboardGridFromSettings(row.custom_settings);
  const cs = row.custom_settings ?? {};
  const scoreboardVisibleToParticipants =
    cs.scoreboardVisibleToParticipants === false ? false : true;
  return {
    id: row.id,
    name: row.name,
    additionalInfo: row.summary,
    eventDate:
      row.custom_settings?.dateLabel ?? formatDateOnly(row.start_date ?? row.end_date),
    location: row.location ?? "TBD",
    registrationDeadline: formatDateOnly(row.registration_deadline),
    status: row.status,
    scoreboardVisibleToParticipants,
    ...(scoreboard ? { scoreboard } : {}),
  };
}

function toAnnouncementRecord(row: AnnouncementRow): AnnouncementRecord {
  return {
    id: row.id,
    title: row.title,
    body: row.body,
    audience: row.audience,
    eventId: row.event_id,
    createdAt: row.created_at,
    deletedAt: row.deleted_at ?? null,
  };
}

function toAnnouncementFeedItem(row: AnnouncementRowWithEvent): AnnouncementFeedItem {
  const base = toAnnouncementRecord(row);
  return {
    ...base,
    eventName: row.events?.name ?? null,
  };
}

const LEGACY_REGISTRATION_FIELD_IDS = new Set(["studentCount", "gradeBand"]);

function ensureTeacherRegistrationLayout(
  fields: DynamicFormDefinition["fields"],
): DynamicFormDefinition["fields"] {
  return fields.map((f) => {
    if (f.layout?.mdColSpan != null) return f;
    if (f.id === "schoolName" || f.id === "teacherName" || f.id === "teacherEmail") {
      return { ...f, layout: { mdColSpan: 1 as const } };
    }
    if (f.id === "notes" || f.type === "textarea") {
      return { ...f, layout: { mdColSpan: 3 as const } };
    }
    if (f.type === "checkbox") {
      return { ...f, layout: { mdColSpan: 3 as const } };
    }
    return f;
  });
}

/** Strips deprecated fields and applies teacher-registration row layout when applicable. */
export function normalizeParticipantRegistrationForm(
  form: FormDefinitionRecord,
): FormDefinitionRecord {
  let fields = form.fields.filter((f) => !LEGACY_REGISTRATION_FIELD_IDS.has(f.id));
  const looksLikeTeacherReg =
    fields.some((f) => f.id === "schoolName") && fields.some((f) => f.id === "teacherEmail");
  if (looksLikeTeacherReg) {
    fields = ensureTeacherRegistrationLayout(fields);
  }
  return { ...form, fields };
}

function toFormDefinitionRecord(row: FormDefinitionRow): FormDefinitionRecord {
  return {
    id: row.id,
    key: row.form_key,
    title: row.title,
    description: row.description ?? undefined,
    eventId: row.event_id,
    audience: row.audience,
    fields: row.fields,
    version: row.version,
    isActive: row.is_active,
  };
}

function toSubmissionStatus(status: RegistrationRow["status"]): SubmissionStatus {
  if (status === "approved") return "accepted";
  if (status === "rejected") return "rejected";
  return "pending";
}

function fromSubmissionStatus(status: SubmissionStatus): RegistrationRow["status"] {
  if (status === "accepted") return "approved";
  if (status === "rejected") return "rejected";
  return "submitted";
}

async function withSupabase<T>(query: () => Promise<T>, fallback: () => T | Promise<T>) {
  if (!hasSupabaseCredentials || !supabase) {
    return await fallback();
  }
  try {
    return await withNetworkRetries(() => query(), { retries: 4, delayMs: 350 });
  } catch (error) {
    if (import.meta.env.DEV) {
      console.warn("Supabase query failed after retries, returning fallback.", error);
    }
    return await fallback();
  }
}

function fallbackEvents(): EventRecord[] {
  return [];
}

export async function listEvents() {
  return withSupabase(async () => {
    if (!supabase) throw new Error("No supabase");
    const { data, error } = await supabase
      .from("events")
      .select(
        "id,name,summary,location,start_date,end_date,registration_deadline,status,custom_settings",
      )
      .order("created_at", { ascending: false })
      .returns<EventRow[]>();
    if (error) throw error;
    return (data ?? []).map(toEventRecord);
  }, fallbackEvents);
}

export async function listActiveEvents() {
  return withSupabase(async () => {
    if (!supabase) throw new Error("No supabase");
    const { data, error } = await supabase
      .from("events")
      .select(
        "id,name,summary,location,start_date,end_date,registration_deadline,status,custom_settings",
      )
      .in("status", ["published", "active", "closed"])
      .eq("is_public", true)
      .order("start_date", { ascending: true })
      .returns<EventRow[]>();
    if (error) throw error;
    return (data ?? []).map(toEventRecord);
  }, async () => []);
}

/**
 * Same query as {@link listActiveEvents} but surfaces errors instead of returning an empty list.
 * Use on the Participants hub so users can tell “failed to load” from “no events yet”.
 *
 * **Implementation note:** Uses `fetch` against PostgREST with the **anon key**, not the JS
 * client’s `.from().select()`. After OAuth we’ve seen the Supabase client’s request path hang
 * indefinitely (auth/refresh/mutex), while a plain REST GET with the anon JWT completes. RLS
 * for public events allows this read without a user session.
 */
export async function listActiveEventsDetailed(): Promise<{
  events: EventRecord[];
  error: string | null;
}> {
  const baseUrl = (import.meta.env.VITE_SUPABASE_URL as string | undefined)?.replace(
    /\/$/,
    "",
  );
  const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

  if (!baseUrl || !anonKey) {
    return {
      events: [],
      error:
        "Supabase isn’t configured in this build. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to .env.local (dev) or Vercel env (production), then restart the dev server or redeploy.",
    };
  }

  const select =
    "id,name,summary,location,start_date,end_date,registration_deadline,status,custom_settings";
  const params = new URLSearchParams({ select });
  const query = `${params.toString()}&status=in.(published,active,closed)&is_public=eq.true&order=start_date.asc`;
  const url = `${baseUrl}/rest/v1/events?${query}`;

  const ac = new AbortController();
  const timeoutMs = 25_000;
  const timeoutId = window.setTimeout(() => ac.abort(), timeoutMs);

  try {
    const res = await fetch(url, {
      method: "GET",
      headers: {
        apikey: anonKey,
        Authorization: `Bearer ${anonKey}`,
        Accept: "application/json",
      },
      signal: ac.signal,
    });

    const raw = await res.text();
    if (!res.ok) {
      let detail = raw.slice(0, 500);
      try {
        const j = JSON.parse(raw) as { message?: string };
        if (typeof j?.message === "string") detail = j.message;
      } catch {
        /* use raw */
      }
      return {
        events: [],
        error: `HTTP ${res.status}${detail ? `: ${detail}` : ""}`,
      };
    }

    let rows: EventRow[];
    try {
      rows = JSON.parse(raw) as EventRow[];
    } catch {
      return { events: [], error: "Invalid JSON from events API." };
    }
    if (!Array.isArray(rows)) {
      return { events: [], error: "Unexpected events API response shape." };
    }
    return { events: rows.map(toEventRecord), error: null };
  } catch (e) {
    const aborted = e instanceof DOMException && e.name === "AbortError";
    const msg = aborted
      ? `Request timed out after ${Math.round(timeoutMs / 1000)}s. Check the Network tab for the GET to /rest/v1/events.`
      : e instanceof Error
        ? e.message
        : "Could not load events.";
    return { events: [], error: msg };
  } finally {
    window.clearTimeout(timeoutId);
  }
}

export async function createEvent(input: Omit<EventRecord, "id">) {
  return withSupabase(async () => {
    if (!supabase) throw new Error("No supabase");
    const legacyInput = input as Omit<EventRecord, "id"> & {
      summary?: string;
      dateLabel?: string;
    };
    const additionalInfo = (legacyInput.additionalInfo ?? legacyInput.summary ?? "").trim();
    const eventDate =
      legacyInput.eventDate ??
      legacyInput.dateLabel ??
      new Date().toISOString().slice(0, 10);
    const registrationDate = legacyInput.registrationDeadline ?? eventDate;
    const registrationDeadline = `${registrationDate}T23:59:00Z`;
    const { data, error } = await supabase
      .from("events")
      .insert({
        name: legacyInput.name,
        slug: makeSlug(legacyInput.name),
        summary: additionalInfo,
        location: legacyInput.location,
        start_date: eventDate,
        end_date: eventDate,
        registration_deadline: registrationDeadline,
        status: legacyInput.status,
        custom_settings: {},
      })
      .select(
        "id,name,summary,location,start_date,end_date,registration_deadline,status,custom_settings",
      )
      .single<EventRow>();
    if (error) throw error;
    return toEventRecord(data);
  }, async () => ({
    ...input,
    id: crypto.randomUUID(),
    scoreboardVisibleToParticipants: true,
  }));
}

export async function updateEventStatus(eventId: string, status: EventStatus) {
  return withSupabase(async () => {
    if (!supabase) throw new Error("No supabase");
    const { error } = await supabase
      .from("events")
      .update({ status })
      .eq("id", eventId);
    if (error) throw error;
  }, async () => undefined);
}

export type EventDetailsPatch = {
  name?: string;
  additionalInfo?: string;
  location?: string;
  eventDate?: string;
  registrationDeadline?: string;
  status?: EventStatus;
};

export async function updateEventDetails(eventId: string, patch: EventDetailsPatch) {
  return withSupabase(async () => {
    if (!supabase) throw new Error("No supabase");
    const updates: Record<string, unknown> = {};
    if (patch.name !== undefined) {
      updates.name = patch.name;
      updates.slug = makeSlug(patch.name);
    }
    if (patch.additionalInfo !== undefined) {
      updates.summary = patch.additionalInfo.trim();
    }
    if (patch.location !== undefined) {
      updates.location = patch.location;
    }
    if (patch.eventDate !== undefined) {
      updates.start_date = patch.eventDate;
      updates.end_date = patch.eventDate;
    }
    if (patch.registrationDeadline !== undefined) {
      updates.registration_deadline = `${patch.registrationDeadline}T23:59:00Z`;
    }
    if (patch.status !== undefined) {
      updates.status = patch.status;
    }
    if (Object.keys(updates).length === 0) return;
    const { data, error } = await supabase
      .from("events")
      .update(updates)
      .eq("id", eventId)
      .select(
        "id,name,summary,location,start_date,end_date,registration_deadline,status,custom_settings",
      )
      .single<EventRow>();
    if (error) throw error;
    return toEventRecord(data);
  }, async () => null);
}

export async function getEventById(eventId: string): Promise<EventRecord | null> {
  return withSupabase(async () => {
    if (!supabase) throw new Error("No supabase");
    const { data, error } = await supabase
      .from("events")
      .select(
        "id,name,summary,location,start_date,end_date,registration_deadline,status,custom_settings",
      )
      .eq("id", eventId)
      .maybeSingle<EventRow>();
    if (error) throw error;
    if (!data) return null;
    return toEventRecord(data);
  }, async () => null);
}

/** Single event when shown on the public Participants hub (same rules as listActiveEvents). */
export async function getParticipantVisibleEvent(
  eventId: string,
): Promise<EventRecord | null> {
  return withSupabase(async () => {
    if (!supabase) throw new Error("No supabase");
    const { data, error } = await supabase
      .from("events")
      .select(
        "id,name,summary,location,start_date,end_date,registration_deadline,status,custom_settings",
      )
      .eq("id", eventId)
      .eq("is_public", true)
      .in("status", ["published", "active", "closed"])
      .maybeSingle<EventRow>();
    if (error) throw error;
    if (!data) return null;
    return toEventRecord(data);
  }, async () => null);
}

export async function saveEventScoreboard(eventId: string, grid: ScoreboardGridState) {
  return withSupabase(async () => {
    if (!supabase) throw new Error("No supabase");
    const { data: row, error: readError } = await supabase
      .from("events")
      .select("custom_settings")
      .eq("id", eventId)
      .single<{ custom_settings: EventCustomSettings | null }>();
    if (readError) throw readError;
    const prev = row?.custom_settings ?? {};
    const nextSettings: EventCustomSettings = {
      ...prev,
      scoreboard: grid,
    };
    const { error } = await supabase
      .from("events")
      .update({ custom_settings: nextSettings })
      .eq("id", eventId);
    if (error) throw error;
  }, async () => undefined);
}

export async function saveScoreboardParticipantVisibility(
  eventId: string,
  visible: boolean,
) {
  return withSupabase(async () => {
    if (!supabase) throw new Error("No supabase");
    const { data: row, error: readError } = await supabase
      .from("events")
      .select("custom_settings")
      .eq("id", eventId)
      .single<{ custom_settings: EventCustomSettings | null }>();
    if (readError) throw readError;
    const prev = row?.custom_settings ?? {};
    const nextSettings: EventCustomSettings = {
      ...prev,
      scoreboardVisibleToParticipants: visible,
    };
    const { error } = await supabase
      .from("events")
      .update({ custom_settings: nextSettings })
      .eq("id", eventId);
    if (error) throw error;
  }, async () => undefined);
}

export async function listRegistrationsForEvent(
  eventId: string,
): Promise<RegistrationDetailRecord[]> {
  return withSupabase(async () => {
    if (!supabase) throw new Error("No supabase");
    const { data, error } = await supabase
      .from("registrations")
      .select(
        "id,event_id,teacher_id,status,school_name,class_name,teacher_notes,custom_fields,submitted_at,created_at,profiles(email)",
      )
      .eq("event_id", eventId)
      .order("created_at", { ascending: false })
      .returns<RegistrationRow[]>();
    if (error) throw error;

    return (data ?? []).map((row) => ({
      id: row.id,
      formDefinitionId: "teacher-registration",
      eventId: row.event_id,
      submittedBy: row.profiles?.email ?? row.teacher_id,
      payload: row.custom_fields,
      status: toSubmissionStatus(row.status),
      createdAt: row.created_at,
      schoolName: row.school_name,
      className: row.class_name,
      teacherNotes: row.teacher_notes,
      teacherId: row.teacher_id,
    }));
  }, async () => []);
}

export async function listAnnouncementsForEvent(eventId: string) {
  return withSupabase(async () => {
    if (!supabase) throw new Error("No supabase");
    const { data, error } = await supabase
      .from("announcements")
      .select("id,title,body,audience,event_id,created_at,deleted_at")
      .eq("event_id", eventId)
      .order("created_at", { ascending: false })
      .returns<AnnouncementRow[]>();
    if (error) throw error;
    return (data ?? []).map(toAnnouncementRecord);
  }, async () => []);
}

export async function listTeamsForEvent(eventId: string): Promise<EventTeamRow[]> {
  return withSupabase(async () => {
    if (!supabase) throw new Error("No supabase");
    type RegRow = {
      id: string;
      school_name: string;
      profiles: { email: string } | null;
      teams: { id: string; team_name: string }[] | null;
    };
    const { data, error } = await supabase
      .from("registrations")
      .select("id, school_name, profiles(email), teams(id, team_name)")
      .eq("event_id", eventId)
      .returns<RegRow[]>();
    if (error) throw error;
    const rows: EventTeamRow[] = [];
    for (const reg of data ?? []) {
      const teams = reg.teams ?? [];
      for (const t of teams) {
        rows.push({
          id: t.id,
          teamName: t.team_name,
          registrationId: reg.id,
          schoolName: reg.school_name,
          teacherEmail: reg.profiles?.email ?? "",
        });
      }
    }
    return rows;
  }, async () => []);
}

type RosterEntry = { name: string };

type RegistrationTeamDbRow = {
  id: string;
  registration_id: string;
  team_name: string;
  assigned_country: string | null;
  roster: unknown;
};

export function parseMemberNamesText(text: string): string[] {
  return text
    .split(/\s*(?:,|\n|(?:\.\s+))\s*/)
    .map((s) => s.trim())
    .filter(Boolean);
}

function memberNamesToRoster(names: string[]): RosterEntry[] {
  return names.map((name) => ({ name }));
}

function rosterToMemberNames(roster: unknown): string[] {
  if (!Array.isArray(roster)) return [];
  const out: string[] = [];
  for (const item of roster) {
    if (
      item &&
      typeof item === "object" &&
      "name" in item &&
      typeof (item as { name: unknown }).name === "string"
    ) {
      const n = (item as { name: string }).name.trim();
      if (n) out.push(n);
    }
  }
  return out;
}

function toRegistrationTeamRecord(row: RegistrationTeamDbRow): RegistrationTeamRecord {
  return {
    id: row.id,
    registrationId: row.registration_id,
    teamName: row.team_name,
    assignedCountry: row.assigned_country,
    memberNames: rosterToMemberNames(row.roster),
  };
}

/**
 * Ensure the current user has a registration row for this event (draft if new).
 * Required before attaching teams; submitForm later upgrades the same row to submitted.
 */
export async function ensureTeacherRegistrationDraft(eventId: string): Promise<string | null> {
  return withSupabase(async () => {
    if (!supabase) throw new Error("No supabase");
    const { data: authData } = await supabase.auth.getUser();
    const userId = authData.user?.id;
    if (!userId || !eventId) return null;

    const { data: existing, error: exErr } = await supabase
      .from("registrations")
      .select("id")
      .eq("event_id", eventId)
      .eq("teacher_id", userId)
      .maybeSingle<{ id: string }>();
    if (exErr) throw exErr;
    if (existing) return existing.id;

    const { data, error } = await supabase
      .from("registrations")
      .insert({
        event_id: eventId,
        teacher_id: userId,
        status: "draft",
        school_name: "Pending",
        class_name: null,
        teacher_notes: null,
        custom_fields: {},
      })
      .select("id")
      .single<{ id: string }>();
    if (error) throw error;
    return data.id;
  }, async () => null);
}

/** Teacher's registration row for one event (form answers in custom_fields). */
export type TeacherRegistrationSnapshot = {
  id: string;
  status: "draft" | "submitted" | "approved" | "rejected";
  payload: FormSubmissionPayload;
};

export async function getTeacherRegistrationSnapshot(
  eventId: string,
): Promise<TeacherRegistrationSnapshot | null> {
  return withSupabase(async () => {
    if (!supabase) throw new Error("No supabase");
    const { data: authData } = await supabase.auth.getUser();
    const userId = authData.user?.id;
    if (!userId || !eventId) return null;

    const { data, error } = await supabase
      .from("registrations")
      .select("id, status, school_name, custom_fields")
      .eq("event_id", eventId)
      .eq("teacher_id", userId)
      .maybeSingle<{
        id: string;
        status: TeacherRegistrationSnapshot["status"];
        school_name: string;
        custom_fields: FormSubmissionPayload | null;
      }>();
    if (error) throw error;
    if (!data) return null;
    const custom = (data.custom_fields as FormSubmissionPayload) ?? {};
    /** Column is source of truth for display (admins edit school_name; submitForm keeps it in sync on save). */
    const payload: FormSubmissionPayload = {
      ...custom,
      schoolName: data.school_name ?? custom.schoolName ?? "",
    };
    return {
      id: data.id,
      status: data.status,
      payload,
    };
  }, async () => null);
}

export async function listTeamsForRegistration(
  registrationId: string,
): Promise<RegistrationTeamRecord[]> {
  return withSupabase(async () => {
    if (!supabase) throw new Error("No supabase");
    const { data, error } = await supabase
      .from("teams")
      .select("id,registration_id,team_name,assigned_country,roster")
      .eq("registration_id", registrationId)
      .order("created_at", { ascending: true })
      .returns<RegistrationTeamDbRow[]>();
    if (error) throw error;
    return (data ?? []).map(toRegistrationTeamRecord);
  }, async () => []);
}

export async function createRegistrationTeam(
  registrationId: string,
  input: { teamLabel: string; memberNamesText: string },
): Promise<RegistrationTeamRecord | null> {
  return withSupabase(async () => {
    if (!supabase) throw new Error("No supabase");
    const label = input.teamLabel.trim();
    if (!label) throw new Error("Country or team name is required");
    const roster = memberNamesToRoster(parseMemberNamesText(input.memberNamesText));
    if (roster.length === 0) {
      throw new Error("At least one team member name is required");
    }
    const { data, error } = await supabase
      .from("teams")
      .insert({
        registration_id: registrationId,
        team_name: label,
        assigned_country: label,
        roster,
      })
      .select("id,registration_id,team_name,assigned_country,roster")
      .single<RegistrationTeamDbRow>();
    if (error) throw error;
    return toRegistrationTeamRecord(data);
  }, async () => null);
}

export async function updateRegistrationTeam(
  teamId: string,
  input: { teamLabel?: string; memberNamesText?: string },
): Promise<void> {
  return withSupabase(async () => {
    if (!supabase) throw new Error("No supabase");
    const updates: Record<string, unknown> = {};
    if (input.teamLabel !== undefined) {
      const label = input.teamLabel.trim();
      updates.team_name = label;
      updates.assigned_country = label || null;
    }
    if (input.memberNamesText !== undefined) {
      const names = parseMemberNamesText(input.memberNamesText);
      if (names.length === 0) {
        throw new Error("At least one team member name is required");
      }
      updates.roster = memberNamesToRoster(names);
    }
    if (Object.keys(updates).length === 0) return;
    const { error } = await supabase.from("teams").update(updates).eq("id", teamId);
    if (error) throw error;
  }, async () => undefined);
}

export async function deleteRegistrationTeam(teamId: string): Promise<void> {
  return withSupabase(async () => {
    if (!supabase) throw new Error("No supabase");
    const { error } = await supabase.from("teams").delete().eq("id", teamId);
    if (error) throw error;
  }, async () => undefined);
}

/** Team + school for public participant scoreboard (RPC; no teacher PII). */
export type PublicScoreboardTeamRow = {
  id: string;
  teamName: string;
  schoolName: string;
};

export async function listPublicTeamsForEvent(
  eventId: string,
): Promise<PublicScoreboardTeamRow[]> {
  return withSupabase(async () => {
    if (!supabase) throw new Error("No supabase");
    const { data, error } = await supabase.rpc("list_teams_for_public_event", {
      p_event_id: eventId,
    });
    if (error) throw error;
    type RpcRow = { team_id: string; team_name: string; school_name: string };
    const rows = (data ?? []) as RpcRow[];
    return rows.map((row) => ({
      id: row.team_id,
      teamName: row.team_name,
      schoolName: row.school_name,
    }));
  }, async () => []);
}

export async function updateRegistrationFields(
  registrationId: string,
  patch: {
    school_name?: string;
    class_name?: string | null;
    teacher_notes?: string | null;
  },
) {
  return withSupabase(async () => {
    if (!supabase) throw new Error("No supabase");
    const { error } = await supabase
      .from("registrations")
      .update(patch)
      .eq("id", registrationId);
    if (error) throw error;
  }, async () => undefined);
}

/** Filter announcements the current role is allowed to see (same rules as the global feed). */
export function filterAnnouncementsByRole<T extends AnnouncementRecord>(
  announcements: T[],
  role: UserRole | null,
): T[] {
  const allowed = new Set<AnnouncementAudience>(["public"]);
  if (role === "admin") {
    allowed.add("admins");
    allowed.add("teachers");
    allowed.add("volunteers");
    allowed.add("students");
  }
  if (role === "teacher") allowed.add("teachers");
  if (role === "volunteer") allowed.add("volunteers");
  if (role === "student") allowed.add("students");
  return announcements.filter((a) => allowed.has(a.audience));
}

export async function listAnnouncementsForRole(
  _role: UserRole | null,
): Promise<AnnouncementFeedItem[]> {
  return withSupabase(async () => {
    if (!supabase) throw new Error("No supabase");
    const { data, error } = await supabase
      .from("announcements")
      .select("id,title,body,audience,event_id,created_at,deleted_at, events(name)")
      .is("deleted_at", null)
      .order("created_at", { ascending: false })
      .returns<AnnouncementRowWithEvent[]>();
    if (error) throw error;
    return (data ?? []).map(toAnnouncementFeedItem);
  }, async () => []);
}

/** Recent visible announcements for header + /announcements (RLS scopes by role + event registration). */
export async function listAnnouncementFeedForRole(
  _role: UserRole | null,
  limit = 50,
): Promise<AnnouncementFeedItem[]> {
  return withSupabase(async () => {
    if (!supabase) throw new Error("No supabase");
    const { data, error } = await supabase
      .from("announcements")
      .select("id,title,body,audience,event_id,created_at,deleted_at, events(name)")
      .is("deleted_at", null)
      .order("created_at", { ascending: false })
      .limit(Math.min(limit, 100))
      .returns<AnnouncementRowWithEvent[]>();
    if (error) throw error;
    return (data ?? []).map(toAnnouncementFeedItem);
  }, async () => []);
}

export async function listAllAnnouncements() {
  return withSupabase(async () => {
    if (!supabase) throw new Error("No supabase");
    const { data, error } = await supabase
      .from("announcements")
      .select("id,title,body,audience,event_id,created_at,deleted_at")
      .order("created_at", { ascending: false })
      .returns<AnnouncementRow[]>();
    if (error) throw error;
    return (data ?? []).map(toAnnouncementRecord);
  }, async () => []);
}

export async function createAnnouncement(
  input: Omit<AnnouncementRecord, "id" | "createdAt" | "deletedAt">,
) {
  return withSupabase(async () => {
    if (!supabase) throw new Error("No supabase");
    const { data, error } = await supabase
      .from("announcements")
      .insert({
        title: input.title,
        body: input.body,
        audience: input.audience,
        event_id: input.eventId,
      })
      .select("id,title,body,audience,event_id,created_at,deleted_at")
      .single<AnnouncementRow>();
    if (error) throw error;
    return toAnnouncementRecord(data);
  }, async () => ({
    ...input,
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
    deletedAt: null,
  }));
}

export async function updateAnnouncement(
  announcementId: string,
  patch: { title?: string; body?: string; audience?: AnnouncementAudience },
) {
  return withSupabase(async () => {
    if (!supabase) throw new Error("No supabase");
    const updates: Record<string, unknown> = {};
    if (patch.title !== undefined) updates.title = patch.title;
    if (patch.body !== undefined) updates.body = patch.body;
    if (patch.audience !== undefined) updates.audience = patch.audience;
    if (Object.keys(updates).length === 0) return null;
    const { data, error } = await supabase
      .from("announcements")
      .update(updates)
      .eq("id", announcementId)
      .select("id,title,body,audience,event_id,created_at,deleted_at")
      .single<AnnouncementRow>();
    if (error) throw error;
    return toAnnouncementRecord(data);
  }, async () => null);
}

/** Soft-delete; row is removed from participant views until permanently deleted after ~30 days. */
export async function softDeleteAnnouncement(announcementId: string) {
  return withSupabase(async () => {
    if (!supabase) throw new Error("No supabase");
    const { error } = await supabase
      .from("announcements")
      .update({ deleted_at: new Date().toISOString() })
      .eq("id", announcementId);
    if (error) throw error;
  }, async () => undefined);
}

export async function restoreAnnouncement(announcementId: string) {
  return withSupabase(async () => {
    if (!supabase) throw new Error("No supabase");
    const { error } = await supabase
      .from("announcements")
      .update({ deleted_at: null })
      .eq("id", announcementId);
    if (error) throw error;
  }, async () => undefined);
}

/** Permanently remove announcements soft-deleted more than 30 days ago (run periodically or on admin load). */
export async function purgeExpiredSoftDeletedAnnouncements(): Promise<number> {
  return withSupabase(async () => {
    if (!supabase) throw new Error("No supabase");
    const cutoff = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    const { data, error } = await supabase
      .from("announcements")
      .delete()
      .not("deleted_at", "is", null)
      .lt("deleted_at", cutoff)
      .select("id");
    if (error) throw error;
    return (data ?? []).length;
  }, async () => 0);
}

/** Admin: hard-delete one announcement (and comments via FK). */
export async function permanentlyDeleteAnnouncement(announcementId: string) {
  return withSupabase(async () => {
    if (!supabase) throw new Error("No supabase");
    const { error } = await supabase
      .from("announcements")
      .delete()
      .eq("id", announcementId);
    if (error) throw error;
  }, async () => undefined);
}

/** Admin: soft-deleted rows for one event (trash). */
export async function listSoftDeletedAnnouncementsForEvent(
  eventId: string,
): Promise<AnnouncementRecord[]> {
  return withSupabase(async () => {
    if (!supabase) throw new Error("No supabase");
    const { data, error } = await supabase
      .from("announcements")
      .select("id,title,body,audience,event_id,created_at,deleted_at")
      .eq("event_id", eventId)
      .not("deleted_at", "is", null)
      .order("deleted_at", { ascending: false })
      .returns<AnnouncementRow[]>();
    if (error) throw error;
    return (data ?? []).map(toAnnouncementRecord);
  }, async () => []);
}

/** Admin: all soft-deleted announcements (site-wide trash). */
export async function listSoftDeletedAnnouncementsAll(): Promise<
  AnnouncementFeedItem[]
> {
  return withSupabase(async () => {
    if (!supabase) throw new Error("No supabase");
    const { data, error } = await supabase
      .from("announcements")
      .select("id,title,body,audience,event_id,created_at,deleted_at, events(name)")
      .not("deleted_at", "is", null)
      .order("deleted_at", { ascending: false })
      .returns<AnnouncementRowWithEvent[]>();
    if (error) throw error;
    return (data ?? []).map(toAnnouncementFeedItem);
  }, async () => []);
}

export type AnnouncementCommentVisibility = "public" | "private";

export type AnnouncementCommentRecord = {
  id: string;
  announcementId: string;
  parentId: string | null;
  authorId: string;
  authorEmail: string | null;
  authorName: string | null;
  /** Profile role at post time (for badges, e.g. admin). */
  authorRole: string;
  body: string;
  visibility: AnnouncementCommentVisibility;
  createdAt: string;
};

type AnnouncementCommentRow = {
  id: string;
  announcement_id: string;
  parent_id: string | null;
  author_id: string;
  author_email: string;
  author_display_name: string;
  author_role: string;
  body: string;
  visibility: AnnouncementCommentVisibility;
  created_at: string;
};

function toAnnouncementCommentRecord(
  row: AnnouncementCommentRow,
): AnnouncementCommentRecord {
  return {
    id: row.id,
    announcementId: row.announcement_id,
    parentId: row.parent_id,
    authorId: row.author_id,
    authorEmail: row.author_email?.trim() || null,
    authorName: row.author_display_name?.trim() || null,
    authorRole: row.author_role?.trim() || "teacher",
    body: row.body,
    visibility: row.visibility,
    createdAt: row.created_at,
  };
}

export async function listAnnouncementComments(
  announcementId: string,
): Promise<AnnouncementCommentRecord[]> {
  return withSupabase(async () => {
    if (!supabase) throw new Error("No supabase");
    const { data, error } = await supabase
      .from("announcement_comments")
      .select(
        "id, announcement_id, parent_id, author_id, author_email, author_display_name, author_role, body, visibility, created_at",
      )
      .eq("announcement_id", announcementId)
      .order("created_at", { ascending: true })
      .returns<AnnouncementCommentRow[]>();
    if (error) throw error;
    return (data ?? []).map(toAnnouncementCommentRecord);
  }, async () => []);
}

export async function addAnnouncementComment(input: {
  announcementId: string;
  parentId: string | null;
  body: string;
  visibility: AnnouncementCommentVisibility;
  /** Must match the signed-in user (RLS enforces author_id = auth.uid()). */
  authorId: string;
}): Promise<AnnouncementCommentRecord> {
  return withSupabase(async () => {
    if (!supabase) throw new Error("No supabase");
    if (!input.authorId.trim()) {
      throw new Error("Must be signed in to comment");
    }

    const { data, error } = await supabase
      .from("announcement_comments")
      .insert({
        announcement_id: input.announcementId,
        parent_id: input.parentId,
        author_id: input.authorId,
        body: input.body.trim(),
        visibility: input.visibility,
      })
      .select(
        "id, announcement_id, parent_id, author_id, author_email, author_display_name, author_role, body, visibility, created_at",
      )
      .single<AnnouncementCommentRow>();
    if (error) throw error;
    return toAnnouncementCommentRecord(data);
  }, async () => {
    throw new Error("Comments require Supabase");
  });
}

export async function deleteAnnouncementComment(commentId: string) {
  return withSupabase(async () => {
    if (!supabase) throw new Error("No supabase");
    const { error } = await supabase
      .from("announcement_comments")
      .delete()
      .eq("id", commentId);
    if (error) throw error;
  }, async () => undefined);
}

/**
 * Teacher has submitted or approved registration for this event (eligible for event-scoped
 * teacher/public announcements in the participant workspace).
 */
export async function teacherHasSubmittedRegistrationForEvent(
  eventId: string,
): Promise<boolean> {
  return withSupabase(async () => {
    if (!supabase) throw new Error("No supabase");
    const { data: auth } = await supabase.auth.getUser();
    const uid = auth.user?.id;
    if (!uid) return false;
    const { data, error } = await supabase
      .from("registrations")
      .select("id")
      .eq("event_id", eventId)
      .eq("teacher_id", uid)
      .in("status", ["submitted", "approved"])
      .maybeSingle();
    if (error) throw error;
    return Boolean(data);
  }, async () => false);
}

/**
 * Whether this account should see the in-workspace announcement feed for this event:
 * admins (preview), teachers with submitted/approved registration, or students/volunteers
 * with an event announcement subscription.
 */
export async function participantCanViewEventScopedAnnouncements(
  eventId: string,
  role: UserRole | null,
  isAuthenticated: boolean,
): Promise<boolean> {
  if (!isAuthenticated || !role) return false;
  if (role === "admin") return true;
  if (role === "teacher") {
    return teacherHasSubmittedRegistrationForEvent(eventId);
  }
  if (role === "student" || role === "volunteer") {
    return getEventAnnouncementSubscription(eventId);
  }
  return false;
}

/** Announcements tied to one event, after RLS + role-based audience filter. */
export async function listAnnouncementFeedForEvent(
  eventId: string,
  role: UserRole | null,
  limit = 40,
): Promise<AnnouncementFeedItem[]> {
  return withSupabase(async () => {
    if (!supabase) throw new Error("No supabase");
    const { data, error } = await supabase
      .from("announcements")
      .select("id,title,body,audience,event_id,created_at,deleted_at, events(name)")
      .eq("event_id", eventId)
      .is("deleted_at", null)
      .order("created_at", { ascending: false })
      .limit(Math.min(limit, 80))
      .returns<AnnouncementRowWithEvent[]>();
    if (error) throw error;
    const items = (data ?? []).map(toAnnouncementFeedItem);
    return filterAnnouncementsByRole(items, role);
  }, async () => []);
}

/** localStorage: user chose “stop receiving” for this event — blocks client auto opt-in until they subscribe again. */
function eventAnnouncementOptOutStorageKey(eventId: string) {
  return `teachidaho:event_ann_opt_out:${eventId}`;
}

export function isEventAnnouncementLocallyDeclined(eventId: string): boolean {
  if (typeof window === "undefined") return false;
  return window.localStorage.getItem(eventAnnouncementOptOutStorageKey(eventId)) === "1";
}

function markEventAnnouncementLocallyDeclined(eventId: string) {
  if (typeof window !== "undefined") {
    window.localStorage.setItem(eventAnnouncementOptOutStorageKey(eventId), "1");
  }
}

function clearEventAnnouncementLocallyDeclined(eventId: string) {
  if (typeof window !== "undefined") {
    window.localStorage.removeItem(eventAnnouncementOptOutStorageKey(eventId));
  }
}

/** Whether the current user is subscribed to event-scoped student/volunteer announcements. */
export async function getEventAnnouncementSubscription(
  eventId: string,
): Promise<boolean> {
  return withSupabase(async () => {
    if (!supabase) throw new Error("No supabase");
    const { data: userData, error: userErr } = await supabase.auth.getUser();
    if (userErr) throw userErr;
    const uid = userData.user?.id;
    if (!uid) return false;
    const { data, error } = await supabase
      .from("event_announcement_subscriptions")
      .select("user_id")
      .eq("event_id", eventId)
      .eq("user_id", uid)
      .maybeSingle();
    if (error) throw error;
    return Boolean(data);
  }, async () => false);
}

export async function subscribeToEventAnnouncements(eventId: string) {
  return withSupabase(async () => {
    if (!supabase) throw new Error("No supabase");
    const { data: userData, error: userErr } = await supabase.auth.getUser();
    if (userErr) throw userErr;
    const uid = userData.user?.id;
    if (!uid) throw new Error("Must be signed in");
    const { error } = await supabase
      .from("event_announcement_subscriptions")
      .upsert(
        { user_id: uid, event_id: eventId },
        { onConflict: "user_id,event_id" },
      );
    if (error) throw error;
    clearEventAnnouncementLocallyDeclined(eventId);
  }, async () => {
    throw new Error("Subscriptions require Supabase");
  });
}

export async function unsubscribeFromEventAnnouncements(eventId: string) {
  return withSupabase(async () => {
    if (!supabase) throw new Error("No supabase");
    const { data: userData, error: userErr } = await supabase.auth.getUser();
    if (userErr) throw userErr;
    const uid = userData.user?.id;
    if (!uid) throw new Error("Must be signed in");
    const { error } = await supabase
      .from("event_announcement_subscriptions")
      .delete()
      .eq("event_id", eventId)
      .eq("user_id", uid);
    if (error) throw error;
    markEventAnnouncementLocallyDeclined(eventId);
  }, async () => {
    throw new Error("Subscriptions require Supabase");
  });
}

export async function listFormDefinitions() {
  return withSupabase(async () => {
    if (!supabase) throw new Error("No supabase");
    const { data, error } = await supabase
      .from("form_definitions")
      .select(
        "id,form_key,title,description,event_id,audience,fields,version,is_active",
      )
      .eq("scope", "registration")
      .order("version", { ascending: false })
      .returns<FormDefinitionRow[]>();
    if (error) throw error;
    return (data ?? []).map(toFormDefinitionRecord);
  }, async () => []);
}

export async function getRegistrationFormForEvent(eventId: string | null) {
  const defs = await listFormDefinitions();
  const activeDefs = defs.filter((form) => form.isActive);
  const eventSpecific = activeDefs.find((form) => form.eventId === eventId);
  const picked =
    eventSpecific ?? activeDefs.find((form) => form.key === "teacher-registration") ?? null;
  return picked ? normalizeParticipantRegistrationForm(picked) : null;
}

export async function saveFormDefinition(
  input: Omit<FormDefinitionRecord, "id" | "version">,
) {
  return withSupabase(async () => {
    if (!supabase) throw new Error("No supabase");
    const { data, error } = await supabase
      .from("form_definitions")
      .insert({
        event_id: input.eventId,
        scope: "registration",
        form_key: input.key,
        title: input.title,
        description: input.description ?? null,
        audience: input.audience,
        fields: input.fields,
        version: 1,
        is_active: input.isActive,
      })
      .select(
        "id,form_key,title,description,event_id,audience,fields,version,is_active",
      )
      .single<FormDefinitionRow>();
    if (error) throw error;
    return toFormDefinitionRecord(data);
  }, async () => ({
    ...input,
    id: crypto.randomUUID(),
    version: 1,
  }));
}

export async function submitForm(
  input: Omit<FormSubmissionRecord, "id" | "createdAt" | "status">,
) {
  return withSupabase<FormSubmissionRecord>(async () => {
    if (!supabase) throw new Error("No supabase");

    const { data: authData } = await supabase.auth.getUser();
    const userId = authData.user?.id;
    if (!userId) throw new Error("User must be signed in");

    const customFields = input.payload;
    const schoolName = String(customFields.schoolName ?? "Unknown School");
    const className = null;
    /** Teacher form notes live in custom_fields only; teacher_notes column is admin-internal. */
    const { data: existingReg } = await supabase
      .from("registrations")
      .select("teacher_notes")
      .eq("event_id", input.eventId)
      .eq("teacher_id", userId)
      .maybeSingle<{ teacher_notes: string | null }>();

    const { data, error } = await supabase
      .from("registrations")
      .upsert(
        {
          event_id: input.eventId,
          teacher_id: userId,
          status: "submitted",
          school_name: schoolName,
          class_name: className,
          teacher_notes: existingReg?.teacher_notes ?? null,
          custom_fields: customFields,
          submitted_at: new Date().toISOString(),
        },
        { onConflict: "event_id,teacher_id" },
      )
      .select(
        "id,event_id,teacher_id,status,school_name,class_name,teacher_notes,custom_fields,submitted_at,created_at",
      )
      .single<RegistrationRow>();
    if (error) throw error;

    return {
      id: data.id,
      formDefinitionId: input.formDefinitionId,
      eventId: data.event_id as string | null,
      submittedBy: input.submittedBy,
      payload: data.custom_fields,
      status: toSubmissionStatus(data.status),
      createdAt: data.created_at,
    };
  }, async () => ({
    ...input,
    id: crypto.randomUUID(),
    status: "pending" as SubmissionStatus,
    createdAt: new Date().toISOString(),
  }));
}

export async function listFormSubmissions() {
  return withSupabase(async () => {
    if (!supabase) throw new Error("No supabase");
    const { data, error } = await supabase
      .from("registrations")
      .select(
        "id,event_id,teacher_id,status,school_name,class_name,teacher_notes,custom_fields,submitted_at,created_at,profiles(email)",
      )
      .order("created_at", { ascending: false })
      .returns<RegistrationRow[]>();
    if (error) throw error;

    return (data ?? []).map((row) => ({
      id: row.id,
      formDefinitionId: "teacher-registration",
      eventId: row.event_id,
      submittedBy: row.profiles?.email ?? row.teacher_id,
      payload: row.custom_fields,
      status: toSubmissionStatus(row.status),
      createdAt: row.created_at,
    }));
  }, async () => []);
}

export async function updateSubmissionStatus(
  submissionId: string,
  status: SubmissionStatus,
) {
  return withSupabase(async () => {
    if (!supabase) throw new Error("No supabase");
    const { error } = await supabase
      .from("registrations")
      .update({
        status: fromSubmissionStatus(status),
        reviewed_at: new Date().toISOString(),
      })
      .eq("id", submissionId);
    if (error) throw error;
  }, async () => undefined);
}

export async function listMemberships() {
  return withSupabase(async () => {
    if (!supabase) throw new Error("No supabase");
    const { data, error } = await supabase
      .from("registrations")
      .select("id,event_id,teacher_id,created_at,status")
      .eq("status", "approved");
    if (error) throw error;
    return (data ?? []).map((row) => ({
      id: row.id,
      eventId: row.event_id,
      personIdentifier: row.teacher_id,
      sourceSubmissionId: row.id,
      createdAt: row.created_at,
    }));
  }, async () => []);
}

export async function listScores() {
  return withSupabase(async () => {
    if (!supabase) throw new Error("No supabase");
    const { data, error } = await supabase
      .from("teams")
      .select("id,registration_id,team_name,score,ranking_note,created_at,registrations(event_id)")
      .not("score", "is", null)
      .order("created_at", { ascending: false })
      .returns<TeamRow[]>();
    if (error) throw error;

    return (data ?? []).map((row) => ({
      id: row.id,
      eventId: row.registrations?.event_id ?? "",
      teamName: row.team_name,
      score: row.score ?? 0,
      note: row.ranking_note ?? "",
      createdAt: row.created_at,
    }));
  }, async () => []);
}

type ProfileAdminRow = {
  id: string;
  email: string;
  full_name: string | null;
  role: UserRole;
  school_name: string | null;
  created_at: string;
};

function toAdminProfileRecord(row: ProfileAdminRow): AdminProfileRecord {
  return {
    id: row.id,
    email: row.email,
    fullName: row.full_name,
    role: row.role,
    schoolName: row.school_name,
    createdAt: row.created_at,
  };
}

/** All profiles (admin only via RLS). */
export async function listAdminProfiles(): Promise<AdminProfileRecord[]> {
  return withSupabase(async () => {
    if (!supabase) throw new Error("No supabase");
    const { data, error } = await supabase
      .from("profiles")
      .select("id,email,full_name,role,school_name,created_at")
      .order("created_at", { ascending: false })
      .returns<ProfileAdminRow[]>();
    if (error) throw error;
    return (data ?? []).map(toAdminProfileRecord);
  }, async () => []);
}

export async function adminSetUserRole(userId: string, role: UserRole) {
  return withSupabase(async () => {
    if (!supabase) throw new Error("No supabase");
    const { error } = await supabase
      .from("profiles")
      .update({ role })
      .eq("id", userId);
    if (error) throw error;
  }, async () => undefined);
}

export async function addScore(input: Omit<ScoreRecord, "id" | "createdAt">) {
  return withSupabase(async () => {
    if (!supabase) throw new Error("No supabase");
    const { data: authData } = await supabase.auth.getUser();
    const userId = authData.user?.id;
    if (!userId) throw new Error("User must be signed in");

    const { data: registration, error: regError } = await supabase
      .from("registrations")
      .upsert(
        {
          event_id: input.eventId,
          teacher_id: userId,
          status: "approved",
          school_name: "Admin Scoring",
          class_name: null,
          teacher_notes: "Auto-created for score tracking.",
          custom_fields: {},
        },
        { onConflict: "event_id,teacher_id" },
      )
      .select("id")
      .single<{ id: string }>();
    if (regError) throw regError;

    const { data: existingTeam, error: existingTeamError } = await supabase
      .from("teams")
      .select("id")
      .eq("registration_id", registration.id)
      .eq("team_name", input.teamName)
      .maybeSingle<{ id: string }>();
    if (existingTeamError) throw existingTeamError;

    if (existingTeam) {
      const { data: updated, error: updateError } = await supabase
        .from("teams")
        .update({ score: input.score, ranking_note: input.note })
        .eq("id", existingTeam.id)
        .select("id,team_name,score,ranking_note,created_at")
        .single<{ id: string; team_name: string; score: number; ranking_note: string | null; created_at: string }>();
      if (updateError) throw updateError;
      return {
        id: updated.id,
        eventId: input.eventId,
        teamName: updated.team_name,
        score: updated.score,
        note: updated.ranking_note ?? "",
        createdAt: updated.created_at,
      };
    }

    const { data, error } = await supabase
      .from("teams")
      .insert({
        registration_id: registration.id,
        team_name: input.teamName,
        score: input.score,
        ranking_note: input.note,
      })
      .select("id,team_name,score,ranking_note,created_at")
      .single<{ id: string; team_name: string; score: number; ranking_note: string | null; created_at: string }>();
    if (error) throw error;

    return {
      id: data.id,
      eventId: input.eventId,
      teamName: data.team_name,
      score: data.score,
      note: data.ranking_note ?? "",
      createdAt: data.created_at,
    };
  }, async () => ({
    ...input,
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
  }));
}
