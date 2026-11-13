'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ArrowLeft, ChevronDown, ExternalLink } from 'lucide-react'
import { parseBlocks } from '@/lib/blog-markdown'
import { slugify, type BlogDraft } from '@/lib/blog-draft'
import { PostBlock } from '@/components/blog/post-block'

/**
 * Blog post editor — Luxury Presence's Edit Post layout (top action bar,
 * Post Details / SEO side tabs, field column, image panel), working as a
 * front end. FRONT END ONLY for now: "Save draft" keeps the draft in this
 * browser's localStorage so work survives a reload; "Publish" is disabled
 * until the Supabase phase writes posts to the database and revalidates the
 * public pages (spec 2026-11-05 §4). Nothing here talks to a server.
 */

const LIST_HREF = '/admin/content/blog-posts'
const META_DESCRIPTION_MAX = 160

const fieldClass =
  'mt-1.5 w-full rounded-lg bg-[#f2f2f3] px-3 py-2.5 text-[13px] outline-none focus:ring-2 focus:ring-gray-300'
const labelClass = 'mt-4 block text-[13px] font-medium'

function storageKey(mode: 'new' | 'edit', slug: string) {
  return `admin:blog-draft:${mode === 'new' ? 'new' : slug}`
}

function readStoredDraft(key: string): BlogDraft | null {
  try {
    const raw = window.localStorage.getItem(key)
    return raw ? (JSON.parse(raw) as BlogDraft) : null
  } catch {
    return null
  }
}

function writeStoredDraft(key: string, draft: BlogDraft): boolean {
  try {
    window.localStorage.setItem(key, JSON.stringify(draft))
    return true
  } catch {
    return false
  }
}

function clearStoredDraft(key: string) {
  try {
    window.localStorage.removeItem(key)
  } catch {
    // ignore — nothing to clear, or storage unavailable
  }
}

