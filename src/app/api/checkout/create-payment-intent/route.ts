import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const { amount, currency = 'usd' } = await request.json();

    const stripeKey = process.env.STRIPE_SECRET_KEY;
    if (!stripeKey) {
      // Stripe is in test/demo mode
      return NextResponse.json({
        mock: true,
        message: 'Stripe keys not configured in .env.local. Running in built-in secure test mode.',
      });
    }

    // Dynamic import to prevent crash if stripe package isn't installed
    // @ts-expect-error stripe is an optional dependency
    const Stripe = (await import('stripe')).default;
    const stripe = new Stripe(stripeKey, { apiVersion: '2025-01-27.acacia' as any });

    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(amount * 100), // convert to cents
      currency,
      automatic_payment_methods: { enabled: true },
    });

    return NextResponse.json({
      clientSecret: paymentIntent.client_secret,
      mock: false,
    });
  } catch (error: any) {
    console.error('Error creating PaymentIntent:', error);
    return NextResponse.json(
      { error: error.message || 'Payment intent creation failed' },
      { status: 500 }
    );
  }
}
