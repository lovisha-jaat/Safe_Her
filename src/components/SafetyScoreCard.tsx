import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Shield, MapPinOff } from "lucide-react";

interface SafetyScoreCardProps {
  label: string;
}

type LocationState =
  | { status: "loading" }
  | { status: "denied" }
  | { status: "unsupported" }
  | { status: "ok"; score: number };

// Deterministic pseudo-score from coordinates so the same area = same score
const scoreFromCoords = (lat: number, lng: number) => {
  const seed = Math.abs(Math.sin(lat * 12.9898 + lng * 78.233) * 43758.5453);
  const fraction = seed - Math.floor(seed);
  return Math.round(55 + fraction * 40); // 55-95 range
};

const SafetyScoreCard = ({ label }: SafetyScoreCardProps) => {
  const [state, setState] = useState<LocationState>({ status: "loading" });

  useEffect(() => {
    if (!("geolocation" in navigator)) {
      setState({ status: "unsupported" });
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setState({
          status: "ok",
          score: scoreFromCoords(pos.coords.latitude, pos.coords.longitude),
        });
      },
      () => setState({ status: "denied" }),
      { enableHighAccuracy: false, timeout: 8000, maximumAge: 60000 }
    );
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
