import { useEffect, useRef, useState } from 'react'

/**
 * "Sign in with Google", drawn by us so it never changes shape after the page loads (Google's own button
 * swaps itself for a personalised one a moment later, which looked like flicker). Clicking it opens Google's
 * normal account window; the browser gets a token, our server checks it with Google. The client id is
 * public and there is no secret in the browser.
 * Google refuses sign-in inside some in-app browsers, see isEmbeddedBrowser().
 */
let scriptPromise

function loadGoogle() {
  if (window.google?.accounts?.oauth2) return Promise.resolve()
  scriptPromise ??= new Promise((resolve, reject) => {
    const s = document.createElement('script')
    s.src = 'https://accounts.google.com/gsi/client'
    s.async = true
    s.onload = resolve
    s.onerror = () => {
      scriptPromise = null
      reject(new Error('Could not load Google sign-in'))
    }
    document.head.appendChild(s)
  })
  return scriptPromise
}

/** Instagram, Facebook and similar apps open links in an embedded browser where Google blocks sign-in. */
export const isEmbeddedBrowser = () => typeof navigator !== 'undefined' && /Instagram|FBAN|FBAV|FB_IAB|MicroMessenger|; wv\)/i.test(navigator.userAgent)

const LOGO = (
  <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
    <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
    <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
    <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
    <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
  </svg>
)

export default function GoogleButton({ clientId, mode = 'signin', onToken, onError }) {
  const client = useRef(null)
  const [ready, setReady] = useState(false)
  const cb = useRef({ onToken, onError })
  cb.current = { onToken, onError }

  // Load Google's script in the background so the first click opens the window straight away
  useEffect(() => {
    let cancelled = false
    loadGoogle()
      .then(() => {
        if (cancelled) return
        client.current = window.google.accounts.oauth2.initTokenClient({
          client_id: clientId,
          scope: 'openid email profile',
          callback: (r) => (r.error ? cb.current.onError?.('Google sign-in was not completed. Please try again.') : cb.current.onToken(r.access_token)),
          error_callback: (e) =>
            cb.current.onError?.(
              e?.type === 'popup_failed_to_open'
                ? 'Your browser blocked the Google window. Please allow pop-ups for this site and try again.'
                : e?.type === 'popup_closed'
                  ? '' // they closed the window on purpose: no message
                  : 'Google sign-in could not start. Please try again or use your email.'
            ),
        })
        setReady(true)
      })
      .catch(() => cb.current.onError?.('Google sign-in could not load. Use your email instead.'))
    return () => {
      cancelled = true
    }
  }, [clientId])

  const click = () => {
    cb.current.onError?.('')
    if (client.current) client.current.requestAccessToken()
    else cb.current.onError?.('Google is still loading. Please try again in a moment.')
  }

  return (
    <button type="button" className="tc-gbtn" onClick={click} aria-busy={!ready}>
      {LOGO}
      <span>{mode === 'signup' ? 'Sign up with Google' : 'Sign in with Google'}</span>
    </button>
  )
}
