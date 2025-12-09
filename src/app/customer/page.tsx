'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Car,
  LogOut,
  FileText,
  MessageSquare,
  Phone,
  Mail,
  Calendar,
  Clock,
  Send,
  User,
  ChevronRight,
  Bell,
  CheckCircle,
  AlertCircle,
  Truck,
  CreditCard,
  MapPin,
  Building2,
  Star,
  Heart
} from 'lucide-react'

// お客様セッション情報
interface CustomerSession {
  id: string
  name: string
  phone: string
  loginAt: string
}

// メッセージの型
interface Message {
  id: string
  content: string
  sender: 'customer' | 'staff'
  senderName: string
  createdAt: string
  read: boolean
}

// お知らせの型
interface Notification {
  id: string
  title: string
  content: string
  type: 'info' | 'important' | 'delivery'
  createdAt: string
  read: boolean
}

// デモ用データ
const demoNotifications: Notification[] = [
  {
    id: '1',
    title: '納車日が決定しました',
    content: '12月15日(日) 14:00にご納車となります。当日は印鑑をお持ちください。',
    type: 'delivery',
    createdAt: '2025-12-02T10:00:00Z',
    read: false
  },
  {
    id: '2',
    title: 'ご契約ありがとうございます',
    content: 'この度はプリウスをご契約いただき誠にありがとうございます。',
    type: 'info',
    createdAt: '2025-11-28T14:00:00Z',
    read: true
  },
]

const demoMessages: Message[] = [
  {
    id: '1',
    content: 'お車の準備が整いました。納車日についてご都合をお聞かせください。',
    sender: 'staff',
    senderName: '山田 太郎',
    createdAt: '2025-12-01T10:00:00Z',
    read: true
  },
  {
    id: '2',
    content: '12月15日の午後でお願いできますか？',
    sender: 'customer',
    senderName: '',
    createdAt: '2025-12-01T11:30:00Z',
    read: true
  },
  {
    id: '3',
    content: '承知しました。12月15日14時でご予約いたします。当日は印鑑と残金のご準備をお願いいたします。',
    sender: 'staff',
    senderName: '山田 太郎',
    createdAt: '2025-12-01T12:00:00Z',
    read: true
  },
]

// 契約情報（デモ）
const demoContract = {
  vehicleModel: 'トヨタ プリウス G',
  vehicleColor: 'アティチュードブラックマイカ',
  contractDate: '2025-11-25',
  expectedDeliveryDate: '2025-12-15',
  totalAmount: 3500000,
  deposit: 500000,
  remaining: 3000000,
  paymentStatus: 'partial', // 'none' | 'partial' | 'completed'
  salesRep: {
    name: '山田 太郎',
    phone: '090-0000-0000',
    email: 'yamada@katomo.jp'
  },
  status: 'preparing', // 'ordered' | 'preparing' | 'ready' | 'delivered'
  options: ['純正ナビ', 'バックカメラ', 'ETC2.0', 'フロアマット']
}

