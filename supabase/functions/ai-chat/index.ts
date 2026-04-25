import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const SYSTEM_PROMPT = `You are SafeGuard AI, a highly knowledgeable and supportive safety assistant for the SafeHer app. Your goal is to provide detailed, actionable, and empathetic safety advice while seamlessly integrating app features.

Style Guidelines:
- **Attractive Formatting**: Use bold text for key terms and emojis to make the response visually engaging.
- **Detailed & Structured**: Provide comprehensive answers. Use clear headings if multiple topics are covered.
- **Warm & Empathetic**: Use a reassuring yet professional tone.
- **Practical Steps**: When giving advice, use numbered lists for sequential steps or bullet points for tips.
- **App Integration**: Always mention how specific SafeHer features can help in the given context.

SafeHer Features to reference:
- 🛡️ **SOS Alert**: Sends live location to emergency contacts instantly.
- 👥 **Emergency Contacts**: Stores trusted people who get notified during an SOS.
- 📍 **Safe Map**: Displays safe/risky zones and secure routes.
- 📢 **Report Incident**: Allows reporting unsafe activity to help the community.
- 📞 **Fake Call**: Simulates a call to help escape uncomfortable situations.

Mandatory Safety Protocol:
- If a user expresses immediate danger, your FIRST sentence must advise calling local emergency services (e.g., 911, 100).`;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");

    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY");
    const geminiApiKey = Deno.env.get("GEMINI_API_KEY");

    if (!supabaseUrl || !supabaseAnonKey) {
      return new Response(JSON.stringify({ error: "Supabase secrets missing" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!geminiApiKey) {
      return new Response(JSON.stringify({ error: "GEMINI_API_KEY is missing" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(supabaseUrl, supabaseAnonKey);
    const token = authHeader.replace("Bearer ", "");

    const { data, error } = await supabase.auth.getUser(token);

    if (error || !data?.user) {
      return new Response(JSON.stringify({ error: "Unauthorized user" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();

    if (!body?.messages || !Array.isArray(body.messages)) {
      return new Response(JSON.stringify({ error: "Invalid messages" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const messages = body.messages
      .filter(
        (m: any) =>
          m &&
          (m.role === "user" || m.role === "assistant") &&
          typeof m.content === "string" &&
          m.content.trim().length > 0
      )
      .slice(-10)
      .map((m: any) => ({
        role: m.role === "assistant" ? "model" : "user",
        parts: [{ text: m.content.slice(0, 1000) }],
      }));

    // Merge consecutive messages with the same role for Gemini API
    let contents = [];
    for (const m of messages) {
      if (contents.length > 0 && contents[contents.length - 1].role === m.role) {
        contents[contents.length - 1].parts[0].text += "\n" + m.parts[0].text;
      } else {
        contents.push(m);
      }
    }

    // Gemini API requires the conversation to start with a 'user' message
    while (contents.length > 0 && contents[0].role !== "user") {
      contents.shift();
    }

    if (contents.length === 0) {
      return new Response(JSON.stringify({ error: "No valid user messages found" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let geminiModel = (Deno.env.get("GEMINI_MODEL") || "gemini-1.5-flash").trim();
    
    // Ensure the model name doesn't include the 'models/' prefix as it's added in the URL
    if (geminiModel.startsWith("models/")) {
      geminiModel = geminiModel.replace("models/", "");
    }

    const requestBody = {
      system_instruction: {
        parts: [{ text: SYSTEM_PROMPT }],
      },
      contents: contents,
      generationConfig: {
        temperature: 0.4,
        maxOutputTokens: 1000,
      },
      safetySettings: [
        {
          category: "HARM_CATEGORY_HARASSMENT",
          threshold: "BLOCK_NONE",
        },
        {
          category: "HARM_CATEGORY_HATE_SPEECH",
          threshold: "BLOCK_NONE",
        },
        {
          category: "HARM_CATEGORY_SEXUALLY_EXPLICIT",
          threshold: "BLOCK_NONE",
        },
        {
          category: "HARM_CATEGORY_DANGEROUS_CONTENT",
          threshold: "BLOCK_NONE",
        },
      ],
    };

    const geminiResponse = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${geminiModel}:generateContent?key=${geminiApiKey}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestBody),
      }
    );

    if (!geminiResponse.ok) {
      const raw = await geminiResponse.text();
      console.error("Gemini error:", geminiResponse.status, raw);
      let errorDetail = `Gemini error ${geminiResponse.status}`;
      try {
        const errorJson = JSON.parse(raw);
        if (errorJson.error?.message) {
          errorDetail = errorJson.error.message;
        }
      } catch (e) {
        // use default errorDetail
      }

      return new Response(
        JSON.stringify({
          error: errorDetail,
        }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const geminiData = await geminiResponse.json();
    const text = geminiData?.candidates?.[0]?.content?.parts?.[0]?.text || "";

    if (!text) {
      console.error("Empty Gemini response:", JSON.stringify(geminiData));
      return new Response(JSON.stringify({ error: "Empty AI response" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ text }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("AI chat error:", err);

    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});