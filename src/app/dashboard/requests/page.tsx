'use client'

import { useState, useMemo, DragEvent } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Plus, Search, Clock, User, CheckCircle2, AlertCircle, GripVertical, X } from 'lucide-react'
import { useSettingsStore } from '@/stores/settings-store'

// 依頼のステータス
type RequestStatus = 'pending' | 'in_progress' | 'completed'

// 依頼の型
interface OfficeRequest {
  id: string
  title: string
  description: string
  requester: string // 依頼者
  assignee?: string // 担当者
  status: RequestStatus
  priority: 'high' | 'medium' | 'low'
  createdAt: string
  dueDate?: string
}

// ステージ定義
const REQUEST_STAGES: { status: RequestStatus; label: string; color: string; bgColor: string }[] = [
  { status: 'pending', label: '依頼中', color: 'text-orange-700', bgColor: 'bg-orange-50 border-orange-200' },
  { status: 'in_progress', label: '対応中', color: 'text-blue-700', bgColor: 'bg-blue-50 border-blue-200' },
  { status: 'completed', label: '完了', color: 'text-green-700', bgColor: 'bg-green-50 border-green-200' },
]

// 優先度の色
const PRIORITY_COLORS = {
  high: 'bg-red-100 text-red-700',
  medium: 'bg-amber-100 text-amber-700',
  low: 'bg-slate-100 text-slate-600',
}

const PRIORITY_LABELS = {
  high: '高',
  medium: '中',
  low: '低',
}

// サンプルデータ
const sampleRequests: OfficeRequest[] = [
  {
    id: '1',
    title: '見積書作成',
    description: '田中様向けの見積書を作成してください',
    requester: '目黒',
    assignee: '事務',
    status: 'pending',
    priority: 'high',
    createdAt: '2025-12-01T10:00:00Z',
    dueDate: '2025-12-03',
  },
  {
    id: '2',
    title: '契約書準備',
    description: '山田様の契約書類一式を準備',
    requester: '野島',
    assignee: '事務',
    status: 'in_progress',
    priority: 'medium',
    createdAt: '2025-12-02T14:00:00Z',
  },
  {
    id: '3',
    title: '納車書類確認',
    description: '鈴木様の納車書類を最終確認',
    requester: '田中',
    status: 'pending',
    priority: 'low',
    createdAt: '2025-12-02T16:00:00Z',
  },
  {
    id: '4',
    title: '顧客資料印刷',
    description: 'カタログとパンフレットを10部印刷',
    requester: '佐藤',
    assignee: '事務',
    status: 'completed',
    priority: 'low',
    createdAt: '2025-11-30T09:00:00Z',
  },
]

