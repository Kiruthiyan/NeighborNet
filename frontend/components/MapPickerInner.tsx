"use client";

import { useEffect } from "react";
import { MapContainer, TileLayer, Marker, useMapEvents, useMap } from "react-leaflet";
import L from "leaflet";

// Fix default Leaflet icon broken in Next.js bundler
// We use a simple SVG data URL instead of relying on image files
const PIN_ICON = L.divIcon({
  html: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 36" width="28" height="42">
    <path d="M12 0C5.37 0 0 5.37 0 12c0 9 12 24 12 24s12-15 12-24C24 5.37 18.63 0 12 0z" fill="#10b981" stroke="#fff" stroke-width="1.5"/>
    <circle cx="12" cy="12" r="5" fill="#fff"/>
  </svg>`,
  iconSize: [28, 42],
  iconAnchor: [14, 42],
  className: "",
});

interface Props {
  center: [number, number];
  markerPos: [number, number] | null;
  onPin: (lat: number, lng: number) => void;
}

/** Re-centers map when center prop changes */
function RecenterOnChange({ center }: { center: [number, number] }) {
  const map = useMap();
  useEffect(() => {
    map.setView(center, map.getZoom(), { animate: true });
  }, [center, map]);
  return null;
}

/** Captures click events on the map */
function ClickHandler({ onPin }: { onPin: (lat: number, lng: number) => void }) {
  useMapEvents({
    click(e) {
      onPin(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

export default function MapPickerInner({ center, markerPos, onPin }: Props) {
  return (
    <MapContainer
      center={center}
      zoom={14}
      style={{ height: "100%", width: "100%" }}
      scrollWheelZoom
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <RecenterOnChange center={center} />
      <ClickHandler onPin={onPin} />
      {markerPos && <Marker position={markerPos} icon={PIN_ICON} />}
    </MapContainer>
  );
}
