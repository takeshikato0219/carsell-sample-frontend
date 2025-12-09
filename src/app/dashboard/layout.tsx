'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Sidebar } from '@/components/layout/sidebar'
import { useAuthStore } from '@/stores/auth-store'

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const router = useRouter()
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated)
  const hasHydrated = useAuthStore((state) => state._hasHydrated)

  useEffect(() => {
    // ハイドレーションが完了してから認証チェック
    if (hasHydrated && !isAuthenticated) {
      router.push('/login')
    }
  }, [hasHydrated, isAuthenticated, router])

  // ハイドレーション中はローディング表示
  if (!hasHydrated) {
    return (
      <div className="h-screen flex items-center justify-center bg-google-gray-50">
        <div className="text-google-gray-500 font-google">読み込み中...</div>
      </div>
    )
  }

  if (!isAuthenticated) {
    return null
  }

  return (
    <div className="h-screen flex overflow-hidden bg-white font-google">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <main className="flex-1 overflow-y-auto p-6 bg-google-gray-50">
          {children}
        </main>
      </div>
    </div>
  )
}
