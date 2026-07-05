/**
 * / — the landing. Anonymous, no login.
 *
 * A GitHub-green gradient hero, the one-line pitch, and a single input: paste a
 * GitHub username, hit enter, and you are dropped into /:username. A couple of
 * example handles act as quick links. On-brand with the story (same fonts, same
 * green, the breathing-square texture and the mascot's robot eyes).
 */

import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'

const BRICOLAGE = "'Bricolage Grotesque', sans-serif"
const MONO = "'JetBrains Mono', monospace"
const SPACE = "'Space Grotesk', sans-serif"

const EXAMPLES = ['torvalds', 'gaearon', 'sindresorhus', 'antfu']

const LANDING_CSS = `
@keyframes gwBreathe{0%,100%{opacity:1;transform:scale(1)}50%{opacity:.5;transform:scale(.82)}}
@keyframes gwHint{0%,100%{transform:translateY(0);opacity:.55}50%{transform:translateY(6px);opacity:1}}
@keyframes gwGlow{0%,100%{box-shadow:0 0 0 3px rgba(155,255,94,.18),0 18px 50px -12px rgba(0,40,20,.6)}50%{box-shadow:0 0 0 3px rgba(155,255,94,.34),0 18px 50px -12px rgba(0,40,20,.6)}}
.gw-input::placeholder{color:rgba(4,20,13,.45)}
`

