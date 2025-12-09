'use client'

import { useState, useMemo, useEffect } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { useQuery } from '@tanstack/react-query'
import api from '@/lib/api'
import { Customer, CustomerStatus } from '@/types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  FileText,
  Plus,
  Search,
  Trash2,
  Edit,
  Eye,
  Printer,
  Download,
  Copy,
  Users,
  Car,
  X,
  Check,
  Settings,
  CheckCircle,
} from 'lucide-react'
import { useEstimateStore, Estimate, EstimateItem, Vehicle, VehicleOption, getVehicleModels, getVehicleGrades, vehicleCategories, getVehicleCategory, getCategoryName, EstimateRank } from '@/stores/estimate-store'
import { useSettingsStore, OptionParentGroupType } from '@/stores/settings-store'
import { useCustomerStore } from '@/stores/customer-store'
import { mockCustomers } from '@/lib/mock-data'

// 金額フォーマット
function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('ja-JP', { style: 'currency', currency: 'JPY' }).format(amount)
}

// 日付フォーマット
function formatDate(dateString: string): string {
  const date = new Date(dateString)
  return `${date.getFullYear()}/${date.getMonth() + 1}/${date.getDate()}`
}

// ステータスバッジ
function StatusBadge({ status }: { status: Estimate['status'] }) {
  const statusConfig = {
    draft: { label: '下書き', color: 'bg-gray-100 text-gray-700' },
    sent: { label: '送付済', color: 'bg-blue-100 text-blue-700' },
    accepted: { label: '成約', color: 'bg-green-100 text-green-700' },
    rejected: { label: '失注', color: 'bg-red-100 text-red-700' },
  }
  const config = statusConfig[status]
  return (
    <span className={`px-2 py-1 rounded-full text-xs font-medium ${config.color}`}>
      {config.label}
    </span>
  )
}

