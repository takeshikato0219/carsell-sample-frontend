'use client'

import { useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'

// お客様用レイアウト（管理画面とは別デザイン）
export default function CustomerLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const router = useRouter()
  const pathname = usePathname()
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    // ログインページ以外では認証チェック
    if (pathname !== '/customer/login') {
      const customerSession = localStorage.getItem('customerSession')
      if (customerSession) {
        setIsAuthenticated(true)
      } else {
        router.push('/customer/login')
      }
    }
    setIsLoading(false)
  }, [pathname, router])

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-600">読み込み中...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {children}
    </div>
  )
}
