'use client'

import { useState, useMemo, DragEvent } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Plus, Search, Car, Wrench, CheckCircle, AlertTriangle, X, MapPin, Sparkles } from 'lucide-react'
import { useShowroomStore, ShowroomVehicle, VehicleStatus } from '@/stores/showroom-store'

// ステージ定義
const VEHICLE_STAGES: { status: VehicleStatus; label: string; icon: any; color: string; bgColor: string }[] = [
  { status: 'on_display', label: '展示中', icon: Car, color: 'text-green-700', bgColor: 'bg-green-500' },
  { status: 'preparing', label: '準備中', icon: Wrench, color: 'text-blue-700', bgColor: 'bg-blue-500' },
  { status: 'maintenance', label: '整備中', icon: AlertTriangle, color: 'text-orange-700', bgColor: 'bg-orange-500' },
  { status: 'sold', label: '成約済み', icon: CheckCircle, color: 'text-purple-700', bgColor: 'bg-purple-500' },
]

// 価格フォーマット
function formatPrice(price: number): string {
  return new Intl.NumberFormat('ja-JP').format(price) + '円'
}

// 展示車カードコンポーネント
function VehicleCard({
  vehicle,
  onDragStart,
  isDragging
}: {
  vehicle: ShowroomVehicle
  onDragStart: (e: DragEvent<HTMLDivElement>, vehicle: ShowroomVehicle) => void
  isDragging: boolean
}) {
  return (
    <div
      draggable
      onDragStart={(e) => onDragStart(e, vehicle)}
      className={`transition-all ${isDragging ? 'opacity-50 scale-95' : ''}`}
    >
      <div className="mb-2 px-3 py-3 bg-white rounded-lg shadow-sm hover:shadow-md cursor-grab active:cursor-grabbing border border-gray-200 group">
        {/* ヘッダー */}
        <div className="flex items-start justify-between mb-2">
          <div>
            <span className="text-sm font-semibold text-gray-900">{vehicle.name}</span>
            <span className="ml-2 text-xs text-gray-500">{vehicle.model}</span>
          </div>
          <span className="text-xs px-1.5 py-0.5 rounded bg-yellow-100 text-yellow-700">
            {vehicle.year}年式
          </span>
        </div>

        {/* 色 */}
        <div className="flex items-center gap-2 mb-2">
          <div className="flex items-center gap-1 text-xs text-gray-500">
            <div className="w-3 h-3 rounded-full border border-gray-300" style={{
              backgroundColor: vehicle.color === 'ホワイトパール' || vehicle.color === 'ホワイト' || vehicle.color === 'パールホワイト' || vehicle.color === 'アイボリー' ? '#f8f8f8' :
                vehicle.color === 'ブラック' ? '#333' :
                vehicle.color === 'シルバー' || vehicle.color === 'グレー' ? '#c0c0c0' :
                vehicle.color === 'レッド' ? '#e53935' :
                vehicle.color === 'ブルー' ? '#1e88e5' :
                vehicle.color === 'ベージュ' ? '#d4b896' : '#888'
            }}></div>
            <span>{vehicle.color}</span>
          </div>
        </div>

        {/* 価格 */}
        <div className="mb-2">
          <span className="text-sm font-bold text-green-600">{formatPrice(vehicle.price)}</span>
        </div>

        {/* メモ */}
        {vehicle.notes && (
          <p className="text-xs text-gray-500 mb-2 line-clamp-1">{vehicle.notes}</p>
        )}

        {/* フッター */}
        <div className="flex items-center justify-between text-[10px] text-gray-400">
          <div className="flex items-center gap-1">
            <MapPin className="h-3 w-3" />
            <span>{vehicle.location}</span>
          </div>
        </div>
      </div>
    </div>
  )
}