// 依頼カードコンポーネント
function RequestCard({
  request,
  onDragStart,
  isDragging
}: {
  request: OfficeRequest
  onDragStart: (e: DragEvent<HTMLDivElement>, request: OfficeRequest) => void
  isDragging: boolean
}) {
  return (
    <div
      draggable
      onDragStart={(e) => onDragStart(e, request)}
      className={`transition-all duration-150 ${isDragging ? 'opacity-50 scale-95' : ''}`}
    >
      <div className="mb-2.5 p-3 bg-white rounded-lg hover:shadow-md cursor-grab active:cursor-grabbing transition-shadow duration-150 border border-slate-200 hover:border-slate-300">
        {/* ヘッダー */}
        <div className="flex items-start justify-between mb-2">
          <span className="text-sm font-semibold text-slate-800">{request.title}</span>
          <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${PRIORITY_COLORS[request.priority]}`}>
            {PRIORITY_LABELS[request.priority]}
          </span>
        </div>

        {/* 説明 */}
        <p className="text-xs text-slate-500 mb-3 line-clamp-2">{request.description}</p>

        {/* フッター */}
        <div className="flex items-center justify-between text-[10px] text-slate-400 pt-2 border-t border-slate-100">
          <div className="flex items-center gap-1.5">
            <User className="h-3 w-3" />
            <span className="font-medium text-slate-500">{request.requester}</span>
          </div>
          {request.dueDate && (
            <div className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              <span>{new Date(request.dueDate).toLocaleDateString('ja-JP', { month: 'short', day: 'numeric' })}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ステータスに応じた色を取得
function getStatusColor(status: RequestStatus): string {
  switch (status) {
    case 'pending': return 'bg-amber-500'
    case 'in_progress': return 'bg-blue-500'
    case 'completed': return 'bg-emerald-500'
    default: return 'bg-slate-500'
  }
}

// カンバンカラムコンポーネント
function RequestColumn({
  stage,
  requests,
  onDragStart,
  onDragOver,
  onDrop,
  isDropTarget,
  draggingRequestId
}: {
  stage: typeof REQUEST_STAGES[0]
  requests: OfficeRequest[]
  onDragStart: (e: DragEvent<HTMLDivElement>, request: OfficeRequest) => void
  onDragOver: (e: DragEvent<HTMLDivElement>) => void
  onDrop: (e: DragEvent<HTMLDivElement>, status: RequestStatus) => void
  isDropTarget: boolean
  draggingRequestId: string | null
}) {
  return (
    <div className="flex-shrink-0 w-80">
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
          <span className="text-xs font-medium text-slate-400 bg-slate-200 px-1.5 py-0.5 rounded-full">{requests.length}</span>
        </div>

        {/* カード一覧 */}
        <div className="px-2 pb-3 overflow-y-auto" style={{ maxHeight: 'calc(100vh - 280px)' }}>
          {requests.map((request) => (
            <RequestCard
              key={request.id}
              request={request}
              onDragStart={onDragStart}
              isDragging={draggingRequestId === request.id}
            />
          ))}
          {/* 新規追加ボタン */}
          <button className="w-full px-3 py-2 text-sm text-slate-400 hover:text-slate-600 hover:bg-white rounded-lg flex items-center gap-1.5 transition-colors duration-150">
            <Plus className="h-4 w-4" />
            <span>依頼を追加</span>
          </button>
        </div>
      </div>
    </div>
  )
}

export default function RequestsPage() {
  const [requests, setRequests] = useState<OfficeRequest[]>(sampleRequests)
  const [searchQuery, setSearchQuery] = useState('')
  const [draggingRequest, setDraggingRequest] = useState<OfficeRequest | null>(null)
  const [dropTargetStatus, setDropTargetStatus] = useState<RequestStatus | null>(null)
  const [showAddModal, setShowAddModal] = useState(false)
  const [newRequest, setNewRequest] = useState({
    title: '',
    description: '',
    priority: 'medium' as 'high' | 'medium' | 'low',
    dueDate: '',
  })

  const { salesReps } = useSettingsStore()

  // 検索フィルター
  const filteredRequests = useMemo(() => {
    if (!searchQuery) return requests
    const query = searchQuery.toLowerCase()
    return requests.filter(r =>
      r.title.toLowerCase().includes(query) ||
      r.description.toLowerCase().includes(query) ||
      r.requester.toLowerCase().includes(query)
    )
  }, [requests, searchQuery])

  // ステータスごとに分類
  const requestsByStatus = useMemo(() => {
    const result: Record<RequestStatus, OfficeRequest[]> = {
      pending: [],
      in_progress: [],
      completed: [],
    }
    filteredRequests.forEach(request => {
      result[request.status].push(request)
    })
    return result
  }, [filteredRequests])

  // ドラッグ開始
  const handleDragStart = (e: DragEvent<HTMLDivElement>, request: OfficeRequest) => {
    setDraggingRequest(request)
    e.dataTransfer.effectAllowed = 'move'
  }

  // ドラッグオーバー
  const handleDragOver = (e: DragEvent<HTMLDivElement>, status: RequestStatus) => {
    e.preventDefault()
    if (draggingRequest && draggingRequest.status !== status) {
      setDropTargetStatus(status)
    }
  }

  // ドラッグ終了
  const handleDragEnd = () => {
    setDraggingRequest(null)
    setDropTargetStatus(null)
  }

  // ドロップ
  const handleDrop = (e: DragEvent<HTMLDivElement>, newStatus: RequestStatus) => {
    e.preventDefault()
    if (!draggingRequest || draggingRequest.status === newStatus) {
      handleDragEnd()
      return
    }

    setRequests(prev =>
      prev.map(r =>
        r.id === draggingRequest.id ? { ...r, status: newStatus } : r
      )
    )
    handleDragEnd()
  }

  // 依頼追加
  const handleAddRequest = () => {
    if (!newRequest.title) return

    const request: OfficeRequest = {
      id: Date.now().toString(),
      title: newRequest.title,
      description: newRequest.description,
      requester: salesReps[0]?.name || 'ユーザー',
      status: 'pending',
      priority: newRequest.priority,
      createdAt: new Date().toISOString(),
      dueDate: newRequest.dueDate || undefined,
    }

    setRequests(prev => [...prev, request])
    setNewRequest({ title: '', description: '', priority: 'medium', dueDate: '' })
    setShowAddModal(false)
  }

  return (
    <div className="h-full flex flex-col" onDragEnd={handleDragEnd}>
      {/* ヘッダー */}
      <div className="flex-shrink-0 px-6 py-4 bg-white border-b border-slate-200">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-800">事務所内依頼</h1>
            <p className="text-sm text-slate-500 mt-0.5">事務所への依頼をカンバン形式で管理</p>
          </div>
          <Button onClick={() => setShowAddModal(true)} className="bg-slate-800 hover:bg-slate-700">
            <Plus className="mr-2 h-4 w-4" />
            依頼を追加
          </Button>
        </div>

        {/* 検索 */}
        <div className="flex items-center space-x-2 max-w-md">
          <Search className="h-4 w-4 text-slate-400" />
          <Input
            placeholder="依頼を検索..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="flex-1 border-slate-200 focus:border-slate-400"
          />
        </div>
      </div>

      {/* カンバンボード */}
      <div className="flex-1 overflow-x-auto p-4 bg-slate-100/50">
        <div className="flex gap-3 h-full">
          {REQUEST_STAGES.map((stage) => (
            <RequestColumn
              key={stage.status}
              stage={stage}
              requests={requestsByStatus[stage.status]}
              onDragStart={handleDragStart}
              onDragOver={(e) => handleDragOver(e, stage.status)}
              onDrop={handleDrop}
              isDropTarget={dropTargetStatus === stage.status}
              draggingRequestId={draggingRequest?.id || null}
            />
          ))}
        </div>
      </div>

      {/* 依頼追加モーダル */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setShowAddModal(false)} />
          <div className="relative bg-white rounded-xl w-full max-w-md mx-4 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
              <h2 className="text-lg font-bold text-slate-800">新規依頼</h2>
              <button onClick={() => setShowAddModal(false)} className="text-slate-400 hover:text-slate-600 transition-colors">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">タイトル</label>
                <Input
                  value={newRequest.title}
                  onChange={(e) => setNewRequest(prev => ({ ...prev, title: e.target.value }))}
                  placeholder="依頼のタイトル"
                  className="border-slate-200"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">説明</label>
                <textarea
                  value={newRequest.description}
                  onChange={(e) => setNewRequest(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="依頼の詳細"
                  rows={3}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-400 focus:border-transparent transition-all"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">優先度</label>
                  <select
                    value={newRequest.priority}
                    onChange={(e) => setNewRequest(prev => ({ ...prev, priority: e.target.value as any }))}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-400 focus:border-transparent transition-all"
                  >
                    <option value="low">低</option>
                    <option value="medium">中</option>
                    <option value="high">高</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">期日</label>
                  <Input
                    type="date"
                    value={newRequest.dueDate}
                    onChange={(e) => setNewRequest(prev => ({ ...prev, dueDate: e.target.value }))}
                    className="border-slate-200"
                  />
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-3 px-6 py-4 border-t border-slate-100 bg-slate-50 rounded-b-xl">
              <Button variant="outline" onClick={() => setShowAddModal(false)} className="border-slate-300 text-slate-700 hover:bg-slate-100">キャンセル</Button>
              <Button onClick={handleAddRequest} disabled={!newRequest.title} className="bg-slate-800 hover:bg-slate-700">追加</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
