"use client";

import "leaflet/dist/leaflet.css";
import { MapContainer, TileLayer, Marker, useMapEvents } from "react-leaflet";
import L from "leaflet";
import type { GeoLocation } from "@/types/salon";

const TEHRAN: GeoLocation = { lat: 35.6892, lng: 51.389 };

const pinIcon = L.divIcon({
  className: "",
  html: `<div style="width:26px;height:26px;border-radius:50% 50% 50% 0;transform:rotate(-45deg);background:#a34a30;border:2px solid white;box-shadow:0 1px 4px rgba(0,0,0,.35)"></div>`,
  iconSize: [26, 26],
  iconAnchor: [13, 26],
});

function ClickToPlace({ onChange }: { onChange: (location: GeoLocation) => void }) {
  useMapEvents({
    click(e) {
      onChange({ lat: Number(e.latlng.lat.toFixed(6)), lng: Number(e.latlng.lng.toFixed(6)) });
    },
  });
  return null;
}

/** Click anywhere on the map to drop the salon's pin. Client-only — load via LocationPickerLoader. */
export default function LocationPicker({
  value,
  onChange,
}: {
  value: GeoLocation | null;
  onChange: (location: GeoLocation) => void;
}) {
  return (
    <MapContainer
      center={[(value ?? TEHRAN).lat, (value ?? TEHRAN).lng]}
      zoom={value ? 16 : 11}
      scrollWheelZoom={false}
      style={{ height: "100%", width: "100%" }}
    >
      <TileLayer
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
      />
      <ClickToPlace onChange={onChange} />
      {value && (
        <Marker
          position={[value.lat, value.lng]}
          icon={pinIcon}
          draggable
          eventHandlers={{
            dragend(e) {
              const { lat, lng } = (e.target as L.Marker).getLatLng();
              onChange({ lat: Number(lat.toFixed(6)), lng: Number(lng.toFixed(6)) });
            },
          }}
        />
      )}
    </MapContainer>
  );
}
