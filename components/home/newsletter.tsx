'use client'

import Link from 'next/link'
import { useState } from 'react'
import { Container } from '@/components/site/container'

type NewsletterProps = {
  /** Band heading — defaults to the home page copy. */
  title?: string
  /** Paragraph — defaults to the home page copy. */
  description?: string
}

export function Newsletter({
  title = 'Real Estate, Real Talk',
  description = "Join Abigail Anderson\u2019s newsletter to receive curated updates on King County real estate, exclusive listings, design inspiration, and expert tips for buyers, sellers, and investors.",
}: NewsletterProps = {}) {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [consent, setConsent] = useState(false)
  const [status, setStatus] = useState<'idle' | 'submitting' | 'ok' | 'error'>('idle')

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!consent) return
    setStatus('submitting')
    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ name, email, intent: 'newsletter' }),
      })
      setStatus(res.ok ? 'ok' : 'error')
      if (res.ok) {
        setName('')
        setEmail('')
        setConsent(false)
      }
    } catch {
      setStatus('error')
    }
  }

  return (
    <section
      aria-label="Newsletter signup"
      className="bg-black text-white"
    >
      <Container className="py-16 md:py-20 lg:py-24">
        <div className="mx-auto max-w-3xl text-center">
          <h2 className="text-[32px] leading-[1.2] md:text-[40px] lg:text-[43px]">
            {title}
          </h2>
          <p className="mx-auto mt-6 max-w-xl font-body text-[15px] leading-[1.7] text-white/80">
            {description}
          </p>

          <form
            onSubmit={onSubmit}
            className="mt-10 grid gap-4 sm:grid-cols-[1fr_1fr_auto]"
            noValidate
          >
            <label className="sr-only" htmlFor="nl-name">
              Name
            </label>
            <input
              id="nl-name"
              type="text"
              required
              placeholder="Name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="border border-white/70 bg-transparent px-4 py-3 font-body text-[14px] text-white placeholder:text-white/60 focus:border-site-gold focus:outline-none"
            />
            <label className="sr-only" htmlFor="nl-email">
              Email
            </label>
            <input
              id="nl-email"
              type="email"
              required
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="border border-white/70 bg-transparent px-4 py-3 font-body text-[14px] text-white placeholder:text-white/60 focus:border-site-gold focus:outline-none"
            />
            <button
              type="submit"
              disabled={!consent || status === 'submitting'}
              className="bg-site-gold px-8 py-3 font-body text-[14px] font-bold uppercase tracking-[0.14em] text-white transition-colors hover:bg-site-gold-dim disabled:cursor-not-allowed disabled:opacity-50"
            >
              {status === 'submitting' ? 'Sending…' : 'Submit'}
            </button>
          </form>

          <label className="mt-6 flex items-start gap-3 text-left font-body text-[11px] leading-[1.6] text-white/60">
            <input
              type="checkbox"
              checked={consent}
              onChange={(e) => setConsent(e.target.checked)}
              className="mt-0.5 size-4 shrink-0 accent-site-gold"
            />
            <span>
              I agree to be contacted by Abigail Anderson via call, email, and
              text for real estate services. To opt out, you can reply
              &lsquo;stop&rsquo; at any time or reply &lsquo;help&rsquo; for
              assistance. You can also click the unsubscribe link in the
              emails. Message and data rates may apply. Message frequency may
              vary.{' '}
              <Link
                href="/terms-and-conditions"
                className="text-white underline-offset-4 hover:underline"
              >
                Privacy Policy
              </Link>
              .
            </span>
          </label>

          {status === 'ok' && (
            <p className="mt-4 font-body text-[13px] text-site-gold">
              Thanks — you&rsquo;re on the list.
            </p>
          )}
          {status === 'error' && (
            <p className="mt-4 font-body text-[13px] text-red-400">
              Something went wrong. Please try again or email directly.
            </p>
          )}
        </div>
      </Container>
    </section>
  )
}