// カンバンカラムコンポーネント
function VehicleColumn({
  stage,
  vehicles,
  onDragStart,
  onDragOver,
  onDrop,
  isDropTarget,
  draggingVehicleId
}: {
  stage: typeof VEHICLE_STAGES[0]
  vehicles: ShowroomVehicle[]
  onDragStart: (e: DragEvent<HTMLDivElement>, vehicle: ShowroomVehicle) => void
  onDragOver: (e: DragEvent<HTMLDivElement>) => void
  onDrop: (e: DragEvent<HTMLDivElement>, status: VehicleStatus) => void
  isDropTarget: boolean
  draggingVehicleId: string | null
}) {
  const StageIcon = stage.icon

  return (
    <div className="flex-shrink-0 w-80">
      <div
        className={`h-full transition-all duration-200 ${isDropTarget ? 'bg-blue-50/50' : ''}`}
        onDragOver={onDragOver}
        onDrop={(e) => onDrop(e, stage.status)}
      >
        {/* カラムヘッダー */}
        <div className="flex items-center gap-2 px-3 py-2 mb-2">
          <span className={`w-2.5 h-2.5 rounded-full ${stage.bgColor}`}></span>
          <StageIcon className={`h-4 w-4 ${stage.color}`} />
          <span className="text-sm font-medium text-gray-700">{stage.label}</span>
          <span className="text-sm text-gray-400">{vehicles.length}</span>
        </div>

        {/* カード一覧 */}
        <div className="px-2 overflow-y-auto" style={{ maxHeight: 'calc(100vh - 320px)' }}>
          {vehicles.map((vehicle) => (
            <VehicleCard
              key={vehicle.id}
              vehicle={vehicle}
              onDragStart={onDragStart}
              isDragging={draggingVehicleId === vehicle.id}
            />
          ))}
        </div>
      </div>
    </div>
  )
}

