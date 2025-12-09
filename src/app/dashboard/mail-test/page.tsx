'use client'

import { useState } from 'react'
import { Mail, Send, CheckCircle2, AlertCircle } from 'lucide-react'
import api from '@/lib/api'

export default function MailTestPage() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null)

  const handleSendTestEmail = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!email) {
      setResult({ success: false, message: 'メールアドレスを入力してください' })
      return
    }

    setLoading(true)
    setResult(null)

    try {
      const response = await api.post('/mail/test', { to: email })

      if (response.data.success) {
        setResult({ success: true, message: 'テストメールを送信しました！受信トレイを確認してください。' })
      } else {
        setResult({ success: false, message: response.data.message || 'メール送信に失敗しました' })
      }
    } catch (error: any) {
      console.error('メール送信エラー:', error)
      const errorMessage = error.response?.data?.message || error.message || 'メール送信に失敗しました'
      setResult({ success: false, message: errorMessage })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-2xl mx-auto">
        <div className="bg-white rounded-lg shadow-md p-8">
          <div className="flex items-center gap-3 mb-6">
            <Mail className="w-8 h-8 text-blue-600" />
            <h1 className="text-2xl font-bold text-gray-900">メール送信テスト</h1>
          </div>

          <p className="text-gray-600 mb-6">
            SMTP設定が正しく構成されているか確認するために、テストメールを送信します。
          </p>

          <form onSubmit={handleSendTestEmail} className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                送信先メールアドレス
              </label>
              <input
                type="email"
                id="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="test@example.com"
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                disabled={loading}
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white py-3 px-4 rounded-md font-medium transition-colors"
            >
              {loading ? (
                <>
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  送信中...
                </>
              ) : (
                <>
                  <Send className="w-5 h-5" />
                  テストメールを送信
                </>
              )}
            </button>
          </form>

          {result && (
            <div className={`mt-6 p-4 rounded-md ${result.success ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
              <div className="flex items-start gap-3">
                {result.success ? (
                  <CheckCircle2 className="w-6 h-6 text-green-600 flex-shrink-0 mt-0.5" />
                ) : (
                  <AlertCircle className="w-6 h-6 text-red-600 flex-shrink-0 mt-0.5" />
                )}
                <div>
                  <p className={`font-medium ${result.success ? 'text-green-900' : 'text-red-900'}`}>
                    {result.success ? '成功' : 'エラー'}
                  </p>
                  <p className={`text-sm mt-1 ${result.success ? 'text-green-700' : 'text-red-700'}`}>
                    {result.message}
                  </p>
                </div>
              </div>
            </div>
          )}

          <div className="mt-8 p-4 bg-gray-50 rounded-md border border-gray-200">
            <h3 className="font-medium text-gray-900 mb-2">SMTP設定について</h3>
            <p className="text-sm text-gray-600">
              メール送信には、バックエンドの <code className="bg-gray-200 px-1 py-0.5 rounded">.env</code> ファイルでSMTP設定が必要です。
            </p>
            <ul className="mt-2 text-sm text-gray-600 space-y-1 list-disc list-inside">
              <li>SMTP_HOST: メールサーバーのホスト名</li>
              <li>SMTP_PORT: ポート番号（通常587または465）</li>
              <li>SMTP_USER: メールアドレス</li>
              <li>SMTP_PASS: パスワード</li>
              <li>SMTP_FROM: 送信元アドレス</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}
