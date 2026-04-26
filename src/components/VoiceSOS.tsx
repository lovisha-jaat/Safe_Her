import React, { useState, useEffect, useRef } from "react";
import { Mic, MicOff, AlertCircle, StopCircle, Phone, Users, X } from "lucide-react";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";

interface VoiceSOSProps {
  onTriggerSOS: () => void;
}

const VOICE_SOS_KEY = "safeher.voice_sos_enabled";

const VoiceSOS: React.FC<VoiceSOSProps> = ({ onTriggerSOS }) => {
  const [isEnabled, setIsEnabled] = useState(() => {
    const saved = localStorage.getItem(VOICE_SOS_KEY);
    return saved === "true";
  });
  const [isListening, setIsListening] = useState(false);
  const [status, setStatus] = useState<"off" | "listening" | "family_detected" | "police_detected" | "triggered">("off");
  const [isSupported, setIsSupported] = useState(true);
  const [transcript, setTranscript] = useState("");
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [errorInfo, setErrorInfo] = useState<string | null>(null);
  
  const recognitionRef = useRef<any>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const isTriggeringRef = useRef(false);

  const FAMILY_KEYWORDS = [
    "help", "bachao", "save me", "emergency", "sos", "bachao bachao", 
    "elp", "save", "urgent", "danger", "khatra", "madad", "madat",
    "bacho", "pachao", "bachaoo", "saveme", "halp", "help me", "mujhe bachao"
  ];
  const POLICE_KEYWORDS = [
    "call police", "police ko call karo", "police ko phone karo", 
    "police bulao", "112 call karo", "call 112", "police station",
    "call police now", "dial 112", "police 112", "police police",
    "pulis", "pulis bulao", "pulis ko call karo", "112 dial karo",
    "police ko phone lagao", "police call"
  ];

  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setIsSupported(false);
    } else if (isEnabled) {
      handleStart();
    }

    const refreshInterval = setInterval(() => {
      if (isEnabled && isListening) {
        console.log("Refreshing voice engine...");
        startListening();
      }
    }, 60000);

    return () => {
      clearInterval(refreshInterval);
      stopListening();
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
      if (audioContextRef.current) audioContextRef.current.close();
    };
  }, []);

  const startVisualizer = async (stream: MediaStream) => {
    try {
      if (audioContextRef.current) await audioContextRef.current.close();
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const analyser = audioContext.createAnalyser();
      const source = audioContext.createMediaStreamSource(stream);
      source.connect(analyser);
      analyser.fftSize = 64;
      const bufferLength = analyser.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);
      analyserRef.current = analyser;
      audioContextRef.current = audioContext;

      const checkAudio = () => {
        if (!analyserRef.current) return;
        analyserRef.current.getByteFrequencyData(dataArray);
        const sum = dataArray.reduce((a, b) => a + b, 0);
        const average = sum / bufferLength;
        setIsSpeaking(average > 10);
        animationFrameRef.current = requestAnimationFrame(checkAudio);
      };
      checkAudio();
    } catch (err) {
      console.error("Visualizer error:", err);
    }
  };

  const handleStart = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      setErrorInfo(null);
      setIsEnabled(true);
      localStorage.setItem(VOICE_SOS_KEY, "true");
      startVisualizer(stream);
      startListening();
      setStatus("listening");
    } catch (err: any) {
      setIsEnabled(false);
      localStorage.setItem(VOICE_SOS_KEY, "false");
      if (err.name === "NotAllowedError") {
        setErrorInfo("Microphone access denied.");
      } else {
        setErrorInfo("Mic error. Check settings.");
      }
    }
  };

  const startListening = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) return;

    if (recognitionRef.current) {
      recognitionRef.current.onend = null;
      try { recognitionRef.current.stop(); } catch (e) {}
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = "en-IN";
    recognition.maxAlternatives = 3;

    recognition.onstart = () => {
      setIsListening(true);
      if (status !== "family_detected" && status !== "police_detected") {
        setStatus("listening");
      }
    };

    recognition.onresult = (event: any) => {
      if (isTriggeringRef.current) return;

      let currentTranscript = "";
      let foundType: "family" | "police" | null = null;

      for (let i = event.resultIndex; i < event.results.length; ++i) {
        const result = event.results[i];
        // The first alternative is usually the most accurate
        currentTranscript = result[0].transcript.toLowerCase();
        
        // Check all alternatives for better recognition in noisy environments
        for (let j = 0; j < result.length; j++) {
          const text = result[j].transcript.toLowerCase();
          
          if (POLICE_KEYWORDS.some(k => text.includes(k))) {
            foundType = "police";
            break;
          }
          if (FAMILY_KEYWORDS.some(k => text.includes(k))) {
            foundType = "family";
            break;
          }
        }
        if (foundType) break;
      }

      if (currentTranscript) {
        setTranscript(currentTranscript);
      }

      if (foundType) {
        isTriggeringRef.current = true;
        executeAction(foundType);
      }
    };

    recognition.onerror = (event: any) => {
      if (event.error !== "no-speech") setIsListening(false);
    };

    recognition.onend = () => {
      setIsListening(false);
      if (isEnabled) {
        setTimeout(() => { try { recognition.start(); } catch (e) {} }, 100);
      }
    };

    recognitionRef.current = recognition;
    recognition.start();
  };

  const executeAction = (type: "family" | "police") => {
    setStatus(type === "family" ? "family_detected" : "police_detected");
    
    if (type === "family") {
      onTriggerSOS();
      toast.success("Family SOS Triggered!");
    } else {
      toast.info("Calling Emergency Helpline 112");
      window.location.href = "tel:112";
    }
    
    // Unlock and reset after a delay to prevent multiple triggers for the same phrase
    setTimeout(() => {
      isTriggeringRef.current = false;
      setStatus("listening");
      setTranscript("");
    }, 4000);
  };

  const stopListening = () => {
    setIsEnabled(false);
    localStorage.setItem(VOICE_SOS_KEY, "false");
    if (recognitionRef.current) {
      recognitionRef.current.onend = null;
      try { recognitionRef.current.stop(); } catch (e) {}
      recognitionRef.current = null;
    }
    setIsListening(false);
    setStatus("off");
    setTranscript("");
  };

  if (!isSupported) {
    return (
      <div className="bg-card rounded-2xl p-4 shadow-card border border-destructive/20 flex items-center gap-3">
        <AlertCircle className="w-5 h-5 text-destructive" />
        <p className="text-xs font-bold text-card-foreground">Voice SOS is not supported on this browser.</p>
      </div>
    );
  }

  return (
    <div className="bg-card rounded-2xl p-4 shadow-card border border-border transition-all duration-300 relative overflow-hidden">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${isEnabled ? 'bg-primary/20 text-primary' : 'bg-muted text-muted-foreground'}`}>
            {isEnabled ? <Mic className={`w-5 h-5 ${isSpeaking ? 'scale-110' : 'scale-100'} transition-transform`} /> : <MicOff className="w-5 h-5" />}
          </div>
          <div>
            <h3 className="text-sm font-bold text-foreground">SafeGuard Voice <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-primary/10 text-primary ml-1 uppercase">Active</span></h3>
            <p className="text-[11px] text-muted-foreground">Permanent safety monitoring active</p>
          </div>
        </div>
        
        {!isEnabled ? (
          <button 
            onClick={handleStart} 
            className="text-[10px] font-bold text-primary border border-primary/20 px-3 py-1.5 rounded-lg hover:bg-primary/5 transition-all uppercase"
          >
            Wake up engine
          </button>
        ) : (
          <button 
            onClick={stopListening} 
            className="text-[10px] font-bold text-muted-foreground hover:text-destructive flex items-center gap-1 transition-colors uppercase"
          >
            <StopCircle className="w-3 h-3" /> Stop Engine
          </button>
        )}
      </div>

      <div className="py-2 border-t border-border/50">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <div className="flex gap-1">
              <div className={`w-1 h-1 rounded-full bg-primary ${isEnabled ? 'animate-bounce [animation-delay:-0.3s]' : ''}`}></div>
              <div className={`w-1 h-1 rounded-full bg-primary ${isEnabled ? 'animate-bounce [animation-delay:-0.15s]' : ''}`}></div>
              <div className={`w-1 h-1 rounded-full bg-primary ${isEnabled ? 'animate-bounce' : ''}`}></div>
            </div>
            <span className="text-[10px] font-bold text-primary uppercase tracking-wider">
              {status === 'family_detected' ? 'Triggering SOS...' : 
               status === 'police_detected' ? 'Calling Police (112)...' : 
               'Listening for keywords...'}
            </span>
          </div>
        </div>

        <div className="bg-muted/30 rounded-lg p-2 flex items-center gap-2 border border-border/50">
          <span className="text-[9px] font-bold text-muted-foreground uppercase shrink-0">Hearing:</span>
          <p className="text-[11px] text-foreground italic line-clamp-1">
            {transcript ? `"${transcript}"` : '"..."'}
          </p>
        </div>
      </div>

      {errorInfo && (
        <div className="mt-1 flex items-center gap-1.5 text-destructive">
          <AlertCircle className="w-2.5 h-2.5" />
          <span className="text-[9px] font-bold uppercase">{errorInfo}</span>
        </div>
      )}
    </div>
  );
};

export default VoiceSOS;