export function BlogPostEditor({
  mode,
  initial,
}: {
  mode: 'new' | 'edit'
  initial: BlogDraft
}) {
  const router = useRouter()
  const key = storageKey(mode, initial.slug)

  const [draft, setDraft] = useState<BlogDraft>(initial)
  const [tab, setTab] = useState<'details' | 'seo'>('details')
  const [bodyView, setBodyView] = useState<'write' | 'preview'>('write')
  const [savedAt, setSavedAt] = useState<string | null>(null)
  const [saveFailed, setSaveFailed] = useState(false)
  const [restored, setRestored] = useState(false)
  const [confirmLeave, setConfirmLeave] = useState(false)
  const [pickedImage, setPickedImage] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Restore a browser-local draft after mount (never during render — the
  // server has no localStorage and the markup must match on hydration).
  useEffect(() => {
    const stored = readStoredDraft(key)
    if (stored) {
      setDraft(stored)
      setRestored(true)
    }
  }, [key])

  // Release the object URL of a picked image when it is replaced or on unmount.
  useEffect(() => {
    return () => {
      if (pickedImage) URL.revokeObjectURL(pickedImage)
    }
  }, [pickedImage])

  const dirty = useMemo(
    () => JSON.stringify(draft) !== JSON.stringify(initial),
    [draft, initial],
  )
  const slug = mode === 'new' ? slugify(draft.title) : draft.slug
  const blocks = useMemo(() => parseBlocks(draft.body), [draft.body])
  const wordCount = useMemo(
    () => draft.body.trim().split(/\s+/).filter(Boolean).length,
    [draft.body],
  )

  const update = <K extends keyof BlogDraft>(field: K, value: BlogDraft[K]) =>
    setDraft((d) => ({ ...d, [field]: value }))

  const saveDraft = () => {
    const ok = writeStoredDraft(key, { ...draft, slug })
    setSaveFailed(!ok)
    setSavedAt(
      ok
        ? new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
        : null,
    )
  }

  const discardRestored = () => {
    clearStoredDraft(key)
    setDraft(initial)
    setRestored(false)
    setSavedAt(null)
  }

  const cancel = () => {
    if (dirty && !confirmLeave) {
      setConfirmLeave(true)
      return
    }
    router.push(LIST_HREF)
  }

  const pickImage = (file: File | undefined) => {
    if (!file) return
    const url = URL.createObjectURL(file)
    setPickedImage(url)
  }

  const shownImage = pickedImage ?? draft.image

  return (
    <div className="flex min-h-full flex-col">
      {/* Top action bar */}
      <div className="flex items-center justify-between border-b border-gray-200 px-5 py-3">
        <div className="flex items-center gap-4">
          <Link
            href={LIST_HREF}
            aria-label="Back to blog posts"
            className="text-gray-600 hover:text-gray-900"
          >
            <ArrowLeft className="h-5 w-5" aria-hidden />
          </Link>
          <span className="text-[15px] font-semibold">
            {mode === 'new' ? 'New Post' : 'Edit Post'}
          </span>
        </div>
        <div className="flex items-center gap-3 text-[13px]">
          {mode === 'edit' && (
            <Link
              href={`/blog/${draft.slug}`}
              target="_blank"
              className="flex items-center gap-1.5 font-medium text-gray-700 hover:text-gray-900"
            >
              <ExternalLink className="h-3.5 w-3.5" aria-hidden /> View on site
            </Link>
          )}
          <span className="flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-1.5 font-medium">
            <span
              className={`h-2 w-2 rounded-full ${mode === 'new' ? 'bg-gray-400' : 'bg-emerald-500'}`}
              aria-hidden
            />
            {mode === 'new' ? 'Draft' : 'Published'}
            <ChevronDown className="h-3.5 w-3.5" aria-hidden />
          </span>
          <button
            type="button"
            onClick={cancel}
            className="rounded-lg border border-gray-300 px-4 py-1.5 font-medium hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={saveDraft}
            className="rounded-lg border border-gray-900 px-4 py-1.5 font-medium hover:bg-gray-50"
          >
            Save draft
          </button>
          <button
            type="button"
            disabled
            title="Publishing lands with the Supabase phase"
            className="cursor-not-allowed rounded-lg bg-black px-4 py-1.5 font-medium text-white opacity-60"
          >
            Publish
          </button>
        </div>
      </div>

      {/* Notices */}
      {confirmLeave && (
        <div
          role="alert"
          className="flex items-center justify-between gap-4 border-b border-amber-200 bg-amber-50 px-5 py-2.5 text-[13px] text-amber-900"
        >
          <span>You have unsaved changes. Leave without saving them?</span>
          <span className="flex gap-2">
            <button
              type="button"
              onClick={() => setConfirmLeave(false)}
              className="rounded-lg border border-amber-300 px-3 py-1 font-medium"
            >
              Stay
            </button>
            <button
              type="button"
              onClick={() => router.push(LIST_HREF)}
              className="rounded-lg bg-amber-900 px-3 py-1 font-medium text-white"
            >
              Leave
            </button>
          </span>
        </div>
      )}
      {restored && (
        <div
          role="status"
          className="flex items-center justify-between gap-4 border-b border-blue-100 bg-blue-50 px-5 py-2.5 text-[13px] text-blue-900"
        >
          <span>Restored an unsaved draft from this browser.</span>
          <button
            type="button"
            onClick={discardRestored}
            className="rounded-lg border border-blue-200 px-3 py-1 font-medium"
          >
            Discard draft
          </button>
        </div>
      )}
      {(savedAt || saveFailed) && (
        <p
          role="status"
          className={`border-b px-5 py-2 text-xs ${
            saveFailed
              ? 'border-red-100 bg-red-50 text-red-700'
              : 'border-gray-100 bg-[#fafafa] text-gray-500'
          }`}
        >
          {saveFailed
            ? 'Could not save in this browser (storage unavailable). Copy your text before leaving.'
            : `Draft saved ${savedAt} — stored in this browser only; publishing to the site lands with the Supabase phase.`}
        </p>
      )}

      <div className="flex grow">
        {/* Side tabs */}
        <nav className="w-44 shrink-0 border-r border-gray-100 px-3 py-5 text-[13px]" aria-label="Post sections">
          {(
            [
              ['details', 'Post Details'],
              ['seo', 'SEO'],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              onClick={() => setTab(id)}
              aria-current={tab === id ? 'page' : undefined}
              className={`block w-full rounded-lg px-3 py-2 text-left ${
                tab === id ? 'bg-[#f2f2f3] font-medium' : 'text-gray-600 hover:bg-[#f7f7f8]'
              }`}
            >
              {label}
            </button>
          ))}
        </nav>

        <div className="grid grow gap-10 px-8 py-6 lg:grid-cols-[minmax(0,1fr)_360px]">
          {tab === 'details' ? (
            <div>
              <h2 className="text-[15px] font-semibold">Post Details</h2>

              <label className={labelClass}>
                Title*
                <input
                  type="text"
                  value={draft.title}
                  onChange={(e) => update('title', e.target.value)}
                  className={fieldClass}
                />
              </label>
              <p className="mt-1.5 text-xs text-gray-400">
                /blog/{slug || <span className="italic">…</span>}
              </p>

              <label className={labelClass}>
                Subtitle
                <input
                  type="text"
                  value={draft.subtitle}
                  onChange={(e) => update('subtitle', e.target.value)}
                  className={fieldClass}
                />
              </label>

              <div className="grid gap-4 sm:grid-cols-2">
                <label className={labelClass}>
                  Publishing Date
                  <input
                    type="date"
                    value={draft.date}
                    onChange={(e) => update('date', e.target.value)}
                    className={fieldClass}
                  />
                </label>
                <label className={labelClass}>
                  Author
                  <input
                    type="text"
                    value={draft.author}
                    onChange={(e) => update('author', e.target.value)}
                    className={fieldClass}
                  />
                </label>
              </div>

              <label className="mt-5 flex items-center gap-2 text-[13px] font-medium">
                <input
                  type="checkbox"
                  checked={draft.featured}
                  onChange={(e) => update('featured', e.target.checked)}
                />{' '}
                Featured
              </label>

              <div className="mt-8 flex items-end justify-between">
                <span className="text-[13px] font-medium">
                  Post Body*{' '}
                  <span className="font-normal text-gray-400">(markdown)</span>
                </span>
                <div className="flex rounded-lg bg-[#f2f2f3] p-0.5 text-[12px]">
                  {(['write', 'preview'] as const).map((v) => (
                    <button
                      key={v}
                      type="button"
                      onClick={() => setBodyView(v)}
                      aria-pressed={bodyView === v}
                      className={`rounded-md px-3 py-1 capitalize ${
                        bodyView === v ? 'bg-white font-medium shadow-sm' : 'text-gray-500'
                      }`}
                    >
                      {v}
                    </button>
                  ))}
                </div>
              </div>

              {bodyView === 'write' ? (
                <textarea
                  value={draft.body}
                  onChange={(e) => update('body', e.target.value)}
                  rows={24}
                  aria-label="Post body"
                  placeholder={'## A heading\n\nA paragraph of text.\n\n- A bullet'}
                  className="mt-1.5 w-full rounded-lg border border-gray-200 px-3 py-2.5 font-mono text-xs leading-5 outline-none focus:ring-2 focus:ring-gray-300"
                />
              ) : (
                <div className="blog-preview mt-1.5 min-h-[30rem] rounded-lg border border-gray-200 px-6 pb-8 pt-2">
                  {blocks.length === 0 ? (
                    <p className="mt-6 text-[13px] text-gray-400">Nothing to preview yet.</p>
                  ) : (
                    blocks.map((block, i) => <PostBlock key={i} block={block} />)
                  )}
                </div>
              )}
              <p className="mt-1.5 text-xs text-gray-400">
                {wordCount.toLocaleString('en-US')} words · headings with ##, sub-headings with ###, bullets with “- ”
              </p>
            </div>
          ) : (
            <div>
              <h2 className="text-[15px] font-semibold">SEO</h2>
              <label className={labelClass}>
                Meta title
                <input
                  type="text"
                  value={draft.metaTitle}
                  onChange={(e) => update('metaTitle', e.target.value)}
                  placeholder={draft.title || 'Defaults to the post title'}
                  className={fieldClass}
                />
              </label>
              <label className={labelClass}>
                Meta description
                <textarea
                  value={draft.metaDescription}
                  onChange={(e) => update('metaDescription', e.target.value)}
                  rows={3}
                  className={fieldClass}
                />
              </label>
              <p
                className={`mt-1.5 text-xs ${
                  draft.metaDescription.length > META_DESCRIPTION_MAX ? 'text-red-600' : 'text-gray-400'
                }`}
              >
                {draft.metaDescription.length}/{META_DESCRIPTION_MAX} characters
              </p>
            </div>
          )}

          {/* Image panel */}
          <div>
            <div className="flex items-center justify-between">
              <h2 className="text-[13px] font-semibold">Images</h2>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="text-[13px] font-medium text-gray-700 hover:text-gray-900"
              >
                {shownImage ? 'Replace image' : 'Choose image'}
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                aria-label="Choose hero image"
                onChange={(e) => pickImage(e.target.files?.[0])}
              />
            </div>
            <div className="relative mt-3 aspect-[360/220] overflow-hidden rounded-lg border border-gray-200 bg-[#fafafa]">
              {shownImage ? (
                <Image
                  src={shownImage}
                  alt=""
                  fill
                  unoptimized={shownImage.startsWith('blob:')}
                  className="object-cover"
                />
              ) : (
                <span className="absolute inset-0 flex items-center justify-center text-[13px] text-gray-400">
                  No image yet
                </span>
              )}
            </div>
            <p className="mt-2 text-xs text-gray-400">
              {pickedImage
                ? 'Shown for preview only — image upload lands with the Supabase phase, so it is not kept in the draft.'
                : 'Hero image shown on the blog grid and at the top of the post.'}
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
