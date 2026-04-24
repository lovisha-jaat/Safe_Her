import { useRef, useState } from "react";
import { motion } from "framer-motion";
import { FileWarning, MapPin, Camera, Send, ChevronDown, Shield, X, Image as ImageIcon, Video } from "lucide-react";
import SOSButton from "@/components/SOSButton";
import BottomNav from "@/components/BottomNav";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const incidentTypes = [
  "Harassment", "Stalking", "Theft", "Assault", "Eve Teasing",
  "Unsafe Area", "Poor Lighting", "Other",
];

const MAX_FILE_SIZE = 20 * 1024 * 1024; // 20 MB
const MAX_FILES = 5;

type EvidenceFile = {
  file: File;
  previewUrl: string;
  kind: "image" | "video";
};

const ReportIncident = () => {
  const { user } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [type, setType] = useState("");
  const [description, setDescription] = useState("");
  const [isAnonymous, setIsAnonymous] = useState(true);
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [locationLoading, setLocationLoading] = useState(false);
  const [evidence, setEvidence] = useState<EvidenceFile[]>([]);
  const [uploadProgress, setUploadProgress] = useState<string>("");

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

  const handleFilesSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    if (!files.length) return;

    const remaining = MAX_FILES - evidence.length;
    if (files.length > remaining) {
      toast.error(`You can attach up to ${MAX_FILES} files`);
    }
    const accepted: EvidenceFile[] = [];
    for (const file of files.slice(0, remaining)) {
      if (file.size > MAX_FILE_SIZE) {
        toast.error(`${file.name} is larger than 20 MB`);
        continue;
      }
      const isImage = file.type.startsWith("image/");
      const isVideo = file.type.startsWith("video/");
      if (!isImage && !isVideo) {
        toast.error(`${file.name} is not a photo or video`);
        continue;
      }
      accepted.push({
        file,
        previewUrl: URL.createObjectURL(file),
        kind: isImage ? "image" : "video",
      });
    }
    setEvidence((prev) => [...prev, ...accepted]);
    // reset input so the same file can be re-picked
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const removeEvidence = (idx: number) => {
    setEvidence((prev) => {
      const next = [...prev];
      const [removed] = next.splice(idx, 1);
      if (removed) URL.revokeObjectURL(removed.previewUrl);
      return next;
    });
  };

  const uploadEvidence = async (): Promise<string[]> => {
    if (!user || evidence.length === 0) return [];
    const urls: string[] = [];
    for (let i = 0; i < evidence.length; i++) {
      const { file } = evidence[i];
      setUploadProgress(`Uploading ${i + 1} of ${evidence.length}...`);
      const ext = file.name.split(".").pop() || "bin";
      const path = `${user.id}/${Date.now()}-${i}.${ext}`;
      const { error: uploadError } = await supabase.storage
        .from("incident-evidence")
        .upload(path, file, { contentType: file.type, upsert: false });
      if (uploadError) {
        console.error("Upload error:", uploadError);
        throw new Error(`Failed to upload ${file.name}`);
      }
      urls.push(path);
    }
    setUploadProgress("");
    return urls;
  };

  const handleSubmit = async () => {
    if (!type || !description || !user) return;
    setLoading(true);
    try {
      const evidence_urls = await uploadEvidence();
      const { error } = await supabase.from("incident_reports").insert({
        user_id: user.id,
        incident_type: type,
        description,
        is_anonymous: isAnonymous,
        location_lat: location?.lat ?? null,
        location_lng: location?.lng ?? null,
        evidence_urls,
      });

      if (error) {
        console.error("Report submission error:", error);
        toast.error("Failed to submit report. Please try again.");
      } else {
        // cleanup previews
        evidence.forEach((e) => URL.revokeObjectURL(e.previewUrl));
        setEvidence([]);
        setSubmitted(true);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Upload failed";
      toast.error(msg);
    } finally {
      setLoading(false);
      setUploadProgress("");
    }
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
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*,video/*"
              multiple
              onChange={handleFilesSelected}
              className="hidden"
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={evidence.length >= MAX_FILES || loading}
              className="w-full flex items-center justify-center gap-3 px-4 py-6 rounded-xl border-2 border-dashed border-border hover:border-primary/50 transition-colors disabled:opacity-50"
            >
              <Camera className="w-5 h-5 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">
                {evidence.length >= MAX_FILES
                  ? `Max ${MAX_FILES} files reached`
                  : "Upload photos or videos"}
              </span>
            </button>

            {evidence.length > 0 && (
              <div className="grid grid-cols-3 gap-2 mt-3">
                {evidence.map((item, idx) => (
                  <div
                    key={idx}
                    className="relative aspect-square rounded-xl overflow-hidden bg-secondary group"
                  >
                    {item.kind === "image" ? (
                      <img
                        src={item.previewUrl}
                        alt={`evidence-${idx}`}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex flex-col items-center justify-center text-muted-foreground">
                        <Video className="w-6 h-6 mb-1" />
                        <span className="text-[10px] truncate px-1 max-w-full">
                          {item.file.name}
                        </span>
                      </div>
                    )}
                    <button
                      type="button"
                      onClick={() => removeEvidence(idx)}
                      className="absolute top-1 right-1 w-6 h-6 rounded-full bg-background/80 backdrop-blur flex items-center justify-center text-foreground hover:bg-destructive hover:text-destructive-foreground transition-colors"
                      aria-label="Remove file"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                    <div className="absolute bottom-1 left-1 px-1.5 py-0.5 rounded-md bg-background/80 backdrop-blur text-[10px] flex items-center gap-1">
                      {item.kind === "image" ? (
                        <ImageIcon className="w-3 h-3" />
                      ) : (
                        <Video className="w-3 h-3" />
                      )}
                      {(item.file.size / (1024 * 1024)).toFixed(1)}MB
                    </div>
                  </div>
                ))}
              </div>
            )}
            <p className="text-xs text-muted-foreground mt-2">
              Up to {MAX_FILES} files, 20 MB each. Photos & videos only.
            </p>
          </div>

          {/* Submit */}
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={handleSubmit}
            disabled={!type || !description || loading}
            className="w-full flex items-center justify-center gap-2 py-4 rounded-2xl gradient-primary text-primary-foreground font-bold text-base shadow-soft disabled:opacity-50"
          >
            <Send className="w-5 h-5" />
            {loading ? (uploadProgress || "Submitting...") : "Submit Report"}
          </motion.button>
        </div>
      </div>

      <SOSButton />
      <BottomNav />
    </div>
  );
};

export default ReportIncident;
