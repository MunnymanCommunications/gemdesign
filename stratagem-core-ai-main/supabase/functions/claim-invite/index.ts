import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.53.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { token } = await req.json();
    if (!token || typeof token !== "string") {
      return new Response(JSON.stringify({ error: "Missing invite token" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Admin client for privileged DB operations (bypasses RLS)
    const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Auth client to validate the calling user via JWT
    const supabaseAuth = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: req.headers.get("Authorization") || "" } },
    });

    const {
      data: { user },
      error: userError,
    } = await supabaseAuth.auth.getUser();

    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Look up invite token
    const { data: invite, error: inviteError } = await supabaseAdmin
      .from("invite_tokens")
      .select("id, token, target_role, subscription_tier, max_uses, uses, expires_at")
      .eq("token", token)
      .maybeSingle();

    if (inviteError) {
      console.error("Error fetching invite:", inviteError);
      return new Response(JSON.stringify({ error: "Failed to fetch invite" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!invite) {
      return new Response(JSON.stringify({ error: "Invalid invite token" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Validate usage and expiry
    const now = new Date();
    if (invite.expires_at && new Date(invite.expires_at) < now) {
      return new Response(JSON.stringify({ error: "Invite token expired" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (invite.uses >= invite.max_uses) {
      return new Response(JSON.stringify({ error: "Invite token already used" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Assign role
    const role = invite.target_role as "admin" | "moderator" | "user";

    const { error: roleError } = await supabaseAdmin
      .from("user_roles")
      .upsert({ user_id: user.id, role }, { onConflict: "user_id,role" });

    if (roleError) {
      console.error("Error assigning role:", roleError);
      return new Response(JSON.stringify({ error: "Failed to assign role" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // If invite has a subscription tier (e.g., enterprise), apply it
    const tier = invite.subscription_tier || (role === "moderator" ? "enterprise" : null);
    if (tier) {
      const { error: subError } = await supabaseAdmin
        .from("user_subscriptions")
        .upsert({ user_id: user.id, tier }, { onConflict: "user_id" });

      if (subError) {
        console.error("Error updating subscription:", subError);
        return new Response(JSON.stringify({ error: "Failed to update subscription" }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    // Increment invite uses
    const { error: updateInviteError } = await supabaseAdmin
      .from("invite_tokens")
      .update({ uses: invite.uses + 1 })
      .eq("id", invite.id);

    if (updateInviteError) {
      console.error("Error updating invite usage:", updateInviteError);
      return new Response(JSON.stringify({ error: "Failed to update invite usage" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(
      JSON.stringify({ success: true, assignedRole: role, appliedTier: tier || undefined }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("claim-invite error:", err);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});