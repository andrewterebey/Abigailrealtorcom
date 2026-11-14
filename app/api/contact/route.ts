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

  // This route is the validation and rate-limit gate only. Delivery is
  // Netlify Forms, posted by the BROWSER after this answers ok (see
  // lib/netlify-forms.ts for why it cannot be forwarded from here: a route
  // handler runs in a Netlify Function, which has neither the NETLIFY flag
  // nor the visitor's IP). The log line is the local-dev trace and a backup
  // in the Netlify function logs.
  console.log('[api/contact] accepted submission:', parsed.data)
  return NextResponse.json({ ok: true })
}
