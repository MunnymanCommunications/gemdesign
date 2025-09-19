import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import Stripe from "https://esm.sh/stripe@10.17.0?target=deno"

const stripe = Stripe(Deno.env.get("STRIPE_SECRET_KEY"), {
  httpClient: Stripe.createFetchHttpClient(),
})

serve(async (req) => {
  try {
    // Check if the Stripe secret key is configured
    if (!Deno.env.get("STRIPE_SECRET_KEY")) {
      throw new Error("Stripe secret key is not configured.")
    }

    // Make a simple API call to Stripe to verify the key
    await stripe.customers.list({ limit: 1 })

    return new Response(JSON.stringify({ configured: true }), {
      headers: { "Content-Type": "application/json" },
    })
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    })
  }
})