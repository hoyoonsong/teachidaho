import type { UserRole } from "../types/auth";
import type { DynamicFormDefinition, FormSubmissionPayload } from "../types/forms";
import { hasSupabaseCredentials, supabase } from "./supabase";

export type EventStatus = "draft" | "published" | "active" | "closed" | "archived";
export type AnnouncementAudience =
  | "public"
  | "teachers"
  | "volunteers"
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

export type AnnouncementRecord = {
  id: string;
  title: string;
  body: string;
  audience: AnnouncementAudience;
  eventId: string | null;
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
};

type FormDefinitionRow = {
  id: string;
  form_key: string;
  title: string;
  description: string | null;
  event_id: string | null;
  audience: "teachers" | "volunteers" | "public";
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

function parseScoreboardFromSettings(
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
  const scoreboard = parseScoreboardFromSettings(row.custom_settings);
  return {
    id: row.id,
    name: row.name,
    additionalInfo: row.summary,
    eventDate:
      row.custom_settings?.dateLabel ?? formatDateOnly(row.start_date ?? row.end_date),
    location: row.location ?? "TBD",
    registrationDeadline: formatDateOnly(row.registration_deadline),
    status: row.status,
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
  };
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
    return await query();
  } catch (error) {
    console.warn("Supabase query failed, returning fallback.", error);
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
    }));
  }, async () => []);
}

export async function listAnnouncementsForEvent(eventId: string) {
  return withSupabase(async () => {
    if (!supabase) throw new Error("No supabase");
    const { data, error } = await supabase
      .from("announcements")
      .select("id,title,body,audience,event_id,created_at")
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
export function filterAnnouncementsByRole(
  announcements: AnnouncementRecord[],
  role: UserRole | null,
): AnnouncementRecord[] {
  const allowed = new Set<AnnouncementAudience>(["public"]);
  if (role === "admin") {
    allowed.add("admins");
    allowed.add("teachers");
    allowed.add("volunteers");
  }
  if (role === "teacher") allowed.add("teachers");
  if (role === "volunteer") allowed.add("volunteers");
  return announcements.filter((a) => allowed.has(a.audience));
}

export async function listAnnouncementsForRole(role: UserRole | null) {
  return withSupabase(async () => {
    if (!supabase) throw new Error("No supabase");
    const { data, error } = await supabase
      .from("announcements")
      .select("id,title,body,audience,event_id,created_at")
      .order("created_at", { ascending: false })
      .returns<AnnouncementRow[]>();
    if (error) throw error;
    return filterAnnouncementsByRole((data ?? []).map(toAnnouncementRecord), role);
  }, async () => []);
}

export async function listAllAnnouncements() {
  return withSupabase(async () => {
    if (!supabase) throw new Error("No supabase");
    const { data, error } = await supabase
      .from("announcements")
      .select("id,title,body,audience,event_id,created_at")
      .order("created_at", { ascending: false })
      .returns<AnnouncementRow[]>();
    if (error) throw error;
    return (data ?? []).map(toAnnouncementRecord);
  }, async () => []);
}

export async function createAnnouncement(
  input: Omit<AnnouncementRecord, "id" | "createdAt">,
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
      .select("id,title,body,audience,event_id,created_at")
      .single<AnnouncementRow>();
    if (error) throw error;
    return toAnnouncementRecord(data);
  }, async () => ({
    ...input,
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
  }));
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
  if (eventSpecific) return eventSpecific;
  return activeDefs.find((form) => form.key === "teacher-registration") ?? null;
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
    const className =
      customFields.gradeBand !== undefined ? String(customFields.gradeBand) : null;
    const teacherNotes =
      customFields.notes !== undefined ? String(customFields.notes) : null;

    const { data, error } = await supabase
      .from("registrations")
      .upsert(
        {
          event_id: input.eventId,
          teacher_id: userId,
          status: "submitted",
          school_name: schoolName,
          class_name: className,
          teacher_notes: teacherNotes,
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
