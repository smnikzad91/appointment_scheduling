"use client";

import "leaflet/dist/leaflet.css";
import { useEffect } from "react";
import Link from "next/link";
import { MapContainer, Marker, Popup, TileLayer, useMap } from "react-leaflet";
import L from "leaflet";
import type { SalonCard } from "@/lib/api/discovery";
import { toPersianDigits } from "@/lib/persian";
import { formatDistance } from "./SalonResultCard";

const salonIcon = L.divIcon({
  className: "",
  html: `<div style="width:24px;height:24px;border-radius:50% 50% 50% 0;transform:rotate(-45deg);background:#a34a30;border:2px solid white;box-shadow:0 1px 4px rgba(0,0,0,.35)"></div>`,
  iconSize: [24, 24],
  iconAnchor: [12, 24],
  popupAnchor: [0, -22],
});

const meIcon = L.divIcon({
  className: "",
  html: `<div style="width:18px;height:18px;border-radius:50%;background:#2f7de1;border:3px solid white;box-shadow:0 0 0 6px rgba(47,125,225,.25)"></div>`,
  iconSize: [18, 18],
  iconAnchor: [9, 9],
});

/** Fits the view to the salons (and the customer) whenever the results change. */
function FitBounds({ points }: { points: [number, number][] }) {
  const map = useMap();
  const key = points.map((p) => p.join(",")).join("|");
  useEffect(() => {
    if (points.length === 0) return;
    if (points.length === 1) map.setView(points[0], 14);
    else map.fitBounds(L.latLngBounds(points), { padding: [32, 32], maxZoom: 15 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map, key]);
  return null;
}

/** Search results on a map. Client-only — load via SalonsMapLoader. */
export default function SalonsMap({ salons, me }: { salons: SalonCard[]; me: { lat: number; lng: number } | null }) {
  const pinned = salons.filter((s): s is SalonCard & { latitude: number; longitude: number } => s.latitude !== null && s.longitude !== null);
  const points: [number, number][] = [...pinned.map((s) => [s.latitude, s.longitude] as [number, number]), ...(me ? [[me.lat, me.lng] as [number, number]] : [])];
  const start = points[0] ?? [35.6892, 51.389];
  return (
    <MapContainer center={start} zoom={12} style={{ height: "100%", width: "100%" }}>
      <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>' />
      <FitBounds points={points} />
      {me && <Marker position={[me.lat, me.lng]} icon={meIcon} />}
      {pinned.map((s) => (
        <Marker key={s.id} position={[s.latitude, s.longitude]} icon={salonIcon}>
          <Popup>
            <div dir="rtl" style={{ fontFamily: "Vazirmatn, Tahoma, sans-serif", minWidth: 150 }}>
              <strong style={{ fontSize: 14 }}>{s.name}</strong>
              <div style={{ color: "#7b6b71", fontSize: 12, margin: "2px 0 6px" }}>
                {s.city}
                {s.rating !== null && ` — ★ ${toPersianDigits(s.rating.toFixed(1))}`}
                {s.distanceKm !== null && ` — ${formatDistance(s.distanceKm)}`}
              </div>
              <Link href={`/s/${s.slug}`} style={{ color: "#a34a30", fontWeight: 700 }}>
                مشاهده و رزرو
              </Link>
            </div>
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  );
}
