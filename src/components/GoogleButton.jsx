import { useEffect, useRef } from 'react'

/**
 * Google's own "Sign in with Google" button. Google gives the page a signed token and our server
 * verifies it; nothing secret is kept in the browser (the client id is public).
 * Google refuses sign-in inside some in-app browsers, see isEmbeddedBrowser().
 */
let scriptPromise
let initialisedFor = null
let handler = null // the latest onCredential, so the button can be re-rendered without re-initialising

function loadGoogle() {
  if (window.google?.accounts?.id) return Promise.resolve()
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

export default function GoogleButton({ clientId, mode = 'signin', onCredential, onError }) {
  const box = useRef(null)
  const onError2 = useRef(onError)
  onError2.current = onError

  useEffect(() => {
    handler = onCredential
    return () => {
      if (handler === onCredential) handler = null
    }
  }, [onCredential])

  useEffect(() => {
    let cancelled = false
    loadGoogle()
      .then(() => {
        if (cancelled || !box.current) return
        if (initialisedFor !== clientId) {
          window.google.accounts.id.initialize({ client_id: clientId, callback: (r) => handler?.(r.credential), ux_mode: 'popup', auto_select: false })
          initialisedFor = clientId
        }
        box.current.innerHTML = ''
        window.google.accounts.id.renderButton(box.current, {
          type: 'standard',
          theme: 'outline',
          size: 'large',
          text: mode === 'signup' ? 'signup_with' : 'signin_with',
          shape: 'rectangular',
          logo_alignment: 'left',
          width: Math.min(400, Math.max(200, box.current.clientWidth || 320)),
        })
      })
      .catch(() => onError2.current?.('Google sign-in could not load. Use your email instead.'))
    return () => {
      cancelled = true
    }
  }, [clientId, mode])

  return <div ref={box} className="tc-google" />
}
