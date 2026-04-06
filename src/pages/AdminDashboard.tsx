import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Shield, Users, FileWarning, Eye, Clock, MapPin, BadgeCheck, AlertTriangle, ChevronDown, ChevronUp } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

interface Profile {
  id: string;
  user_id: string;
  full_name: string | null;
  avatar_url: string | null;
  phone: string | null;
  verified: boolean;
  created_at: string;
}

interface Report {
  id: string;
  user_id: string;
  incident_type: string;
  description: string;
  location_lat: number | null;
  location_lng: number | null;
  is_anonymous: boolean;
  status: string;
  created_at: string;
}

const statusColors: Record<string, string> = {
  pending: "bg-moderate/15 text-moderate",
  verified: "bg-safe/15 text-safe",
  rejected: "bg-unsafe/15 text-unsafe",
  resolved: "bg-primary/15 text-primary",
};

const AdminDashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [tab, setTab] = useState<"users" | "reports">("users");
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedReport, setExpandedReport] = useState<string | null>(null);

  // Check admin role
  useEffect(() => {
    if (!user) return;
    const checkRole = async () => {
      const { data } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .eq("role", "admin")
        .maybeSingle();

      if (data) {
        setIsAdmin(true);
      } else {
        setIsAdmin(false);
      }
    };
    checkRole();
  }, [user]);

  // Fetch data when admin confirmed
  useEffect(() => {
    if (!isAdmin) return;
    const fetchData = async () => {
      setLoading(true);
      const [profilesRes, reportsRes] = await Promise.all([
        supabase.from("profiles").select("*").order("created_at", { ascending: false }),
        supabase.from("incident_reports").select("*").order("created_at", { ascending: false }),
      ]);
      if (profilesRes.data) setProfiles(profilesRes.data);
      if (reportsRes.data) setReports(reportsRes.data);
      setLoading(false);
    };
    fetchData();
  }, [isAdmin]);

  const handleUpdateStatus = async (reportId: string, newStatus: string) => {
    const { error } = await supabase
      .from("incident_reports")
      .update({ status: newStatus })
      .eq("id", reportId);

    if (error) {
      toast.error("Failed to update status");
    } else {
      setReports((prev) =>
        prev.map((r) => (r.id === reportId ? { ...r, status: newStatus } : r))
      );
      toast.success(`Report marked as ${newStatus}`);
    }
  };

  const getProfileName = (userId: string) => {
    const p = profiles.find((p) => p.user_id === userId);
    return p?.full_name || "Unknown User";
  };

  // Access denied
  if (isAdmin === false) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="text-center">
          <div className="w-20 h-20 rounded-full bg-unsafe/10 flex items-center justify-center mx-auto mb-4">
            <Shield className="w-10 h-10 text-unsafe" />
          </div>
          <h2 className="text-2xl font-bold text-foreground mb-2">Access Denied</h2>
          <p className="text-muted-foreground text-sm mb-6">You don't have admin privileges.</p>
          <button onClick={() => navigate("/dashboard")} className="px-8 py-3 rounded-2xl gradient-primary text-primary-foreground font-semibold shadow-soft">
            Go to Dashboard
          </button>
        </motion.div>
      </div>
    );
  }

  // Loading admin check
  if (isAdmin === null) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-3 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-8">
      {/* Header */}
      <div className="gradient-hero px-6 pt-12 pb-6 rounded-b-[2rem]">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-xl bg-primary-foreground/20 flex items-center justify-center">
            <Shield className="w-5 h-5 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-primary-foreground">Admin Panel</h1>
            <p className="text-xs text-primary-foreground/60">Manage users & reports</p>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-2 mt-4">
          {[
            { num: profiles.length, label: "Users", icon: Users },
            { num: reports.length, label: "Reports", icon: FileWarning },
            { num: reports.filter((r) => r.status === "pending").length, label: "Pending", icon: Clock },
          ].map((s) => (
            <div key={s.label} className="bg-primary-foreground/10 rounded-xl p-3 text-center">
              <s.icon className="w-4 h-4 text-primary-foreground/70 mx-auto mb-1" />
              <p className="text-lg font-extrabold text-primary-foreground">{s.num}</p>
              <p className="text-[10px] text-primary-foreground/60">{s.label}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="px-4 mt-4">
        {/* Tab Toggle */}
        <div className="flex gap-2 mb-4">
          <button
            onClick={() => setTab("users")}
            className={`flex-1 py-2.5 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 transition-colors ${
              tab === "users" ? "gradient-primary text-primary-foreground" : "bg-card text-card-foreground shadow-card"
            }`}
          >
            <Users className="w-4 h-4" /> Users
          </button>
          <button
            onClick={() => setTab("reports")}
            className={`flex-1 py-2.5 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 transition-colors ${
              tab === "reports" ? "gradient-primary text-primary-foreground" : "bg-card text-card-foreground shadow-card"
            }`}
          >
            <FileWarning className="w-4 h-4" /> Reports
          </button>
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin w-8 h-8 border-3 border-primary border-t-transparent rounded-full" />
          </div>
        ) : tab === "users" ? (
          /* Users List */
          <div className="space-y-2">
            <p className="text-xs text-muted-foreground mb-2">{profiles.length} registered users</p>
            {profiles.map((p, i) => (
              <motion.div
                key={p.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.03 }}
                className="bg-card rounded-2xl p-4 shadow-card flex items-center gap-3"
              >
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center overflow-hidden flex-shrink-0">
                  {p.avatar_url ? (
                    <img src={p.avatar_url} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <Users className="w-5 h-5 text-primary" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <p className="text-sm font-semibold text-card-foreground truncate">{p.full_name || "Unnamed"}</p>
                    {p.verified && <BadgeCheck className="w-4 h-4 text-safe flex-shrink-0" />}
                  </div>
                  <p className="text-xs text-muted-foreground truncate">{p.phone || "No phone"}</p>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-[10px] text-muted-foreground">
                    {new Date(p.created_at).toLocaleDateString()}
                  </p>
                </div>
              </motion.div>
            ))}
            {profiles.length === 0 && (
              <p className="text-center text-sm text-muted-foreground py-8">No users found</p>
            )}
          </div>
        ) : (
          /* Reports List */
          <div className="space-y-2">
            <p className="text-xs text-muted-foreground mb-2">{reports.length} total reports</p>
            {reports.map((r, i) => (
              <motion.div
                key={r.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.03 }}
                className="bg-card rounded-2xl shadow-card overflow-hidden"
              >
                <button
                  onClick={() => setExpandedReport(expandedReport === r.id ? null : r.id)}
                  className="w-full p-4 flex items-center gap-3 text-left"
                >
                  <div className="w-10 h-10 rounded-xl bg-unsafe/10 flex items-center justify-center flex-shrink-0">
                    <AlertTriangle className="w-5 h-5 text-unsafe" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-card-foreground">{r.incident_type}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${statusColors[r.status] || "bg-muted text-muted-foreground"}`}>
                        {r.status}
                      </span>
                      <span className="text-[10px] text-muted-foreground">
                        {new Date(r.created_at).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                  {expandedReport === r.id ? (
                    <ChevronUp className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                  )}
                </button>

                {expandedReport === r.id && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    className="px-4 pb-4 border-t border-border"
                  >
                    <div className="pt-3 space-y-2">
                      <div>
                        <p className="text-[10px] font-semibold text-muted-foreground uppercase">Reported by</p>
                        <p className="text-sm text-card-foreground">
                          {r.is_anonymous ? "Anonymous" : getProfileName(r.user_id)}
                        </p>
                      </div>
                      <div>
                        <p className="text-[10px] font-semibold text-muted-foreground uppercase">Description</p>
                        <p className="text-sm text-card-foreground">{r.description}</p>
                      </div>
                      {r.location_lat && r.location_lng && (
                        <div className="flex items-center gap-1.5">
                          <MapPin className="w-3.5 h-3.5 text-primary" />
                          <p className="text-xs text-muted-foreground">
                            {r.location_lat.toFixed(4)}, {r.location_lng.toFixed(4)}
                          </p>
                        </div>
                      )}
                      <div>
                        <p className="text-[10px] font-semibold text-muted-foreground uppercase mb-1.5">Update Status</p>
                        <div className="flex gap-1.5 flex-wrap">
                          {["pending", "verified", "rejected", "resolved"].map((s) => (
                            <button
                              key={s}
                              onClick={() => handleUpdateStatus(r.id, s)}
                              className={`px-3 py-1.5 rounded-lg text-xs font-semibold capitalize transition-colors ${
                                r.status === s
                                  ? statusColors[s]
                                  : "bg-secondary text-secondary-foreground"
                              }`}
                            >
                              {s}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}
              </motion.div>
            ))}
            {reports.length === 0 && (
              <p className="text-center text-sm text-muted-foreground py-8">No reports found</p>
            )}
          </div>
        )}

        {/* Back button */}
        <button
          onClick={() => navigate("/dashboard")}
          className="w-full mt-6 py-3 rounded-2xl bg-card shadow-card text-sm font-semibold text-card-foreground"
        >
          ← Back to Dashboard
        </button>
      </div>
    </div>
  );
};

export default AdminDashboard;
