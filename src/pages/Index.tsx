import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { Shield, MapPin, Bell, Phone, Users, FileWarning, Navigation, ChevronRight } from "lucide-react";
import logoImage from "/logo.png";

const features = [
  { icon: Shield, title: "Emergency SOS", desc: "One-tap alert to contacts & authorities" },
  { icon: MapPin, title: "Live Tracking", desc: "Real-time GPS location sharing" },
  { icon: Bell, title: "Smart Warnings", desc: "AI-powered area safety alerts" },
  { icon: Phone, title: "Fake Call", desc: "Escape risky situations discreetly" },
  { icon: Users, title: "Safe Community", desc: "Rate & review area safety" },
  { icon: Navigation, title: "Safe Routes", desc: "Navigate through safest paths" },
];

const container = {
  hidden: {},
  show: { transition: { staggerChildren: 0.08 } },
};

const item = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0 },
};

const Index = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background">
      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 gradient-hero opacity-90" />
        <div className="relative z-10 px-6 pt-16 pb-12 text-center">
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6 }}
            className="mx-auto mb-6"
          >
            <img
              src={logoImage}
              alt="Safe Her Logo"
              width={512}
              height={512}
              className="w-40 h-40 mx-auto object-contain"
            />
          </motion.div>
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="text-4xl font-extrabold text-primary-foreground mb-3 leading-tight"
          >
            Safe Her
            <br />
            Your Safety, Our Priority
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="text-primary-foreground/80 text-base mb-8 max-w-sm mx-auto"
          >
            A trusted companion that keeps you safe with instant alerts,
            smart navigation, and real-time tracking.
          </motion.p>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="flex gap-3 justify-center"
          >
            <button
              onClick={() => navigate("/dashboard")}
              className="px-8 py-3.5 rounded-2xl bg-primary-foreground text-primary font-bold text-base shadow-lg"
            >
              Get Started
            </button>
            <button
              onClick={() => {
                document.getElementById("features")?.scrollIntoView({ behavior: "smooth" });
              }}
              className="px-8 py-3.5 rounded-2xl bg-primary-foreground/20 text-primary-foreground font-semibold text-base backdrop-blur-sm border border-primary-foreground/30"
            >
              Learn More
            </button>
          </motion.div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="px-6 py-12">
        <h2 className="text-2xl font-bold text-foreground mb-2">Safety Features</h2>
        <p className="text-muted-foreground text-sm mb-6">Everything you need to stay protected</p>

        <motion.div
          variants={container}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true }}
          className="grid grid-cols-2 gap-3"
        >
          {features.map((f) => (
            <motion.div
              key={f.title}
              variants={item}
              className="bg-card rounded-2xl p-4 shadow-card flex flex-col gap-3"
            >
              <div className="w-10 h-10 rounded-xl gradient-primary flex items-center justify-center">
                <f.icon className="w-5 h-5 text-primary-foreground" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-card-foreground">{f.title}</h3>
                <p className="text-xs text-muted-foreground mt-0.5">{f.desc}</p>
              </div>
            </motion.div>
          ))}
        </motion.div>
      </section>

      {/* Stats */}
      <section className="px-6 py-10">
        <div className="gradient-primary rounded-3xl p-6 text-center shadow-soft">
          <div className="grid grid-cols-3 gap-4">
            {[
              { num: "50K+", label: "Users Protected" },
              { num: "1M+", label: "Alerts Sent" },
              { num: "99%", label: "Response Rate" },
            ].map((s) => (
              <div key={s.label}>
                <p className="text-2xl font-extrabold text-primary-foreground">{s.num}</p>
                <p className="text-xs text-primary-foreground/70">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="px-6 pb-12">
        <div className="bg-card rounded-3xl p-6 shadow-card text-center">
          <FileWarning className="w-10 h-10 text-primary mx-auto mb-3" />
          <h3 className="text-xl font-bold text-card-foreground mb-2">Report an Incident</h3>
          <p className="text-sm text-muted-foreground mb-4">
            Help make your community safer by reporting incidents anonymously
          </p>
          <button
            onClick={() => navigate("/report")}
            className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl gradient-primary text-primary-foreground font-semibold shadow-soft"
          >
            Report Now <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </section>
    </div>
  );
};

export default Index;
