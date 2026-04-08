import Stripe from 'stripe'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY)

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { priceId, facilityId, userId, email, successUrl, cancelUrl } = req.body

  if (!priceId || !facilityId) {
    return res.status(400).json({ error: 'Missing required fields' })
  }

  try {
    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [{ price: priceId, quantity: 1 }],
      customer_email: email || undefined,
      client_reference_id: facilityId,
      metadata: {
        facility_id: facilityId,
        user_id: userId || '',
      },
      subscription_data: {
        metadata: {
          facility_id: facilityId,
          user_id: userId || '',
        },
        trial_period_days: 14,
      },
      success_url: successUrl || `${req.headers.origin}/?checkout=success`,
      cancel_url: cancelUrl || `${req.headers.origin}/?checkout=cancel`,
      allow_promotion_codes: true,
    })

    return res.status(200).json({ url: session.url, sessionId: session.id })
  } catch (error) {
    console.error('Stripe checkout error:', error)
    return res.status(500).json({ error: error.message })
  }
}
