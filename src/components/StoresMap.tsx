"use client";
import L from "leaflet";
import Link from "next/link";
import { useEffect } from "react";
import { MapContainer, Marker, Popup, TileLayer, useMap, useMapEvents } from "react-leaflet";
import { STORE_STATUS_COLOR, STORE_STATUS_LABEL } from "@/lib/types";
import type { StoreWithCounts } from "./Dashboard";

const ITALY: [number, number] = [42.5, 12.5];

function pinIcon(color: string, badge?: number) {
  return L.divIcon({
    className: "",
    iconSize: [22, 22],
    iconAnchor: [11, 11],
    popupAnchor: [0, -12],
    html: `<div class="store-pin" style="background:${color}">${
      badge ? `<span class="store-pin-badge">${badge}</span>` : ""
    }</div>`,
  });
}

function ClickHandler({ onPick }: { onPick: (p: { lat: number; lng: number }) => void }) {
  useMapEvents({ click: (e) => onPick({ lat: e.latlng.lat, lng: e.latlng.lng }) });
  return null;
}

function FitBounds({ stores }: { stores: StoreWithCounts[] }) {
  const map = useMap();
  useEffect(() => {
    if (stores.length === 0) return;
    const bounds = L.latLngBounds(stores.map((s) => [s.lat, s.lng]));
    map.fitBounds(bounds, { padding: [40, 40], maxZoom: 13 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stores.length]);
  return null;
}

function FlyTo({ target }: { target: { lat: number; lng: number } | null }) {
  const map = useMap();
  useEffect(() => {
    if (!target) return;
    const inView = map.getBounds().contains([target.lat, target.lng]);
    if (!inView || map.getZoom() < 12) {
      map.flyTo([target.lat, target.lng], Math.max(map.getZoom(), 14), { duration: 0.6 });
    }
  }, [target, map]);
  return null;
}

export default function StoresMap({
  stores,
  draft,
  onPick,
}: {
  stores: StoreWithCounts[];
  draft: { lat: number; lng: number } | null;
  onPick: (p: { lat: number; lng: number }) => void;
}) {
  return (
    <MapContainer center={ITALY} zoom={6} className="h-full w-full" scrollWheelZoom>
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <ClickHandler onPick={onPick} />
      <FitBounds stores={stores} />
      <FlyTo target={draft} />
      {stores.map((s) => (
        <Marker key={s.id} position={[s.lat, s.lng]} icon={pinIcon(STORE_STATUS_COLOR[s.status], s.overdue || undefined)}>
          <Popup>
            <div className="space-y-1">
              <div className="font-semibold">{s.name}</div>
              <div className="text-xs text-stone-500">{STORE_STATUS_LABEL[s.status]}</div>
              <div className="text-xs">
                {s.open} da fare{s.overdue > 0 && <span className="text-red-600"> · {s.overdue} scadute</span>}
              </div>
              <Link href={`/stores/${s.id}`} className="text-xs font-medium text-brand-700">Apri to-do →</Link>
            </div>
          </Popup>
        </Marker>
      ))}
      {draft && <Marker position={[draft.lat, draft.lng]} icon={pinIcon("#ea580c")} />}
    </MapContainer>
  );
}
