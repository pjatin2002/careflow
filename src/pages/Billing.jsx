import { useState } from 'react'
import { useAuth } from '../hooks/useAuth.jsx'

const PLANS = [
  {
    id: 'starter',
    name: 'Starter',
    price: 199,
    period: 'mo',
    desc: 'Group homes & small facilities',
    features: [
      'Up to 15 residents',
      'Up to 10 staff accounts',
      'Resident profiles & care plans',
      'Daily logs & vitals',
      'Incident reporting',
      'Shift handoff notes',
      'CSV report exports',
      'Email support',
    ],
    priceId: import.meta.env.VITE_STRIPE_STARTER_PRICE_ID || '',
    color: '#E1F5EE',
    textColor: '#085041',
  },
  {
    id: 'professional',
    name: 'Professional',
    price: 399,
    period: 'mo',
    desc: 'Small to mid-size nursing homes',
    popular: true,
    features: [
      'Up to 50 residents',
      'Unlimited staff accounts',
      'Everything in Starter',
      'Full eMAR — medication administration',
      'Family portal',
      'Controlled substance log',
      'State inspection PDF reports',
      'Priority support',
    ],
    priceId: import.meta.env.VITE_STRIPE_PRO_PRICE_ID || '',
    color: '#E6F1FB',
    textColor: '#0C447C',
  },
  {
    id: 'growth',
    name: 'Growth',
    price: 699,
    period: 'mo',
    desc: '50–100 beds, multi-location',
    features: [
      'Up to 100 residents',
      'Multi-location support',
      'Everything in Professional',
      'Billing module',
      'Medicaid export',
      'API access',
      'Dedicated onboarding call',
      'Phone + priority support',
    ],
    priceId: import.meta.env.VITE_STRIPE_GROWTH_PRICE_ID || '',
    color: '#EEEDFE',
    textColor: '#3C3489',
  },
]

