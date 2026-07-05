/**
 * ShareBar — the share controls on the final Trophy Card.
 *
 * Three ways out, all pointing at the public story + the server-rendered OG
 * image (`/api/og/:username`, built by the Worker):
 *   - "Share your year ↗"  : X / Twitter intent URL with cheeky text + the story link
 *   - native "Share…"      : Web Share API; attaches the OG image file when the
 *                            platform supports canShare({files}), else shares the URL
 *   - "Save image"         : fetch the OG PNG and trigger a download
 * Plus "Replay ↺" to re-run the story from the top.
 *
 * No bare alert()/confirm() — feedback runs through the app's toast system.
 */

import { useEffect, useState } from 'react'
import { useToast } from '../ui'

const MONO = "'JetBrains Mono', monospace"

interface ShareBarProps {
  username: string
  year: number
  personalityName: string
  onReplay: () => void
}

export function ShareBar({ username, year, personalityName, onReplay }: ShareBarProps) {
  const { success, error, info } = useToast()
  const [canNativeShare, setCanNativeShare] = useState(false)

  useEffect(() => {
    setCanNativeShare(typeof navigator !== 'undefined' && typeof navigator.share === 'function')
  }, [])

  const storyUrl =
    typeof window !== 'undefined' ? `${window.location.origin}/${username}` : `/${username}`
  const ogUrl = `/api/og/${encodeURIComponent(username)}`
  const persona = personalityName.toLowerCase()
  const tweetText = `My GitHub Wrapped ${year}: turns out I'm ${persona}. What did your year in code look like?`

  function shareToX() {
    const intent = `https://twitter.com/intent/tweet?text=${encodeURIComponent(tweetText)}&url=${encodeURIComponent(storyUrl)}`
    window.open(intent, '_blank', 'noopener,noreferrer')
  }

  async function nativeShare() {
    try {
      // Prefer sharing the actual card image where the platform allows it.
      if (typeof navigator.canShare === 'function') {
        try {
          const res = await fetch(ogUrl)
          if (res.ok) {
            const blob = await res.blob()
            const ext = blob.type === 'image/png' ? 'png' : 'jpg'
            const file = new File([blob], `github-wrapped-${username}.${ext}`, { type: blob.type || 'image/png' })
            if (navigator.canShare({ files: [file] })) {
              await navigator.share({ files: [file], title: 'GitHub Wrapped', text: tweetText, url: storyUrl })
              return
            }
          }
        } catch {
          /* fall through to URL share */
        }
      }
      await navigator.share({ title: 'GitHub Wrapped', text: tweetText, url: storyUrl })
    } catch (e) {
      // AbortError = the user dismissed the sheet; not worth a toast.
      if ((e as DOMException)?.name !== 'AbortError') {
        try {
          await navigator.clipboard?.writeText(storyUrl)
          info('Link copied', 'Native sharing was not available, so we copied your link instead.')
        } catch {
          info('Sharing was not available', 'Use "Share your year" to post it instead.')
        }
      }
    }
  }

  async function saveImage() {
    try {
      const res = await fetch(ogUrl)
      if (!res.ok) throw new Error(String(res.status))
      const blob = await res.blob()
      const ext = blob.type === 'image/png' ? 'png' : 'jpg'
      const href = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = href
      a.download = `github-wrapped-${username}.${ext}`
      document.body.appendChild(a)
      a.click()
      a.remove()
      URL.revokeObjectURL(href)
      success('Saved your card', 'It is in your downloads. Flex away.')
    } catch {
      error('Card is not ready yet', 'Give it a second and try again.')
    }
  }

  const pillBase: React.CSSProperties = {
    fontFamily: MONO,
    fontSize: 14,
    fontWeight: 600,
    padding: '13px 24px',
    borderRadius: 999,
    cursor: 'pointer',
    border: 'none',
    whiteSpace: 'nowrap',
  }

  return (
    <div style={{ display: 'flex', gap: 12, marginTop: 22, flexWrap: 'wrap', justifyContent: 'center' }}>
      <button
        type="button"
        onClick={shareToX}
        style={{ ...pillBase, color: '#14052e', background: '#fff', boxShadow: '0 10px 30px rgba(0,0,0,.3)' }}
      >
        Share your year ↗
      </button>

      {canNativeShare && (
        <button
          type="button"
          onClick={nativeShare}
          style={{ ...pillBase, color: '#fff', background: 'rgba(255,255,255,.14)', border: '1px solid rgba(255,255,255,.3)' }}
        >
          Share…
        </button>
      )}

      <button
        type="button"
        onClick={saveImage}
        style={{ ...pillBase, color: '#fff', background: 'rgba(255,255,255,.14)', border: '1px solid rgba(255,255,255,.3)' }}
      >
        Save image
      </button>

      <button
        type="button"
        onClick={onReplay}
        style={{ ...pillBase, color: '#fff', background: 'rgba(255,255,255,.14)', border: '1px solid rgba(255,255,255,.3)' }}
      >
        Replay ↺
      </button>
    </div>
  )
}

export default ShareBar
