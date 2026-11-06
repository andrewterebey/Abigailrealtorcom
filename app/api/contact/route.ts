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

  // Without a Resend key (local dev, preview deploys) the submission is only
  // logged. With one, it is emailed to CONTACT_TO_EMAIL through Resend's REST
  // API (no SDK — CLAUDE.md: ask before adding a dependency). The destination
  // address is a go-live handoff item (CLAUDE.md §11); until it is set the
  // route still answers ok so the forms never show visitors an error.
  const apiKey = process.env.RESEND_API_KEY
  const to = process.env.CONTACT_TO_EMAIL
  if (!apiKey || !to) {
    console.log('[api/contact] submission (email not configured):', parsed.data)
    return NextResponse.json({ ok: true, mode: 'log' })
  }

  const sent = await sendViaResend(apiKey, to, parsed.data)
  if (!sent) {
    return NextResponse.json(
      { error: 'Could not send your message right now. Please try again or call.' },
      { status: 502 },
    )
  }
  return NextResponse.json({ ok: true, mode: 'email' })
}

type Submission = z.infer<typeof contactSchema>

const INTENT_LABEL: Record<NonNullable<Submission['intent']>, string> = {
  contact: 'Contact request',
  valuation: 'Home valuation request',
  newsletter: 'Newsletter signup',
}

async function sendViaResend(
  apiKey: string,
  to: string,
  data: Submission,
): Promise<boolean> {
  const label = INTENT_LABEL[data.intent ?? 'contact']
  const from =
    process.env.CONTACT_FROM_EMAIL ??
    'Abigail Anderson Website <website@abigailrealtor.com>'
  const lines = [
    `${label} from abigailrealtor.com`,
    '',
    `Name:  ${data.name}`,
    `Email: ${data.email}`,
    data.phone ? `Phone: ${data.phone}` : null,
    '',
    data.message ?? '(no message)',
  ].filter((l): l is string => l !== null)

  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        authorization: `Bearer ${apiKey}`,
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        from,
        to: [to],
        reply_to: data.email,
        subject: `${label}: ${data.name}`,
        text: lines.join('\n'),
      }),
    })
    if (!res.ok) {
      console.error(
        '[api/contact] Resend rejected the email',
        res.status,
        await res.text(),
      )
      return false
    }
    return true
  } catch (err) {
    console.error('[api/contact] Resend request failed', err)
    return false
  }
}
