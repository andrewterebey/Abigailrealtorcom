import { NextResponse } from 'next/server'
import { z } from 'zod'

const contactSchema = z.object({
  name: z.string().min(1).max(200),
  email: z.string().email().max(200),
  phone: z.string().max(40).optional(),
  message: z.string().max(5000).optional(),
  intent: z.enum(['newsletter', 'contact', 'valuation']).optional(),
})

export async function POST(request: Request) {
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

  // In dev, log to console. In prod, replace with Resend once RESEND_API_KEY is
  // configured and the contact destination is confirmed with Abigail
  // (tracked in TODO.md §Open questions).
  if (!process.env.RESEND_API_KEY) {
    console.log('[api/contact] dev submission:', parsed.data)
    return NextResponse.json({ ok: true, mode: 'dev-log' })
  }

  return NextResponse.json(
    { error: 'Resend integration not yet wired' },
    { status: 501 },
  )
}
