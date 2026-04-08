import { Bell, MessageSquare, AlertTriangle, MapPin } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { useState } from "react";
import { toast } from "sonner";

const NotificationSettings = () => {
  const [settings, setSettings] = useState({
    sosAlerts: true,
    nearbyIncidents: true,
    safetyTips: false,
    locationReminders: true,
    soundAlerts: true,
    vibration: true,
  });

  const toggle = (key: keyof typeof settings) => {
    setSettings((prev) => {
      const updated = { ...prev, [key]: !prev[key] };
      toast.success("Notification preference updated");
      return updated;
    });
  };

  const items = [
    { key: "sosAlerts" as const, icon: AlertTriangle, label: "SOS Alerts", desc: "Get notified when contacts trigger SOS" },
    { key: "nearbyIncidents" as const, icon: MapPin, label: "Nearby Incidents", desc: "Alerts for incidents in your area" },
    { key: "safetyTips" as const, icon: MessageSquare, label: "Safety Tips", desc: "Daily safety tips & reminders" },
    { key: "locationReminders" as const, icon: MapPin, label: "Location Reminders", desc: "Remind to share location" },
    { key: "soundAlerts" as const, icon: Bell, label: "Sound Alerts", desc: "Play sound for critical alerts" },
    { key: "vibration" as const, icon: Bell, label: "Vibration", desc: "Vibrate on notifications" },
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
    </div>
  );
};

export default NotificationSettings;
