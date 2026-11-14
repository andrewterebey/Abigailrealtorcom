import { NextResponse } from 'next/server'
import { z } from 'zod'
import { checkRateLimit } from '@/lib/rate-limit'

const contactSchema = z.object({
  name: z.string().min(1).max(200),
  email: z.string().email().max(200),
  phone: z.string().max(40).optional(),
  message: z.string().max(5000).optional(),
  intent: z.enum(['newsletter', 'contact', 'valuation']).optional(),
})

type Submission = z.infer<typeof contactSchema>

// Message max is 5000 chars; 16 KB is plenty of headroom for the full JSON
// envelope while still keeping a giant payload from ever reaching Zod.
const MAX_BODY_BYTES = 16 * 1024

export async function POST(request: Request) {
  const ip =
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown'

  const rate = checkRateLimit(ip)
  if (!rate.ok) {
    return NextResponse.json(
      { error: 'Too many requests. Please try again later.' },
      {
        status: 429,
        headers: { 'Retry-After': String(rate.retryAfter ?? 60) },
      },
    )
  }

  // Cap body size before we even attempt to parse JSON. Anything larger than
  // MAX_BODY_BYTES is either malicious or broken; either way we don't want it
  // in memory.
  const contentLength = Number(request.headers.get('content-length') ?? '0')
  if (Number.isFinite(contentLength) && contentLength > MAX_BODY_BYTES) {
    return NextResponse.json({ error: 'Payload too large' }, { status: 413 })
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const parsed = contactSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Invalid submission', issues: parsed.error.issues },
      { status: 400 },
    )
  }

  // Delivery is Netlify Forms: the submission lands in the site's Forms inbox
  // in the Netlify dashboard, which emails Abigail from there (Forms → Form
  // notifications). Netlify cannot see function-rendered markup, so the forms
  // are declared statically in public/__forms.html and this route forwards
  // each validated submission to that file with `form-name` = intent.
  // Outside Netlify (local dev) the submission is only logged, and the route
  // still answers ok so the forms never show visitors an error.
  const formsUrl = netlifyFormsUrl()
  if (!formsUrl) {
    console.log('[api/contact] submission (not on Netlify, logged only):', parsed.data)
    return NextResponse.json({ ok: true, mode: 'log' })
  }

  const sent = await sendViaNetlifyForms(formsUrl, parsed.data)
  if (!sent) {
    return NextResponse.json(
      { error: 'Could not send your message right now. Please try again or call.' },
      { status: 502 },
    )
  }
  return NextResponse.json({ ok: true, mode: 'netlify' })
}

/**
 * Where to POST Netlify Forms submissions: the static registration file on
 * this very deploy. Netlify sets NETLIFY=true and DEPLOY_PRIME_URL / URL in
 * its build and function environments; anywhere else this is null and the
 * forwarding is skipped.
 */
function netlifyFormsUrl(): string | null {
  if (process.env.NETLIFY !== 'true') return null
  const base = process.env.DEPLOY_PRIME_URL || process.env.URL
  return base ? `${base.replace(/\/$/, '')}/__forms.html` : null
}

async function sendViaNetlifyForms(url: string, data: Submission): Promise<boolean> {
  const body = new URLSearchParams({
    'form-name': data.intent ?? 'contact',
    name: data.name,
    email: data.email,
    phone: data.phone ?? '',
    message: data.message ?? '',
  })
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body: body.toString(),
    })
    if (!res.ok) {
      console.error('[api/contact] Netlify Forms rejected the submission', res.status)
      return false
    }
    return true
  } catch (err) {
    console.error('[api/contact] Netlify Forms request failed', err)
    return false
  }
}
