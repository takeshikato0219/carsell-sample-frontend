'use client'

import { useState } from 'react'
import { Plus, Edit2, Trash2, Calculator } from 'lucide-react'

interface NewCarQuote {
  id: string
  carName: string // 車名
  manufacturer: string // メーカー
  grade: string // グレード
  basePrice: number // 車両本体価格
  options: Array<{ name: string; price: number }> // オプション
  registrationFee: number // 登録諸費用
  insurance: number // 保険料
  tax: number // 税金
  otherCosts: number // その他費用
  totalCost: number // 総原価
  sellingPrice: number // 販売価格
  profit: number // 利益
  profitRate: number // 利益率(%)
  createdAt: string
  notes?: string
}

export default function QuotesNewPage() {
  const [quotes, setQuotes] = useState<NewCarQuote[]>([
    {
      id: '1',
      carName: 'トヨタ アルファード',
      manufacturer: 'トヨタ',
      grade: 'Executive Lounge',
      basePrice: 8500000,
      options: [
        { name: 'ツインムーンルーフ', price: 220000 },
        { name: 'デジタルインナーミラー', price: 66000 },
      ],
      registrationFee: 150000,
      insurance: 85000,
      tax: 120000,
      otherCosts: 50000,
      totalCost: 9191000,
      sellingPrice: 9800000,
      profit: 609000,
      profitRate: 6.63,
      createdAt: '2024-12-01',
      notes: '人気グレード',
    },
    {
      id: '2',
      carName: 'ホンダ ヴェゼル',
      manufacturer: 'ホンダ',
      grade: 'e:HEV Z',
      basePrice: 3298900,
      options: [
        { name: 'ナビゲーション', price: 180000 },
        { name: 'ETC2.0', price: 35000 },
      ],
      registrationFee: 120000,
      insurance: 65000,
      tax: 45000,
      otherCosts: 30000,
      totalCost: 3773900,
      sellingPrice: 4100000,
      profit: 326100,
      profitRate: 8.64,
      createdAt: '2024-12-05',
    },
  ])

  const [isAddModalOpen, setIsAddModalOpen] = useState(false)
  const [editingQuote, setEditingQuote] = useState<NewCarQuote | null>(null)
  const [formData, setFormData] = useState<Partial<NewCarQuote>>({})
  const [optionInput, setOptionInput] = useState({ name: '', price: 0 })

  const calculateTotals = (data: Partial<NewCarQuote>) => {
    const optionsTotal = (data.options || []).reduce((sum, opt) => sum + opt.price, 0)
    const totalCost =
      (data.basePrice || 0) +
      optionsTotal +
      (data.registrationFee || 0) +
      (data.insurance || 0) +
      (data.tax || 0) +
      (data.otherCosts || 0)

    const profit = (data.sellingPrice || 0) - totalCost
    const profitRate = totalCost > 0 ? (profit / totalCost) * 100 : 0

    return { totalCost, profit, profitRate }
  }

  const handleAdd = () => {
    setFormData({
      options: [],
      registrationFee: 150000,
      insurance: 85000,
      tax: 45000,
      otherCosts: 50000,
      createdAt: new Date().toISOString().split('T')[0],
    })
    setEditingQuote(null)
    setIsAddModalOpen(true)
  }

  const handleEdit = (quote: NewCarQuote) => {
    setFormData(quote)
    setEditingQuote(quote)
    setIsAddModalOpen(true)
  }

  const handleAddOption = () => {
    if (optionInput.name && optionInput.price > 0) {
      const newOptions = [...(formData.options || []), optionInput]
      const updated = { ...formData, options: newOptions }
      const { totalCost, profit, profitRate } = calculateTotals(updated)
      setFormData({ ...updated, totalCost, profit, profitRate })
      setOptionInput({ name: '', price: 0 })
    }
  }

  const handleRemoveOption = (index: number) => {
    const newOptions = (formData.options || []).filter((_, i) => i !== index)
    const updated = { ...formData, options: newOptions }
    const { totalCost, profit, profitRate } = calculateTotals(updated)
    setFormData({ ...updated, totalCost, profit, profitRate })
  }

  const handleSave = () => {
    if (!formData.carName || !formData.basePrice || !formData.sellingPrice) {
      alert('車名、車両本体価格、販売価格は必須です')
      return
    }

    const { totalCost, profit, profitRate } = calculateTotals(formData)

    const newQuote: NewCarQuote = {
      id: editingQuote?.id || Date.now().toString(),
      carName: formData.carName,
      manufacturer: formData.manufacturer || '',
      grade: formData.grade || '',
      basePrice: formData.basePrice,
      options: formData.options || [],
      registrationFee: formData.registrationFee || 0,
      insurance: formData.insurance || 0,
      tax: formData.tax || 0,
      otherCosts: formData.otherCosts || 0,
      totalCost,
      sellingPrice: formData.sellingPrice,
      profit,
      profitRate,
      createdAt: formData.createdAt || new Date().toISOString().split('T')[0],
      notes: formData.notes,
    }

    if (editingQuote) {
      setQuotes(quotes.map(q => q.id === editingQuote.id ? newQuote : q))
    } else {
      setQuotes([...quotes, newQuote])
    }

    setIsAddModalOpen(false)
    setFormData({})
    setEditingQuote(null)
  }

  const handleDelete = (id: string) => {
    if (confirm('この見積もりを削除しますか？')) {
      setQuotes(quotes.filter(q => q.id !== id))
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('ja-JP', { style: 'currency', currency: 'JPY' }).format(amount)
  }

  const totalRevenue = quotes.reduce((sum, q) => sum + q.sellingPrice, 0)
  const totalProfit = quotes.reduce((sum, q) => sum + q.profit, 0)
  const averageProfitRate = quotes.length > 0
    ? quotes.reduce((sum, q) => sum + q.profitRate, 0) / quotes.length
    : 0

  return (
    <div className="p-6 space-y-6">
      {/* ヘッダー */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">新車原価計算</h1>
          <p className="text-sm text-gray-500 mt-1">新車の原価と利益を計算</p>
        </div>
        <button
          onClick={handleAdd}
          className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus className="h-5 w-5" />
          新規見積もり
        </button>
      </div>

      {/* サマリーカード */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-lg shadow p-4 border border-gray-200">
          <div className="text-sm text-gray-600">見積もり件数</div>
          <div className="text-2xl font-bold text-blue-600 mt-1">{quotes.length}件</div>
        </div>
        <div className="bg-white rounded-lg shadow p-4 border border-gray-200">
          <div className="text-sm text-gray-600">総販売額</div>
          <div className="text-2xl font-bold text-gray-900 mt-1">
            {formatCurrency(totalRevenue)}
          </div>
        </div>
        <div className="bg-white rounded-lg shadow p-4 border border-gray-200">
          <div className="text-sm text-gray-600">総利益 (平均利益率)</div>
          <div className="text-2xl font-bold text-green-600 mt-1">
            {formatCurrency(totalProfit)}
            <span className="text-sm ml-2">({averageProfitRate.toFixed(2)}%)</span>
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
                  メーカー
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">
                  グレード
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-600 uppercase tracking-wider">
                  車両本体価格
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-600 uppercase tracking-wider">
                  総原価
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-600 uppercase tracking-wider">
                  販売価格
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-600 uppercase tracking-wider">
                  利益
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-600 uppercase tracking-wider">
                  利益率
                </th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-600 uppercase tracking-wider">
                  操作
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {quotes.map((quote) => (
                <tr key={quote.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm text-gray-900 font-medium">{quote.carName}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">{quote.manufacturer}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">{quote.grade}</td>
                  <td className="px-4 py-3 text-sm text-gray-900 text-right">
                    {formatCurrency(quote.basePrice)}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-900 text-right font-medium">
                    {formatCurrency(quote.totalCost)}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-900 text-right font-medium">
                    {formatCurrency(quote.sellingPrice)}
                  </td>
                  <td className="px-4 py-3 text-sm text-right font-medium">
                    <span className={quote.profit >= 0 ? 'text-green-600' : 'text-red-600'}>
                      {formatCurrency(quote.profit)}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-right font-medium">
                    <span className={quote.profitRate >= 0 ? 'text-green-600' : 'text-red-600'}>
                      {quote.profitRate.toFixed(2)}%
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <div className="flex items-center justify-center gap-2">
                      <button
                        onClick={() => handleEdit(quote)}
                        className="text-blue-600 hover:text-blue-800"
                      >
                        <Edit2 className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(quote.id)}
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
          <div className="bg-white rounded-lg shadow-xl w-full max-w-3xl max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                <Calculator className="h-6 w-6" />
                {editingQuote ? '見積もり編集' : '新規見積もり'}
              </h2>

              <div className="space-y-6">
                {/* 基本情報 */}
                <div>
                  <h3 className="text-sm font-medium text-gray-700 mb-3">基本情報</h3>
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
                        placeholder="例: トヨタ アルファード"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">メーカー</label>
                      <input
                        type="text"
                        value={formData.manufacturer || ''}
                        onChange={(e) => setFormData({ ...formData, manufacturer: e.target.value })}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="例: トヨタ"
                      />
                    </div>
                    <div className="col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-1">グレード</label>
                      <input
                        type="text"
                        value={formData.grade || ''}
                        onChange={(e) => setFormData({ ...formData, grade: e.target.value })}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="例: Executive Lounge"
                      />
                    </div>
                  </div>
                </div>

                {/* 原価詳細 */}
                <div className="border-t border-gray-200 pt-4">
                  <h3 className="text-sm font-medium text-gray-700 mb-3">原価詳細</h3>
                  <div className="space-y-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        車両本体価格 (円) <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="number"
                        value={formData.basePrice || ''}
                        onChange={(e) => {
                          const updated = { ...formData, basePrice: parseInt(e.target.value) || 0 }
                          const { totalCost, profit, profitRate } = calculateTotals(updated)
                          setFormData({ ...updated, totalCost, profit, profitRate })
                        }}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="8500000"
                      />
                    </div>

                    {/* オプション */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">オプション</label>
                      <div className="space-y-2">
                        {(formData.options || []).map((option, index) => (
                          <div key={index} className="flex items-center gap-2 bg-gray-50 p-2 rounded">
                            <span className="flex-1 text-sm">{option.name}</span>
                            <span className="text-sm text-gray-600">{formatCurrency(option.price)}</span>
                            <button
                              onClick={() => handleRemoveOption(index)}
                              className="text-red-600 hover:text-red-800"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        ))}
                        <div className="flex gap-2">
                          <input
                            type="text"
                            value={optionInput.name}
                            onChange={(e) => setOptionInput({ ...optionInput, name: e.target.value })}
                            className="flex-1 border border-gray-300 rounded px-2 py-1 text-sm"
                            placeholder="オプション名"
                          />
                          <input
                            type="number"
                            value={optionInput.price || ''}
                            onChange={(e) => setOptionInput({ ...optionInput, price: parseInt(e.target.value) || 0 })}
                            className="w-32 border border-gray-300 rounded px-2 py-1 text-sm"
                            placeholder="価格"
                          />
                          <button
                            onClick={handleAddOption}
                            className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm"
                          >
                            追加
                          </button>
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">登録諸費用</label>
                        <input
                          type="number"
                          value={formData.registrationFee || ''}
                          onChange={(e) => {
                            const updated = { ...formData, registrationFee: parseInt(e.target.value) || 0 }
                            const { totalCost, profit, profitRate } = calculateTotals(updated)
                            setFormData({ ...updated, totalCost, profit, profitRate })
                          }}
                          className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">保険料</label>
                        <input
                          type="number"
                          value={formData.insurance || ''}
                          onChange={(e) => {
                            const updated = { ...formData, insurance: parseInt(e.target.value) || 0 }
                            const { totalCost, profit, profitRate } = calculateTotals(updated)
                            setFormData({ ...updated, totalCost, profit, profitRate })
                          }}
                          className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">税金</label>
                        <input
                          type="number"
                          value={formData.tax || ''}
                          onChange={(e) => {
                            const updated = { ...formData, tax: parseInt(e.target.value) || 0 }
                            const { totalCost, profit, profitRate } = calculateTotals(updated)
                            setFormData({ ...updated, totalCost, profit, profitRate })
                          }}
                          className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">その他費用</label>
                        <input
                          type="number"
                          value={formData.otherCosts || ''}
                          onChange={(e) => {
                            const updated = { ...formData, otherCosts: parseInt(e.target.value) || 0 }
                            const { totalCost, profit, profitRate } = calculateTotals(updated)
                            setFormData({ ...updated, totalCost, profit, profitRate })
                          }}
                          className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* 販売価格 */}
                <div className="border-t border-gray-200 pt-4">
                  <h3 className="text-sm font-medium text-gray-700 mb-3">販売情報</h3>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      販売価格 (円) <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="number"
                      value={formData.sellingPrice || ''}
                      onChange={(e) => {
                        const updated = { ...formData, sellingPrice: parseInt(e.target.value) || 0 }
                        const { totalCost, profit, profitRate } = calculateTotals(updated)
                        setFormData({ ...updated, totalCost, profit, profitRate })
                      }}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="9800000"
                    />
                  </div>
                </div>

                {/* 計算結果 */}
                <div className="bg-blue-50 p-4 rounded-lg">
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <div className="text-xs text-gray-600">総原価</div>
                      <div className="text-lg font-bold text-gray-900">
                        {formatCurrency(formData.totalCost || 0)}
                      </div>
                    </div>
                    <div>
                      <div className="text-xs text-gray-600">利益</div>
                      <div className={`text-lg font-bold ${(formData.profit || 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {formatCurrency(formData.profit || 0)}
                      </div>
                    </div>
                    <div>
                      <div className="text-xs text-gray-600">利益率</div>
                      <div className={`text-lg font-bold ${(formData.profitRate || 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {(formData.profitRate || 0).toFixed(2)}%
                      </div>
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
                    placeholder="例: 人気グレード、特別仕様車"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 mt-6">
                <button
                  onClick={() => {
                    setIsAddModalOpen(false)
                    setFormData({})
                    setEditingQuote(null)
                    setOptionInput({ name: '', price: 0 })
                  }}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  キャンセル
                </button>
                <button
                  onClick={handleSave}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  {editingQuote ? '更新' : '登録'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
