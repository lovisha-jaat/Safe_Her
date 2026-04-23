import { useState } from "react";
import { motion } from "framer-motion";
import { FileWarning, MapPin, Camera, Send, ChevronDown, Shield } from "lucide-react";
import SOSButton from "@/components/SOSButton";
import BottomNav from "@/components/BottomNav";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const incidentTypes = [
  "Harassment", "Stalking", "Theft", "Assault", "Eve Teasing",
  "Unsafe Area", "Poor Lighting", "Other",
];

const ReportIncident = () => {
  const { user } = useAuth();
  const [type, setType] = useState("");
  const [description, setDescription] = useState("");
  const [isAnonymous, setIsAnonymous] = useState(true);
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [locationLoading, setLocationLoading] = useState(false);

  const handleGetLocation = () => {
    if (!("geolocation" in navigator)) {
      toast.error("Geolocation not supported");
      return;
    }
    setLocationLoading(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setLocationLoading(false);
        toast.success("Location captured!");
      },
      () => {
        toast.error("Could not get location");
        setLocationLoading(false);
      },
      { enableHighAccuracy: true }
    );
  };

  const handleSubmit = async () => {
    if (!type || !description || !user) return;
    setLoading(true);
    const { error } = await supabase.from("incident_reports").insert({
      user_id: user.id,
      incident_type: type,
      description,
      is_anonymous: isAnonymous,
      location_lat: location?.lat ?? null,
      location_lng: location?.lng ?? null,
    });

    if (error) {
      console.error("Report submission error:", error);
      toast.error("Failed to submit report. Please try again.");
    } else {
      setSubmitted(true);
    }
    setLoading(false);
  };

  if (submitted) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6 pb-24">
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="text-center"
        >
          <div className="w-20 h-20 rounded-full bg-safe/10 flex items-center justify-center mx-auto mb-4">
            <Shield className="w-10 h-10 text-safe" />
          </div>
          <h2 className="text-2xl font-bold text-foreground mb-2">Report Submitted</h2>
          <p className="text-muted-foreground text-sm mb-6">
            Thank you for helping keep our community safer. Your report will be verified and forwarded to authorities.
          </p>
          <button
            onClick={() => {
              setSubmitted(false);
              setType("");
              setDescription("");
              setLocation(null);
            }}
            className="px-8 py-3 rounded-2xl gradient-primary text-primary-foreground font-semibold shadow-soft"
          >
            Submit Another
          </button>
        </motion.div>
        <SOSButton />
        <BottomNav />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-24">
      <div className="px-4 pt-12">
        <div className="flex items-center gap-3 mb-1">
          <div className="w-10 h-10 rounded-xl gradient-primary flex items-center justify-center">
            <FileWarning className="w-5 h-5 text-primary-foreground" />
          </div>
          <h1 className="text-2xl font-bold text-foreground">Report Incident</h1>
        </div>
        <p className="text-muted-foreground text-sm mb-6 ml-[52px]">
          Help make your community safer
        </p>

        <div className="space-y-4">
          {/* Anonymous toggle */}
          <div className="bg-card rounded-2xl p-4 shadow-card flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-card-foreground">Report Anonymously</p>
              <p className="text-xs text-muted-foreground">Your identity will be hidden</p>
            </div>
            <button
              onClick={() => setIsAnonymous(!isAnonymous)}
              className={`w-12 h-7 rounded-full transition-colors relative ${
                isAnonymous ? "gradient-primary" : "bg-muted"
              }`}
            >
              <motion.div
                animate={{ x: isAnonymous ? 20 : 2 }}
                className="w-5 h-5 rounded-full bg-primary-foreground absolute top-1 shadow-sm"
              />
            </button>
          </div>

          {/* Incident Type */}
          <div className="bg-card rounded-2xl p-4 shadow-card">
            <label className="text-sm font-semibold text-card-foreground mb-3 block">
              Type of Incident
            </label>
            <div className="flex flex-wrap gap-2">
              {incidentTypes.map((t) => (
                <button
                  key={t}
                  onClick={() => setType(t)}
                  className={`px-3 py-2 rounded-xl text-xs font-medium transition-colors ${
                    type === t
                      ? "gradient-primary text-primary-foreground shadow-soft"
                      : "bg-secondary text-secondary-foreground"
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>

          {/* Location */}
          <div className="bg-card rounded-2xl p-4 shadow-card">
            <label className="text-sm font-semibold text-card-foreground mb-2 block">Location</label>
            <button
              onClick={handleGetLocation}
              disabled={locationLoading}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-xl bg-secondary text-secondary-foreground"
            >
              <MapPin className={`w-4 h-4 ${location ? "text-safe" : "text-primary"}`} />
              <span className="text-sm">
                {locationLoading
                  ? "Getting location..."
                  : location
                    ? `📍 ${location.lat.toFixed(4)}, ${location.lng.toFixed(4)}`
                    : "Use current location"}
              </span>
              {!location && <ChevronDown className="w-4 h-4 ml-auto text-muted-foreground" />}
            </button>
          </div>

          {/* Description */}
          <div className="bg-card rounded-2xl p-4 shadow-card">
            <label className="text-sm font-semibold text-card-foreground mb-2 block">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe what happened..."
              rows={4}
              className="w-full px-4 py-3 rounded-xl bg-secondary text-secondary-foreground border-0 resize-none text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          {/* Media Upload */}
          <div className="bg-card rounded-2xl p-4 shadow-card">
            <label className="text-sm font-semibold text-card-foreground mb-2 block">
              Evidence (Optional)
            </label>
            <button className="w-full flex items-center gap-3 px-4 py-6 rounded-xl border-2 border-dashed border-border">
              <Camera className="w-5 h-5 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Upload photos or videos</span>
            </button>
          </div>

          {/* Submit */}
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={handleSubmit}
            disabled={!type || !description || loading}
            className="w-full flex items-center justify-center gap-2 py-4 rounded-2xl gradient-primary text-primary-foreground font-bold text-base shadow-soft disabled:opacity-50"
          >
            <Send className="w-5 h-5" />
            {loading ? "Submitting..." : "Submit Report"}
          </motion.button>
        </div>
      </div>

      <SOSButton />
      <BottomNav />
    </div>
  );
};

export default ReportIncident;
