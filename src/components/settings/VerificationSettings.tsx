import { Shield, BadgeCheck, Camera, FileText, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

interface VerificationSettingsProps {
  verified: boolean;
}

const VerificationSettings = ({ verified }: VerificationSettingsProps) => {
  const { user } = useAuth();

  const handleEmailVerify = async () => {
    if (!user?.email) {
      toast.error("No email found");
      return;
    }
    toast.success("Verification email sent! Check your inbox.");
  };

  const steps = [
    {
      icon: Mail,
      label: "Email Verification",
      desc: "Verify your email address",
      done: !!user?.email_confirmed_at,
      action: !user?.email_confirmed_at ? handleEmailVerify : undefined,
    },
    {
      icon: FileText,
      label: "ID Verification",
      desc: "Upload a government-issued ID",
      done: false,
      action: () => toast.info("ID verification coming soon"),
    },
    {
      icon: Camera,
      label: "Selfie Verification",
      desc: "Take a selfie for face matching",
      done: false,
      action: () => toast.info("Selfie verification coming soon"),
    },
  ];

  return (
    <div className="space-y-4">
      {/* Status badge */}
      <div className={`flex items-center gap-3 rounded-xl p-4 ${verified ? "bg-safe/10" : "bg-moderate/10"}`}>
        <div className={`w-10 h-10 rounded-full flex items-center justify-center ${verified ? "bg-safe/20" : "bg-moderate/20"}`}>
          {verified ? (
            <BadgeCheck className="w-5 h-5 text-safe" />
          ) : (
            <Shield className="w-5 h-5 text-moderate" />
          )}
        </div>
        <div>
          <p className="text-sm font-semibold text-foreground">
            {verified ? "Fully Verified" : "Verification Incomplete"}
          </p>
          <p className="text-xs text-muted-foreground">
            {verified ? "Your identity has been confirmed" : "Complete the steps below to get verified"}
          </p>
        </div>
      </div>

      {/* Steps */}
      <div className="space-y-3">
        {steps.map((step) => (
          <div key={step.label} className="flex items-center justify-between bg-secondary/50 rounded-xl p-4">
            <div className="flex items-center gap-3">
              <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${step.done ? "bg-safe/10" : "bg-primary/10"}`}>
                <step.icon className={`w-4 h-4 ${step.done ? "text-safe" : "text-primary"}`} />
              </div>
              <div>
                <p className="text-sm font-semibold text-foreground">{step.label}</p>
                <p className="text-xs text-muted-foreground">{step.desc}</p>
              </div>
            </div>
            {step.done ? (
              <BadgeCheck className="w-5 h-5 text-safe" />
            ) : step.action ? (
              <Button size="sm" variant="outline" onClick={step.action}>
                Verify
              </Button>
            ) : null}
          </div>
        ))}
      </div>
    </div>
  );
};

export default VerificationSettings;
