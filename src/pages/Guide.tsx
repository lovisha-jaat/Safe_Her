import { motion } from "framer-motion";
import { ArrowLeft, Shield, MapPin, Users, FileWarning, Phone, Sparkles, AlertTriangle, CheckCircle2, Eye, Navigation } from "lucide-react";
import { useNavigate } from "react-router-dom";
import BottomNav from "@/components/BottomNav";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";

const steps = [
  {
    icon: CheckCircle2,
    title: "1. Set up your account",
    body: "Sign up with your email, complete identity verification in Profile → Settings, and add a phone number so contacts can reach you.",
  },
  {
    icon: Users,
    title: "2. Add emergency contacts",
    body: "Open Contacts and add at least one trusted person (family or close friend) with their phone number. The first contact you add becomes your primary SOS contact.",
  },
  {
    icon: MapPin,
    title: "3. Allow location access",
    body: "When prompted, allow location so the app can show your area's safety score, find nearby help, and share your live location during an SOS.",
  },
];

const features = [
  {
    icon: AlertTriangle,
    title: "🚨 SOS Button",
    body: "Tap the red SOS button on the Home screen. A 5-second countdown starts (tap Cancel to stop). After it ends, the app opens an SMS to your primary contact with a Google Maps link to your live location, then auto-calls them.",
    color: "text-unsafe",
  },
  {
    icon: MapPin,
    title: "🗺️ Safety Map",
    body: "Search any place — even small villages — to see it on the map. Toggle 'Safe Zones' to see green/yellow/red areas, and toggle 'Reports' to see community-verified incidents (orange markers).",
    color: "text-primary",
  },
  {
    icon: Navigation,
    title: "🧭 Safe Route",
    body: "From the Map, pick a destination and the app will suggest the safest walking route, prioritising well-lit and reported-safe areas over the shortest path.",
    color: "text-safe",
  },
  {
    icon: FileWarning,
    title: "📝 Report an Incident",
    body: "Use Report to submit something you witnessed or experienced (harassment, unsafe area, etc.). Admins review it; once verified, it shows on the community map to warn others. You can post anonymously.",
    color: "text-moderate",
  },
  {
    icon: Phone,
    title: "📞 Fake Call",
    body: "Tap Fake Call from Quick Actions to receive a realistic-looking incoming call after a few seconds. Use it to discreetly leave an uncomfortable conversation or situation.",
    color: "text-accent",
  },
  {
    icon: Sparkles,
    title: "✨ AI Safety Assistant",
    body: "Tap the floating purple Sparkles button (bottom-left of Home) to chat with SafeGuard AI. Ask for safety tips, what to do in an emergency, or how to use any feature. It will ask follow-up questions to give you personalised advice.",
    color: "text-primary",
  },
  {
    icon: Eye,
    title: "👁️ Safety Score",
    body: "On the Home screen, the Safety Score shows how safe your current area is (based on reports and time). Green = safe, yellow = caution, red = unsafe. Turn on location to see it.",
    color: "text-safe",
  },
  {
    icon: Shield,
    title: "🛡️ Identity Verification",
    body: "Verified users get a badge and can post non-anonymous reports. Go to Profile → Verification to upload your ID. This keeps the community safe from fake accounts.",
    color: "text-primary",
  },
];

const faqs = [
  {
    q: "What happens when I press SOS?",
    a: "A 5-second countdown begins (you can cancel). After it finishes, the app opens your SMS app pre-filled with an emergency message and your Google Maps location link addressed to your primary emergency contact. Once you send the SMS, the app then triggers a phone call to that contact.",
  },
  {
    q: "Will SOS work without internet?",
    a: "SMS and phone calls work over your cellular network — no internet needed. However, sharing a live Google Maps link requires location services to be on. The app falls back to an SMS-only message if location is unavailable.",
  },
  {
    q: "Who can see my reports?",
    a: "Only admins see reports while pending. Once verified, reports appear on the public map for all logged-in users. Anonymous reports never reveal your identity.",
  },
  {
    q: "Why can't I see my village on the map?",
    a: "Try searching with the village name plus the district or state (e.g. 'Rampur, Uttar Pradesh'). The app uses OpenStreetMap and biases results toward India, but very small hamlets may not be indexed.",
  },
  {
    q: "Is my location shared with anyone by default?",
    a: "No. Location is only used locally to compute your safety score and is shared with your emergency contacts only when you trigger SOS or explicitly share it.",
  },
  {
    q: "How do I cancel an SOS?",
    a: "Tap 'Cancel' on the countdown screen within 5 seconds. Once the countdown finishes, the SMS/call dialogs will open and you can choose not to send/call.",
  },
];

const Guide = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Header */}
      <div className="gradient-hero px-6 pt-12 pb-8 rounded-b-[2rem]">
        <div className="flex items-center gap-3 mb-4">
          <button
            onClick={() => navigate(-1)}
            className="w-9 h-9 rounded-full bg-primary-foreground/20 flex items-center justify-center"
            aria-label="Go back"
          >
            <ArrowLeft className="w-5 h-5 text-primary-foreground" />
          </button>
          <div>
            <h1 className="text-xl font-bold text-primary-foreground">How to use SafeHer</h1>
            <p className="text-xs text-primary-foreground/70">A quick guide to staying safe</p>
          </div>
        </div>
      </div>

      <div className="px-4 mt-6 space-y-6">
        {/* Getting started */}
        <section>
          <h2 className="text-base font-bold text-foreground mb-3">Getting started</h2>
          <div className="space-y-2">
            {steps.map((s, i) => (
              <motion.div
                key={s.title}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className="bg-card rounded-2xl p-4 shadow-card flex gap-3"
              >
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                  <s.icon className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-card-foreground">{s.title}</p>
                  <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{s.body}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </section>

        {/* Features */}
        <section>
          <h2 className="text-base font-bold text-foreground mb-3">Features explained</h2>
          <div className="space-y-2">
            {features.map((f, i) => (
              <motion.div
                key={f.title}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.04 }}
                className="bg-card rounded-2xl p-4 shadow-card"
              >
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center shrink-0">
                    <f.icon className={`w-5 h-5 ${f.color}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-card-foreground">{f.title}</p>
                    <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{f.body}</p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </section>

        {/* FAQ */}
        <section>
          <h2 className="text-base font-bold text-foreground mb-3">Frequently asked</h2>
          <div className="bg-card rounded-2xl px-4 shadow-card">
            <Accordion type="single" collapsible>
              {faqs.map((f, i) => (
                <AccordionItem key={i} value={`q-${i}`} className="border-border last:border-0">
                  <AccordionTrigger className="text-sm text-left font-medium text-card-foreground py-3 hover:no-underline">
                    {f.q}
                  </AccordionTrigger>
                  <AccordionContent className="text-xs text-muted-foreground leading-relaxed">
                    {f.a}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </div>
        </section>

        {/* CTA to AI assistant */}
        <section>
          <button
            onClick={() => navigate("/ai-assistant")}
            className="w-full gradient-primary rounded-2xl p-4 shadow-card flex items-center gap-3 text-left"
          >
            <div className="w-10 h-10 rounded-full bg-primary-foreground/20 flex items-center justify-center shrink-0">
              <Sparkles className="w-5 h-5 text-primary-foreground" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-semibold text-primary-foreground">Still have questions?</p>
              <p className="text-xs text-primary-foreground/80">Ask SafeGuard AI — it'll guide you step by step.</p>
            </div>
          </button>
        </section>
      </div>

      <BottomNav />
    </div>
  );
};

export default Guide;
