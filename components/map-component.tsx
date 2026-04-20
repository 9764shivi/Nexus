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

const YellowIcon = L.icon({
  iconUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-gold.png",
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

const GreenIcon = L.icon({
  iconUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png",
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
  onAssign?: (reportId: string, volunteerId: string) => void;
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

function ChangeView({ center, zoom }: { center: [number, number]; zoom: number }) {
  const map = useMap();
  useEffect(() => {
    map.setView(center, zoom);
  }, [center, zoom, map]);
  return null;
}

export default function Map({ center = [20.5937, 78.9629], zoom = 5, markers = [], onLocationSelect, onAssign, interactive = true }: MapProps) {
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  if (!isMounted) return <div className="h-full w-full bg-muted animate-pulse rounded-xl" />;

  const volunteers = markers.filter(m => m.type === "volunteer");

  return (
    <MapContainer 
      center={center} 
      zoom={zoom} 
      scrollWheelZoom={interactive} 
      className="h-full w-full rounded-xl shadow-inner z-10"
      // Use a key to force re-initialization if the base center changes drastically, 
      // but only if absolutely necessary. For now, we use ChangeView for smooth transitions.
    >
      <ChangeView center={center} zoom={zoom} />
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      {markers.map((marker) => (
        <Marker 
          key={marker.id} 
          position={marker.position} 
          icon={
            marker.type === "volunteer" 
              ? GreenIcon 
              : (marker.urgency === "high" ? RedIcon : (marker.urgency === "medium" ? YellowIcon : BlueIcon))
          }
        >
          <Popup className="custom-popup">
            <div className="font-sans p-2 min-w-[200px]">
              <p className="font-black text-foreground uppercase italic text-sm border-b border-border pb-2 mb-2 tracking-tight leading-none">
                {marker.title}
              </p>
              
              {marker.type === "report" && (
                <div className="space-y-3">
                  <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest flex items-center gap-1">
                    <Users className="w-3 h-3 text-emerald-500" /> Nearby Personnel
                  </p>
                  <div className="space-y-1 max-h-32 overflow-y-auto pr-2 custom-scrollbar">
                    {volunteers
                      .filter(v => (v as any).assignedReportsCount < 2) // Only show available personnel
                      .map(v => ({
                        ...v,
                        distance: calculateDistance(marker.position[0], marker.position[1], v.position[0], v.position[1])
                      }))
                      .sort((a, b) => a.distance - b.distance)
                      .slice(0, 5)
                      .map(v => (
                        <div key={v.id} className="flex justify-between items-center bg-muted/50 p-2 rounded-lg border border-border/50 group/v">
                           <div className="flex flex-col">
                             <span className="text-[10px] font-bold text-slate-600 italic leading-none">{v.name || "Volunteer"}</span>
                             <span className="text-[9px] font-black text-emerald-600 mt-1 uppercase tracking-tighter">
                               {v.distance.toFixed(1)} km
                             </span>
                           </div>
                           {onAssign && (
                             <button 
                               onClick={() => {
                                 if ((v as any).assignedReportsCount >= 2) return;
                                 onAssign(marker.id, (v as any).userId);
                               }}
                               disabled={(v as any).assignedReportsCount >= 2}
                               className={`px-2 py-1 text-[9px] font-black uppercase rounded-lg shadow-sm transition-all ${
                                 (v as any).assignedReportsCount >= 2 
                                   ? "bg-amber-100 text-amber-600 cursor-not-allowed border border-amber-200" 
                                   : "bg-indigo-600 hover:bg-indigo-700 text-white active:scale-95 shadow-indigo-100"
                               }`}
                             >
                               {(v as any).assignedReportsCount >= 2 ? "Busy" : "Assign"}
                             </button>
                           )}
                        </div>
                      ))
                    }
                    {volunteers.length === 0 && <p className="text-[10px] text-muted-foreground italic font-medium">No personnel in range.</p>}
                  </div>
                </div>
              )}

              {marker.type === "volunteer" && (
                <p className="text-[10px] font-bold text-emerald-600 uppercase tracking-widest bg-emerald-50 px-3 py-1.5 rounded-xl inline-block">Active Personnel</p>
              )}
            </div>
          </Popup>
        </Marker>
      ))}
      {onLocationSelect && interactive && <LocationPicker onSelect={onLocationSelect} />}
    </MapContainer>
  );
}

