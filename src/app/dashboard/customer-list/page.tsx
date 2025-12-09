'use client'

import { useState, useMemo, useRef, ChangeEvent, useEffect } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Plus, Search, Upload, Download, Trash2, ChevronUp, ChevronDown, Edit2, Check, X } from 'lucide-react'
import api from '@/lib/api'
import { Customer, CustomerStatus } from '@/types'
import Link from 'next/link'
import { mockCustomers } from '@/lib/mock-data'
import { useCustomerStore } from '@/stores/customer-store'
import { useUserPermissionsStore } from '@/stores/user-permissions-store'
import { exportAllCustomersToCSV, downloadCSV, readCSVFile, importCustomersFromCSV, DuplicateWarning } from '@/lib/csv'

// ステータスラベルと色（ランク分け）
const STATUS_CONFIG: Record<CustomerStatus, { label: string; color: string; bgColor: string }> = {
  [CustomerStatus.NEW]: { label: '新規', color: 'text-blue-700', bgColor: 'bg-blue-100' },
  [CustomerStatus.OWNER]: { label: 'オーナー', color: 'text-green-700', bgColor: 'bg-green-100' },
  [CustomerStatus.AWAITING_DELIVERY]: { label: '納車待ち', color: 'text-teal-700', bgColor: 'bg-teal-100' },
  [CustomerStatus.RANK_A]: { label: 'ランクA', color: 'text-pink-700', bgColor: 'bg-pink-100' },
  [CustomerStatus.RANK_B]: { label: 'ランクB', color: 'text-purple-700', bgColor: 'bg-purple-100' },
  [CustomerStatus.RANK_C]: { label: 'ランクC', color: 'text-orange-700', bgColor: 'bg-orange-100' },
  [CustomerStatus.RANK_N]: { label: 'ランクN', color: 'text-gray-700', bgColor: 'bg-gray-100' },
  [CustomerStatus.CONTRACT]: { label: '契約！', color: 'text-emerald-700', bgColor: 'bg-emerald-100' },
}

// ステータス選択の表示順序
const STATUS_ORDER: CustomerStatus[] = [
  CustomerStatus.NEW,
  CustomerStatus.OWNER,
  CustomerStatus.AWAITING_DELIVERY,
  CustomerStatus.CONTRACT,
  CustomerStatus.RANK_A,
  CustomerStatus.RANK_B,
  CustomerStatus.RANK_C,
  CustomerStatus.RANK_N,
]

// 日付フォーマット
function formatDate(dateString?: string): string {
  if (!dateString) return '-'
  const date = new Date(dateString)
  return `${date.getFullYear()}/${date.getMonth() + 1}/${date.getDate()}`
}

// ソートキーの型
type SortKey = 'name' | 'status' | 'createdAt' | 'lastContactedAt' | 'budget' | 'assignedSalesRepName'
type SortOrder = 'asc' | 'desc'


