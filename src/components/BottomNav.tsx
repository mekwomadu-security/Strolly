'use client'

import { useRouter, usePathname } from 'next/navigation'

export default function BottomNav() {
  const router = useRouter()
  const pathname = usePathname()

  const tabs = [
    { label: 'Home', icon: '🏠', path: '/home' },
    { label: 'Chats', icon: '💬', path: '/chats' },
    { label: 'AI Match', icon: '✨', path: '/ai-match' },
    { label: 'Notifs', icon: '🔔', path: '/notifications' },
    { label: 'Profile', icon: '👤', path: '/profile' },
  ]

  return (
    <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, height: '72px', background: '#ffffff', borderTop: '1px solid #e2e2d8', display: 'flex', alignItems: 'flex-start', paddingTop: '10px', zIndex: 100 }}>
      {tabs.map(tab => {
        const isActive = pathname === tab.path
        return (
          <div
            key={tab.path}
            onClick={() => router.push(tab.path)}
            style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '3px', cursor: 'pointer' }}
          >
            {isActive && (
              <div style={{ width: '4px', height: '4px', borderRadius: '50%', background: '#CAFF00', marginBottom: '-2px' }} />
            )}
            <div style={{ fontSize: '20px' }}>{tab.icon}</div>
            <div style={{ fontSize: '10px', fontWeight: isActive ? 700 : 400, color: isActive ? '#0d0d0d' : '#5a5a5a' }}>
              {tab.label}
            </div>
          </div>
        )
      })}
    </div>
  )
}