import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { User, Shield, Bell, Moon, Lock, LogOut, ChevronRight, MapPin, Clock, BadgeCheck, Pencil, Check, X } from "lucide-react";
import SOSButton from "@/components/SOSButton";
import BottomNav from "@/components/BottomNav";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";

const menuItems = [
  { icon: Bell, label: "Notifications", desc: "Alert preferences" },
  { icon: MapPin, label: "Location Settings", desc: "Tracking & sharing" },
  { icon: Lock, label: "Privacy & Security", desc: "Data protection" },
  { icon: Moon, label: "Appearance", desc: "Dark mode & themes" },
  { icon: Clock, label: "Alert History", desc: "Past SOS alerts" },
  { icon: Shield, label: "Verification", desc: "ID & face verification" },
];

const Profile = () => {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<{
    full_name: string | null;
    avatar_url: string | null;
    phone: string | null;
    verified: boolean;
    created_at: string;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!user) return;
    const fetchProfile = async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();

      if (error) {
        toast.error("Failed to load profile");
      } else if (data) {
        setProfile(data);
        setEditName(data.full_name || "");
        setEditPhone(data.phone || "");
      }
      setLoading(false);
    };
    fetchProfile();
  }, [user]);

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    const { error } = await supabase
      .from("profiles")
      .update({ full_name: editName, phone: editPhone })
      .eq("user_id", user.id);

    if (error) {
      toast.error("Failed to save profile");
    } else {
      setProfile((p) => p ? { ...p, full_name: editName, phone: editPhone } : p);
      setEditing(false);
      toast.success("Profile updated!");
    }
    setSaving(false);
  };

  const handleLogout = async () => {
    await signOut();
    navigate("/auth");
  };

  const memberSince = profile?.created_at
    ? new Date(profile.created_at).getFullYear()
    : new Date().getFullYear();

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Profile header */}
      <div className="gradient-hero px-6 pt-12 pb-8 rounded-b-[2rem]">
        {loading ? (
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-primary-foreground/20 animate-pulse" />
            <div className="space-y-2">
              <div className="w-32 h-5 bg-primary-foreground/20 rounded animate-pulse" />
              <div className="w-24 h-4 bg-primary-foreground/10 rounded animate-pulse" />
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-primary-foreground/20 flex items-center justify-center overflow-hidden">
              {profile?.avatar_url ? (
                <img src={profile.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
              ) : (
                <User className="w-8 h-8 text-primary-foreground" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              {editing ? (
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="bg-primary-foreground/20 text-primary-foreground text-lg font-bold rounded-xl px-3 py-1 w-full focus:outline-none focus:ring-2 focus:ring-primary-foreground/40"
                  placeholder="Your name"
                />
              ) : (
                <div className="flex items-center gap-2">
                  <h1 className="text-xl font-bold text-primary-foreground truncate">
                    {profile?.full_name || "User"}
                  </h1>
                  {profile?.verified && <BadgeCheck className="w-5 h-5 text-safe flex-shrink-0" />}
                </div>
              )}
              <p className="text-sm text-primary-foreground/70 truncate">{user?.email || user?.phone}</p>
              <p className="text-xs text-primary-foreground/50 mt-0.5">
                {profile?.verified ? "Verified User" : "Unverified"} • Member since {memberSince}
              </p>
            </div>
            {!editing ? (
              <button
                onClick={() => setEditing(true)}
                className="w-9 h-9 rounded-xl bg-primary-foreground/20 flex items-center justify-center flex-shrink-0"
              >
                <Pencil className="w-4 h-4 text-primary-foreground" />
              </button>
            ) : (
              <div className="flex gap-1.5 flex-shrink-0">
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="w-9 h-9 rounded-xl bg-safe/80 flex items-center justify-center"
                >
                  <Check className="w-4 h-4 text-primary-foreground" />
                </button>
                <button
                  onClick={() => { setEditing(false); setEditName(profile?.full_name || ""); setEditPhone(profile?.phone || ""); }}
                  className="w-9 h-9 rounded-xl bg-primary-foreground/20 flex items-center justify-center"
                >
                  <X className="w-4 h-4 text-primary-foreground" />
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="px-4 mt-4">
        {/* Edit phone when editing */}
        {editing && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            className="bg-card rounded-2xl p-4 shadow-card mb-4"
          >
            <label className="text-xs font-semibold text-muted-foreground mb-1 block">Phone Number</label>
            <input
              type="tel"
              value={editPhone}
              onChange={(e) => setEditPhone(e.target.value)}
              placeholder="+91..."
              className="w-full px-4 py-3 rounded-xl bg-secondary text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </motion.div>
        )}

        {/* Stats */}
        <div className="bg-card rounded-2xl p-4 shadow-card mb-4">
          <div className="grid grid-cols-3 gap-4 text-center">
            {[
              { num: profile ? Math.floor((Date.now() - new Date(profile.created_at).getTime()) / 86400000) : 0, label: "Days Active" },
              { num: "—", label: "Contacts" },
              { num: "—", label: "Reports" },
            ].map((s) => (
              <div key={s.label}>
                <p className="text-lg font-extrabold text-primary">{s.num}</p>
                <p className="text-[10px] text-muted-foreground">{s.label}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Menu */}
        <div className="space-y-1">
          {menuItems.map((item, i) => (
            <motion.button
              key={item.label}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.05 }}
              className="w-full bg-card rounded-2xl p-4 shadow-card flex items-center gap-3"
            >
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                <item.icon className="w-5 h-5 text-primary" />
              </div>
              <div className="flex-1 text-left">
                <p className="text-sm font-semibold text-card-foreground">{item.label}</p>
                <p className="text-xs text-muted-foreground">{item.desc}</p>
              </div>
              <ChevronRight className="w-4 h-4 text-muted-foreground" />
            </motion.button>
          ))}
        </div>

        {/* Logout */}
        <button
          onClick={handleLogout}
          className="w-full mt-4 bg-unsafe/10 rounded-2xl p-4 flex items-center justify-center gap-2"
        >
          <LogOut className="w-5 h-5 text-unsafe" />
          <span className="text-sm font-semibold text-unsafe">Log Out</span>
        </button>
      </div>

      <SOSButton />
      <BottomNav />
    </div>
  );
};

export default Profile;
