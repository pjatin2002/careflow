import Stripe from 'stripe'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY)

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { facilityId } = req.body

  if (!facilityId) {
    return res.status(400).json({ error: 'Missing facility ID' })
  }

  try {
    const customers = await stripe.customers.search({
      query: `metadata['facility_id']:'${facilityId}'`,
    })

    if (!customers.data.length) {
      return res.status(404).json({ error: 'No customer found for this facility' })
    }

    const session = await stripe.billingPortal.sessions.create({
      customer: customers.data[0].id,
      return_url: req.headers.origin || 'https://careflow.vercel.app',
    })

    return res.status(200).json({ url: session.url })
  } catch (error) {
    console.error('Billing portal error:', error)
    return res.status(500).json({ error: error.message })
  }
}
