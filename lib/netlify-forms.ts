/**
 * Browser-side delivery of form submissions to Netlify Forms.
 *
 * Netlify records a submission when the BROWSER posts a URL-encoded body with
 * a `form-name` to any path on the site; its edge intercepts the request
 * before it reaches Next. The forms themselves are declared statically in
 * public/__forms.html (one per intent) because Netlify can only detect forms
 * in built HTML, not in function-rendered pages. Posting from the server
 * does not work: a Next.js route handler runs in a Netlify Function, which
 * sees neither the NETLIFY flag nor the visitor's IP, so the first version
 * of this (forwarding from /api/contact) silently logged instead.
 *
 * Call order in the forms: POST /api/contact first (validation + per-IP rate
 * limit), then this. Off a Netlify production deploy (local `next dev`) the
 * post is skipped so the forms still complete; `next start` on another host
 * would get a 405 from the static file and show the form's error state,
 * which is the honest outcome — there is nowhere for the submission to go.
 */

export type NetlifyFormName = 'contact' | 'valuation' | 'newsletter'

export type NetlifyFormFields = {
  name: string
  email: string
  phone?: string
  message?: string
}

const FORMS_PATH = '/__forms.html'

export async function submitToNetlifyForms(
  form: NetlifyFormName,
  fields: NetlifyFormFields,
): Promise<boolean> {
  if (process.env.NODE_ENV !== 'production') return true

  const body = new URLSearchParams({
    'form-name': form,
    'bot-field': '', // honeypot declared in public/__forms.html; humans leave it empty
    name: fields.name,
    email: fields.email,
    phone: fields.phone ?? '',
    message: fields.message ?? '',
  })
  try {
    const res = await fetch(FORMS_PATH, {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body: body.toString(),
    })
    return res.ok
  } catch {
    return false
  }
}
