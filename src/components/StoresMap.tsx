"use client";
import L from "leaflet";
import Link from "next/link";
import { useEffect } from "react";
import { MapContainer, Marker, Popup, TileLayer, useMap, useMapEvents } from "react-leaflet";
import { STORE_STATUS_COLOR, STORE_STATUS_LABEL } from "@/lib/types";
import type { StoreWithCounts } from "./Dashboard";

const ITALY: [number, number] = [42.5, 12.5];
export type LatLng = { lat: number; lng: number };

function pinIcon(color: string, badge?: number) {
  return L.divIcon({
    className: "",
    iconSize: [24, 24],
    iconAnchor: [12, 12],
    popupAnchor: [0, -14],
    html: `<div class="store-pin" style="background:${color}">${
      badge ? `<span class="store-pin-badge">${badge}</span>` : ""
    }</div>`,
  });
}

function Events({ onClick, onCenter }: { onClick?: (p: LatLng) => void; onCenter?: (p: LatLng) => void }) {
  const map = useMapEvents({
    click: (e) => onClick?.({ lat: e.latlng.lat, lng: e.latlng.lng }),
    moveend: () => {
      const c = map.getCenter();
      onCenter?.({ lat: c.lat, lng: c.lng });
    },
  });
  useEffect(() => {
    const c = map.getCenter();
    onCenter?.({ lat: c.lat, lng: c.lng });
    // il contenitore può cambiare dimensione (cambio vista, rotazione)
    const ro = new ResizeObserver(() => map.invalidateSize());
    ro.observe(map.getContainer());
    return () => ro.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map]);
  return null;
}

function FitBounds({ stores }: { stores: StoreWithCounts[] }) {
  const map = useMap();
  useEffect(() => {
    if (stores.length === 0) return;
    const bounds = L.latLngBounds(stores.map((s) => [s.lat, s.lng]));
    map.fitBounds(bounds, { padding: [48, 48], maxZoom: 13 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stores.length]);
  return null;
}

function FlyTo({ target }: { target: (LatLng & { zoom?: number }) | null }) {
  const map = useMap();
  useEffect(() => {
    if (target) map.flyTo([target.lat, target.lng], target.zoom ?? Math.max(map.getZoom(), 16), { duration: 0.6 });
  }, [target, map]);
  return null;
}

export default function StoresMap({
  stores,
  flyTarget,
  onMapClick,
  onCenter,
  hideStores,
}: {
  stores: StoreWithCounts[];
  flyTarget: (LatLng & { zoom?: number }) | null;
  onMapClick?: (p: LatLng) => void;
  onCenter?: (p: LatLng) => void;
  hideStores?: boolean;
}) {
  return (
    <MapContainer center={ITALY} zoom={6} className="h-full w-full" scrollWheelZoom zoomControl={false}>
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <Events onClick={onMapClick} onCenter={onCenter} />
      <FitBounds stores={stores} />
      <FlyTo target={flyTarget} />
      {!hideStores &&
        stores.map((s) => (
          <Marker key={s.id} position={[s.lat, s.lng]} icon={pinIcon(STORE_STATUS_COLOR[s.status], s.overdue || undefined)}>
            <Popup>
              <div className="min-w-[180px] space-y-1">
                <div className="text-[15px] font-semibold">{s.name}</div>
                <div className="text-xs text-stone-500">{STORE_STATUS_LABEL[s.status]}</div>
                <div className="text-sm">
                  {s.open} da fare{s.overdue > 0 && <span className="text-red-600"> · {s.overdue} scadute</span>}
                </div>
                <Link
                  href={`/stores/${s.id}`}
                  className="mt-1 block rounded-lg bg-brand-600 px-3 py-2 text-center text-sm font-medium !text-white"
                >
                  Apri attività
                </Link>
              </div>
            </Popup>
          </Marker>
        ))}
    </MapContainer>
  );
}
