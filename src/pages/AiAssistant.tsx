import { Send, Bot, User, Sparkles, Shield, MapPin, Phone, AlertTriangle, Trash2, MoreVertical } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import BottomNav from "@/components/BottomNav";
import ReactMarkdown from "react-markdown";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

type Message = { id?: string; role: "user" | "assistant"; content: string };

const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-chat`;

const quickPrompts = [
  { icon: Shield, label: "Safety tips", prompt: "What are the best safety tips when walking alone at night?" },
  { icon: MapPin, label: "Safe route", prompt: "How do I find the safest route to my destination?" },
  { icon: Phone, label: "Emergency", prompt: "What should I do in an emergency situation?" },
  { icon: AlertTriangle, label: "Self defense", prompt: "What are some basic self-defense techniques?" },
];

const AiAssistant = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchHistory();
  }, []);

  const fetchHistory = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const { data, error } = await supabase
        .from("ai_chat_history")
        .select("*")
        .order("created_at", { ascending: true });

      if (error) {
        console.error("Error fetching history:", error);
        return;
      }

      if (data) {
        setMessages(data.map(m => ({ id: m.id, role: m.role, content: m.content })));
      }
    } catch (err) {
      console.error("Exception fetching history:", err);
    }
  };

  const deleteMessage = async (id?: string) => {
    if (!id) return;
    try {
      const { error } = await supabase
        .from("ai_chat_history")
        .delete()
        .eq("id", id);

      if (error) {
        toast.error("Failed to delete message");
        return;
      }

      setMessages(prev => prev.filter(m => m.id !== id));
      toast.success("Message deleted");
    } catch (err) {
      console.error("Exception deleting message:", err);
    }
  };

  const clearAllChat = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase
        .from("ai_chat_history")
        .delete()
        .eq("user_id", user.id);

      if (error) {
        toast.error("Failed to clear chat");
        return;
      }

      setMessages([]);
      toast.success("Chat history cleared");
    } catch (err) {
      console.error("Exception clearing chat:", err);
    }
  };

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  const sendMessage = async (text: string) => {
    if (!text.trim() || isLoading) return;
    const userMsg: Message = { role: "user", content: text.trim() };
    const allMessages = [...messages, userMsg];
    setMessages([...allMessages, { role: "assistant", content: "Thinking..." }]);
    setInput("");
    setIsLoading(true);

    let assistantSoFar = "";
    const setAssistant = (content: string) => {
      setMessages((prev) => {
        if (prev.length === 0) return prev;
        const last = prev[prev.length - 1];
        if (last?.role === "assistant") {
          return prev.map((m, i) => (i === prev.length - 1 ? { ...m, content } : m));
        }
        return [...prev, { role: "assistant", content }];
      });
    };

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        toast.error("Please sign in to use the assistant");
        setAssistant("Please sign in to use the assistant.");
        setIsLoading(false);
        return;
      }

      const controller = new AbortController();
      const timeout = window.setTimeout(() => controller.abort(), 30000);
      const resp = await fetch(CHAT_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ messages: allMessages.map(m => ({ role: m.role, content: m.content })) }),
        signal: controller.signal,
      });
      window.clearTimeout(timeout);

      if (!resp.ok) {
        const err = await resp.json().catch(() => ({ error: "Something went wrong" }));
        const errorMessage =
          err.error === "Internal server error"
            ? "AI temporarily unavailable. Please try again in a few seconds."
            : err.error || "Failed to get response";
        toast.error(errorMessage);
        setAssistant(errorMessage);
        setIsLoading(false);
        return;
      }

      const data = await resp.json();
      if (data.text) {
        setAssistant(data.text);
        // Refresh history to get the new IDs from the database
        setTimeout(fetchHistory, 500);
      } else {
        toast.error("AI returned an empty response. Please try again.");
        setAssistant("Sorry, I received an empty response. Please ask again.");
      }
    } catch (e) {
      console.error(e);
      if (e instanceof DOMException && e.name === "AbortError") {
        toast.error("AI request timed out. Please try again.");
        setAssistant("Sorry, the request timed out. Please try again.");
      } else {
        toast.error("Failed to connect to AI assistant");
        setAssistant("Sorry, I could not connect right now. Please try again.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col pb-20">
      {/* Header */}
      <div className="gradient-hero px-6 pt-12 pb-6 rounded-b-[2rem]">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-primary-foreground/20 flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-primary-foreground">SafeGuard AI</h1>
              <p className="text-xs text-primary-foreground/70">Your personal safety assistant</p>
            </div>
          </div>
          
          {messages.length > 0 && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="text-primary-foreground hover:bg-white/10">
                  <MoreVertical className="w-5 h-5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={clearAllChat} className="text-destructive">
                  <Trash2 className="w-4 h-4 mr-2" />
                  Clear all chat
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </div>

      {/* Chat area */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        {messages.length === 0 && (
          <div className="space-y-4 mt-4">
            <p className="text-sm text-muted-foreground text-center">
              Hi! I'm your safety assistant. Ask me anything about personal safety, emergency procedures, or how to use the app.
            </p>
            <div className="grid grid-cols-2 gap-2">
              {quickPrompts.map((qp) => (
                <motion.button
                  key={qp.label}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => sendMessage(qp.prompt)}
                  className="bg-card rounded-2xl p-3 shadow-card text-left flex items-start gap-2"
                >
                  <qp.icon className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                  <span className="text-xs font-medium text-card-foreground">{qp.label}</span>
                </motion.button>
              ))}
            </div>
          </div>
        )}

        {messages.map((msg, i) => (
          <motion.div
            key={msg.id || i}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className={`flex group gap-2 ${msg.role === "user" ? "justify-end" : "justify-start"}`}
          >
            {msg.role === "assistant" && (
              <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mt-1">
                <Bot className="w-4 h-4 text-primary" />
              </div>
            )}
            
            <div className={`flex flex-col gap-1 ${msg.role === "user" ? "items-end" : "items-start"} max-w-[80%]`}>
              <div
                className={`rounded-2xl px-4 py-2.5 text-sm relative ${
                  msg.role === "user"
                    ? "bg-primary text-primary-foreground rounded-br-md"
                    : "bg-card text-card-foreground shadow-card rounded-bl-md"
                }`}
              >
                {msg.role === "assistant" ? (
                  <div className="prose prose-sm max-w-none dark:prose-invert [&_p]:my-1 [&_ul]:my-1 [&_li]:my-0.5">
                    <ReactMarkdown>{msg.content}</ReactMarkdown>
                  </div>
                ) : (
                  msg.content
                )}
              </div>
              
              {msg.id && (
                <button
                  onClick={() => deleteMessage(msg.id)}
                  className="opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:text-destructive text-muted-foreground"
                  title="Delete message"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {msg.role === "user" && (
              <div className="w-7 h-7 rounded-full bg-primary flex items-center justify-center shrink-0 mt-1">
                <User className="w-4 h-4 text-primary-foreground" />
              </div>
            )}
          </motion.div>
        ))}

        {isLoading && messages[messages.length - 1]?.role !== "assistant" && (
          <div className="flex gap-2">
            <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
              <Bot className="w-4 h-4 text-primary" />
            </div>
            <div className="bg-card rounded-2xl px-4 py-3 shadow-card">
              <div className="flex gap-1">
                <span className="w-2 h-2 bg-muted-foreground/40 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                <span className="w-2 h-2 bg-muted-foreground/40 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                <span className="w-2 h-2 bg-muted-foreground/40 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Input */}
      <div className="px-4 py-3 bg-background border-t border-border">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            sendMessage(input);
          }}
          className="flex gap-2"
        >
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask about safety..."
            className="flex-1 rounded-full"
            disabled={isLoading}
          />
          <Button type="submit" size="icon" className="rounded-full shrink-0" disabled={isLoading || !input.trim()}>
            <Send className="w-4 h-4" />
          </Button>
        </form>
      </div>

      <BottomNav />
    </div>
  );
};

export default AiAssistant;