export default function CustomerDashboardPage() {
  const router = useRouter()
  const [session, setSession] = useState<CustomerSession | null>(null)
  const [activeTab, setActiveTab] = useState<'home' | 'chat' | 'contract' | 'notifications'>('home')
  const [messages, setMessages] = useState<Message[]>(demoMessages)
  const [notifications, setNotifications] = useState<Notification[]>(demoNotifications)
  const [newMessage, setNewMessage] = useState('')
  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const sessionData = localStorage.getItem('customerSession')
    if (sessionData) {
      setSession(JSON.parse(sessionData))
    }
  }, [])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleLogout = () => {
    localStorage.removeItem('customerSession')
    router.push('/customer/login')
  }

  const handleSendMessage = () => {
    if (!newMessage.trim()) return

    const message: Message = {
      id: Date.now().toString(),
      content: newMessage,
      sender: 'customer',
      senderName: session?.name || '',
      createdAt: new Date().toISOString(),
      read: false
    }
    setMessages([...messages, message])
    setNewMessage('')

    // デモ用自動返信
    setTimeout(() => {
      const reply: Message = {
        id: (Date.now() + 1).toString(),
        content: 'メッセージを確認しました。担当者より折り返しご連絡いたします。',
        sender: 'staff',
        senderName: '山田 太郎',
        createdAt: new Date().toISOString(),
        read: false
      }
      setMessages(prev => [...prev, reply])
    }, 2000)
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('ja-JP', { month: 'short', day: 'numeric' })
  }

  const formatTime = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' })
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('ja-JP', { style: 'currency', currency: 'JPY' }).format(amount)
  }

  const unreadNotifications = notifications.filter(n => !n.read).length

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'ordered': return { label: '注文済み', color: 'bg-gray-100 text-gray-700' }
      case 'preparing': return { label: '準備中', color: 'bg-blue-100 text-blue-700' }
      case 'ready': return { label: '納車準備完了', color: 'bg-green-100 text-green-700' }
      case 'delivered': return { label: '納車済み', color: 'bg-purple-100 text-purple-700' }
      default: return { label: '不明', color: 'bg-gray-100 text-gray-700' }
    }
  }

  if (!session) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="min-h-screen pb-20">
      {/* ヘッダー */}
      <header className="bg-white shadow-sm sticky top-0 z-50">
        <div className="max-w-lg mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center">
              <Car className="h-5 w-5 text-white" />
            </div>
            <div>
              <div className="font-bold text-gray-900">Katomo</div>
              <div className="text-xs text-gray-500">{session.name} 様</div>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="p-2 text-gray-500 hover:text-gray-700"
          >
            <LogOut className="h-5 w-5" />
          </button>
        </div>
      </header>

      {/* メインコンテンツ */}
      <main className="max-w-lg mx-auto px-4 py-6">
        {/* ホームタブ */}
        {activeTab === 'home' && (
          <div className="space-y-6">
            {/* ステータスカード */}
            <Card className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white border-0">
              <CardContent className="pt-6">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <p className="text-blue-100 text-sm">ご契約車両</p>
                    <h2 className="text-xl font-bold">{demoContract.vehicleModel}</h2>
                    <p className="text-blue-200 text-sm">{demoContract.vehicleColor}</p>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-xs font-medium bg-white/20`}>
                    {getStatusLabel(demoContract.status).label}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-blue-100">
                  <Calendar className="h-4 w-4" />
                  <span className="text-sm">
                    納車予定: {new Date(demoContract.expectedDeliveryDate).toLocaleDateString('ja-JP')}
                  </span>
                </div>
              </CardContent>
            </Card>

            {/* 未読お知らせ */}
            {unreadNotifications > 0 && (
              <div
                onClick={() => setActiveTab('notifications')}
                className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 flex items-center gap-3 cursor-pointer hover:bg-yellow-100 transition-colors"
              >
                <div className="w-10 h-10 rounded-full bg-yellow-100 flex items-center justify-center">
                  <Bell className="h-5 w-5 text-yellow-600" />
                </div>
                <div className="flex-1">
                  <p className="font-medium text-yellow-800">
                    {unreadNotifications}件の新しいお知らせ
                  </p>
                  <p className="text-sm text-yellow-600">タップして確認</p>
                </div>
                <ChevronRight className="h-5 w-5 text-yellow-400" />
              </div>
            )}

            {/* クイックアクション */}
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => setActiveTab('chat')}
                className="bg-white rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow text-left"
              >
                <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center mb-3">
                  <MessageSquare className="h-6 w-6 text-blue-600" />
                </div>
                <p className="font-medium text-gray-900">メッセージ</p>
                <p className="text-xs text-gray-500">担当者とやり取り</p>
              </button>
              <button
                onClick={() => setActiveTab('contract')}
                className="bg-white rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow text-left"
              >
                <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center mb-3">
                  <FileText className="h-6 w-6 text-green-600" />
                </div>
                <p className="font-medium text-gray-900">契約内容</p>
                <p className="text-xs text-gray-500">詳細を確認</p>
              </button>
            </div>

            {/* 担当者情報 */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <User className="h-4 w-4" />
                  担当者
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-full bg-gray-200 flex items-center justify-center text-gray-600 font-bold text-lg">
                    {demoContract.salesRep.name.charAt(0)}
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-gray-900">{demoContract.salesRep.name}</p>
                    <p className="text-sm text-gray-500">営業担当</p>
                  </div>
                </div>
                <div className="mt-4 grid grid-cols-2 gap-2">
                  <a
                    href={`tel:${demoContract.salesRep.phone}`}
                    className="flex items-center justify-center gap-2 py-2 px-4 bg-green-50 text-green-700 rounded-lg text-sm font-medium hover:bg-green-100"
                  >
                    <Phone className="h-4 w-4" />
                    電話する
                  </a>
                  <button
                    onClick={() => setActiveTab('chat')}
                    className="flex items-center justify-center gap-2 py-2 px-4 bg-blue-50 text-blue-700 rounded-lg text-sm font-medium hover:bg-blue-100"
                  >
                    <MessageSquare className="h-4 w-4" />
                    メッセージ
                  </button>
                </div>
              </CardContent>
            </Card>

            {/* 進捗状況 */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <Truck className="h-4 w-4" />
                  お手続きの進捗
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="relative">
                  {/* プログレスライン */}
                  <div className="absolute left-4 top-4 bottom-4 w-0.5 bg-gray-200" />

                  <div className="space-y-6 relative">
                    <div className="flex items-start gap-4">
                      <div className="w-8 h-8 rounded-full bg-green-500 flex items-center justify-center z-10">
                        <CheckCircle className="h-5 w-5 text-white" />
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">ご契約完了</p>
                        <p className="text-sm text-gray-500">11月25日</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-4">
                      <div className="w-8 h-8 rounded-full bg-green-500 flex items-center justify-center z-10">
                        <CheckCircle className="h-5 w-5 text-white" />
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">頭金ご入金</p>
                        <p className="text-sm text-gray-500">11月28日</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-4">
                      <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center z-10 animate-pulse">
                        <Clock className="h-5 w-5 text-white" />
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">車両準備中</p>
                        <p className="text-sm text-gray-500">現在進行中</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-4">
                      <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center z-10">
                        <span className="text-gray-400 text-sm">4</span>
                      </div>
                      <div>
                        <p className="font-medium text-gray-400">残金ご入金</p>
                        <p className="text-sm text-gray-400">納車前</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-4">
                      <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center z-10">
                        <Star className="h-4 w-4 text-gray-400" />
                      </div>
                      <div>
                        <p className="font-medium text-gray-400">ご納車</p>
                        <p className="text-sm text-gray-400">12月15日予定</p>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* チャットタブ */}
        {activeTab === 'chat' && (
          <div className="flex flex-col h-[calc(100vh-180px)]">
            <div className="bg-white rounded-t-xl p-3 border-b flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center text-gray-600 font-bold">
                {demoContract.salesRep.name.charAt(0)}
              </div>
              <div>
                <p className="font-medium text-gray-900">{demoContract.salesRep.name}</p>
                <p className="text-xs text-green-600">オンライン</p>
              </div>
            </div>

            {/* メッセージ一覧 */}
            <div className="flex-1 overflow-y-auto bg-gray-50 p-4 space-y-4">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex ${message.sender === 'customer' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[80%] px-4 py-2 rounded-2xl ${
                      message.sender === 'customer'
                        ? 'bg-blue-600 text-white rounded-br-md'
                        : 'bg-white text-gray-900 rounded-bl-md shadow-sm'
                    }`}
                  >
                    {message.sender === 'staff' && (
                      <p className="text-xs text-gray-500 mb-1">{message.senderName}</p>
                    )}
                    <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                    <p className={`text-xs mt-1 ${
                      message.sender === 'customer' ? 'text-blue-200' : 'text-gray-400'
                    }`}>
                      {formatTime(message.createdAt)}
                    </p>
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>

            {/* メッセージ入力 */}
            <div className="bg-white rounded-b-xl p-3 border-t">
              <div className="flex gap-2">
                <Input
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  placeholder="メッセージを入力..."
                  className="flex-1"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault()
                      handleSendMessage()
                    }
                  }}
                />
                <Button
                  onClick={handleSendMessage}
                  disabled={!newMessage.trim()}
                  className="px-4"
                >
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* 契約タブ */}
        {activeTab === 'contract' && (
          <div className="space-y-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <Car className="h-4 w-4" />
                  車両情報
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-500">車種</span>
                  <span className="font-medium">{demoContract.vehicleModel}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">カラー</span>
                  <span className="font-medium">{demoContract.vehicleColor}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">契約日</span>
                  <span className="font-medium">
                    {new Date(demoContract.contractDate).toLocaleDateString('ja-JP')}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">納車予定日</span>
                  <span className="font-medium">
                    {new Date(demoContract.expectedDeliveryDate).toLocaleDateString('ja-JP')}
                  </span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <Star className="h-4 w-4" />
                  オプション
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {demoContract.options.map((option, index) => (
                    <span
                      key={index}
                      className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-sm"
                    >
                      {option}
                    </span>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <CreditCard className="h-4 w-4" />
                  お支払い情報
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-500">ご契約金額</span>
                  <span className="font-medium">{formatCurrency(demoContract.totalAmount)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">頭金</span>
                  <span className="font-medium text-green-600">
                    {formatCurrency(demoContract.deposit)}
                    <span className="text-xs ml-1">（入金済）</span>
                  </span>
                </div>
                <div className="flex justify-between pt-2 border-t">
                  <span className="text-gray-900 font-medium">残金</span>
                  <span className="font-bold text-lg">{formatCurrency(demoContract.remaining)}</span>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* お知らせタブ */}
        {activeTab === 'notifications' && (
          <div className="space-y-3">
            {notifications.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                <Bell className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                <p>お知らせはありません</p>
              </div>
            ) : (
              notifications.map((notification) => (
                <Card
                  key={notification.id}
                  className={notification.read ? 'opacity-70' : ''}
                  onClick={() => {
                    setNotifications(prev =>
                      prev.map(n => n.id === notification.id ? { ...n, read: true } : n)
                    )
                  }}
                >
                  <CardContent className="pt-4">
                    <div className="flex items-start gap-3">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                        notification.type === 'delivery' ? 'bg-green-100 text-green-600' :
                        notification.type === 'important' ? 'bg-red-100 text-red-600' :
                        'bg-blue-100 text-blue-600'
                      }`}>
                        {notification.type === 'delivery' ? <Truck className="h-5 w-5" /> :
                         notification.type === 'important' ? <AlertCircle className="h-5 w-5" /> :
                         <Bell className="h-5 w-5" />}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <p className="font-medium text-gray-900">{notification.title}</p>
                          {!notification.read && (
                            <span className="w-2 h-2 rounded-full bg-red-500" />
                          )}
                        </div>
                        <p className="text-sm text-gray-600 mt-1">{notification.content}</p>
                        <p className="text-xs text-gray-400 mt-2">{formatDate(notification.createdAt)}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        )}
      </main>

      {/* ボトムナビゲーション */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t shadow-lg">
        <div className="max-w-lg mx-auto flex">
          {[
            { id: 'home', icon: Car, label: 'ホーム' },
            { id: 'chat', icon: MessageSquare, label: 'メッセージ' },
            { id: 'contract', icon: FileText, label: '契約' },
            { id: 'notifications', icon: Bell, label: 'お知らせ', badge: unreadNotifications },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex-1 py-3 flex flex-col items-center gap-1 relative ${
                activeTab === tab.id ? 'text-blue-600' : 'text-gray-400'
              }`}
            >
              <tab.icon className="h-5 w-5" />
              <span className="text-xs">{tab.label}</span>
              {tab.badge && tab.badge > 0 && (
                <span className="absolute top-2 right-1/4 w-4 h-4 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
                  {tab.badge}
                </span>
              )}
            </button>
          ))}
        </div>
      </nav>
    </div>
  )
}
