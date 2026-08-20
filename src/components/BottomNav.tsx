'use client'

import { useRouter, usePathname } from 'next/navigation'

export default function BottomNav() {
  const router = useRouter()
  const pathname = usePathname()

  const tabs = [
    { label: 'Home', path: '/home' },
    { label: 'Chats', path: '/chats' },
    { label: 'AI Match', path: '/ai-match' },
    { label: 'Notifs', path: '/notifications' },
    { label: 'Profile', path: '/profile' },
  ]

  return (
    <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, height: '72px', background: '#ffffff', borderTop: '1px solid #e2e2d8', display: 'flex', alignItems: 'center', zIndex: 100 }}>
      {tabs.map(tab => {
        const isActive = pathname === tab.path
        return (
          <div
            key={tab.path}
            onClick={() => router.push(tab.path)}
            style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', cursor: 'pointer', padding: '8px 0' }}
          >
            {isActive && (
              <div style={{ width: '4px', height: '4px', borderRadius: '50%', background: '#CAFF00', border: '1px solid #0d0d0d' }} />
            )}
            <div style={{
              fontSize: '11px',
              fontWeight: isActive ? 800 : 500,
              color: isActive ? '#0d0d0d' : '#5a5a5a',
              letterSpacing: isActive ? '0.02em' : '0',
            }}>
              {tab.label}
            </div>
          </div>
        )
      })}
    </div>
  )
}