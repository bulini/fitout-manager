"use client";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useMemo, useState } from "react";
import { createStore } from "@/app/actions";
import { STORE_STATUS_COLOR, STORE_STATUS_LABEL, type Store, type StoreStatus } from "@/lib/types";
import { formatDate } from "@/lib/dates";

const StoresMap = dynamic(() => import("./StoresMap"), {
  ssr: false,
  loading: () => <div className="h-full w-full animate-pulse rounded-xl bg-stone-200" />,
});

export type StoreWithCounts = Store & { open: number; overdue: number };

export function Dashboard({ stores }: { stores: StoreWithCounts[] }) {
  const [draft, setDraft] = useState<{ lat: number; lng: number } | null>(null);
  const [filter, setFilter] = useState<StoreStatus | "tutti">("tutti");
  const [q, setQ] = useState("");

  const visible = useMemo(
    () =>
      stores.filter(
        (s) =>
          (filter === "tutti" || s.status === filter) &&
          (q === "" || `${s.name} ${s.city ?? ""} ${s.address ?? ""}`.toLowerCase().includes(q.toLowerCase()))
      ),
    [stores, filter, q]
  );

  const totals = useMemo(
    () => ({
      inApertura: stores.filter((s) => s.status === "in_apertura").length,
      open: stores.reduce((a, s) => a + s.open, 0),
      overdue: stores.reduce((a, s) => a + s.overdue, 0),
    }),
    [stores]
  );

  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_360px]">
      <section className="space-y-3">
        <div className="grid grid-cols-3 gap-3">
          <Stat label="In apertura" value={totals.inApertura} />
          <Stat label="Cose da fare" value={totals.open} />
          <Stat label="Scadute" value={totals.overdue} tone={totals.overdue ? "late" : undefined} />
        </div>
        <div className="card relative h-[60vh] overflow-hidden lg:h-[calc(100vh-220px)]">
          <StoresMap stores={visible} draft={draft} onPick={setDraft} />
          <div className="pointer-events-none absolute bottom-3 left-3 z-[500] rounded-lg bg-white/90 px-3 py-1.5 text-xs text-stone-600 shadow">
            Clicca sulla mappa per aggiungere un punto vendita
          </div>
        </div>
      </section>

      <aside className="space-y-3">
        {draft ? (
          <NewStoreForm draft={draft} onCancel={() => setDraft(null)} onMove={setDraft} />
        ) : (
          <div className="card p-3">
            <div className="flex gap-2">
              <input className="input" placeholder="Cerca punto vendita…" value={q} onChange={(e) => setQ(e.target.value)} />
              <select className="input w-auto" value={filter} onChange={(e) => setFilter(e.target.value as StoreStatus | "tutti")}>
                <option value="tutti">Tutti</option>
                {Object.entries(STORE_STATUS_LABEL).map(([k, v]) => (
                  <option key={k} value={k}>{v}</option>
                ))}
              </select>
            </div>
          </div>
        )}

        <ul className="space-y-2">
          {visible.map((s) => (
            <li key={s.id}>
              <Link href={`/stores/${s.id}`} className="card flex items-center gap-3 p-3 hover:border-brand-500">
                <span className="h-3 w-3 shrink-0 rounded-full" style={{ background: STORE_STATUS_COLOR[s.status] }} />
                <div className="min-w-0 flex-1">
                  <div className="truncate font-medium">{s.name}</div>
                  <div className="truncate text-xs text-stone-500">
                    {[s.city, STORE_STATUS_LABEL[s.status], s.opening_date && `apre ${formatDate(s.opening_date)}`]
                      .filter(Boolean)
                      .join(" · ")}
                  </div>
                </div>
                <div className="text-right text-xs">
                  <div className="font-semibold">{s.open} da fare</div>
                  {s.overdue > 0 && <div className="text-red-600">{s.overdue} scadute</div>}
                </div>
              </Link>
            </li>
          ))}
          {visible.length === 0 && (
            <li className="card p-6 text-center text-sm text-stone-500">Nessun punto vendita. Clicca sulla mappa per crearne uno.</li>
          )}
        </ul>
      </aside>
    </div>
  );
}

function Stat({ label, value, tone }: { label: string; value: number; tone?: "late" }) {
  return (
    <div className="card p-3">
      <div className="text-xs text-stone-500">{label}</div>
      <div className={`text-2xl font-semibold ${tone === "late" ? "text-red-600" : ""}`}>{value}</div>
    </div>
  );
}

function NewStoreForm({
  draft,
  onCancel,
  onMove,
}: {
  draft: { lat: number; lng: number };
  onCancel: () => void;
  onMove: (p: { lat: number; lng: number }) => void;
}) {
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("");
  const [searching, setSearching] = useState(false);

  async function geocode() {
    const query = [address, city].filter(Boolean).join(", ");
    if (!query) return;
    setSearching(true);
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&limit=1&countrycodes=it&q=${encodeURIComponent(query)}`
      );
      const [hit] = await res.json();
      if (hit) onMove({ lat: Number(hit.lat), lng: Number(hit.lon) });
    } finally {
      setSearching(false);
    }
  }

  return (
    <form action={createStore} className="card space-y-3 p-4">
      <h2 className="font-semibold">Nuovo punto vendita</h2>
      <input type="hidden" name="lat" value={draft.lat} />
      <input type="hidden" name="lng" value={draft.lng} />
      <div>
        <label className="label">Nome</label>
        <input name="name" required className="input" placeholder="Boxyland Milano Lambrate" autoFocus />
      </div>
      <div className="grid grid-cols-[1fr_120px] gap-2">
        <div>
          <label className="label">Indirizzo</label>
          <input name="address" className="input" value={address} onChange={(e) => setAddress(e.target.value)} />
        </div>
        <div>
          <label className="label">Città</label>
          <input name="city" className="input" value={city} onChange={(e) => setCity(e.target.value)} />
        </div>
      </div>
      <button type="button" className="btn-ghost w-full border border-stone-200" onClick={geocode} disabled={searching}>
        {searching ? "Cerco…" : "📍 Posiziona il pin dall'indirizzo"}
      </button>
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="label">Stato</label>
          <select name="status" className="input" defaultValue="in_apertura">
            {Object.entries(STORE_STATUS_LABEL).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="label">Data apertura</label>
          <input type="date" name="opening_date" className="input" />
        </div>
      </div>
      <div>
        <label className="label">Responsabile</label>
        <input name="manager_name" className="input" />
      </div>
      <p className="text-xs text-stone-500">
        Posizione: {draft.lat.toFixed(5)}, {draft.lng.toFixed(5)} — puoi cliccare altrove sulla mappa per spostarla.
      </p>
      <div className="flex justify-end gap-2">
        <button type="button" className="btn-ghost" onClick={onCancel}>Annulla</button>
        <button className="btn-primary">Crea</button>
      </div>
    </form>
  );
}
