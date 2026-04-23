import { useEffect, useRef, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import "leaflet.heat";

// Fix default marker icons
import markerIcon2x from "leaflet/dist/images/marker-icon-2x.png";
import markerIcon from "leaflet/dist/images/marker-icon.png";
import markerShadow from "leaflet/dist/images/marker-shadow.png";

delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
});

interface SafetyZone {
  id: number;
  name: string;
  rating: number;
  status: "safe" | "moderate" | "unsafe";
  lat: number;
  lng: number;
}

interface SearchResult {
  lat: number;
  lng: number;
  name: string;
  safetyRating: number;
  safetyStatus: "safe" | "moderate" | "unsafe";
}

interface IncidentMarker {
  id: string;
  lat: number;
  lng: number;
  type: string;
  description: string;
  created_at: string;
}

interface LeafletMapProps {
  zones: SafetyZone[];
  showHeatmap: boolean;
  trackLocation: boolean;
  searchResult?: SearchResult | null;
  incidents?: IncidentMarker[];
}

const statusColors = {
  safe: "#22c55e",
  moderate: "#f59e0b",
  unsafe: "#ef4444",
};

const LeafletMap = ({ zones, showHeatmap, trackLocation, searchResult, incidents = [] }: LeafletMapProps) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<L.Map | null>(null);
  const userMarker = useRef<L.Marker | null>(null);
  const trackLine = useRef<L.Polyline | null>(null);
  const searchMarker = useRef<L.Marker | null>(null);
  const [userPos, setUserPos] = useState<[number, number] | null>(null);

  // Initialize map
  useEffect(() => {
    if (!mapRef.current || mapInstance.current) return;

    const map = L.map(mapRef.current, {
      zoomControl: false,
    }).setView([28.6139, 77.209], 12);

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      maxZoom: 19,
    }).addTo(map);

    L.control.zoom({ position: "bottomright" }).addTo(map);

    mapInstance.current = map;

    return () => {
      map.remove();
      mapInstance.current = null;
    };
  }, []);

  // Add zone markers
  useEffect(() => {
    const map = mapInstance.current;
    if (!map) return;

    const markers: L.CircleMarker[] = [];

    zones.forEach((zone) => {
      const color = statusColors[zone.status];
      const marker = L.circleMarker([zone.lat, zone.lng], {
        radius: 14,
        fillColor: color,
        color: color,
        weight: 2,
        opacity: 0.9,
        fillOpacity: 0.35,
      }).addTo(map);

      marker.bindPopup(`
        <div style="text-align:center;font-family:sans-serif;">
          <strong style="font-size:14px;">${zone.name}</strong><br/>
          <span style="color:${color};font-weight:700;font-size:18px;">${zone.rating}</span>
          <span style="color:#888;font-size:11px;">/100</span><br/>
          <span style="background:${color};color:#fff;padding:2px 8px;border-radius:12px;font-size:11px;font-weight:600;text-transform:capitalize;">${zone.status}</span>
        </div>
      `);

      markers.push(marker);
    });

    return () => {
      markers.forEach((m) => m.remove());
    };
  }, [zones]);

  // Heatmap layer
  useEffect(() => {
    const map = mapInstance.current;
    if (!map) return;

    let heatLayer: any = null;

    if (showHeatmap && zones.length > 0) {
      const heatData = zones.map((z) => [z.lat, z.lng, (100 - z.rating) / 100]);
      // @ts-ignore
      heatLayer = (L as any).heatLayer(heatData, {
        radius: 40,
        blur: 30,
        maxZoom: 15,
        max: 1.0,
        gradient: {
          0.2: "#22c55e",
          0.5: "#f59e0b",
          0.8: "#ef4444",
          1.0: "#991b1b",
        },
      }).addTo(map);
    }

    return () => {
      if (heatLayer) map.removeLayer(heatLayer);
    };
  }, [showHeatmap, zones]);

  // Live location tracking
  useEffect(() => {
    const map = mapInstance.current;
    if (!map || !trackLocation) return;

    let watchId: number;

    const posHistory: L.LatLngExpression[] = [];

    const onSuccess = (pos: GeolocationPosition) => {
      const latlng: [number, number] = [pos.coords.latitude, pos.coords.longitude];
      setUserPos(latlng);
      posHistory.push(latlng);

      if (userMarker.current) {
        userMarker.current.setLatLng(latlng);
      } else {
        userMarker.current = L.marker(latlng, {
          icon: L.divIcon({
            className: "",
            html: `<div style="width:18px;height:18px;background:hsl(270,70%,55%);border:3px solid white;border-radius:50%;box-shadow:0 0 12px hsl(270,70%,55%,0.6);"></div>`,
            iconSize: [18, 18],
            iconAnchor: [9, 9],
          }),
        }).addTo(map);
        map.setView(latlng, 14);
      }

      if (trackLine.current) {
        trackLine.current.setLatLngs(posHistory);
      } else {
        trackLine.current = L.polyline(posHistory, {
          color: "hsl(270,70%,55%)",
          weight: 3,
          opacity: 0.7,
          dashArray: "8,6",
        }).addTo(map);
      }
    };

    if ("geolocation" in navigator) {
      watchId = navigator.geolocation.watchPosition(onSuccess, () => {}, {
        enableHighAccuracy: true,
        maximumAge: 5000,
      });
    }

    return () => {
      if (watchId) navigator.geolocation.clearWatch(watchId);
      if (userMarker.current) {
        userMarker.current.remove();
        userMarker.current = null;
      }
      if (trackLine.current) {
        trackLine.current.remove();
        trackLine.current = null;
      }
    };
  }, [trackLocation]);

  // Search result marker
  useEffect(() => {
    const map = mapInstance.current;
    if (!map) return;

    if (searchMarker.current) {
      searchMarker.current.remove();
      searchMarker.current = null;
    }

    if (searchResult) {
      const color = statusColors[searchResult.safetyStatus];
      const marker = L.marker([searchResult.lat, searchResult.lng], {
        icon: L.divIcon({
          className: "",
          html: `<div style="width:28px;height:28px;background:${color};border:3px solid white;border-radius:50%;box-shadow:0 0 16px ${color}88;display:flex;align-items:center;justify-content:center;">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="white"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3" fill="${color}"/></svg>
          </div>`,
          iconSize: [28, 28],
          iconAnchor: [14, 14],
        }),
      }).addTo(map);

      marker.bindPopup(`
        <div style="text-align:center;font-family:sans-serif;min-width:140px;">
          <strong style="font-size:14px;">${searchResult.name}</strong><br/>
          <span style="color:${color};font-weight:700;font-size:20px;">${searchResult.safetyRating}</span>
          <span style="color:#888;font-size:11px;">/100</span><br/>
          <span style="background:${color};color:#fff;padding:2px 10px;border-radius:12px;font-size:11px;font-weight:600;text-transform:capitalize;">${searchResult.safetyStatus}</span>
        </div>
      `).openPopup();

      searchMarker.current = marker;
      map.setView([searchResult.lat, searchResult.lng], 14);
    }

    return () => {
      if (searchMarker.current) {
        searchMarker.current.remove();
        searchMarker.current = null;
      }
    };
  }, [searchResult]);

  // Incident report markers (community-verified)
  useEffect(() => {
    const map = mapInstance.current;
    if (!map) return;
    const markers: L.Marker[] = [];
    incidents.forEach((inc) => {
      const html = `<div style="width:22px;height:22px;background:#f59e0b;border:2px solid white;border-radius:50%;box-shadow:0 0 8px rgba(245,158,11,0.6);display:flex;align-items:center;justify-content:center;color:white;font-size:11px;font-weight:700;">!</div>`;
      const m = L.marker([inc.lat, inc.lng], {
        icon: L.divIcon({ className: "", html, iconSize: [22, 22], iconAnchor: [11, 11] }),
      }).addTo(map);
      const date = new Date(inc.created_at).toLocaleDateString();
      const desc = inc.description.length > 120 ? inc.description.slice(0, 120) + "…" : inc.description;
      m.bindPopup(`
        <div style="font-family:sans-serif;min-width:160px;max-width:220px;">
          <div style="background:#f59e0b;color:white;padding:2px 8px;border-radius:10px;font-size:11px;font-weight:600;display:inline-block;margin-bottom:4px;">${inc.type}</div>
          <div style="font-size:12px;color:#333;line-height:1.4;">${desc}</div>
          <div style="font-size:10px;color:#888;margin-top:4px;">Reported ${date}</div>
        </div>
      `);
      markers.push(m);
    });
    return () => {
      markers.forEach((m) => m.remove());
    };
  }, [incidents]);

  return (
    <div ref={mapRef} className="w-full h-full rounded-3xl" style={{ minHeight: 300 }} />
  );
};

export default LeafletMap;
