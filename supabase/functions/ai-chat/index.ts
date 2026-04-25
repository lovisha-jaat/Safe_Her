import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const MAX_MESSAGES = 50;
const MAX_CONTENT_LEN = 2000;
const FALLBACK_MODEL = "openai/gpt-4o-mini";
const SYSTEM_PROMPT = `You are SafeGuard AI — a helpful, empathetic safety assistant built into the SafeHer women's safety app. Your role is to:
- Provide safety tips and advice for various situations (walking alone, traveling, etc.)
- Help users understand how to use features like SOS, emergency contacts, safe routes, fake call, and incident reporting
- Offer guidance during emergencies (what to do, who to call)
- Share information about personal safety, self-defense basics, and awareness
- Provide emotional support and reassurance
- Answer questions about local safety resources (police, hospitals, shelters)

CONVERSATION STYLE — IMPORTANT:
- Be warm, supportive, concise, and action-oriented. Use bullet points and short paragraphs.
- First, answer the user's latest question directly and specifically. Do not ignore what they asked.
- If the user asks for steps, provide short numbered steps.
- Ask at most ONE brief follow-up question only when it helps clarify next action. If the user asked a direct factual question, do not force a follow-up.
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
- ✅ Identity Verification: KYC to prevent fake accounts`;

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
    const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");

    let geminiFailureReason = "";
    const hasValidLovableKey = !!LOVABLE_API_KEY && LOVABLE_API_KEY.startsWith("sk-");
    if (GEMINI_API_KEY) {
      const configuredModels = (Deno.env.get("GEMINI_MODEL") || "").split(",").map((m) => m.trim()).filter(Boolean);
      let geminiModelCandidates = configuredModels.length > 0
        ? configuredModels
        : ["gemini-2.0-flash", "gemini-2.0-flash-lite", "gemini-1.5-flash-latest", "gemini-1.5-flash"];

      // Discover available models for this API key/project to avoid hardcoded model mismatch.
      const listModelsResp = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models?key=${GEMINI_API_KEY}`,
        { method: "GET" },
      );
      if (listModelsResp.ok) {
        const listPayload = await listModelsResp.json().catch(() => ({}));
        const discovered = (listPayload?.models || [])
          .filter((m: any) => Array.isArray(m?.supportedGenerationMethods) && m.supportedGenerationMethods.includes("generateContent"))
          .map((m: any) => String(m?.name || "").replace(/^models\//, ""))
          .filter(Boolean);
        if (discovered.length > 0) {
          geminiModelCandidates = [...new Set([...configuredModels, ...discovered])];
        }
      } else {
        const listErrText = await listModelsResp.text();
        console.error("Gemini listModels error:", listModelsResp.status, listErrText);
      }

      const geminiMessages = sanitized.map((m: { role: "user" | "assistant"; content: string }) => ({
        role: m.role === "assistant" ? "model" : "user",
        parts: [{ text: m.content }],
      }));
      for (const geminiModel of geminiModelCandidates) {
        const geminiResp = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${geminiModel}:generateContent?key=${GEMINI_API_KEY}`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              system_instruction: { parts: [{ text: SYSTEM_PROMPT }] },
              contents: geminiMessages,
              generationConfig: {
                temperature: 0.5,
                maxOutputTokens: 900,
              },
            }),
          },
        );

        const geminiRaw = await geminiResp.text();
        if (geminiResp.ok) {
          const geminiData = JSON.parse(geminiRaw || "{}");
          const text = geminiData?.candidates?.[0]?.content?.parts?.map((p: { text?: string }) => p.text || "").join("").trim();

          if (text) {
            return new Response(JSON.stringify({ text }), {
              status: 200,
              headers: { ...corsHeaders, "Content-Type": "application/json" },
            });
          }
          geminiFailureReason = `Gemini model ${geminiModel} returned empty response.`;
          console.error("Gemini empty response payload:", JSON.stringify(geminiData));
          continue;
        }

        geminiFailureReason = `Gemini ${geminiModel} error ${geminiResp.status}: ${geminiRaw.slice(0, 240)}`;
        console.error("Gemini API error:", geminiModel, geminiResp.status, geminiRaw);

        // try next model on not-found/model errors
        if (geminiResp.status === 404) continue;
        // invalid key or permission should stop immediately
        if (geminiResp.status === 401 || geminiResp.status === 403) break;
      }

      // If Gemini fails or returns empty, continue to Lovable fallback when available.
      if (!hasValidLovableKey) {
        return new Response(JSON.stringify({ error: geminiFailureReason || "Gemini failed. Check GEMINI_API_KEY, API enablement, or model access." }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    if (hasValidLovableKey) {
      const selectedModel = Deno.env.get("AI_MODEL") || "google/gemini-3-flash-preview";
      const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: selectedModel,
          messages: [
            {
              role: "system",
              content: SYSTEM_PROMPT,
            },
            ...sanitized,
          ],
          stream: false,
        }),
      });

      let finalResponse = response;
      if (!finalResponse.ok && finalResponse.status >= 500) {
        // Retry once with a stable fallback model for transient/provider model issues.
        finalResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${LOVABLE_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: FALLBACK_MODEL,
            messages: [
              {
                role: "system",
                content: "You are SafeGuard AI. Answer the user's latest question directly, clearly, and safely.",
              },
              ...sanitized,
            ],
            stream: false,
          }),
        });
      }

      if (!finalResponse.ok) {
        if (finalResponse.status === 429) {
          return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again in a moment." }), {
            status: 429,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        if (finalResponse.status === 402) {
          return new Response(JSON.stringify({ error: "AI credits exhausted. Please add funds." }), {
            status: 402,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        const t = await finalResponse.text();
        console.error("AI gateway error:", finalResponse.status, t);
        const combinedError = geminiFailureReason
          ? `${geminiFailureReason} | Lovable error ${finalResponse.status}: ${t.slice(0, 160)}`
          : `AI service unavailable (${finalResponse.status})`;
        return new Response(JSON.stringify({ error: combinedError }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const lovableJson = await finalResponse.json().catch(() => null);
      const lovableText =
        lovableJson?.choices?.[0]?.message?.content ||
        lovableJson?.choices?.[0]?.text ||
        lovableJson?.message ||
        "";

      if (!lovableText) {
        return new Response(JSON.stringify({ error: "AI returned empty response." }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      return new Response(JSON.stringify({ text: lovableText }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!GEMINI_API_KEY && !LOVABLE_API_KEY) {
      return new Response(JSON.stringify({ error: "AI is not configured. Set GEMINI_API_KEY or LOVABLE_API_KEY in Supabase secrets." }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "AI is not configured correctly. Use a valid GEMINI_API_KEY or LOVABLE_API_KEY starting with sk-." }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("chat error:", e);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
