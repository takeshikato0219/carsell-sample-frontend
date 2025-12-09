'use client'

import { useState, useRef, useEffect, useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Send,
  Search,
  Phone,
  Mail,
  User,
  Clock,
  CheckCheck,
  Check,
  Plus,
  X,
  MessageSquare,
  PhoneCall,
  PhoneOff,
  Video,
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  Users,
  Calendar,
  FileText,
  ArrowLeft,
  Edit3,
  Trash2,
  Save,
  ExternalLink
} from 'lucide-react'
import { useCustomerStore } from '@/stores/customer-store'
import { Customer, CustomerStatus, Activity, ActivityType } from '@/types'

// 連絡履歴の型
interface ContactHistory {
  id: string
  customerId: string
  type: 'email' | 'phone' | 'meeting'
  direction: 'outbound' | 'inbound'
  subject?: string
  content: string
  duration?: number // 電話の場合の通話時間（秒）
  createdAt: string
  createdBy: string
}

// メール作成フォームの型
interface EmailDraft {
  to: string
  subject: string
  body: string
}

// ステータス色の取得
function getStatusColor(status?: CustomerStatus): string {
  switch (status) {
    case CustomerStatus.OWNER:
      return 'bg-green-100 text-green-700'
    case CustomerStatus.RANK_A:
      return 'bg-red-100 text-red-700'
    case CustomerStatus.RANK_B:
      return 'bg-orange-100 text-orange-700'
    case CustomerStatus.RANK_C:
      return 'bg-yellow-100 text-yellow-700'
    case CustomerStatus.CONTRACT:
    case CustomerStatus.AWAITING_DELIVERY:
      return 'bg-blue-100 text-blue-700'
    default:
      return 'bg-gray-100 text-gray-700'
  }
}

// ステータスラベルの取得
function getStatusLabel(status?: CustomerStatus): string {
  switch (status) {
    case CustomerStatus.OWNER:
      return 'オーナー'
    case CustomerStatus.RANK_A:
      return 'Aランク'
    case CustomerStatus.RANK_B:
      return 'Bランク'
    case CustomerStatus.RANK_C:
      return 'Cランク'
    case CustomerStatus.RANK_N:
      return 'Nランク'
    case CustomerStatus.CONTRACT:
      return '契約'
    case CustomerStatus.AWAITING_DELIVERY:
      return '納車待ち'
    case CustomerStatus.NEW:
      return '新規'
    default:
      return '未設定'
  }
}

// 通話時間のフォーマット
function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60)
  const secs = seconds % 60
  return `${mins}:${secs.toString().padStart(2, '0')}`
}

