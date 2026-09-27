"use client";

import "leaflet/dist/leaflet.css";
import { useEffect, useRef, useState } from "react";
import { MapContainer, TileLayer, Marker, useMap, useMapEvents } from "react-leaflet";
import L from "leaflet";
import { LocateFixed, LoaderCircle } from "lucide-react";
import type { GeoLocation } from "@/types/salon";

const TEHRAN: GeoLocation = { lat: 35.6892, lng: 51.389 };

const pinIcon = L.divIcon({
  className: "",
  html: `<div style="width:26px;height:26px;border-radius:50% 50% 50% 0;transform:rotate(-45deg);background:#a34a30;border:2px solid white;box-shadow:0 1px 4px rgba(0,0,0,.35)"></div>`,
  iconSize: [26, 26],
  iconAnchor: [13, 26],
});

const round6 = (n: number) => Number(n.toFixed(6));

function ClickToPlace({ onChange }: { onChange: (location: GeoLocation) => void }) {
  useMapEvents({
    click(e) {
      onChange({ lat: round6(e.latlng.lat), lng: round6(e.latlng.lng) });
    },
  });
  return null;
}

/** Moves the map when `center` changes (e.g. a province was picked), without touching the pin. */
function FollowCenter({ center, zoom }: { center: GeoLocation | null; zoom: number }) {
  const map = useMap();
  const lat = center?.lat;
  const lng = center?.lng;
  useEffect(() => {
    if (lat != null && lng != null) map.flyTo([lat, lng], zoom, { duration: 0.6 });
  }, [map, lat, lng, zoom]);
  return null;
}

/** "My location": asks the browser for GPS and drops the pin there. */
function LocateButton({ onChange }: { onChange: (location: GeoLocation) => void }) {
  const map = useMap();
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  // Leaflet listens on the map container natively, so a React stopPropagation is too late —
  // without this a tap on the button would also drop the pin under it.
  useEffect(() => {
    if (ref.current) L.DomEvent.disableClickPropagation(ref.current);
  }, []);
  if (typeof navigator === "undefined" || !navigator.geolocation) return null;
  return (
    <div ref={ref} className="leaflet-top leaflet-right" style={{ pointerEvents: "auto" }}>
      <button
        type="button"
        onClick={() => {
          setBusy(true);
          setFailed(false);
          navigator.geolocation.getCurrentPosition(
            (pos) => {
              setBusy(false);
              const loc = { lat: round6(pos.coords.latitude), lng: round6(pos.coords.longitude) };
              onChange(loc);
              map.flyTo([loc.lat, loc.lng], 17, { duration: 0.6 });
            },
            () => {
              setBusy(false);
              setFailed(true);
            },
            { enableHighAccuracy: true, timeout: 10_000 },
          );
        }}
        className="leaflet-control m-2.5 flex h-10 items-center gap-1.5 rounded-full bg-white px-3.5 text-[13px] font-bold text-[#2a1d26] shadow-md"
        style={{ fontFamily: "Vazirmatn, Tahoma, sans-serif" }}
      >
        {busy ? <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden /> : <LocateFixed className="h-4 w-4 text-[#a34a30]" aria-hidden />}
        {failed ? "موقعیت پیدا نشد" : "موقعیت من"}
      </button>
    </div>
  );
}

/**
 * Tap anywhere on the map (or use "موقعیت من") to drop the salon's pin; drag it to adjust.
 * `center` recentres the map — pass the chosen province's capital. Client-only — load via
 * LocationPickerLoader.
 */
export default function LocationPicker({
  value,
  onChange,
  center = null,
}: {
  value: GeoLocation | null;
  onChange: (location: GeoLocation) => void;
  center?: GeoLocation | null;
}) {
  const start = value ?? center ?? TEHRAN;
  return (
    <MapContainer center={[start.lat, start.lng]} zoom={value ? 16 : center ? 12 : 11} scrollWheelZoom={false} style={{ height: "100%", width: "100%" }}>
      <TileLayer
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
      />
      <ClickToPlace onChange={onChange} />
      <FollowCenter center={value ? null : center} zoom={12} />
      <LocateButton onChange={onChange} />
      {value && (
        <Marker
          position={[value.lat, value.lng]}
          icon={pinIcon}
          draggable
          eventHandlers={{
            dragend(e) {
              const { lat, lng } = (e.target as L.Marker).getLatLng();
              onChange({ lat: round6(lat), lng: round6(lng) });
            },
          }}
        />
      )}
    </MapContainer>
  );
}
