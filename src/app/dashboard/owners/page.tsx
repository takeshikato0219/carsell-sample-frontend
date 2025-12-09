'use client'

import { useState, useMemo, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Search, Filter, UserCheck, Car, Calendar, Phone, Mail, AlertTriangle, X, Bell, RefreshCw, Clock, ChevronRight } from 'lucide-react'
import api from '@/lib/api'
import { Customer, CustomerStatus } from '@/types'
import Link from 'next/link'
import { mockCustomers } from '@/lib/mock-data'
import { useCustomerStore } from '@/stores/customer-store'
import { useSalesTargetStore } from '@/stores/sales-target-store'
import { useSettingsStore } from '@/stores/settings-store'

// 日付フォーマット
function formatDate(dateString?: string): string {
  if (!dateString) return '-'
  const date = new Date(dateString)
  return `${date.getFullYear()}/${date.getMonth() + 1}/${date.getDate()}`
}

// 最終連絡日から経過した日数を計算
function getDaysSinceLastContact(lastContactedAt?: string, deliveredDate?: string): number {
  const referenceDate = lastContactedAt || deliveredDate
  if (!referenceDate) return 999 // 連絡日が不明な場合は要連絡とみなす
  const lastContact = new Date(referenceDate)
  const now = new Date()
  return Math.floor((now.getTime() - lastContact.getTime()) / (24 * 60 * 60 * 1000))
}

// 連絡が必要かどうか判定
function needsContact(lastContactedAt?: string, deliveredDate?: string): boolean {
  const daysSince = getDaysSinceLastContact(lastContactedAt, deliveredDate)
  return daysSince >= 90
}

// 納車からの経過年数を計算
function getYearsSinceDelivery(deliveredDate?: string): number {
  if (!deliveredDate) return 0
  const delivered = new Date(deliveredDate)
  const now = new Date()
  return Math.floor((now.getTime() - delivered.getTime()) / (365 * 24 * 60 * 60 * 1000))
}

// 乗り換え提案タイミングかどうか判定（3年以上で乗り換え提案）
function isTradeInTiming(deliveredDate?: string): boolean {
  return getYearsSinceDelivery(deliveredDate) >= 3
}

