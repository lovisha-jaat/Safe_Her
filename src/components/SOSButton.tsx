import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ShieldAlert, X, Phone, MessageSquare } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

const LEGACY_CONTACTS_KEY_PREFIX = "safeher.contacts.";

const SOSButton = () => {
  const { user } = useAuth();
  const [isActive, setIsActive] = useState(false);
  const [sending, setSending] = useState(false);
  const [alertSent, setAlertSent] = useState(false);

  const cancelSOS = () => {
    setIsActive(false);
    setAlertSent(false);
    setSending(false);
  };

  const getCoords = async () => {
    if (!("geolocation" in navigator)) return null;
    return new Promise<{ lat: number; lng: number } | null>((resolve) => {
      navigator.geolocation.getCurrentPosition(
        (p) => resolve({ lat: p.coords.latitude, lng: p.coords.longitude }),
        () => resolve(null),
        { enableHighAccuracy: true, timeout: 6000 }
      );
    });
  };

  const getFallbackContacts = async () => {
    if (!user) return [] as string[];

    const { data } = await supabase
      .from("emergency_contacts")
      .select("phone,is_primary")
      .eq("user_id", user.id);

    const dbPhones = (data ?? []).map((c) => c.phone).filter(Boolean);
    if (dbPhones.length > 0) return dbPhones;

    // Backward compatibility: read older local-storage contacts if DB table/data is missing.
    try {
      const raw = localStorage.getItem(`${LEGACY_CONTACTS_KEY_PREFIX}${user.id}`);
      if (!raw) return [];
      const parsed = JSON.parse(raw) as Array<{ phone?: string }>;
      return parsed.map((c) => c.phone ?? "").filter(Boolean);
    } catch {
      return [];
    }
  };

  const openSmsFallback = async (coords: { lat: number; lng: number } | null) => {
    const phones = await getFallbackContacts();
    if (phones.length === 0) {
      toast.error("No emergency contacts found. Add contacts first.");
      return false;
    }

    const locationText = coords
      ? `https://maps.google.com/?q=${coords.lat},${coords.lng}`
      : "Location unavailable";
    const message = encodeURIComponent(
      `SOS ALERT from Safe Her. I need immediate help. My location: ${locationText}`
    );

    window.location.href = `sms:${phones.join(",")}?body=${message}`;
    toast.success(`Prepared SOS SMS for ${phones.length} contact(s). Tap send.`);
    return true;
  };

  const sendSos = async () => {
    if (!user || sending) return;
    setSending(true);
    setIsActive(true);

    try {
      const coords = await getCoords();
      const { data, error } = await supabase.functions.invoke("sos-alert", {
        body: {
          locationLat: coords?.lat ?? null,
          locationLng: coords?.lng ?? null,
        },
      });

      if (error) {
        const fallbackOk = await openSmsFallback(coords);
        if (!fallbackOk) {
          toast.error(error.message || "Failed to trigger SOS");
          setIsActive(false);
          return;
        }
        setAlertSent(true);
        return;
      }

      if (data?.sentCount > 0) {
        toast.success(`SOS sent to ${data.sentCount} contact(s).`);
      } else {
        const fallbackOk = await openSmsFallback(coords);
        if (!fallbackOk) {
          toast.error(data?.error || "SOS could not be sent.");
          setIsActive(false);
          return;
        }
        setAlertSent(true);
        return;
      }

      setAlertSent(true);
    } catch (error) {
      const coords = await getCoords();
      const fallbackOk = await openSmsFallback(coords);
      if (!fallbackOk) {
        toast.error("Failed to trigger SOS alert.");
        setIsActive(false);
      } else {
        setAlertSent(true);
      }
    } finally {
      setSending(false);
    }
  };

  const callPolice = () => {
    window.location.href = "tel:112";
  };

  return (
    <>
      {/* Floating SOS Button */}
      <motion.button
        onClick={sendSos}
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
                  <ShieldAlert className="w-14 h-14 text-destructive-foreground" />
                </motion.div>
                <p className="text-xl font-bold text-destructive-foreground">Sending SOS Alert...</p>
                <p className="text-destructive-foreground/80 text-sm max-w-sm">
                  Sending emergency SMS now to your registered contacts with your latest location.
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
                  Your emergency contacts were alerted instantly.
                </p>

                <div className="flex flex-col gap-3 w-full max-w-xs mt-2">
                  <button
                    onClick={callPolice}
                    className="flex items-center justify-center gap-2 px-6 py-3 rounded-full bg-destructive-foreground text-sos font-bold"
                  >
                    <Phone className="w-5 h-5" />
                    Call 112 (Police)
                  </button>
                  <a
                    href="/contacts"
                    className="flex items-center justify-center gap-2 px-6 py-3 rounded-full bg-destructive-foreground/10 text-destructive-foreground font-semibold backdrop-blur-sm"
                  >
                    <MessageSquare className="w-5 h-5" />
                    Manage Emergency Contacts
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
