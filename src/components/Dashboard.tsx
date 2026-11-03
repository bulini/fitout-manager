"use client";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { createStore } from "@/app/actions";
import { STORE_STATUS_COLOR, STORE_STATUS_LABEL, type Store, type StoreStatus, type Template } from "@/lib/types";
import { formatDate } from "@/lib/dates";
import { BottomSheet } from "./BottomSheet";
import { ChevronIcon, PinIcon, PlusIcon, SearchIcon } from "./Icons";
import type { LatLng } from "./StoresMap";

type TplOption = Pick<Template, "id" | "name">;

const StoresMap = dynamic(() => import("./StoresMap"), {
  ssr: false,
  loading: () => <div className="h-full w-full animate-pulse bg-stone-200" />,
});

export type StoreWithCounts = Store & { open: number; overdue: number };

function useIsDesktop() {
  const [d, setD] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(min-width: 768px)");
    const on = () => setD(mq.matches);
    on();
    mq.addEventListener("change", on);
    return () => mq.removeEventListener("change", on);
  }, []);
  return d;
}

type Geo = { address: string; city: string };

async function geocode(q: string): Promise<(LatLng & Geo) | null> {
  const res = await fetch(
    `https://nominatim.openstreetmap.org/search?format=json&limit=1&countrycodes=it&addressdetails=1&q=${encodeURIComponent(q)}`
  );
  const [hit] = await res.json();
  if (!hit) return null;
  const a = hit.address ?? {};
  return {
    lat: Number(hit.lat),
    lng: Number(hit.lon),
    address: [a.road, a.house_number].filter(Boolean).join(" "),
    city: a.city ?? a.town ?? a.village ?? a.municipality ?? "",
  };
}

