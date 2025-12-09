'use client'

import { useState, useMemo, useCallback } from 'react'
import { vehicles as vehicleData, Vehicle, vehicleCategories, getVehicleCategory, getCategoryName } from '@/data/vehicles-data'
import { vehicleOptions as optionData, VehicleOption } from '@/data/options-data'
import { Search, Car, Filter, Wrench, ChevronUp, ChevronDown } from 'lucide-react'

// 車両改造カテゴリ（ボディーカテゴリのオプションを車両改造として扱う）
const modificationCategories = ['ボディー']

export default function VehicleManagementPage() {
  const [activeTab, setActiveTab] = useState<'vehicles' | 'modifications'>('vehicles')
  const [vehicles, setVehicles] = useState<Vehicle[]>(vehicleData)
  const [modifications, setModifications] = useState<VehicleOption[]>(
    optionData.filter(o => modificationCategories.includes(o.category))
  )
  const [searchTerm, setSearchTerm] = useState('')
  const [filterCategory, setFilterCategory] = useState<string>('')
  const [bulkTargetCategory, setBulkTargetCategory] = useState<string>('')
  const [sortField, setSortField] = useState<string>('')
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc')

  // 一括カテゴリ変更
  const handleBulkCategoryChange = (fromCategory: string, toCategory: string) => {
    if (!fromCategory || !toCategory || fromCategory === toCategory) return
    setVehicles(prev => prev.map(v => {
      const currentCategory = v.category || getVehicleCategory(v.baseVehicle, v.modelName)
      if (currentCategory === fromCategory) {
        return { ...v, category: toCategory }
      }
      return v
    }))
  }

  // 車両カテゴリでグループ化
  const vehiclesByCategory = useMemo(() => {
    const grouped: Record<string, Vehicle[]> = {}
    vehicles.forEach(v => {
      const cat = v.category || getVehicleCategory(v.baseVehicle, v.modelName)
      if (!grouped[cat]) grouped[cat] = []
      grouped[cat].push(v)
    })
    return grouped
  }, [vehicles])

  // 車両フィールド更新（即座に反映）
  const updateVehicle = useCallback((id: string, field: keyof Vehicle, value: any) => {
    setVehicles(prev => prev.map(v =>
      v.id === id ? { ...v, [field]: value } : v
    ))
  }, [])

  // 改造フィールド更新（即座に反映）
  const updateModification = useCallback((id: string, field: keyof VehicleOption, value: any) => {
    setModifications(prev => prev.map(m =>
      m.id === id ? { ...m, [field]: value } : m
    ))
  }, [])

  // ソート切り替え
  const toggleSort = (field: string) => {
    if (sortField === field) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortDirection('asc')
    }
  }

  // フィルタリング・ソートされた車両リスト
  const filteredVehicles = useMemo(() => {
    let result = vehicles.filter(v => {
      const matchesSearch =
        v.modelName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        v.baseVehicle.toLowerCase().includes(searchTerm.toLowerCase()) ||
        v.transmission.toLowerCase().includes(searchTerm.toLowerCase())
      const vehicleCategory = v.category || getVehicleCategory(v.baseVehicle, v.modelName)
      const matchesCategory = !filterCategory || vehicleCategory === filterCategory
      return matchesSearch && matchesCategory
    })

    if (sortField) {
      result = [...result].sort((a, b) => {
        let aVal = (a as any)[sortField]
        let bVal = (b as any)[sortField]
        if (typeof aVal === 'string') aVal = aVal.toLowerCase()
        if (typeof bVal === 'string') bVal = bVal.toLowerCase()
        if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1
        if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1
        return 0
      })
    }

    return result
  }, [vehicles, searchTerm, filterCategory, sortField, sortDirection])

  // フィルタリングされた改造リスト
  const filteredModifications = useMemo(() => {
    return modifications.filter(m =>
      m.name.toLowerCase().includes(searchTerm.toLowerCase())
    )
  }, [modifications, searchTerm])

  // 金額フォーマット
  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('ja-JP').format(price)
  }

  // 原価が80%フォールバック値かどうかを判定
  const isFallbackCost = (vehicle: Vehicle): boolean => {
    if (!vehicle.cost || vehicle.cost <= 0) return false
    const fallbackCost = Math.round(vehicle.basePrice * 0.8)
    return Math.abs(vehicle.cost - fallbackCost) / fallbackCost < 0.01
  }

  // ソートアイコン
  const SortIcon = ({ field }: { field: string }) => {
    if (sortField !== field) return null
    return sortDirection === 'asc' ?
      <ChevronUp className="h-3 w-3 inline ml-1" /> :
      <ChevronDown className="h-3 w-3 inline ml-1" />
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <Car className="h-7 w-7" />
          車両管理
          <span className="text-sm font-normal text-green-600 bg-green-100 px-2 py-0.5 rounded">常時編集モード</span>
        </h1>
        <p className="text-gray-600 mt-1">車両と車両改造（ボディー改造）を管理します - セルをクリックして直接編集</p>
      </div>

      {/* タブ切り替え */}
      <div className="flex border-b border-gray-200 mb-6">
        <button
          onClick={() => { setActiveTab('vehicles'); setSearchTerm(''); setFilterCategory(''); }}
          className={`flex items-center gap-2 px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'vehicles'
              ? 'border-blue-500 text-blue-600'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          <Car className="h-4 w-4" />
          車両一覧
          <span className="ml-1 bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full text-xs">
            {vehicles.length}
          </span>
        </button>
        <button
          onClick={() => { setActiveTab('modifications'); setSearchTerm(''); setFilterCategory(''); }}
          className={`flex items-center gap-2 px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'modifications'
              ? 'border-blue-500 text-blue-600'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          <Wrench className="h-4 w-4" />
          車両改造（ボディー）
          <span className="ml-1 bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full text-xs">
            {modifications.length}
          </span>
        </button>
      </div>

      {/* 車両一覧タブ */}
      {activeTab === 'vehicles' && (
        <>
          {/* フィルター・検索 */}
          <div className="mb-4 flex flex-wrap gap-4">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type="text"
                placeholder="車両名、ベース車両で検索..."
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
                {vehicleCategories.map(cat => (
                  <option key={cat.id} value={cat.id}>{cat.name}</option>
                ))}
              </select>
            </div>
          </div>

          {/* カテゴリ別車両数 */}
          <div className="mb-4 flex flex-wrap gap-2">
            {vehicleCategories.map(cat => {
              const count = vehiclesByCategory[cat.id]?.length || 0
              if (count === 0) return null
              return (
                <button
                  key={cat.id}
                  onClick={() => setFilterCategory(filterCategory === cat.id ? '' : cat.id)}
                  className={`px-3 py-1 text-sm rounded-full transition-colors ${
                    filterCategory === cat.id
                      ? 'bg-blue-500 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {cat.name} ({count})
                </button>
              )
            })}
          </div>

          {/* 一括カテゴリ変更 */}
          <div className="mb-4 p-3 bg-orange-50 border border-orange-200 rounded-lg">
            <div className="flex flex-wrap items-center gap-3">
              <span className="text-sm font-medium text-orange-800">一括カテゴリ変更:</span>
              <select
                value={filterCategory || ''}
                onChange={(e) => setFilterCategory(e.target.value)}
                className="px-3 py-1.5 border border-orange-300 rounded text-sm bg-white"
              >
                <option value="">変更元</option>
                {vehicleCategories.map(cat => {
                  const count = vehiclesByCategory[cat.id]?.length || 0
                  return (
                    <option key={cat.id} value={cat.id}>{cat.name} ({count})</option>
                  )
                })}
              </select>
              <span className="text-orange-600">→</span>
              <select
                value={bulkTargetCategory}
                onChange={(e) => setBulkTargetCategory(e.target.value)}
                className="px-3 py-1.5 border border-orange-300 rounded text-sm bg-white"
              >
                <option value="">変更先</option>
                {vehicleCategories.map(cat => (
                  <option key={cat.id} value={cat.id}>{cat.name}</option>
                ))}
              </select>
              <button
                onClick={() => {
                  if (filterCategory && bulkTargetCategory && filterCategory !== bulkTargetCategory) {
                    const count = vehiclesByCategory[filterCategory]?.length || 0
                    if (confirm(`${getCategoryName(filterCategory)}の車両${count}件を${getCategoryName(bulkTargetCategory)}に変更しますか？`)) {
                      handleBulkCategoryChange(filterCategory, bulkTargetCategory)
                      setFilterCategory('')
                      setBulkTargetCategory('')
                    }
                  }
                }}
                disabled={!filterCategory || !bulkTargetCategory || filterCategory === bulkTargetCategory}
                className={`px-3 py-1.5 rounded text-sm font-medium transition-colors ${
                  filterCategory && bulkTargetCategory && filterCategory !== bulkTargetCategory
                    ? 'bg-orange-500 text-white hover:bg-orange-600'
                    : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                }`}
              >
                実行
              </button>
            </div>
          </div>

          {/* 車両数表示 */}
          <div className="mb-2 text-sm text-gray-600">
            {filteredVehicles.length} 件の車両
          </div>

          {/* 車両テーブル - 常時編集モード */}
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <div className="overflow-x-auto" style={{ maxHeight: 'calc(100vh - 400px)' }}>
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50 sticky top-0 z-10">
                  <tr>
                    <th className="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase w-24">
                      カテゴリ
                    </th>
                    <th
                      className="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase cursor-pointer hover:bg-gray-100"
                      onClick={() => toggleSort('modelName')}
                    >
                      モデル名 <SortIcon field="modelName" />
                    </th>
                    <th className="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                      ベース車両
                    </th>
                    <th className="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase w-28">
                      駆動
                    </th>
                    <th
                      className="px-2 py-2 text-right text-xs font-medium text-gray-500 uppercase w-28 cursor-pointer hover:bg-gray-100"
                      onClick={() => toggleSort('basePrice')}
                    >
                      本体価格 <SortIcon field="basePrice" />
                    </th>
                    <th className="px-2 py-2 text-right text-xs font-medium text-orange-600 uppercase w-28">
                      原価
                    </th>
                    <th className="px-2 py-2 text-right text-xs font-medium text-gray-500 uppercase w-24">
                      環境性能割
                    </th>
                    <th className="px-2 py-2 text-right text-xs font-medium text-gray-500 uppercase w-24">
                      重量税
                    </th>
                    <th className="px-2 py-2 text-right text-xs font-medium text-gray-500 uppercase w-24">
                      自賠責
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-100">
                  {filteredVehicles.map((vehicle) => {
                    const vehicleCategory = vehicle.category || getVehicleCategory(vehicle.baseVehicle, vehicle.modelName)
                    const costStatus = !vehicle.cost ? 'none' : isFallbackCost(vehicle) ? 'fallback' : 'official'

                    return (
                      <tr key={vehicle.id} className="hover:bg-blue-50/30">
                        <td className="px-1 py-1">
                          <select
                            value={vehicleCategory}
                            onChange={(e) => updateVehicle(vehicle.id, 'category', e.target.value)}
                            className={`w-full px-1 py-1 text-xs border-0 rounded focus:ring-1 focus:ring-blue-500 ${
                              vehicleCategory === 'kei' ? 'bg-yellow-50 text-yellow-800' :
                              vehicleCategory === 'townace' ? 'bg-green-50 text-green-800' :
                              vehicleCategory === 'hiace' ? 'bg-blue-50 text-blue-800' :
                              vehicleCategory === 'used' ? 'bg-purple-50 text-purple-800' :
                              vehicleCategory === 'oneoff' ? 'bg-orange-50 text-orange-800' :
                              'bg-gray-50 text-gray-700'
                            }`}
                          >
                            {vehicleCategories.map(cat => (
                              <option key={cat.id} value={cat.id}>{cat.name}</option>
                            ))}
                          </select>
                        </td>
                        <td className="px-1 py-1">
                          <input
                            type="text"
                            value={vehicle.modelName}
                            onChange={(e) => updateVehicle(vehicle.id, 'modelName', e.target.value)}
                            className="w-full px-2 py-1 text-sm border-0 bg-transparent focus:ring-1 focus:ring-blue-500 rounded font-medium"
                          />
                        </td>
                        <td className="px-1 py-1">
                          <input
                            type="text"
                            value={vehicle.baseVehicle}
                            onChange={(e) => updateVehicle(vehicle.id, 'baseVehicle', e.target.value)}
                            className="w-full px-2 py-1 text-sm border-0 bg-transparent focus:ring-1 focus:ring-blue-500 rounded text-gray-600"
                          />
                        </td>
                        <td className="px-1 py-1">
                          <input
                            type="text"
                            value={vehicle.transmission}
                            onChange={(e) => updateVehicle(vehicle.id, 'transmission', e.target.value)}
                            className="w-full px-2 py-1 text-sm border-0 bg-transparent focus:ring-1 focus:ring-blue-500 rounded text-gray-600"
                          />
                        </td>
                        <td className="px-1 py-1">
                          <input
                            type="number"
                            value={vehicle.basePrice}
                            onChange={(e) => updateVehicle(vehicle.id, 'basePrice', parseInt(e.target.value) || 0)}
                            className="w-full px-2 py-1 text-sm border-0 bg-transparent focus:ring-1 focus:ring-blue-500 rounded text-right font-medium"
                          />
                        </td>
                        <td className="px-1 py-1">
                          <input
                            type="number"
                            value={vehicle.cost || ''}
                            onChange={(e) => updateVehicle(vehicle.id, 'cost', parseInt(e.target.value) || 0)}
                            placeholder="未設定"
                            className={`w-full px-2 py-1 text-sm border-0 focus:ring-1 focus:ring-orange-500 rounded text-right ${
                              costStatus === 'official' ? 'bg-green-50 text-green-700 font-medium' :
                              costStatus === 'fallback' ? 'bg-yellow-50 text-yellow-700' :
                              'bg-gray-50 text-gray-400'
                            }`}
                          />
                        </td>
                        <td className="px-1 py-1">
                          <input
                            type="number"
                            value={vehicle.environmentTax}
                            onChange={(e) => updateVehicle(vehicle.id, 'environmentTax', parseInt(e.target.value) || 0)}
                            className="w-full px-2 py-1 text-sm border-0 bg-transparent focus:ring-1 focus:ring-blue-500 rounded text-right text-gray-600"
                          />
                        </td>
                        <td className="px-1 py-1">
                          <input
                            type="number"
                            value={vehicle.weightTax}
                            onChange={(e) => updateVehicle(vehicle.id, 'weightTax', parseInt(e.target.value) || 0)}
                            className="w-full px-2 py-1 text-sm border-0 bg-transparent focus:ring-1 focus:ring-blue-500 rounded text-right text-gray-600"
                          />
                        </td>
                        <td className="px-1 py-1">
                          <input
                            type="number"
                            value={vehicle.insurance}
                            onChange={(e) => updateVehicle(vehicle.id, 'insurance', parseInt(e.target.value) || 0)}
                            className="w-full px-2 py-1 text-sm border-0 bg-transparent focus:ring-1 focus:ring-blue-500 rounded text-right text-gray-600"
                          />
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* 凡例 */}
          <div className="mt-4 flex flex-wrap gap-4 text-xs text-gray-600">
            <span className="flex items-center gap-1">
              <span className="w-3 h-3 bg-green-50 border border-green-200 rounded"></span>
              正式原価
            </span>
            <span className="flex items-center gap-1">
              <span className="w-3 h-3 bg-yellow-50 border border-yellow-200 rounded"></span>
              仮原価(80%)
            </span>
            <span className="flex items-center gap-1">
              <span className="w-3 h-3 bg-gray-50 border border-gray-200 rounded"></span>
              未設定
            </span>
          </div>
        </>
      )}

      {/* 車両改造タブ */}
      {activeTab === 'modifications' && (
        <>
          {/* 検索 */}
          <div className="mb-4">
            <div className="relative max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type="text"
                placeholder="改造名で検索..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          {/* 改造数表示 */}
          <div className="mb-2 text-sm text-gray-600">
            {filteredModifications.length} 件の車両改造
          </div>

          {/* 改造テーブル - 常時編集モード */}
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <div className="overflow-x-auto" style={{ maxHeight: 'calc(100vh - 350px)' }}>
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50 sticky top-0 z-10">
                  <tr>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                      改造名
                    </th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase w-24">
                      カテゴリ
                    </th>
                    <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase w-32">
                      販売価格
                    </th>
                    <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase w-32">
                      原価
                    </th>
                    <th className="px-3 py-2 text-right text-xs font-medium text-green-600 uppercase w-28">
                      粗利
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-100">
                  {filteredModifications.map((mod) => (
                    <tr key={mod.id} className="hover:bg-purple-50/30">
                      <td className="px-2 py-1">
                        <input
                          type="text"
                          value={mod.name}
                          onChange={(e) => updateModification(mod.id, 'name', e.target.value)}
                          className="w-full px-2 py-1 text-sm border-0 bg-transparent focus:ring-1 focus:ring-purple-500 rounded font-medium"
                        />
                      </td>
                      <td className="px-2 py-1 text-sm">
                        <span className="px-2 py-0.5 text-xs rounded bg-purple-100 text-purple-800">
                          {mod.category}
                        </span>
                      </td>
                      <td className="px-2 py-1">
                        <input
                          type="number"
                          value={mod.price}
                          onChange={(e) => updateModification(mod.id, 'price', parseInt(e.target.value) || 0)}
                          className="w-full px-2 py-1 text-sm border-0 bg-transparent focus:ring-1 focus:ring-purple-500 rounded text-right font-medium"
                        />
                      </td>
                      <td className="px-2 py-1">
                        <input
                          type="number"
                          value={mod.cost}
                          onChange={(e) => updateModification(mod.id, 'cost', parseInt(e.target.value) || 0)}
                          className="w-full px-2 py-1 text-sm border-0 bg-transparent focus:ring-1 focus:ring-purple-500 rounded text-right text-gray-600"
                        />
                      </td>
                      <td className="px-3 py-1 text-sm text-right font-medium text-green-600">
                        ¥{formatPrice(mod.price - mod.cost)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* 説明 */}
          <div className="mt-4 p-3 bg-purple-50 rounded-lg text-sm text-purple-700">
            <strong>車両改造（ボディー改造）:</strong> ルーフ架装、出窓架装、FRP加工など
          </div>
        </>
      )}
    </div>
  )
}
