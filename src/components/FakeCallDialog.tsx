import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Phone, PhoneOff, User } from "lucide-react";

const ANDROID_RINGTONE_SRC = "/ringtones/vivo_classic.mp3";

const FakeCallDialog = () => {
  const [callerName, setCallerName] = useState("Mom");
  const [delay, setDelay] = useState(5);
  const [isRinging, setIsRinging] = useState(false);
  const [isAnswered, setIsAnswered] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [audioError, setAudioError] = useState("");

  const audioContextRef = useRef<AudioContext | null>(null);
  const ringtoneAudioRef = useRef<HTMLAudioElement | null>(null);
  const ringtoneIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const ringtoneTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const startFakeCall = () => {
    setAudioError("");
    setCountdown(delay);
  };

  useEffect(() => {
    if (countdown <= 0) return;
    const timer = setTimeout(() => {
      if (countdown === 1) {
        setIsRinging(true);
        setCountdown(0);
      } else {
        setCountdown((c) => c - 1);
      }
    }, 1000);
    return () => clearTimeout(timer);
  }, [countdown]);

  const endCall = () => {
    stopRingtone();
    setIsRinging(false);
    setIsAnswered(false);
  };

  const stopRingtone = () => {
    if (ringtoneAudioRef.current) {
      ringtoneAudioRef.current.pause();
      ringtoneAudioRef.current.currentTime = 0;
    }
    if (ringtoneIntervalRef.current) {
      clearInterval(ringtoneIntervalRef.current);
      ringtoneIntervalRef.current = null;
    }
    if (ringtoneTimeoutRef.current) {
      clearTimeout(ringtoneTimeoutRef.current);
      ringtoneTimeoutRef.current = null;
    }
  };

  const playRingtoneBurst = () => {
    if (!audioContextRef.current) return;

    const context = audioContextRef.current;
    const now = context.currentTime;
    const burstDuration = 0.85;

    // Classic telephone ring uses dual tones around 440Hz and 480Hz.
    const toneA = context.createOscillator();
    const toneB = context.createOscillator();
    const gainNode = context.createGain();
    const filterNode = context.createBiquadFilter();

    toneA.type = "sine";
    toneB.type = "sine";
    toneA.frequency.setValueAtTime(440, now);
    toneB.frequency.setValueAtTime(480, now);

    filterNode.type = "bandpass";
    filterNode.frequency.setValueAtTime(460, now);
    filterNode.Q.value = 1.2;

    // Ring burst envelope: quick attack, gentle decay.
    gainNode.gain.setValueAtTime(0.0001, now);
    gainNode.gain.linearRampToValueAtTime(0.12, now + 0.03);
    gainNode.gain.exponentialRampToValueAtTime(0.0001, now + burstDuration);

    toneA.connect(filterNode);
    toneB.connect(filterNode);
    filterNode.connect(gainNode);
    gainNode.connect(context.destination);

    toneA.start(now);
    toneB.start(now);
    toneA.stop(now + burstDuration);
    toneB.stop(now + burstDuration);
  };

  const startRingtone = async () => {
    if (!ringtoneAudioRef.current) {
      ringtoneAudioRef.current = new Audio(ANDROID_RINGTONE_SRC);
      ringtoneAudioRef.current.loop = true;
      ringtoneAudioRef.current.preload = "auto";
    }

    try {
      await ringtoneAudioRef.current.play();
      return;
    } catch {
      // Fallback to generated ringtone when no mp3 exists
      // or autoplay is blocked.
    }

    if (!audioContextRef.current) {
      try {
        audioContextRef.current = new window.AudioContext();
      } catch {
        setAudioError("Add an mp3 at /public/ringtones/android.mp3 for real ringtone.");
        return;
      }
    }

    if (audioContextRef.current.state === "suspended") {
      await audioContextRef.current.resume();
    }

    stopRingtone();
    playRingtoneBurst();
    ringtoneTimeoutRef.current = setTimeout(playRingtoneBurst, 1050);
    ringtoneIntervalRef.current = setInterval(() => {
      playRingtoneBurst();
      ringtoneTimeoutRef.current = setTimeout(playRingtoneBurst, 1050);
    }, 4200);
  };

  useEffect(() => {
    return () => {
      stopRingtone();
      ringtoneAudioRef.current = null;
      if (audioContextRef.current) {
        void audioContextRef.current.close();
        audioContextRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (isRinging && !isAnswered) {
      void startRingtone();
    } else {
      stopRingtone();
    }
  }, [isRinging, isAnswered]);

  return (
    <div className="min-h-screen bg-background pb-20">
      <div className="p-4 pt-12">
        <h1 className="text-2xl font-bold text-foreground mb-1">Fake Call</h1>
        <p className="text-muted-foreground text-sm mb-6">
          Trigger a fake incoming call to escape uncomfortable situations
        </p>

        <div className="space-y-4">
          <div className="bg-card rounded-2xl p-4 shadow-card">
            <label className="text-sm font-semibold text-card-foreground mb-2 block">Caller Name</label>
            <input
              type="text"
              value={callerName}
              onChange={(e) => setCallerName(e.target.value)}
              className="w-full px-4 py-3 rounded-xl bg-secondary text-secondary-foreground border-0 focus:outline-none focus:ring-2 focus:ring-primary"
              placeholder="Enter caller name"
            />
          </div>

          <div className="bg-card rounded-2xl p-4 shadow-card">
            <label className="text-sm font-semibold text-card-foreground mb-2 block">
              Delay: {delay} seconds
            </label>
            <input
              type="range"
              min={3}
              max={30}
              value={delay}
              onChange={(e) => setDelay(Number(e.target.value))}
              className="w-full accent-primary"
            />
          </div>

          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={startFakeCall}
            disabled={countdown > 0}
            className="w-full py-4 rounded-2xl gradient-primary text-primary-foreground font-bold text-lg shadow-soft disabled:opacity-50"
          >
            {countdown > 0 ? `Call in ${countdown}s...` : "Start Fake Call"}
          </motion.button>
          {audioError && <p className="text-xs text-muted-foreground text-center">{audioError}</p>}
        </div>
      </div>

      {/* Ringing overlay */}
      <AnimatePresence>
        {isRinging && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex flex-col items-center justify-between py-16 px-6"
            style={{ background: "var(--gradient-hero)" }}
          >
            <div className="flex flex-col items-center gap-4 mt-12">
              <motion.div
                animate={!isAnswered ? { scale: [1, 1.1, 1] } : {}}
                transition={{ repeat: Infinity, duration: 1.5 }}
                className="w-24 h-24 rounded-full bg-primary-foreground/20 flex items-center justify-center"
              >
                <User className="w-12 h-12 text-primary-foreground" />
              </motion.div>
              <h2 className="text-3xl font-bold text-primary-foreground">{callerName}</h2>
              <p className="text-primary-foreground/70 text-lg">
                {isAnswered ? "Connected" : "Incoming Call..."}
              </p>
            </div>

            <div className="flex items-center gap-12">
              {!isAnswered && (
                <motion.button
                  whileTap={{ scale: 0.9 }}
                  onClick={() => {
                    stopRingtone();
                    setIsAnswered(true);
                  }}
                  className="w-16 h-16 rounded-full bg-safe flex items-center justify-center"
                >
                  <Phone className="w-7 h-7 text-primary-foreground" />
                </motion.button>
              )}
              <motion.button
                whileTap={{ scale: 0.9 }}
                onClick={endCall}
                className="w-16 h-16 rounded-full bg-sos flex items-center justify-center"
              >
                <PhoneOff className="w-7 h-7 text-primary-foreground" />
              </motion.button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default FakeCallDialog;