export default function Billing() {
  const { profile } = useAuth()
  const [loading, setLoading] = useState(null)
  const [billingLoading, setBillingLoading] = useState(false)
  const [annual, setAnnual] = useState(false)

  const startCheckout = async (plan) => {
    if (!plan.priceId) {
      alert('Stripe is not configured yet. Add VITE_STRIPE_STARTER_PRICE_ID, VITE_STRIPE_PRO_PRICE_ID, and VITE_STRIPE_GROWTH_PRICE_ID to your .env file. See setup instructions below.')
      return
    }
    setLoading(plan.id)
    try {
      const res = await fetch('/api/create-checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          priceId: plan.priceId,
          facilityId: profile.facility_id,
          userId: profile.id,
          email: profile.email,
          successUrl: `${window.location.origin}?checkout=success`,
          cancelUrl: `${window.location.origin}?checkout=cancel`,
        }),
      })
      const { url } = await res.json()
      window.location.href = url
    } catch (e) {
      alert('Stripe API not connected yet. Follow the setup instructions below to activate billing.')
    }
    setLoading(null)
  }

  const openBillingPortal = async () => {
    setBillingLoading(true)
    try {
      const res = await fetch('/api/billing-portal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ facilityId: profile.facility_id }),
      })
      const { url } = await res.json()
      window.location.href = url
    } catch (e) {
      alert('Billing portal not available yet.')
    }
    setBillingLoading(false)
  }

  const price = (p) => annual ? Math.round(p * 0.8) : p

  return (
    <div>
      <div style={{ textAlign: 'center', marginBottom: '28px' }}>
        <div style={{ fontSize: '22px', fontWeight: '600', marginBottom: '6px' }}>Simple, transparent pricing</div>
        <div style={{ fontSize: '14px', color: 'var(--text2)', marginBottom: '16px' }}>No setup fees. No long-term contracts. Cancel anytime.</div>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '10px', background: 'var(--color-background-secondary)', padding: '6px 12px', borderRadius: '20px', fontSize: '13px' }}>
          <span style={{ color: !annual ? 'var(--text)' : 'var(--text2)', fontWeight: !annual ? '500' : '400' }}>Monthly</span>
          <div style={{ width: '36px', height: '20px', borderRadius: '10px', background: annual ? '#1D9E75' : '#e5e3dc', cursor: 'pointer', position: 'relative', transition: 'background .2s', flexShrink: 0 }} onClick={() => setAnnual(!annual)}>
            <div style={{ width: '16px', height: '16px', borderRadius: '50%', background: '#fff', position: 'absolute', top: '2px', left: annual ? '18px' : '2px', transition: 'left .2s' }} />
          </div>
          <span style={{ color: annual ? 'var(--text)' : 'var(--text2)', fontWeight: annual ? '500' : '400' }}>Annual <span style={{ background: '#E1F5EE', color: '#085041', padding: '1px 6px', borderRadius: '10px', fontSize: '11px', fontWeight: '500' }}>Save 20%</span></span>
        </div>
      </div>

      <div className="grid-3" style={{ marginBottom: '28px' }}>
        {PLANS.map(plan => (
          <div key={plan.id} className="card" style={{ position: 'relative', border: plan.popular ? '2px solid #1D9E75' : '.5px solid var(--border)' }}>
            {plan.popular && (
              <div style={{ position: 'absolute', top: '-12px', left: '50%', transform: 'translateX(-50%)', background: '#1D9E75', color: '#fff', fontSize: '11px', fontWeight: '600', padding: '3px 12px', borderRadius: '20px', whiteSpace: 'nowrap' }}>
                Most popular
              </div>
            )}
            <div style={{ marginBottom: '16px', paddingTop: plan.popular ? '8px' : '0' }}>
              <div style={{ fontWeight: '600', fontSize: '15px', marginBottom: '2px' }}>{plan.name}</div>
              <div style={{ fontSize: '12px', color: 'var(--text2)', marginBottom: '12px' }}>{plan.desc}</div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '2px' }}>
                <span style={{ fontSize: '28px', fontWeight: '700', color: 'var(--teal)' }}>${price(plan.price)}</span>
                <span style={{ fontSize: '13px', color: 'var(--text2)' }}>/mo{annual ? ' billed annually' : ''}</span>
              </div>
              {annual && <div style={{ fontSize: '11px', color: 'var(--text2)', marginTop: '2px' }}>Was ${plan.price}/mo — you save ${Math.round(plan.price * 0.2 * 12)}/yr</div>}
            </div>
            <button
              className="btn btn-primary"
              style={{ width: '100%', justifyContent: 'center', marginBottom: '16px', background: plan.popular ? 'var(--teal)' : 'transparent', color: plan.popular ? '#fff' : 'var(--teal)', border: '1px solid var(--teal)' }}
              onClick={() => startCheckout(plan)}
              disabled={loading === plan.id}
            >
              {loading === plan.id ? 'Redirecting...' : 'Start 14-day free trial'}
            </button>
            <div style={{ fontSize: '13px' }}>
              {plan.features.map(f => (
                <div key={f} style={{ display: 'flex', gap: '8px', alignItems: 'flex-start', padding: '5px 0', color: 'var(--text2)', borderBottom: '.5px solid var(--border)' }}>
                  <span style={{ color: '#1D9E75', fontWeight: '600', flexShrink: 0 }}>✓</span>
                  {f}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="panel" style={{ marginBottom: '14px' }}>
        <div className="panel-title">Current subscription</div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ fontSize: '14px', fontWeight: '500', marginBottom: '4px' }}>Free trial / No active subscription</div>
            <div style={{ fontSize: '13px', color: 'var(--text2)' }}>Select a plan above to activate billing. Your data is safe regardless of subscription status.</div>
          </div>
          <button className="btn btn-outline" onClick={openBillingPortal} disabled={billingLoading}>
            {billingLoading ? 'Loading...' : 'Manage billing'}
          </button>
        </div>
      </div>

      <div className="panel" style={{ background: 'var(--color-background-secondary)', border: 'none' }}>
        <div className="panel-title">Stripe setup instructions</div>
        <div style={{ fontSize: '13px', color: 'var(--text2)', lineHeight: '1.8' }}>
          <div style={{ marginBottom: '8px', fontWeight: '500', color: 'var(--text)' }}>To activate billing, complete these 5 steps:</div>
          <div><strong>1.</strong> Go to stripe.com → create account → get your API keys from Dashboard → Developers → API keys</div>
          <div><strong>2.</strong> Add to your <code style={{ background: 'var(--color-background-primary)', padding: '1px 5px', borderRadius: '4px', fontSize: '12px' }}>.env</code>: <code style={{ background: 'var(--color-background-primary)', padding: '1px 5px', borderRadius: '4px', fontSize: '12px' }}>VITE_STRIPE_PUBLIC_KEY=pk_live_...</code> and <code style={{ background: 'var(--color-background-primary)', padding: '1px 5px', borderRadius: '4px', fontSize: '12px' }}>STRIPE_SECRET_KEY=sk_live_...</code></div>
          <div><strong>3.</strong> In Stripe → Products → create 3 products (Starter $199, Pro $399, Growth $699) → copy each Price ID</div>
          <div><strong>4.</strong> Add to .env: <code style={{ background: 'var(--color-background-primary)', padding: '1px 5px', borderRadius: '4px', fontSize: '12px' }}>VITE_STRIPE_STARTER_PRICE_ID</code>, <code style={{ background: 'var(--color-background-primary)', padding: '1px 5px', borderRadius: '4px', fontSize: '12px' }}>VITE_STRIPE_PRO_PRICE_ID</code>, <code style={{ background: 'var(--color-background-primary)', padding: '1px 5px', borderRadius: '4px', fontSize: '12px' }}>VITE_STRIPE_GROWTH_PRICE_ID</code></div>
          <div><strong>5.</strong> Tell me when done — I will build the API routes for checkout and webhook handling</div>
        </div>
      </div>
    </div>
  )
}
