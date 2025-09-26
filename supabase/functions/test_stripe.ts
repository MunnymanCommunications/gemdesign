import Stripe from "https://esm.sh/stripe@11.2.0?target=deno";

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') ?? '', {
  apiVersion: '2024-04-10',
});

async function createCheckoutSession() {
  const session = await stripe.checkout.sessions.create({
    line_items: [
      {
        price: 'price_123',
        quantity: 1,
      },
    ],
    mode: 'payment',
    success_url: 'https://example.com/success',
    cancel_url: 'https://example.com/cancel',
  });

  console.log(session.url);
}

createCheckoutSession();