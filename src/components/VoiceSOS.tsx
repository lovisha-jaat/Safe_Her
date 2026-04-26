import React, { useState, useEffect, useRef } from "react";
import { Mic, MicOff, AlertCircle, CheckCircle2, StopCircle, Info } from "lucide-react";
import { Switch } from "@/components/ui/button"; // Actually use a proper switch component if available
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";

interface VoiceSOSProps {
  onTriggerSOS: () => void;
}

const VOICE_SOS_KEY = "safeher.voice_sos_enabled";

const VoiceSOS: React.FC<VoiceSOSProps> = ({ onTriggerSOS }) => {
  // Voice SOS is now a mandatory permanent feature
  const isEnabled = true;
  const [isListening, setIsListening] = useState(false);
  const [status, setStatus] = useState<"idle" | "listening" | "detected" | "triggered">("idle");
  const [isSupported, setIsSupported] = useState(true);
  const [transcript, setTranscript] = useState("");
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [errorInfo, setErrorInfo] = useState<string | null>(null);
  const recognitionRef = useRef<any>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  // Common variations and phonetic misspellings for faster detection
  const KEYWORDS = [
    "help", "bachao", "save me", "sos", "emergency", 
    "elp", "bacho", "bacho m", "safe me", "emrgency", "police",
    "madad", "bacao", "help me", "help help", "bachaiye"
  ];

  useEffect(() => {
    // Force set in storage
    localStorage.setItem(VOICE_SOS_KEY, "true");
    
    // Check for browser support
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setIsSupported(false);
      setErrorInfo("Speech recognition not supported in this browser.");
    } else {
      // Auto-start and request permission automatically
      handleAutoStart();
    }

    return () => {
      stopListening();
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
      if (audioContextRef.current) audioContextRef.current.close();
    };
  }, []);

  const startVisualizer = async (stream: MediaStream) => {
    try {
      if (audioContextRef.current) {
        await audioContextRef.current.close();
      }
      
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const analyser = audioContext.createAnalyser();
      const source = audioContext.createMediaStreamSource(stream);
      source.connect(analyser);
      analyser.fftSize = 256;
      
      const bufferLength = analyser.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);
      
      analyserRef.current = analyser;
      audioContextRef.current = audioContext;

      const checkAudio = () => {
        if (!analyserRef.current) return;
        analyserRef.current.getByteFrequencyData(dataArray);
        
        const sum = dataArray.reduce((a, b) => a + b, 0);
        const average = sum / bufferLength;
        
        setIsSpeaking(average > 15);
        animationFrameRef.current = requestAnimationFrame(checkAudio);
      };
      
      checkAudio();
    } catch (err) {
      console.error("Visualizer error:", err);
    }
  };

  const handleAutoStart = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      setErrorInfo(null);
      startVisualizer(stream);
      startListening();
    } catch (err: any) {
      console.error("Mic permission error:", err);
      if (err.name === "NotAllowedError" || err.name === "PermissionDeniedError") {
        setErrorInfo("Microphone permission denied. Click the lock icon 🔒 to allow.");
      } else {
        setErrorInfo("Could not access microphone. Please check settings.");
      }
    }
  };

  const startListening = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) return;

    try {
      if (recognitionRef.current) {
        recognitionRef.current.onend = null;
        recognitionRef.current.onerror = null;
        recognitionRef.current.onresult = null;
        try { recognitionRef.current.stop(); } catch (e) {}
      }

      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = "en-IN";

      recognition.onstart = () => {
        setIsListening(true);
        setStatus("listening");
        setErrorInfo(null);
      };

      recognition.onresult = (event: any) => {
        let fullTranscript = "";
        for (let i = event.resultIndex; i < event.results.length; i++) {
          fullTranscript += event.results[i][0].transcript + " ";
        }
        
        const finalTranscript = fullTranscript.toLowerCase().trim();
        setTranscript(finalTranscript);

        const detected = KEYWORDS.some((keyword) => finalTranscript.includes(keyword));
        
        if (detected && status !== "detected" && status !== "triggered") {
          setStatus("detected");
          toast.success(`EMERGENCY DETECTED!`, {
            duration: 5000,
            style: { background: '#ef4444', color: '#fff', fontWeight: 'bold' },
          });
          
          setTimeout(() => {
            setStatus("triggered");
            onTriggerSOS();
            setTranscript("");
            setTimeout(() => {
              setStatus("listening");
              startListening();
            }, 5000);
          }, 500);
        }
      };

      recognition.onerror = (event: any) => {
        console.error("Speech recognition error:", event.error);
        
        if (event.error === "no-speech") return;
        
        if (event.error === "not-allowed" || event.error === "service-not-allowed") {
          setErrorInfo("Mic blocked. Tap 'Wake Up Engine' to try again.");
        } else if (event.error === "network") {
          setErrorInfo("Network error. Voice recognition requires internet.");
        } else if (event.error === "aborted") {
          // ignore
        } else {
          setErrorInfo(`Error: ${event.error}. Tap to refresh.`);
        }
        
        setIsListening(false);
      };

      recognition.onend = () => {
        setIsListening(false);
        if (status === "listening") {
          setTimeout(() => {
            if (recognitionRef.current === recognition) {
              try { recognition.start(); } catch (e) {}
            }
          }, 100);
        }
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch (err) {
      console.error("Error starting speech recognition:", err);
      setErrorInfo("Recognition failed to start.");
    }
  };

  const manualWakeUp = async () => {
    toast.info("Waking up voice engine...");
    await handleAutoStart();
  };

  const stopListening = () => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.onend = null;
        recognitionRef.current.stop();
      } catch (e) {
        console.error("Error stopping recognition:", e);
      }
      recognitionRef.current = null;
    }
    setIsListening(false);
    setTranscript("");
  };

  if (!isSupported) {
    return (
      <div className="bg-card rounded-2xl p-4 shadow-card border border-destructive/20 flex items-center gap-3">
        <AlertCircle className="w-5 h-5 text-destructive" />
        <div className="flex-1">
          <p className="text-xs font-bold text-card-foreground">Voice SOS Unavailable</p>
          <p className="text-[10px] text-muted-foreground">Your browser doesn't support speech recognition.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-card rounded-2xl p-4 shadow-card border border-border transition-all duration-300 relative overflow-hidden">
      {/* Permanent Status Indicator */}
      <div className="absolute top-0 left-0 w-1 h-full bg-primary" />
      
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors ${isSpeaking ? 'bg-primary/30' : 'bg-primary/10'}`}>
            <Mic className={`w-5 h-5 text-primary ${isSpeaking ? 'scale-125' : 'scale-100'} transition-transform duration-75`} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-card-foreground">SafeGuard Voice</h3>
              <span className={`text-[8px] font-bold px-1.5 py-0.5 rounded-full uppercase tracking-wider transition-colors ${isSpeaking ? 'bg-safe text-white animate-pulse' : 'bg-primary/20 text-primary'}`}>
                {isSpeaking ? 'Hearing...' : 'Active'}
              </span>
            </div>
            <p className="text-[10px] text-muted-foreground">Permanent safety monitoring active</p>
          </div>
        </div>
      </div>

      <div className="pt-2 border-t border-border mt-2 space-y-2">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            {status === "listening" && !errorInfo && (
              <>
                <div className="flex gap-1">
                  <span className="w-1.5 h-1.5 bg-primary rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                  <span className="w-1.5 h-1.5 bg-primary rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                  <span className="w-1.5 h-1.5 bg-primary rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                </div>
                <span className="text-[10px] font-medium text-primary uppercase tracking-wider">Listening for keywords...</span>
              </>
            )}
            {status === "detected" && (
              <>
                <Info className="w-3.5 h-3.5 text-accent animate-spin" />
                <span className="text-[10px] font-medium text-accent uppercase tracking-wider font-bold">EMERGENCY DETECTED!</span>
              </>
            )}
            {status === "triggered" && (
              <>
                <CheckCircle2 className="w-3.5 h-3.5 text-safe" />
                <span className="text-[10px] font-medium text-safe uppercase tracking-wider font-bold">SOS Triggered</span>
              </>
            )}
            {errorInfo && (
              <div className="flex items-center gap-1.5 text-destructive">
                <AlertCircle className="w-3.5 h-3.5" />
                <span className="text-[9px] font-bold uppercase">{errorInfo}</span>
              </div>
            )}
          </div>
          
          <button
            onClick={manualWakeUp}
            className="flex items-center gap-1 text-[9px] font-bold bg-primary/10 text-primary px-2 py-1 rounded-full hover:bg-primary hover:text-white transition-all shrink-0 shadow-sm"
          >
            WAKE UP ENGINE
          </button>
        </div>
        
        {transcript && (
          <div className="bg-muted/30 rounded-lg p-2 flex items-start gap-2 border border-border/50">
            <span className="text-[9px] font-bold text-muted-foreground uppercase mt-0.5">Hearing:</span>
            <p className="text-[11px] text-card-foreground italic flex-1">"{transcript}"</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default VoiceSOS;
