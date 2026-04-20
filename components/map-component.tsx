"use client";

import { useEffect, useState } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap, useMapEvents } from "react-leaflet";
import { Users } from "lucide-react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

// Fix Leaflet marker icon issue
const DefaultIcon = L.icon({
  iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});

const BlueIcon = L.icon({
  iconUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});

const RedIcon = L.icon({
  iconUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});

L.Marker.prototype.options.icon = DefaultIcon;

interface MapProps {
  center?: [number, number];
  zoom?: number;
  markers?: Array<{
    id: string;
    position: [number, number];
    title: string;
    name?: string;
    type: "report" | "volunteer";
    urgency?: "low" | "medium" | "high";
  }>;
  onLocationSelect?: (lat: number, lng: number) => void;
  interactive?: boolean;
}

function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371; // km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function LocationPicker({ onSelect }: { onSelect: (lat: number, lng: number) => void }) {
  useMapEvents({
    click(e) {
      onSelect(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

export default function Map({ center = [20.5937, 78.9629], zoom = 5, markers = [], onLocationSelect, interactive = true }: MapProps) {
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  if (!isMounted) return <div className="h-full w-full bg-muted animate-pulse rounded-xl" />;

  const volunteers = markers.filter(m => m.type === "volunteer");

  return (
    <MapContainer center={center} zoom={zoom} scrollWheelZoom={interactive} className="h-full w-full rounded-xl shadow-inner z-10">
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      {markers.map((marker) => (
        <Marker 
          key={marker.id} 
          position={marker.position} 
          icon={marker.type === "volunteer" ? BlueIcon : (marker.urgency === "high" ? RedIcon : DefaultIcon)}
        >
          <Popup className="custom-popup">
            <div className="font-sans p-2 min-w-[200px]">
              <p className="font-black text-foreground uppercase italic text-sm border-b border-border pb-2 mb-2 tracking-tight leading-none">
                {marker.title}
              </p>
              
              {marker.type === "report" && (
                <div className="space-y-3">
                  <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest flex items-center gap-1">
                    <Users className="w-3 h-3 text-indigo-500" /> Nearby Personnel
                  </p>
                  <div className="space-y-1 max-h-32 overflow-y-auto pr-2">
                    {volunteers
                      .map(v => ({
                        ...v,
                        distance: calculateDistance(marker.position[0], marker.position[1], v.position[0], v.position[1])
                      }))
                      .sort((a, b) => a.distance - b.distance)
                      .slice(0, 5)
                      .map(v => (
                        <div key={v.id} className="flex justify-between items-center bg-muted/50 p-2 rounded-lg border border-border/50">
                           <span className="text-[10px] font-bold text-slate-600 italic">{v.name || "Volunteer"}</span>
                           <span className="text-[10px] font-black text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full">
                             {v.distance.toFixed(1)} km
                           </span>
                        </div>
                      ))
                    }
                    {volunteers.length === 0 && <p className="text-[10px] text-muted-foreground italic font-medium">No personnel in range.</p>}
                  </div>
                </div>
              )}

              {marker.type === "volunteer" && (
                <p className="text-[10px] font-bold text-indigo-500 uppercase tracking-widest bg-indigo-50 px-3 py-1.5 rounded-xl inline-block">Active Personnel</p>
              )}
            </div>
          </Popup>
        </Marker>
      ))}
      {onLocationSelect && interactive && <LocationPicker onSelect={onLocationSelect} />}
    </MapContainer>
  );
}