export default function OwnersPage() {
  const [searchQuery, setSearchQuery] = useState('')
  const [salesRepFilter, setSalesRepFilter] = useState<string>('all')
  const [showContactAlert, setShowContactAlert] = useState(true)
  const [showTradeInAlert, setShowTradeInAlert] = useState(true)
  const [dismissedAlerts, setDismissedAlerts] = useState<Set<string>>(new Set())
  const [viewFilter, setViewFilter] = useState<'all' | 'trade-in' | 'needs-contact'>('all')

  // 設定ストアから営業担当者リストを取得
  const { salesReps } = useSettingsStore()

  // 営業目標ストアから契約情報を取得（納車済み）
  const { contracts } = useSalesTargetStore()

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
  } = useCustomerStore()

  const { data: fetchedCustomers, isLoading } = useQuery<Customer[]>({
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

  // ストアのデータを使用
  const customers = isInitialized ? storeCustomers : fetchedCustomers

  // 納車済み契約情報を取得
  const deliveredContracts = useMemo(() => {
    return contracts.filter(c => c.isDelivered)
  }, [contracts])

  // オーナー顧客をフィルタリング
  const filteredCustomers = useMemo(() => {
    if (!customers) return []

    let result = customers.filter(customer => customer.status === CustomerStatus.OWNER)

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

  // 3ヶ月以上連絡していないオーナーをリストアップ
  const ownersNeedingContact = useMemo(() => {
    if (!customers) return []

    const owners = customers.filter(c => c.status === CustomerStatus.OWNER)
    return owners.filter(owner => {
      const contract = deliveredContracts.find(c => c.customerId === owner.id)
      return needsContact(owner.lastContactedAt, contract?.deliveredDate) && !dismissedAlerts.has(owner.id)
    }).map(owner => {
      const contract = deliveredContracts.find(c => c.customerId === owner.id)
      const daysSince = getDaysSinceLastContact(owner.lastContactedAt, contract?.deliveredDate)
      return { ...owner, daysSinceContact: daysSince, contract }
    }).sort((a, b) => b.daysSinceContact - a.daysSinceContact) // 連絡が遅いオーナー順
  }, [customers, deliveredContracts, dismissedAlerts])

  // 乗り換え提案対象オーナーをリストアップ（3年以上経過）
  const ownersForTradeIn = useMemo(() => {
    if (!customers) return []

    const owners = customers.filter(c => c.status === CustomerStatus.OWNER)
    return owners.filter(owner => {
      const contract = deliveredContracts.find(c => c.customerId === owner.id)
      return contract && isTradeInTiming(contract.deliveredDate) && !dismissedAlerts.has(`tradein-${owner.id}`)
    }).map(owner => {
      const contract = deliveredContracts.find(c => c.customerId === owner.id)
      const yearsSince = getYearsSinceDelivery(contract?.deliveredDate)
      return { ...owner, yearsSinceDelivery: yearsSince, contract }
    }).sort((a, b) => b.yearsSinceDelivery - a.yearsSinceDelivery) // 経過年数が長い順
  }, [customers, deliveredContracts, dismissedAlerts])

  // 統計情報
  const stats = useMemo(() => {
    const owners = customers?.filter(c => c.status === CustomerStatus.OWNER) || []

    return {
      totalOwners: owners.length,
      deliveredCount: deliveredContracts.length,
      needsContactCount: ownersNeedingContact.length,
      tradeInCount: ownersForTradeIn.length,
    }
  }, [customers, deliveredContracts, ownersNeedingContact, ownersForTradeIn])

  return (
    <div className="h-full flex flex-col">
      {/* ヘッダー */}
      <div className="flex-shrink-0 px-6 py-4 bg-white border-b">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">オーナーリスト</h1>
            <p className="text-sm text-gray-600 mt-0.5">納車済みのオーナー様を管理</p>
          </div>
        </div>

        {/* 乗り換え提案アラート */}
        {showTradeInAlert && ownersForTradeIn.length > 0 && (
          <div className="mb-4 bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-start justify-between">
              <div className="flex items-start gap-3">
                <RefreshCw className="h-5 w-5 text-blue-500 mt-0.5 flex-shrink-0" />
                <div>
                  <h3 className="text-sm font-semibold text-blue-800">
                    乗り換え提案のチャンス！ {ownersForTradeIn.length} 名のオーナー様
                  </h3>
                  <p className="text-xs text-blue-600 mt-1">
                    納車から3年以上経過したオーナー様です。新車への乗り換えをご提案しましょう。
                  </p>
                  <div className="mt-3 space-y-2 max-h-40 overflow-y-auto">
                    {ownersForTradeIn.slice(0, 5).map(owner => (
                      <div key={owner.id} className="flex items-center justify-between bg-white rounded p-2 border border-blue-100">
                        <div className="flex items-center gap-3">
                          <Link
                            href={`/dashboard/customers/${owner.id}`}
                            className="text-sm font-medium text-blue-800 hover:underline"
                          >
                            {owner.name}
                          </Link>
                          <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded">
                            {owner.contract?.vehicleModel || '車種不明'}
                          </span>
                          <span className="text-xs text-blue-600">
                            {owner.yearsSinceDelivery}年経過
                          </span>
                        </div>
                        <button
                          onClick={() => setDismissedAlerts(prev => new Set([...prev, `tradein-${owner.id}`]))}
                          className="text-gray-400 hover:text-gray-600"
                          title="このアラートを消す"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    ))}
                    {ownersForTradeIn.length > 5 && (
                      <p className="text-xs text-blue-600 text-center pt-1">
                        他 {ownersForTradeIn.length - 5} 名...
                      </p>
                    )}
                  </div>
                </div>
              </div>
              <button
                onClick={() => setShowTradeInAlert(false)}
                className="text-blue-400 hover:text-blue-600"
                title="アラートを閉じる"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>
        )}

        {/* 3ヶ月連絡なしアラート */}
        {showContactAlert && ownersNeedingContact.length > 0 && (
          <div className="mb-4 bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex items-start justify-between">
              <div className="flex items-start gap-3">
                <AlertTriangle className="h-5 w-5 text-red-500 mt-0.5 flex-shrink-0" />
                <div>
                  <h3 className="text-sm font-semibold text-red-800">
                    要連絡のオーナーが {ownersNeedingContact.length} 名います
                  </h3>
                  <p className="text-xs text-red-600 mt-1">
                    3ヶ月以上連絡していないオーナー様がいます。定期的なフォローアップをお願いします。
                  </p>
                  <div className="mt-3 space-y-2 max-h-40 overflow-y-auto">
                    {ownersNeedingContact.slice(0, 5).map(owner => (
                      <div key={owner.id} className="flex items-center justify-between bg-white rounded p-2 border border-red-100">
                        <div className="flex items-center gap-3">
                          <Link
                            href={`/dashboard/customers/${owner.id}`}
                            className="text-sm font-medium text-red-800 hover:underline"
                          >
                            {owner.name}
                          </Link>
                          {owner.assignedSalesRepName && (
                            <span className={`text-xs px-2 py-0.5 rounded ${owner.assignedSalesRepColor || 'bg-gray-100 text-gray-600'}`}>
                              {owner.assignedSalesRepName}
                            </span>
                          )}
                          <span className="text-xs text-red-600">
                            {owner.daysSinceContact >= 999 ? '連絡履歴なし' : `${owner.daysSinceContact}日前`}
                          </span>
                        </div>
                        <button
                          onClick={() => setDismissedAlerts(prev => new Set([...prev, owner.id]))}
                          className="text-gray-400 hover:text-gray-600"
                          title="このアラートを消す"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    ))}
                    {ownersNeedingContact.length > 5 && (
                      <p className="text-xs text-red-600 text-center pt-1">
                        他 {ownersNeedingContact.length - 5} 名...
                      </p>
                    )}
                  </div>
                </div>
              </div>
              <button
                onClick={() => setShowContactAlert(false)}
                className="text-red-400 hover:text-red-600"
                title="アラートを閉じる"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>
        )}

        {/* 統計カード */}
        <div className="grid grid-cols-4 gap-4 mb-4">
          <div className="bg-green-50 rounded-lg p-4 border border-green-100">
            <div className="flex items-center gap-2 mb-1">
              <UserCheck className="h-4 w-4 text-green-600" />
              <span className="text-xs text-green-600 font-medium">オーナー数</span>
            </div>
            <p className="text-2xl font-bold text-green-700">{stats.totalOwners}名</p>
          </div>
          <div className="bg-blue-50 rounded-lg p-4 border border-blue-100">
            <div className="flex items-center gap-2 mb-1">
              <Car className="h-4 w-4 text-blue-600" />
              <span className="text-xs text-blue-600 font-medium">納車済み台数</span>
            </div>
            <p className="text-2xl font-bold text-blue-700">{stats.deliveredCount}台</p>
          </div>
          <div className={`rounded-lg p-4 border cursor-pointer transition-colors ${
            stats.tradeInCount > 0
              ? 'bg-purple-50 border-purple-200 hover:bg-purple-100'
              : 'bg-gray-50 border-gray-100'
          }`} onClick={() => stats.tradeInCount > 0 && setShowTradeInAlert(true)}>
            <div className="flex items-center gap-2 mb-1">
              <RefreshCw className={`h-4 w-4 ${stats.tradeInCount > 0 ? 'text-purple-600' : 'text-gray-400'}`} />
              <span className={`text-xs font-medium ${stats.tradeInCount > 0 ? 'text-purple-600' : 'text-gray-500'}`}>乗り換え提案</span>
            </div>
            <p className={`text-2xl font-bold ${stats.tradeInCount > 0 ? 'text-purple-700' : 'text-gray-500'}`}>
              {stats.tradeInCount}名
            </p>
          </div>
          <div className={`rounded-lg p-4 border cursor-pointer transition-colors ${
            stats.needsContactCount > 0
              ? 'bg-red-50 border-red-200 hover:bg-red-100'
              : 'bg-gray-50 border-gray-100'
          }`} onClick={() => stats.needsContactCount > 0 && setShowContactAlert(true)}>
            <div className="flex items-center gap-2 mb-1">
              <Bell className={`h-4 w-4 ${stats.needsContactCount > 0 ? 'text-red-600' : 'text-gray-400'}`} />
              <span className={`text-xs font-medium ${stats.needsContactCount > 0 ? 'text-red-600' : 'text-gray-500'}`}>要連絡</span>
            </div>
            <p className={`text-2xl font-bold ${stats.needsContactCount > 0 ? 'text-red-700' : 'text-gray-500'}`}>
              {stats.needsContactCount}名
            </p>
          </div>
        </div>

        {/* 検索バーと営業担当者フィルター */}
        <div className="flex items-center gap-4">
          <div className="flex items-center space-x-2 flex-1 max-w-md">
            <Search className="h-4 w-4 text-gray-400" />
            <Input
              placeholder="顧客名、メール、電話番号で検索..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="flex-1"
            />
          </div>

          {/* 営業担当者フィルター */}
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-gray-400" />
            <select
              value={salesRepFilter}
              onChange={(e) => setSalesRepFilter(e.target.value)}
              className="h-10 px-3 py-2 rounded-md border border-gray-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
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
                salesRepOptions.find(r => r.value === salesRepFilter)?.color || 'bg-gray-100 text-gray-700'
              }`}>
                {salesRepOptions.find(r => r.value === salesRepFilter)?.name}
                <button
                  onClick={() => setSalesRepFilter('all')}
                  className="ml-1.5 hover:text-gray-900"
                >
                  ×
                </button>
              </span>
            </div>
          )}
        </div>
      </div>

      {/* リスト */}
      <div className="flex-1 overflow-auto p-6 bg-gray-50">
        {isLoading ? (
          <div className="flex items-center justify-center h-64">
            <div className="text-gray-500">読み込み中...</div>
          </div>
        ) : filteredCustomers.length === 0 ? (
          <div className="flex items-center justify-center h-64">
            <div className="text-center text-gray-500">
              <UserCheck className="h-12 w-12 mx-auto mb-4 text-gray-300" />
              <p>オーナーはまだいません</p>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredCustomers.map((customer) => {
              // 契約情報を探す
              const contract = deliveredContracts.find(c => c.customerId === customer.id)
              // 連絡が必要かどうか
              const contactRequired = needsContact(customer.lastContactedAt, contract?.deliveredDate)
              const daysSince = getDaysSinceLastContact(customer.lastContactedAt, contract?.deliveredDate)

              return (
                <Link
                  key={customer.id}
                  href={`/dashboard/customers/${customer.id}`}
                  className={`bg-white rounded-lg shadow-sm border p-4 hover:shadow-md transition-shadow ${
                    contactRequired ? 'border-red-300 ring-1 ring-red-100' : 'border-gray-200'
                  }`}
                >
                  {/* 要連絡アラート */}
                  {contactRequired && (
                    <div className="flex items-center gap-1.5 mb-2 text-red-600 bg-red-50 rounded px-2 py-1">
                      <AlertTriangle className="h-3.5 w-3.5" />
                      <span className="text-xs font-medium">
                        要連絡 ({daysSince >= 999 ? '連絡履歴なし' : `${daysSince}日経過`})
                      </span>
                    </div>
                  )}
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">{customer.name}</h3>
                      {customer.assignedSalesRepName && (
                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium mt-1 ${customer.assignedSalesRepColor || 'bg-gray-100 text-gray-700'}`}>
                          {customer.assignedSalesRepName}
                        </span>
                      )}
                    </div>
                    <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700">
                      オーナー
                    </span>
                  </div>

                  {/* 連絡先 */}
                  <div className="space-y-1 mb-3">
                    {(customer.phone || customer.mobile) && (
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <Phone className="h-3.5 w-3.5" />
                        <span>{customer.phone || customer.mobile}</span>
                      </div>
                    )}
                    {customer.email && (
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <Mail className="h-3.5 w-3.5" />
                        <span className="truncate">{customer.email}</span>
                      </div>
                    )}
                  </div>

                  {/* 車両情報 */}
                  {contract && (
                    <div className="border-t pt-3 mt-3 space-y-2">
                      {/* 車種（メイン表示） */}
                      <div className="flex items-center gap-2">
                        <Car className="h-4 w-4 text-blue-500" />
                        <span className="font-medium text-gray-900">{contract.vehicleModel || '車種未設定'}</span>
                      </div>

                      {/* 経過年数バッジ */}
                      {(() => {
                        const years = getYearsSinceDelivery(contract.deliveredDate)
                        const isTradeIn = years >= 3
                        return (
                          <div className={`flex items-center gap-2 px-2 py-1 rounded ${
                            isTradeIn ? 'bg-purple-50' : 'bg-gray-50'
                          }`}>
                            <Clock className={`h-3.5 w-3.5 ${isTradeIn ? 'text-purple-500' : 'text-gray-400'}`} />
                            <span className={`text-sm ${isTradeIn ? 'text-purple-700 font-medium' : 'text-gray-600'}`}>
                              納車から{years}年{years >= 3 && ' - 乗り換え提案チャンス!'}
                            </span>
                          </div>
                        )
                      })()}

                      <div className="flex items-center gap-2 text-sm text-gray-500">
                        <Calendar className="h-3.5 w-3.5" />
                        <span>納車日: {formatDate(contract.deliveredDate)}</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <Phone className="h-3.5 w-3.5 text-gray-400" />
                        <span className={`${contactRequired ? 'text-red-600' : 'text-gray-600'}`}>
                          最終連絡: {customer.lastContactedAt ? formatDate(customer.lastContactedAt) : '未登録'}
                        </span>
                      </div>
                    </div>
                  )}

                  {!contract && customer.interestedCars && customer.interestedCars.length > 0 && (
                    <div className="border-t pt-3 mt-3">
                      <div className="flex items-center gap-2">
                        <Car className="h-4 w-4 text-blue-500" />
                        <span className="font-medium text-gray-900">{customer.interestedCars[0]}</span>
                      </div>
                      <p className="text-xs text-gray-500 mt-1">※契約情報未登録</p>
                    </div>
                  )}

                  {!contract && (!customer.interestedCars || customer.interestedCars.length === 0) && (
                    <div className="border-t pt-3 mt-3">
                      <p className="text-sm text-gray-500 italic">車両情報未登録</p>
                    </div>
                  )}
                </Link>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