export default function ShowroomNewPage() {
  const { newVehicles, addNewVehicle, updateNewVehicleStatus } = useShowroomStore()
  const [searchQuery, setSearchQuery] = useState('')
  const [draggingVehicle, setDraggingVehicle] = useState<ShowroomVehicle | null>(null)
  const [dropTargetStatus, setDropTargetStatus] = useState<VehicleStatus | null>(null)
  const [showAddModal, setShowAddModal] = useState(false)
  const [newVehicle, setNewVehicle] = useState({
    name: '',
    model: '',
    year: new Date().getFullYear(),
    color: '',
    price: 0,
    location: '',
    notes: '',
  })

  // 検索フィルター
  const filteredVehicles = useMemo(() => {
    if (!searchQuery) return newVehicles
    const query = searchQuery.toLowerCase()
    return newVehicles.filter(v =>
      v.name.toLowerCase().includes(query) ||
      v.model.toLowerCase().includes(query) ||
      v.color.toLowerCase().includes(query) ||
      v.location.toLowerCase().includes(query)
    )
  }, [newVehicles, searchQuery])

  // ステータスごとに分類
  const vehiclesByStatus = useMemo(() => {
    const result: Record<VehicleStatus, ShowroomVehicle[]> = {
      on_display: [],
      preparing: [],
      maintenance: [],
      sold: [],
    }
    filteredVehicles.forEach(vehicle => {
      result[vehicle.status].push(vehicle)
    })
    return result
  }, [filteredVehicles])

  // ドラッグ開始
  const handleDragStart = (e: DragEvent<HTMLDivElement>, vehicle: ShowroomVehicle) => {
    setDraggingVehicle(vehicle)
    e.dataTransfer.effectAllowed = 'move'
  }

  // ドラッグオーバー
  const handleDragOver = (e: DragEvent<HTMLDivElement>, status: VehicleStatus) => {
    e.preventDefault()
    if (draggingVehicle && draggingVehicle.status !== status) {
      setDropTargetStatus(status)
    }
  }

  // ドラッグ終了
  const handleDragEnd = () => {
    setDraggingVehicle(null)
    setDropTargetStatus(null)
  }

  // ドロップ
  const handleDrop = (e: DragEvent<HTMLDivElement>, newStatus: VehicleStatus) => {
    e.preventDefault()
    if (!draggingVehicle || draggingVehicle.status === newStatus) {
      handleDragEnd()
      return
    }

    updateNewVehicleStatus(draggingVehicle.id, newStatus)
    handleDragEnd()
  }

  // 展示車追加
  const handleAddVehicle = () => {
    if (!newVehicle.name || !newVehicle.model) return

    addNewVehicle({
      name: newVehicle.name,
      model: newVehicle.model,
      year: newVehicle.year,
      color: newVehicle.color,
      price: newVehicle.price,
      location: newVehicle.location,
      status: 'preparing',
      notes: newVehicle.notes || undefined,
    })

    setNewVehicle({
      name: '',
      model: '',
      year: new Date().getFullYear(),
      color: '',
      price: 0,
      location: '',
      notes: '',
    })
    setShowAddModal(false)
  }

  // 統計情報
  const stats = useMemo(() => ({
    total: newVehicles.length,
    onDisplay: newVehicles.filter(v => v.status === 'on_display').length,
    totalValue: newVehicles.filter(v => v.status !== 'sold').reduce((sum, v) => sum + v.price, 0),
    sold: newVehicles.filter(v => v.status === 'sold').length,
  }), [newVehicles])

  return (
    <div className="h-full flex flex-col" onDragEnd={handleDragEnd}>
      {/* ヘッダー */}
      <div className="flex-shrink-0 px-6 py-4 bg-white border-b">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <Sparkles className="h-6 w-6 text-yellow-500" />
            <div>
              <h1 className="text-2xl font-bold text-gray-900">新車展示車ステータス</h1>
              <p className="text-sm text-gray-600 mt-0.5">新車展示車両の状態をカンバン形式で管理</p>
            </div>
          </div>
          <Button onClick={() => setShowAddModal(true)}>
            <Plus className="mr-2 h-4 w-4" />
            新車を追加
          </Button>
        </div>

        {/* 統計 */}
        <div className="grid grid-cols-4 gap-4 mb-4">
          <div className="bg-gray-50 rounded-lg p-3">
            <div className="text-xs text-gray-500">総台数</div>
            <div className="text-xl font-bold text-gray-900">{stats.total}台</div>
          </div>
          <div className="bg-green-50 rounded-lg p-3">
            <div className="text-xs text-green-600">展示中</div>
            <div className="text-xl font-bold text-green-700">{stats.onDisplay}台</div>
          </div>
          <div className="bg-blue-50 rounded-lg p-3">
            <div className="text-xs text-blue-600">在庫総額</div>
            <div className="text-xl font-bold text-blue-700">{formatPrice(stats.totalValue)}</div>
          </div>
          <div className="bg-purple-50 rounded-lg p-3">
            <div className="text-xs text-purple-600">成約台数</div>
            <div className="text-xl font-bold text-purple-700">{stats.sold}台</div>
          </div>
        </div>

        {/* 検索 */}
        <div className="flex items-center space-x-2 max-w-md">
          <Search className="h-4 w-4 text-gray-400" />
          <Input
            placeholder="車名、型式、色、場所で検索..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="flex-1"
          />
        </div>
      </div>

      {/* カンバンボード */}
      <div className="flex-1 overflow-x-auto p-6 bg-gray-50">
        <div className="flex gap-4 h-full">
          {VEHICLE_STAGES.map((stage) => (
            <VehicleColumn
              key={stage.status}
              stage={stage}
              vehicles={vehiclesByStatus[stage.status]}
              onDragStart={handleDragStart}
              onDragOver={(e) => handleDragOver(e, stage.status)}
              onDrop={handleDrop}
              isDropTarget={dropTargetStatus === stage.status}
              draggingVehicleId={draggingVehicle?.id || null}
            />
          ))}
        </div>
      </div>

      {/* 展示車追加モーダル */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/30" onClick={() => setShowAddModal(false)} />
          <div className="relative bg-white rounded-lg w-full max-w-lg mx-4 shadow-xl">
            <div className="flex items-center justify-between px-6 py-4 border-b">
              <h2 className="text-lg font-semibold text-gray-900">新車を追加</h2>
              <button onClick={() => setShowAddModal(false)} className="text-gray-400 hover:text-gray-600">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">車名</label>
                  <Input
                    value={newVehicle.name}
                    onChange={(e) => setNewVehicle(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="例: バンテック ジル520"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">型式</label>
                  <Input
                    value={newVehicle.model}
                    onChange={(e) => setNewVehicle(prev => ({ ...prev, model: e.target.value }))}
                    placeholder="例: ZIL520"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">年式</label>
                  <Input
                    type="number"
                    value={newVehicle.year}
                    onChange={(e) => setNewVehicle(prev => ({ ...prev, year: parseInt(e.target.value) || 0 }))}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">色</label>
                  <Input
                    value={newVehicle.color}
                    onChange={(e) => setNewVehicle(prev => ({ ...prev, color: e.target.value }))}
                    placeholder="例: ホワイト"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">価格（円）</label>
                  <Input
                    type="number"
                    value={newVehicle.price}
                    onChange={(e) => setNewVehicle(prev => ({ ...prev, price: parseInt(e.target.value) || 0 }))}
                    placeholder="例: 8500000"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">展示場所</label>
                  <Input
                    value={newVehicle.location}
                    onChange={(e) => setNewVehicle(prev => ({ ...prev, location: e.target.value }))}
                    placeholder="例: 新車展示場 A-1"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">メモ</label>
                <textarea
                  value={newVehicle.notes}
                  onChange={(e) => setNewVehicle(prev => ({ ...prev, notes: e.target.value }))}
                  placeholder="備考やメモ"
                  rows={2}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
            <div className="flex justify-end gap-3 px-6 py-4 border-t bg-gray-50">
              <Button variant="outline" onClick={() => setShowAddModal(false)}>キャンセル</Button>
              <Button onClick={handleAddVehicle} disabled={!newVehicle.name || !newVehicle.model}>追加</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
