"use client";
import { useOptimistic, useRef, useState, useTransition } from "react";
import { createTask, deleteTask, setTaskStatus, updateTask } from "@/app/actions";
import { dueLabel } from "@/lib/dates";
import { PRIORITY_LABEL, TASK_STATUS_LABEL, type Profile, type Task, type TaskStatus } from "@/lib/types";
import { BottomSheet } from "./BottomSheet";
import { PlusIcon } from "./Icons";

type Member = Pick<Profile, "id" | "full_name" | "email">;

const toneClass = {
  late: "bg-red-50 text-red-700",
  soon: "bg-amber-50 text-amber-700",
  ok: "bg-stone-100 text-stone-600",
  none: "bg-stone-50 text-stone-400",
};

export function TaskList({ storeId, tasks, team }: { storeId: string; tasks: Task[]; team: Member[] }) {
  const [showDone, setShowDone] = useState(false);
  const [editing, setEditing] = useState<Task | null>(null);
  const [optimistic, setOptimistic] = useOptimistic(tasks, (state, u: { id: string; status: TaskStatus }) =>
    state.map((t) => (t.id === u.id ? { ...t, status: u.status } : t))
  );
  const [, start] = useTransition();

  const open = optimistic.filter((t) => t.status !== "fatto");
  const done = optimistic.filter((t) => t.status === "fatto");
  const memberName = (id: string | null) => {
    const m = team.find((x) => x.id === id);
    return m ? m.full_name || m.email : null;
  };

  function toggle(t: Task) {
    const status: TaskStatus = t.status === "fatto" ? "da_fare" : "fatto";
    start(async () => {
      setOptimistic({ id: t.id, status });
      await setTaskStatus(t.id, storeId, status);
    });
  }

  return (
    <div className="space-y-3">
      <AddTaskForm storeId={storeId} team={team} />

      <div className="card divide-y divide-stone-100 overflow-hidden">
        {open.length === 0 && <p className="p-6 text-center text-sm text-stone-500">Niente da fare qui 🎉</p>}
        {open.map((t) => (
          <TaskRow key={t.id} t={t} assignee={memberName(t.assigned_to)} onToggle={() => toggle(t)} onOpen={() => setEditing(t)} />
        ))}
      </div>

      {done.length > 0 && (
        <div>
          <button className="btn-ghost w-full text-sm text-stone-500" onClick={() => setShowDone((v) => !v)}>
            {showDone ? "Nascondi" : "Mostra"} completate ({done.length})
          </button>
          {showDone && (
            <div className="card mt-2 divide-y divide-stone-100 overflow-hidden">
              {done.map((t) => (
                <TaskRow key={t.id} t={t} assignee={memberName(t.assigned_to)} onToggle={() => toggle(t)} onOpen={() => setEditing(t)} />
              ))}
            </div>
          )}
        </div>
      )}

      <BottomSheet open={!!editing} onClose={() => setEditing(null)} title="Modifica attività">
        {editing && <EditTaskForm t={editing} storeId={storeId} team={team} onDone={() => setEditing(null)} />}
      </BottomSheet>
    </div>
  );
}

function AddTaskForm({ storeId, team }: { storeId: string; team: Member[] }) {
  const formRef = useRef<HTMLFormElement>(null);
  const [expanded, setExpanded] = useState(false);
  const [pending, setPending] = useState(false);

  return (
    <form
      ref={formRef}
      action={async (fd) => {
        setPending(true);
        await createTask(storeId, fd);
        formRef.current?.reset();
        setPending(false);
      }}
      className="card space-y-2 p-2.5"
    >
      <div className="flex gap-2">
        <input
          name="title"
          required
          placeholder="Aggiungi una cosa da fare…"
          className="input flex-1"
          onFocus={() => setExpanded(true)}
          enterKeyHint="done"
        />
        <button className="btn-primary aspect-square px-0 md:aspect-auto md:px-3" disabled={pending} aria-label="Aggiungi">
          <PlusIcon className="h-5 w-5" />
          <span className="hidden md:inline">Aggiungi</span>
        </button>
      </div>
      <div className={`grid grid-cols-2 gap-2 md:grid md:grid-cols-3 ${expanded ? "" : "hidden md:grid"}`}>
        <label className="col-span-2 md:col-span-1">
          <span className="label">Scadenza</span>
          <input type="date" name="due_date" className="input" />
        </label>
        <label>
          <span className="label">Priorità</span>
          <select name="priority" defaultValue="2" className="input">
            <option value="1">Alta</option>
            <option value="2">Media</option>
            <option value="3">Bassa</option>
          </select>
        </label>
        <label>
          <span className="label">Chi</span>
          <select name="assigned_to" defaultValue="" className="input">
            <option value="">Tutto il team</option>
            {team.map((m) => (
              <option key={m.id} value={m.id}>{m.full_name || m.email}</option>
            ))}
          </select>
        </label>
      </div>
    </form>
  );
}

