'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useAuthStore } from '@/stores/auth-store'
import { UserRole } from '@/types'
import api from '@/lib/api'

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
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    // 入力値をトリム
    const trimmedEmail = email.trim().toLowerCase()
    const trimmedPassword = password.trim()

    console.log('ログイン試行:', trimmedEmail) // デバッグ用

    // モックアカウントで認証（バックエンドなしでも動作）
    const mockAccount = MOCK_ACCOUNTS.find(
      acc => acc.email.toLowerCase() === trimmedEmail && acc.password === trimmedPassword
    )

    if (mockAccount) {
      console.log('モックアカウント認証成功:', mockAccount.user.name) // デバッグ用
      const mockToken = `mock-jwt-token-${mockAccount.user.role}-${Date.now()}`
      setAuth(mockAccount.user, mockToken)
      router.push('/dashboard')
      setLoading(false)
      return
    }

    // モック認証失敗後、バックエンドAPI呼び出しを試行
    try {
      const response = await api.post('/auth/login', { email: trimmedEmail, password: trimmedPassword })
      const { access_token, user } = response.data
      setAuth(user, access_token)
      router.push('/dashboard')
    } catch (apiErr: any) {
      console.log('API認証失敗:', apiErr) // デバッグ用
      setError('メールアドレスまたはパスワードが間違っています')
    } finally {
      setLoading(false)
    }
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
              アカウント情報を入力してください
            </p>
          </div>

          <form onSubmit={handleLogin} className="space-y-5">
            <div className="space-y-2">
              <label htmlFor="email" className="text-md-label-large text-google-gray-700">
                メールアドレス
              </label>
              <input
                id="email"
                type="email"
                placeholder="user@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="input-md"
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="password" className="text-md-label-large text-google-gray-700">
                パスワード
              </label>
              <input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="input-md"
              />
            </div>

            {error && (
              <div className="p-3 bg-google-red-50 text-google-red-700 text-sm rounded-md border border-google-red-200">
                {error}
              </div>
            )}

            <button
              type="submit"
              className="w-full py-3 px-4 bg-google-blue-600 hover:bg-google-blue-700 text-white font-medium rounded-lg transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={loading}
            >
              {loading ? 'ログイン中...' : 'ログイン'}
            </button>
          </form>

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
