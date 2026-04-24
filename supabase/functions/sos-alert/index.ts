import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

type AlertRequest = {
  locationLat?: number | null;
  locationLng?: number | null;
};

function normalizePhone(phone: string): string {
  const trimmed = phone.trim();
  if (!trimmed) return trimmed;
  if (trimmed.startsWith("+")) {
    return `+${trimmed.slice(1).replace(/[^\d]/g, "")}`;
  }
  return `+${trimmed.replace(/[^\d]/g, "")}`;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const twilioAccountSid = Deno.env.get("TWILIO_ACCOUNT_SID");
    const twilioAuthToken = Deno.env.get("TWILIO_AUTH_TOKEN");
    const twilioFromNumber = Deno.env.get("TWILIO_FROM_NUMBER");

    if (!supabaseUrl || !anonKey || !serviceRoleKey) {
      throw new Error("Supabase environment variables are not configured");
    }
    if (!twilioAccountSid || !twilioAuthToken || !twilioFromNumber) {
      throw new Error("Twilio environment variables are not configured");
    }

    const authClient = createClient(supabaseUrl, anonKey);
    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await authClient.auth.getUser(token);
    if (userError || !userData?.user?.id) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const payload = (await req.json().catch(() => ({}))) as AlertRequest;
    const userId = userData.user.id;
    const locationLat = payload.locationLat ?? null;
    const locationLng = payload.locationLng ?? null;
    const locationUrl =
      locationLat !== null && locationLng !== null
        ? `https://maps.google.com/?q=${locationLat},${locationLng}`
        : null;

    const db = createClient(supabaseUrl, serviceRoleKey);

    const { data: profile } = await db
      .from("profiles")
      .select("full_name")
      .eq("user_id", userId)
      .maybeSingle();

    const senderName = profile?.full_name?.trim() || "SafeHer user";
    const { data: contacts, error: contactsError } = await db
      .from("emergency_contacts")
      .select("phone")
      .eq("user_id", userId);

    if (contactsError) throw contactsError;
    if (!contacts || contacts.length === 0) {
      return new Response(JSON.stringify({ error: "No emergency contacts found." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const uniquePhones = Array.from(
      new Set(
        contacts
          .map((c) => normalizePhone(c.phone))
          .filter((phone) => phone.length >= 8)
      )
    );

    if (uniquePhones.length === 0) {
      return new Response(JSON.stringify({ error: "No valid contact numbers found." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const message = [
      `SOS ALERT from ${senderName}.`,
      "She may need immediate help.",
      locationUrl ? `Live location: ${locationUrl}` : "Location: unavailable",
    ].join(" ");

    const basicAuth = btoa(`${twilioAccountSid}:${twilioAuthToken}`);
    let sentCount = 0;
    let failedCount = 0;
    const failureReasons: string[] = [];

    for (const to of uniquePhones) {
      const form = new URLSearchParams({
        To: to,
        From: twilioFromNumber,
        Body: message,
      });

      const response = await fetch(
        `https://api.twilio.com/2010-04-01/Accounts/${twilioAccountSid}/Messages.json`,
        {
          method: "POST",
          headers: {
            Authorization: `Basic ${basicAuth}`,
            "Content-Type": "application/x-www-form-urlencoded",
          },
          body: form.toString(),
        }
      );

      if (response.ok) sentCount += 1;
      else {
        failedCount += 1;
        const errText = await response.text();
        failureReasons.push(`SMS to ${to} failed (${response.status}): ${errText.slice(0, 220)}`);
      }
    }

    await db.from("sos_alert_logs").insert({
      user_id: userId,
      location_lat: locationLat,
      location_lng: locationLng,
      location_url: locationUrl,
      message,
      recipients: uniquePhones,
      sent_count: sentCount,
      failed_count: failedCount,
    });

    return new Response(
      JSON.stringify({
        ok: failedCount === 0,
        sentCount,
        failedCount,
        error: failedCount > 0
          ? "Twilio could not send one or more messages. Check Twilio trial recipient verification and phone number format with country code."
          : null,
        details: failureReasons,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("sos-alert error:", error);
    return new Response(JSON.stringify({ error: "Failed to send SOS alerts." }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
