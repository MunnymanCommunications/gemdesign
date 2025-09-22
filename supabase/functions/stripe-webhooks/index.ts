import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import Stripe from 'https://esm.sh/stripe@10.17.0?target=deno';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// Stripe client
const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') as string, {
  httpClient: Stripe.createFetchHttpClient(),
  apiVersion: '2024-04-10',
});

// Supabase client
const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
);

const getTierFromPriceId = async (priceId: string): Promise<string | null> => {
  const { data, error } = await supabase
    .from('admin_settings')
    .select('stripe_base_price_id, stripe_pro_price_id')
    .limit(1)
    .single();

  if (error) {
    console.error('Error fetching admin settings:', error);
    return null;
  }

  if (priceId === data.stripe_base_price_id) return 'base';
  if (priceId === data.stripe_pro_price_id) return 'pro';

  return null;
};

serve(async (req: Request) => {
  const signature = req.headers.get('Stripe-Signature');
  const body = await req.text();

  let event: Stripe.Event;
  try {
    event = await stripe.webhooks.constructEventAsync(
      body,
      signature!,
      Deno.env.get('STRIPE_WEBHOOK_SECRET')!
    );
  } catch (err) {
    console.error(err);
    return new Response(err.message, { status: 400 });
  }

  try {
    const subscription = event.data.object as Stripe.Subscription;
    const stripeCustomerId = subscription.customer as string;

    const { data: profile } = await supabase
      .from('profiles')
      .select('id')
      .eq('stripe_customer_id', stripeCustomerId)
      .single();

    if (!profile) {
      throw new Error(`Profile not found for customer ${stripeCustomerId}`);
    }

    const userId = profile.id;
    const priceId = subscription.items.data[0].price.id;
    const tier = await getTierFromPriceId(priceId);

    if (!tier) {
      throw new Error(`No matching tier found for price ID ${priceId}`);
    }

    const subscriptionData = {
      user_id: userId,
      tier: tier,
      status: subscription.status,
      stripe_customer_id: stripeCustomerId,
      stripe_subscription_id: subscription.id,
    };

    // Upsert subscription data
    const { error } = await supabase
      .from('user_subscriptions')
      .upsert(subscriptionData, { onConflict: 'user_id' });

    if (error) {
      console.error('Supabase upsert error:', error);
      throw error;
    }

    return new Response(JSON.stringify({ received: true }), { status: 200 });
  } catch (err) {
    console.error(err);
    return new Response(err.message, { status: 500 });
  }
});