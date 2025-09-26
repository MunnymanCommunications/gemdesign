import Stripe from "https://esm.sh/stripe@11.2.0?target=deno";

console.log('Function invoked');
console.log('Stripe imported');

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

export default async (req) => {
  console.log('Creating checkout session');
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const { priceId, userId } = body;

    if (!priceId || !userId) {
      console.error('Missing priceId or userId');
      return new Response(JSON.stringify({ error: 'Missing required fields: priceId, userId' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { data: price, error: priceError } = await supabase
      .from('stripe_schema4.prices')
      .select('*')
      .eq('id', priceId)
      .single();

    if (priceError) {
      console.error('Price query error:', priceError);
      return new Response(JSON.stringify({ error: 'Invalid price ID' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (!price) {
      console.error('Price not found');
      return new Response(JSON.stringify({ error: 'Invalid price ID' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('stripe_customer_id')
      .eq('id', userId)
      .single();

    if (profileError) {
      console.error('Profile query error:', profileError);
      return new Response(JSON.stringify({ error: 'Failed to fetch profile' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    let customerId = profile?.stripe_customer_id;

    if (!customerId) {
      const { data: user, error: userError } = await supabase.auth.admin.getUserById(userId);

      if (userError) {
        console.error('User query error:', userError);
        return new Response(JSON.stringify({ error: 'Failed to fetch user' }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const { data: customer, error: customerError } = await supabase
        .from('stripe_schema4.customers')
        .insert({
          email: user.user.email,
          metadata: {
            userId,
          },
        })
        .single();

      if (customerError) {
        console.error('Customer creation error:', customerError);
        return new Response(JSON.stringify({ error: 'Failed to create customer' }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      customerId = customer.id;

      const { error: updateError } = await supabase
        .from('profiles')
        .update({
          stripe_customer_id: customerId,
        })
        .eq('id', userId);

      if (updateError) {
        console.error('Profile update error:', updateError);
        return new Response(JSON.stringify({ error: 'Failed to update profile' }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    }

    const { data: session, error: sessionError } = await supabase
      .from('stripe_schema4.checkout_sessions')
      .insert({
        customer: customerId,
        line_items: [{
          price: priceId,
          quantity: 1,
        }],
        mode: 'subscription',
        success_url: `${Deno.env.get('SITE_URL') ?? 'http://localhost:3000'}/documents`,
        cancel_url: `${Deno.env.get('SITE_URL') ?? 'http://localhost:3000'}/subscription`,
      })
      .single();

    if (sessionError) {
      console.error('Session creation error:', sessionError);
      return new Response(JSON.stringify({ error: 'Failed to create checkout session' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ sessionId: session.id, url: session.url }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Full error in create-checkout-session:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
};
