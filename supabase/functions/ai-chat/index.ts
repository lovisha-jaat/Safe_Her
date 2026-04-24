import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const MAX_MESSAGES = 50;
const MAX_CONTENT_LEN = 2000;

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    // ---- Auth check ----
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
    );
    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabase.auth.getUser(token);
    if (userError || !userData?.user?.id) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ---- Input validation ----
    const body = await req.json().catch(() => null);
    if (!body || !Array.isArray(body.messages)) {
      return new Response(JSON.stringify({ error: "Invalid request" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (body.messages.length === 0 || body.messages.length > MAX_MESSAGES) {
      return new Response(JSON.stringify({ error: "Invalid messages length" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const sanitized = body.messages
      .filter((m: any) =>
        m && (m.role === "user" || m.role === "assistant") && typeof m.content === "string"
      )
      .map((m: any) => ({
        role: m.role,
        content: m.content.slice(0, MAX_CONTENT_LEN),
      }));

    if (sanitized.length === 0) {
      return new Response(JSON.stringify({ error: "Invalid messages" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          {
            role: "system",
            content: `You are SafeGuard AI — a helpful, empathetic safety assistant built into the SafeHer women's safety app. Your role is to:
- Provide safety tips and advice for various situations (walking alone, traveling, etc.)
- Help users understand how to use features like SOS, emergency contacts, safe routes, fake call, and incident reporting
- Offer guidance during emergencies (what to do, who to call)
- Share information about personal safety, self-defense basics, and awareness
- Provide emotional support and reassurance
- Answer questions about local safety resources (police, hospitals, shelters)

CONVERSATION STYLE — IMPORTANT:
- Be warm, supportive, concise, and action-oriented. Use bullet points and short paragraphs.
- ALWAYS end your response with ONE relevant follow-up question tailored to the user's last answer, so the conversation feels like a real, caring chat.
- The follow-up question should help you give better, more personalized advice next (e.g. ask about their location, time of day, who they're with, how they're feeling, what they've already tried, or what kind of help they need next).
- Format the follow-up clearly on its own line, prefixed with "👉 " so it stands out.
- If the user gives a short answer (yes/no, one word), interpret it in the context of YOUR previous question and continue the thread — don't restart the topic.
- If someone seems to be in immediate danger, advise calling emergency services FIRST, then ask a clarifying question to keep helping.

SAFEHER APP FEATURES you can guide users on:
- 🚨 SOS button: 5-second countdown, then auto-SMS + call to primary emergency contact with live Google Maps location
- 👥 Emergency Contacts: add trusted people who get notified during SOS
- 🗺️ Safe Map: view safety zones, search places (including villages), see community-verified incidents
- 📝 Report Incident: submit incidents that admins verify, then appear on the public map
- 📞 Fake Call: trigger a fake incoming call to escape uncomfortable situations
- ✅ Identity Verification: KYC to prevent fake accounts`,
          },
          ...sanitized,
        ],
        stream: true,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again in a moment." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted. Please add funds." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      return new Response(JSON.stringify({ error: "AI service unavailable" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    console.error("chat error:", e);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
