import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import Stripe from 'https://esm.sh/stripe@10.17.0?target=deno';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type'
};
const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY'), {
  httpClient: Stripe.createFetchHttpClient(),
  apiVersion: '2024-04-10'
});
const supabase = createClient(Deno.env.get('SUPABASE_URL') ?? '', Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '');
const getTierFromPriceId = async (priceId)=>{
  const { data, error } = await supabase.from('admin_settings').select('stripe_price_id_base, stripe_price_id_pro').limit(1).single();
  if (error) {
    console.error('Error fetching admin settings:', error);
    return null;
  }
  if (priceId === data.stripe_price_id_base) return 'base';
  if (priceId === data.stripe_price_id_pro) return 'pro';
  return null;
};
serve(async (req)=>{
  if (req.method === 'OPTIONS') return new Response('ok', {
    headers: corsHeaders
  });
  const signature = req.headers.get('Stripe-Signature');
  const body = await req.text();
  let event;
  try {
    event = await stripe.webhooks.constructEventAsync(body, signature, Deno.env.get('STRIPE_WEBHOOK_SECRET'));
  } catch (err) {
    return new Response(err.message, {
      status: 400,
      headers: corsHeaders
    });
  }
  try {
    const subscription = event.data.object;
    const stripeCustomerId = subscription.customer;
    const { data: profile } = await supabase.from('profiles').select('id').eq('stripe_customer_id', stripeCustomerId).single();
    if (!profile) throw new Error(`Profile not found for customer ${stripeCustomerId}`);
    const tier = await getTierFromPriceId(subscription.items.data[0].price.id);
    if (!tier) throw new Error(`No matching tier found for price ID ${subscription.items.data[0].price.id}`);
    await supabase.from('user_subscriptions').upsert({
      user_id: profile.id,
      tier,
      status: subscription.status,
      stripe_customer_id: stripeCustomerId,
      stripe_subscription_id: subscription.id
    }, {
      onConflict: 'user_id'
    });
    return new Response(JSON.stringify({
      received: true
    }), {
      status: 200,
      headers: corsHeaders
    });
  } catch (err) {
    return new Response(err.message, {
      status: 500,
      headers: corsHeaders
    });
  }
});
