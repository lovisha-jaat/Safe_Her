import { useState, lazy, Suspense, useCallback, useEffect } from "react";
import { motion } from "framer-motion";
import { MapPin, Shield, AlertTriangle, Star, Search, Layers, Flame, Navigation, Loader2, FileWarning } from "lucide-react";
import SOSButton from "@/components/SOSButton";
import BottomNav from "@/components/BottomNav";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

const LeafletMap = lazy(() => import("@/components/LeafletMap"));

interface IncidentMarker {
  id: string;
  lat: number;
  lng: number;
  type: string;
  description: string;
  created_at: string;
}

const safetyZones = [
  { id: 1, name: "Connaught Place", rating: 85, reviews: 234, status: "safe" as const, lat: 28.6315, lng: 77.2167 },
  { id: 2, name: "Karol Bagh Market", rating: 62, reviews: 128, status: "moderate" as const, lat: 28.6519, lng: 77.1907 },
  { id: 3, name: "Paharganj Area", rating: 28, reviews: 89, status: "unsafe" as const, lat: 28.6448, lng: 77.2132 },
  { id: 4, name: "Saket Mall Area", rating: 91, reviews: 312, status: "safe" as const, lat: 28.5244, lng: 77.2066 },
  { id: 5, name: "Old Delhi", rating: 35, reviews: 156, status: "unsafe" as const, lat: 28.6562, lng: 77.2410 },
  { id: 6, name: "India Gate", rating: 88, reviews: 445, status: "safe" as const, lat: 28.6129, lng: 77.2295 },
  { id: 7, name: "Chandni Chowk", rating: 42, reviews: 201, status: "moderate" as const, lat: 28.6506, lng: 77.2300 },
];

interface SearchResult {
  lat: number;
  lng: number;
  name: string;
  safetyRating: number;
  safetyStatus: "safe" | "moderate" | "unsafe";
}

const statusConfig = {
  safe: { color: "bg-safe", text: "text-safe", label: "Safe", icon: Shield },
  moderate: { color: "bg-moderate", text: "text-moderate", label: "Moderate", icon: AlertTriangle },
  unsafe: { color: "bg-unsafe", text: "text-unsafe", label: "Unsafe", icon: AlertTriangle },
};

// Calculate safety based on proximity to known zones
const calculateSafety = (lat: number, lng: number) => {
  const nearbyZones = safetyZones
    .map((z) => ({
      ...z,
      dist: Math.sqrt((z.lat - lat) ** 2 + (z.lng - lng) ** 2),
    }))
    .sort((a, b) => a.dist - b.dist);

  const closest = nearbyZones[0];
  if (closest.dist < 0.02) {
    return { rating: closest.rating, status: closest.status };
  }

  // Weighted average of nearby zones (closer = more weight)
  let totalWeight = 0;
  let weightedRating = 0;
  nearbyZones.slice(0, 3).forEach((z) => {
    const weight = 1 / (z.dist + 0.001);
    totalWeight += weight;
    weightedRating += z.rating * weight;
  });

  const rating = Math.round(weightedRating / totalWeight);
  const status: "safe" | "moderate" | "unsafe" =
    rating >= 70 ? "safe" : rating >= 40 ? "moderate" : "unsafe";
  return { rating, status };
};