// 日時のフォーマット
function formatDateTime(dateString: string): string {
  const date = new Date(dateString)
  return date.toLocaleString('ja-JP', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

export default function ExternalChatPage() {
  const { customers } = useCustomerStore()

  // 選択中の顧客
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null)

  // 検索・フィルター
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<CustomerStatus | 'all'>('all')

  // 現在のモード
  const [currentMode, setCurrentMode] = useState<'list' | 'email' | 'phone' | 'history'>('list')

  // メール作成
  const [emailDraft, setEmailDraft] = useState<EmailDraft>({
    to: '',
    subject: '',
    body: ''
  })

  // 電話中の状態
  const [isOnCall, setIsOnCall] = useState(false)
  const [callDuration, setCallDuration] = useState(0)
  const [isMuted, setIsMuted] = useState(false)
  const [isSpeakerOn, setIsSpeakerOn] = useState(false)
  const callTimerRef = useRef<NodeJS.Timeout | null>(null)

  // 連絡履歴（ローカルステート - 実際はストアで管理）
  const [contactHistory, setContactHistory] = useState<ContactHistory[]>([
    {
      id: '1',
      customerId: '',
      type: 'email',
      direction: 'outbound',
      subject: 'プリウスのお見積もりについて',
      content: 'お世話になっております。先日ご来店いただきありがとうございました。ご要望のプリウスのお見積もりを添付いたします。',
      createdAt: '2025-12-02T10:00:00Z',
      createdBy: '山田太郎'
    },
    {
      id: '2',
      customerId: '',
      type: 'phone',
      direction: 'outbound',
      content: '来週の試乗予約について確認。土曜日14時でご予約。',
      duration: 180,
      createdAt: '2025-12-01T15:30:00Z',
      createdBy: '山田太郎'
    }
  ])

  // メモ入力
  const [callMemo, setCallMemo] = useState('')

  // フィルタリングした顧客リスト
  const filteredCustomers = useMemo(() => {
    let result = customers

    // ステータスフィルター
    if (statusFilter !== 'all') {
      result = result.filter(c => c.status === statusFilter)
    }

    // 検索フィルター
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      result = result.filter(c =>
        c.name.toLowerCase().includes(query) ||
        c.phone?.includes(query) ||
        c.email?.toLowerCase().includes(query) ||
        c.address?.toLowerCase().includes(query)
      )
    }

    return result
  }, [customers, searchQuery, statusFilter])

  // 選択した顧客の連絡履歴
  const customerHistory = useMemo(() => {
    if (!selectedCustomer) return []
    return contactHistory.filter(h => h.customerId === selectedCustomer.id)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
  }, [contactHistory, selectedCustomer])

  // 顧客を選択
  const handleSelectCustomer = (customer: Customer) => {
    setSelectedCustomer(customer)
    setEmailDraft({
      to: customer.email || '',
      subject: '',
      body: ''
    })
    setCurrentMode('list')
  }

  // メール送信
  const handleSendEmail = () => {
    if (!selectedCustomer || !emailDraft.subject.trim() || !emailDraft.body.trim()) return

    // 連絡履歴に追加
    const newHistory: ContactHistory = {
      id: Date.now().toString(),
      customerId: selectedCustomer.id,
      type: 'email',
      direction: 'outbound',
      subject: emailDraft.subject,
      content: emailDraft.body,
      createdAt: new Date().toISOString(),
      createdBy: '現在のユーザー'
    }
    setContactHistory(prev => [newHistory, ...prev])

    // 活動履歴にも追加（TODO: addActivity実装後に有効化）
    // addActivity(selectedCustomer.id, {
    //   type: ActivityType.EMAIL,
    //   title: emailDraft.subject,
    //   content: emailDraft.body,
    //   emailSubject: emailDraft.subject,
    //   createdByName: '現在のユーザー'
    // })

    // 実際のメール送信をシミュレート
    alert(`メールを送信しました\n\n宛先: ${emailDraft.to}\n件名: ${emailDraft.subject}`)

    // フォームをリセット
    setEmailDraft({
      to: selectedCustomer.email || '',
      subject: '',
      body: ''
    })
    setCurrentMode('list')
  }

  // 電話を開始
  const handleStartCall = () => {
    if (!selectedCustomer?.phone) {
      alert('この顧客の電話番号が登録されていません')
      return
    }

    setIsOnCall(true)
    setCallDuration(0)
    setCallMemo('')

    // 通話時間をカウント
    callTimerRef.current = setInterval(() => {
      setCallDuration(prev => prev + 1)
    }, 1000)
  }

  // 電話を終了
  const handleEndCall = () => {
    if (callTimerRef.current) {
      clearInterval(callTimerRef.current)
    }

    // 連絡履歴に追加
    if (selectedCustomer) {
      const newHistory: ContactHistory = {
        id: Date.now().toString(),
        customerId: selectedCustomer.id,
        type: 'phone',
        direction: 'outbound',
        content: callMemo || '通話記録',
        duration: callDuration,
        createdAt: new Date().toISOString(),
        createdBy: '現在のユーザー'
      }
      setContactHistory(prev => [newHistory, ...prev])

      // 活動履歴にも追加（TODO: addActivity実装後に有効化）
      // addActivity(selectedCustomer.id, {
      //   type: ActivityType.CALL,
      //   content: callMemo || '通話記録',
      //   callDuration: callDuration,
      //   createdByName: '現在のユーザー'
      // })
    }

    setIsOnCall(false)
    setCallDuration(0)
    setCurrentMode('list')
  }

  // クリーンアップ
  useEffect(() => {
    return () => {
      if (callTimerRef.current) {
        clearInterval(callTimerRef.current)
      }
    }
  }, [])

  return (
    <div className="h-full flex">
      {/* 左サイドバー - 顧客一覧 */}
      <div className="w-80 bg-white border-r flex flex-col">
        <div className="p-4 border-b">
          <div className="flex items-center gap-2 mb-3">
            <Users className="h-5 w-5 text-blue-600" />
            <h2 className="text-lg font-bold text-gray-900">顧客連絡</h2>
          </div>
          <p className="text-xs text-gray-500 mb-3">顧客を選んでメール・電話で連絡</p>

          {/* 検索 */}
          <div className="relative mb-3">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="名前・電話・メールで検索..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-gray-100 pl-9 pr-3 py-2 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* ステータスフィルター */}
          <div className="flex flex-wrap gap-1">
            <button
              onClick={() => setStatusFilter('all')}
              className={`px-2 py-1 rounded text-xs font-medium transition-colors ${
                statusFilter === 'all'
                  ? 'bg-blue-100 text-blue-700'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              全て
            </button>
            {[CustomerStatus.RANK_A, CustomerStatus.RANK_B, CustomerStatus.RANK_C, CustomerStatus.OWNER].map(status => (
              <button
                key={status}
                onClick={() => setStatusFilter(status)}
                className={`px-2 py-1 rounded text-xs font-medium transition-colors ${
                  statusFilter === status
                    ? getStatusColor(status)
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {getStatusLabel(status)}
              </button>
            ))}
          </div>
        </div>

        {/* 顧客リスト */}
        <div className="flex-1 overflow-y-auto">
          {filteredCustomers.length === 0 ? (
            <div className="p-4 text-center text-gray-500 text-sm">
              顧客が見つかりません
            </div>
          ) : (
            filteredCustomers.map(customer => (
              <button
                key={customer.id}
                onClick={() => handleSelectCustomer(customer)}
                className={`w-full flex items-start gap-3 px-4 py-3 text-left hover:bg-gray-50 transition-colors border-b ${
                  selectedCustomer?.id === customer.id ? 'bg-blue-50' : ''
                }`}
              >
                {/* アバター */}
                <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center text-gray-600 font-medium flex-shrink-0">
                  {customer.name.charAt(0)}
                </div>

                {/* 情報 */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="text-sm font-medium text-gray-900 truncate">
                      {customer.name}
                    </span>
                    <span className={`text-xs px-1.5 py-0.5 rounded ${getStatusColor(customer.status)}`}>
                      {getStatusLabel(customer.status)}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-gray-500">
                    {customer.phone && (
                      <span className="flex items-center gap-1">
                        <Phone className="h-3 w-3" />
                        {customer.phone}
                      </span>
                    )}
                  </div>
                  {customer.email && (
                    <div className="text-xs text-gray-400 truncate mt-0.5">
                      {customer.email}
                    </div>
                  )}
                </div>
              </button>
            ))
          )}
        </div>
      </div>

      {/* メインエリア */}
      <div className="flex-1 flex flex-col bg-gray-50">
        {selectedCustomer ? (
          <>
            {/* 顧客ヘッダー */}
            <div className="bg-white border-b px-6 py-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold text-xl">
                    {selectedCustomer.name.charAt(0)}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="text-xl font-bold text-gray-900">{selectedCustomer.name}</h2>
                      <span className={`text-xs px-2 py-0.5 rounded ${getStatusColor(selectedCustomer.status)}`}>
                        {getStatusLabel(selectedCustomer.status)}
                      </span>
                    </div>
                    <div className="flex items-center gap-4 mt-1 text-sm text-gray-500">
                      {selectedCustomer.phone && (
                        <span className="flex items-center gap-1">
                          <Phone className="h-4 w-4" />
                          {selectedCustomer.phone}
                        </span>
                      )}
                      {selectedCustomer.email && (
                        <span className="flex items-center gap-1">
                          <Mail className="h-4 w-4" />
                          {selectedCustomer.email}
                        </span>
                      )}
                    </div>
                    {selectedCustomer.address && (
                      <div className="text-sm text-gray-400 mt-1">
                        {selectedCustomer.address}
                      </div>
                    )}
                  </div>
                </div>

                {/* アクションボタン */}
                <div className="flex items-center gap-2">
                  <Button
                    onClick={() => setCurrentMode('email')}
                    variant={currentMode === 'email' ? 'default' : 'outline'}
                    className="gap-2"
                    disabled={!selectedCustomer.email}
                  >
                    <Mail className="h-4 w-4" />
                    メール
                  </Button>
                  <Button
                    onClick={() => setCurrentMode('phone')}
                    variant={currentMode === 'phone' ? 'default' : 'outline'}
                    className="gap-2"
                    disabled={!selectedCustomer.phone}
                  >
                    <Phone className="h-4 w-4" />
                    電話
                  </Button>
                  <Button
                    onClick={() => setCurrentMode('history')}
                    variant={currentMode === 'history' ? 'default' : 'outline'}
                    className="gap-2"
                  >
                    <Clock className="h-4 w-4" />
                    履歴
                  </Button>
                </div>
              </div>
            </div>

            {/* コンテンツエリア */}
            <div className="flex-1 overflow-y-auto p-6">
              {/* メール作成モード */}
              {currentMode === 'email' && (
                <Card className="max-w-3xl mx-auto">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Mail className="h-5 w-5" />
                      メール作成
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">宛先</label>
                      <Input
                        value={emailDraft.to}
                        onChange={(e) => setEmailDraft(prev => ({ ...prev, to: e.target.value }))}
                        placeholder="メールアドレス"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">件名</label>
                      <Input
                        value={emailDraft.subject}
                        onChange={(e) => setEmailDraft(prev => ({ ...prev, subject: e.target.value }))}
                        placeholder="件名を入力"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">本文</label>
                      <textarea
                        value={emailDraft.body}
                        onChange={(e) => setEmailDraft(prev => ({ ...prev, body: e.target.value }))}
                        placeholder="メール本文を入力..."
                        className="w-full border rounded-md p-3 text-sm min-h-[200px] focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>

                    {/* テンプレート */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">テンプレート</label>
                      <div className="flex flex-wrap gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setEmailDraft(prev => ({
                            ...prev,
                            subject: 'お見積もりのご案内',
                            body: `${selectedCustomer.name} 様\n\nいつもお世話になっております。\n\nご検討いただいております車両のお見積もりをお送りいたします。\n\nご不明な点がございましたら、お気軽にお問い合わせください。\n\nよろしくお願いいたします。`
                          }))}
                        >
                          見積もり案内
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setEmailDraft(prev => ({
                            ...prev,
                            subject: '試乗のご案内',
                            body: `${selectedCustomer.name} 様\n\nいつもお世話になっております。\n\nご希望の車両の試乗についてご案内いたします。\n\nご都合の良い日時をお知らせいただければ、ご予約を承ります。\n\nよろしくお願いいたします。`
                          }))}
                        >
                          試乗案内
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setEmailDraft(prev => ({
                            ...prev,
                            subject: 'ご来店のお礼',
                            body: `${selectedCustomer.name} 様\n\nこの度はご来店いただき、誠にありがとうございました。\n\nお車のご検討に際して、何かご不明な点がございましたら、いつでもお気軽にご連絡ください。\n\n今後ともよろしくお願いいたします。`
                          }))}
                        >
                          来店お礼
                        </Button>
                      </div>
                    </div>

                    <div className="flex justify-end gap-2 pt-4 border-t">
                      <Button variant="outline" onClick={() => setCurrentMode('list')}>
                        キャンセル
                      </Button>
                      <Button
                        onClick={handleSendEmail}
                        disabled={!emailDraft.subject.trim() || !emailDraft.body.trim()}
                        className="gap-2"
                      >
                        <Send className="h-4 w-4" />
                        送信
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* 電話モード */}
              {currentMode === 'phone' && (
                <Card className="max-w-md mx-auto">
                  <CardContent className="pt-6">
                    {!isOnCall ? (
                      // 発信前
                      <div className="text-center py-8">
                        <div className="w-24 h-24 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
                          <Phone className="h-12 w-12 text-green-600" />
                        </div>
                        <h3 className="text-xl font-bold text-gray-900 mb-2">
                          {selectedCustomer.name} さんに電話
                        </h3>
                        <p className="text-lg text-gray-600 mb-6">
                          {selectedCustomer.phone}
                        </p>
                        <Button
                          onClick={handleStartCall}
                          size="lg"
                          className="bg-green-600 hover:bg-green-700 gap-2"
                        >
                          <PhoneCall className="h-5 w-5" />
                          発信する
                        </Button>

                        {/* 電話アプリで発信 */}
                        <div className="mt-4">
                          <a
                            href={`tel:${selectedCustomer.phone}`}
                            className="text-sm text-blue-600 hover:underline flex items-center justify-center gap-1"
                          >
                            <ExternalLink className="h-4 w-4" />
                            電話アプリで発信
                          </a>
                        </div>
                      </div>
                    ) : (
                      // 通話中
                      <div className="text-center py-8">
                        <div className="w-24 h-24 rounded-full bg-green-500 flex items-center justify-center mx-auto mb-4 animate-pulse">
                          <Phone className="h-12 w-12 text-white" />
                        </div>
                        <h3 className="text-xl font-bold text-gray-900 mb-2">
                          通話中
                        </h3>
                        <p className="text-3xl font-mono text-gray-700 mb-2">
                          {formatDuration(callDuration)}
                        </p>
                        <p className="text-gray-500 mb-6">
                          {selectedCustomer.name} ({selectedCustomer.phone})
                        </p>

                        {/* 通話コントロール */}
                        <div className="flex justify-center gap-4 mb-6">
                          <button
                            onClick={() => setIsMuted(!isMuted)}
                            className={`w-12 h-12 rounded-full flex items-center justify-center ${
                              isMuted ? 'bg-red-100 text-red-600' : 'bg-gray-100 text-gray-600'
                            }`}
                          >
                            {isMuted ? <MicOff className="h-6 w-6" /> : <Mic className="h-6 w-6" />}
                          </button>
                          <button
                            onClick={() => setIsSpeakerOn(!isSpeakerOn)}
                            className={`w-12 h-12 rounded-full flex items-center justify-center ${
                              isSpeakerOn ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-600'
                            }`}
                          >
                            {isSpeakerOn ? <Volume2 className="h-6 w-6" /> : <VolumeX className="h-6 w-6" />}
                          </button>
                        </div>

                        {/* メモ */}
                        <div className="text-left mb-6">
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            通話メモ
                          </label>
                          <textarea
                            value={callMemo}
                            onChange={(e) => setCallMemo(e.target.value)}
                            placeholder="通話内容をメモ..."
                            className="w-full border rounded-md p-2 text-sm min-h-[100px]"
                          />
                        </div>

                        <Button
                          onClick={handleEndCall}
                          size="lg"
                          className="bg-red-600 hover:bg-red-700 gap-2"
                        >
                          <PhoneOff className="h-5 w-5" />
                          通話終了
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}

              {/* 履歴モード */}
              {currentMode === 'history' && (
                <Card className="max-w-3xl mx-auto">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Clock className="h-5 w-5" />
                      連絡履歴
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {customerHistory.length === 0 ? (
                      <div className="text-center py-8 text-gray-500">
                        <Clock className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                        <p>連絡履歴がありません</p>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {customerHistory.map(history => (
                          <div
                            key={history.id}
                            className="flex items-start gap-4 p-4 bg-gray-50 rounded-lg"
                          >
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${
                              history.type === 'email' ? 'bg-blue-100 text-blue-600' :
                              history.type === 'phone' ? 'bg-green-100 text-green-600' :
                              'bg-purple-100 text-purple-600'
                            }`}>
                              {history.type === 'email' ? <Mail className="h-5 w-5" /> :
                               history.type === 'phone' ? <Phone className="h-5 w-5" /> :
                               <Users className="h-5 w-5" />}
                            </div>
                            <div className="flex-1">
                              <div className="flex items-center justify-between mb-1">
                                <div className="flex items-center gap-2">
                                  <span className="font-medium text-gray-900">
                                    {history.type === 'email' ? 'メール' :
                                     history.type === 'phone' ? '電話' : '面談'}
                                  </span>
                                  <span className={`text-xs px-2 py-0.5 rounded ${
                                    history.direction === 'outbound' ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-600'
                                  }`}>
                                    {history.direction === 'outbound' ? '発信' : '受信'}
                                  </span>
                                  {history.duration && (
                                    <span className="text-xs text-gray-500">
                                      {formatDuration(history.duration)}
                                    </span>
                                  )}
                                </div>
                                <span className="text-xs text-gray-400">
                                  {formatDateTime(history.createdAt)}
                                </span>
                              </div>
                              {history.subject && (
                                <div className="text-sm font-medium text-gray-700 mb-1">
                                  {history.subject}
                                </div>
                              )}
                              <p className="text-sm text-gray-600">
                                {history.content}
                              </p>
                              <div className="text-xs text-gray-400 mt-1">
                                担当: {history.createdBy}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}

              {/* リストモード（デフォルト） */}
              {currentMode === 'list' && (
                <div className="max-w-3xl mx-auto space-y-4">
                  {/* 顧客詳細カード */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <User className="h-5 w-5" />
                        顧客情報
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <div className="text-sm text-gray-500">氏名</div>
                          <div className="font-medium">{selectedCustomer.name}</div>
                        </div>
                        {selectedCustomer.nameKana && (
                          <div>
                            <div className="text-sm text-gray-500">フリガナ</div>
                            <div className="font-medium">{selectedCustomer.nameKana}</div>
                          </div>
                        )}
                        <div>
                          <div className="text-sm text-gray-500">電話番号</div>
                          <div className="font-medium">{selectedCustomer.phone || '未登録'}</div>
                        </div>
                        <div>
                          <div className="text-sm text-gray-500">メール</div>
                          <div className="font-medium">{selectedCustomer.email || '未登録'}</div>
                        </div>
                        {selectedCustomer.address && (
                          <div className="col-span-2">
                            <div className="text-sm text-gray-500">住所</div>
                            <div className="font-medium">{selectedCustomer.address}</div>
                          </div>
                        )}
                        {selectedCustomer.assignedSalesRepName && (
                          <div>
                            <div className="text-sm text-gray-500">担当者</div>
                            <div className="font-medium">{selectedCustomer.assignedSalesRepName}</div>
                          </div>
                        )}
                        {selectedCustomer.source && (
                          <div>
                            <div className="text-sm text-gray-500">来店経路</div>
                            <div className="font-medium">{selectedCustomer.source}</div>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>

                  {/* クイックアクション */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <MessageSquare className="h-5 w-5" />
                        連絡する
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-2 gap-4">
                        <Button
                          onClick={() => setCurrentMode('email')}
                          className="h-24 flex-col gap-2"
                          variant="outline"
                          disabled={!selectedCustomer.email}
                        >
                          <Mail className="h-8 w-8" />
                          <span>メールを送る</span>
                        </Button>
                        <Button
                          onClick={() => setCurrentMode('phone')}
                          className="h-24 flex-col gap-2"
                          variant="outline"
                          disabled={!selectedCustomer.phone}
                        >
                          <Phone className="h-8 w-8" />
                          <span>電話をかける</span>
                        </Button>
                      </div>
                    </CardContent>
                  </Card>

                  {/* 最近の連絡 */}
                  {customerHistory.length > 0 && (
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center justify-between">
                          <span className="flex items-center gap-2">
                            <Clock className="h-5 w-5" />
                            最近の連絡
                          </span>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setCurrentMode('history')}
                          >
                            すべて見る
                          </Button>
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-3">
                          {customerHistory.slice(0, 3).map(history => (
                            <div
                              key={history.id}
                              className="flex items-center gap-3 p-2 bg-gray-50 rounded"
                            >
                              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                                history.type === 'email' ? 'bg-blue-100 text-blue-600' :
                                'bg-green-100 text-green-600'
                              }`}>
                                {history.type === 'email' ? <Mail className="h-4 w-4" /> : <Phone className="h-4 w-4" />}
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="text-sm font-medium truncate">
                                  {history.subject || history.content}
                                </div>
                                <div className="text-xs text-gray-400">
                                  {formatDateTime(history.createdAt)}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  )}
                </div>
              )}
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-gray-500">
            <div className="text-center">
              <Users className="h-16 w-16 mx-auto mb-4 text-gray-300" />
              <h3 className="text-xl font-medium text-gray-700 mb-2">顧客を選択してください</h3>
              <p className="text-sm">左側のリストから顧客を選んで連絡を開始</p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