function TaskRow({ t, assignee, onToggle, onOpen }: { t: Task; assignee: string | null; onToggle: () => void; onOpen: () => void }) {
  const due = dueLabel(t.due_date);
  const isDone = t.status === "fatto";

  return (
    <div className="flex items-stretch">
      <button
        onClick={onToggle}
        className="flex w-14 shrink-0 items-start justify-center pt-3.5"
        aria-label={isDone ? "Segna da fare" : "Segna come fatta"}
      >
        <span
          className={`flex h-6 w-6 items-center justify-center rounded-full border-2 transition ${
            isDone ? "border-brand-600 bg-brand-600 text-white" : t.priority === 1 ? "border-red-400" : "border-stone-300"
          }`}
        >
          {isDone && (
            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={3}>
              <path d="m5 12 5 5L20 7" />
            </svg>
          )}
        </span>
      </button>
      <button className="min-w-0 flex-1 py-3 pr-3 text-left active:bg-stone-50" onClick={onOpen}>
        <div className={`font-medium leading-snug ${isDone ? "text-stone-400 line-through" : ""}`}>{t.title}</div>
        {t.notes && <div className="line-clamp-2 text-sm text-stone-500">{t.notes}</div>}
        <div className="mt-1.5 flex flex-wrap gap-1.5 text-xs">
          {!isDone && <span className={`rounded-md px-1.5 py-0.5 ${toneClass[due.tone]}`}>{due.text}</span>}
          {t.priority !== 2 && (
            <span className={`rounded-md px-1.5 py-0.5 ${t.priority === 1 ? "bg-red-50 text-red-700" : "bg-stone-100 text-stone-500"}`}>
              {PRIORITY_LABEL[t.priority]}
            </span>
          )}
          {t.status === "in_corso" && <span className="rounded-md bg-blue-50 px-1.5 py-0.5 text-blue-700">{TASK_STATUS_LABEL.in_corso}</span>}
          {assignee && <span className="rounded-md bg-stone-100 px-1.5 py-0.5 text-stone-600">👤 {assignee}</span>}
        </div>
      </button>
    </div>
  );
}

function EditTaskForm({ t, storeId, team, onDone }: { t: Task; storeId: string; team: Member[]; onDone: () => void }) {
  const [pending, setPending] = useState(false);
  return (
    <form
      action={async (fd) => {
        setPending(true);
        await updateTask(t.id, storeId, fd);
        onDone();
      }}
      className="space-y-3"
    >
      <div>
        <label className="label">Attività</label>
        <input name="title" defaultValue={t.title} required className="input" />
      </div>
      <div>
        <label className="label">Note</label>
        <textarea name="notes" defaultValue={t.notes ?? ""} rows={3} className="input" />
      </div>
      <div>
        <span className="label">Stato</span>
        <div className="grid grid-cols-3 gap-1 rounded-xl bg-stone-100 p-1">
          {(["da_fare", "in_corso", "fatto"] as const).map((st) => (
            <label key={st} className="cursor-pointer">
              <input type="radio" name="status" value={st} defaultChecked={t.status === st} className="peer sr-only" />
              <span className="block rounded-lg py-2 text-center text-sm text-stone-600 peer-checked:bg-white peer-checked:font-medium peer-checked:text-stone-900 peer-checked:shadow-sm">
                {TASK_STATUS_LABEL[st]}
              </span>
            </label>
          ))}
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="col-span-2 sm:col-span-1">
          <label className="label">Scadenza</label>
          <input type="date" name="due_date" defaultValue={t.due_date ?? ""} className="input" />
        </div>
        <div>
          <label className="label">Priorità</label>
          <select name="priority" defaultValue={String(t.priority)} className="input">
            <option value="1">Alta</option>
            <option value="2">Media</option>
            <option value="3">Bassa</option>
          </select>
        </div>
        <div>
          <label className="label">Assegnata a</label>
          <select name="assigned_to" defaultValue={t.assigned_to ?? ""} className="input">
            <option value="">Tutto il team</option>
            {team.map((m) => (
              <option key={m.id} value={m.id}>{m.full_name || m.email}</option>
            ))}
          </select>
        </div>
      </div>
      <button className="btn-primary w-full" disabled={pending}>{pending ? "Salvo…" : "Salva"}</button>
      <button
        type="button"
        className="btn-danger w-full"
        onClick={async () => {
          if (!confirm("Eliminare questa attività?")) return;
          await deleteTask(t.id, storeId);
          onDone();
        }}
      >
        Elimina attività
      </button>
    </form>
  );
}
