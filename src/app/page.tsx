'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function SplashPage() {
  const router = useRouter()
  const [visible, setVisible] = useState(true)

  useEffect(() => {
    const link = document.createElement('link')
    link.rel = 'stylesheet'
    link.href = 'https://fonts.googleapis.com/css2?family=Righteous&display=swap'
    document.head.appendChild(link)

    const supabase = createClient()
    const timer = setTimeout(async () => {
      setVisible(false)
      setTimeout(async () => {
        const { data: { user } } = await supabase.auth.getUser()
        router.push(user ? '/home' : '/login')
      }, 400)
    }, 2000)

    return () => clearTimeout(timer)
  }, [])

  return (
    <div style={{
      minHeight: '100vh',
      background: '#ffffff',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      opacity: visible ? 1 : 0,
      transition: 'opacity 0.4s ease',
    }}>
      <div style={{
        fontFamily: "'Righteous', sans-serif",
        fontSize: '70px',
        fontWeight: 400,
        letterSpacing: '-1px',
        color: '#0d0d0d',
        lineHeight: 1,
        userSelect: 'none',
      }}>
        Str<span style={{
          background: '#0d0d0d',
          color: '#CAFF00',
          padding: '6px 20px',
          borderRadius: '18px',
          marginLeft: '4px',
        }}>olly</span>
      </div>
    </div>
  )
}