const MapView = () => {
  const [activeFilter, setActiveFilter] = useState<"all" | "safe" | "moderate" | "unsafe">("all");
  const [view, setView] = useState<"list" | "map">("map");
  const [showHeatmap, setShowHeatmap] = useState(false);
  const [trackLocation, setTrackLocation] = useState(false);
  const [showIncidents, setShowIncidents] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [searching, setSearching] = useState(false);
  const [searchResult, setSearchResult] = useState<SearchResult | null>(null);
  const [incidents, setIncidents] = useState<IncidentMarker[]>([]);

  // Load community-verified incident reports
  useEffect(() => {
    let mounted = true;
    (async () => {
      const { data, error } = await supabase
        .from("incident_reports")
        .select("id, location_lat, location_lng, incident_type, description, created_at, status")
        .eq("status", "verified")
        .not("location_lat", "is", null)
        .not("location_lng", "is", null)
        .order("created_at", { ascending: false })
        .limit(200);
      if (!mounted) return;
      if (error) {
        console.error("Failed to load incidents:", error);
        return;
      }
      setIncidents(
        (data ?? []).map((r) => ({
          id: r.id,
          lat: r.location_lat as number,
          lng: r.location_lng as number,
          type: r.incident_type,
          description: r.description,
          created_at: r.created_at,
        }))
      );
    })();
    return () => {
      mounted = false;
    };
  }, []);

  const filtered = activeFilter === "all" ? safetyZones : safetyZones.filter((z) => z.status === activeFilter);

  const handleSearch = useCallback(async () => {
    const q = searchQuery.trim();
    if (!q) return;

    setSearching(true);
    try {
      // Bias to India and accept villages/hamlets; fall back to global search
      const url1 = `https://nominatim.openstreetmap.org/search?format=json&addressdetails=1&limit=5&countrycodes=in&q=${encodeURIComponent(q)}`;
      let res = await fetch(url1, { headers: { "Accept-Language": "en" } });
      let data = await res.json();
      if (!Array.isArray(data) || data.length === 0) {
        const url2 = `https://nominatim.openstreetmap.org/search?format=json&addressdetails=1&limit=5&q=${encodeURIComponent(q)}`;
        res = await fetch(url2, { headers: { "Accept-Language": "en" } });
        data = await res.json();
      }
      if (!Array.isArray(data) || data.length === 0) {
        toast.error("Location not found", {
          description: "Try adding district or state, e.g. 'Khurdi, Yamunanagar, Haryana'.",
        });
        return;
      }
      const { lat, lon, display_name } = data[0];
      const parsedLat = parseFloat(lat);
      const parsedLng = parseFloat(lon);
      const safety = calculateSafety(parsedLat, parsedLng);

      setSearchResult({
        lat: parsedLat,
        lng: parsedLng,
        name: display_name.split(",").slice(0, 2).join(", "),
        safetyRating: safety.rating,
        safetyStatus: safety.status,
      });
      setView("map");
    } catch {
      toast.error("Search failed", { description: "Please check your internet connection." });
    } finally {
      setSearching(false);
    }
  }, [searchQuery]);

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Header */}
      <div className="px-4 pt-12 pb-4">
        <h1 className="text-2xl font-bold text-foreground mb-1">Safety Map</h1>
        <p className="text-muted-foreground text-sm mb-4">Explore area safety ratings</p>

        {/* Search */}
        <div className="relative mb-4">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
            placeholder="Search for a location..."
            className="w-full pl-11 pr-12 py-3 rounded-2xl bg-card shadow-card text-sm text-card-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
          />
          <button
            onClick={handleSearch}
            disabled={searching}
            className="absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-xl gradient-primary text-primary-foreground"
          >
            {searching ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
          </button>
        </div>

        {/* Filters */}
        <div className="flex gap-2 mb-4">
          {(["all", "safe", "moderate", "unsafe"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setActiveFilter(f)}
              className={`px-4 py-2 rounded-xl text-xs font-semibold capitalize transition-colors ${
                activeFilter === f
                  ? "gradient-primary text-primary-foreground shadow-soft"
                  : "bg-card text-card-foreground shadow-card"
              }`}
            >
              {f}
            </button>
          ))}
        </div>

        {/* View toggle + Map controls */}
        <div className="flex gap-2 mb-4">
          <button
            onClick={() => setView("map")}
            className={`flex-1 py-2.5 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 ${
              view === "map" ? "gradient-primary text-primary-foreground" : "bg-card text-card-foreground"
            }`}
          >
            <MapPin className="w-4 h-4" /> Map
          </button>
          <button
            onClick={() => setView("list")}
            className={`flex-1 py-2.5 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 ${
              view === "list" ? "gradient-primary text-primary-foreground" : "bg-card text-card-foreground"
            }`}
          >
            <Layers className="w-4 h-4" /> List
          </button>
        </div>

        {view === "map" && (
          <div className="flex gap-2 mb-2">
            <button
              onClick={() => setShowHeatmap(!showHeatmap)}
              className={`flex-1 py-2 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors ${
                showHeatmap ? "bg-unsafe/15 text-unsafe border border-unsafe/30" : "bg-card text-card-foreground shadow-card"
              }`}
            >
              <Flame className="w-3.5 h-3.5" /> Heatmap
            </button>
            <button
              onClick={() => setTrackLocation(!trackLocation)}
              className={`flex-1 py-2 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors ${
                trackLocation ? "bg-primary/15 text-primary border border-primary/30" : "bg-card text-card-foreground shadow-card"
              }`}
            >
              <Navigation className="w-3.5 h-3.5" /> Live Track
            </button>
            <button
              onClick={() => setShowIncidents(!showIncidents)}
              className={`flex-1 py-2 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors ${
                showIncidents ? "bg-moderate/15 text-moderate border border-moderate/30" : "bg-card text-card-foreground shadow-card"
              }`}
            >
              <FileWarning className="w-3.5 h-3.5" /> Reports ({incidents.length})
            </button>
          </div>
        )}
      </div>

      {view === "map" && (
        <div className="mx-4 rounded-3xl overflow-hidden shadow-card h-80">
          <Suspense
            fallback={
              <div className="w-full h-full bg-card flex items-center justify-center">
                <div className="animate-spin w-8 h-8 border-3 border-primary border-t-transparent rounded-full" />
              </div>
            }
          >
            <LeafletMap
              zones={filtered}
              showHeatmap={showHeatmap}
              trackLocation={trackLocation}
              searchResult={searchResult}
              incidents={showIncidents ? incidents : []}
            />
          </Suspense>
        </div>
      )}

      {/* Locations List */}
      <div className="px-4 mt-4 space-y-2">
        <h3 className="text-sm font-bold text-foreground">
          {view === "map" ? "Nearby Areas" : "All Areas"}
        </h3>
        {filtered.map((zone, i) => {
          const config = statusConfig[zone.status];
          return (
            <motion.div
              key={zone.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className="bg-card rounded-2xl p-4 shadow-card flex items-center gap-3"
            >
              <div className={`w-10 h-10 rounded-xl ${config.color}/15 flex items-center justify-center`}>
                <config.icon className={`w-5 h-5 ${config.text}`} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-card-foreground">{zone.name}</p>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className={`text-xs font-medium ${config.text}`}>{config.label}</span>
                  <span className="text-[10px] text-muted-foreground">•</span>
                  <div className="flex items-center gap-0.5">
                    <Star className="w-3 h-3 text-moderate fill-moderate" />
                    <span className="text-xs text-muted-foreground">{zone.reviews} reviews</span>
                  </div>
                </div>
              </div>
              <div className="text-right">
                <p className={`text-lg font-extrabold ${config.text}`}>{zone.rating}</p>
                <p className="text-[10px] text-muted-foreground">/100</p>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Legend */}
      <div className="mx-4 mt-4 bg-card rounded-2xl p-3 shadow-card">
        <p className="text-xs font-semibold text-card-foreground mb-2">Safety Legend</p>
        <div className="flex gap-4">
          {[
            { color: "bg-safe", label: "Safe (70+)" },
            { color: "bg-moderate", label: "Moderate (40-69)" },
            { color: "bg-unsafe", label: "Unsafe (<40)" },
          ].map((l) => (
            <div key={l.label} className="flex items-center gap-1.5">
              <div className={`w-3 h-3 rounded-full ${l.color}`} />
              <span className="text-[10px] text-muted-foreground">{l.label}</span>
            </div>
          ))}
        </div>
      </div>

      <SOSButton />
      <BottomNav />
    </div>
  );
};

export default MapView;