/** Sanitize a raw input into a GitHub-shaped handle (strip @, spaces, url bits). */
function normalizeHandle(raw: string): string {
  return raw
    .trim()
    .replace(/^@+/, '')
    .replace(/^https?:\/\/github\.com\//i, '')
    .replace(/\/.*$/, '')
    .replace(/[^A-Za-z0-9-]/g, '')
    .slice(0, 39)
}

export default function Landing() {
  const navigate = useNavigate()
  const [value, setValue] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  const handle = normalizeHandle(value)

  function go(name?: string) {
    const target = normalizeHandle(name ?? value)
    if (!target) {
      inputRef.current?.focus()
      return
    }
    navigate(`/${target}`)
  }

  return (
    <div
      style={{
        position: 'relative',
        width: '100%',
        minHeight: '100vh',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 'clamp(28px,6vw,80px)',
        fontFamily: SPACE,
        background: 'radial-gradient(135% 130% at 80% 6%, #ccff4d 0%, #56e08a 30%, #07a861 58%, #02160e 100%)',
      }}
    >
      <style>{LANDING_CSS}</style>

      {/* breathing-square texture, echoing the story's particle field */}
      <div aria-hidden style={{ position: 'absolute', inset: 0, zIndex: 0, pointerEvents: 'none', opacity: 0.5 }}>
        {SQUARES.map((s, i) => (
          <span
            key={i}
            style={{
              position: 'absolute',
              left: s.left,
              top: s.top,
              width: s.size,
              height: s.size,
              borderRadius: 4,
              background: s.color,
              boxShadow: `0 0 ${s.size * 1.2}px ${s.color}`,
              animation: `gwBreathe ${s.dur}s ease-in-out ${s.delay}s infinite`,
            }}
          />
        ))}
      </div>

      <div style={{ position: 'relative', zIndex: 1, width: '100%', maxWidth: 760, textAlign: 'center' }}>
        <div style={{ fontFamily: MONO, fontSize: 'clamp(12px,1.5vw,15px)', letterSpacing: '.3em', color: '#04231b', opacity: 0.85 }}>
          // GITHUB WRAPPED
        </div>

        <h1
          style={{
            fontFamily: BRICOLAGE,
            fontWeight: 800,
            fontSize: 'clamp(46px,11vw,128px)',
            lineHeight: 0.86,
            letterSpacing: '-.035em',
            color: '#04140d',
            margin: '.18em 0 0',
            textShadow: '0 8px 50px rgba(255,255,255,.18)',
          }}
        >
          Your year<br />in code.
        </h1>

        <p
          style={{
            fontFamily: SPACE,
            fontSize: 'clamp(16px,2vw,23px)',
            color: '#04231b',
            opacity: 0.9,
            margin: 'clamp(16px,2vw,24px) auto 0',
            maxWidth: 520,
          }}
        >
          Twelve months of commits, streaks, and 2am pushes, turned into a story you can scroll. Paste a GitHub username to begin.
        </p>

        <form
          onSubmit={(e) => {
            e.preventDefault()
            go()
          }}
          style={{
            display: 'flex',
            gap: 10,
            alignItems: 'stretch',
            margin: 'clamp(22px,3vw,34px) auto 0',
            maxWidth: 520,
            flexWrap: 'wrap',
            justifyContent: 'center',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              flex: '1 1 280px',
              minWidth: 240,
              background: '#eaffd0',
              borderRadius: 999,
              padding: '4px 4px 4px 18px',
              animation: 'gwGlow 3.6s ease-in-out infinite',
            }}
          >
            <span style={{ fontFamily: MONO, fontSize: 'clamp(16px,2vw,20px)', fontWeight: 700, color: 'rgba(4,20,13,.55)' }}>@</span>
            <input
              ref={inputRef}
              className="gw-input"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              placeholder="github-username"
              autoComplete="off"
              autoCapitalize="off"
              autoCorrect="off"
              spellCheck={false}
              aria-label="GitHub username"
              style={{
                flex: 1,
                minWidth: 0,
                border: 'none',
                outline: 'none',
                background: 'transparent',
                fontFamily: MONO,
                fontSize: 'clamp(16px,2vw,20px)',
                fontWeight: 600,
                color: '#04140d',
                padding: '12px 8px',
              }}
            />
            <button
              type="submit"
              disabled={!handle}
              style={{
                fontFamily: MONO,
                fontSize: 'clamp(14px,1.7vw,16px)',
                fontWeight: 700,
                color: '#04140d',
                background: handle ? '#9bff5e' : 'rgba(155,255,94,.5)',
                border: 'none',
                borderRadius: 999,
                padding: '12px 22px',
                cursor: handle ? 'pointer' : 'not-allowed',
                whiteSpace: 'nowrap',
                transition: 'background .2s ease',
              }}
            >
              Wrap it →
            </button>
          </div>
        </form>

        <div style={{ marginTop: 'clamp(20px,2.4vw,30px)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
          <div style={{ fontFamily: MONO, fontSize: 'clamp(11px,1.3vw,13px)', letterSpacing: '.18em', color: '#04231b', opacity: 0.7 }}>
            OR TRY ONE OF THESE
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'center' }}>
            {EXAMPLES.map((name) => (
              <button
                key={name}
                type="button"
                onClick={() => go(name)}
                style={{
                  fontFamily: MONO,
                  fontSize: 'clamp(12px,1.4vw,14px)',
                  fontWeight: 600,
                  color: '#eaffd0',
                  background: 'rgba(4,20,13,.28)',
                  border: '1px solid rgba(234,255,208,.28)',
                  borderRadius: 999,
                  padding: '8px 16px',
                  cursor: 'pointer',
                }}
              >
                @{name}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div
        aria-hidden
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          bottom: 'clamp(18px,3vw,32px)',
          zIndex: 1,
          textAlign: 'center',
          fontFamily: MONO,
          fontSize: 12,
          letterSpacing: '.12em',
          color: '#04231b',
          opacity: 0.7,
        }}
      >
        no login · public GitHub data only
      </div>
    </div>
  )
}

const SQUARES: Array<{ left: string; top: string; size: number; color: string; dur: number; delay: number }> = [
  { left: '8%', top: '18%', size: 16, color: '#9bff5e', dur: 3.6, delay: 0 },
  { left: '16%', top: '64%', size: 12, color: '#eaffd0', dur: 4.2, delay: 0.4 },
  { left: '26%', top: '34%', size: 10, color: '#5fe085', dur: 3.2, delay: 0.8 },
  { left: '38%', top: '78%', size: 14, color: '#9bff5e', dur: 4.6, delay: 0.2 },
  { left: '62%', top: '22%', size: 12, color: '#eaffd0', dur: 3.8, delay: 1.1 },
  { left: '72%', top: '70%', size: 16, color: '#5fe085', dur: 4.0, delay: 0.6 },
  { left: '84%', top: '40%', size: 10, color: '#9bff5e', dur: 3.4, delay: 0.9 },
  { left: '90%', top: '14%', size: 13, color: '#eaffd0', dur: 4.4, delay: 0.3 },
  { left: '48%', top: '12%', size: 9, color: '#5fe085', dur: 3.0, delay: 1.4 },
  { left: '54%', top: '88%', size: 12, color: '#9bff5e', dur: 4.1, delay: 0.5 },
]
