import { promises as fs } from 'node:fs'
import path from 'node:path'

/** Minimal .env.local loader (no dependency). Ambient environment wins —
 *  values already set (e.g. by Netlify or GitHub Actions) are never clobbered. */
export async function loadDotEnvLocal(): Promise<void> {
  try {
    const raw = await fs.readFile(path.join(process.cwd(), '.env.local'), 'utf8')
    for (const line of raw.split('\n')) {
      const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/i)
      if (!m) continue
      const key = m[1]
      let val = m[2].trim()
      if (
        (val.startsWith('"') && val.endsWith('"')) ||
        (val.startsWith("'") && val.endsWith("'"))
      ) {
        val = val.slice(1, -1)
      }
      if (process.env[key] === undefined) process.env[key] = val
    }
  } catch {
    // no .env.local — rely on the ambient environment (e.g. Netlify)
  }
}
