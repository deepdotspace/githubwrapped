/**
 * Boot + error screens for the story route — both on-brand (green gradient,
 * the same robot mascot, the story's fonts) so a slow fetch or a missing user
 * never drops the viewer onto generic scaffold chrome.
 */

const BRICOLAGE = "'Bricolage Grotesque', sans-serif"
const MONO = "'JetBrains Mono', monospace"
const SPACE = "'Space Grotesk', sans-serif"

const STATES_CSS = `
@keyframes gwBob{0%,100%{transform:translateY(0) rotate(-1.5deg)}50%{transform:translateY(-9px) rotate(1.5deg)}}
@keyframes gwBlink{0%,90%,100%{transform:scaleY(1)}95%{transform:scaleY(.12)}}
@keyframes gwPulse{0%,100%{opacity:.45;transform:scale(.85)}50%{opacity:1;transform:scale(1)}}
`

/** The robot mascot, static (no engine hooks) — for the boot/error surfaces. */
function MascotSvg({ top = '#3ad36c', bot = '#0f8a44', ant = '#c8ff5e' }: { top?: string; bot?: string; ant?: string }) {
  return (
    <div style={{ animation: 'gwBob 3.4s ease-in-out infinite', filter: 'drop-shadow(0 12px 16px rgba(0,0,0,.32))' }}>
      <svg width={132} height={150} viewBox="0 0 132 150" aria-hidden>
        <defs>
          <linearGradient id="gwBodyG" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor={top} />
            <stop offset="1" stopColor={bot} />
          </linearGradient>
        </defs>
        <ellipse cx={66} cy={142} rx={36} ry={6} fill="rgba(0,0,0,.22)" />
        <path d="M30 64 A40 40 0 0 1 102 64" fill="none" stroke="#181820" strokeWidth={8} strokeLinecap="round" />
        <rect x={18} y={60} width={18} height={34} rx={8} fill="#181820" />
        <rect x={96} y={60} width={18} height={34} rx={8} fill="#181820" />
        <rect x={14} y={68} width={8} height={14} rx={4} fill="#00e5ff" />
        <rect x={110} y={68} width={8} height={14} rx={4} fill="#00e5ff" />
        <line x1={66} y1={42} x2={66} y2={24} stroke="#0c5a32" strokeWidth={4} />
        <circle cx={66} cy={20} r={6} fill={ant} />
        <rect x={28} y={42} width={76} height={80} rx={24} fill="url(#gwBodyG)" />
        <rect x={37} y={49} width={30} height={13} rx={7} fill="rgba(255,255,255,.28)" />
        <rect x={38} y={60} width={56} height={44} rx={15} fill="#0a1410" />
        <g style={{ transformBox: 'fill-box', transformOrigin: 'center', animation: 'gwBlink 4.2s infinite' }}><rect x={50} y={74} width={9} height={13} rx={4.5} fill="#7af9ff" /></g>
        <g style={{ transformBox: 'fill-box', transformOrigin: 'center', animation: 'gwBlink 4.2s .2s infinite' }}><rect x={73} y={74} width={9} height={13} rx={4.5} fill="#7af9ff" /></g>
        <path d="M54 95 Q66 103 78 95" stroke="#7af9ff" strokeWidth={3} fill="none" strokeLinecap="round" />
        <rect x={46} y={120} width={15} height={13} rx={6} fill="#0c5a32" />
        <rect x={71} y={120} width={15} height={13} rx={6} fill="#0c5a32" />
      </svg>
    </div>
  )
}

function SpeechBubble({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ fontFamily: MONO, fontSize: 13, color: '#13131a', background: '#fff', padding: '10px 16px', borderRadius: '14px 14px 14px 4px', boxShadow: '0 10px 28px rgba(0,0,0,.3)', maxWidth: 260, lineHeight: 1.4 }}>
      {children}
    </div>
  )
}

const SHELL: React.CSSProperties = {
  position: 'relative',
  width: '100%',
  height: '100vh',
  overflow: 'hidden',
  display: 'flex',
  flexDirection: 'column',
  justifyContent: 'center',
  alignItems: 'center',
  gap: 22,
  textAlign: 'center',
  padding: 24,
  fontFamily: SPACE,
  background: 'radial-gradient(125% 120% at 50% 28%, #0c7a4f 0%, #064d36 45%, #02160e 100%)',
}

/** Shown while GET /api/wrapped/:username is in flight. */
export function WrappedBoot({ username }: { username: string }) {
  return (
    <div style={SHELL}>
      <style>{STATES_CSS}</style>
      <div style={{ fontFamily: MONO, fontSize: 'clamp(12px,1.5vw,15px)', letterSpacing: '.3em', color: '#9bff5e' }}>// GITHUB WRAPPED</div>
      <SpeechBubble>booting up your year...</SpeechBubble>
      <MascotSvg />
      <div style={{ fontFamily: BRICOLAGE, fontWeight: 800, fontSize: 'clamp(26px,5vw,52px)', letterSpacing: '-.02em', color: '#eaffd0' }}>
        @{username}
      </div>
      <div style={{ display: 'flex', gap: 8 }} aria-label="Loading">
        {[0, 1, 2].map((i) => (
          <span key={i} style={{ width: 12, height: 12, borderRadius: 4, background: '#9bff5e', boxShadow: '0 0 10px #9bff5e', animation: `gwPulse 1.1s ease-in-out ${i * 0.18}s infinite` }} />
        ))}
      </div>
    </div>
  )
}

/** Shown on 404 / network error. `message` is the human reason, plus a retry. */
export function WrappedError({
  username,
  message,
  onRetry,
  onHome,
}: {
  username: string
  message?: string
  onRetry: () => void
  onHome: () => void
}) {
  return (
    <div style={SHELL}>
      <style>{STATES_CSS}</style>
      <SpeechBubble>hmm, I cannot find that one.</SpeechBubble>
      <MascotSvg top="#ff7aa8" bot="#e0356f" ant="#ffd24d" />
      <div style={{ fontFamily: BRICOLAGE, fontWeight: 800, fontSize: 'clamp(30px,6vw,72px)', lineHeight: .9, letterSpacing: '-.03em', color: '#fff4e0', maxWidth: 720 }}>
        We could not find<br />@{username}
      </div>
      <div style={{ fontFamily: SPACE, fontSize: 'clamp(15px,1.9vw,21px)', color: '#ffe3c2', maxWidth: 480 }}>
        {message || 'Double-check the GitHub username and try again.'}
      </div>
      <div style={{ display: 'flex', gap: 12, marginTop: 6, flexWrap: 'wrap', justifyContent: 'center' }}>
        <button
          type="button"
          onClick={onRetry}
          style={{ fontFamily: MONO, fontSize: 14, fontWeight: 600, color: '#04140d', background: '#9bff5e', padding: '13px 26px', borderRadius: 999, border: 'none', cursor: 'pointer', boxShadow: '0 12px 30px rgba(0,80,30,.4)' }}
        >
          Try again
        </button>
        <button
          type="button"
          onClick={onHome}
          style={{ fontFamily: MONO, fontSize: 14, fontWeight: 600, color: '#fff', background: 'rgba(255,255,255,.14)', border: '1px solid rgba(255,255,255,.3)', padding: '13px 22px', borderRadius: 999, cursor: 'pointer' }}
        >
          New search
        </button>
      </div>
    </div>
  )
}
