'use client'

import { useState } from 'react'

type Variant = 'property-inquiry' | 'contact' | 'valuation'

type InquiryFormProps = {
  variant?: Variant
  /** Topic tag sent to /api/contact (e.g. 'buyers', 'sellers', 'valuation'). */
  topic?: string
  /** Optional override for the submit button label. */
  submitLabel?: string
}

/**
 * Shared form used on /buyers, /sellers, /options (property-inquiry),
 * /contact (contact), and /home-valuation (valuation). Posts to
 * /api/contact — CLAUDE.md §7 forbids inventing new endpoints. In dev the
 * API handler logs to console; in prod it will route through Resend.
 */
export function InquiryForm({
  variant = 'contact',
  topic,
  submitLabel = 'Submit',
}: InquiryFormProps) {
  const [status, setStatus] = useState<'idle' | 'submitting' | 'ok' | 'error'>('idle')
  const [error, setError] = useState<string | null>(null)

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const form = e.currentTarget
    const fd = new FormData(form)

    const payload: Record<string, string> = {
      name: String(fd.get('name') ?? ''),
      email: String(fd.get('email') ?? ''),
    }
    const phone = fd.get('phone')
    if (phone) payload.phone = String(phone)
    const message = fd.get('message')
    if (message) payload.message = String(message)

    // Extra fields like address / propertyLocation / inquiryType are collapsed
    // into the message body so the /api/contact schema stays stable.
    const extras: string[] = []
    const address = fd.get('address')
    if (address) extras.push(`Address: ${address}`)
    const propertyLocation = fd.get('propertyLocation')
    if (propertyLocation) extras.push(`Property Location: ${propertyLocation}`)
    const inquiryType = fd.get('inquiryType')
    if (inquiryType) extras.push(`Inquiry Type: ${inquiryType}`)
    if (topic) extras.push(`Topic: ${topic}`)
    if (extras.length) {
      payload.message = [payload.message, extras.join('\n')]
        .filter(Boolean)
        .join('\n\n')
    }

    // Map variant → backend `intent` enum (schemas.ts: newsletter|contact|valuation).
    const intent =
      variant === 'valuation'
        ? 'valuation'
        : 'contact'
    ;(payload as Record<string, string>).intent = intent

    setStatus('submitting')
    setError(null)
    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(payload),
      })
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string }
        throw new Error(body.error ?? `Submission failed (${res.status})`)
      }
      setStatus('ok')
      form.reset()
    } catch (err) {
      setStatus('error')
      setError(err instanceof Error ? err.message : 'Unknown error')
    }
  }

  const inputClass =
    'w-full border-b border-black/20 bg-transparent py-3 font-body text-[14px] text-site-text placeholder:text-site-text-muted focus:border-site-gold focus:outline-none'

  const labelClass =
    'font-body text-[11px] font-bold uppercase tracking-[0.14em] text-site-text-muted'

  return (
    <form onSubmit={onSubmit} className="mx-auto w-full max-w-3xl">
      <div className="grid gap-x-10 gap-y-6 md:grid-cols-2">
        <div className="flex flex-col gap-2">
          <label htmlFor="inquiry-name" className={labelClass}>
            Full Name *
          </label>
          <input
            id="inquiry-name"
            name="name"
            type="text"
            required
            autoComplete="name"
            className={inputClass}
          />
        </div>

        <div className="flex flex-col gap-2">
          <label htmlFor="inquiry-phone" className={labelClass}>
            {variant === 'contact' ? 'Phone' : 'Phone *'}
          </label>
          <input
            id="inquiry-phone"
            name="phone"
            type="tel"
            autoComplete="tel"
            required={variant !== 'contact'}
            className={inputClass}
          />
        </div>

        <div className="flex flex-col gap-2">
          <label htmlFor="inquiry-email" className={labelClass}>
            Email *
          </label>
          <input
            id="inquiry-email"
            name="email"
            type="email"
            required
            autoComplete="email"
            className={inputClass}
          />
        </div>

        {variant === 'property-inquiry' ? (
          <>
            <div className="flex flex-col gap-2">
              <label htmlFor="inquiry-property-location" className={labelClass}>
                Property Location *
              </label>
              <input
                id="inquiry-property-location"
                name="propertyLocation"
                type="text"
                required
                className={inputClass}
              />
            </div>

            <div className="flex flex-col gap-2">
              <label htmlFor="inquiry-type" className={labelClass}>
                Inquiry Type
              </label>
              <select
                id="inquiry-type"
                name="inquiryType"
                defaultValue=""
                className={`${inputClass} appearance-none`}
              >
                <option value="" disabled>
                  Select one
                </option>
                <option>Buying</option>
                <option>Selling</option>
                <option>Investment</option>
                <option>General question</option>
              </select>
            </div>
          </>
        ) : null}

        {variant === 'valuation' ? (
          <div className="flex flex-col gap-2 md:col-span-2">
            <label htmlFor="inquiry-address" className={labelClass}>
              Property Address *
            </label>
            <input
              id="inquiry-address"
              name="address"
              type="text"
              required
              autoComplete="street-address"
              className={inputClass}
            />
          </div>
        ) : null}

        <div
          className={`flex flex-col gap-2 ${
            variant === 'property-inquiry'
              ? 'md:col-span-2'
              : variant === 'valuation'
                ? 'md:col-span-2'
                : 'md:col-span-2'
          }`}
        >
          <label htmlFor="inquiry-message" className={labelClass}>
            {variant === 'contact' ? 'Message *' : 'Message *'}
          </label>
          <textarea
            id="inquiry-message"
            name="message"
            rows={5}
            required
            className={`${inputClass} resize-y border border-black/20 p-3`}
          />
        </div>
      </div>

      <p className="mt-6 font-body text-[11px] leading-relaxed text-site-text-muted">
        I agree to be contacted by Abigail Anderson via call, email, and text
        for real estate services. To opt out, you can reply &apos;stop&apos; at
        any time or reply &apos;help&apos; for assistance. You can also click
        the unsubscribe link in the emails. Message and data rates may apply.
        Message frequency may vary. Privacy Policy.
      </p>

      <div className="mt-8 flex flex-col items-center gap-3">
        <button
          type="submit"
          disabled={status === 'submitting'}
          className="inline-flex items-center justify-center bg-site-gold px-[46px] py-[20px] font-body text-[14px] font-bold uppercase tracking-[0.107em] text-white transition-colors hover:bg-site-gold-dim disabled:opacity-60"
        >
          {status === 'submitting' ? 'Sending…' : submitLabel}
        </button>
        {status === 'ok' ? (
          <p role="status" className="font-body text-[13px] text-green-700">
            Thanks — your message has been received.
          </p>
        ) : null}
        {status === 'error' ? (
          <p role="alert" className="font-body text-[13px] text-red-600">
            {error ?? 'Something went wrong. Please try again.'}
          </p>
        ) : null}
      </div>
    </form>
  )
}
