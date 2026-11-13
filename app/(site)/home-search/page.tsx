import { redirect } from 'next/navigation'

/**
 * The site nav (and the live Luxury Presence site) points people at
 * `/home-search/listings` rather than `/home-search`. Redirect the bare
 * route so `/home-search` doesn't 404.
 */
export default function HomeSearchIndexPage() {
  redirect('/home-search/listings')
}
