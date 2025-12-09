'use client'

import { useState, useMemo, useEffect } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Search,
  Filter,
  Truck,
  CheckCircle,
  Calendar,
  Car,
  FileText,
  Clock,
  CheckCircle2,
  CreditCard,
  X,
  Check,
  ChevronDown,
  ChevronUp,
  MapPin,
  Banknote,
  Package,
  Plus,
  Trash2,
} from 'lucide-react'
import { Contract, CustomerStatus, DeliveryMethod, PaymentMethod } from '@/types'
import Link from 'next/link'
import { useCustomerStore } from '@/stores/customer-store'
import { useSalesTargetStore } from '@/stores/sales-target-store'
import { useSettingsStore } from '@/stores/settings-store'

// 日付フォーマット
function formatDate(dateString?: string): string {
  if (!dateString) return '-'
  const date = new Date(dateString)
  return `${date.getFullYear()}/${date.getMonth() + 1}/${date.getDate()}`
}

// 金額フォーマット
function formatCurrency(amount?: number): string {
  if (!amount) return '-'
  return new Intl.NumberFormat('ja-JP', { style: 'currency', currency: 'JPY', maximumFractionDigits: 0 }).format(amount)
}

// 入金額の選択肢
const PAYMENT_AMOUNTS = [
  '100万', '200万', '300万', '400万', '500万',
  '600万', '700万', '800万', '900万', '1000万',
  '残金現金', '残金ローン',
]

