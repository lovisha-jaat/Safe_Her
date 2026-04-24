import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Shield, MapPin, Users, Bell, AlertTriangle, Navigation, TrendingDown, Eye, Sparkles, Phone, BookOpen } from "lucide-react";
import SafetyScoreCard from "@/components/SafetyScoreCard";
import QuickAction from "@/components/QuickAction";
import SOSButton from "@/components/SOSButton";
import BottomNav from "@/components/BottomNav";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

const recentAlerts = [
  { id: 1, type: "warning", text: "Low safety rating nearby: MG Road after 10 PM", time: "2h ago" },
  { id: 2, type: "info", text: "Your trusted contact viewed your location", time: "5h ago" },
  { id: 3, type: "safe", text: "All contacts notified of safe arrival", time: "1d ago" },
];

const Dashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [firstName, setFirstName] = useState("");

  useEffect(() => {
    if (!user) return;
    const fetchName = async () => {
      const { data } = await supabase
        .from("profiles")
        .select("full_name")
        .eq("user_id", user.id)
        .maybeSingle();
      if (data?.full_name) {
        setFirstName(data.full_name.split(" ")[0]);
      } else {
        setFirstName(user.email?.split("@")[0] || "there");
      }
    };
    fetchName();
  }, [user]);

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Header */}
      <div className="gradient-hero px-6 pt-12 pb-8 rounded-b-[2rem]">
        <div className="flex items-center justify-between mb-6">
          <div>
            <p className="text-primary-foreground/70 text-sm">Welcome back,</p>
            <h1 className="text-2xl font-bold text-primary-foreground">{firstName || "..."} ✨</h1>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => navigate("/guide")}
              className="w-10 h-10 rounded-full bg-primary-foreground/20 flex items-center justify-center"
              aria-label="How to use this app"
            >
              <BookOpen className="w-5 h-5 text-primary-foreground" />
            </button>
            <div className="w-10 h-10 rounded-full bg-primary-foreground/20 flex items-center justify-center">
              <Bell className="w-5 h-5 text-primary-foreground" />
            </div>
          </div>
        </div>

        {/* Safety Score */}
        <SafetyScoreCard label="Current Area Safety" />
      </div>

      <div className="px-4 -mt-2">
        {/* Quick Actions */}
        <section className="mt-6">
          <h2 className="text-base font-bold text-foreground mb-3">Quick Actions</h2>
          <div className="grid grid-cols-5 gap-2">
            <QuickAction icon={MapPin} label="Track" to="/map" gradient />
            <QuickAction icon={Users} label="Contacts" to="/contacts" />
            <QuickAction icon={Navigation} label="Safe Route" to="/map" />
            <QuickAction icon={Eye} label="Report" to="/report" />
            <QuickAction icon={Phone} label="Fake Call" to="/fake-call" />
          </div>
        </section>

        {/* Nearby Safety */}
        <section className="mt-6">
          <h2 className="text-base font-bold text-foreground mb-3">Nearby Safety</h2>
          <div className="grid grid-cols-3 gap-2">
            {[
              { icon: Shield, label: "Police", dist: "0.5 km", color: "text-safe" },
              { icon: AlertTriangle, label: "Hospital", dist: "1.2 km", color: "text-accent" },
              { icon: MapPin, label: "Safe Place", dist: "0.3 km", color: "text-primary" },
            ].map((place) => (
              <motion.div
                key={place.label}
                whileTap={{ scale: 0.95 }}
                className="bg-card rounded-2xl p-3 shadow-card text-center"
              >
                <place.icon className={`w-6 h-6 mx-auto mb-1 ${place.color}`} />
                <p className="text-xs font-semibold text-card-foreground">{place.label}</p>
                <p className="text-[10px] text-muted-foreground">{place.dist}</p>
              </motion.div>
            ))}
          </div>
        </section>

        {/* Weekly Insights */}
        <section className="mt-6">
          <h2 className="text-base font-bold text-foreground mb-3">Weekly Insights</h2>
          <div className="bg-card rounded-2xl p-4 shadow-card">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-xl bg-safe/10 flex items-center justify-center">
                <TrendingDown className="w-5 h-5 text-safe" />
              </div>
              <div>
                <p className="text-sm font-semibold text-card-foreground">Safety Score Up 12%</p>
                <p className="text-xs text-muted-foreground">Compared to last week</p>
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">Unsafe areas visited</span>
                <span className="font-semibold text-unsafe">2 areas</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">Safe routes used</span>
                <span className="font-semibold text-safe">8 routes</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">Location shares</span>
                <span className="font-semibold text-primary">14 times</span>
              </div>
            </div>
          </div>
        </section>

        {/* Recent Alerts */}
        <section className="mt-6">
          <h2 className="text-base font-bold text-foreground mb-3">Recent Alerts</h2>
          <div className="space-y-2">
            {recentAlerts.map((alert) => (
              <motion.div
                key={alert.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                className="bg-card rounded-2xl p-3 shadow-card flex items-start gap-3"
              >
                <div
                  className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                    alert.type === "warning"
                      ? "bg-moderate/10"
                      : alert.type === "safe"
                        ? "bg-safe/10"
                        : "bg-accent/10"
                  }`}
                >
                  <AlertTriangle
                    className={`w-4 h-4 ${
                      alert.type === "warning"
                        ? "text-moderate"
                        : alert.type === "safe"
                          ? "text-safe"
                          : "text-accent"
                    }`}
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-card-foreground font-medium leading-snug">{alert.text}</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">{alert.time}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </section>
      </div>

      {/* Floating AI Help Button - opposite side of SOS */}
      <motion.button
        onClick={() => navigate("/ai-assistant")}
        className="fixed bottom-24 left-4 z-50 w-16 h-16 rounded-full bg-primary flex items-center justify-center shadow-lg"
        whileTap={{ scale: 0.9 }}
        animate={{ scale: [1, 1.03, 1] }}
        transition={{ repeat: Infinity, duration: 3 }}
      >
        <Sparkles className="w-7 h-7 text-primary-foreground relative z-10" />
      </motion.button>

      <SOSButton />
      <BottomNav />
    </div>
  );
};

export default Dashboard;