export default function CustomerListPage() {
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<CustomerStatus | 'all'>('all')
  const [sortKey, setSortKey] = useState<SortKey>('createdAt')
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc')
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editingStatus, setEditingStatus] = useState<CustomerStatus | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const queryClient = useQueryClient()

  // 共有ストアを使用
  const {
    customers: storeCustomers,
    isInitialized,
    initializeCustomers,
    updateCustomerStatus,
    addCustomers,
    deleteCustomers,
  } = useCustomerStore()

  // ユーザー管理ストア（担当名紐づけ用）
  const { users } = useUserPermissionsStore()

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

  // ストアのデータを使用（初期化前はfetchedCustomersを使用）
  const customers = isInitialized ? storeCustomers : (fetchedCustomers || [])

  // フィルタリングとソート
  const filteredAndSortedCustomers = useMemo(() => {
    let result = [...customers]

    // ステータスフィルター
    if (statusFilter !== 'all') {
      result = result.filter(c => c.status === statusFilter)
    }

    // ソート
    result.sort((a, b) => {
      let aVal: string | number | undefined
      let bVal: string | number | undefined

      switch (sortKey) {
        case 'name':
          aVal = a.name || ''
          bVal = b.name || ''
          break
        case 'status':
          aVal = (a.status && STATUS_CONFIG[a.status]?.label) || ''
          bVal = (b.status && STATUS_CONFIG[b.status]?.label) || ''
          break
        case 'createdAt':
          aVal = a.createdAt || ''
          bVal = b.createdAt || ''
          break
        case 'lastContactedAt':
          aVal = a.lastContactedAt || ''
          bVal = b.lastContactedAt || ''
          break
        case 'budget':
          aVal = a.budget || ''
          bVal = b.budget || ''
          break
        case 'assignedSalesRepName':
          aVal = a.assignedSalesRepName || ''
          bVal = b.assignedSalesRepName || ''
          break
      }

      if (aVal === undefined) aVal = ''
      if (bVal === undefined) bVal = ''

      if (aVal < bVal) return sortOrder === 'asc' ? -1 : 1
      if (aVal > bVal) return sortOrder === 'asc' ? 1 : -1
      return 0
    })

    return result
  }, [customers, statusFilter, sortKey, sortOrder])

  // ソート切り替え
  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')
    } else {
      setSortKey(key)
      setSortOrder('asc')
    }
  }

  // ソートアイコン
  const SortIcon = ({ columnKey }: { columnKey: SortKey }) => {
    if (sortKey !== columnKey) return null
    return sortOrder === 'asc' ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />
  }

  // 選択処理
  const toggleSelect = (id: string) => {
    const newSelected = new Set(selectedIds)
    if (newSelected.has(id)) {
      newSelected.delete(id)
    } else {
      newSelected.add(id)
    }
    setSelectedIds(newSelected)
  }

  const toggleSelectAll = () => {
    if (selectedIds.size === filteredAndSortedCustomers.length) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(filteredAndSortedCustomers.map(c => c.id)))
    }
  }

  // 一括削除
  const handleBulkDelete = () => {
    if (selectedIds.size === 0) return
    if (!confirm(`${selectedIds.size}件の顧客を削除しますか？`)) return

    deleteCustomers(Array.from(selectedIds))
    setSelectedIds(new Set())
  }

  // ステータス編集
  const startEditStatus = (id: string, currentStatus: CustomerStatus) => {
    setEditingId(id)
    setEditingStatus(currentStatus)
  }

  const saveStatus = () => {
    if (!editingId || !editingStatus) return
    updateCustomerStatus(editingId, editingStatus)
    setEditingId(null)
    setEditingStatus(null)
  }

  const cancelEdit = () => {
    setEditingId(null)
    setEditingStatus(null)
  }

  // CSVインポート
  const handleCSVImport = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    try {
      // encoding-japaneseを使用してShift-JIS等にも対応
      const csvText = await readCSVFile(file)

      // ユーザー情報を渡して担当名から自動紐づけ
      // 既存顧客リストを渡して重複チェック
      const userList = users.map(u => ({ id: u.id, name: u.name }))
      const existingCustomerList = customers.map(c => ({ id: c.id, name: c.name, address: c.address }))
      const { customers: importedCustomers, errors, duplicateWarnings } = importCustomersFromCSV(csvText, userList, existingCustomerList)

      if (importedCustomers.length > 0) {
        // 重複警告がある場合は確認ダイアログを表示
        if (duplicateWarnings.length > 0) {
          const warningMessage = duplicateWarnings.map(w =>
            `行${w.csvRow}: ${w.name}（${w.prefecture}）`
          ).join('\n')

          const proceed = confirm(
            `⚠️ 重複の可能性がある顧客が${duplicateWarnings.length}件見つかりました：\n\n` +
            warningMessage +
            `\n\n※ 名前と県が一致しています。\n\nそのままインポートしますか？`
          )

          if (!proceed) {
            e.target.value = ''
            return
          }
        }

        // 紐づけされた件数をカウント
        const linkedCount = importedCustomers.filter(c => c.assignedSalesRepId).length

        addCustomers(importedCustomers as Customer[])

        let message = `${importedCustomers.length}件の顧客をインポートしました`
        if (linkedCount > 0) {
          message += `\n（${linkedCount}件の担当者を自動紐づけ）`
        }
        if (duplicateWarnings.length > 0) {
          message += `\n（${duplicateWarnings.length}件の重複の可能性あり）`
        }
        if (errors.length > 0) {
          message += `\n（${errors.length}件のエラーあり）`
        }
        alert(message)
      } else {
        alert(errors.length > 0 ? errors.join('\n') : 'インポートできる顧客データがありませんでした')
      }
    } catch (error) {
      alert('CSVファイルの読み込みに失敗しました')
      console.error('CSV Import Error:', error)
    }
    e.target.value = ''
  }

  // CSVエクスポート
  const handleCSVExport = () => {
    const dataToExport = selectedIds.size > 0
      ? customers.filter(c => selectedIds.has(c.id))
      : customers

    const csv = exportAllCustomersToCSV(dataToExport)
    const date = new Date()
    const dateStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
    downloadCSV(csv, `顧客一覧_${dateStr}.csv`)
  }

  return (
    <div className="h-full flex flex-col">
      {/* ヘッダー */}
      <div className="flex-shrink-0 px-6 py-4 bg-white border-b">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">顧客管理リスト</h1>
            <p className="text-sm text-gray-600 mt-0.5">
              {customers.length}件の顧客 {selectedIds.size > 0 && `• ${selectedIds.size}件選択中`}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <input
              type="file"
              ref={fileInputRef}
              accept=".csv"
              onChange={handleCSVImport}
              className="hidden"
            />
            <Button variant="outline" onClick={() => fileInputRef.current?.click()}>
              <Upload className="mr-2 h-4 w-4" />
              CSVインポート
            </Button>
            <Button variant="outline" onClick={handleCSVExport}>
              <Download className="mr-2 h-4 w-4" />
              CSVエクスポート
            </Button>
            <Link href="/dashboard/scan">
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                新規顧客登録
              </Button>
            </Link>
          </div>
        </div>

        {/* フィルター・検索 */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 flex-1 max-w-md">
            <Search className="h-4 w-4 text-gray-400" />
            <Input
              placeholder="顧客名、メール、電話番号で検索..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="flex-1"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as CustomerStatus | 'all')}
            className="border rounded-md px-3 py-2 text-sm"
          >
            <option value="all">すべてのステータス</option>
            {STATUS_ORDER.map((status) => (
              <option key={status} value={status}>{STATUS_CONFIG[status].label}</option>
            ))}
          </select>
          {selectedIds.size > 0 && (
            <Button variant="destructive" size="sm" onClick={handleBulkDelete}>
              <Trash2 className="mr-2 h-4 w-4" />
              選択を削除
            </Button>
          )}
        </div>
      </div>

      {/* テーブル */}
      <div className="flex-1 overflow-auto p-6 bg-gray-50">
        {isLoading ? (
          <div className="flex items-center justify-center h-64">
            <div className="text-gray-500">読み込み中...</div>
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50 sticky top-0">
                <tr>
                  <th className="px-3 py-3 w-10">
                    <input
                      type="checkbox"
                      checked={selectedIds.size === filteredAndSortedCustomers.length && filteredAndSortedCustomers.length > 0}
                      onChange={toggleSelectAll}
                      className="rounded border-gray-300"
                    />
                  </th>
                  <th
                    className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                    onClick={() => handleSort('assignedSalesRepName')}
                  >
                    <div className="flex items-center gap-1">
                      担当 <SortIcon columnKey="assignedSalesRepName" />
                    </div>
                  </th>
                  <th
                    className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                    onClick={() => handleSort('name')}
                  >
                    <div className="flex items-center gap-1">
                      お客様名 <SortIcon columnKey="name" />
                    </div>
                  </th>
                  <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    フリガナ
                  </th>
                  <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    郵便番号
                  </th>
                  <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    住所
                  </th>
                  <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    住所２
                  </th>
                  <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    地区
                  </th>
                  <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    電話番号１
                  </th>
                  <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    電話番号２
                  </th>
                  <th
                    className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                    onClick={() => handleSort('createdAt')}
                  >
                    <div className="flex items-center gap-1">
                      初回コンタクト <SortIcon columnKey="createdAt" />
                    </div>
                  </th>
                  <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    展示会
                  </th>
                  <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    契約日
                  </th>
                  <th
                    className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                    onClick={() => handleSort('status')}
                  >
                    <div className="flex items-center gap-1">
                      ステータス <SortIcon columnKey="status" />
                    </div>
                  </th>
                  <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    操作
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredAndSortedCustomers.map((customer) => (
                  <tr key={customer.id} className="hover:bg-gray-50">
                    <td className="px-3 py-2">
                      <input
                        type="checkbox"
                        checked={selectedIds.has(customer.id)}
                        onChange={() => toggleSelect(customer.id)}
                        className="rounded border-gray-300"
                      />
                    </td>
                    <td className="px-3 py-2 text-sm text-gray-600 whitespace-nowrap">
                      {customer.assignedSalesRepName || '-'}
                    </td>
                    <td className="px-3 py-2">
                      <Link href={`/dashboard/customers/${customer.id}`} className="text-blue-600 hover:underline font-medium whitespace-nowrap">
                        {customer.name}
                      </Link>
                    </td>
                    <td className="px-3 py-2 text-sm text-gray-600 whitespace-nowrap">
                      {customer.nameKana || '-'}
                    </td>
                    <td className="px-3 py-2 text-sm text-gray-600 whitespace-nowrap">
                      {customer.postalCode || '-'}
                    </td>
                    <td className="px-3 py-2 text-sm text-gray-600 max-w-[200px] truncate" title={customer.address || ''}>
                      {customer.address || '-'}
                    </td>
                    <td className="px-3 py-2 text-sm text-gray-600 max-w-[150px] truncate" title={customer.address2 || ''}>
                      {customer.address2 || '-'}
                    </td>
                    <td className="px-3 py-2 text-sm text-gray-600 whitespace-nowrap">
                      {customer.region || '-'}
                    </td>
                    <td className="px-3 py-2 text-sm text-gray-600 whitespace-nowrap">
                      {customer.phone || '-'}
                    </td>
                    <td className="px-3 py-2 text-sm text-gray-600 whitespace-nowrap">
                      {customer.mobile || '-'}
                    </td>
                    <td className="px-3 py-2 text-sm text-gray-600 whitespace-nowrap">
                      {formatDate(customer.createdAt)}
                    </td>
                    <td className="px-3 py-2 text-sm text-gray-600 whitespace-nowrap">
                      {customer.source || '-'}
                    </td>
                    <td className="px-3 py-2 text-sm text-gray-600 whitespace-nowrap">
                      {customer.contractDate || '-'}
                    </td>
                    <td className="px-3 py-2">
                      {editingId === customer.id ? (
                        <div className="flex items-center gap-1">
                          <select
                            value={editingStatus || customer.status}
                            onChange={(e) => setEditingStatus(e.target.value as CustomerStatus)}
                            className="text-xs border rounded px-2 py-1"
                          >
                            {STATUS_ORDER.map((status) => (
                              <option key={status} value={status}>{STATUS_CONFIG[status].label}</option>
                            ))}
                          </select>
                          <button onClick={saveStatus} className="text-green-600 hover:text-green-800">
                            <Check className="h-4 w-4" />
                          </button>
                          <button onClick={cancelEdit} className="text-red-600 hover:text-red-800">
                            <X className="h-4 w-4" />
                          </button>
                        </div>
                      ) : (
                        <span
                          className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium cursor-pointer whitespace-nowrap ${customer.status ? STATUS_CONFIG[customer.status]?.bgColor : 'bg-gray-100'} ${customer.status ? STATUS_CONFIG[customer.status]?.color : 'text-gray-700'}`}
                          onClick={() => startEditStatus(customer.id, customer.status || CustomerStatus.NEW)}
                        >
                          {(customer.status && STATUS_CONFIG[customer.status]?.label) || '新規'}
                          <Edit2 className="ml-1 h-3 w-3 opacity-50" />
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-2">
                      <Link href={`/dashboard/customers/${customer.id}`}>
                        <Button variant="ghost" size="sm">詳細</Button>
                      </Link>
                    </td>
                  </tr>
                ))}
                {filteredAndSortedCustomers.length === 0 && (
                  <tr>
                    <td colSpan={15} className="px-4 py-8 text-center text-gray-500">
                      顧客データがありません
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
