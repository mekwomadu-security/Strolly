'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

export default function LoginForm() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const supabase = createClient()
    const { error } = await supabase.auth.signInWithPassword({ email, password })

    if (error) {
      setError(error.message)
      setLoading(false)
      return
    }

    router.push('/home')
    router.refresh()
  }

  async function handleGoogleLogin() {
    const supabase = createClient()
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    })
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: '#f5f5f0',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '24px',
      fontFamily: 'DM Sans, sans-serif',
    }}>
      <div style={{ width: '100%', maxWidth: '400px' }}>

        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: '40px' }}>
          <div style={{
            fontFamily: 'Syne, sans-serif',
            fontSize: '42px',
            fontWeight: 800,
            letterSpacing: '-2px',
            color: '#0d0d0d',
            lineHeight: 1,
          }}>
            Str<span style={{
              background: '#0d0d0d',
              color: '#CAFF00',
              padding: '2px 12px',
              borderRadius: '8px',
              marginLeft: '3px',
            }}>olly</span>
          </div>
         
          <div style={{ fontSize: '15px', color: '#5a5a5a', marginTop: '10px' }}>
            
            Welcome Back! Find your fitness partner nearby
          </div>
        </div>

        {/* Card */}
        <div style={{
          background: '#ffffff',
          borderRadius: '28px',
          padding: '32px',
          border: '1.5px solid #e2e2d8',
          boxShadow: '0 4px 24px rgba(0,0,0,0.06)',
        }}>

          {/* Google button */}
          <button
            type="button"
            onClick={handleGoogleLogin}
            style={{
              width: '100%',
              padding: '14px',
              background: '#ffffff',
              border: '1.5px solid #e2e2d8',
              borderRadius: '16px',
              fontSize: '15px',
              fontWeight: 600,
              color: '#0d0d0d',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '10px',
              marginBottom: '20px',
              transition: 'border-color 0.15s',
            }}
            onMouseOver={e => (e.currentTarget.style.borderColor = '#a8d900')}
            onMouseOut={e => (e.currentTarget.style.borderColor = '#e2e2d8')}
          >
            <svg width="18" height="18" viewBox="0 0 18 18">
              <path fill="#4285F4" d="M16.51 8H8.98v3h4.3c-.18 1-.74 1.48-1.6 2.04v2.01h2.6a7.8 7.8 0 0 0 2.38-5.88c0-.57-.05-.66-.15-1.18z"/>
              <path fill="#34A853" d="M8.98 17c2.16 0 3.97-.72 5.3-1.94l-2.6-2a4.8 4.8 0 0 1-7.18-2.54H1.83v2.07A8 8 0 0 0 8.98 17z"/>
              <path fill="#FBBC05" d="M4.5 10.52a4.8 4.8 0 0 1 0-3.04V5.41H1.83a8 8 0 0 0 0 7.18l2.67-2.07z"/>
              <path fill="#EA4335" d="M8.98 4.18c1.17 0 2.23.4 3.06 1.2l2.3-2.3A8 8 0 0 0 1.83 5.4L4.5 7.49a4.77 4.77 0 0 1 4.48-3.31z"/>
            </svg>
            Continue with Google
          </button>

          {/* Divider */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
            <div style={{ flex: 1, height: '1px', background: '#e2e2d8' }}></div>
            <div style={{ fontSize: '12px', color: '#5a5a5a', fontWeight: 500 }}>or sign in with email</div>
            <div style={{ flex: 1, height: '1px', background: '#e2e2d8' }}></div>
          </div>

          {/* Form */}
          <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={{
                fontSize: '11px',
                fontWeight: 700,
                color: '#5a5a5a',
                letterSpacing: '0.1em',
                textTransform: 'uppercase',
              }}>
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                placeholder="you@example.com"
                style={{
                  padding: '14px 16px',
                  background: '#f5f5f0',
                  border: '1.5px solid #e2e2d8',
                  borderRadius: '14px',
                  fontSize: '15px',
                  color: '#0d0d0d',
                  outline: 'none',
                  transition: 'border-color 0.15s',
                }}
                onFocus={e => e.target.style.borderColor = '#a8d900'}
                onBlur={e => e.target.style.borderColor = '#e2e2d8'}
              />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={{
                fontSize: '11px',
                fontWeight: 700,
                color: '#5a5a5a',
                letterSpacing: '0.1em',
                textTransform: 'uppercase',
              }}>
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                placeholder="••••••••"
                style={{
                  padding: '14px 16px',
                  background: '#f5f5f0',
                  border: '1.5px solid #e2e2d8',
                  borderRadius: '14px',
                  fontSize: '15px',
                  color: '#0d0d0d',
                  outline: 'none',
                  transition: 'border-color 0.15s',
                }}
                onFocus={e => e.target.style.borderColor = '#a8d900'}
                onBlur={e => e.target.style.borderColor = '#e2e2d8'}
              />
            </div>

            {error && (
              <div style={{
                padding: '12px 16px',
                background: '#fff0f0',
                border: '1.5px solid #ffcccc',
                borderRadius: '12px',
                fontSize: '13px',
                color: '#cc0000',
              }}>
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              style={{
                marginTop: '4px',
                padding: '16px',
                background: '#0d0d0d',
                color: '#CAFF00',
                fontFamily: 'Syne, sans-serif',
                fontSize: '16px',
                fontWeight: 700,
                border: 'none',
                borderRadius: '16px',
                cursor: loading ? 'not-allowed' : 'pointer',
                opacity: loading ? 0.7 : 1,
                letterSpacing: '0.02em',
                transition: 'transform 0.15s',
              }}
            >
              {loading ? 'Signing in…' : 'Sign in →'}
            </button>
          </form>
        </div>

        {/* Footer */}
        <p style={{ textAlign: 'center', marginTop: '20px', fontSize: '14px', color: '#5a5a5a' }}>
          Don't have an account?{' '}
          <Link href="/signup" style={{ color: '#0d0d0d', fontWeight: 700, textDecoration: 'none' }}>
            Sign up
          </Link>
        </p>

      </div>
    </div>
  )
}