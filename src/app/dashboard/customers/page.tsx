'use client'

import { useState, useMemo, DragEvent, useEffect, useRef } from 'react'
import { useSearchParams } from 'next/navigation'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Plus, Search, Filter, X, Camera } from 'lucide-react'
import api from '@/lib/api'
import { Customer, CustomerStatus } from '@/types'
import Link from 'next/link'
import { mockCustomers } from '@/lib/mock-data'
import { useCustomerStore } from '@/stores/customer-store'
import { useSettingsStore } from '@/stores/settings-store'
import { useEstimateStore, Estimate } from '@/stores/estimate-store'

// カンバンボードのステージ定義（新規〜ランクAまで、契約は個人ページから）
const KANBAN_STAGES: { status: CustomerStatus; label: string; color: string; bgColor: string }[] = [
  { status: CustomerStatus.NEW, label: '新規', color: 'text-blue-700', bgColor: 'bg-blue-50 border-blue-200' },
  { status: CustomerStatus.RANK_N, label: 'ランクN', color: 'text-gray-700', bgColor: 'bg-gray-50 border-gray-200' },
  { status: CustomerStatus.RANK_C, label: 'ランクC', color: 'text-orange-700', bgColor: 'bg-orange-50 border-orange-200' },
  { status: CustomerStatus.RANK_B, label: 'ランクB', color: 'text-purple-700', bgColor: 'bg-purple-50 border-purple-200' },
  { status: CustomerStatus.RANK_A, label: 'ランクA', color: 'text-pink-700', bgColor: 'bg-pink-50 border-pink-200' },
  // 契約ステータスは個人詳細ページから「契約」ボタンで設定するため、カンバンからは除外
]

// 日付フォーマット用ヘルパー
function formatDate(dateString?: string): string {
  if (!dateString) return '-'
  const date = new Date(dateString)
  return `${date.getMonth() + 1}/${date.getDate()}`
}

function formatRelativeDate(dateString?: string): string {
  if (!dateString) return '未連絡'
  const date = new Date(dateString)
  const now = new Date()
  const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24))
  if (diffDays === 0) return '今日'
  if (diffDays === 1) return '昨日'
  if (diffDays < 7) return `${diffDays}日前`
  if (diffDays < 30) return `${Math.floor(diffDays / 7)}週間前`
  return `${Math.floor(diffDays / 30)}ヶ月前`
}

// 金額フォーマット
function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('ja-JP', { style: 'currency', currency: 'JPY' }).format(amount)
}