export function Dashboard({ stores, templates }: { stores: StoreWithCounts[]; templates: TplOption[] }) {
  const isDesktop = useIsDesktop();
  const [view, setView] = useState<"mappa" | "elenco">("mappa");
  const [filter, setFilter] = useState<StoreStatus | "tutti">("tutti");
  const [q, setQ] = useState("");

  // creazione punto vendita: "place" = scegli il punto sulla mappa, "form" = compila i dati
  const [add, setAdd] = useState<null | "place" | "form">(null);
  const [center, setCenter] = useState<LatLng>({ lat: 42.5, lng: 12.5 });
  const [fly, setFly] = useState<(LatLng & { zoom?: number }) | null>(null);
  const [geo, setGeo] = useState<Geo>({ address: "", city: "" });
  const [search, setSearch] = useState("");
  const [busy, setBusy] = useState<string | null>(null);

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

  const startAdd = useCallback(
    (at?: LatLng) => {
      setView("mappa");
      setGeo({ address: "", city: "" });
      setSearch("");
      if (at) setFly({ ...at, zoom: 17 });
      setAdd(isDesktop ? "form" : "place");
    },
    [isDesktop]
  );
  const cancelAdd = () => setAdd(null);

  async function runSearch(e?: React.FormEvent) {
    e?.preventDefault();
    if (!search.trim()) return;
    setBusy("search");
    try {
      const r = await geocode(search);
      if (r) {
        setFly({ lat: r.lat, lng: r.lng, zoom: 17 });
        setGeo({ address: r.address, city: r.city });
      } else alert("Indirizzo non trovato");
    } finally {
      setBusy(null);
    }
  }

  function useMyPosition() {
    if (!navigator.geolocation) return;
    setBusy("gps");
    navigator.geolocation.getCurrentPosition(
      (p) => {
        setFly({ lat: p.coords.latitude, lng: p.coords.longitude, zoom: 17 });
        setBusy(null);
      },
      () => {
        alert("Posizione non disponibile");
        setBusy(null);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }

  const onMapClick = (p: LatLng) => {
    if (add) setFly({ ...p, zoom: undefined });
    else if (isDesktop) startAdd(p);
  };

  const viewToggle = (
    <div className="flex rounded-xl bg-white/95 p-1 shadow-md ring-1 ring-black/5 md:hidden">
      {(["mappa", "elenco"] as const).map((v) => (
        <button
          key={v}
          onClick={() => setView(v)}
          className={`flex-1 rounded-lg px-4 py-1.5 text-sm font-medium capitalize ${
            view === v ? "bg-brand-600 text-white" : "text-stone-600"
          }`}
        >
          {v}
        </button>
      ))}
    </div>
  );

  const form = (
    <NewStoreForm
      position={center}
      geo={geo}
      templates={templates}
      onCancel={cancelAdd}
      onBack={isDesktop ? undefined : () => setAdd("place")}
    />
  );

  return (
    <>
      <div className="md:grid md:grid-cols-[1fr_380px] md:gap-4">
        {/* ---------------- MAPPA ---------------- */}
        <section className={view === "elenco" ? "hidden md:block" : ""}>
          <div
            className="relative -mx-3 -mt-3 -mb-4 overflow-hidden md:m-0 md:h-[calc(100dvh-110px)] md:rounded-2xl md:border md:border-stone-200"
            style={isDesktop ? undefined : { height: "calc(100dvh - var(--topbar-h) - var(--tabbar-h) - var(--safe-top) - var(--safe-bottom))" }}
          >
            <StoresMap
              stores={visible}
              flyTarget={fly}
              onMapClick={onMapClick}
              onCenter={setCenter}
              hideStores={!!add}
            />

            {/* overlay in alto */}
            <div className="pointer-events-none absolute inset-x-0 top-0 z-[500] space-y-2 p-3">
              {add ? (
                <form onSubmit={runSearch} className="pointer-events-auto flex gap-2">
                  <input
                    className="input flex-1 shadow-md"
                    placeholder="Cerca indirizzo…"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    enterKeyHint="search"
                  />
                  <button className="btn-primary px-3 shadow-md" disabled={busy === "search"} aria-label="Cerca">
                    <SearchIcon className="h-5 w-5" />
                  </button>
                </form>
              ) : (
                <>
                  <div className="pointer-events-auto">{viewToggle}</div>
                  <div className="pointer-events-auto flex gap-2 text-xs font-medium">
                    <Chip>{totals.inApertura} in apertura</Chip>
                    <Chip>{totals.open} da fare</Chip>
                    {totals.overdue > 0 && <Chip tone="late">{totals.overdue} scadute</Chip>}
                  </div>
                </>
              )}
            </div>

            {/* mirino al centro durante la creazione */}
            {add && (
              <div className="pointer-events-none absolute left-1/2 top-1/2 z-[500] -translate-x-1/2 -translate-y-full text-brand-600 drop-shadow">
                <PinIcon className="h-11 w-11 fill-white" />
              </div>
            )}

            {/* azioni in basso */}
            <div className="absolute inset-x-0 bottom-5 z-[500] p-3">
              {!add && (
                <div className="flex justify-end">
                  <button onClick={() => startAdd()} className="btn-primary h-14 rounded-full px-5 text-base shadow-lg">
                    <PlusIcon className="h-5 w-5" /> Nuovo punto
                  </button>
                </div>
              )}
              {add === "place" && (
                <div className="space-y-2 rounded-2xl bg-white p-3 shadow-xl">
                  <p className="text-center text-sm text-stone-600">Sposta la mappa per mettere il pin sul punto vendita</p>
                  <button onClick={useMyPosition} className="btn-outline w-full" disabled={busy === "gps"}>
                    📍 {busy === "gps" ? "Cerco la posizione…" : "Usa la mia posizione"}
                  </button>
                  <div className="grid grid-cols-2 gap-2">
                    <button onClick={cancelAdd} className="btn-ghost border border-stone-200">Annulla</button>
                    <button onClick={() => setAdd("form")} className="btn-primary">Conferma</button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </section>

        {/* ---------------- ELENCO ---------------- */}
        <aside className={`space-y-3 ${view === "mappa" ? "hidden md:block" : ""}`}>
          <div className="md:hidden">{viewToggle}</div>

          {isDesktop && add === "form" ? (
            <div className="card p-4">
              <h2 className="mb-3 font-semibold">Nuovo punto vendita</h2>
              {form}
            </div>
          ) : (
            <>
              <input className="input" placeholder="Cerca punto vendita…" value={q} onChange={(e) => setQ(e.target.value)} type="search" />
              <div className="-mx-3 flex gap-2 overflow-x-auto px-3 pb-1 md:mx-0 md:flex-wrap md:px-0">
                {(["tutti", "in_apertura", "pianificato", "aperto", "chiuso"] as const).map((k) => (
                  <button
                    key={k}
                    onClick={() => setFilter(k)}
                    className={`shrink-0 rounded-full border px-3 py-1.5 text-sm ${
                      filter === k ? "border-brand-600 bg-brand-600 text-white" : "border-stone-300 bg-white text-stone-700"
                    }`}
                  >
                    {k === "tutti" ? "Tutti" : STORE_STATUS_LABEL[k]}
                  </button>
                ))}
              </div>

              <ul className="space-y-2">
                {visible.map((s) => (
                  <li key={s.id}>
                    <Link href={`/stores/${s.id}`} className="card flex items-center gap-3 p-3.5 active:bg-stone-50 md:hover:border-brand-500">
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
                      <ChevronIcon className="h-4 w-4 shrink-0 text-stone-400" />
                    </Link>
                  </li>
                ))}
                {visible.length === 0 && (
                  <li className="card p-6 text-center text-sm text-stone-500">Nessun punto vendita trovato.</li>
                )}
              </ul>
              <button onClick={() => startAdd()} className="btn-primary w-full md:hidden">
                <PlusIcon className="h-5 w-5" /> Nuovo punto vendita
              </button>
            </>
          )}
        </aside>
      </div>

      {!isDesktop && (
        <BottomSheet open={add === "form"} onClose={cancelAdd} title="Nuovo punto vendita">
          {form}
        </BottomSheet>
      )}
    </>
  );
}

function Chip({ children, tone }: { children: React.ReactNode; tone?: "late" }) {
  return (
    <span className={`rounded-full px-2.5 py-1 shadow-md ring-1 ring-black/5 ${tone === "late" ? "bg-red-600 text-white" : "bg-white/95 text-stone-700"}`}>
      {children}
    </span>
  );
}

function NewStoreForm({
  position,
  geo,
  templates,
  onCancel,
  onBack,
}: {
  position: LatLng;
  geo: Geo;
  templates: TplOption[];
  onCancel: () => void;
  onBack?: () => void;
}) {
  const [pending, setPending] = useState(false);
  return (
    <form action={createStore} onSubmit={() => setPending(true)} className="space-y-3">
      <input type="hidden" name="lat" value={position.lat} />
      <input type="hidden" name="lng" value={position.lng} />
      <div>
        <label className="label">Nome</label>
        <input name="name" required className="input" placeholder="Boxyland Milano Lambrate" />
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-[1fr_140px]">
        <div>
          <label className="label">Indirizzo</label>
          <input name="address" className="input" defaultValue={geo.address} key={"a" + geo.address} />
        </div>
        <div>
          <label className="label">Città</label>
          <input name="city" className="input" defaultValue={geo.city} key={"c" + geo.city} />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label">Stato</label>
          <select name="status" className="input" defaultValue="in_apertura">
            {Object.entries(STORE_STATUS_LABEL).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="label">Apertura</label>
          <input type="date" name="opening_date" className="input" />
        </div>
      </div>
      <div>
        <label className="label">Responsabile</label>
        <input name="manager_name" className="input" />
      </div>
      {templates.length > 0 && (
        <div>
          <label className="label">To-do iniziale da template</label>
          <select name="template_id" className="input" defaultValue="">
            <option value="">Nessuno</option>
            {templates.map((t) => (
              <option key={t.id} value={t.id}>{t.name}</option>
            ))}
          </select>
          <p className="mt-1 text-xs text-stone-500">Scadenze calcolate dalla data di apertura (se vuota, da oggi).</p>
        </div>
      )}
      <p className="flex items-center gap-1 text-xs text-stone-500">
        <PinIcon className="h-4 w-4" /> {position.lat.toFixed(5)}, {position.lng.toFixed(5)}
        {onBack && (
          <button type="button" onClick={onBack} className="ml-auto font-medium text-brand-700">
            Cambia posizione
          </button>
        )}
      </p>
      <div className="grid grid-cols-2 gap-2 pt-1">
        <button type="button" className="btn-ghost border border-stone-200" onClick={onCancel}>Annulla</button>
        <button className="btn-primary" disabled={pending}>{pending ? "Creo…" : "Crea"}</button>
      </div>
    </form>
  );
}