export default function EstimatesPage() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const [searchQuery, setSearchQuery] = useState('')
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [showPreviewModal, setShowPreviewModal] = useState(false)
  const [selectedEstimate, setSelectedEstimate] = useState<Estimate | null>(null)
  const [selectedSalesRep, setSelectedSalesRep] = useState<string>('all') // 担当者フィルタ
  const [selectedRank, setSelectedRank] = useState<EstimateRank | 'all'>('all') // ランクフィルタ

  const {
    estimates,
    vehicles,
    options,
    addEstimate,
    updateEstimate,
    deleteEstimate,
    getEstimate,
    createNewEstimate,
    calculateEstimate,
    generateEstimateNo
  } = useEstimateStore()

  // 担当者リストを取得
  const { salesReps } = useSettingsStore()

  // 顧客ストアから顧客データと更新メソッドを取得
  const { customers: storeCustomers, isInitialized, initializeCustomers, updateCustomerFromEstimate, addCustomers } = useCustomerStore()

  // APIから顧客データを取得
  const { data: fetchedCustomers } = useQuery<Customer[]>({
    queryKey: ['customers'],
    queryFn: async () => {
      try {
        const response = await api.get('/customers')
        return response.data
      } catch (error) {
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

  // 顧客データ（ストア優先、なければフェッチデータ、なければモック）
  const customers = isInitialized ? storeCustomers : (fetchedCustomers || mockCustomers)

  // URLパラメータから顧客情報または編集対象の見積もりを取得
  useEffect(() => {
    const customerId = searchParams.get('customerId')
    const customerName = searchParams.get('customerName')
    const editId = searchParams.get('edit')

    if (editId) {
      // 既存の見積もりを編集
      const estimate = getEstimate(editId)
      if (estimate) {
        setSelectedEstimate(estimate)
        setShowEditModal(true)
      }
    } else if (customerId || customerName) {
      // 新規見積もりを顧客情報付きで作成
      const newEstimate = createNewEstimate(customerId || '', customerName || '')
      setSelectedEstimate(newEstimate)
      setShowEditModal(true)
    }
  }, [searchParams, getEstimate, createNewEstimate])

  // 担当者一覧（見積もりに設定されている担当者）
  const salesRepList = useMemo(() => {
    const reps = new Set<string>()
    estimates.forEach(e => {
      if (e.salesRepName) reps.add(e.salesRepName)
    })
    return Array.from(reps).sort()
  }, [estimates])

  // 検索・フィルタ
  const filteredEstimates = useMemo(() => {
    return estimates.filter(e => {
      // 検索クエリフィルタ
      const matchesSearch =
        e.customerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        e.estimateNo.toLowerCase().includes(searchQuery.toLowerCase()) ||
        e.vehicleName.toLowerCase().includes(searchQuery.toLowerCase())

      // 担当者フィルタ
      const matchesSalesRep = selectedSalesRep === 'all' || e.salesRepName === selectedSalesRep

      // ランクフィルタ
      const matchesRank = selectedRank === 'all' || e.rank === selectedRank

      return matchesSearch && matchesSalesRep && matchesRank
    }).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
  }, [estimates, searchQuery, selectedSalesRep, selectedRank])

  // 新規見積作成
  const handleCreateNew = (customerId?: string, customerName?: string) => {
    const newEstimate = createNewEstimate(customerId, customerName)
    const customer = customers.find(c => c.id === customerId)
    if (customer) {
      newEstimate.customerName = customer.name
      newEstimate.phone = customer.phone || ''
      newEstimate.email = customer.email || ''
      newEstimate.address = customer.address || ''
    }
    setSelectedEstimate(newEstimate)
    setShowCreateModal(false)
    setShowEditModal(true)
  }

  // 編集開始
  const handleEdit = (estimate: Estimate) => {
    setSelectedEstimate({ ...estimate })
    setShowEditModal(true)
  }

  // プレビュー
  const handlePreview = (estimate: Estimate) => {
    setSelectedEstimate(estimate)
    setShowPreviewModal(true)
  }

  // 複製
  const handleDuplicate = (estimate: Estimate) => {
    const duplicated = {
      ...estimate,
      id: `est-${Date.now()}`,
      estimateNo: generateEstimateNo(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      status: 'draft' as const,
    }
    addEstimate(duplicated)
  }

  // 削除
  const handleDelete = (id: string) => {
    if (confirm('この見積書を削除しますか？')) {
      deleteEstimate(id)
    }
  }

  // 契約（ステータスをacceptedに変更して原価計算ページへ）
  const handleContract = (estimate: Estimate) => {
    if (confirm(`「${estimate.customerName || '未入力'}」の見積もりを契約に変更しますか？\n\n原価計算ページに移動します。`)) {
      updateEstimate(estimate.id, { status: 'accepted' })
      router.push(`/dashboard/quotes?id=${estimate.id}`)
    }
  }

  // 印刷
  const handlePrint = () => {
    window.print()
  }

  return (
    <div className="h-full flex flex-col">
      {/* ヘッダー */}
      <div className="flex-shrink-0 px-6 py-4 bg-white border-b">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">見積書作成</h1>
            <p className="text-sm text-gray-600 mt-0.5">車両見積書の作成・管理</p>
          </div>
          <Button onClick={() => setShowCreateModal(true)} className="bg-blue-600 hover:bg-blue-700">
            <Plus className="h-4 w-4 mr-2" />
            新規見積作成
          </Button>
        </div>

        {/* 統計カード */}
        <div className="grid grid-cols-4 gap-4 mb-4">
          <div className="bg-gray-50 rounded-lg p-4 border border-gray-100">
            <div className="flex items-center gap-2 mb-1">
              <FileText className="h-4 w-4 text-gray-600" />
              <span className="text-xs text-gray-600 font-medium">総見積数</span>
            </div>
            <p className="text-2xl font-bold text-gray-700">{estimates.length}件</p>
          </div>
          <div className="bg-blue-50 rounded-lg p-4 border border-blue-100">
            <div className="flex items-center gap-2 mb-1">
              <FileText className="h-4 w-4 text-blue-600" />
              <span className="text-xs text-blue-600 font-medium">下書き</span>
            </div>
            <p className="text-2xl font-bold text-blue-700">
              {estimates.filter(e => e.status === 'draft').length}件
            </p>
          </div>
          <div className="bg-green-50 rounded-lg p-4 border border-green-100">
            <div className="flex items-center gap-2 mb-1">
              <Check className="h-4 w-4 text-green-600" />
              <span className="text-xs text-green-600 font-medium">成約</span>
            </div>
            <p className="text-2xl font-bold text-green-700">
              {estimates.filter(e => e.status === 'accepted').length}件
            </p>
          </div>
          <div className="bg-yellow-50 rounded-lg p-4 border border-yellow-100">
            <div className="flex items-center gap-2 mb-1">
              <FileText className="h-4 w-4 text-yellow-600" />
              <span className="text-xs text-yellow-600 font-medium">送付済</span>
            </div>
            <p className="text-2xl font-bold text-yellow-700">
              {estimates.filter(e => e.status === 'sent').length}件
            </p>
          </div>
        </div>

        {/* 担当者タブ */}
        <div className="mb-4">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-medium text-gray-600 mr-2">担当者:</span>
            <button
              onClick={() => setSelectedSalesRep('all')}
              className={`px-3 py-1.5 text-sm rounded-full transition-colors ${
                selectedSalesRep === 'all'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              全員
            </button>
            {salesReps.map(rep => {
              // ランクフィルタを考慮したカウント
              const count = estimates.filter(e =>
                e.salesRepName === rep.name &&
                (selectedRank === 'all' || e.rank === selectedRank)
              ).length
              // rep.colorはTailwindクラス名（例: 'bg-red-100 text-red-700'）
              const bgClass = rep.color.split(' ')[0] // 'bg-red-100'
              const textClass = rep.color.split(' ')[1] || 'text-gray-700' // 'text-red-700'
              // 選択時用の濃い色クラスを生成
              const darkBgClass = bgClass.replace('-100', '-500')
              return (
                <button
                  key={rep.id}
                  onClick={() => setSelectedSalesRep(rep.name)}
                  className={`px-3 py-1.5 text-sm rounded-full transition-colors flex items-center gap-1.5 border ${
                    selectedSalesRep === rep.name
                      ? `${darkBgClass} text-white border-transparent`
                      : `${bgClass} ${textClass} border-current hover:opacity-80`
                  }`}
                >
                  <span
                    className={`w-2 h-2 rounded-full ${
                      selectedSalesRep === rep.name ? 'bg-white' : darkBgClass
                    }`}
                  />
                  {rep.name}
                  <span className={`text-xs ${selectedSalesRep === rep.name ? 'text-white/80' : 'opacity-60'}`}>
                    ({count})
                  </span>
                </button>
              )
            })}
          </div>
        </div>

        {/* ランクタブ */}
        <div className="mb-4">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-gray-600 mr-2">ランク:</span>
            <button
              onClick={() => setSelectedRank('all')}
              className={`px-3 py-1.5 text-sm rounded-full transition-colors ${
                selectedRank === 'all'
                  ? 'bg-gray-700 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              全て
            </button>
            {(['A', 'B', 'C'] as EstimateRank[]).map(rank => {
              // 担当者フィルタを考慮したカウント
              const count = estimates.filter(e =>
                e.rank === rank &&
                (selectedSalesRep === 'all' || e.salesRepName === selectedSalesRep)
              ).length
              const rankColors = {
                A: { bg: 'bg-red-500', light: 'bg-red-100 text-red-700' },
                B: { bg: 'bg-yellow-500', light: 'bg-yellow-100 text-yellow-700' },
                C: { bg: 'bg-green-500', light: 'bg-green-100 text-green-700' },
              }
              return (
                <button
                  key={rank}
                  onClick={() => setSelectedRank(rank)}
                  className={`px-3 py-1.5 text-sm rounded-full transition-colors ${
                    selectedRank === rank
                      ? `${rankColors[rank].bg} text-white`
                      : `${rankColors[rank].light} hover:opacity-80`
                  }`}
                >
                  ランク{rank} ({count})
                </button>
              )
            })}
          </div>
        </div>

        {/* 検索バー */}
        <div className="flex items-center space-x-2 max-w-md">
          <Search className="h-4 w-4 text-gray-400" />
          <Input
            placeholder="顧客名、見積番号、車種で検索..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="flex-1"
          />
        </div>
      </div>

      {/* 見積一覧 */}
      <div className="flex-1 overflow-auto p-6">
        {filteredEstimates.length === 0 ? (
          <div className="text-center py-12">
            <FileText className="h-12 w-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">見積書がありません</p>
            <Button
              onClick={() => setShowCreateModal(true)}
              variant="outline"
              className="mt-4"
            >
              <Plus className="h-4 w-4 mr-2" />
              最初の見積書を作成
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredEstimates.map((estimate) => {
              const salesRepInfo = salesReps.find(r => r.name === estimate.salesRepName)
              const rankColors = {
                A: 'bg-red-100 text-red-700 border-red-300',
                B: 'bg-yellow-100 text-yellow-700 border-yellow-300',
                C: 'bg-green-100 text-green-700 border-green-300',
              }
              return (
                <div
                  key={estimate.id}
                  className="bg-white border rounded-lg p-4 hover:shadow-md transition-shadow"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <span className="font-mono text-sm text-gray-500">{estimate.estimateNo}</span>
                        <StatusBadge status={estimate.status} />
                        {/* ランクバッジ */}
                        {estimate.rank && (
                          <span className={`px-2 py-0.5 text-xs font-bold rounded border ${rankColors[estimate.rank]}`}>
                            {estimate.rank}
                          </span>
                        )}
                        {/* 担当者バッジ */}
                        {estimate.salesRepName && salesRepInfo && (
                          <span
                            className={`px-2 py-0.5 text-xs font-medium rounded-full ${salesRepInfo.color}`}
                          >
                            {estimate.salesRepName}
                          </span>
                        )}
                      </div>
                      {estimate.customerId ? (
                        <Link
                          href={`/dashboard/customers?highlight=${estimate.customerId}`}
                          className="text-lg font-semibold text-blue-600 hover:text-blue-800 hover:underline"
                          title="顧客カンバンで表示"
                        >
                          {estimate.customerName || '顧客未設定'}
                        </Link>
                      ) : (
                        <h3 className="text-lg font-semibold text-gray-900">{estimate.customerName || '顧客未設定'}</h3>
                      )}
                      <div className="flex items-center gap-4 mt-1 text-sm text-gray-600">
                        <span className="flex items-center gap-1">
                          <Car className="h-4 w-4" />
                          {estimate.vehicleName || '車両未選択'}
                        </span>
                        <span>{formatDate(estimate.createdAt)}</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-bold text-gray-900">
                        {formatCurrency(estimate.totalAmount)}
                      </p>
                      <div className="flex items-center gap-2 mt-2">
                        <button
                          onClick={() => handlePreview(estimate)}
                          className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded"
                          title="プレビュー"
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleEdit(estimate)}
                          className="p-2 text-gray-500 hover:text-green-600 hover:bg-green-50 rounded"
                          title="編集"
                        >
                          <Edit className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDuplicate(estimate)}
                          className="p-2 text-gray-500 hover:text-purple-600 hover:bg-purple-50 rounded"
                          title="複製"
                        >
                          <Copy className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(estimate.id)}
                          className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded"
                          title="削除"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                        {estimate.status !== 'accepted' && (
                          <button
                            onClick={() => handleContract(estimate)}
                            className="p-2 text-green-600 hover:text-green-700 hover:bg-green-50 rounded"
                            title="契約"
                          >
                            <CheckCircle className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* 新規作成モーダル - 顧客選択 */}
      {showCreateModal && (
        <CustomerSelectModal
          customers={customers}
          onSelect={(customerId, customerName) => handleCreateNew(customerId, customerName)}
          onClose={() => setShowCreateModal(false)}
        />
      )}

      {/* 編集モーダル */}
      {showEditModal && selectedEstimate && (
        <EstimateEditModal
          estimate={selectedEstimate}
          vehicles={vehicles}
          options={options}
          customers={customers}
          onSave={(updated, openPrint = false) => {
            const calcs = calculateEstimate(updated)
            let finalEstimate = { ...updated, ...calcs }

            // 新規顧客の場合（customerIdがないが顧客名がある場合）
            if (!finalEstimate.customerId && finalEstimate.customerName) {
              // 新しい顧客IDを生成
              const newCustomerId = `cust-${Date.now()}`
              finalEstimate = { ...finalEstimate, customerId: newCustomerId }

              // 顧客ストアに新規顧客を追加
              const newCustomer: Customer = {
                id: newCustomerId,
                customerNumber: `C${String(Date.now()).slice(-5)}`,
                name: finalEstimate.customerName,
                nameKana: '',
                email: finalEstimate.email || '',
                phone: finalEstimate.phone || '',
                postalCode: finalEstimate.postalCode || '',
                address: finalEstimate.address || '',
                source: 'estimate',
                status: finalEstimate.rank === 'A' ? CustomerStatus.RANK_A :
                        finalEstimate.rank === 'B' ? CustomerStatus.RANK_B :
                        finalEstimate.rank === 'C' ? CustomerStatus.RANK_C : CustomerStatus.NEW,
                assignedSalesRepName: finalEstimate.salesRepName || '',
                assignedSalesRepColor: finalEstimate.salesRepColor || '',
                interestedCars: finalEstimate.vehicleName ? [finalEstimate.vehicleName] : [],
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
              }
              addCustomers([newCustomer])
            }

            if (estimates.find(e => e.id === updated.id)) {
              updateEstimate(updated.id, finalEstimate)
            } else {
              addEstimate(finalEstimate)
            }

            // 既存顧客の場合は顧客情報を見積もりデータで更新（担当者、ランク、検討車種）
            if (finalEstimate.customerId && customers.find(c => c.id === finalEstimate.customerId)) {
              updateCustomerFromEstimate(finalEstimate.customerId, {
                salesRepName: finalEstimate.salesRepName,
                salesRepColor: finalEstimate.salesRepColor,
                rank: finalEstimate.rank,
                vehicleName: finalEstimate.vehicleName,
              })
            }

            setShowEditModal(false)
            // 保存後に印刷プレビューを開く
            if (openPrint) {
              setSelectedEstimate(finalEstimate)
              setShowPreviewModal(true)
            } else {
              setSelectedEstimate(null)
            }
          }}
          onClose={() => {
            setShowEditModal(false)
            setSelectedEstimate(null)
          }}
          calculateEstimate={calculateEstimate}
        />
      )}

      {/* プレビューモーダル */}
      {showPreviewModal && selectedEstimate && (
        <EstimatePreviewModal
          estimate={selectedEstimate}
          onClose={() => {
            setShowPreviewModal(false)
            setSelectedEstimate(null)
          }}
          onPrint={handlePrint}
        />
      )}
    </div>
  )
}

// 顧客選択モーダル
function CustomerSelectModal({
  customers,
  onSelect,
  onClose
}: {
  customers: any[]
  onSelect: (customerId?: string, customerName?: string) => void
  onClose: () => void
}) {
  const [search, setSearch] = useState('')

  const filtered = customers.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    (c.phone && c.phone.includes(search))
  )

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-lg max-h-[80vh] overflow-hidden">
        <div className="p-4 border-b flex items-center justify-between">
          <h2 className="text-lg font-bold">顧客を選択</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-4 border-b">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="顧客名または電話番号で検索..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        <div className="overflow-y-auto max-h-80">
          <button
            onClick={() => onSelect(undefined, '')}
            className="w-full p-4 text-left hover:bg-gray-50 border-b flex items-center gap-3"
          >
            <div className="h-10 w-10 rounded-full bg-gray-200 flex items-center justify-center">
              <Plus className="h-5 w-5 text-gray-500" />
            </div>
            <div>
              <p className="font-medium text-gray-700">新規顧客で作成</p>
              <p className="text-sm text-gray-500">顧客情報を後から入力</p>
            </div>
          </button>

          {filtered.map((customer) => (
            <button
              key={customer.id}
              onClick={() => onSelect(customer.id, customer.name)}
              className="w-full p-4 text-left hover:bg-blue-50 border-b flex items-center gap-3"
            >
              <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-semibold">
                {customer.name.charAt(0)}
              </div>
              <div className="flex-1">
                <p className="font-medium text-gray-900">{customer.name}</p>
                <p className="text-sm text-gray-500">{customer.phone || 'TEL未登録'}</p>
              </div>
              {customer.interestedCars && customer.interestedCars.length > 0 && (
                <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded">
                  {customer.interestedCars[0]}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

// 見積編集モーダル
function EstimateEditModal({
  estimate,
  vehicles,
  options,
  customers,
  onSave,
  onClose,
  calculateEstimate
}: {
  estimate: Estimate
  vehicles: Vehicle[]
  options: VehicleOption[]
  customers: any[]
  onSave: (estimate: Estimate, openPrint?: boolean) => void
  onClose: () => void
  calculateEstimate: (estimate: Partial<Estimate>) => any
}) {
  const [form, setForm] = useState<Estimate>(estimate)
  const [activeTab, setActiveTab] = useState<'customer' | 'vehicle' | 'options' | 'details' | 'fees' | 'summary'>('customer')

  // 車種選択のステップ管理（3段階: カテゴリ → 車種 → グレード）
  const [selectedVehicleCategory, setSelectedVehicleCategory] = useState<string>('')
  const [selectedModelName, setSelectedModelName] = useState<string>('')
  const [vehicleSearchQuery, setVehicleSearchQuery] = useState('')

  // モデル名一覧を取得
  const vehicleModels = useMemo(() => getVehicleModels(), [])

  // 選択されたカテゴリの車種一覧
  const filteredModelsByCategory = useMemo(() => {
    if (!selectedVehicleCategory) return []
    const allVehicles = vehicles
    const modelsInCategory = new Set<string>()
    allVehicles.forEach(v => {
      const vCat = v.category || getVehicleCategory(v.baseVehicle, v.modelName)
      if (vCat === selectedVehicleCategory) {
        modelsInCategory.add(v.modelName)
      }
    })
    let models = Array.from(modelsInCategory)
    if (vehicleSearchQuery) {
      models = models.filter(m => m.toLowerCase().includes(vehicleSearchQuery.toLowerCase()))
    }
    return models
  }, [selectedVehicleCategory, vehicles, vehicleSearchQuery])

  // 選択されたモデルのグレード一覧
  const vehicleGrades = useMemo(() => {
    if (!selectedModelName) return []
    return getVehicleGrades(selectedModelName)
  }, [selectedModelName])

  // カテゴリ別車両数
  const vehicleCountByCategory = useMemo(() => {
    const counts: Record<string, number> = {}
    vehicles.forEach(v => {
      const cat = v.category || getVehicleCategory(v.baseVehicle, v.modelName)
      counts[cat] = (counts[cat] || 0) + 1
    })
    return counts
  }, [vehicles])

  // 検索フィルター適用（全カテゴリ検索用）
  const filteredModels = useMemo(() => {
    if (!vehicleSearchQuery) return vehicleModels
    return vehicleModels.filter(m =>
      m.toLowerCase().includes(vehicleSearchQuery.toLowerCase())
    )
  }, [vehicleModels, vehicleSearchQuery])

  // 車両改造オプション一覧（ボディーカテゴリ）
  const modificationOptions = useMemo(() => options.filter(o => o.category === 'ボディー'), [options])

  // オプショングループ設定と担当者リスト、諸費用設定を取得
  const { salesReps, feeItems: storedFeeItems } = useSettingsStore()

  // 既存の見積もりに設定からの追加諸費用を適用
  useEffect(() => {
    if (storedFeeItems && storedFeeItems.length > 0) {
      const standardFeeNames = ['登録代行費用', '車庫証明代行費用', '納車費用', '下取り諸費用']
      const additionalFeeItems = storedFeeItems.filter(f => !standardFeeNames.includes(f.name))

      if (additionalFeeItems.length > 0) {
        // 既存のadditionalFeesにない項目を追加
        const currentFeeIds = (form.additionalFees || []).map(f => f.id)
        const newFees = additionalFeeItems
          .filter(f => !currentFeeIds.includes(f.id))
          .map(f => ({ id: f.id, name: f.name, amount: f.defaultAmount, isTaxable: f.isTaxable ?? true }))

        if (newFees.length > 0) {
          setForm(prev => ({
            ...prev,
            additionalFees: [...(prev.additionalFees || []), ...newFees]
          }))
        }
      }
    }
  }, [storedFeeItems]) // eslint-disable-line react-hooks/exhaustive-deps

  // オプション親グループのタブ状態（A/B）
  const [selectedParentGroup, setSelectedParentGroup] = useState<OptionParentGroupType>('A')

  // 車両グレード選択時
  const handleVehicleSelect = (vehicle: Vehicle) => {
    setForm(prev => ({
      ...prev,
      vehicleId: vehicle.id,
      vehicleName: vehicle.modelName,
      vehicleBase: vehicle.baseVehicle,
      vehicleDrive: vehicle.transmission,
      vehiclePrice: vehicle.basePrice,
      taxEnv: vehicle.environmentTax,
      taxWeight: vehicle.weightTax,
      insurance: vehicle.insurance,
    }))
  }

  // 車両選択リセット
  const handleResetVehicle = () => {
    setForm(prev => ({
      ...prev,
      vehicleId: '',
      vehicleName: '',
      vehicleBase: '',
      vehicleDrive: '',
      vehiclePrice: 0,
      taxEnv: 0,
      taxWeight: 0,
      insurance: 0,
    }))
    setSelectedVehicleCategory('')
    setSelectedModelName('')
  }

  // オプション追加
  const handleAddOption = (option: VehicleOption) => {
    const existing = form.options.find(o => o.optionId === option.id)
    if (existing) return

    const newItem: EstimateItem = {
      id: `item-${Date.now()}`,
      optionId: option.id,
      optionName: option.name,
      quantity: 1,
      unitPrice: option.price,
      amount: option.price,
    }

    setForm(prev => ({
      ...prev,
      options: [...prev.options, newItem]
    }))
  }

  // オプション削除
  const handleRemoveOption = (itemId: string) => {
    setForm(prev => ({
      ...prev,
      options: prev.options.filter(o => o.id !== itemId)
    }))
  }

  // オプション数量変更
  const handleOptionQuantityChange = (itemId: string, quantity: number) => {
    setForm(prev => ({
      ...prev,
      options: prev.options.map(o =>
        o.id === itemId ? { ...o, quantity, amount: o.unitPrice * quantity } : o
      )
    }))
  }

  // 計算値を更新
  const calculated = useMemo(() => calculateEstimate(form), [form, calculateEstimate])

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-[90vw] h-[90vh] overflow-hidden flex flex-col">
        {/* ヘッダー */}
        <div className="p-4 border-b flex items-center justify-between bg-gray-50">
          <div>
            <h2 className="text-lg font-bold">見積書作成</h2>
            <p className="text-sm text-gray-500">見積番号: {form.estimateNo}</p>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-2xl font-bold text-blue-600">
              {formatCurrency(calculated.totalAmount)}
            </span>
            <button onClick={onClose} className="ml-4 text-gray-400 hover:text-gray-600">
              <X className="h-6 w-6" />
            </button>
          </div>
        </div>

        {/* タブナビゲーション */}
        <div className="border-b bg-white">
          <div className="flex">
            {[
              { id: 'customer', label: '顧客情報', icon: Users },
              { id: 'vehicle', label: '車両選択', icon: Car },
              { id: 'options', label: 'オプション', icon: Plus },
              { id: 'details', label: '車両詳細・支払', icon: FileText },
              { id: 'fees', label: '諸費用', icon: FileText },
              { id: 'summary', label: '確認', icon: Check },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600 bg-blue-50'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                }`}
              >
                <tab.icon className="h-4 w-4" />
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* コンテンツ */}
        <div className="flex-1 overflow-hidden p-6 flex flex-col">
          {/* 顧客情報タブ */}
          {activeTab === 'customer' && (
            <div className="space-y-6 max-w-4xl flex-1 overflow-y-auto">
              {/* 担当者・ランク選択（横並び） */}
              <div className="grid grid-cols-2 gap-8">
                {/* 担当者選択 */}
                <div>
                  <label className="block text-base font-medium text-gray-700 mb-3">担当者 *</label>
                  <div className="flex flex-wrap gap-3">
                    {salesReps.map((rep) => {
                      const isSelected = form.salesRepName === rep.name
                      return (
                        <button
                          key={rep.name}
                          type="button"
                          onClick={() => setForm(prev => ({
                            ...prev,
                            salesRepName: rep.name,
                            salesRepColor: rep.color
                          }))}
                          className={`px-5 py-2.5 rounded-lg text-base font-medium transition-all ${
                            isSelected
                              ? 'bg-blue-600 text-white ring-2 ring-offset-2 ring-blue-500'
                              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                          }`}
                        >
                          {rep.name}
                        </button>
                      )
                    })}
                  </div>
                  {form.salesRepName && (
                    <p className="text-sm text-gray-500 mt-2">選択中: {form.salesRepName}</p>
                  )}
                </div>

                {/* ランク選択 */}
                <div>
                  <label className="block text-base font-medium text-gray-700 mb-3">ランク *</label>
                  <div className="flex gap-3">
                    {(['A', 'B', 'C'] as EstimateRank[]).map((rank) => {
                      const rankStyles = {
                        A: { bg: 'bg-red-500', ring: 'ring-red-500', label: 'ランクA（成約見込み高）' },
                        B: { bg: 'bg-yellow-500', ring: 'ring-yellow-500', label: 'ランクB（検討中）' },
                        C: { bg: 'bg-green-500', ring: 'ring-green-500', label: 'ランクC（情報収集段階）' },
                      }
                      const style = rankStyles[rank]
                      return (
                        <button
                          key={rank}
                          type="button"
                          onClick={() => setForm(prev => ({ ...prev, rank }))}
                          className={`px-6 py-2.5 rounded-lg text-lg font-bold text-white transition-all ${style.bg} ${
                            form.rank === rank ? `ring-2 ring-offset-2 ${style.ring}` : 'hover:opacity-80'
                          }`}
                        >
                          {rank}
                        </button>
                      )
                    })}
                  </div>
                  {form.rank && (
                    <p className="text-sm text-gray-500 mt-2">
                      {form.rank === 'A' && 'ランクA: 成約見込みが高い'}
                      {form.rank === 'B' && 'ランクB: 検討中'}
                      {form.rank === 'C' && 'ランクC: 情報収集段階'}
                    </p>
                  )}
                </div>
              </div>
              <div>
                <label className="block text-base font-medium text-gray-700 mb-2">お客様名 *</label>
                <Input
                  value={form.customerName}
                  onChange={(e) => setForm(prev => ({ ...prev, customerName: e.target.value }))}
                  placeholder="例: 山田 太郎"
                  className="h-12 text-base"
                />
              </div>
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <label className="block text-base font-medium text-gray-700 mb-2">郵便番号</label>
                  <Input
                    value={form.postalCode}
                    onChange={(e) => setForm(prev => ({ ...prev, postalCode: e.target.value }))}
                    placeholder="例: 123-4567"
                    className="h-12 text-base"
                  />
                </div>
                <div>
                  <label className="block text-base font-medium text-gray-700 mb-2">電話番号</label>
                  <Input
                    value={form.phone}
                    onChange={(e) => setForm(prev => ({ ...prev, phone: e.target.value }))}
                    placeholder="例: 090-1234-5678"
                    className="h-12 text-base"
                  />
                </div>
              </div>
              <div>
                <label className="block text-base font-medium text-gray-700 mb-2">住所</label>
                <Input
                  value={form.address}
                  onChange={(e) => setForm(prev => ({ ...prev, address: e.target.value }))}
                  placeholder="例: 東京都新宿区..."
                  className="h-12 text-base"
                />
              </div>
              <div>
                <label className="block text-base font-medium text-gray-700 mb-2">メールアドレス</label>
                <Input
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm(prev => ({ ...prev, email: e.target.value }))}
                  placeholder="例: yamada@example.com"
                  className="h-12 text-base"
                />
              </div>
            </div>
          )}

          {/* 車両選択タブ - 3段階選択UI（カテゴリ→車種→グレード） */}
          {activeTab === 'vehicle' && (
            <div className="h-full flex flex-col">
              {/* 選択中の車両表示 */}
              {form.vehicleId && (
                <div className="mb-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-blue-600 font-medium">選択中の車両</p>
                      <h3 className="text-lg font-bold text-blue-900">{form.vehicleName}</h3>
                      <p className="text-sm text-blue-700">{form.vehicleBase}</p>
                      <p className="text-xs text-blue-600 mt-1">{form.vehicleDrive}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-bold text-blue-900">{formatCurrency(form.vehiclePrice)}</p>
                      <button
                        onClick={handleResetVehicle}
                        className="text-sm text-blue-600 hover:underline mt-1"
                      >
                        変更する
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* STEP 1: カテゴリ選択 */}
              {!selectedVehicleCategory && !form.vehicleId && !form.isCustomVehicle && (
                <div>
                  <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                    <span className="bg-blue-600 text-white text-xs px-2 py-0.5 rounded">STEP 1</span>
                    車両カテゴリを選択してください
                  </h3>

                  <div className="grid grid-cols-2 gap-4 mb-4">
                    {vehicleCategories.map((cat) => {
                      const count = vehicleCountByCategory[cat.id] || 0
                      const isCustomCategory = (cat as any).isCustom === true
                      // カスタムカテゴリ（中古車・ワンオフ）は常に表示、それ以外は車両数がある場合のみ
                      if (!isCustomCategory && count === 0) return null
                      return (
                        <button
                          key={cat.id}
                          onClick={() => setSelectedVehicleCategory(cat.id)}
                          className={`p-6 text-left rounded-lg border-2 transition-all ${
                            cat.id === 'kei' ? 'border-yellow-200 hover:border-yellow-400 hover:bg-yellow-50' :
                            cat.id === 'townace' ? 'border-green-200 hover:border-green-400 hover:bg-green-50' :
                            cat.id === 'hiace' ? 'border-blue-200 hover:border-blue-400 hover:bg-blue-50' :
                            cat.id === 'used' ? 'border-purple-200 hover:border-purple-400 hover:bg-purple-50' :
                            cat.id === 'oneoff' ? 'border-orange-200 hover:border-orange-400 hover:bg-orange-50' :
                            'border-gray-200 hover:border-gray-400 hover:bg-gray-50'
                          }`}
                        >
                          <h4 className="font-bold text-gray-900 text-lg">{cat.name}</h4>
                          <p className="text-sm text-gray-500 mt-1">
                            {isCustomCategory ? '自由入力' : `${count}グレード`}
                          </p>
                        </button>
                      )
                    })}
                  </div>
                  <p className="text-sm text-gray-500">全{vehicles.length}グレード</p>
                </div>
              )}

              {/* 中古車・ワンオフ：自由入力フォーム */}
              {(selectedVehicleCategory === 'used' || selectedVehicleCategory === 'oneoff') && !form.isCustomVehicle && (
                <div className="flex-1 flex flex-col min-h-0">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                      <span className={`text-white text-xs px-2 py-0.5 rounded ${
                        selectedVehicleCategory === 'used' ? 'bg-purple-600' : 'bg-orange-600'
                      }`}>
                        {getCategoryName(selectedVehicleCategory)}
                      </span>
                      車両情報を入力してください
                    </h3>
                    <button
                      onClick={() => { setSelectedVehicleCategory(''); }}
                      className="text-sm text-blue-600 hover:underline flex items-center gap-1"
                    >
                      ← カテゴリ選択に戻る
                    </button>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        車両名 <span className="text-red-500">*</span>
                      </label>
                      <Input
                        value={form.vehicleName}
                        onChange={(e) => setForm({ ...form, vehicleName: e.target.value })}
                        placeholder={selectedVehicleCategory === 'used' ? '例: ハイエース 中古' : '例: カスタムキャンピングカー'}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        ベース車両
                      </label>
                      <Input
                        value={form.vehicleBase}
                        onChange={(e) => setForm({ ...form, vehicleBase: e.target.value })}
                        placeholder="例: トヨタ ハイエース"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        駆動 / 仕様
                      </label>
                      <Input
                        value={form.vehicleDrive}
                        onChange={(e) => setForm({ ...form, vehicleDrive: e.target.value })}
                        placeholder="例: 4WD AT"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        車両価格（税抜） <span className="text-red-500">*</span>
                      </label>
                      <Input
                        type="number"
                        value={form.vehiclePrice || ''}
                        onChange={(e) => setForm({ ...form, vehiclePrice: parseInt(e.target.value) || 0 })}
                        placeholder="例: 3000000"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">乗車定員</label>
                        <Input
                          type="number"
                          value={form.seatingCapacity || ''}
                          onChange={(e) => setForm({ ...form, seatingCapacity: parseInt(e.target.value) || undefined })}
                          placeholder="例: 4"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">就寝定員</label>
                        <Input
                          type="number"
                          value={form.sleepingCapacity || ''}
                          onChange={(e) => setForm({ ...form, sleepingCapacity: parseInt(e.target.value) || undefined })}
                          placeholder="例: 2"
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">環境性能割</label>
                        <Input
                          type="number"
                          value={form.taxEnv || ''}
                          onChange={(e) => setForm({ ...form, taxEnv: parseInt(e.target.value) || 0 })}
                          placeholder="0"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">重量税</label>
                        <Input
                          type="number"
                          value={form.taxWeight || ''}
                          onChange={(e) => setForm({ ...form, taxWeight: parseInt(e.target.value) || 0 })}
                          placeholder="0"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">自賠責保険</label>
                        <Input
                          type="number"
                          value={form.insurance || ''}
                          onChange={(e) => setForm({ ...form, insurance: parseInt(e.target.value) || 0 })}
                          placeholder="0"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="mt-6 flex justify-end">
                    <Button
                      onClick={() => {
                        if (!form.vehicleName || !form.vehiclePrice) {
                          alert('車両名と価格は必須です')
                          return
                        }
                        // 諸費用のデフォルト値を設定から取得
                        const registrationFeeItem = storedFeeItems.find(f => f.name === '登録代行費用')
                        const garageFeeItem = storedFeeItems.find(f => f.name === '車庫証明代行費用')
                        const deliveryFeeItem = storedFeeItems.find(f => f.name === '納車費用')

                        setForm({
                          ...form,
                          vehicleId: undefined,
                          vehicleCategory: selectedVehicleCategory,
                          isCustomVehicle: true,
                          registrationFee: registrationFeeItem?.defaultAmount || form.registrationFee,
                          garageRegistrationFee: garageFeeItem?.defaultAmount || form.garageRegistrationFee,
                          deliveryFee: deliveryFeeItem?.defaultAmount || form.deliveryFee,
                        })
                        setSelectedVehicleCategory('')
                      }}
                      disabled={!form.vehicleName || !form.vehiclePrice}
                      className={`${
                        selectedVehicleCategory === 'used' ? 'bg-purple-600 hover:bg-purple-700' : 'bg-orange-600 hover:bg-orange-700'
                      }`}
                    >
                      この車両で決定
                    </Button>
                  </div>
                </div>
              )}

              {/* カスタム車両選択済み表示 */}
              {form.isCustomVehicle && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                      <span className={`text-white text-xs px-2 py-0.5 rounded ${
                        form.vehicleCategory === 'used' ? 'bg-purple-600' : 'bg-orange-600'
                      }`}>
                        {getCategoryName(form.vehicleCategory || '')}
                      </span>
                      車両情報
                    </h3>
                    <button
                      onClick={() => {
                        setForm({
                          ...form,
                          vehicleId: undefined,
                          vehicleName: '',
                          vehicleBase: '',
                          vehicleDrive: '',
                          vehiclePrice: 0,
                          vehicleCategory: undefined,
                          isCustomVehicle: false,
                          taxEnv: 0,
                          taxWeight: 0,
                          insurance: 0,
                        })
                      }}
                      className="text-sm text-red-600 hover:underline"
                    >
                      車両を変更
                    </button>
                  </div>

                  <div className={`p-4 rounded-lg border-2 ${
                    form.vehicleCategory === 'used' ? 'bg-purple-50 border-purple-200' : 'bg-orange-50 border-orange-200'
                  }`}>
                    <div className="space-y-3">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">車両名</label>
                        <Input
                          value={form.vehicleName}
                          onChange={(e) => setForm({ ...form, vehicleName: e.target.value })}
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">ベース車両</label>
                        <Input
                          value={form.vehicleBase}
                          onChange={(e) => setForm({ ...form, vehicleBase: e.target.value })}
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">駆動 / 仕様</label>
                        <Input
                          value={form.vehicleDrive}
                          onChange={(e) => setForm({ ...form, vehicleDrive: e.target.value })}
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">車両価格（税抜）</label>
                        <Input
                          type="number"
                          value={form.vehiclePrice || ''}
                          onChange={(e) => setForm({ ...form, vehiclePrice: parseInt(e.target.value) || 0 })}
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">乗車定員</label>
                          <Input
                            type="number"
                            value={form.seatingCapacity || ''}
                            onChange={(e) => setForm({ ...form, seatingCapacity: parseInt(e.target.value) || undefined })}
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">就寝定員</label>
                          <Input
                            type="number"
                            value={form.sleepingCapacity || ''}
                            onChange={(e) => setForm({ ...form, sleepingCapacity: parseInt(e.target.value) || undefined })}
                          />
                        </div>
                      </div>
                      <div className="grid grid-cols-3 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">環境性能割</label>
                          <Input
                            type="number"
                            value={form.taxEnv || ''}
                            onChange={(e) => setForm({ ...form, taxEnv: parseInt(e.target.value) || 0 })}
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">重量税</label>
                          <Input
                            type="number"
                            value={form.taxWeight || ''}
                            onChange={(e) => setForm({ ...form, taxWeight: parseInt(e.target.value) || 0 })}
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">自賠責保険</label>
                          <Input
                            type="number"
                            value={form.insurance || ''}
                            onChange={(e) => setForm({ ...form, insurance: parseInt(e.target.value) || 0 })}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* STEP 2: 車種選択 */}
              {selectedVehicleCategory && selectedVehicleCategory !== 'used' && selectedVehicleCategory !== 'oneoff' && !selectedModelName && !form.vehicleId && (
                <div className="flex-1 flex flex-col min-h-0">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                      <span className="bg-blue-600 text-white text-xs px-2 py-0.5 rounded">STEP 2</span>
                      車種を選択してください
                    </h3>
                    <button
                      onClick={() => { setSelectedVehicleCategory(''); setVehicleSearchQuery(''); }}
                      className="text-sm text-blue-600 hover:underline flex items-center gap-1"
                    >
                      ← カテゴリ選択に戻る
                    </button>
                  </div>

                  <div className="mb-4 p-3 bg-gray-100 rounded-lg flex items-center gap-2">
                    <span className={`px-2 py-1 text-xs rounded font-medium ${
                      selectedVehicleCategory === 'kei' ? 'bg-yellow-100 text-yellow-800' :
                      selectedVehicleCategory === 'townace' ? 'bg-green-100 text-green-800' :
                      selectedVehicleCategory === 'hiace' ? 'bg-blue-100 text-blue-800' :
                      selectedVehicleCategory === 'used' ? 'bg-purple-100 text-purple-800' :
                      selectedVehicleCategory === 'oneoff' ? 'bg-orange-100 text-orange-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {getCategoryName(selectedVehicleCategory)}
                    </span>
                  </div>

                  {/* 検索 */}
                  <div className="mb-4">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <Input
                        placeholder="車種名で検索..."
                        value={vehicleSearchQuery}
                        onChange={(e) => setVehicleSearchQuery(e.target.value)}
                        className="pl-10"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-3 flex-1 overflow-y-auto content-start">
                    {[...filteredModelsByCategory].sort((a, b) => {
                      const aMinPrice = Math.min(...getVehicleGrades(a).map(v => v.basePrice))
                      const bMinPrice = Math.min(...getVehicleGrades(b).map(v => v.basePrice))
                      return aMinPrice - bMinPrice
                    }).map((modelName) => {
                      const modelVehicles = getVehicleGrades(modelName)
                      const minPrice = Math.min(...modelVehicles.map(v => v.basePrice))
                      return (
                        <button
                          key={modelName}
                          onClick={() => setSelectedModelName(modelName)}
                          className="p-4 text-left rounded-lg border-2 border-gray-200 hover:border-blue-400 hover:bg-blue-50 transition-all"
                        >
                          <h4 className="font-semibold text-gray-900 text-sm leading-tight">{modelName.trim()}</h4>
                          <p className="text-xs text-gray-500 mt-1">{modelVehicles.length}グレード</p>
                          <p className="text-sm font-bold text-blue-600 mt-2">
                            {formatCurrency(minPrice)}〜
                          </p>
                        </button>
                      )
                    })}
                  </div>
                  <p className="text-sm text-gray-500 mt-3">{filteredModelsByCategory.length}車種</p>
                </div>
              )}

              {/* STEP 3: グレード選択 */}
              {selectedModelName && !form.vehicleId && (
                <div className="flex-1 flex flex-col min-h-0">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                      <span className="bg-blue-600 text-white text-xs px-2 py-0.5 rounded">STEP 3</span>
                      グレードを選択してください
                    </h3>
                    <button
                      onClick={() => setSelectedModelName('')}
                      className="text-sm text-blue-600 hover:underline flex items-center gap-1"
                    >
                      ← 車種選択に戻る
                    </button>
                  </div>

                  <div className="mb-4 p-3 bg-gray-100 rounded-lg flex items-center gap-2">
                    <span className={`px-2 py-1 text-xs rounded font-medium ${
                      selectedVehicleCategory === 'kei' ? 'bg-yellow-100 text-yellow-800' :
                      selectedVehicleCategory === 'townace' ? 'bg-green-100 text-green-800' :
                      selectedVehicleCategory === 'hiace' ? 'bg-blue-100 text-blue-800' :
                      selectedVehicleCategory === 'used' ? 'bg-purple-100 text-purple-800' :
                      selectedVehicleCategory === 'oneoff' ? 'bg-orange-100 text-orange-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {getCategoryName(selectedVehicleCategory)}
                    </span>
                    <span className="text-gray-400">›</span>
                    <span className="font-bold text-gray-900">{selectedModelName.trim()}</span>
                  </div>

                  <div className="space-y-3 flex-1 overflow-y-auto">
                    {[...vehicleGrades].sort((a, b) => a.basePrice - b.basePrice).map((vehicle) => {
                      const drive = vehicle.transmission.includes('4WD') ? '4WD' : '2WD'
                      const fuel = vehicle.fuelType.includes('軽油') ? 'ディーゼル' : 'ガソリン'
                      return (
                        <button
                          key={vehicle.id}
                          onClick={() => handleVehicleSelect(vehicle)}
                          className="w-full p-4 text-left rounded-lg border-2 border-gray-200 hover:border-blue-400 hover:bg-blue-50 transition-all"
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <p className="text-sm text-gray-600">{vehicle.baseVehicle}</p>
                              <div className="flex items-center gap-2 mt-2">
                                <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                                  drive === '4WD' ? 'bg-orange-100 text-orange-700' : 'bg-green-100 text-green-700'
                                }`}>
                                  {drive}
                                </span>
                                <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                                  fuel === 'ディーゼル' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'
                                }`}>
                                  {fuel}
                                </span>
                                <span className="text-xs text-gray-500">{vehicle.displacement}cc</span>
                                <span className="text-xs text-gray-500">乗車{vehicle.seatingCapacity}名</span>
                                <span className="text-xs text-gray-500">就寝{vehicle.sleepingCapacity}名</span>
                              </div>
                            </div>
                            <div className="text-right ml-4">
                              <p className="text-xl font-bold text-blue-600">{formatCurrency(vehicle.basePrice)}</p>
                              <p className="text-xs text-gray-500 mt-1">税別</p>
                            </div>
                          </div>
                        </button>
                      )
                    })}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* オプションタブ */}
          {activeTab === 'options' && (
            <div className="flex flex-col h-full">
              {/* A/B 大タブ */}
              <div className="flex border-b border-gray-200">
                <button
                  onClick={() => setSelectedParentGroup('A')}
                  className={`flex-1 py-3 text-center font-bold text-base border-b-3 transition-all ${
                    selectedParentGroup === 'A'
                      ? 'border-b-4 border-blue-600 text-blue-600 bg-blue-50'
                      : 'border-b-4 border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  オプションA
                  <span className="ml-2 text-xs font-normal text-gray-400">メーカー・ディーラー・車体改造</span>
                </button>
                <button
                  onClick={() => setSelectedParentGroup('B')}
                  className={`flex-1 py-3 text-center font-bold text-base border-b-3 transition-all ${
                    selectedParentGroup === 'B'
                      ? 'border-b-4 border-green-600 text-green-600 bg-green-50'
                      : 'border-b-4 border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  オプションB
                  <span className="ml-2 text-xs font-normal text-gray-400">キャンピングカーオプション</span>
                </button>
              </div>

              {/* オプションA: メーカーOP・ディーラーOP・車体改造 */}
              {selectedParentGroup === 'A' && (
                <div className="grid grid-cols-3 gap-4 flex-1">
                  {/* メーカーOP */}
                  <div className="border rounded-lg p-3 bg-gray-50 flex flex-col">
                    <h4 className="font-semibold text-sm text-gray-800 mb-2 pb-2 border-b">メーカーOP</h4>
                    <div className="space-y-1 flex-1 overflow-y-auto">
                      {options.filter(o => o.category === 'メーカーＯＰ').map((option) => {
                        const isSelected = form.options.some(o => o.optionId === option.id)
                        return (
                          <button
                            key={option.id}
                            onClick={() => !isSelected && handleAddOption(option)}
                            disabled={isSelected}
                            className={`w-full text-left px-2 py-1.5 rounded text-sm transition-all ${
                              isSelected
                                ? 'bg-blue-100 text-blue-700'
                                : 'bg-white hover:bg-blue-50 border border-gray-200'
                            }`}
                          >
                            <div className="flex justify-between items-center">
                              <span className="truncate flex-1">{option.name}</span>
                              <span className="ml-1 font-medium text-blue-600 whitespace-nowrap">{formatCurrency(option.price)}</span>
                            </div>
                          </button>
                        )
                      })}
                    </div>
                  </div>

                  {/* ディーラーOP */}
                  <div className="border rounded-lg p-3 bg-gray-50 flex flex-col">
                    <h4 className="font-semibold text-sm text-gray-800 mb-2 pb-2 border-b">ディーラーOP</h4>
                    <div className="space-y-1 flex-1 overflow-y-auto">
                      {options.filter(o => o.category === 'ディーラーＯＰ').map((option) => {
                        const isSelected = form.options.some(o => o.optionId === option.id)
                        return (
                          <button
                            key={option.id}
                            onClick={() => !isSelected && handleAddOption(option)}
                            disabled={isSelected}
                            className={`w-full text-left px-2 py-1.5 rounded text-sm transition-all ${
                              isSelected
                                ? 'bg-blue-100 text-blue-700'
                                : 'bg-white hover:bg-blue-50 border border-gray-200'
                            }`}
                          >
                            <div className="flex justify-between items-center">
                              <span className="truncate flex-1">{option.name}</span>
                              <span className="ml-1 font-medium text-blue-600 whitespace-nowrap">{formatCurrency(option.price)}</span>
                            </div>
                          </button>
                        )
                      })}
                    </div>
                  </div>

                  {/* 車体改造 */}
                  <div className="border rounded-lg p-3 bg-orange-50 border-orange-200 flex flex-col">
                    <h4 className="font-semibold text-sm text-orange-800 mb-2 pb-2 border-b border-orange-200">車体改造</h4>
                    <div className="space-y-1 flex-1 overflow-y-auto">
                      {modificationOptions.map((option) => {
                        const isSelected = form.options.some(o => o.optionId === option.id)
                        return (
                          <button
                            key={option.id}
                            onClick={() => !isSelected && handleAddOption(option)}
                            disabled={isSelected}
                            className={`w-full text-left px-2 py-1.5 rounded text-sm transition-all ${
                              isSelected
                                ? 'bg-orange-200 text-orange-800'
                                : 'bg-white hover:bg-orange-100 border border-orange-200'
                            }`}
                          >
                            <div className="flex justify-between items-center">
                              <span className="truncate flex-1">{option.name}</span>
                              <span className="ml-1 font-medium text-orange-600 whitespace-nowrap">{formatCurrency(option.price)}</span>
                            </div>
                          </button>
                        )
                      })}
                    </div>
                  </div>
                </div>
              )}

              {/* オプションB: キャンピングカーオプション（カテゴリ別グリッド） */}
              {selectedParentGroup === 'B' && (
                <div className="flex flex-col flex-1 overflow-hidden gap-3">
                <div className="grid grid-cols-4 gap-3 flex-1 overflow-hidden min-h-0">
                  {/* 電装 */}
                  <div className="border rounded-lg p-2 bg-yellow-50 border-yellow-200 flex flex-col">
                    <h4 className="font-semibold text-xs text-yellow-800 mb-2 pb-1 border-b border-yellow-200">電装</h4>
                    <div className="space-y-0.5 flex-1 overflow-y-auto">
                      {options.filter(o => o.category === '電装').map((option) => {
                        const isSelected = form.options.some(o => o.optionId === option.id)
                        return (
                          <button
                            key={option.id}
                            onClick={() => !isSelected && handleAddOption(option)}
                            disabled={isSelected}
                            className={`w-full text-left px-1.5 py-1 rounded text-[13px] transition-all ${
                              isSelected
                                ? 'bg-yellow-200 text-yellow-800'
                                : 'bg-white hover:bg-yellow-100 border border-yellow-100'
                            }`}
                          >
                            <div className="flex justify-between items-center">
                              <span className="truncate flex-1">{option.name}</span>
                              <span className="ml-1 font-medium text-yellow-700 whitespace-nowrap">{formatCurrency(option.price)}</span>
                            </div>
                          </button>
                        )
                      })}
                    </div>
                  </div>

                  {/* 家具 */}
                  <div className="border rounded-lg p-2 bg-amber-50 border-amber-200 flex flex-col">
                    <h4 className="font-semibold text-xs text-amber-800 mb-2 pb-1 border-b border-amber-200">家具</h4>
                    <div className="space-y-0.5 flex-1 overflow-y-auto">
                      {options.filter(o => o.category === '家具').map((option) => {
                        const isSelected = form.options.some(o => o.optionId === option.id)
                        return (
                          <button
                            key={option.id}
                            onClick={() => !isSelected && handleAddOption(option)}
                            disabled={isSelected}
                            className={`w-full text-left px-1.5 py-1 rounded text-[13px] transition-all ${
                              isSelected
                                ? 'bg-amber-200 text-amber-800'
                                : 'bg-white hover:bg-amber-100 border border-amber-100'
                            }`}
                          >
                            <div className="flex justify-between items-center">
                              <span className="truncate flex-1">{option.name}</span>
                              <span className="ml-1 font-medium text-amber-700 whitespace-nowrap">{formatCurrency(option.price)}</span>
                            </div>
                          </button>
                        )
                      })}
                    </div>
                  </div>

                  {/* 装備 */}
                  <div className="border rounded-lg p-2 bg-emerald-50 border-emerald-200 flex flex-col">
                    <h4 className="font-semibold text-xs text-emerald-800 mb-2 pb-1 border-b border-emerald-200">装備</h4>
                    <div className="space-y-0.5 flex-1 overflow-y-auto">
                      {options.filter(o => o.category === '装備').map((option) => {
                        const isSelected = form.options.some(o => o.optionId === option.id)
                        return (
                          <button
                            key={option.id}
                            onClick={() => !isSelected && handleAddOption(option)}
                            disabled={isSelected}
                            className={`w-full text-left px-1.5 py-1 rounded text-[13px] transition-all ${
                              isSelected
                                ? 'bg-emerald-200 text-emerald-800'
                                : 'bg-white hover:bg-emerald-100 border border-emerald-100'
                            }`}
                          >
                            <div className="flex justify-between items-center">
                              <span className="truncate flex-1">{option.name}</span>
                              <span className="ml-1 font-medium text-emerald-700 whitespace-nowrap">{formatCurrency(option.price)}</span>
                            </div>
                          </button>
                        )
                      })}
                    </div>
                  </div>

                  {/* 外装 */}
                  <div className="border rounded-lg p-2 bg-sky-50 border-sky-200 flex flex-col">
                    <h4 className="font-semibold text-xs text-sky-800 mb-2 pb-1 border-b border-sky-200">外装</h4>
                    <div className="space-y-0.5 flex-1 overflow-y-auto">
                      {options.filter(o => o.category === '外装').map((option) => {
                        const isSelected = form.options.some(o => o.optionId === option.id)
                        return (
                          <button
                            key={option.id}
                            onClick={() => !isSelected && handleAddOption(option)}
                            disabled={isSelected}
                            className={`w-full text-left px-1.5 py-1 rounded text-[13px] transition-all ${
                              isSelected
                                ? 'bg-sky-200 text-sky-800'
                                : 'bg-white hover:bg-sky-100 border border-sky-100'
                            }`}
                          >
                            <div className="flex justify-between items-center">
                              <span className="truncate flex-1">{option.name}</span>
                              <span className="ml-1 font-medium text-sky-700 whitespace-nowrap">{formatCurrency(option.price)}</span>
                            </div>
                          </button>
                        )
                      })}
                    </div>
                  </div>

                  {/* テーブル */}
                  <div className="border rounded-lg p-2 bg-purple-50 border-purple-200 flex flex-col">
                    <h4 className="font-semibold text-xs text-purple-800 mb-2 pb-1 border-b border-purple-200">テーブル</h4>
                    <div className="space-y-0.5 flex-1 overflow-y-auto">
                      {options.filter(o => o.category === 'テーブル').map((option) => {
                        const isSelected = form.options.some(o => o.optionId === option.id)
                        return (
                          <button
                            key={option.id}
                            onClick={() => !isSelected && handleAddOption(option)}
                            disabled={isSelected}
                            className={`w-full text-left px-1.5 py-1 rounded text-[13px] transition-all ${
                              isSelected
                                ? 'bg-purple-200 text-purple-800'
                                : 'bg-white hover:bg-purple-100 border border-purple-100'
                            }`}
                          >
                            <div className="flex justify-between items-center">
                              <span className="truncate flex-1">{option.name}</span>
                              <span className="ml-1 font-medium text-purple-700 whitespace-nowrap">{formatCurrency(option.price)}</span>
                            </div>
                          </button>
                        )
                      })}
                    </div>
                  </div>

                  {/* 縫製 */}
                  <div className="border rounded-lg p-2 bg-pink-50 border-pink-200 flex flex-col">
                    <h4 className="font-semibold text-xs text-pink-800 mb-2 pb-1 border-b border-pink-200">縫製</h4>
                    <div className="space-y-0.5 flex-1 overflow-y-auto">
                      {options.filter(o => o.category === '縫製').map((option) => {
                        const isSelected = form.options.some(o => o.optionId === option.id)
                        return (
                          <button
                            key={option.id}
                            onClick={() => !isSelected && handleAddOption(option)}
                            disabled={isSelected}
                            className={`w-full text-left px-1.5 py-1 rounded text-[13px] transition-all ${
                              isSelected
                                ? 'bg-pink-200 text-pink-800'
                                : 'bg-white hover:bg-pink-100 border border-pink-100'
                            }`}
                          >
                            <div className="flex justify-between items-center">
                              <span className="truncate flex-1">{option.name}</span>
                              <span className="ml-1 font-medium text-pink-700 whitespace-nowrap">{formatCurrency(option.price)}</span>
                            </div>
                          </button>
                        )
                      })}
                    </div>
                  </div>

                  {/* オーディオ */}
                  <div className="border rounded-lg p-2 bg-indigo-50 border-indigo-200 flex flex-col">
                    <h4 className="font-semibold text-xs text-indigo-800 mb-2 pb-1 border-b border-indigo-200">オーディオ</h4>
                    <div className="space-y-0.5 flex-1 overflow-y-auto">
                      {options.filter(o => o.category === 'オーディオ').map((option) => {
                        const isSelected = form.options.some(o => o.optionId === option.id)
                        return (
                          <button
                            key={option.id}
                            onClick={() => !isSelected && handleAddOption(option)}
                            disabled={isSelected}
                            className={`w-full text-left px-1.5 py-1 rounded text-[13px] transition-all ${
                              isSelected
                                ? 'bg-indigo-200 text-indigo-800'
                                : 'bg-white hover:bg-indigo-100 border border-indigo-100'
                            }`}
                          >
                            <div className="flex justify-between items-center">
                              <span className="truncate flex-1">{option.name}</span>
                              <span className="ml-1 font-medium text-indigo-700 whitespace-nowrap">{formatCurrency(option.price)}</span>
                            </div>
                          </button>
                        )
                      })}
                    </div>
                  </div>

                  {/* 一般・その他 */}
                  <div className="border rounded-lg p-2 bg-gray-50 border-gray-200 flex flex-col">
                    <h4 className="font-semibold text-xs text-gray-800 mb-2 pb-1 border-b border-gray-200">一般</h4>
                    <div className="space-y-0.5 flex-1 overflow-y-auto">
                      {options.filter(o => o.category === '一般').map((option) => {
                        const isSelected = form.options.some(o => o.optionId === option.id)
                        return (
                          <button
                            key={option.id}
                            onClick={() => !isSelected && handleAddOption(option)}
                            disabled={isSelected}
                            className={`w-full text-left px-1.5 py-1 rounded text-[13px] transition-all ${
                              isSelected
                                ? 'bg-gray-200 text-gray-800'
                                : 'bg-white hover:bg-gray-100 border border-gray-100'
                            }`}
                          >
                            <div className="flex justify-between items-center">
                              <span className="truncate flex-1">{option.name}</span>
                              <span className="ml-1 font-medium text-gray-700 whitespace-nowrap">{formatCurrency(option.price)}</span>
                            </div>
                          </button>
                        )
                      })}
                    </div>
                  </div>

                </div>

                {/* 自由オプション */}
                <div className="border rounded-lg p-2 bg-rose-50 border-rose-200 flex-shrink-0">
                  <div className="flex items-center justify-between mb-2 pb-1 border-b border-rose-200">
                    <h4 className="font-semibold text-xs text-rose-800">自由オプション</h4>
                    <button
                      onClick={() => {
                        const newId = `custom-${Date.now()}`
                        setForm({
                          ...form,
                          options: [
                            ...form.options,
                            {
                              id: newId,
                              optionId: newId,
                              optionName: '',
                              quantity: 1,
                              unitPrice: 0,
                              amount: 0,
                            }
                          ]
                        })
                      }}
                      className="text-xs bg-rose-600 text-white px-2 py-0.5 rounded hover:bg-rose-700"
                    >
                      + 追加
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {form.options.filter(o => o.optionId.startsWith('custom-')).map((customOption) => (
                      <div key={customOption.id} className="flex items-center gap-2 bg-white p-2 rounded border border-rose-100">
                        <Input
                          value={customOption.optionName}
                          onChange={(e) => {
                            setForm({
                              ...form,
                              options: form.options.map(o =>
                                o.id === customOption.id
                                  ? { ...o, optionName: e.target.value }
                                  : o
                              )
                            })
                          }}
                          placeholder="オプション名"
                          className="w-48 h-8 text-sm"
                        />
                        <Input
                          type="number"
                          value={customOption.unitPrice || ''}
                          onChange={(e) => {
                            const price = parseInt(e.target.value) || 0
                            setForm({
                              ...form,
                              options: form.options.map(o =>
                                o.id === customOption.id
                                  ? { ...o, unitPrice: price, amount: price * o.quantity }
                                  : o
                              )
                            })
                          }}
                          placeholder="価格"
                          className="w-28 h-8 text-sm text-right"
                        />
                        <span className="text-sm text-gray-500">円</span>
                        <button
                          onClick={() => {
                            setForm({
                              ...form,
                              options: form.options.filter(o => o.id !== customOption.id)
                            })
                          }}
                          className="text-rose-600 hover:text-rose-800 p-1"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    ))}
                    {form.options.filter(o => o.optionId.startsWith('custom-')).length === 0 && (
                      <p className="text-xs text-rose-400 py-1">「+ 追加」をクリックして自由にオプションを追加できます</p>
                    )}
                  </div>
                </div>
                </div>
              )}

              {/* 選択済みオプション一覧 + オプション合計 */}
              <div className="flex-shrink-0 border-t pt-2 mt-2">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex-1 flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-medium text-gray-700">
                      選択済みオプション ({form.options.length}件)
                    </span>
                    {form.options.map((item) => (
                      <div
                        key={item.id}
                        className="flex items-center gap-1 px-2 py-0.5 bg-blue-50 border border-blue-200 rounded text-xs"
                      >
                        <span className="text-gray-800">{item.optionName}</span>
                        <span className="text-blue-600 font-medium">{formatCurrency(item.amount)}</span>
                        <button
                          onClick={() => handleRemoveOption(item.id)}
                          className="text-red-500 hover:text-red-700 ml-1"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                  <div className="flex-shrink-0 text-right">
                    <span className="text-sm text-gray-600 mr-2">オプション・改造 合計</span>
                    <span className="text-xl font-bold text-blue-600">{formatCurrency(calculated.optionsSubtotal)}</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* 車両詳細・支払タブ */}
          {activeTab === 'details' && (
            <div className="max-w-4xl space-y-6 flex-1 overflow-y-auto">
              {/* 車両詳細情報 */}
              <div>
                <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                  <Car className="h-5 w-5 text-blue-500" />
                  車両詳細情報
                </h3>
                <div className="grid grid-cols-2 gap-4 bg-gray-50 rounded-lg p-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">ボディー色</label>
                    <Input
                      value={form.bodyColor || ''}
                      onChange={(e) => setForm(prev => ({ ...prev, bodyColor: e.target.value }))}
                      placeholder="例: パールホワイト"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">希望ナンバー</label>
                    <Input
                      value={form.desiredPlateNumber || ''}
                      onChange={(e) => setForm(prev => ({ ...prev, desiredPlateNumber: e.target.value }))}
                      placeholder="例: 8888"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">乗車定員</label>
                    <Input
                      type="number"
                      value={form.seatingCapacity || ''}
                      onChange={(e) => setForm(prev => ({ ...prev, seatingCapacity: parseInt(e.target.value) || undefined }))}
                      placeholder="例: 8"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">就寝定員</label>
                    <Input
                      type="number"
                      value={form.sleepingCapacity || ''}
                      onChange={(e) => setForm(prev => ({ ...prev, sleepingCapacity: parseInt(e.target.value) || undefined }))}
                      placeholder="例: 4"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">椅子生地</label>
                    <Input
                      value={form.seatFabric || ''}
                      onChange={(e) => setForm(prev => ({ ...prev, seatFabric: e.target.value }))}
                      placeholder="例: 本革ブラック"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">カーテン生地</label>
                    <Input
                      value={form.curtainFabric || ''}
                      onChange={(e) => setForm(prev => ({ ...prev, curtainFabric: e.target.value }))}
                      placeholder="例: ベージュ"
                    />
                  </div>
                </div>
              </div>

              {/* 支払条件・納期 */}
              <div>
                <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                  <FileText className="h-5 w-5 text-green-500" />
                  支払条件及び納期
                </h3>
                <div className="bg-green-50 rounded-lg p-4 space-y-4">
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">手付け申し込み金 (%)</label>
                      <Input
                        type="number"
                        value={form.paymentTerms?.depositPercentage || ''}
                        onChange={(e) => {
                          const pct = parseInt(e.target.value) || 0
                          const amount = Math.round(calculated.totalAmount * pct / 100)
                          setForm(prev => ({
                            ...prev,
                            paymentTerms: {
                              ...prev.paymentTerms!,
                              depositPercentage: pct,
                              depositAmount: amount
                            }
                          }))
                        }}
                        placeholder="例: 10"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">手付け金額</label>
                      <Input
                        type="number"
                        value={form.paymentTerms?.depositAmount || ''}
                        onChange={(e) => setForm(prev => ({
                          ...prev,
                          paymentTerms: {
                            ...prev.paymentTerms!,
                            depositAmount: parseInt(e.target.value) || 0
                          }
                        }))}
                        placeholder="自動計算"
                      />
                    </div>
                    <div className="flex items-end">
                      <p className="text-sm text-gray-600 pb-2">
                        {form.paymentTerms?.depositAmount ? formatCurrency(form.paymentTerms.depositAmount) : '—'}
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">中間内金 (%)</label>
                      <Input
                        type="number"
                        value={form.paymentTerms?.interimPercentage || ''}
                        onChange={(e) => {
                          const pct = parseInt(e.target.value) || 0
                          const amount = Math.round(calculated.totalAmount * pct / 100)
                          setForm(prev => ({
                            ...prev,
                            paymentTerms: {
                              ...prev.paymentTerms!,
                              interimPercentage: pct,
                              interimAmount: amount
                            }
                          }))
                        }}
                        placeholder="例: 40"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">中間内金金額</label>
                      <Input
                        type="number"
                        value={form.paymentTerms?.interimAmount || ''}
                        onChange={(e) => setForm(prev => ({
                          ...prev,
                          paymentTerms: {
                            ...prev.paymentTerms!,
                            interimAmount: parseInt(e.target.value) || 0
                          }
                        }))}
                        placeholder="自動計算"
                      />
                    </div>
                    <div className="flex items-end">
                      <p className="text-sm text-gray-600 pb-2">
                        {form.paymentTerms?.interimAmount ? formatCurrency(form.paymentTerms.interimAmount) : '—'}
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">残金 (%)</label>
                      <Input
                        type="number"
                        value={form.paymentTerms?.balancePercentage || ''}
                        onChange={(e) => {
                          const pct = parseInt(e.target.value) || 0
                          const amount = Math.round(calculated.totalAmount * pct / 100)
                          setForm(prev => ({
                            ...prev,
                            paymentTerms: {
                              ...prev.paymentTerms!,
                              balancePercentage: pct,
                              balanceAmount: amount
                            }
                          }))
                        }}
                        placeholder="例: 50"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">残金金額</label>
                      <Input
                        type="number"
                        value={form.paymentTerms?.balanceAmount || ''}
                        onChange={(e) => setForm(prev => ({
                          ...prev,
                          paymentTerms: {
                            ...prev.paymentTerms!,
                            balanceAmount: parseInt(e.target.value) || 0
                          }
                        }))}
                        placeholder="自動計算"
                      />
                    </div>
                    <div className="flex items-end">
                      <p className="text-sm text-gray-600 pb-2">
                        {form.paymentTerms?.balanceAmount ? formatCurrency(form.paymentTerms.balanceAmount) : '—'}
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 pt-2 border-t border-green-200">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">納車時期</label>
                      <Input
                        value={form.deliveryTiming || ''}
                        onChange={(e) => setForm(prev => ({ ...prev, deliveryTiming: e.target.value }))}
                        placeholder="例: 2024年4月上旬"
                      />
                    </div>
                    <div className="flex items-center gap-2 pt-6">
                      <input
                        type="checkbox"
                        id="acceptanceConfirmation"
                        checked={form.acceptanceConfirmation || false}
                        onChange={(e) => setForm(prev => ({ ...prev, acceptanceConfirmation: e.target.checked }))}
                        className="h-4 w-4 text-blue-600 rounded"
                      />
                      <label htmlFor="acceptanceConfirmation" className="text-sm text-gray-700">
                        承諾書受け取り確認
                      </label>
                    </div>
                  </div>
                </div>
              </div>

              {/* 下取り車詳細情報 */}
              <div>
                <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                  <Car className="h-5 w-5 text-orange-500" />
                  下取り車詳細情報
                </h3>
                <div className="bg-orange-50 rounded-lg p-4 space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">車名</label>
                      <Input
                        value={form.tradeInDetails?.name || ''}
                        onChange={(e) => setForm(prev => ({
                          ...prev,
                          tradeInDetails: { ...prev.tradeInDetails!, name: e.target.value }
                        }))}
                        placeholder="例: トヨタ プリウス"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">グレード</label>
                      <Input
                        value={form.tradeInDetails?.grade || ''}
                        onChange={(e) => setForm(prev => ({
                          ...prev,
                          tradeInDetails: { ...prev.tradeInDetails!, grade: e.target.value }
                        }))}
                        placeholder="例: S"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">年式</label>
                      <Input
                        value={form.tradeInDetails?.year || ''}
                        onChange={(e) => setForm(prev => ({
                          ...prev,
                          tradeInDetails: { ...prev.tradeInDetails!, year: e.target.value }
                        }))}
                        placeholder="例: 令和3年"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">走行距離</label>
                      <Input
                        value={form.tradeInDetails?.mileage || ''}
                        onChange={(e) => setForm(prev => ({
                          ...prev,
                          tradeInDetails: { ...prev.tradeInDetails!, mileage: e.target.value }
                        }))}
                        placeholder="例: 30,000km"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">駆動</label>
                      <Input
                        value={form.tradeInDetails?.driveType || ''}
                        onChange={(e) => setForm(prev => ({
                          ...prev,
                          tradeInDetails: { ...prev.tradeInDetails!, driveType: e.target.value }
                        }))}
                        placeholder="例: 2WD"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">色</label>
                      <Input
                        value={form.tradeInDetails?.color || ''}
                        onChange={(e) => setForm(prev => ({
                          ...prev,
                          tradeInDetails: { ...prev.tradeInDetails!, color: e.target.value }
                        }))}
                        placeholder="例: シルバー"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">修復歴</label>
                      <select
                        value={form.tradeInDetails?.repairHistory || ''}
                        onChange={(e) => setForm(prev => ({
                          ...prev,
                          tradeInDetails: { ...prev.tradeInDetails!, repairHistory: e.target.value }
                        }))}
                        className="w-full p-2 border rounded-lg"
                      >
                        <option value="">選択してください</option>
                        <option value="なし">なし</option>
                        <option value="あり">あり</option>
                        <option value="不明">不明</option>
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">装備</label>
                    <Input
                      value={form.tradeInDetails?.equipment || ''}
                      onChange={(e) => setForm(prev => ({
                        ...prev,
                        tradeInDetails: { ...prev.tradeInDetails!, equipment: e.target.value }
                      }))}
                      placeholder="例: ナビ、ETC、バックカメラ"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* 諸費用タブ */}
          {activeTab === 'fees' && (
            <div className="max-w-4xl space-y-6 flex-1 overflow-y-auto">
              <div>
                <h3 className="font-semibold text-gray-900 mb-3">税金・法定費用</h3>
                <div className="space-y-3">
                  <div className="flex items-center gap-4">
                    <label className="w-40 text-gray-600">環境性能割</label>
                    <Input
                      type="number"
                      value={form.taxEnv}
                      onChange={(e) => setForm(prev => ({ ...prev, taxEnv: parseInt(e.target.value) || 0 }))}
                      className="w-40"
                    />
                  </div>
                  <div className="flex items-center gap-4">
                    <label className="w-40 text-gray-600">重量税</label>
                    <Input
                      type="number"
                      value={form.taxWeight}
                      onChange={(e) => setForm(prev => ({ ...prev, taxWeight: parseInt(e.target.value) || 0 }))}
                      className="w-40"
                    />
                  </div>
                  <div className="flex items-center gap-4">
                    <label className="w-40 text-gray-600">自賠責保険</label>
                    <Input
                      type="number"
                      value={form.insurance}
                      onChange={(e) => setForm(prev => ({ ...prev, insurance: parseInt(e.target.value) || 0 }))}
                      className="w-40"
                    />
                  </div>
                  <div className="flex items-center gap-4">
                    <label className="w-40 text-gray-600">リサイクル預託金</label>
                    <Input
                      type="number"
                      value={form.recycleFee}
                      onChange={(e) => setForm(prev => ({ ...prev, recycleFee: parseInt(e.target.value) || 0 }))}
                      className="w-40"
                    />
                  </div>
                </div>
              </div>

              <div>
                <h3 className="font-semibold text-gray-900 mb-3">代行手数料</h3>
                <div className="space-y-3">
                  <div className="flex items-center gap-4">
                    <label className="w-40 text-gray-600">登録代行手数料</label>
                    <Input
                      type="number"
                      value={form.registrationFee}
                      onChange={(e) => setForm(prev => ({ ...prev, registrationFee: parseInt(e.target.value) || 0 }))}
                      className="w-40"
                    />
                  </div>
                  <div className="flex items-center gap-4">
                    <label className="w-40 text-gray-600">車庫証明代行</label>
                    <Input
                      type="number"
                      value={form.garageRegistrationFee}
                      onChange={(e) => setForm(prev => ({ ...prev, garageRegistrationFee: parseInt(e.target.value) || 0 }))}
                      className="w-40"
                    />
                  </div>
                  <div className="flex items-center gap-4">
                    <label className="w-40 text-gray-600">納車費用</label>
                    <Input
                      type="number"
                      value={form.deliveryFee}
                      onChange={(e) => setForm(prev => ({ ...prev, deliveryFee: parseInt(e.target.value) || 0 }))}
                      className="w-40"
                    />
                  </div>
                </div>
              </div>

              {/* 追加の諸費用 */}
              {form.additionalFees && form.additionalFees.length > 0 && (
                <div>
                  <h3 className="font-semibold text-gray-900 mb-3">その他諸費用</h3>
                  <div className="space-y-3">
                    {form.additionalFees.map((fee, index) => (
                      <div key={fee.id} className="flex items-center gap-4">
                        <label className="w-40 text-gray-600">{fee.name}</label>
                        <Input
                          type="number"
                          value={fee.amount}
                          onChange={(e) => {
                            const newAmount = parseInt(e.target.value) || 0
                            setForm(prev => ({
                              ...prev,
                              additionalFees: prev.additionalFees?.map((f, i) =>
                                i === index ? { ...f, amount: newAmount } : f
                              )
                            }))
                          }}
                          className="w-40"
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div>
                <h3 className="font-semibold text-gray-900 mb-3">下取り・値引き</h3>
                <div className="space-y-3">
                  <div className="flex items-center gap-4">
                    <label className="w-40 text-gray-600">下取り車</label>
                    <Input
                      value={form.tradeInVehicle}
                      onChange={(e) => setForm(prev => ({ ...prev, tradeInVehicle: e.target.value }))}
                      placeholder="車種を入力"
                      className="flex-1"
                    />
                  </div>
                  <div className="flex items-center gap-4">
                    <label className="w-40 text-gray-600">下取り価格</label>
                    <Input
                      type="number"
                      value={form.tradeInPrice}
                      onChange={(e) => setForm(prev => ({ ...prev, tradeInPrice: parseInt(e.target.value) || 0 }))}
                      className="w-40"
                    />
                  </div>
                  <div className="flex items-center gap-4">
                    <label className="w-40 text-gray-600">値引き</label>
                    <Input
                      type="number"
                      value={form.discount}
                      onChange={(e) => setForm(prev => ({ ...prev, discount: parseInt(e.target.value) || 0 }))}
                      className="w-40"
                    />
                  </div>
                </div>
              </div>

              <div>
                <h3 className="font-semibold text-gray-900 mb-3">備考</h3>
                <textarea
                  value={form.notes}
                  onChange={(e) => setForm(prev => ({ ...prev, notes: e.target.value }))}
                  className="w-full h-24 p-3 border rounded-lg resize-none"
                  placeholder="備考・特記事項があれば入力してください..."
                />
              </div>
            </div>
          )}

          {/* 確認タブ */}
          {activeTab === 'summary' && (
            <div className="max-w-4xl mx-auto flex-1 overflow-y-auto">
              <div className="bg-gray-50 rounded-lg p-6 space-y-4">
                <div className="border-b pb-4">
                  <h3 className="font-bold text-lg text-gray-900 mb-2">顧客情報</h3>
                  <p className="text-gray-700">{form.customerName || '未設定'}</p>
                  <p className="text-sm text-gray-500">{form.address}</p>
                  <p className="text-sm text-gray-500">{form.phone}</p>
                </div>

                <div className="border-b pb-4">
                  <h3 className="font-bold text-lg text-gray-900 mb-2">車両</h3>
                  <p className="text-gray-700">{form.vehicleName || '未選択'}</p>
                  <p className="text-sm text-gray-500">{form.vehicleBase}</p>
                  <p className="text-lg font-bold text-blue-600 mt-1">{formatCurrency(form.vehiclePrice)}</p>
                </div>

                {form.options.length > 0 && (
                  <div className="border-b pb-4">
                    <h3 className="font-bold text-lg text-gray-900 mb-2">オプション ({form.options.length}点)</h3>
                    <ul className="space-y-1 text-sm text-gray-600">
                      {form.options.slice(0, 5).map((opt) => (
                        <li key={opt.id} className="flex justify-between">
                          <span>{opt.optionName}</span>
                          <span>{formatCurrency(opt.amount)}</span>
                        </li>
                      ))}
                      {form.options.length > 5 && (
                        <li className="text-gray-400">他 {form.options.length - 5} 点...</li>
                      )}
                    </ul>
                    <p className="text-right font-bold mt-2">{formatCurrency(calculated.optionsSubtotal)}</p>
                  </div>
                )}

                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>車両本体・オプション</span>
                    <span>{formatCurrency(calculated.taxableAmount)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>消費税（10%）</span>
                    <span>{formatCurrency(calculated.consumptionTax)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>諸費用</span>
                    <span>{formatCurrency(calculated.feesSubtotal)}</span>
                  </div>
                  {form.tradeInPrice > 0 && (
                    <div className="flex justify-between text-sm text-green-600">
                      <span>下取り</span>
                      <span>-{formatCurrency(form.tradeInPrice)}</span>
                    </div>
                  )}
                  {form.discount > 0 && (
                    <div className="flex justify-between text-sm text-green-600">
                      <span>値引き</span>
                      <span>-{formatCurrency(form.discount)}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-xl font-bold pt-3 border-t">
                    <span>総合計</span>
                    <span className="text-blue-600">{formatCurrency(calculated.totalAmount)}</span>
                  </div>
                </div>
              </div>

              <div className="mt-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">ステータス</label>
                <select
                  value={form.status}
                  onChange={(e) => setForm(prev => ({ ...prev, status: e.target.value as Estimate['status'] }))}
                  className="w-full p-2 border rounded-lg"
                >
                  <option value="draft">下書き</option>
                  <option value="sent">送付済</option>
                  <option value="accepted">成約</option>
                  <option value="rejected">失注</option>
                </select>
              </div>
            </div>
          )}
        </div>

        {/* フッター */}
        <div className="p-4 border-t bg-gray-50 flex justify-between">
          <Button variant="outline" onClick={onClose}>
            キャンセル
          </Button>
          <div className="flex gap-2">
            {activeTab !== 'customer' && (
              <Button
                variant="outline"
                onClick={() => {
                  const tabs = ['customer', 'vehicle', 'options', 'details', 'fees', 'summary']
                  const idx = tabs.indexOf(activeTab)
                  if (idx > 0) setActiveTab(tabs[idx - 1] as any)
                }}
              >
                戻る
              </Button>
            )}
            {activeTab !== 'summary' ? (
              <Button
                onClick={() => {
                  const tabs = ['customer', 'vehicle', 'options', 'details', 'fees', 'summary']
                  const idx = tabs.indexOf(activeTab)
                  if (idx < tabs.length - 1) setActiveTab(tabs[idx + 1] as any)
                }}
              >
                次へ
              </Button>
            ) : (
              <>
                <Button
                  variant="outline"
                  onClick={() => {
                    // 保存後に印刷プレビューを開く
                    onSave({ ...form, ...calculated }, true)
                  }}
                >
                  <Printer className="h-4 w-4 mr-2" />
                  保存して印刷
                </Button>
                <Button onClick={() => onSave({ ...form, ...calculated }, false)} className="bg-blue-600 hover:bg-blue-700">
                  <Check className="h-4 w-4 mr-2" />
                  保存する
                </Button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

// プレビューモーダル
function EstimatePreviewModal({
  estimate,
  onClose,
  onPrint
}: {
  estimate: Estimate
  onClose: () => void
  onPrint: () => void
}) {
  // 数値フォーマット（カンマ区切り）
  const formatNumber = (num: number) => num.toLocaleString('ja-JP')

  // 会社設定とレイアウト設定を取得
  const { company, setCompanyLogo, documentLayout, updateDocumentLayout } = useSettingsStore()

  // 書類タイプ（見積書 or 契約書）
  const [documentType, setDocumentType] = useState<'estimate' | 'contract'>('estimate')

  // レイアウト設定パネル表示
  const [showLayoutSettings, setShowLayoutSettings] = useState(false)

  // ロゴアップロードハンドラー
  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      const reader = new FileReader()
      reader.onloadend = () => {
        setCompanyLogo(reader.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  // 書類タイトル
  const documentTitle = documentType === 'estimate' ? '見積書' : '契約書'
  const documentTitleFull = documentType === 'estimate' ? 'キャンピングカー見積書' : 'キャンピングカー契約書'

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 modal-backdrop">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col print:max-w-none print:max-h-none print:shadow-none print:rounded-none">
        {/* ヘッダー（印刷時非表示） */}
        <div className="p-4 border-b flex items-center justify-between bg-gray-50 no-print">
          <div className="flex items-center gap-4">
            <h2 className="text-lg font-bold">{documentTitleFull}プレビュー</h2>
            {/* 見積書/契約書切り替え */}
            <div className="flex items-center gap-1 bg-gray-200 rounded-lg p-1">
              <button
                onClick={() => setDocumentType('estimate')}
                className={`px-3 py-1 text-sm rounded-md transition-colors ${
                  documentType === 'estimate'
                    ? 'bg-white text-blue-600 shadow-sm'
                    : 'text-gray-600 hover:text-gray-800'
                }`}
              >
                見積書
              </button>
              <button
                onClick={() => setDocumentType('contract')}
                className={`px-3 py-1 text-sm rounded-md transition-colors ${
                  documentType === 'contract'
                    ? 'bg-white text-blue-600 shadow-sm'
                    : 'text-gray-600 hover:text-gray-800'
                }`}
              >
                契約書
              </button>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {/* レイアウト設定ボタン */}
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowLayoutSettings(!showLayoutSettings)}
              className={showLayoutSettings ? 'bg-blue-50 border-blue-300' : ''}
            >
              <Settings className="h-4 w-4 mr-2" />
              レイアウト
            </Button>
            {/* ロゴアップロードボタン */}
            <label className="cursor-pointer">
              <input
                type="file"
                accept="image/*"
                onChange={handleLogoUpload}
                className="hidden"
              />
              <span className="inline-flex items-center px-3 py-1.5 text-sm border border-gray-300 rounded-md hover:bg-gray-50">
                <Car className="h-4 w-4 mr-2" />
                ロゴ設定
              </span>
            </label>
            <Button variant="outline" size="sm" onClick={onPrint}>
              <Printer className="h-4 w-4 mr-2" />
              印刷
            </Button>
            <Button variant="outline" size="sm">
              <Download className="h-4 w-4 mr-2" />
              PDF
            </Button>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
              <X className="h-6 w-6" />
            </button>
          </div>
        </div>

        {/* レイアウト設定パネル（印刷時非表示） */}
        {showLayoutSettings && (
          <div className="p-4 border-b bg-blue-50 no-print">
            <div className="grid grid-cols-4 gap-4 text-sm">
              {/* ロゴ位置 */}
              <div>
                <label className="block text-xs text-gray-600 mb-1">ロゴ位置</label>
                <select
                  value={documentLayout.logoPosition}
                  onChange={(e) => updateDocumentLayout({ logoPosition: e.target.value as 'left' | 'center' | 'right' })}
                  className="w-full h-8 px-2 border rounded text-sm"
                >
                  <option value="left">左</option>
                  <option value="center">中央</option>
                  <option value="right">右</option>
                </select>
              </div>
              {/* ロゴサイズ */}
              <div>
                <label className="block text-xs text-gray-600 mb-1">ロゴサイズ: {documentLayout.logoSize}px</label>
                <input
                  type="range"
                  min="32"
                  max="80"
                  value={documentLayout.logoSize}
                  onChange={(e) => updateDocumentLayout({ logoSize: parseInt(e.target.value) })}
                  className="w-full"
                />
              </div>
              {/* 左右マージン */}
              <div>
                <label className="block text-xs text-gray-600 mb-1">左右余白: {documentLayout.pageMarginX}mm</label>
                <input
                  type="range"
                  min="10"
                  max="30"
                  value={documentLayout.pageMarginX}
                  onChange={(e) => updateDocumentLayout({ pageMarginX: parseInt(e.target.value) })}
                  className="w-full"
                />
              </div>
              {/* 上下マージン */}
              <div>
                <label className="block text-xs text-gray-600 mb-1">上下余白: {documentLayout.pageMarginY}mm</label>
                <input
                  type="range"
                  min="10"
                  max="25"
                  value={documentLayout.pageMarginY}
                  onChange={(e) => updateDocumentLayout({ pageMarginY: parseInt(e.target.value) })}
                  className="w-full"
                />
              </div>
              {/* サブタイトル表示 */}
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={documentLayout.showSubTitle}
                  onChange={(e) => updateDocumentLayout({ showSubTitle: e.target.checked })}
                  className="h-4 w-4"
                />
                <label className="text-xs text-gray-600">サブタイトル表示</label>
              </div>
              {/* サブタイトル文言 */}
              <div className="col-span-3">
                <label className="block text-xs text-gray-600 mb-1">サブタイトル</label>
                <input
                  type="text"
                  value={documentLayout.subTitle}
                  onChange={(e) => updateDocumentLayout({ subTitle: e.target.value })}
                  className="w-full h-8 px-2 border rounded text-sm"
                  disabled={!documentLayout.showSubTitle}
                />
              </div>
            </div>
          </div>
        )}

        {/* プレビュー内容 */}
        <div className="flex-1 overflow-y-auto p-6 bg-gray-200 print:p-0 print:bg-white print-content">
          <div
            className="bg-white shadow-xl mx-auto estimate-print"
            style={{
              width: '210mm',
              minHeight: '297mm',
              padding: `${documentLayout.pageMarginY}mm ${documentLayout.pageMarginX}mm`
            }}
          >

            {/* ロゴ・会社名エリア */}
            <div className="mb-6">
              <div className={`flex items-center gap-3 ${
                documentLayout.logoPosition === 'center' ? 'justify-center' :
                documentLayout.logoPosition === 'right' ? 'justify-end' : 'justify-start'
              }`}>
                {company.logoUrl ? (
                  <img
                    src={company.logoUrl}
                    alt="会社ロゴ"
                    style={{ height: `${documentLayout.logoSize}px` }}
                    className="w-auto object-contain"
                  />
                ) : (
                  <div
                    style={{ width: `${documentLayout.logoSize}px`, height: `${documentLayout.logoSize}px` }}
                    className="bg-gradient-to-br from-blue-600 to-blue-800 rounded-lg flex items-center justify-center"
                  >
                    <span className="text-white font-bold text-xl">K</span>
                  </div>
                )}
                <div>
                  <h1 className="text-2xl font-bold text-gray-800 tracking-wide">{company.name}</h1>
                  {documentLayout.showSubTitle && (
                    <p className="text-xs text-gray-500">{documentLayout.subTitle}</p>
                  )}
                </div>
              </div>
            </div>

            {/* 見積書/契約書タイトル */}
            <div className="text-right mb-8">
              <h2 className="text-3xl font-bold text-gray-800 tracking-widest">{documentTitle}</h2>
            </div>

            {/* 会社情報・見積/契約情報 */}
            <div className="flex justify-between mb-6 text-sm">
              <div className="space-y-1">
                <p className="text-gray-600">〒{company.zipCode}</p>
                <p className="text-gray-600">{company.address}</p>
                <p className="text-gray-600 mt-2">Tel: {company.phone}</p>
                <p className="text-blue-600">{company.website}</p>
              </div>
              <div className="text-right space-y-1">
                <div className="grid grid-cols-2 gap-x-4 text-sm">
                  <span className="text-gray-500">{documentType === 'estimate' ? '見積書番号' : '契約書番号'}</span>
                  <span className="font-medium">{estimate.estimateNo}</span>
                  <span className="text-gray-500">{documentType === 'estimate' ? '見積書発行日' : '契約日'}</span>
                  <span className="font-medium">{formatDate(estimate.createdAt)}</span>
                  {documentType === 'estimate' && (
                    <>
                      <span className="text-gray-500">有効期限</span>
                      <span className="font-medium">発行日より1ヶ月</span>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* お客様情報・納車情報 */}
            <div className="grid grid-cols-2 gap-6 mb-6">
              <div className="border border-gray-300">
                <div className="bg-gray-100 px-3 py-2 border-b border-gray-300">
                  <span className="font-bold text-sm">お客様情報</span>
                </div>
                <div className="p-3 text-sm space-y-1">
                  <p className="font-medium">{estimate.customerName || '—'}</p>
                  <p className="text-gray-600">{estimate.postalCode && `〒${estimate.postalCode}`}</p>
                  <p className="text-gray-600">{estimate.address || '—'}</p>
                  <p className="text-gray-600">{estimate.phone || '—'}</p>
                </div>
              </div>
              <div className="border border-gray-300">
                <div className="bg-gray-100 px-3 py-2 border-b border-gray-300">
                  <span className="font-bold text-sm">車両情報</span>
                </div>
                <div className="p-3 text-sm space-y-1">
                  <p className="font-medium">{estimate.vehicleName || '—'}</p>
                  <p className="text-gray-600">{estimate.vehicleBase}</p>
                  <p className="text-gray-600">{estimate.vehicleDrive}</p>
                  {estimate.bodyColor && <p className="text-gray-600">ボディー色: {estimate.bodyColor}</p>}
                  <div className="flex gap-4 text-gray-600">
                    {estimate.seatingCapacity && <span>乗車定員: {estimate.seatingCapacity}名</span>}
                    {estimate.sleepingCapacity && <span>就寝定員: {estimate.sleepingCapacity}名</span>}
                  </div>
                  {estimate.desiredPlateNumber && <p className="text-gray-600">希望ナンバー: {estimate.desiredPlateNumber}</p>}
                </div>
              </div>
            </div>

            {/* 車両仕様詳細 */}
            {(estimate.seatFabric || estimate.curtainFabric) && (
              <div className="border border-gray-300 mb-6">
                <div className="bg-gray-100 px-3 py-2 border-b border-gray-300">
                  <span className="font-bold text-sm">内装仕様</span>
                </div>
                <div className="p-3 text-sm grid grid-cols-2 gap-2">
                  {estimate.seatFabric && <p className="text-gray-600">椅子生地: {estimate.seatFabric}</p>}
                  {estimate.curtainFabric && <p className="text-gray-600">カーテン生地: {estimate.curtainFabric}</p>}
                </div>
              </div>
            )}

            {/* 明細テーブル */}
            <table className="w-full text-sm border-collapse mb-6">
              <thead>
                <tr className="bg-gray-800 text-white">
                  <th className="py-2 px-3 text-left font-medium w-16">項目</th>
                  <th className="py-2 px-3 text-left font-medium">品名</th>
                  <th className="py-2 px-3 text-right font-medium w-24">税抜価格</th>
                  <th className="py-2 px-3 text-center font-medium w-12">数量</th>
                  <th className="py-2 px-3 text-center font-medium w-20">消費税(%)</th>
                  <th className="py-2 px-3 text-right font-medium w-28">合計</th>
                </tr>
              </thead>
              <tbody>
                {/* 車両本体 */}
                <tr className="border-b border-gray-200">
                  <td className="py-2 px-3 text-gray-600">VEH001</td>
                  <td className="py-2 px-3">{estimate.vehicleName}<br/><span className="text-xs text-gray-500">{estimate.vehicleBase}</span></td>
                  <td className="py-2 px-3 text-right">{formatNumber(estimate.vehiclePrice)}</td>
                  <td className="py-2 px-3 text-center">1</td>
                  <td className="py-2 px-3 text-center">10</td>
                  <td className="py-2 px-3 text-right font-medium">{formatNumber(Math.round(estimate.vehiclePrice * 1.1))}</td>
                </tr>

                {/* オプション */}
                {estimate.options.map((opt, idx) => (
                  <tr key={opt.id} className="border-b border-gray-200">
                    <td className="py-2 px-3 text-gray-600">OPT{String(idx + 1).padStart(3, '0')}</td>
                    <td className="py-2 px-3">{opt.optionName}</td>
                    <td className="py-2 px-3 text-right">{formatNumber(opt.unitPrice)}</td>
                    <td className="py-2 px-3 text-center">{opt.quantity}</td>
                    <td className="py-2 px-3 text-center">10</td>
                    <td className="py-2 px-3 text-right font-medium">{formatNumber(Math.round(opt.amount * 1.1))}</td>
                  </tr>
                ))}

                {/* 諸費用 */}
                <tr className="border-b border-gray-200 bg-gray-50">
                  <td className="py-2 px-3 text-gray-600">TAX001</td>
                  <td className="py-2 px-3">環境性能割</td>
                  <td className="py-2 px-3 text-right">{formatNumber(estimate.taxEnv)}</td>
                  <td className="py-2 px-3 text-center">1</td>
                  <td className="py-2 px-3 text-center">0</td>
                  <td className="py-2 px-3 text-right font-medium">{formatNumber(estimate.taxEnv)}</td>
                </tr>
                <tr className="border-b border-gray-200 bg-gray-50">
                  <td className="py-2 px-3 text-gray-600">TAX002</td>
                  <td className="py-2 px-3">重量税</td>
                  <td className="py-2 px-3 text-right">{formatNumber(estimate.taxWeight)}</td>
                  <td className="py-2 px-3 text-center">1</td>
                  <td className="py-2 px-3 text-center">0</td>
                  <td className="py-2 px-3 text-right font-medium">{formatNumber(estimate.taxWeight)}</td>
                </tr>
                <tr className="border-b border-gray-200 bg-gray-50">
                  <td className="py-2 px-3 text-gray-600">INS001</td>
                  <td className="py-2 px-3">自賠責保険料</td>
                  <td className="py-2 px-3 text-right">{formatNumber(estimate.insurance)}</td>
                  <td className="py-2 px-3 text-center">1</td>
                  <td className="py-2 px-3 text-center">0</td>
                  <td className="py-2 px-3 text-right font-medium">{formatNumber(estimate.insurance)}</td>
                </tr>
                <tr className="border-b border-gray-200 bg-gray-50">
                  <td className="py-2 px-3 text-gray-600">REG001</td>
                  <td className="py-2 px-3">登録代行手数料</td>
                  <td className="py-2 px-3 text-right">{formatNumber(estimate.registrationFee)}</td>
                  <td className="py-2 px-3 text-center">1</td>
                  <td className="py-2 px-3 text-center">10</td>
                  <td className="py-2 px-3 text-right font-medium">{formatNumber(Math.round(estimate.registrationFee * 1.1))}</td>
                </tr>
                <tr className="border-b border-gray-200 bg-gray-50">
                  <td className="py-2 px-3 text-gray-600">GAR001</td>
                  <td className="py-2 px-3">車庫証明代行</td>
                  <td className="py-2 px-3 text-right">{formatNumber(estimate.garageRegistrationFee)}</td>
                  <td className="py-2 px-3 text-center">1</td>
                  <td className="py-2 px-3 text-center">10</td>
                  <td className="py-2 px-3 text-right font-medium">{formatNumber(Math.round(estimate.garageRegistrationFee * 1.1))}</td>
                </tr>
                {estimate.deliveryFee > 0 && (
                  <tr className="border-b border-gray-200 bg-gray-50">
                    <td className="py-2 px-3 text-gray-600">DLV001</td>
                    <td className="py-2 px-3">納車費用</td>
                    <td className="py-2 px-3 text-right">{formatNumber(estimate.deliveryFee)}</td>
                    <td className="py-2 px-3 text-center">1</td>
                    <td className="py-2 px-3 text-center">10</td>
                    <td className="py-2 px-3 text-right font-medium">{formatNumber(Math.round(estimate.deliveryFee * 1.1))}</td>
                  </tr>
                )}
                <tr className="border-b border-gray-200 bg-gray-50">
                  <td className="py-2 px-3 text-gray-600">RCY001</td>
                  <td className="py-2 px-3">リサイクル預託金</td>
                  <td className="py-2 px-3 text-right">{formatNumber(estimate.recycleFee)}</td>
                  <td className="py-2 px-3 text-center">1</td>
                  <td className="py-2 px-3 text-center">0</td>
                  <td className="py-2 px-3 text-right font-medium">{formatNumber(estimate.recycleFee)}</td>
                </tr>

                {/* 追加の諸費用 */}
                {estimate.additionalFees?.map((fee, idx) => (
                  fee.amount > 0 && (
                    <tr key={fee.id} className="border-b border-gray-200 bg-gray-50">
                      <td className="py-2 px-3 text-gray-600">ADD{String(idx + 1).padStart(3, '0')}</td>
                      <td className="py-2 px-3">{fee.name}</td>
                      <td className="py-2 px-3 text-right">{formatNumber(fee.amount)}</td>
                      <td className="py-2 px-3 text-center">1</td>
                      <td className="py-2 px-3 text-center">{fee.isTaxable ? 10 : 0}</td>
                      <td className="py-2 px-3 text-right font-medium">{formatNumber(fee.isTaxable ? Math.round(fee.amount * 1.1) : fee.amount)}</td>
                    </tr>
                  )
                ))}
              </tbody>
            </table>

            {/* 合計エリア */}
            <div className="flex justify-between items-start mb-6">
              <div className="text-xs text-gray-500 max-w-md">
                <p className="mb-2">下記の銀行口座にお振込みをお願いいたします。恐れ入りますが、お振込みの際の手数料はお客様負担とさせていただいております。</p>
                <div className="border border-gray-300 p-3 bg-gray-50">
                  <p className="font-medium">{company.bankName} {company.bankBranch}</p>
                  <p>{company.accountType} {company.accountNumber}</p>
                  <p>{company.accountName}</p>
                </div>
              </div>
              <div className="border border-gray-300 min-w-64">
                <div className="flex justify-between px-4 py-2 border-b border-gray-200">
                  <span className="text-gray-600">税抜価格 合計</span>
                  <span className="font-medium">{formatNumber(estimate.taxableAmount)}</span>
                </div>
                <div className="flex justify-between px-4 py-2 border-b border-gray-200">
                  <span className="text-gray-600">消費税</span>
                  <span className="font-medium">{formatNumber(estimate.consumptionTax)}</span>
                </div>
                <div className="flex justify-between px-4 py-2 border-b border-gray-200">
                  <span className="text-gray-600">法定費用等（非課税）</span>
                  <span className="font-medium">{formatNumber(
                    estimate.taxEnv + estimate.taxWeight + estimate.insurance + estimate.recycleFee +
                    (estimate.additionalFees?.filter(f => f.isTaxable === false).reduce((sum, f) => sum + f.amount, 0) || 0)
                  )}</span>
                </div>
                <div className="flex justify-between px-4 py-3 bg-gray-800 text-white font-bold">
                  <span>合計（税込）</span>
                  <span>{formatNumber(estimate.totalAmount)}</span>
                </div>
                {(estimate.tradeInPrice > 0 || estimate.discount > 0) && (
                  <>
                    <div className="flex justify-between px-4 py-2 border-b border-gray-200 text-green-600">
                      <span>下取り・値引き</span>
                      <span>({formatNumber(estimate.tradeInPrice + estimate.discount)})</span>
                    </div>
                    <div className="flex justify-between px-4 py-3 bg-blue-600 text-white font-bold">
                      <span>お支払い額</span>
                      <span>{formatNumber(estimate.totalAmount)}</span>
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* 支払条件・納期 */}
            {(estimate.paymentTerms?.depositPercentage || estimate.deliveryTiming) && (
              <div className="mb-6 border border-gray-300">
                <div className="bg-gray-100 px-3 py-2 border-b border-gray-300">
                  <span className="font-bold text-sm">支払条件及び納期</span>
                </div>
                <div className="p-3 text-sm">
                  {estimate.paymentTerms && (estimate.paymentTerms.depositPercentage > 0 || estimate.paymentTerms.interimPercentage > 0 || estimate.paymentTerms.balancePercentage > 0) && (
                    <div className="grid grid-cols-3 gap-4 mb-3">
                      {estimate.paymentTerms.depositPercentage > 0 && (
                        <div>
                          <p className="text-gray-500 text-xs">手付け申し込み金</p>
                          <p className="font-medium">{estimate.paymentTerms.depositPercentage}% ({formatNumber(estimate.paymentTerms.depositAmount)}円)</p>
                        </div>
                      )}
                      {estimate.paymentTerms.interimPercentage > 0 && (
                        <div>
                          <p className="text-gray-500 text-xs">中間内金</p>
                          <p className="font-medium">{estimate.paymentTerms.interimPercentage}% ({formatNumber(estimate.paymentTerms.interimAmount)}円)</p>
                        </div>
                      )}
                      {estimate.paymentTerms.balancePercentage > 0 && (
                        <div>
                          <p className="text-gray-500 text-xs">残金</p>
                          <p className="font-medium">{estimate.paymentTerms.balancePercentage}% ({formatNumber(estimate.paymentTerms.balanceAmount)}円)</p>
                        </div>
                      )}
                    </div>
                  )}
                  {estimate.deliveryTiming && (
                    <p className="text-gray-700">納車時期: <span className="font-medium">{estimate.deliveryTiming}</span></p>
                  )}
                </div>
              </div>
            )}

            {/* 下取り車詳細情報 */}
            {(estimate.tradeInVehicle || estimate.tradeInDetails?.name) && (
              <div className="mb-6 border border-gray-300 bg-orange-50">
                <div className="bg-orange-100 px-3 py-2 border-b border-orange-200">
                  <span className="font-bold text-sm text-orange-800">下取り車両情報</span>
                </div>
                <div className="p-3 text-sm">
                  <div className="flex justify-between items-start">
                    <div className="space-y-1">
                      <p className="font-medium text-orange-900">{estimate.tradeInDetails?.name || estimate.tradeInVehicle}</p>
                      {estimate.tradeInDetails && (
                        <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-gray-700 text-xs">
                          {estimate.tradeInDetails.grade && <p>グレード: {estimate.tradeInDetails.grade}</p>}
                          {estimate.tradeInDetails.year && <p>年式: {estimate.tradeInDetails.year}</p>}
                          {estimate.tradeInDetails.mileage && <p>走行距離: {estimate.tradeInDetails.mileage}</p>}
                          {estimate.tradeInDetails.driveType && <p>駆動: {estimate.tradeInDetails.driveType}</p>}
                          {estimate.tradeInDetails.color && <p>色: {estimate.tradeInDetails.color}</p>}
                          {estimate.tradeInDetails.repairHistory && <p>修復歴: {estimate.tradeInDetails.repairHistory}</p>}
                          {estimate.tradeInDetails.equipment && <p className="col-span-2">装備: {estimate.tradeInDetails.equipment}</p>}
                        </div>
                      )}
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-orange-600">下取り価格</p>
                      <p className="text-lg font-bold text-orange-800">{formatCurrency(estimate.tradeInPrice)}</p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* 備考 */}
            {estimate.notes && (
              <div className="mb-6">
                <p className="text-sm font-medium mb-1">備考</p>
                <div className="border border-gray-300 p-3 text-sm text-gray-600 whitespace-pre-wrap">
                  {estimate.notes}
                </div>
              </div>
            )}

            {/* フッター注意書き */}
            <div className="border-t border-gray-300 pt-4 text-xs text-gray-500 space-y-1">
              <p>お支払期日: 車両登録日の5営業日前までにお支払いをお願いします。</p>
              <p>車両登録日は納車担当よりご案内いたします。</p>
              <p className="mt-2">※本見積書の有効期限は発行日より1ヶ月間です。</p>
              <p>※価格は予告なく変更される場合があります。</p>
            </div>

          </div>
        </div>
      </div>
    </div>
  )
}

