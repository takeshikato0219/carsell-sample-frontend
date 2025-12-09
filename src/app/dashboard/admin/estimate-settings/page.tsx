'use client'

import { useState, useMemo, useEffect } from 'react'
import { vehicleOptions as optionData, VehicleOption } from '@/data/options-data'
import { Search, Edit2, Save, X, Wrench, Plus, Trash2, Filter, GripVertical, Car } from 'lucide-react'
import { useSettingsStore, FeeItem, RequiredOptionConfig } from '@/stores/settings-store'
import { vehicles as vehicleData } from '@/data/vehicles-data'

export default function EstimateSettingsPage() {
  const [activeTab, setActiveTab] = useState<'options' | 'fees' | 'requiredOptions'>('options')
  const [options, setOptions] = useState<VehicleOption[]>(optionData)

  // ストアから諸費用設定と必須オプション設定を取得
  const { feeItems: storedFeeItems, updateFeeItems, requiredOptions: storedRequiredOptions, updateRequiredOptions } = useSettingsStore()

  // デフォルト値（ストアがまだハイドレートされていない場合のフォールバック）
  const defaultFeeItems: FeeItem[] = [
    { id: 'fee1', name: '登録代行費用', defaultAmount: 0, isRequired: false, isTaxable: true },
    { id: 'fee2', name: '車庫証明代行費用', defaultAmount: 0, isRequired: false, isTaxable: true },
    { id: 'fee3', name: '納車費用', defaultAmount: 0, isRequired: false, isTaxable: true },
    { id: 'fee4', name: '下取り諸費用', defaultAmount: 0, isRequired: false, isTaxable: true },
  ]

  const [feeItems, setFeeItems] = useState<FeeItem[]>(
    storedFeeItems && storedFeeItems.length > 0 ? storedFeeItems : defaultFeeItems
  )

  // 車両ベース別必須オプション設定
  const [requiredOptionConfigs, setRequiredOptionConfigs] = useState<RequiredOptionConfig[]>(storedRequiredOptions || [])
  const [selectedVehicleBase, setSelectedVehicleBase] = useState<string>('')
  const [selectedOptionIds, setSelectedOptionIds] = useState<string[]>([])
  const [optionSearchTerm, setOptionSearchTerm] = useState('')

  // 車両ベース一覧を取得（重複を除く）
  const vehicleBases = useMemo(() => {
    const bases = new Set(vehicleData.map(v => v.baseVehicle))
    return Array.from(bases).sort()
  }, [])

  // ストアの必須オプション設定が変更されたら同期
  useEffect(() => {
    if (storedRequiredOptions) {
      setRequiredOptionConfigs(storedRequiredOptions)
    }
  }, [storedRequiredOptions])

  // 車両ベース選択時に設定を読み込む
  useEffect(() => {
    if (selectedVehicleBase) {
      const config = requiredOptionConfigs.find(c => c.vehicleBase === selectedVehicleBase)
      setSelectedOptionIds(config?.optionIds || [])
    } else {
      setSelectedOptionIds([])
    }
  }, [selectedVehicleBase, requiredOptionConfigs])

  // 必須オプション設定を保存
  const handleSaveRequiredOptions = () => {
    if (!selectedVehicleBase) return

    const updatedConfigs = requiredOptionConfigs.filter(c => c.vehicleBase !== selectedVehicleBase)
    if (selectedOptionIds.length > 0) {
      updatedConfigs.push({
        vehicleBase: selectedVehicleBase,
        optionIds: selectedOptionIds,
      })
    }
    setRequiredOptionConfigs(updatedConfigs)
    updateRequiredOptions(updatedConfigs)
    alert(`${selectedVehicleBase} の必須オプション設定を保存しました`)
  }

  // オプション選択トグル
  const toggleOptionSelection = (optionId: string) => {
    setSelectedOptionIds(prev =>
      prev.includes(optionId)
        ? prev.filter(id => id !== optionId)
        : [...prev, optionId]
    )
  }

  // 検索されたオプションリスト
  const filteredOptionsForRequired = useMemo(() => {
    if (!optionSearchTerm) return options
    return options.filter(o =>
      o.name.toLowerCase().includes(optionSearchTerm.toLowerCase()) ||
      o.category.toLowerCase().includes(optionSearchTerm.toLowerCase())
    )
  }, [options, optionSearchTerm])

  const [searchTerm, setSearchTerm] = useState('')
  const [filterCategory, setFilterCategory] = useState<string>('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editData, setEditData] = useState<Partial<VehicleOption>>({})
  const [showAddModal, setShowAddModal] = useState(false)
  const [showAddFeeModal, setShowAddFeeModal] = useState(false)
  const [newFeeItem, setNewFeeItem] = useState({ name: '', defaultAmount: 0, isTaxable: true })
  const [editingFeeId, setEditingFeeId] = useState<string | null>(null)
  const [newOption, setNewOption] = useState<Partial<VehicleOption>>({
    name: '',
    category: '一般',
    price: 0,
    cost: 0,
    isStandard: false,
  })

  // ストアの諸費用設定が変更されたら同期（ハイドレート後）
  useEffect(() => {
    if (storedFeeItems && storedFeeItems.length > 0) {
      setFeeItems(storedFeeItems)
    }
  }, [storedFeeItems])

  // 諸費用設定をストアに保存
  const handleSaveFeeItems = () => {
    updateFeeItems(feeItems)
    alert('諸費用設定を保存しました')
  }

  // カテゴリ一覧を取得
  const categories = useMemo(() => {
    const cats = new Set(options.map(o => o.category))
    return Array.from(cats).sort()
  }, [options])

  // フィルタリングされたオプションリスト
  const filteredOptions = useMemo(() => {
    return options.filter(o => {
      const matchesSearch = o.name.toLowerCase().includes(searchTerm.toLowerCase())
      const matchesCategory = !filterCategory || o.category === filterCategory
      return matchesSearch && matchesCategory
    })
  }, [options, searchTerm, filterCategory])

  // 編集開始
  const handleEdit = (option: VehicleOption) => {
    setEditingId(option.id)
    setEditData({ ...option })
  }

  // 編集キャンセル
  const handleCancel = () => {
    setEditingId(null)
    setEditData({})
  }

  // 保存
  const handleSave = () => {
    if (!editingId) return
    setOptions(prev => prev.map(o =>
      o.id === editingId ? { ...o, ...editData } as VehicleOption : o
    ))
    setEditingId(null)
    setEditData({})
  }

  // オプション追加
  const handleAddOption = () => {
    const newId = `opt${Date.now()}`
    setOptions(prev => [...prev, {
      id: newId,
      name: newOption.name || '',
      category: newOption.category || '一般',
      price: newOption.price || 0,
      cost: newOption.cost || 0,
      isStandard: newOption.isStandard || false,
    }])
    setShowAddModal(false)
    setNewOption({
      name: '',
      category: '一般',
      price: 0,
      cost: 0,
      isStandard: false,
    })
  }

  // オプション削除
  const handleDeleteOption = (id: string) => {
    if (confirm('このオプションを削除しますか？')) {
      setOptions(prev => prev.filter(o => o.id !== id))
    }
  }

  // 金額フォーマット
  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('ja-JP').format(price)
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <Wrench className="h-7 w-7" />
          見積設定
        </h1>
        <p className="text-gray-600 mt-1">オプション・諸費用を管理します</p>
      </div>

      {/* タブ */}
      <div className="mb-6 border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab('options')}
            className={`py-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'options'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            オプション管理
          </button>
          <button
            onClick={() => setActiveTab('fees')}
            className={`py-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'fees'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            諸費用設定
          </button>
          <button
            onClick={() => setActiveTab('requiredOptions')}
            className={`py-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'requiredOptions'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            車両ベース必須オプション
          </button>
        </nav>
      </div>

      {activeTab === 'options' ? (
        <>
          {/* フィルター・検索 */}
          <div className="mb-6 flex flex-wrap gap-4">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type="text"
                placeholder="オプション名で検索..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div className="relative min-w-[200px]">
              <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              <select
                value={filterCategory}
                onChange={(e) => setFilterCategory(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent appearance-none bg-white"
              >
                <option value="">全カテゴリ</option>
                {categories.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>
            <button
              onClick={() => setShowAddModal(true)}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
            >
              <Plus className="h-5 w-5" />
              オプション追加
            </button>
          </div>

          {/* オプション数表示 */}
          <div className="mb-4 text-sm text-gray-600">
            {filteredOptions.length} 件のオプション
          </div>

          {/* オプションテーブル */}
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      オプション名
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      カテゴリ
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      販売価格
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      原価
                    </th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                      標準装備
                    </th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                      操作
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredOptions.map((option) => (
                    <tr key={option.id} className="hover:bg-gray-50">
                      {editingId === option.id ? (
                        // 編集モード
                        <>
                          <td className="px-4 py-3 text-sm">
                            <input
                              type="text"
                              value={editData.name || ''}
                              onChange={(e) => setEditData({ ...editData, name: e.target.value })}
                              className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                            />
                          </td>
                          <td className="px-4 py-3 text-sm">
                            <select
                              value={editData.category || ''}
                              onChange={(e) => setEditData({ ...editData, category: e.target.value })}
                              className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                            >
                              {categories.map(cat => (
                                <option key={cat} value={cat}>{cat}</option>
                              ))}
                            </select>
                          </td>
                          <td className="px-4 py-3 text-sm text-right">
                            <input
                              type="number"
                              value={editData.price || 0}
                              onChange={(e) => setEditData({ ...editData, price: parseInt(e.target.value) || 0 })}
                              className="w-28 px-2 py-1 border border-gray-300 rounded text-sm text-right"
                            />
                          </td>
                          <td className="px-4 py-3 text-sm text-right">
                            <input
                              type="number"
                              value={editData.cost || 0}
                              onChange={(e) => setEditData({ ...editData, cost: parseInt(e.target.value) || 0 })}
                              className="w-28 px-2 py-1 border border-gray-300 rounded text-sm text-right"
                            />
                          </td>
                          <td className="px-4 py-3 text-sm text-center">
                            <input
                              type="checkbox"
                              checked={editData.isStandard || false}
                              onChange={(e) => setEditData({ ...editData, isStandard: e.target.checked })}
                              className="h-4 w-4 text-blue-600 rounded"
                            />
                          </td>
                          <td className="px-4 py-3 text-sm text-center">
                            <div className="flex justify-center gap-2">
                              <button
                                onClick={handleSave}
                                className="p-1 text-green-600 hover:text-green-800"
                                title="保存"
                              >
                                <Save className="h-5 w-5" />
                              </button>
                              <button
                                onClick={handleCancel}
                                className="p-1 text-gray-600 hover:text-gray-800"
                                title="キャンセル"
                              >
                                <X className="h-5 w-5" />
                              </button>
                            </div>
                          </td>
                        </>
                      ) : (
                        // 表示モード
                        <>
                          <td className="px-4 py-3 text-sm font-medium text-gray-900">
                            {option.name}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-600">
                            <span className="px-2 py-1 bg-gray-100 rounded text-xs">
                              {option.category}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-sm text-right font-medium text-gray-900">
                            ¥{formatPrice(option.price)}
                          </td>
                          <td className="px-4 py-3 text-sm text-right text-gray-600">
                            ¥{formatPrice(option.cost)}
                          </td>
                          <td className="px-4 py-3 text-sm text-center">
                            {option.isStandard ? (
                              <span className="text-green-600">標準</span>
                            ) : (
                              <span className="text-gray-400">-</span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-sm text-center">
                            <div className="flex justify-center gap-2">
                              <button
                                onClick={() => handleEdit(option)}
                                className="p-1 text-blue-600 hover:text-blue-800"
                                title="編集"
                              >
                                <Edit2 className="h-5 w-5" />
                              </button>
                              <button
                                onClick={() => handleDeleteOption(option.id)}
                                className="p-1 text-red-600 hover:text-red-800"
                                title="削除"
                              >
                                <Trash2 className="h-5 w-5" />
                              </button>
                            </div>
                          </td>
                        </>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      ) : (
        // 諸費用設定タブ
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">デフォルト諸費用設定</h2>
              <p className="text-sm text-gray-600 mt-1">
                新規見積作成時に自動設定される諸費用の初期値です
              </p>
            </div>
            <button
              onClick={() => setShowAddFeeModal(true)}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
            >
              <Plus className="h-5 w-5" />
              諸費用項目追加
            </button>
          </div>

          {/* 諸費用項目リスト */}
          <div className="space-y-3">
            {feeItems.map((item) => (
              <div
                key={item.id}
                className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg border border-gray-200"
              >
                <GripVertical className="h-5 w-5 text-gray-400 cursor-move" />

                {editingFeeId === item.id ? (
                  // 編集モード
                  <>
                    <div className="flex-1">
                      <input
                        type="text"
                        value={item.name}
                        onChange={(e) => setFeeItems(prev => prev.map(f =>
                          f.id === item.id ? { ...f, name: e.target.value } : f
                        ))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="項目名"
                      />
                    </div>
                    <div className="w-40">
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">¥</span>
                        <input
                          type="number"
                          value={item.defaultAmount}
                          onChange={(e) => setFeeItems(prev => prev.map(f =>
                            f.id === item.id ? { ...f, defaultAmount: parseInt(e.target.value) || 0 } : f
                          ))}
                          className="w-full pl-8 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-right"
                        />
                      </div>
                    </div>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={item.isTaxable ?? true}
                        onChange={(e) => setFeeItems(prev => prev.map(f =>
                          f.id === item.id ? { ...f, isTaxable: e.target.checked } : f
                        ))}
                        className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      <span className="text-sm text-gray-600">課税</span>
                    </label>
                    <button
                      onClick={() => setEditingFeeId(null)}
                      className="p-2 text-green-600 hover:text-green-800"
                      title="完了"
                    >
                      <Save className="h-5 w-5" />
                    </button>
                  </>
                ) : (
                  // 表示モード
                  <>
                    <div className="flex-1">
                      <span className="font-medium text-gray-900">{item.name}</span>
                      {item.isRequired && (
                        <span className="ml-2 text-xs text-blue-600 bg-blue-100 px-2 py-0.5 rounded">必須</span>
                      )}
                      {(item.isTaxable ?? true) && (
                        <span className="ml-2 text-xs text-green-600 bg-green-100 px-2 py-0.5 rounded">10%課税</span>
                      )}
                      {!(item.isTaxable ?? true) && (
                        <span className="ml-2 text-xs text-gray-600 bg-gray-200 px-2 py-0.5 rounded">非課税</span>
                      )}
                    </div>
                    <div className="w-40 text-right font-medium text-gray-900">
                      ¥{formatPrice(item.defaultAmount)}
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => setEditingFeeId(item.id)}
                        className="p-2 text-blue-600 hover:text-blue-800"
                        title="編集"
                      >
                        <Edit2 className="h-5 w-5" />
                      </button>
                      {!item.isRequired && (
                        <button
                          onClick={() => {
                            if (confirm('この諸費用項目を削除しますか？')) {
                              setFeeItems(prev => prev.filter(f => f.id !== item.id))
                            }
                          }}
                          className="p-2 text-red-600 hover:text-red-800"
                          title="削除"
                        >
                          <Trash2 className="h-5 w-5" />
                        </button>
                      )}
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>

          <div className="mt-6 pt-6 border-t border-gray-200">
            <div className="flex items-center justify-between">
              <div className="text-sm text-gray-600">
                合計 {feeItems.length} 項目
              </div>
              <button
                onClick={handleSaveFeeItems}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                設定を保存
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 車両ベース必須オプションタブ */}
      {activeTab === 'requiredOptions' && (
        <div className="bg-white rounded-lg shadow-lg p-6">
          <div className="mb-6">
            <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <Car className="h-5 w-5 text-blue-500" />
              車両ベース別必須オプション設定
            </h2>
            <p className="text-sm text-gray-600 mt-1">
              車両ベースを選択すると、その車両を選択した際に自動的に追加されるオプションを設定できます
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* 車両ベース選択 */}
            <div className="lg:col-span-1">
              <h3 className="font-medium text-gray-900 mb-3">車両ベース</h3>
              <div className="space-y-2 max-h-[500px] overflow-y-auto">
                {vehicleBases.map(base => {
                  const hasConfig = requiredOptionConfigs.some(c => c.vehicleBase === base && c.optionIds.length > 0)
                  return (
                    <button
                      key={base}
                      onClick={() => setSelectedVehicleBase(base)}
                      className={`w-full text-left px-3 py-2 rounded-lg border transition-colors ${
                        selectedVehicleBase === base
                          ? 'bg-blue-100 border-blue-500 text-blue-700'
                          : hasConfig
                            ? 'bg-green-50 border-green-200 text-gray-700 hover:bg-green-100'
                            : 'bg-gray-50 border-gray-200 text-gray-700 hover:bg-gray-100'
                      }`}
                    >
                      <span className="text-sm">{base}</span>
                      {hasConfig && (
                        <span className="ml-2 text-xs bg-green-500 text-white px-2 py-0.5 rounded">設定済</span>
                      )}
                    </button>
                  )
                })}
              </div>
            </div>

            {/* オプション選択 */}
            <div className="lg:col-span-2">
              {selectedVehicleBase ? (
                <>
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-medium text-gray-900">
                      {selectedVehicleBase} の必須オプション
                    </h3>
                    <span className="text-sm text-blue-600">
                      {selectedOptionIds.length} 件選択中
                    </span>
                  </div>

                  {/* 検索 */}
                  <div className="relative mb-4">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                    <input
                      type="text"
                      placeholder="オプション名・カテゴリで検索..."
                      value={optionSearchTerm}
                      onChange={(e) => setOptionSearchTerm(e.target.value)}
                      className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>

                  {/* 選択済みオプション */}
                  {selectedOptionIds.length > 0 && (
                    <div className="mb-4 p-3 bg-blue-50 rounded-lg">
                      <p className="text-sm font-medium text-blue-700 mb-2">選択済みオプション:</p>
                      <div className="flex flex-wrap gap-2">
                        {selectedOptionIds.map(id => {
                          const opt = options.find(o => o.id === id)
                          return opt ? (
                            <span
                              key={id}
                              className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-800 text-sm rounded"
                            >
                              {opt.name}
                              <button
                                onClick={() => toggleOptionSelection(id)}
                                className="hover:text-blue-600"
                              >
                                <X className="h-4 w-4" />
                              </button>
                            </span>
                          ) : null
                        })}
                      </div>
                    </div>
                  )}

                  {/* オプションリスト */}
                  <div className="max-h-[350px] overflow-y-auto border border-gray-200 rounded-lg">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-50 sticky top-0">
                        <tr>
                          <th className="px-4 py-2 text-left font-medium text-gray-600 w-12"></th>
                          <th className="px-4 py-2 text-left font-medium text-gray-600">オプション名</th>
                          <th className="px-4 py-2 text-left font-medium text-gray-600 w-24">カテゴリ</th>
                          <th className="px-4 py-2 text-right font-medium text-gray-600 w-24">価格</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {filteredOptionsForRequired.map(opt => (
                          <tr
                            key={opt.id}
                            className={`cursor-pointer transition-colors ${
                              selectedOptionIds.includes(opt.id)
                                ? 'bg-blue-50'
                                : 'hover:bg-gray-50'
                            }`}
                            onClick={() => toggleOptionSelection(opt.id)}
                          >
                            <td className="px-4 py-2">
                              <input
                                type="checkbox"
                                checked={selectedOptionIds.includes(opt.id)}
                                onChange={() => {}}
                                className="h-4 w-4 text-blue-600 rounded border-gray-300"
                              />
                            </td>
                            <td className="px-4 py-2 text-gray-900">{opt.name}</td>
                            <td className="px-4 py-2">
                              <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded">
                                {opt.category}
                              </span>
                            </td>
                            <td className="px-4 py-2 text-right text-gray-900">
                              ¥{formatPrice(opt.price)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* 保存ボタン */}
                  <div className="mt-4 flex justify-end">
                    <button
                      onClick={handleSaveRequiredOptions}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                    >
                      設定を保存
                    </button>
                  </div>
                </>
              ) : (
                <div className="flex items-center justify-center h-64 text-gray-500">
                  <div className="text-center">
                    <Car className="h-12 w-12 mx-auto text-gray-300 mb-2" />
                    <p>左側から車両ベースを選択してください</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* オプション追加モーダル */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">新規オプション追加</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  オプション名
                </label>
                <input
                  type="text"
                  value={newOption.name || ''}
                  onChange={(e) => setNewOption({ ...newOption, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="オプション名を入力"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  カテゴリ
                </label>
                <select
                  value={newOption.category || '一般'}
                  onChange={(e) => setNewOption({ ...newOption, category: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  {categories.map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  販売価格
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">¥</span>
                  <input
                    type="number"
                    value={newOption.price || 0}
                    onChange={(e) => setNewOption({ ...newOption, price: parseInt(e.target.value) || 0 })}
                    className="w-full pl-8 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  原価
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">¥</span>
                  <input
                    type="number"
                    value={newOption.cost || 0}
                    onChange={(e) => setNewOption({ ...newOption, cost: parseInt(e.target.value) || 0 })}
                    className="w-full pl-8 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="isStandard"
                  checked={newOption.isStandard || false}
                  onChange={(e) => setNewOption({ ...newOption, isStandard: e.target.checked })}
                  className="h-4 w-4 text-blue-600 rounded"
                />
                <label htmlFor="isStandard" className="ml-2 text-sm text-gray-700">
                  標準装備として設定
                </label>
              </div>
            </div>
            <div className="mt-6 flex justify-end gap-3">
              <button
                onClick={() => setShowAddModal(false)}
                className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
              >
                キャンセル
              </button>
              <button
                onClick={handleAddOption}
                disabled={!newOption.name}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                追加
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 諸費用項目追加モーダル */}
      {showAddFeeModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">新規諸費用項目追加</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  項目名
                </label>
                <input
                  type="text"
                  value={newFeeItem.name}
                  onChange={(e) => setNewFeeItem({ ...newFeeItem, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="例: 点検整備費用"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  デフォルト金額
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">¥</span>
                  <input
                    type="number"
                    value={newFeeItem.defaultAmount}
                    onChange={(e) => setNewFeeItem({ ...newFeeItem, defaultAmount: parseInt(e.target.value) || 0 })}
                    className="w-full pl-8 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="newFeeIsTaxable"
                  checked={newFeeItem.isTaxable}
                  onChange={(e) => setNewFeeItem({ ...newFeeItem, isTaxable: e.target.checked })}
                  className="h-4 w-4 text-blue-600 rounded"
                />
                <label htmlFor="newFeeIsTaxable" className="ml-2 text-sm text-gray-700">
                  10%課税対象
                </label>
              </div>
            </div>
            <div className="mt-6 flex justify-end gap-3">
              <button
                onClick={() => {
                  setShowAddFeeModal(false)
                  setNewFeeItem({ name: '', defaultAmount: 0, isTaxable: true })
                }}
                className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
              >
                キャンセル
              </button>
              <button
                onClick={() => {
                  if (newFeeItem.name.trim()) {
                    setFeeItems(prev => [...prev, {
                      id: `fee${Date.now()}`,
                      name: newFeeItem.name.trim(),
                      defaultAmount: newFeeItem.defaultAmount,
                      isRequired: false,
                      isTaxable: newFeeItem.isTaxable,
                    }])
                    setShowAddFeeModal(false)
                    setNewFeeItem({ name: '', defaultAmount: 0, isTaxable: true })
                  }
                }}
                disabled={!newFeeItem.name.trim()}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                追加
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
