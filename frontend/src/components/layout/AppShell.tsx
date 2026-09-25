import { Outlet } from 'react-router-dom'
import { useEffect, useRef } from 'react'
import Sidebar from './Sidebar'
import PipelineBreadcrumb from './PipelineBreadcrumb'
import { useUIStore } from '@/stores/appStore'

export default function AppShell() {
  const { scrollProgress, setScrollProgress, sidebarCollapsed } = useUIStore()
  const mainRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = mainRef.current
    if (!el) return

    const handleScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = el
      const progress = scrollHeight > clientHeight
        ? (scrollTop / (scrollHeight - clientHeight)) * 100
        : 0
      setScrollProgress(progress)
    }

    el.addEventListener('scroll', handleScroll, { passive: true })
    return () => el.removeEventListener('scroll', handleScroll)
  }, [setScrollProgress])

  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden', background: 'var(--color-bg-paper)' }}>
      {/* Scroll progress bar */}
      <div className="scroll-progress" style={{ width: `${scrollProgress}%` }} />

      {/* Sidebar */}
      <Sidebar />

      {/* Main content area */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        {/* Top bar with pipeline breadcrumb */}
        <header style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0.5rem 1.5rem',
          borderBottom: '1px solid var(--color-border-light)',
          background: 'var(--color-bg-card)',
          zIndex: 10,
          flexShrink: 0,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <h4 style={{ fontFamily: 'var(--font-display)', fontSize: '1rem', fontWeight: 600, margin: 0 }}>
              THERMASHELL
            </h4>
            <PipelineBreadcrumb />
          </div>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.6875rem', color: 'var(--color-text-muted)' }}>
            v0.1.0
          </div>
        </header>

        {/* Scrollable content */}
        <main
          ref={mainRef}
          style={{
            flex: 1,
            overflowY: 'auto',
            padding: '1.5rem',
          }}
        >
          <Outlet />
        </main>
      </div>
    </div>
  )
}
