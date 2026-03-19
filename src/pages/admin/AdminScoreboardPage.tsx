import { useEffect, useMemo, useState } from "react";
import {
  addScore,
  listEvents,
  listScores,
  type EventRecord,
  type ScoreRecord,
} from "../../lib/appDataStore";

type ScoreForm = {
  eventId: string;
  teamName: string;
  score: string;
  note: string;
};

const initialForm: ScoreForm = {
  eventId: "",
  teamName: "",
  score: "",
  note: "",
};

export function AdminScoreboardPage() {
  const [events, setEvents] = useState<EventRecord[]>([]);
  const [scores, setScores] = useState<ScoreRecord[]>([]);
  const [form, setForm] = useState<ScoreForm>(initialForm);

  async function loadData() {
    const [nextEvents, nextScores] = await Promise.all([listEvents(), listScores()]);
    setEvents(nextEvents);
    setScores(nextScores);
    if (!form.eventId && nextEvents.length > 0) {
      setForm((current) => ({ ...current, eventId: nextEvents[0].id }));
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await addScore({
      eventId: form.eventId,
      teamName: form.teamName,
      score: Number(form.score),
      note: form.note,
    });
    setForm((current) => ({
      ...current,
      teamName: "",
      score: "",
      note: "",
    }));
    await loadData();
  }

  const eventNames = useMemo(() => {
    return new Map(events.map((event) => [event.id, event.name]));
  }, [events]);

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h1 className="text-2xl font-black tracking-tight text-slate-900">
          Scoreboard
        </h1>
        <p className="mt-1 text-sm text-slate-600">
          Track scores by team for each event and keep a running feed.
        </p>
      </div>
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-bold text-slate-900">Add score entry</h2>
        <form className="mt-4 grid gap-3 md:grid-cols-2" onSubmit={handleSubmit}>
          <select
            required
            value={form.eventId}
            onChange={(event) =>
              setForm((current) => ({ ...current, eventId: event.target.value }))
            }
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
          >
            {events.map((eventItem) => (
              <option key={eventItem.id} value={eventItem.id}>
                {eventItem.name}
              </option>
            ))}
          </select>
          <input
            required
            value={form.teamName}
            onChange={(event) =>
              setForm((current) => ({ ...current, teamName: event.target.value }))
            }
            placeholder="Team name"
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
          />
          <input
            required
            type="number"
            value={form.score}
            onChange={(event) =>
              setForm((current) => ({ ...current, score: event.target.value }))
            }
            placeholder="Score"
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
          />
          <input
            value={form.note}
            onChange={(event) =>
              setForm((current) => ({ ...current, note: event.target.value }))
            }
            placeholder="Notes"
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
          />
          <div className="md:col-span-2">
            <button
              type="submit"
              className="rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-700"
            >
              Save score
            </button>
          </div>
        </form>
      </div>
      <div className="space-y-3">
        {scores.map((entry) => (
          <article
            key={entry.id}
            className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
          >
            <h3 className="text-lg font-bold text-slate-900">{entry.teamName}</h3>
            <p className="text-sm text-slate-600">{eventNames.get(entry.eventId)}</p>
            <p className="mt-2 text-2xl font-black text-slate-900">{entry.score}</p>
            {entry.note && <p className="mt-1 text-sm text-slate-600">{entry.note}</p>}
          </article>
        ))}
      </div>
    </div>
  );
}
