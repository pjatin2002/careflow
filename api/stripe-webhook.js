import Stripe from 'stripe'
import { createClient } from '@supabase/supabase-js'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY)

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

export const config = { api: { bodyParser: false } }

async function getRawBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = []
    req.on('data', chunk => chunks.push(chunk))
    req.on('end', () => resolve(Buffer.concat(chunks)))
    req.on('error', reject)
  })
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const rawBody = await getRawBody(req)
  const sig = req.headers['stripe-signature']
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET

  let event
  try {
    event = stripe.webhooks.constructEvent(rawBody, sig, webhookSecret)
  } catch (err) {
    console.error('Webhook signature error:', err.message)
    return res.status(400).json({ error: `Webhook error: ${err.message}` })
  }

  const facilityId = event.data.object?.metadata?.facility_id ||
                     event.data.object?.client_reference_id

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object
        if (session.mode === 'subscription') {
          const subscription = await stripe.subscriptions.retrieve(session.subscription)
          const priceId = subscription.items.data[0]?.price?.id
          const plan = getPlanFromPriceId(priceId)
          if (facilityId) {
            await supabase.from('facilities').update({
              stripe_customer_id: session.customer,
              stripe_subscription_id: session.subscription,
              subscription_status: 'active',
              subscription_plan: plan,
              trial_ends_at: subscription.trial_end
                ? new Date(subscription.trial_end * 1000).toISOString()
                : null,
            }).eq('id', facilityId)
            console.log(`Subscription activated for facility ${facilityId} on ${plan} plan`)
          }
        }
        break
      }

      case 'customer.subscription.updated': {
        const subscription = event.data.object
        const fid = subscription.metadata?.facility_id
        if (fid) {
          const priceId = subscription.items.data[0]?.price?.id
          const plan = getPlanFromPriceId(priceId)
          await supabase.from('facilities').update({
            subscription_status: subscription.status,
            subscription_plan: plan,
          }).eq('id', fid)
        }
        break
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object
        const fid = subscription.metadata?.facility_id
        if (fid) {
          await supabase.from('facilities').update({
            subscription_status: 'cancelled',
            subscription_plan: null,
          }).eq('id', fid)
          console.log(`Subscription cancelled for facility ${fid}`)
        }
        break
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object
        const sub = await stripe.subscriptions.retrieve(invoice.subscription)
        const fid = sub.metadata?.facility_id
        if (fid) {
          await supabase.from('facilities').update({
            subscription_status: 'past_due',
          }).eq('id', fid)
        }
        break
      }

      default:
        console.log(`Unhandled event type: ${event.type}`)
    }

    return res.status(200).json({ received: true })
  } catch (error) {
    console.error('Webhook handler error:', error)
    return res.status(500).json({ error: error.message })
  }
}

function getPlanFromPriceId(priceId) {
  const map = {
    [process.env.VITE_STRIPE_STARTER_PRICE_ID]: 'starter',
    [process.env.VITE_STRIPE_PRO_PRICE_ID]: 'professional',
    [process.env.VITE_STRIPE_GROWTH_PRICE_ID]: 'growth',
  }
  return map[priceId] || 'unknown'
}
