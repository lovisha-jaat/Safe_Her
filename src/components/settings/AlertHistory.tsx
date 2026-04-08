import { Clock, AlertTriangle, MapPin, CheckCircle } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useEffect, useState } from "react";

interface Report {
  id: string;
  incident_type: string;
  description: string;
  status: string;
  created_at: string;
  location_lat: number | null;
  location_lng: number | null;
}

const AlertHistory = () => {
  const { user } = useAuth();
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    const fetchReports = async () => {
      const { data } = await supabase
        .from("incident_reports")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(20);
      setReports(data || []);
      setLoading(false);
    };
    fetchReports();
  }, [user]);

  const statusColor = (status: string) => {
    switch (status) {
      case "resolved": return "text-safe";
      case "pending": return "text-moderate";
      default: return "text-muted-foreground";
    }
  };

  if (loading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-20 bg-secondary/50 rounded-xl animate-pulse" />
        ))}
      </div>
    );
  }

  if (reports.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
          <CheckCircle className="w-8 h-8 text-primary" />
        </div>
        <p className="text-sm font-semibold text-foreground">No alerts yet</p>
        <p className="text-xs text-muted-foreground mt-1">Your SOS and incident history will appear here</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {reports.map((report) => (
        <div key={report.id} className="bg-secondary/50 rounded-xl p-4">
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-lg bg-unsafe/10 flex items-center justify-center flex-shrink-0 mt-0.5">
              <AlertTriangle className="w-4 h-4 text-unsafe" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold text-foreground capitalize">{report.incident_type}</p>
                <span className={`text-xs font-medium capitalize ${statusColor(report.status)}`}>
                  {report.status}
                </span>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{report.description}</p>
              <div className="flex items-center gap-3 mt-2">
                <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
                  <Clock className="w-3 h-3" />
                  {new Date(report.created_at).toLocaleDateString()}
                </span>
                {report.location_lat && (
                  <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
                    <MapPin className="w-3 h-3" />
                    Location recorded
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

export default AlertHistory;
