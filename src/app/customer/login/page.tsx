'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Car, Lock, Phone, User, AlertCircle } from 'lucide-react'

export default function CustomerLoginPage() {
  const router = useRouter()
  const [loginMethod, setLoginMethod] = useState<'phone' | 'code'>('phone')
  const [phone, setPhone] = useState('')
  const [accessCode, setAccessCode] = useState('')
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  // デモ用のお客様データ
  const demoCustomers = [
    { id: 'demo1', name: '田中 太郎', phone: '090-1234-5678', code: 'TANAKA001' },
    { id: 'demo2', name: '佐藤 花子', phone: '080-9876-5432', code: 'SATO002' },
    { id: 'demo3', name: '山田 一郎', phone: '070-1111-2222', code: 'YAMADA003' },
  ]

  const handleLogin = async () => {
    setError('')
    setIsLoading(true)

    // 入力検証
    if (loginMethod === 'phone' && !phone.trim()) {
      setError('電話番号を入力してください')
      setIsLoading(false)
      return
    }
    if (loginMethod === 'code' && !accessCode.trim()) {
      setError('アクセスコードを入力してください')
      setIsLoading(false)
      return
    }

    // デモ認証（実際はAPIで検証）
    await new Promise(resolve => setTimeout(resolve, 1000))

    let customer = null
    if (loginMethod === 'phone') {
      const cleanPhone = phone.replace(/-/g, '')
      customer = demoCustomers.find(c => c.phone.replace(/-/g, '') === cleanPhone)
    } else {
      customer = demoCustomers.find(c => c.code.toUpperCase() === accessCode.toUpperCase())
    }

    if (customer) {
      // セッションを保存
      localStorage.setItem('customerSession', JSON.stringify({
        id: customer.id,
        name: customer.name,
        phone: customer.phone,
        loginAt: new Date().toISOString()
      }))
      router.push('/customer')
    } else {
      setError(loginMethod === 'phone'
        ? '登録されていない電話番号です'
        : '無効なアクセスコードです')
    }

    setIsLoading(false)
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* ロゴ・ヘッダー */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-blue-600 mb-4">
            <Car className="h-10 w-10 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900">Katomo</h1>
          <p className="text-gray-600 mt-2">お客様専用ページ</p>
        </div>

        <Card className="shadow-xl">
          <CardHeader className="text-center pb-2">
            <CardTitle className="text-xl">ログイン</CardTitle>
            <p className="text-sm text-gray-500 mt-1">
              担当者から送られた情報でログインしてください
            </p>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* ログイン方法切替 */}
            <div className="flex gap-2">
              <button
                onClick={() => setLoginMethod('phone')}
                className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-colors ${
                  loginMethod === 'phone'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                <Phone className="h-4 w-4 inline mr-2" />
                電話番号で
              </button>
              <button
                onClick={() => setLoginMethod('code')}
                className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-colors ${
                  loginMethod === 'code'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                <Lock className="h-4 w-4 inline mr-2" />
                アクセスコードで
              </button>
            </div>

            {/* エラーメッセージ */}
            {error && (
              <div className="flex items-center gap-2 p-3 bg-red-50 text-red-600 rounded-lg text-sm">
                <AlertCircle className="h-4 w-4 flex-shrink-0" />
                {error}
              </div>
            )}

            {/* 入力フォーム */}
            {loginMethod === 'phone' ? (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  登録電話番号
                </label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <Input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="090-1234-5678"
                    className="pl-10 h-12 text-lg"
                  />
                </div>
                <p className="text-xs text-gray-500 mt-2">
                  ご登録いただいた電話番号を入力してください
                </p>
              </div>
            ) : (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  アクセスコード
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <Input
                    type="text"
                    value={accessCode}
                    onChange={(e) => setAccessCode(e.target.value.toUpperCase())}
                    placeholder="XXXXX000"
                    className="pl-10 h-12 text-lg uppercase tracking-wider"
                  />
                </div>
                <p className="text-xs text-gray-500 mt-2">
                  担当者から送られたコードを入力してください
                </p>
              </div>
            )}

            {/* ログインボタン */}
            <Button
              onClick={handleLogin}
              disabled={isLoading}
              className="w-full h-12 text-lg bg-blue-600 hover:bg-blue-700"
            >
              {isLoading ? (
                <div className="flex items-center gap-2">
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  確認中...
                </div>
              ) : (
                'ログイン'
              )}
            </Button>

            {/* デモ用ヘルプ */}
            <div className="border-t pt-4">
              <p className="text-xs text-gray-500 text-center mb-2">デモ用ログイン情報</p>
              <div className="bg-gray-50 rounded-lg p-3 text-xs text-gray-600 space-y-1">
                <div className="flex justify-between">
                  <span>電話番号:</span>
                  <span className="font-mono">090-1234-5678</span>
                </div>
                <div className="flex justify-between">
                  <span>アクセスコード:</span>
                  <span className="font-mono">TANAKA001</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* フッター */}
        <p className="text-center text-xs text-gray-500 mt-6">
          お困りの場合は担当者までお問い合わせください
        </p>
      </div>
    </div>
  )
}
