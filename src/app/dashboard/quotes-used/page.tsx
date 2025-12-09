'use client'

import { useState } from 'react'
import { Plus, Edit2, Trash2, TrendingUp, TrendingDown } from 'lucide-react'

interface UsedCarRecord {
  id: string
  carName: string // 車名
  year: number // 年式
  mileage: number // 走行距離
  purchaseDate: string // 仕入れ日
  purchasePrice: number // 仕入れ価格
  saleDate?: string // 販売日
  salePrice?: number // 販売価格
  profit?: number // 利益
  status: 'in_stock' | 'sold' // ステータス
  notes?: string // 備考
}

export default function QuotesUsedPage() {
  const [records, setRecords] = useState<UsedCarRecord[]>([
    {
      id: '1',
      carName: 'トヨタ プリウス',
      year: 2020,
      mileage: 25000,
      purchaseDate: '2024-11-01',
      purchasePrice: 1800000,
      saleDate: '2024-11-20',
      salePrice: 2100000,
      profit: 300000,
      status: 'sold',
      notes: '人気色ホワイト',
    },
    {
      id: '2',
      carName: 'ホンダ フィット',
      year: 2019,
      mileage: 42000,
      purchaseDate: '2024-12-01',
      purchasePrice: 980000,
      status: 'in_stock',
      notes: '修復歴なし',
    },
    {
      id: '3',
      carName: '日産 ノート',
      year: 2021,
      mileage: 18000,
      purchaseDate: '2024-11-15',
      purchasePrice: 1250000,
      saleDate: '2024-12-05',
      salePrice: 1450000,
      profit: 200000,
      status: 'sold',
    },
  ])

  const [isAddModalOpen, setIsAddModalOpen] = useState(false)
  const [editingRecord, setEditingRecord] = useState<UsedCarRecord | null>(null)
  const [formData, setFormData] = useState<Partial<UsedCarRecord>>({})

  const handleAdd = () => {
    setFormData({
      status: 'in_stock',
      purchaseDate: new Date().toISOString().split('T')[0],
    })
    setEditingRecord(null)
    setIsAddModalOpen(true)
  }

  const handleEdit = (record: UsedCarRecord) => {
    setFormData(record)
    setEditingRecord(record)
    setIsAddModalOpen(true)
  }

  const handleSave = () => {
    if (!formData.carName || !formData.purchasePrice) {
      alert('車名と仕入れ価格は必須です')
      return
    }

    const newRecord: UsedCarRecord = {
      id: editingRecord?.id || Date.now().toString(),
      carName: formData.carName,
      year: formData.year || new Date().getFullYear(),
      mileage: formData.mileage || 0,
      purchaseDate: formData.purchaseDate || new Date().toISOString().split('T')[0],
      purchasePrice: formData.purchasePrice,
      saleDate: formData.saleDate,
      salePrice: formData.salePrice,
      profit: formData.salePrice && formData.purchasePrice
        ? formData.salePrice - formData.purchasePrice
        : undefined,
      status: formData.saleDate ? 'sold' : 'in_stock',
      notes: formData.notes,
    }

    if (editingRecord) {
      setRecords(records.map(r => r.id === editingRecord.id ? newRecord : r))
    } else {
      setRecords([...records, newRecord])
    }

    setIsAddModalOpen(false)
    setFormData({})
    setEditingRecord(null)
  }

  const handleDelete = (id: string) => {
    if (confirm('この記録を削除しますか？')) {
      setRecords(records.filter(r => r.id !== id))
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('ja-JP', { style: 'currency', currency: 'JPY' }).format(amount)
  }

  const totalPurchase = records.reduce((sum, r) => sum + r.purchasePrice, 0)
  const totalSale = records.reduce((sum, r) => sum + (r.salePrice || 0), 0)
  const totalProfit = records.reduce((sum, r) => sum + (r.profit || 0), 0)
  const stockCount = records.filter(r => r.status === 'in_stock').length
  const soldCount = records.filter(r => r.status === 'sold').length

  return (
    <div className="p-6 space-y-6">
      {/* ヘッダー */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">中古車原価計算</h1>
          <p className="text-sm text-gray-500 mt-1">仕入れ価格と販売価格を管理</p>
        </div>
        <button
          onClick={handleAdd}
          className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus className="h-5 w-5" />
          新規登録
        </button>
      </div>

      {/* サマリーカード */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg shadow p-4 border border-gray-200">
          <div className="text-sm text-gray-600">在庫台数</div>
          <div className="text-2xl font-bold text-blue-600 mt-1">{stockCount}台</div>
        </div>
        <div className="bg-white rounded-lg shadow p-4 border border-gray-200">
          <div className="text-sm text-gray-600">販売済み</div>
          <div className="text-2xl font-bold text-green-600 mt-1">{soldCount}台</div>
        </div>
        <div className="bg-white rounded-lg shadow p-4 border border-gray-200">
          <div className="text-sm text-gray-600">総販売額</div>
          <div className="text-2xl font-bold text-gray-900 mt-1">
            {formatCurrency(totalSale)}
          </div>
        </div>
        <div className="bg-white rounded-lg shadow p-4 border border-gray-200">
          <div className="text-sm text-gray-600">総利益</div>
          <div className={`text-2xl font-bold mt-1 ${totalProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            {formatCurrency(totalProfit)}
          </div>
        </div>
      </div>

      {/* テーブル */}
      <div className="bg-white rounded-lg shadow overflow-hidden border border-gray-200">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">
                  車名
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">
                  年式
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">
                  走行距離
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">
                  仕入れ日
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-600 uppercase tracking-wider">
                  仕入れ価格
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">
                  販売日
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-600 uppercase tracking-wider">
                  販売価格
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-600 uppercase tracking-wider">
                  利益
                </th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-600 uppercase tracking-wider">
                  ステータス
                </th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-600 uppercase tracking-wider">
                  操作
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {records.map((record) => (
                <tr key={record.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm text-gray-900">{record.carName}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">{record.year}年</td>
                  <td className="px-4 py-3 text-sm text-gray-600">
                    {record.mileage.toLocaleString()}km
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">{record.purchaseDate}</td>
                  <td className="px-4 py-3 text-sm text-gray-900 text-right font-medium">
                    {formatCurrency(record.purchasePrice)}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">
                    {record.saleDate || '-'}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-900 text-right font-medium">
                    {record.salePrice ? formatCurrency(record.salePrice) : '-'}
                  </td>
                  <td className="px-4 py-3 text-sm text-right font-medium">
                    {record.profit !== undefined ? (
                      <span className={record.profit >= 0 ? 'text-green-600' : 'text-red-600'}>
                        {formatCurrency(record.profit)}
                      </span>
                    ) : '-'}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      record.status === 'sold'
                        ? 'bg-green-100 text-green-800'
                        : 'bg-blue-100 text-blue-800'
                    }`}>
                      {record.status === 'sold' ? '販売済み' : '在庫'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <div className="flex items-center justify-center gap-2">
                      <button
                        onClick={() => handleEdit(record)}
                        className="text-blue-600 hover:text-blue-800"
                      >
                        <Edit2 className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(record.id)}
                        className="text-red-600 hover:text-red-800"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* 追加・編集モーダル */}
      {isAddModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4">
                {editingRecord ? '編集' : '新規登録'}
              </h2>

              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      車名 <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={formData.carName || ''}
                      onChange={(e) => setFormData({ ...formData, carName: e.target.value })}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="例: トヨタ プリウス"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">年式</label>
                    <input
                      type="number"
                      value={formData.year || ''}
                      onChange={(e) => setFormData({ ...formData, year: parseInt(e.target.value) })}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="2020"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">走行距離 (km)</label>
                    <input
                      type="number"
                      value={formData.mileage || ''}
                      onChange={(e) => setFormData({ ...formData, mileage: parseInt(e.target.value) })}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="25000"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">仕入れ日</label>
                    <input
                      type="date"
                      value={formData.purchaseDate || ''}
                      onChange={(e) => setFormData({ ...formData, purchaseDate: e.target.value })}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    仕入れ価格 (円) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    value={formData.purchasePrice || ''}
                    onChange={(e) => setFormData({ ...formData, purchasePrice: parseInt(e.target.value) })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="1800000"
                  />
                </div>

                <div className="border-t border-gray-200 pt-4">
                  <h3 className="text-sm font-medium text-gray-700 mb-3">販売情報（任意）</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">販売日</label>
                      <input
                        type="date"
                        value={formData.saleDate || ''}
                        onChange={(e) => setFormData({ ...formData, saleDate: e.target.value })}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">販売価格 (円)</label>
                      <input
                        type="number"
                        value={formData.salePrice || ''}
                        onChange={(e) => setFormData({ ...formData, salePrice: parseInt(e.target.value) })}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="2100000"
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">備考</label>
                  <textarea
                    value={formData.notes || ''}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    rows={3}
                    placeholder="例: 人気色ホワイト、修復歴なし"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 mt-6">
                <button
                  onClick={() => {
                    setIsAddModalOpen(false)
                    setFormData({})
                    setEditingRecord(null)
                  }}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  キャンセル
                </button>
                <button
                  onClick={handleSave}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  {editingRecord ? '更新' : '登録'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
