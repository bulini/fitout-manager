"use client";
import { useOptimistic, useRef, useState, useTransition } from "react";
import { createTask, deleteTask, setTaskStatus, updateTask } from "@/app/actions";
import { dueLabel } from "@/lib/dates";
import { PRIORITY_LABEL, TASK_STATUS_LABEL, type Profile, type Task, type TaskStatus } from "@/lib/types";

type Member = Pick<Profile, "id" | "full_name" | "email">;

const toneClass = {
  late: "bg-red-50 text-red-700",
  soon: "bg-amber-50 text-amber-700",
  ok: "bg-stone-100 text-stone-600",
  none: "bg-stone-50 text-stone-400",
};

export function TaskList({ storeId, tasks, team }: { storeId: string; tasks: Task[]; team: Member[] }) {
  const [showDone, setShowDone] = useState(false);
  const [optimistic, setOptimistic] = useOptimistic(tasks, (state, u: { id: string; status: TaskStatus }) =>
    state.map((t) => (t.id === u.id ? { ...t, status: u.status } : t))
  );
  const [, start] = useTransition();
  const formRef = useRef<HTMLFormElement>(null);

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
      <form
        ref={formRef}
        action={async (fd) => {
          await createTask(storeId, fd);
          formRef.current?.reset();
        }}
        className="card flex flex-wrap gap-2 p-3"
      >
        <input name="title" required placeholder="Aggiungi una cosa da fare…" className="input min-w-[200px] flex-1" />
        <input type="date" name="due_date" className="input w-auto" title="Scadenza" />
        <select name="priority" defaultValue="2" className="input w-auto" title="Priorità">
          <option value="1">Alta</option>
          <option value="2">Media</option>
          <option value="3">Bassa</option>
        </select>
        <select name="assigned_to" defaultValue="" className="input w-auto" title="Assegnata a">
          <option value="">Tutto il team</option>
          {team.map((m) => (
            <option key={m.id} value={m.id}>{m.full_name || m.email}</option>
          ))}
        </select>
        <button className="btn-primary">Aggiungi</button>
      </form>

      <div className="card divide-y divide-stone-100">
        {open.length === 0 && <p className="p-6 text-center text-sm text-stone-500">Niente da fare qui 🎉</p>}
        {open.map((t) => (
          <TaskRow key={t.id} t={t} storeId={storeId} team={team} assignee={memberName(t.assigned_to)} onToggle={() => toggle(t)} />
        ))}
      </div>

      {done.length > 0 && (
        <div>
          <button className="btn-ghost text-xs" onClick={() => setShowDone((v) => !v)}>
            {showDone ? "Nascondi" : "Mostra"} completate ({done.length})
          </button>
          {showDone && (
            <div className="card mt-2 divide-y divide-stone-100 opacity-70">
              {done.map((t) => (
                <TaskRow key={t.id} t={t} storeId={storeId} team={team} assignee={memberName(t.assigned_to)} onToggle={() => toggle(t)} />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function TaskRow({
  t,
  storeId,
  team,
  assignee,
  onToggle,
}: {
  t: Task;
  storeId: string;
  team: Member[];
  assignee: string | null;
  onToggle: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const due = dueLabel(t.due_date);
  const isDone = t.status === "fatto";

  if (editing) {
    return (
      <form
        action={async (fd) => {
          await updateTask(t.id, storeId, fd);
          setEditing(false);
        }}
        className="space-y-2 p-3"
      >
        <input name="title" defaultValue={t.title} required className="input" />
        <textarea name="notes" defaultValue={t.notes ?? ""} rows={2} placeholder="Note" className="input" />
        <div className="flex flex-wrap gap-2">
          <input type="date" name="due_date" defaultValue={t.due_date ?? ""} className="input w-auto" />
          <select name="priority" defaultValue={String(t.priority)} className="input w-auto">
            <option value="1">Alta</option>
            <option value="2">Media</option>
            <option value="3">Bassa</option>
          </select>
          <select name="assigned_to" defaultValue={t.assigned_to ?? ""} className="input w-auto">
            <option value="">Tutto il team</option>
            {team.map((m) => (
              <option key={m.id} value={m.id}>{m.full_name || m.email}</option>
            ))}
          </select>
          <div className="ml-auto flex gap-2">
            <button type="button" className="btn-danger" onClick={() => deleteTask(t.id, storeId)}>Elimina</button>
            <button type="button" className="btn-ghost" onClick={() => setEditing(false)}>Annulla</button>
            <button className="btn-primary">Salva</button>
          </div>
        </div>
      </form>
    );
  }

  return (
    <div className="flex items-start gap-3 p-3">
      <input
        type="checkbox"
        checked={isDone}
        onChange={onToggle}
        className="mt-1 h-5 w-5 shrink-0 cursor-pointer accent-brand-600"
        aria-label="Completata"
      />
      <button className="min-w-0 flex-1 text-left" onClick={() => setEditing(true)}>
        <div className={`font-medium ${isDone ? "line-through text-stone-400" : ""}`}>{t.title}</div>
        {t.notes && <div className="truncate text-sm text-stone-500">{t.notes}</div>}
        <div className="mt-1 flex flex-wrap gap-1.5 text-xs">
          {!isDone && <span className={`rounded px-1.5 py-0.5 ${toneClass[due.tone]}`}>{due.text}</span>}
          <span className={`rounded px-1.5 py-0.5 ${t.priority === 1 ? "bg-red-50 text-red-700" : "bg-stone-100 text-stone-600"}`}>
            {PRIORITY_LABEL[t.priority]}
          </span>
          {t.status === "in_corso" && <span className="rounded bg-blue-50 px-1.5 py-0.5 text-blue-700">{TASK_STATUS_LABEL.in_corso}</span>}
          {assignee && <span className="rounded bg-stone-100 px-1.5 py-0.5 text-stone-600">👤 {assignee}</span>}
        </div>
      </button>
      {!isDone && t.status !== "in_corso" && (
        <button className="btn-ghost text-xs" onClick={() => setTaskStatus(t.id, storeId, "in_corso")}>Inizia</button>
      )}
    </div>
  );
}
