'use client'

import { useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleReset(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const supabase = createClient()
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    })

    if (error) {
      setError(error.message)
      setLoading(false)
      return
    }

    setDone(true)
    setLoading(false)
  }

  if (done) {
    return (
      <div style={{ minHeight: '100vh', background: '#f5f5f0', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
        <div style={{ width: '100%', maxWidth: '400px', textAlign: 'center' }}>
          <div style={{ fontSize: '48px', marginBottom: '20px' }}>📬</div>
          <div style={{ fontFamily: 'sans-serif', fontSize: '24px', fontWeight: 800, letterSpacing: '-0.5px', marginBottom: '10px', color: '#0d0d0d' }}>
            Check your email
          </div>
          <div style={{ fontSize: '15px', color: '#5a5a5a', lineHeight: 1.6, marginBottom: '24px' }}>
            We sent a password reset link to <strong>{email}</strong>. Click it to set a new password.
          </div>
          <Link href="/login" style={{ display: 'inline-block', padding: '14px 28px', background: '#0d0d0d', color: '#CAFF00', borderRadius: '14px', fontSize: '14px', fontWeight: 700, textDecoration: 'none' }}>
            Back to login →
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh', background: '#f5f5f0', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
      <div style={{ width: '100%', maxWidth: '400px' }}>

        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: '40px' }}>
          <div style={{ fontFamily: 'sans-serif', fontSize: '36px', fontWeight: 800, letterSpacing: '-2px', color: '#0d0d0d' }}>
            Str<span style={{ background: '#0d0d0d', color: '#CAFF00', padding: '2px 10px', borderRadius: '8px', marginLeft: '2px' }}>olly</span>
          </div>
          <div style={{ fontSize: '14px', color: '#5a5a5a', marginTop: '8px' }}>Reset your password</div>
        </div>

        {/* Card */}
        <div style={{ background: '#ffffff', borderRadius: '24px', padding: '32px', border: '1.5px solid #e2e2d8', boxShadow: '0 4px 24px rgba(0,0,0,0.06)' }}>
          <div style={{ fontSize: '14px', color: '#5a5a5a', marginBottom: '20px', lineHeight: 1.6 }}>
            Enter your email and we'll send you a link to reset your password.
          </div>

          <form onSubmit={handleReset} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={{ fontSize: '11px', fontWeight: 700, color: '#5a5a5a', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                placeholder="you@example.com"
                style={{ padding: '14px 16px', background: '#f5f5f0', border: '1.5px solid #e2e2d8', borderRadius: '14px', fontSize: '15px', color: '#0d0d0d', outline: 'none' }}
                onFocus={e => e.target.style.borderColor = '#a8d900'}
                onBlur={e => e.target.style.borderColor = '#e2e2d8'}
              />
            </div>

            {error && (
              <div style={{ padding: '12px 16px', background: '#fff0f0', border: '1.5px solid #ffcccc', borderRadius: '12px', fontSize: '13px', color: '#cc0000' }}>
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              style={{ padding: '16px', background: '#0d0d0d', color: '#CAFF00', fontSize: '16px', fontWeight: 700, border: 'none', borderRadius: '16px', cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.7 : 1 }}
            >
              {loading ? 'Sending…' : 'Send reset link →'}
            </button>
          </form>
        </div>

        <p style={{ textAlign: 'center', marginTop: '20px', fontSize: '14px', color: '#5a5a5a' }}>
          Remember your password?{' '}
          <Link href="/login" style={{ color: '#0d0d0d', fontWeight: 700, textDecoration: 'none' }}>
            Sign in
          </Link>
        </p>

      </div>
    </div>
  )
}