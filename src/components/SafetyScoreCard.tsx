import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Shield, MapPinOff } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface SafetyScoreCardProps {
  label: string;
}

type LocationState =
  | { status: "loading" }
  | { status: "denied" }
  | { status: "unsupported" }
  | { status: "ok"; score: number };

type IncidentRow = {
  location_lat: number | null;
  location_lng: number | null;
  created_at: string;
};

const distanceKm = (lat1: number, lng1: number, lat2: number, lng2: number) => {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const earthRadiusKm = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return earthRadiusKm * c;
};

const scoreFromIncidents = (lat: number, lng: number, incidents: IncidentRow[]) => {
  const nearby = incidents
    .filter((i) => i.location_lat !== null && i.location_lng !== null)
    .map((i) => {
      const km = distanceKm(lat, lng, i.location_lat as number, i.location_lng as number);
      const ageDays = Math.max(
        0,
        (Date.now() - new Date(i.created_at).getTime()) / (1000 * 60 * 60 * 24)
      );
      return { km, ageDays };
    })
    .filter((i) => i.km <= 5);

  // If no nearby incidents, area is considered relatively safer.
  if (nearby.length === 0) return 88;

  // Closer + more recent incidents reduce safety score more.
  const riskPoints = nearby.reduce((sum, i) => {
    const distanceWeight = i.km <= 1 ? 1 : i.km <= 3 ? 0.65 : 0.4;
    const recencyWeight = i.ageDays <= 7 ? 1 : i.ageDays <= 30 ? 0.7 : 0.45;
    return sum + distanceWeight * recencyWeight * 8;
  }, 0);

  return Math.max(20, Math.min(95, Math.round(95 - riskPoints)));
};

const SafetyScoreCard = ({ label }: SafetyScoreCardProps) => {
  const [state, setState] = useState<LocationState>({ status: "loading" });

  const requestAndLoadScore = async () => {
    if (!("geolocation" in navigator)) {
      setState({ status: "unsupported" });
      return;
    }

    setState({ status: "loading" });
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { data, error } = await supabase
          .from("incident_reports")
          .select("location_lat,location_lng,created_at")
          .eq("status", "verified")
          .not("location_lat", "is", null)
          .not("location_lng", "is", null)
          .order("created_at", { ascending: false })
          .limit(300);

        if (error) {
          // Fallback if API fails; avoid breaking dashboard render.
          setState({ status: "ok", score: 78 });
          return;
        }

        const score = scoreFromIncidents(
          pos.coords.latitude,
          pos.coords.longitude,
          (data ?? []) as IncidentRow[]
        );
        setState({ status: "ok", score });
      },
      () => {
        setState({ status: "denied" });
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 30000 }
    );
  };

  useEffect(() => {
    void requestAndLoadScore();
  }, []);

  const score = state.status === "ok" ? state.score : 0;

  const getColor = () => {
    if (score >= 70) return "text-safe";
    if (score >= 40) return "text-moderate";
    return "text-unsafe";
  };

  const getBarColor = () => {
    if (score >= 70) return "bg-safe";
    if (score >= 40) return "bg-moderate";
    return "bg-unsafe";
  };

  if (state.status !== "ok") {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-card rounded-2xl p-4 shadow-card"
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center">
            <MapPinOff className="w-5 h-5 text-muted-foreground" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-semibold text-card-foreground">{label}</p>
            <p className="text-xs text-muted-foreground">
              {state.status === "loading"
                ? "Detecting your location..."
                : state.status === "denied"
                  ? "Enable location to see your area's safety score"
                  : "Location not available on this device"}
            </p>
            {state.status === "denied" && (
              <button
                onClick={() => void requestAndLoadScore()}
                className="mt-2 text-xs font-semibold text-primary underline underline-offset-2"
              >
                Enable my location
              </button>
            )}
          </div>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-card rounded-2xl p-4 shadow-card"
    >
      <div className="flex items-center gap-3 mb-3">
        <div className="w-10 h-10 rounded-xl gradient-primary flex items-center justify-center">
          <Shield className="w-5 h-5 text-primary-foreground" />
        </div>
        <div>
          <p className="text-sm font-semibold text-card-foreground">{label}</p>
          <p className={`text-2xl font-extrabold ${getColor()}`}>{score}/100</p>
        </div>
      </div>
      <div className="w-full h-2 rounded-full bg-muted overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${score}%` }}
          transition={{ duration: 1, ease: "easeOut" }}
          className={`h-full rounded-full ${getBarColor()}`}
        />
      </div>
    </motion.div>
  );
};

export default SafetyScoreCard;
