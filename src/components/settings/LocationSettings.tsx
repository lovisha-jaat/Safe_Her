import { MapPin, Share2, Navigation, Eye } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { useState } from "react";
import { toast } from "sonner";

const LocationSettings = () => {
  const [settings, setSettings] = useState({
    liveTracking: true,
    shareWithContacts: false,
    highAccuracy: true,
    showOnMap: true,
  });

  const toggle = (key: keyof typeof settings) => {
    setSettings((prev) => {
      const updated = { ...prev, [key]: !prev[key] };
      toast.success("Location setting updated");
      return updated;
    });
  };

  const items = [
    { key: "liveTracking" as const, icon: Navigation, label: "Live Tracking", desc: "Enable real-time location tracking" },
    { key: "shareWithContacts" as const, icon: Share2, label: "Share with Contacts", desc: "Auto-share location with emergency contacts" },
    { key: "highAccuracy" as const, icon: MapPin, label: "High Accuracy", desc: "Use GPS for precise location (uses more battery)" },
    { key: "showOnMap" as const, icon: Eye, label: "Visible on Map", desc: "Show your location on community map" },
  ];

  return (
    <div className="space-y-3">
      {items.map((item) => (
        <div key={item.key} className="flex items-center justify-between bg-secondary/50 rounded-xl p-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center">
              <item.icon className="w-4 h-4 text-primary" />
            </div>
            <div>
              <p className="text-sm font-semibold text-foreground">{item.label}</p>
              <p className="text-xs text-muted-foreground">{item.desc}</p>
            </div>
          </div>
          <Switch checked={settings[item.key]} onCheckedChange={() => toggle(item.key)} />
        </div>
      ))}
      <div className="bg-primary/5 rounded-xl p-4 mt-4">
        <p className="text-xs text-muted-foreground">
          📍 Location data is encrypted and only shared with your emergency contacts when enabled.
        </p>
      </div>
    </div>
  );
};

export default LocationSettings;