// 契約行コンポーネント（クリックで展開編集）
function ContractRow({
  contract,
  salesReps,
  isExpanded,
  onToggle,
  onUpdate,
  onMarkDelivered,
  onDelete,
}: {
  contract: Contract
  salesReps: { name: string; color: string }[]
  isExpanded: boolean
  onToggle: () => void
  onUpdate: (updates: Partial<Contract>) => void
  onMarkDelivered: () => void
  onDelete: () => void
}) {
  const [editData, setEditData] = useState<Partial<Contract>>({})
  const { customers } = useCustomerStore()

  // 顧客情報から登録県を取得
  const customer = customers.find(c => c.id === contract.customerId)
  const customerPrefecture = customer?.address?.match(/^(.+?[都道府県])/)?.[1] || ''

  // 仕入れ先の設定ストアを取得
  const { vehicleSuppliers, addVehicleSupplier } = useSettingsStore()
  const [newSupplierName, setNewSupplierName] = useState('')
  const [showAddSupplier, setShowAddSupplier] = useState(false)

  useEffect(() => {
    if (isExpanded) {
      setEditData({
        inspectionDate: contract.inspectionDate || '',
        inspectionCompleted: contract.inspectionCompleted || false,
        desiredPlateNumber: contract.desiredPlateNumber || '',
        plateNumberRegistered: contract.plateNumberRegistered || false,
        deliveryMethod: contract.deliveryMethod,
        desiredDeliveryDate: contract.desiredDeliveryDate || '',
        expectedDeliveryDate: contract.expectedDeliveryDate || '',
        registrationPrefecture: contract.registrationPrefecture || customerPrefecture || '',
        payment1Date: contract.payment1Date || '',
        payment1Amount: contract.payment1Amount || '',
        payment1Received: contract.payment1Received || false,
        payment1ReceivedDate: contract.payment1ReceivedDate || '',
        payment2Date: contract.payment2Date || '',
        payment2Amount: contract.payment2Amount || '',
        payment2Received: contract.payment2Received || false,
        payment2ReceivedDate: contract.payment2ReceivedDate || '',
        payment3Date: contract.payment3Date || '',
        payment3Amount: contract.payment3Amount || '',
        payment3Received: contract.payment3Received || false,
        payment3ReceivedDate: contract.payment3ReceivedDate || '',
        remainingPaymentMethod: contract.remainingPaymentMethod,
        vehicleSupplier: contract.vehicleSupplier || '',
        supplierBilled: contract.supplierBilled || false,
        supplierBilledDate: contract.supplierBilledDate || '',
        notes: contract.notes || '',
        // 契約書追加フィールド
        bodyColor: contract.bodyColor || '',
        passengerCapacity: contract.passengerCapacity,
        sleepingCapacity: contract.sleepingCapacity,
        seatFabric: contract.seatFabric || '',
        curtainFabric: contract.curtainFabric || '',
        hasTradeIn: contract.hasTradeIn || false,
        tradeInVehicle: contract.tradeInVehicle || '',
        tradeInHasRepairHistory: contract.tradeInHasRepairHistory || false,
        deliveryPeriod: contract.deliveryPeriod || '',
        meetingNotes: contract.meetingNotes || '',
      })
    }
  }, [isExpanded, contract, customerPrefecture])

  // 仕入れ先追加ハンドラ
  const handleAddSupplier = () => {
    if (newSupplierName.trim()) {
      const success = addVehicleSupplier(newSupplierName.trim())
      if (success) {
        setEditData({ ...editData, vehicleSupplier: newSupplierName.trim() })
        setNewSupplierName('')
        setShowAddSupplier(false)
      }
    }
  }

  const handleSave = () => {
    onUpdate(editData)
    onToggle()
  }

  const salesRep = salesReps.find(r => r.name === contract.salesRepName)

  const getDeliveryMethodLabel = (method?: DeliveryMethod) => {
    if (!method) return '-'
    return method === DeliveryMethod.DELIVERY ? '納車' : '引取'
  }

  // 入金状況の表示
  const getPaymentStatus = () => {
    const payments = [
      { date: contract.payment1Date, received: contract.payment1Received, amount: contract.payment1Amount },
      { date: contract.payment2Date, received: contract.payment2Received, amount: contract.payment2Amount },
      { date: contract.payment3Date, received: contract.payment3Received, amount: contract.payment3Amount },
    ].filter(p => p.date || p.amount)

    if (payments.length === 0) return null

    const receivedCount = payments.filter(p => p.received).length
    const totalCount = payments.length

    if (receivedCount === totalCount) {
      return { status: 'completed', text: `${receivedCount}/${totalCount}完了` }
    } else {
      const nextPayment = payments.find(p => !p.received)
      return {
        status: 'pending',
        text: `${receivedCount}/${totalCount}`,
        nextDate: nextPayment?.date
      }
    }
  }

  const paymentStatus = getPaymentStatus()

  // 登録県の表示
  const displayPrefecture = contract.registrationPrefecture || customerPrefecture || '-'

  return (
    <>
      {/* メイン行 */}
      <tr
        className={`hover:bg-gray-50 cursor-pointer ${isExpanded ? 'bg-blue-50' : ''}`}
        onClick={onToggle}
      >
        <td className="px-4 py-3 whitespace-nowrap">
          <div className="flex items-center gap-2">
            {isExpanded ? <ChevronUp className="h-4 w-4 text-gray-400" /> : <ChevronDown className="h-4 w-4 text-gray-400" />}
            <Link
              href={`/dashboard/customers/${contract.customerId}`}
              className="text-sm font-medium text-gray-900 hover:text-blue-600"
              onClick={(e) => e.stopPropagation()}
            >
              {contract.customerName}
            </Link>
          </div>
        </td>
        <td className="px-4 py-3 whitespace-nowrap">
          <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${salesRep?.color || 'bg-gray-100 text-gray-700'}`}>
            {contract.salesRepName}
          </span>
        </td>
        <td className="px-4 py-3 whitespace-nowrap">
          <div className="text-sm text-gray-900">{contract.vehicleModel || '-'}</div>
        </td>
        <td className="px-4 py-3 whitespace-nowrap">
          <div className="flex items-center gap-1 text-sm text-gray-700">
            <MapPin className="h-3.5 w-3.5 text-gray-400" />
            {displayPrefecture}
          </div>
        </td>
        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
          {formatDate(contract.contractDate)}
        </td>
        <td className="px-4 py-3 whitespace-nowrap">
          {paymentStatus ? (
            paymentStatus.status === 'completed' ? (
              <span className="inline-flex items-center gap-1 text-sm text-green-600">
                <CheckCircle2 className="h-3.5 w-3.5" />
                {paymentStatus.text}
              </span>
            ) : (
              <div className="text-sm">
                <span className="text-orange-600">{paymentStatus.text}</span>
                {paymentStatus.nextDate && (
                  <span className="text-gray-400 text-xs ml-1">
                    次:{formatDate(paymentStatus.nextDate)}
                  </span>
                )}
              </div>
            )
          ) : (
            <span className="text-sm text-gray-400">-</span>
          )}
        </td>
        <td className="px-4 py-3 whitespace-nowrap">
          {contract.inspectionCompleted ? (
            <span className="inline-flex items-center gap-1 text-sm text-green-600">
              <CheckCircle2 className="h-3.5 w-3.5" />
              完了
            </span>
          ) : contract.inspectionDate ? (
            <span className="inline-flex items-center gap-1 text-sm text-purple-600">
              <Clock className="h-3.5 w-3.5" />
              {formatDate(contract.inspectionDate)}
            </span>
          ) : (
            <span className="text-sm text-gray-400">-</span>
          )}
        </td>
        <td className="px-4 py-3 whitespace-nowrap">
          {contract.desiredPlateNumber ? (
            <span className={`text-sm ${contract.plateNumberRegistered ? 'text-green-600' : 'text-gray-700'}`}>
              {contract.desiredPlateNumber}
              {contract.plateNumberRegistered && <CheckCircle2 className="h-3 w-3 inline ml-1" />}
            </span>
          ) : (
            <span className="text-sm text-gray-400">-</span>
          )}
        </td>
        <td className="px-4 py-3 whitespace-nowrap">
          {contract.isDelivered ? (
            <span className="inline-flex items-center gap-1 text-sm text-green-600">
              <CheckCircle2 className="h-3.5 w-3.5" />
              {formatDate(contract.deliveredDate)}
            </span>
          ) : contract.expectedDeliveryDate ? (
            <div className="text-sm">
              <span className="text-blue-600">{formatDate(contract.expectedDeliveryDate)}</span>
              {contract.deliveryMethod && (
                <span className="text-gray-400 text-xs ml-1">({getDeliveryMethodLabel(contract.deliveryMethod)})</span>
              )}
            </div>
          ) : (
            <span className="text-sm text-gray-400">-</span>
          )}
        </td>
      </tr>

      {/* 展開編集行 */}
      {isExpanded && (
        <tr className="bg-blue-50 border-b-2 border-blue-200">
          <td colSpan={9} className="px-4 py-4">
            <div className="bg-white rounded-lg p-4 shadow-sm">
              {/* 入金セクション */}
              <div className="mb-4">
                <h4 className="text-sm font-medium text-gray-700 mb-3 flex items-center gap-2">
                  <Banknote className="h-4 w-4" />
                  入金予定
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* 1回目入金 */}
                  <div className="border rounded-lg p-3 bg-gray-50">
                    <div className="text-xs font-medium text-gray-600 mb-2">1回目入金</div>
                    <div className="space-y-2">
                      <div className="flex gap-2">
                        <Input
                          type="date"
                          value={editData.payment1Date || ''}
                          onChange={(e) => setEditData({ ...editData, payment1Date: e.target.value })}
                          className="h-8 text-sm flex-1"
                        />
                        <select
                          value={editData.payment1Amount || ''}
                          onChange={(e) => setEditData({ ...editData, payment1Amount: e.target.value })}
                          className="h-8 px-2 text-sm border rounded-md w-24"
                        >
                          <option value="">金額</option>
                          {PAYMENT_AMOUNTS.map(amt => (
                            <option key={amt} value={amt}>{amt}</option>
                          ))}
                        </select>
                      </div>
                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={editData.payment1Received || false}
                          onChange={(e) => setEditData({
                            ...editData,
                            payment1Received: e.target.checked,
                            payment1ReceivedDate: e.target.checked ? new Date().toISOString().split('T')[0] : ''
                          })}
                          className="h-4 w-4"
                        />
                        <span className="text-xs">入金済み</span>
                      </div>
                    </div>
                  </div>

                  {/* 2回目入金 */}
                  <div className="border rounded-lg p-3 bg-gray-50">
                    <div className="text-xs font-medium text-gray-600 mb-2">2回目入金</div>
                    <div className="space-y-2">
                      <div className="flex gap-2">
                        <Input
                          type="date"
                          value={editData.payment2Date || ''}
                          onChange={(e) => setEditData({ ...editData, payment2Date: e.target.value })}
                          className="h-8 text-sm flex-1"
                        />
                        <select
                          value={editData.payment2Amount || ''}
                          onChange={(e) => setEditData({ ...editData, payment2Amount: e.target.value })}
                          className="h-8 px-2 text-sm border rounded-md w-24"
                        >
                          <option value="">金額</option>
                          {PAYMENT_AMOUNTS.map(amt => (
                            <option key={amt} value={amt}>{amt}</option>
                          ))}
                        </select>
                      </div>
                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={editData.payment2Received || false}
                          onChange={(e) => setEditData({
                            ...editData,
                            payment2Received: e.target.checked,
                            payment2ReceivedDate: e.target.checked ? new Date().toISOString().split('T')[0] : ''
                          })}
                          className="h-4 w-4"
                        />
                        <span className="text-xs">入金済み</span>
                      </div>
                    </div>
                  </div>

                  {/* 3回目入金 */}
                  <div className="border rounded-lg p-3 bg-gray-50">
                    <div className="text-xs font-medium text-gray-600 mb-2">3回目入金</div>
                    <div className="space-y-2">
                      <div className="flex gap-2">
                        <Input
                          type="date"
                          value={editData.payment3Date || ''}
                          onChange={(e) => setEditData({ ...editData, payment3Date: e.target.value })}
                          className="h-8 text-sm flex-1"
                        />
                        <select
                          value={editData.payment3Amount || ''}
                          onChange={(e) => setEditData({ ...editData, payment3Amount: e.target.value })}
                          className="h-8 px-2 text-sm border rounded-md w-24"
                        >
                          <option value="">金額</option>
                          {PAYMENT_AMOUNTS.map(amt => (
                            <option key={amt} value={amt}>{amt}</option>
                          ))}
                        </select>
                      </div>
                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={editData.payment3Received || false}
                          onChange={(e) => setEditData({
                            ...editData,
                            payment3Received: e.target.checked,
                            payment3ReceivedDate: e.target.checked ? new Date().toISOString().split('T')[0] : ''
                          })}
                          className="h-4 w-4"
                        />
                        <span className="text-xs">入金済み</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* 残金支払方法 */}
                <div className="mt-3">
                  <label className="text-xs text-gray-500">残金支払方法</label>
                  <div className="flex items-center gap-4 mt-1">
                    <label className="flex items-center gap-2">
                      <input
                        type="radio"
                        name="paymentMethod"
                        checked={editData.remainingPaymentMethod === PaymentMethod.CASH}
                        onChange={() => setEditData({ ...editData, remainingPaymentMethod: PaymentMethod.CASH })}
                        className="h-4 w-4"
                      />
                      <span className="text-sm">残金現金</span>
                    </label>
                    <label className="flex items-center gap-2">
                      <input
                        type="radio"
                        name="paymentMethod"
                        checked={editData.remainingPaymentMethod === PaymentMethod.LOAN}
                        onChange={() => setEditData({ ...editData, remainingPaymentMethod: PaymentMethod.LOAN })}
                        className="h-4 w-4"
                      />
                      <span className="text-sm">残金ローン</span>
                    </label>
                  </div>
                </div>
              </div>

              {/* その他項目 */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4 pt-4 border-t">
                {/* 予備検予定日 */}
                <div className="space-y-1">
                  <label className="text-xs text-gray-500 flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    予備検予定日
                  </label>
                  <Input
                    type="date"
                    value={editData.inspectionDate || ''}
                    onChange={(e) => setEditData({ ...editData, inspectionDate: e.target.value })}
                    className="h-8 text-sm"
                  />
                </div>

                {/* 予備検完了 */}
                <div className="space-y-1">
                  <label className="text-xs text-gray-500">予備検状況</label>
                  <div className="flex items-center gap-2 h-8">
                    <input
                      type="checkbox"
                      checked={editData.inspectionCompleted || false}
                      onChange={(e) => setEditData({ ...editData, inspectionCompleted: e.target.checked })}
                      className="h-4 w-4"
                    />
                    <span className="text-sm">予備検完了</span>
                  </div>
                </div>

                {/* 希望ナンバー */}
                <div className="space-y-1">
                  <label className="text-xs text-gray-500 flex items-center gap-1">
                    <Car className="h-3 w-3" />
                    希望ナンバー
                  </label>
                  <Input
                    type="text"
                    value={editData.desiredPlateNumber || ''}
                    onChange={(e) => setEditData({ ...editData, desiredPlateNumber: e.target.value })}
                    placeholder="例: 1234"
                    className="h-8 text-sm"
                  />
                </div>

                {/* ナンバー登録済み */}
                <div className="space-y-1">
                  <label className="text-xs text-gray-500">ナンバー状況</label>
                  <div className="flex items-center gap-2 h-8">
                    <input
                      type="checkbox"
                      checked={editData.plateNumberRegistered || false}
                      onChange={(e) => setEditData({ ...editData, plateNumberRegistered: e.target.checked })}
                      className="h-4 w-4"
                    />
                    <span className="text-sm">登録済み</span>
                  </div>
                </div>

                {/* 登録県 */}
                <div className="space-y-1">
                  <label className="text-xs text-gray-500 flex items-center gap-1">
                    <MapPin className="h-3 w-3" />
                    登録県（納車県）
                  </label>
                  <Input
                    type="text"
                    value={editData.registrationPrefecture || ''}
                    onChange={(e) => setEditData({ ...editData, registrationPrefecture: e.target.value })}
                    placeholder="例: 東京都"
                    className="h-8 text-sm"
                  />
                </div>

                {/* 納車方法 */}
                <div className="space-y-1">
                  <label className="text-xs text-gray-500 flex items-center gap-1">
                    <Truck className="h-3 w-3" />
                    納車方法
                  </label>
                  <select
                    value={editData.deliveryMethod || ''}
                    onChange={(e) => setEditData({ ...editData, deliveryMethod: e.target.value as DeliveryMethod })}
                    className="h-8 w-full px-2 text-sm border rounded-md"
                  >
                    <option value="">選択</option>
                    <option value={DeliveryMethod.DELIVERY}>納車（お届け）</option>
                    <option value={DeliveryMethod.PICKUP}>引き取り（来店）</option>
                  </select>
                </div>

                {/* 希望納車日 */}
                <div className="space-y-1">
                  <label className="text-xs text-gray-500">希望納車日</label>
                  <Input
                    type="date"
                    value={editData.desiredDeliveryDate || ''}
                    onChange={(e) => setEditData({ ...editData, desiredDeliveryDate: e.target.value })}
                    className="h-8 text-sm"
                  />
                </div>

                {/* 納車予定日 */}
                <div className="space-y-1">
                  <label className="text-xs text-gray-500 flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    納車予定日
                  </label>
                  <Input
                    type="date"
                    value={editData.expectedDeliveryDate || ''}
                    onChange={(e) => setEditData({ ...editData, expectedDeliveryDate: e.target.value })}
                    className="h-8 text-sm"
                  />
                </div>
              </div>

              {/* 車両仕入れ先セクション */}
              <div className="mb-4 pt-4 border-t">
                <h4 className="text-sm font-medium text-gray-700 mb-3 flex items-center gap-2">
                  <Package className="h-4 w-4" />
                  車両仕入れ先
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* 仕入れ先選択 */}
                  <div className="space-y-1">
                    <label className="text-xs text-gray-500">仕入れ先</label>
                    {showAddSupplier ? (
                      <div className="flex gap-2">
                        <Input
                          type="text"
                          value={newSupplierName}
                          onChange={(e) => setNewSupplierName(e.target.value)}
                          placeholder="新しい仕入れ先名"
                          className="h-8 text-sm flex-1"
                          onClick={(e) => e.stopPropagation()}
                        />
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={(e) => { e.stopPropagation(); handleAddSupplier(); }}
                          className="h-8"
                        >
                          <Plus className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={(e) => { e.stopPropagation(); setShowAddSupplier(false); setNewSupplierName(''); }}
                          className="h-8"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ) : (
                      <div className="flex gap-2">
                        <select
                          value={editData.vehicleSupplier || ''}
                          onChange={(e) => {
                            if (e.target.value === '__add_new__') {
                              setShowAddSupplier(true)
                            } else {
                              setEditData({ ...editData, vehicleSupplier: e.target.value })
                            }
                          }}
                          className="h-8 w-full px-2 text-sm border rounded-md"
                        >
                          <option value="">選択してください</option>
                          {vehicleSuppliers.map(supplier => (
                            <option key={supplier.id} value={supplier.name}>{supplier.name}</option>
                          ))}
                          <option value="__add_new__">+ 新規追加...</option>
                        </select>
                      </div>
                    )}
                  </div>

                  {/* 請求済みチェック */}
                  <div className="space-y-1">
                    <label className="text-xs text-gray-500">請求状況</label>
                    <div className="flex items-center gap-2 h-8">
                      <input
                        type="checkbox"
                        checked={editData.supplierBilled || false}
                        onChange={(e) => setEditData({
                          ...editData,
                          supplierBilled: e.target.checked,
                          supplierBilledDate: e.target.checked ? new Date().toISOString().split('T')[0] : ''
                        })}
                        className="h-4 w-4"
                      />
                      <span className="text-sm">請求済み</span>
                      {editData.supplierBilled && editData.supplierBilledDate && (
                        <span className="text-xs text-gray-500">
                          ({formatDate(editData.supplierBilledDate)})
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* 契約書詳細セクション */}
              <div className="mb-4 pt-4 border-t">
                <h4 className="text-sm font-medium text-gray-700 mb-3 flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  契約書詳細（見積もりにないもの）
                </h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {/* ボディー色 */}
                  <div className="space-y-1">
                    <label className="text-xs text-gray-500">ボディー色</label>
                    <Input
                      type="text"
                      value={editData.bodyColor || ''}
                      onChange={(e) => setEditData({ ...editData, bodyColor: e.target.value })}
                      placeholder="例: パールホワイト"
                      className="h-8 text-sm"
                    />
                  </div>

                  {/* 乗車定員 */}
                  <div className="space-y-1">
                    <label className="text-xs text-gray-500">乗車定員</label>
                    <Input
                      type="number"
                      value={editData.passengerCapacity || ''}
                      onChange={(e) => setEditData({ ...editData, passengerCapacity: e.target.value ? parseInt(e.target.value) : undefined })}
                      placeholder="例: 7"
                      className="h-8 text-sm"
                    />
                  </div>

                  {/* 就寝定員 */}
                  <div className="space-y-1">
                    <label className="text-xs text-gray-500">就寝定員</label>
                    <Input
                      type="number"
                      value={editData.sleepingCapacity || ''}
                      onChange={(e) => setEditData({ ...editData, sleepingCapacity: e.target.value ? parseInt(e.target.value) : undefined })}
                      placeholder="例: 4"
                      className="h-8 text-sm"
                    />
                  </div>

                  {/* 納車時期 */}
                  <div className="space-y-1">
                    <label className="text-xs text-gray-500">納車時期</label>
                    <Input
                      type="text"
                      value={editData.deliveryPeriod || ''}
                      onChange={(e) => setEditData({ ...editData, deliveryPeriod: e.target.value })}
                      placeholder="例: 令和7年3月頃"
                      className="h-8 text-sm"
                    />
                  </div>

                  {/* 椅子生地 */}
                  <div className="space-y-1">
                    <label className="text-xs text-gray-500">椅子生地</label>
                    <Input
                      type="text"
                      value={editData.seatFabric || ''}
                      onChange={(e) => setEditData({ ...editData, seatFabric: e.target.value })}
                      placeholder="例: 本革ブラック"
                      className="h-8 text-sm"
                    />
                  </div>

                  {/* カーテン生地 */}
                  <div className="space-y-1">
                    <label className="text-xs text-gray-500">カーテン生地</label>
                    <Input
                      type="text"
                      value={editData.curtainFabric || ''}
                      onChange={(e) => setEditData({ ...editData, curtainFabric: e.target.value })}
                      placeholder="例: 遮光グレー"
                      className="h-8 text-sm"
                    />
                  </div>
                </div>

                {/* 下取り車 */}
                <div className="mt-4 p-3 border rounded-lg bg-gray-50">
                  <div className="flex items-center gap-4 mb-2">
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={editData.hasTradeIn || false}
                        onChange={(e) => setEditData({
                          ...editData,
                          hasTradeIn: e.target.checked,
                          tradeInVehicle: e.target.checked ? editData.tradeInVehicle : '',
                          tradeInHasRepairHistory: e.target.checked ? editData.tradeInHasRepairHistory : false,
                        })}
                        className="h-4 w-4"
                      />
                      <span className="text-sm font-medium">下取り車あり</span>
                    </label>
                    {editData.hasTradeIn && (
                      <label className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={editData.tradeInHasRepairHistory || false}
                          onChange={(e) => setEditData({ ...editData, tradeInHasRepairHistory: e.target.checked })}
                          className="h-4 w-4"
                        />
                        <span className="text-sm text-red-600">修復歴あり</span>
                      </label>
                    )}
                  </div>
                  {editData.hasTradeIn && (
                    <Input
                      type="text"
                      value={editData.tradeInVehicle || ''}
                      onChange={(e) => setEditData({ ...editData, tradeInVehicle: e.target.value })}
                      placeholder="下取り車情報（車種・年式・走行距離など）"
                      className="h-8 text-sm"
                    />
                  )}
                </div>
              </div>

              {/* 備考・打合せ事項 */}
              <div className="space-y-1 mb-4">
                <label className="text-xs text-gray-500">備考</label>
                <Input
                  type="text"
                  value={editData.notes || ''}
                  onChange={(e) => setEditData({ ...editData, notes: e.target.value })}
                  placeholder="メモ・備考"
                  className="h-8 text-sm"
                />
              </div>
              <div className="space-y-1 mb-4">
                <label className="text-xs text-gray-500">打合せ事項・注意事項</label>
                <textarea
                  value={editData.meetingNotes || ''}
                  onChange={(e) => setEditData({ ...editData, meetingNotes: e.target.value })}
                  placeholder="打合せ内容、注意事項、特記事項など"
                  className="w-full h-20 px-3 py-2 text-sm border rounded-md resize-none"
                />
              </div>

              {/* ボタン */}
              <div className="flex items-center justify-between pt-3 border-t">
                <div className="flex gap-2">
                  {!contract.isDelivered && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={(e) => { e.stopPropagation(); onMarkDelivered(); }}
                      className="text-green-600 border-green-300 hover:bg-green-50"
                    >
                      <CheckCircle className="h-4 w-4 mr-1" />
                      納車済みにする
                    </Button>
                  )}
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={(e) => { e.stopPropagation(); onDelete(); }}
                    className="text-red-600 border-red-300 hover:bg-red-50"
                  >
                    <Trash2 className="h-4 w-4 mr-1" />
                    削除
                  </Button>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={(e) => { e.stopPropagation(); onToggle(); }}>
                    <X className="h-4 w-4 mr-1" />
                    キャンセル
                  </Button>
                  <Button size="sm" onClick={(e) => { e.stopPropagation(); handleSave(); }}>
                    <Check className="h-4 w-4 mr-1" />
                    保存
                  </Button>
                </div>
              </div>
            </div>
          </td>
        </tr>
      )}
    </>
  )
}

export default function ContractsPage() {
  const [searchQuery, setSearchQuery] = useState('')
  const [salesRepFilter, setSalesRepFilter] = useState<string>('all')
  const [statusFilter, setStatusFilter] = useState<'all' | 'waiting' | 'delivered'>('all')
  const [expandedId, setExpandedId] = useState<string | null>(null)

  // 設定ストアから営業担当者リストを取得
  const { salesReps } = useSettingsStore()

  // 営業目標ストアから契約情報を取得
  const { contracts: storedContracts, updateContract, markAsDelivered, addContract, deleteContract, fiscalYearStart } = useSalesTargetStore()

  // 現在の年度を計算（5月21日開始）
  const currentFiscalYear = useMemo(() => {
    const now = new Date()
    const [startMonth, startDay] = fiscalYearStart.split('-').map(Number)
    const fiscalYearStartDate = new Date(now.getFullYear(), startMonth - 1, startDay)
    if (now < fiscalYearStartDate) {
      return now.getFullYear() - 1
    }
    return now.getFullYear()
  }, [fiscalYearStart])

  // 年度選択State
  const [selectedYear, setSelectedYear] = useState(currentFiscalYear)

  // 年度開始・終了日を計算
  const { yearStartDate, yearEndDate } = useMemo(() => {
    const [startMonth, startDay] = fiscalYearStart.split('-').map(Number)
    const start = new Date(selectedYear, startMonth - 1, startDay)
    const end = new Date(selectedYear + 1, startMonth - 1, startDay)
    return { yearStartDate: start, yearEndDate: end }
  }, [selectedYear, fiscalYearStart])

  // 年度選択オプション（過去3年分＋今年度）
  const fiscalYearOptions = useMemo(() => {
    const years = []
    for (let i = -2; i <= 1; i++) {
      years.push(currentFiscalYear + i)
    }
    return years.sort((a, b) => b - a)
  }, [currentFiscalYear])

  // 顧客ストア
  const { customers, updateCustomerStatus } = useCustomerStore()

  // 顧客リストから契約・納車待ちステータスの顧客を契約として表示
  // 既存の契約データと顧客リストをマージ
  const contracts = useMemo(() => {
    // 既存の契約データのcustomerIdセット
    const existingCustomerIds = new Set(storedContracts.map(c => c.customerId))

    // 顧客リストから契約・納車待ちステータスの顧客を抽出（既存の契約にないもの）
    const customersAsContracts: Contract[] = customers
      .filter(c =>
        (c.status === CustomerStatus.CONTRACT || c.status === CustomerStatus.AWAITING_DELIVERY) &&
        !existingCustomerIds.has(c.id)
      )
      .map(c => ({
        id: `customer-${c.id}`,
        customerId: c.id,
        customerName: c.name,
        salesRepName: c.assignedSalesRepName || '',
        contractDate: c.contractDate || c.updatedAt || new Date().toISOString().split('T')[0],
        saleAmount: 0,
        profit: 0,
        vehicleModel: '',
        isDelivered: c.status === CustomerStatus.OWNER,
        createdAt: c.createdAt,
        updatedAt: c.updatedAt,
      }))

    // 既存の契約データ + 顧客リストからの契約データ
    return [...storedContracts, ...customersAsContracts]
  }, [storedContracts, customers])

  // 営業担当者フィルターオプションを動的に生成
  const salesRepOptions = useMemo(() => [
    { name: '全員', value: 'all', color: '' },
    ...salesReps.map(rep => ({ name: rep.name, value: rep.name, color: rep.color })),
  ], [salesReps])

  // フィルタリング
  const filteredContracts = useMemo(() => {
    let result = [...contracts]

    // 年度フィルター（契約日が選択年度内のもの）
    result = result.filter(c => {
      const contractDate = new Date(c.contractDate)
      return contractDate >= yearStartDate && contractDate < yearEndDate
    })

    // ステータスフィルター
    if (statusFilter === 'waiting') {
      result = result.filter(c => !c.isDelivered)
    } else if (statusFilter === 'delivered') {
      result = result.filter(c => c.isDelivered)
    }

    // 営業担当者フィルター
    if (salesRepFilter !== 'all') {
      result = result.filter(c => c.salesRepName === salesRepFilter)
    }

    // 検索フィルター
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      result = result.filter(c =>
        c.customerName.toLowerCase().includes(query) ||
        c.vehicleModel?.toLowerCase().includes(query) ||
        c.salesRepName.toLowerCase().includes(query)
      )
    }

    // 契約日順（新しい順）
    result.sort((a, b) => new Date(b.contractDate).getTime() - new Date(a.contractDate).getTime())

    return result
  }, [contracts, salesRepFilter, searchQuery, statusFilter, yearStartDate, yearEndDate])

  // 契約更新処理
  const handleUpdate = (contractId: string, updates: Partial<Contract>) => {
    // 顧客リストから生成された契約の場合、まず契約ストアに追加
    if (contractId.startsWith('customer-')) {
      const customerId = contractId.replace('customer-', '')
      const customer = customers.find(c => c.id === customerId)
      if (customer) {
        // 新規契約として追加
        const newContract: Omit<Contract, 'id' | 'createdAt' | 'updatedAt'> = {
          customerId: customer.id,
          customerName: customer.name,
          salesRepName: customer.assignedSalesRepName || '',
          contractDate: customer.contractDate || new Date().toISOString().split('T')[0],
          saleAmount: 0,
          profit: 0,
          vehicleModel: '',
          isDelivered: false,
          ...updates,
        }
        addContract(newContract)
        return
      }
    }
    updateContract(contractId, updates)
  }

  // 納車済み処理
  const handleMarkDelivered = (contractId: string, customerId: string) => {
    const today = new Date().toISOString().split('T')[0]

    // 顧客リストから生成された契約の場合
    if (contractId.startsWith('customer-')) {
      const realCustomerId = contractId.replace('customer-', '')
      const customer = customers.find(c => c.id === realCustomerId)
      if (customer) {
        // 契約ストアに追加して納車済みに
        const newContract: Omit<Contract, 'id' | 'createdAt' | 'updatedAt'> = {
          customerId: customer.id,
          customerName: customer.name,
          salesRepName: customer.assignedSalesRepName || '',
          contractDate: customer.contractDate || new Date().toISOString().split('T')[0],
          saleAmount: 0,
          profit: 0,
          vehicleModel: '',
          isDelivered: true,
          deliveredDate: today,
        }
        addContract(newContract)
        updateCustomerStatus(realCustomerId, CustomerStatus.OWNER)
        setExpandedId(null)
        return
      }
    }

    markAsDelivered(contractId, today)
    updateCustomerStatus(customerId, CustomerStatus.OWNER)
    setExpandedId(null)
  }

  // 契約削除処理
  const handleDelete = (contractId: string, customerName: string, customerId?: string) => {
    if (confirm(`「${customerName}」の契約を削除しますか？\nこの操作は取り消せません。`)) {
      // 顧客リストから生成された契約の場合は、顧客のステータスをランクCに戻す
      if (contractId.startsWith('customer-')) {
        const realCustomerId = contractId.replace('customer-', '')
        updateCustomerStatus(realCustomerId, CustomerStatus.RANK_C)
        setExpandedId(null)
        return
      }
      // 通常の契約削除
      deleteContract(contractId)
      // 紐づいている顧客がいればステータスをランクCに戻す
      if (customerId) {
        updateCustomerStatus(customerId, CustomerStatus.RANK_C)
      }
      setExpandedId(null)
    }
  }

  // 年度でフィルターされた契約（サマリー用）
  const fiscalYearContracts = useMemo(() => {
    return contracts.filter(c => {
      const contractDate = new Date(c.contractDate)
      return contractDate >= yearStartDate && contractDate < yearEndDate
    })
  }, [contracts, yearStartDate, yearEndDate])

  // サマリー計算（年度フィルター後のデータを使用）
  const summary = useMemo(() => {
    const waiting = fiscalYearContracts.filter(c => !c.isDelivered)
    const delivered = fiscalYearContracts.filter(c => c.isDelivered)

    // 入金待ちを3回分でカウント
    let pendingPaymentCount = 0
    fiscalYearContracts.filter(c => !c.isDelivered).forEach(c => {
      if (c.payment1Date && !c.payment1Received) pendingPaymentCount++
      if (c.payment2Date && !c.payment2Received) pendingPaymentCount++
      if (c.payment3Date && !c.payment3Received) pendingPaymentCount++
    })

    const pendingInspection = fiscalYearContracts.filter(c => !c.inspectionCompleted && !c.isDelivered)

    // 売上と利益の集計
    const totalSales = fiscalYearContracts.reduce((sum, c) => sum + (c.saleAmount || 0), 0)
    const totalProfit = fiscalYearContracts.reduce((sum, c) => sum + (c.profit || 0), 0)

    return {
      total: fiscalYearContracts.length,
      waiting: waiting.length,
      delivered: delivered.length,
      pendingPayment: pendingPaymentCount,
      pendingInspection: pendingInspection.length,
      totalSales,
      totalProfit,
    }
  }, [fiscalYearContracts])

  // 金額フォーマット
  const formatCurrency = (amount: number) => {
    if (amount >= 10000) {
      return `${(amount / 10000).toFixed(0)}万円`
    }
    return `${amount.toLocaleString()}円`
  }

  return (
    <div className="h-full flex flex-col">
      {/* ヘッダー */}
      <div className="flex-shrink-0 px-6 py-4 bg-white border-b">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <FileText className="h-6 w-6" />
              契約管理
            </h1>
            <p className="text-sm text-gray-600 mt-0.5">
              行をクリックして詳細を編集（入金予定×3回・予備検・希望ナンバー・納車）
            </p>
          </div>
          {/* 年度選択 */}
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-gray-500" />
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(Number(e.target.value))}
              className="h-9 px-3 py-1 rounded-md border border-gray-200 bg-white text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
            >
              {fiscalYearOptions.map((year) => (
                <option key={year} value={year}>
                  {year}年度（{year}/5/21〜{year + 1}/5/20）
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* サマリーカード */}
        <div className="grid grid-cols-7 gap-3 mb-4">
          <Card className="bg-blue-50 border-blue-200">
            <CardContent className="p-3 text-center">
              <div className="text-xl font-bold text-blue-600">{summary.total}</div>
              <div className="text-xs text-blue-600">総契約数</div>
            </CardContent>
          </Card>
          <Card className="bg-yellow-50 border-yellow-200">
            <CardContent className="p-3 text-center">
              <div className="text-xl font-bold text-yellow-600">{summary.waiting}</div>
              <div className="text-xs text-yellow-600">納車待ち</div>
            </CardContent>
          </Card>
          <Card className="bg-green-50 border-green-200">
            <CardContent className="p-3 text-center">
              <div className="text-xl font-bold text-green-600">{summary.delivered}</div>
              <div className="text-xs text-green-600">納車済み</div>
            </CardContent>
          </Card>
          <Card className="bg-orange-50 border-orange-200">
            <CardContent className="p-3 text-center">
              <div className="text-xl font-bold text-orange-600">{summary.pendingPayment}</div>
              <div className="text-xs text-orange-600">入金待ち</div>
            </CardContent>
          </Card>
          <Card className="bg-purple-50 border-purple-200">
            <CardContent className="p-3 text-center">
              <div className="text-xl font-bold text-purple-600">{summary.pendingInspection}</div>
              <div className="text-xs text-purple-600">予備検待ち</div>
            </CardContent>
          </Card>
          <Card className="bg-indigo-50 border-indigo-200">
            <CardContent className="p-3 text-center">
              <div className="text-lg font-bold text-indigo-600">{formatCurrency(summary.totalSales)}</div>
              <div className="text-xs text-indigo-600">総売上</div>
            </CardContent>
          </Card>
          <Card className="bg-emerald-50 border-emerald-200">
            <CardContent className="p-3 text-center">
              <div className="text-lg font-bold text-emerald-600">{formatCurrency(summary.totalProfit)}</div>
              <div className="text-xs text-emerald-600">総利益</div>
            </CardContent>
          </Card>
        </div>

        {/* フィルター */}
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2 flex-1 max-w-md">
            <Search className="h-4 w-4 text-gray-400" />
            <Input
              placeholder="顧客名、車種、担当者で検索..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="flex-1"
            />
          </div>

          {/* ステータスフィルター */}
          <div className="flex items-center gap-2">
            <Button
              variant={statusFilter === 'all' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setStatusFilter('all')}
            >
              すべて
            </Button>
            <Button
              variant={statusFilter === 'waiting' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setStatusFilter('waiting')}
            >
              <Clock className="h-4 w-4 mr-1" />
              納車待ち
            </Button>
            <Button
              variant={statusFilter === 'delivered' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setStatusFilter('delivered')}
            >
              <CheckCircle2 className="h-4 w-4 mr-1" />
              納車済み
            </Button>
          </div>

          {/* 営業担当者フィルター */}
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-gray-400" />
            <select
              value={salesRepFilter}
              onChange={(e) => setSalesRepFilter(e.target.value)}
              className="h-9 px-3 py-1 rounded-md border border-gray-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
            >
              {salesRepOptions.map((rep) => (
                <option key={rep.value} value={rep.value}>
                  {rep.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* テーブル */}
      <div className="flex-1 overflow-auto p-6 bg-gray-50">
        {filteredContracts.length === 0 ? (
          <div className="flex items-center justify-center h-64">
            <div className="text-center text-gray-500">
              <FileText className="h-12 w-12 mx-auto mb-4 text-gray-300" />
              <p>契約データがありません</p>
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    顧客名
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    担当
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    車種
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    登録県
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    契約日
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    入金
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    予備検
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    ナンバー
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    納車
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredContracts.map((contract) => (
                  <ContractRow
                    key={contract.id}
                    contract={contract}
                    salesReps={salesReps}
                    isExpanded={expandedId === contract.id}
                    onToggle={() => setExpandedId(expandedId === contract.id ? null : contract.id)}
                    onUpdate={(updates) => handleUpdate(contract.id, updates)}
                    onMarkDelivered={() => handleMarkDelivered(contract.id, contract.customerId)}
                    onDelete={() => handleDelete(contract.id, contract.customerName, contract.customerId)}
                  />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
