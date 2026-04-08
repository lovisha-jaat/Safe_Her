import { Lock, Eye, EyeOff, Trash2, Download } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";

const PrivacySettings = () => {
  const { user } = useAuth();
  const [settings, setSettings] = useState({
    anonymousReports: true,
    hideProfile: false,
    twoFactorAuth: false,
  });

  const toggle = (key: keyof typeof settings) => {
    setSettings((prev) => {
      const updated = { ...prev, [key]: !prev[key] };
      toast.success("Privacy setting updated");
      return updated;
    });
  };

  const handleChangePassword = async () => {
    if (!user?.email) {
      toast.error("No email associated with this account");
      return;
    }
    const { error } = await supabase.auth.resetPasswordForEmail(user.email);
    if (error) {
      toast.error("Failed to send reset email");
    } else {
      toast.success("Password reset email sent!");
    }
  };

  const handleDownloadData = () => {
    toast.success("Your data export has been initiated. You'll receive it via email.");
  };

  const items = [
    { key: "anonymousReports" as const, icon: EyeOff, label: "Anonymous Reports", desc: "Hide your identity when reporting" },
    { key: "hideProfile" as const, icon: Eye, label: "Hide Profile", desc: "Make your profile invisible to others" },
    { key: "twoFactorAuth" as const, icon: Lock, label: "Two-Factor Auth", desc: "Extra security for your account" },
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

      <div className="space-y-2 pt-2">
        <Button variant="outline" className="w-full justify-start gap-3" onClick={handleChangePassword}>
          <Lock className="w-4 h-4" /> Change Password
        </Button>
        <Button variant="outline" className="w-full justify-start gap-3" onClick={handleDownloadData}>
          <Download className="w-4 h-4" /> Download My Data
        </Button>
        <Button variant="outline" className="w-full justify-start gap-3 text-destructive hover:text-destructive" onClick={() => toast.error("Please contact support to delete your account.")}>
          <Trash2 className="w-4 h-4" /> Delete Account
        </Button>
      </div>
    </div>
  );
};

export default PrivacySettings;
