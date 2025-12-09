'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/stores/auth-store'
import { UserRole } from '@/types'

// モックアカウント（バックエンドなしでも動作）
const MOCK_ACCOUNTS = [
  {
    email: 'admin@katomo.com',
    password: 'admin123',
    user: {
      id: 'admin-1',
      email: 'admin@katomo.com',
      name: '管理者',
      role: UserRole.ADMIN,
      avatarUrl: undefined,
      isActive: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }
  },
  {
    email: 'manager@katomo.com',
    password: 'manager123',
    user: {
      id: 'manager-1',
      email: 'manager@katomo.com',
      name: '目黒',
      role: UserRole.MANAGER,
      avatarUrl: undefined,
      isActive: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }
  },
  {
    email: 'sales@katomo.com',
    password: 'sales123',
    user: {
      id: 'sales-1',
      email: 'sales@katomo.com',
      name: '野島',
      role: UserRole.SALES,
      avatarUrl: undefined,
      isActive: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }
  },
  // 旧デモアカウント互換
  {
    email: 'sales1@katomo.com',
    password: 'password123',
    user: {
      id: '1',
      email: 'sales1@katomo.com',
      name: '山田太郎',
      role: UserRole.SALES,
      avatarUrl: undefined,
      isActive: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }
  },
]

export default function LoginPage() {
  const router = useRouter()
  const setAuth = useAuthStore((state) => state.setAuth)
  const [loading, setLoading] = useState(false)

  // ダイレクトログイン関数
  const handleDirectLogin = (accountIndex: number) => {
    setLoading(true)
    const mockAccount = MOCK_ACCOUNTS[accountIndex]

    console.log('ダイレクトログイン:', mockAccount.user.name) // デバッグ用
    const mockToken = `mock-jwt-token-${mockAccount.user.role}-${Date.now()}`
    setAuth(mockAccount.user, mockToken)

    // 少し遅延を入れてログインした感を出す
    setTimeout(() => {
      router.push('/dashboard')
      setLoading(false)
    }, 300)
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <div className="w-full max-w-md p-6">
        {/* ロゴ */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-slate-800 tracking-tight mb-2">
            katomotor
          </h1>
          <p className="text-sm text-slate-500">営業支援ツール</p>
        </div>

        <div className="bg-white rounded-xl shadow-lg p-8 border border-slate-200">
          <div className="mb-6">
            <h2 className="text-xl font-semibold text-google-gray-800 mb-1">ログイン</h2>
            <p className="text-sm text-google-gray-500">
              ユーザーを選択してログインしてください
            </p>
          </div>

          <div className="space-y-3">
            <button
              onClick={() => handleDirectLogin(0)}
              className="w-full py-4 px-4 bg-red-600 hover:bg-red-700 text-white font-medium rounded-lg transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-between"
              disabled={loading}
            >
              <span className="text-lg">管理者としてログイン</span>
              <span className="chip-md-red text-xs bg-white/20">管理者</span>
            </button>

            <button
              onClick={() => handleDirectLogin(1)}
              className="w-full py-4 px-4 bg-yellow-600 hover:bg-yellow-700 text-white font-medium rounded-lg transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-between"
              disabled={loading}
            >
              <span className="text-lg">マネージャーとしてログイン</span>
              <span className="chip-md-yellow text-xs bg-white/20">マネージャー</span>
            </button>

            <button
              onClick={() => handleDirectLogin(2)}
              className="w-full py-4 px-4 bg-green-600 hover:bg-green-700 text-white font-medium rounded-lg transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-between"
              disabled={loading}
            >
              <span className="text-lg">営業としてログイン</span>
              <span className="chip-md-green text-xs bg-white/20">営業</span>
            </button>
          </div>

          <div className="mt-6 space-y-2">
            <p className="text-md-label-large text-google-gray-700">アカウント一覧:</p>
            <div className="grid gap-2 text-sm bg-google-gray-50 p-3 rounded-md border border-google-gray-200">
              <div className="flex justify-between items-center">
                <span className="chip-md-red text-xs">管理者</span>
                <span className="text-google-gray-600">admin@katomo.com / admin123</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="chip-md-yellow text-xs">マネージャー</span>
                <span className="text-google-gray-600">manager@katomo.com / manager123</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="chip-md-green text-xs">営業</span>
                <span className="text-google-gray-600">sales@katomo.com / sales123</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