// 顧客カードコンポーネント
function CustomerCard({
  customer,
  onDragStart,
  isDragging,
  estimate,
  isHighlighted,
  cardRef
}: {
  customer: Customer
  onDragStart: (e: DragEvent<HTMLDivElement>, customer: Customer) => void
  isDragging: boolean
  estimate?: Estimate
  isHighlighted?: boolean
  cardRef?: React.RefObject<HTMLDivElement>
}) {
  return (
    <div
      ref={cardRef}
      draggable
      onDragStart={(e) => onDragStart(e, customer)}
      className={`transition-all duration-150 ${isDragging ? 'opacity-50 scale-95' : ''} ${isHighlighted ? 'animate-pulse' : ''}`}
    >
      <Link href={`/dashboard/customers/${customer.id}`} onClick={(e) => isDragging && e.preventDefault()}>
        <div className={`mb-2.5 p-3 bg-white rounded-lg hover:shadow-md cursor-grab active:cursor-grabbing transition-shadow duration-150 border ${isHighlighted ? 'border-blue-400 ring-2 ring-blue-200 bg-blue-50' : 'border-slate-200 hover:border-slate-300'}`}>
          {/* 名前と担当者 */}
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-semibold text-slate-800">{customer.name}</span>
            {customer.assignedSalesRepName && (
              <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium ${customer.assignedSalesRepColor || 'bg-slate-100 text-slate-600'}`}>
                {customer.assignedSalesRepName}
              </span>
            )}
          </div>

          {/* 住所 */}
          {customer.address && (
            <div className="text-xs text-slate-500 mb-2 truncate">{customer.address}</div>
          )}

          {/* 検討車種 */}
          {customer.interestedCars && customer.interestedCars.length > 0 && (
            <div className="text-xs text-slate-600 mb-2">
              <span className="text-slate-400">検討:</span>{' '}
              <span className="font-medium">{customer.interestedCars.slice(0, 2).join(', ')}</span>
              {customer.interestedCars.length > 2 && <span className="text-slate-400"> 他{customer.interestedCars.length - 2}件</span>}
            </div>
          )}

          {/* タグ */}
          {(customer.desiredVehicleType?.length || customer.budget || customer.purchaseTiming) && (
            <div className="flex flex-wrap gap-1.5 mb-2">
              {customer.desiredVehicleType && customer.desiredVehicleType.length > 0 && (
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-violet-100 text-violet-700">
                  {customer.desiredVehicleType[0]}
                </span>
              )}
              {customer.budget && (
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-emerald-100 text-emerald-700">
                  {customer.budget}
                </span>
              )}
              {customer.purchaseTiming && (
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-sky-100 text-sky-700">
                  {customer.purchaseTiming}
                </span>
              )}
            </div>
          )}

          {/* 見積情報 */}
          {estimate && (
            <div className="mt-2 p-2 bg-amber-50 rounded-md border border-amber-200">
              <div className="flex items-center justify-between mb-1">
                <span className="text-[10px] text-amber-700 font-semibold">見積あり</span>
                {estimate.salesRepName && (
                  <span
                    className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[9px] text-white font-medium"
                    style={{ backgroundColor: estimate.salesRepColor || '#6b7280' }}
                  >
                    {estimate.salesRepName}
                  </span>
                )}
              </div>
              <div className="text-xs text-amber-800 font-semibold">
                {estimate.vehicleName || '車両未選択'}
              </div>
              {estimate.totalAmount > 0 && (
                <div className="text-[11px] text-amber-600 mt-0.5">
                  {formatCurrency(estimate.totalAmount)}
                </div>
              )}
            </div>
          )}

          {/* 日付情報 */}
          <div className="flex items-center gap-1.5 text-[10px] text-slate-400 mt-2 pt-2 border-t border-slate-100">
            <span>登録: {formatDate(customer.createdAt)}</span>
            <span className="text-slate-300">|</span>
            <span>最終連絡: {formatRelativeDate(customer.lastContactedAt)}</span>
          </div>
        </div>
      </Link>
    </div>
  )
}

// ステータスに応じた色を取得
function getStatusColor(status: CustomerStatus): string {
  switch (status) {
    case CustomerStatus.NEW: return 'bg-blue-500'
    case CustomerStatus.RANK_N: return 'bg-emerald-500'
    case CustomerStatus.RANK_C: return 'bg-amber-500'
    case CustomerStatus.RANK_B: return 'bg-purple-500'
    case CustomerStatus.RANK_A: return 'bg-pink-500'
    default: return 'bg-slate-500'
  }
}

// カンバンカラムコンポーネント
function KanbanColumn({
  stage,
  customers,
  onDragStart,
  onDragOver,
  onDrop,
  isDropTarget,
  draggingCustomerId,
  estimatesByCustomer,
  highlightedCustomerId,
  highlightedRef
}: {
  stage: typeof KANBAN_STAGES[0]
  customers: Customer[]
  onDragStart: (e: DragEvent<HTMLDivElement>, customer: Customer) => void
  onDragOver: (e: DragEvent<HTMLDivElement>) => void
  onDrop: (e: DragEvent<HTMLDivElement>, status: CustomerStatus) => void
  isDropTarget: boolean
  draggingCustomerId: string | null
  estimatesByCustomer: Record<string, Estimate>
  highlightedCustomerId?: string | null
  highlightedRef?: React.RefObject<HTMLDivElement>
}) {
  return (
    <div className="flex-shrink-0 w-72">
      <div
        className={`h-full rounded-xl transition-all duration-200 ${
          isDropTarget ? 'bg-blue-50 ring-2 ring-blue-300 ring-inset' : 'bg-slate-50/50'
        }`}
        onDragOver={onDragOver}
        onDrop={(e) => onDrop(e, stage.status)}
      >
        {/* カラムヘッダー */}
        <div className="flex items-center gap-2 px-3 py-3 mb-1">
          <span className={`w-2.5 h-2.5 rounded-full ${getStatusColor(stage.status)}`}></span>
          <span className="text-sm font-semibold text-slate-700">{stage.label}</span>
          <span className="text-xs font-medium text-slate-400 bg-slate-200 px-1.5 py-0.5 rounded-full">{customers.length}</span>
        </div>

        {/* カラムコンテンツ */}
        <div className="px-2 pb-3 overflow-y-auto" style={{ maxHeight: 'calc(100vh - 260px)' }}>
          {customers.map((customer) => (
            <CustomerCard
              key={customer.id}
              customer={customer}
              onDragStart={onDragStart}
              isDragging={draggingCustomerId === customer.id}
              estimate={estimatesByCustomer[customer.id]}
              isHighlighted={highlightedCustomerId === customer.id}
              cardRef={highlightedCustomerId === customer.id ? highlightedRef : undefined}
            />
          ))}
          {/* 新規追加ボタン */}
          <button className="w-full px-3 py-2 text-sm text-slate-400 hover:text-slate-600 hover:bg-white rounded-lg flex items-center gap-1.5 transition-colors duration-150">
            <Plus className="h-4 w-4" />
            <span>新規プロジェクト</span>
          </button>
        </div>
      </div>
    </div>
  )
}

export default function CustomersPage() {
  const [searchQuery, setSearchQuery] = useState('')
  const [salesRepFilter, setSalesRepFilter] = useState<string>('all')
  const [draggingCustomer, setDraggingCustomer] = useState<Customer | null>(null)
  const [dropTargetStatus, setDropTargetStatus] = useState<CustomerStatus | null>(null)
  const queryClient = useQueryClient()
  const searchParams = useSearchParams()
  const highlightedCustomerId = searchParams.get('highlight')
  const highlightedRef = useRef<HTMLDivElement>(null)

  // 設定ストアから営業担当者リストを取得
  const { salesReps } = useSettingsStore()

  // 見積ストアから見積一覧を取得
  const { estimates } = useEstimateStore()

  // 顧客IDごとの最新見積をマッピング
  const estimatesByCustomer = useMemo(() => {
    const map: Record<string, Estimate> = {}
    estimates.forEach(est => {
      if (est.customerId) {
        // 同じ顧客に複数見積がある場合は最新のものを使用
        if (!map[est.customerId] || new Date(est.updatedAt) > new Date(map[est.customerId].updatedAt)) {
          map[est.customerId] = est
        }
      }
    })
    return map
  }, [estimates])

  // 営業担当者フィルターオプションを動的に生成
  const salesRepOptions = useMemo(() => [
    { name: '全員', value: 'all', color: '' },
    ...salesReps.map(rep => ({ name: rep.name, value: rep.name, color: rep.color })),
    { name: '未割当', value: 'unassigned', color: 'bg-gray-100 text-gray-700' },
  ], [salesReps])

  // 共有ストアを使用
  const {
    customers: storeCustomers,
    isInitialized,
    initializeCustomers,
    updateCustomerStatus,
    addCustomers,
  } = useCustomerStore()

  // 新規顧客追加モーダル
  const [showAddModal, setShowAddModal] = useState(false)
  const [newCustomer, setNewCustomer] = useState({
    name: '',
    nameKana: '',
    phone: '',
    email: '',
    postalCode: '',
    address: '',
    source: '',
  })

  const { data: fetchedCustomers, isLoading } = useQuery<Customer[]>({
    queryKey: ['customers'],
    queryFn: async () => {
      try {
        const response = await api.get('/customers')
        return response.data
      } catch (error) {
        // API接続失敗時はモックデータを使用
        console.log('Using mock data for customers')
        return mockCustomers
      }
    },
  })

  // 初回データ読み込み時にストアを初期化
  useEffect(() => {
    if (fetchedCustomers && !isInitialized) {
      initializeCustomers(fetchedCustomers)
    }
  }, [fetchedCustomers, isInitialized, initializeCustomers])

  // ストアのデータを使用（初期化前はfetchedCustomersを使用）
  const customers = isInitialized ? storeCustomers : fetchedCustomers

  // ハイライトされた顧客へスクロール
  useEffect(() => {
    if (highlightedCustomerId && highlightedRef.current && customers) {
      // 少し遅延してスクロール（DOMがレンダリングされるのを待つ）
      setTimeout(() => {
        highlightedRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })
      }, 300)
    }
  }, [highlightedCustomerId, customers])

  // ドラッグ開始
  const handleDragStart = (e: DragEvent<HTMLDivElement>, customer: Customer) => {
    setDraggingCustomer(customer)
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('text/plain', customer.id)
  }

  // ドラッグオーバー
  const handleDragOver = (e: DragEvent<HTMLDivElement>, status: CustomerStatus) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    if (draggingCustomer && draggingCustomer.status !== status) {
      setDropTargetStatus(status)
    }
  }

  // ドラッグ終了
  const handleDragEnd = () => {
    setDraggingCustomer(null)
    setDropTargetStatus(null)
  }

  // ドロップ
  const handleDrop = (e: DragEvent<HTMLDivElement>, newStatus: CustomerStatus) => {
    e.preventDefault()

    if (!draggingCustomer || draggingCustomer.status === newStatus) {
      handleDragEnd()
      return
    }

    // ストアを更新（顧客管理リストと共有）
    updateCustomerStatus(draggingCustomer.id, newStatus)

    console.log(`顧客 "${draggingCustomer.name}" のステータスを "${newStatus}" に変更しました`)

    handleDragEnd()
  }

  // 新規顧客追加
  const handleAddCustomer = () => {
    if (!newCustomer.name.trim()) {
      alert('顧客名を入力してください')
      return
    }

    const now = new Date().toISOString()
    const newId = `cust-${Date.now()}`
    const customerNumber = `C${String(Date.now()).slice(-8)}`

    const customer: Customer = {
      id: newId,
      customerNumber,
      name: newCustomer.name.trim(),
      nameKana: newCustomer.nameKana.trim() || undefined,
      phone: newCustomer.phone.trim() || undefined,
      email: newCustomer.email.trim() || undefined,
      postalCode: newCustomer.postalCode.trim() || undefined,
      address: newCustomer.address.trim() || undefined,
      source: newCustomer.source.trim() || undefined,
      status: CustomerStatus.NEW,
      createdAt: now,
      updatedAt: now,
    }

    addCustomers([customer])

    // フォームをリセット
    setNewCustomer({
      name: '',
      nameKana: '',
      phone: '',
      email: '',
      postalCode: '',
      address: '',
      source: '',
    })
    setShowAddModal(false)
  }

  // 検索と営業担当者でフィルタリング
  const filteredCustomers = useMemo(() => {
    if (!customers) return []

    let result = customers

    // 営業担当者フィルター
    if (salesRepFilter !== 'all') {
      if (salesRepFilter === 'unassigned') {
        result = result.filter(customer => !customer.assignedSalesRepName)
      } else {
        result = result.filter(customer => customer.assignedSalesRepName === salesRepFilter)
      }
    }

    // 検索フィルター
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      result = result.filter(customer =>
        customer.name.toLowerCase().includes(query) ||
        customer.email?.toLowerCase().includes(query) ||
        customer.phone?.includes(query)
      )
    }

    return result
  }, [customers, searchQuery, salesRepFilter])

  // ステージごとに顧客を分類（新規〜ランクAまで、契約は除外）
  const customersByStage = useMemo(() => {
    const result: Partial<Record<CustomerStatus, Customer[]>> = {
      [CustomerStatus.NEW]: [],
      [CustomerStatus.RANK_N]: [],
      [CustomerStatus.RANK_C]: [],
      [CustomerStatus.RANK_B]: [],
      [CustomerStatus.RANK_A]: [],
    }

    // カンバン対象の顧客をフィルタリング（契約ステータスは除外）
    filteredCustomers.forEach(customer => {
      const status = customer.status
      if (status === CustomerStatus.NEW || status === CustomerStatus.RANK_N ||
          status === CustomerStatus.RANK_C || status === CustomerStatus.RANK_B ||
          status === CustomerStatus.RANK_A) {
        result[status]?.push(customer)
      }
    })

    return result
  }, [filteredCustomers])

  return (
    <div className="h-full flex flex-col" onDragEnd={handleDragEnd}>
      {/* ヘッダー */}
      <div className="flex-shrink-0 px-6 py-4 bg-white border-b border-slate-200">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-800">顧客カンバン</h1>
            <p className="text-sm text-slate-500 mt-0.5">見込み顧客をランク別に管理 • カードをドラッグして移動</p>
          </div>
          <div className="flex items-center gap-2">
            <Link href="/dashboard/scan">
              <Button variant="outline" className="border-slate-300 text-slate-700 hover:bg-slate-50">
                <Camera className="mr-2 h-4 w-4" />
                スキャン登録
              </Button>
            </Link>
            <Button onClick={() => setShowAddModal(true)} className="bg-slate-800 hover:bg-slate-700">
              <Plus className="mr-2 h-4 w-4" />
              新規顧客登録
            </Button>
          </div>
        </div>

        {/* 検索バーと営業担当者フィルター */}
        <div className="flex items-center gap-4">
          <div className="flex items-center space-x-2 flex-1 max-w-md">
            <Search className="h-4 w-4 text-slate-400" />
            <Input
              placeholder="顧客名、メール、電話番号で検索..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="flex-1 border-slate-200 focus:border-slate-400"
            />
          </div>

          {/* 営業担当者フィルター */}
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-slate-400" />
            <select
              value={salesRepFilter}
              onChange={(e) => setSalesRepFilter(e.target.value)}
              className="h-10 px-3 py-2 rounded-lg border border-slate-200 bg-white text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-slate-400 focus:border-transparent transition-all"
            >
              {salesRepOptions.map((rep) => (
                <option key={rep.value} value={rep.value}>
                  {rep.name}
                </option>
              ))}
            </select>
          </div>

          {/* 現在のフィルター表示 */}
          {salesRepFilter !== 'all' && (
            <div className="flex items-center gap-2">
              <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${
                salesRepOptions.find(r => r.value === salesRepFilter)?.color || 'bg-slate-100 text-slate-700'
              }`}>
                {salesRepOptions.find(r => r.value === salesRepFilter)?.name}
                <button
                  onClick={() => setSalesRepFilter('all')}
                  className="ml-1.5 hover:text-slate-900"
                >
                  ×
                </button>
              </span>
            </div>
          )}
        </div>
      </div>

      {/* カンバンボード */}
      <div className="flex-1 overflow-x-auto p-4 bg-slate-100/50">
        {isLoading ? (
          <div className="flex items-center justify-center h-64">
            <div className="text-slate-500">読み込み中...</div>
          </div>
        ) : (
          <div className="flex gap-3 h-full">
            {KANBAN_STAGES.map((stage) => (
              <KanbanColumn
                key={stage.status}
                stage={stage}
                customers={customersByStage[stage.status] || []}
                onDragStart={handleDragStart}
                onDragOver={(e) => handleDragOver(e, stage.status)}
                onDrop={handleDrop}
                isDropTarget={dropTargetStatus === stage.status}
                draggingCustomerId={draggingCustomer?.id || null}
                estimatesByCustomer={estimatesByCustomer}
                highlightedCustomerId={highlightedCustomerId}
                highlightedRef={highlightedRef}
              />
            ))}
          </div>
        )}
      </div>

      {/* 新規顧客追加モーダル */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md p-6 border border-slate-200">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-bold text-slate-800">新規顧客登録</h2>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-slate-400 hover:text-slate-600 transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  顧客名 <span className="text-red-500">*</span>
                </label>
                <Input
                  value={newCustomer.name}
                  onChange={(e) => setNewCustomer({ ...newCustomer, name: e.target.value })}
                  placeholder="例: 山田 太郎"
                  className="border-slate-200"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  フリガナ
                </label>
                <Input
                  value={newCustomer.nameKana}
                  onChange={(e) => setNewCustomer({ ...newCustomer, nameKana: e.target.value })}
                  placeholder="例: ヤマダ タロウ"
                  className="border-slate-200"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    電話番号
                  </label>
                  <Input
                    value={newCustomer.phone}
                    onChange={(e) => setNewCustomer({ ...newCustomer, phone: e.target.value })}
                    placeholder="例: 090-1234-5678"
                    className="border-slate-200"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    メール
                  </label>
                  <Input
                    type="email"
                    value={newCustomer.email}
                    onChange={(e) => setNewCustomer({ ...newCustomer, email: e.target.value })}
                    placeholder="例: yamada@example.com"
                    className="border-slate-200"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    郵便番号
                  </label>
                  <Input
                    value={newCustomer.postalCode}
                    onChange={(e) => setNewCustomer({ ...newCustomer, postalCode: e.target.value })}
                    placeholder="例: 123-4567"
                    className="border-slate-200"
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    住所
                  </label>
                  <Input
                    value={newCustomer.address}
                    onChange={(e) => setNewCustomer({ ...newCustomer, address: e.target.value })}
                    placeholder="例: 東京都渋谷区..."
                    className="border-slate-200"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  来店経路（展示会など）
                </label>
                <Input
                  value={newCustomer.source}
                  onChange={(e) => setNewCustomer({ ...newCustomer, source: e.target.value })}
                  placeholder="例: 東京キャンピングカーショー2025"
                  className="border-slate-200"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 mt-6">
              <Button
                variant="outline"
                onClick={() => setShowAddModal(false)}
                className="border-slate-300 text-slate-700 hover:bg-slate-50"
              >
                キャンセル
              </Button>
              <Button onClick={handleAddCustomer} className="bg-slate-800 hover:bg-slate-700">
                登録
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
