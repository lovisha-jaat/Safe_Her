import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ShieldAlert, X, Phone, MessageSquare } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

interface Contact {
  id: number;
  name: string;
  phone: string;
  relation: string;
  isPrimary: boolean;
}

const STORAGE_KEY_PREFIX = "safeher.contacts.";

const SOSButton = () => {
  const { user } = useAuth();
  const [isActive, setIsActive] = useState(false);
  const [countdown, setCountdown] = useState(5);
  const [alertSent, setAlertSent] = useState(false);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);

  const loadContacts = useCallback(() => {
    if (!user) return [] as Contact[];
    try {
      const raw = localStorage.getItem(`${STORAGE_KEY_PREFIX}${user.id}`);
      const list: Contact[] = raw ? JSON.parse(raw) : [];
      setContacts(list);
      return list;
    } catch {
      setContacts([]);
      return [];
    }
  }, [user]);

  const cancelSOS = useCallback(() => {
    setIsActive(false);
    setCountdown(5);
    setAlertSent(false);
  }, []);

  // When activated: fetch contacts + location
  useEffect(() => {
    if (!isActive) return;
    loadContacts();
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (p) => setCoords({ lat: p.coords.latitude, lng: p.coords.longitude }),
        () => setCoords(null),
        { enableHighAccuracy: true, timeout: 5000 }
      );
    }
  }, [isActive, loadContacts]);

  // Countdown + auto-trigger SMS to all contacts
  useEffect(() => {
    if (!isActive || alertSent) return;
    if (countdown <= 0) {
      setAlertSent(true);
      // Auto-send SMS to primary (or first) contact
      const list = contacts;
      const primary = list.find((c) => c.isPrimary) ?? list[0];
      if (primary) {
        const locText = coords
          ? `https://maps.google.com/?q=${coords.lat},${coords.lng}`
          : "Location unavailable";
        const body = encodeURIComponent(
          `🚨 EMERGENCY SOS from SafeHer. I need help. My location: ${locText}`
        );
        // Try to open SMS app
        window.location.href = `sms:${primary.phone}?body=${body}`;
        toast.success(`SMS opened for ${primary.name}`);
      } else {
        toast.warning("No emergency contacts. Add one in Contacts.");
      }
      return;
    }
    const timer = setTimeout(() => setCountdown((c) => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [isActive, countdown, alertSent, contacts, coords]);

  const callPrimary = () => {
    const primary = contacts.find((c) => c.isPrimary) ?? contacts[0];
    if (!primary) {
      toast.warning("No emergency contacts saved.");
      return;
    }
    window.location.href = `tel:${primary.phone}`;
  };

  const smsAll = () => {
    if (contacts.length === 0) {
      toast.warning("No emergency contacts saved.");
      return;
    }
    const locText = coords
      ? `https://maps.google.com/?q=${coords.lat},${coords.lng}`
      : "Location unavailable";
    const body = encodeURIComponent(
      `🚨 EMERGENCY SOS from SafeHer. I need help. My location: ${locText}`
    );
    const phones = contacts.map((c) => c.phone).join(",");
    window.location.href = `sms:${phones}?body=${body}`;
  };

  return (
    <>
      {/* Floating SOS Button */}
      <motion.button
        onClick={() => setIsActive(true)}
        className="fixed bottom-24 right-4 z-50 w-16 h-16 rounded-full bg-sos flex items-center justify-center shadow-sos"
        whileTap={{ scale: 0.9 }}
        animate={{ scale: [1, 1.05, 1] }}
        transition={{ repeat: Infinity, duration: 2 }}
        aria-label="Activate SOS emergency alert"
      >
        <div className="absolute inset-0 rounded-full bg-sos animate-ripple" />
        <ShieldAlert className="w-7 h-7 text-destructive-foreground relative z-10" />
      </motion.button>

      {/* SOS Overlay */}
      <AnimatePresence>
        {isActive && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-sos/95 flex flex-col items-center justify-center p-6"
          >
            {!alertSent ? (
              <div className="flex flex-col items-center gap-6 text-center">
                <motion.div
                  className="w-32 h-32 rounded-full border-4 border-destructive-foreground/30 flex items-center justify-center"
                  animate={{ scale: [1, 1.1, 1] }}
                  transition={{ repeat: Infinity, duration: 1 }}
                >
                  <span className="text-6xl font-extrabold text-destructive-foreground">{countdown}</span>
                </motion.div>
                <p className="text-xl font-bold text-destructive-foreground">Sending SOS Alert...</p>
                <p className="text-destructive-foreground/80 text-sm max-w-sm">
                  In {countdown}s we'll open your messaging app to text your primary contact with your live location.
                </p>
                <button
                  onClick={cancelSOS}
                  className="mt-4 flex items-center gap-2 px-8 py-3 rounded-full bg-destructive-foreground/20 text-destructive-foreground font-semibold text-lg backdrop-blur-sm"
                >
                  <X className="w-5 h-5" />
                  Cancel
                </button>
              </div>
            ) : (
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="flex flex-col items-center gap-5 text-center"
              >
                <div className="w-24 h-24 rounded-full bg-destructive-foreground/20 flex items-center justify-center">
                  <ShieldAlert className="w-12 h-12 text-destructive-foreground" />
                </div>
                <p className="text-2xl font-bold text-destructive-foreground">🚨 SOS Triggered</p>
                <p className="text-destructive-foreground/80 max-w-sm text-sm">
                  Use the buttons below to call or text your contacts now.
                </p>

                <div className="flex flex-col gap-3 w-full max-w-xs mt-2">
                  <button
                    onClick={callPrimary}
                    className="flex items-center justify-center gap-2 px-6 py-3 rounded-full bg-destructive-foreground text-sos font-bold"
                  >
                    <Phone className="w-5 h-5" />
                    Call Primary Contact
                  </button>
                  <button
                    onClick={smsAll}
                    className="flex items-center justify-center gap-2 px-6 py-3 rounded-full bg-destructive-foreground/20 text-destructive-foreground font-semibold backdrop-blur-sm"
                  >
                    <MessageSquare className="w-5 h-5" />
                    SMS All Contacts
                  </button>
                  <a
                    href="tel:112"
                    className="flex items-center justify-center gap-2 px-6 py-3 rounded-full bg-destructive-foreground/10 text-destructive-foreground font-semibold backdrop-blur-sm"
                  >
                    <Phone className="w-5 h-5" />
                    Call 112 (Police)
                  </a>
                </div>

                <button
                  onClick={cancelSOS}
                  className="mt-3 px-8 py-2.5 rounded-full bg-destructive-foreground/10 text-destructive-foreground/90 font-medium text-sm"
                >
                  I'm Safe Now
                </button>
              </motion.div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default SOSButton;
