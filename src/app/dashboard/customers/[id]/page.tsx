'use client'

import { useState, useMemo, useRef, useEffect, KeyboardEvent } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import {
  ArrowLeft,
  Phone,
  Mail,
  MapPin,
  Calendar,
  User,
  Building,
  Edit2,
  Save,
  X,
  Plus,
  MessageSquare,
  PhoneCall,
  Send,
  Users,
  Clock,
  FileText,
  ChevronDown,
  ChevronRight,
  Check,
  Car,
  Wallet,
  CalendarClock,
  GripVertical,
  Trash2,
  MoreHorizontal,
  Type,
  List,
  CheckSquare,
  Heading1,
  Heading2,
  Quote,
  Code,
  AlertCircle,
  Hash,
  Smile,
  MessageCircle,
  Star,
  MoreVertical,
  Copy,
  Link2,
  ExternalLink,
  Bell,
  Bot,
  Sparkles,
  CheckCircle2,
  ChevronUp,
  Loader2,
  Mic,
  MicOff,
  Square,
  Volume2,
  Bold,
  Italic,
  Underline,
  Strikethrough,
  Highlighter,
  ALargeSmall,
  Eye,
  Key,
  Lightbulb,
  Sofa
} from 'lucide-react'
import Link from 'next/link'
import api from '@/lib/api'
import { Customer, CustomerStatus, Activity, ActivityType, PaymentMethod } from '@/types'
import { mockCustomers, mockActivities } from '@/lib/mock-data'
import { useSettingsStore } from '@/stores/settings-store'
import { useContactStore, ContactType, ContactRecord, ChatMessage } from '@/stores/contact-store'
import { useCustomerStore } from '@/stores/customer-store'
import { useSalesTargetStore } from '@/stores/sales-target-store'
import { useEstimateStore } from '@/stores/estimate-store'

// Notionカラーパレット
const NOTION_COLORS = {
  default: '#37352f',
  gray: '#787774',
  brown: '#9f6b53',
  orange: '#d9730d',
  yellow: '#cb912f',
  green: '#448361',
  blue: '#337ea9',
  purple: '#9065b0',
  pink: '#c14c8a',
  red: '#d44c47',
}

// ステータス定義（ランク分け）
const STATUS_OPTIONS: { status: CustomerStatus; label: string; color: string; bgColor: string }[] = [
  { status: CustomerStatus.NEW, label: '新規', color: 'text-[#337ea9]', bgColor: 'bg-[#d3e5ef]' },
  { status: CustomerStatus.OWNER, label: 'オーナー', color: 'text-[#448361]', bgColor: 'bg-[#dbeddb]' },
  { status: CustomerStatus.AWAITING_DELIVERY, label: '納車待ち', color: 'text-[#0e7c8f]', bgColor: 'bg-[#d0f0f5]' },
  { status: CustomerStatus.CONTRACT, label: '契約！', color: 'text-[#2d9670]', bgColor: 'bg-[#c6f0df]' },
  { status: CustomerStatus.RANK_A, label: 'ランクA', color: 'text-[#c14c8a]', bgColor: 'bg-[#f5d0e3]' },
  { status: CustomerStatus.RANK_B, label: 'ランクB', color: 'text-[#9065b0]', bgColor: 'bg-[#e8deee]' },
  { status: CustomerStatus.RANK_C, label: 'ランクC', color: 'text-[#d9730d]', bgColor: 'bg-[#fadec9]' },
  { status: CustomerStatus.RANK_N, label: 'ランクN', color: 'text-[#787774]', bgColor: 'bg-[#e3e2e0]' },
]

// ブロックタイプ定義
type BlockType = 'text' | 'heading1' | 'heading2' | 'heading3' | 'bullet' | 'numbered' | 'todo' | 'quote' | 'callout' | 'divider' | 'call_log' | 'email_log'

interface Block {
  id: string
  type: BlockType
  content: string
  checked?: boolean // todoの場合
  callDuration?: number // 電話記録の場合
  emailSubject?: string // メール記録の場合
  createdAt: string
  createdBy?: string
}

// キーポイント型定義
interface Keypoint {
  id: string
  content: string
  category: 'hobby' | 'family' | 'preference' | 'concern' | 'other'
  createdAt: string
}

const KEYPOINT_CATEGORIES: { value: Keypoint['category']; label: string; icon: string }[] = [
  { value: 'hobby', label: '趣味・好み', icon: '🎯' },
  { value: 'family', label: '家族構成', icon: '👨‍👩‍👧‍👦' },
  { value: 'preference', label: 'こだわり', icon: '💡' },
  { value: 'concern', label: '懸念点', icon: '⚠️' },
  { value: 'other', label: 'その他', icon: '📝' },
]

// ブロックタイプメニュー
const BLOCK_TYPES: { type: BlockType; label: string; icon: React.ReactNode; shortcut?: string }[] = [
  { type: 'text', label: 'テキスト', icon: <Type className="h-4 w-4" />, shortcut: 'テキスト' },
  { type: 'heading1', label: '見出し1', icon: <Heading1 className="h-4 w-4" />, shortcut: '# ' },
  { type: 'heading2', label: '見出し2', icon: <Heading2 className="h-4 w-4" />, shortcut: '## ' },
  { type: 'bullet', label: '箇条書き', icon: <List className="h-4 w-4" />, shortcut: '- ' },
  { type: 'todo', label: 'ToDoリスト', icon: <CheckSquare className="h-4 w-4" />, shortcut: '[] ' },
  { type: 'quote', label: '引用', icon: <Quote className="h-4 w-4" />, shortcut: '> ' },
  { type: 'callout', label: 'コールアウト', icon: <AlertCircle className="h-4 w-4" /> },
  { type: 'call_log', label: '電話記録', icon: <PhoneCall className="h-4 w-4" /> },
  { type: 'email_log', label: 'メール記録', icon: <Mail className="h-4 w-4" /> },
]

// 活動タイプのアイコン
const ActivityIcon = ({ type }: { type: ActivityType }) => {
  switch (type) {
    case ActivityType.NOTE:
      return <FileText className="h-4 w-4 text-gray-500" />
    case ActivityType.CALL:
      return <PhoneCall className="h-4 w-4 text-green-500" />
    case ActivityType.EMAIL:
      return <Mail className="h-4 w-4 text-blue-500" />
    case ActivityType.MEETING:
      return <Users className="h-4 w-4 text-purple-500" />
    case ActivityType.STATUS_CHANGE:
      return <Check className="h-4 w-4 text-orange-500" />
    default:
      return <MessageSquare className="h-4 w-4 text-gray-500" />
  }
}

// 通話時間のフォーマット
const formatDuration = (seconds: number) => {
  const mins = Math.floor(seconds / 60)
  const secs = seconds % 60
  return `${mins}分${secs}秒`
}

// ブロックコンテキストメニューコンポーネント（Notion風）
function BlockContextMenu({
  position,
  currentType,
  onChangeType,
  onDelete,
  onDuplicate,
  onClose
}: {
  position: { top: number; left: number }
  currentType: BlockType
  onChangeType: (type: BlockType) => void
  onDelete: () => void
  onDuplicate: () => void
  onClose: () => void
}) {
  const menuRef = useRef<HTMLDivElement>(null)
  const [showTypeSubmenu, setShowTypeSubmenu] = useState(false)

  // 外側クリックで閉じる
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose()
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [onClose])

  // Escapeで閉じる
  useEffect(() => {
    const handleKeyDown = (e: globalThis.KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [onClose])

  const blockTypeLabel = {
    text: 'テキスト',
    heading1: '見出し1',
    heading2: '見出し2',
    heading3: '見出し3',
    bullet: '箇条書きリスト',
    numbered: '番号付きリスト',
    todo: 'ToDoリスト',
    quote: '引用',
    callout: 'コールアウト',
    divider: '区切り線',
    call_log: '電話記録',
    email_log: 'メール記録',
  }

  return (
    <div
      ref={menuRef}
      className="fixed z-[100] bg-white rounded-lg shadow-xl border border-gray-200 py-2 w-64"
      style={{ top: position.top, left: position.left }}
    >
      {/* 検索ボックス */}
      <div className="px-2 pb-2">
        <input
          type="text"
          placeholder="アクションを検索..."
          className="w-full px-3 py-1.5 text-sm border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          autoFocus
        />
      </div>

      {/* 現在のブロックタイプ表示 */}
      <div className="px-3 py-1 text-xs text-gray-500 font-medium">
        {blockTypeLabel[currentType] || 'テキスト'}
      </div>

      {/* メニュー項目 */}
      <div className="py-1">
        {/* ブロックタイプの変換 */}
        <div
          className="relative"
          onMouseEnter={() => setShowTypeSubmenu(true)}
          onMouseLeave={() => setShowTypeSubmenu(false)}
        >
          <button
            className="w-full flex items-center justify-between px-3 py-1.5 hover:bg-gray-100 text-sm text-gray-700"
          >
            <div className="flex items-center gap-3">
              <span className="text-gray-400">↻</span>
              <span>ブロックタイプの変換</span>
            </div>
            <ChevronRight className="h-4 w-4 text-gray-400" />
          </button>

          {/* サブメニュー */}
          {showTypeSubmenu && (
            <div className="absolute left-full top-0 ml-1 bg-white rounded-lg shadow-xl border border-gray-200 py-2 w-56">
              <div className="px-3 py-1 text-xs text-gray-500 font-medium">ブロックタイプ</div>
              <button
                onClick={() => { onChangeType('text'); onClose() }}
                className="w-full flex items-center gap-3 px-3 py-1.5 hover:bg-gray-100 text-sm text-gray-700"
              >
                <Type className="h-4 w-4 text-gray-500" />
                <span>テキスト</span>
              </button>
              <button
                onClick={() => { onChangeType('heading1'); onClose() }}
                className="w-full flex items-center gap-3 px-3 py-1.5 hover:bg-gray-100 text-sm text-gray-700"
              >
                <Heading1 className="h-4 w-4 text-gray-500" />
                <span>見出し1</span>
              </button>
              <button
                onClick={() => { onChangeType('heading2'); onClose() }}
                className="w-full flex items-center gap-3 px-3 py-1.5 hover:bg-gray-100 text-sm text-gray-700"
              >
                <Heading2 className="h-4 w-4 text-gray-500" />
                <span>見出し2</span>
              </button>
              <div className="border-t border-gray-100 my-1" />
              <button
                onClick={() => { onChangeType('bullet'); onClose() }}
                className="w-full flex items-center gap-3 px-3 py-1.5 hover:bg-gray-100 text-sm text-gray-700"
              >
                <List className="h-4 w-4 text-gray-500" />
                <span>箇条書きリスト</span>
              </button>
              <button
                onClick={() => { onChangeType('todo'); onClose() }}
                className="w-full flex items-center gap-3 px-3 py-1.5 hover:bg-gray-100 text-sm text-gray-700"
              >
                <CheckSquare className="h-4 w-4 text-gray-500" />
                <span>ToDoリスト</span>
              </button>
              <div className="border-t border-gray-100 my-1" />
              <button
                onClick={() => { onChangeType('quote'); onClose() }}
                className="w-full flex items-center gap-3 px-3 py-1.5 hover:bg-gray-100 text-sm text-gray-700"
              >
                <Quote className="h-4 w-4 text-gray-500" />
                <span>引用</span>
              </button>
              <button
                onClick={() => { onChangeType('callout'); onClose() }}
                className="w-full flex items-center gap-3 px-3 py-1.5 hover:bg-gray-100 text-sm text-gray-700"
              >
                <AlertCircle className="h-4 w-4 text-gray-500" />
                <span>コールアウト</span>
              </button>
            </div>
          )}
        </div>

        <div className="border-t border-gray-100 my-1" />

        {/* 複製 */}
        <button
          onClick={() => { onDuplicate(); onClose() }}
          className="w-full flex items-center justify-between px-3 py-1.5 hover:bg-gray-100 text-sm text-gray-700"
        >
          <div className="flex items-center gap-3">
            <Copy className="h-4 w-4 text-gray-400" />
            <span>複製</span>
          </div>
          <span className="text-xs text-gray-400">⌘D</span>
        </button>

        {/* 削除 */}
        <button
          onClick={() => { onDelete(); onClose() }}
          className="w-full flex items-center justify-between px-3 py-1.5 hover:bg-gray-100 text-sm text-red-600"
        >
          <div className="flex items-center gap-3">
            <Trash2 className="h-4 w-4" />
            <span>削除</span>
          </div>
          <span className="text-xs text-gray-400">Del</span>
        </button>
      </div>
    </div>
  )
}

// ブロックコンポーネント（Notion風）
function NotionBlock({
  block,
  onUpdate,
  onDelete,
  onAddBelow,
  onDuplicate,
  onKeyDown,
  isActive,
  onFocus
}: {
  block: Block
  onUpdate: (id: string, updates: Partial<Block>) => void
  onDelete: (id: string) => void
  onAddBelow: (id: string) => void
  onDuplicate: (id: string) => void
  onKeyDown: (id: string, e: KeyboardEvent<HTMLTextAreaElement | HTMLInputElement>) => void
  isActive: boolean
  onFocus: (id: string) => void
}) {
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const [showHoverMenu, setShowHoverMenu] = useState(false)
  const [showContextMenu, setShowContextMenu] = useState(false)
  const [contextMenuPosition, setContextMenuPosition] = useState({ top: 0, left: 0 })

  // テキストエリアの高さを自動調整
  const adjustHeight = () => {
    if (inputRef.current) {
      inputRef.current.style.height = 'auto'
      inputRef.current.style.height = `${Math.max(24, inputRef.current.scrollHeight)}px`
    }
  }

  useEffect(() => {
    if (isActive && inputRef.current) {
      inputRef.current.focus()
      // カーソルを末尾に移動
      const len = inputRef.current.value.length
      inputRef.current.setSelectionRange(len, len)
    }
  }, [isActive])

  // コンテンツ変更時に高さ調整
  useEffect(() => {
    adjustHeight()
  }, [block.content])

  // 6ドットメニューをクリックしたときにコンテキストメニューを表示
  const handleMenuClick = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
    setContextMenuPosition({
      top: rect.bottom + 4,
      left: rect.left
    })
    setShowContextMenu(true)
  }

  // ブロックタイプ変更
  const handleChangeType = (newType: BlockType) => {
    onUpdate(block.id, { type: newType })
    setShowContextMenu(false)
  }

  const handleChange = (value: string) => {
    // ショートカット検出
    if (block.type === 'text') {
      if (value.startsWith('# ')) {
        onUpdate(block.id, { type: 'heading1', content: value.slice(2) })
        return
      }
      if (value.startsWith('## ')) {
        onUpdate(block.id, { type: 'heading2', content: value.slice(3) })
        return
      }
      if (value.startsWith('### ')) {
        onUpdate(block.id, { type: 'heading3', content: value.slice(4) })
        return
      }
      if (value.startsWith('- ') || value.startsWith('* ')) {
        onUpdate(block.id, { type: 'bullet', content: value.slice(2) })
        return
      }
      if (value.startsWith('[] ') || value.startsWith('[ ] ')) {
        onUpdate(block.id, { type: 'todo', content: value.replace(/^\[\]?\s*/, ''), checked: false })
        return
      }
      if (value.startsWith('> ')) {
        onUpdate(block.id, { type: 'quote', content: value.slice(2) })
        return
      }
      if (value === '---') {
        onUpdate(block.id, { type: 'divider', content: '' })
        return
      }
    }
    onUpdate(block.id, { content: value })
  }

  // Notion風のブロックスタイル
  const getBlockStyle = () => {
    switch (block.type) {
      case 'heading1':
        return 'text-[1.875rem] font-semibold text-[#37352f] leading-tight tracking-tight'
      case 'heading2':
        return 'text-[1.5rem] font-semibold text-[#37352f] leading-tight tracking-tight'
      case 'heading3':
        return 'text-[1.25rem] font-semibold text-[#37352f] leading-tight'
      case 'quote':
        return 'border-l-[3px] border-[#37352f] pl-[14px] text-[#37352f]'
      case 'callout':
        return 'bg-[#f1f1ef] rounded-[3px] p-4'
      case 'call_log':
        return 'bg-[#dbeddb] rounded-[3px] p-4'
      case 'email_log':
        return 'bg-[#d3e5ef] rounded-[3px] p-4'
      default:
        return 'text-[#37352f]'
    }
  }

  // Notion風の基本テキストスタイル
  const baseTextStyle = "font-[-apple-system,BlinkMacSystemFont,'Segoe_UI',Helvetica,Arial,sans-serif] text-[15px] leading-[1.5]"

  return (
    <div
      className="group relative flex items-start py-[3px] transition-colors"
      data-block-id={block.id}
      onMouseEnter={() => setShowHoverMenu(true)}
      onMouseLeave={() => setShowHoverMenu(false)}
    >
      {/* Notion風ドラッグハンドル & 追加ボタン（左側に配置） */}
      <div
        className={`absolute -left-[52px] flex items-center gap-0.5 pt-[3px] ${showHoverMenu ? 'opacity-100' : 'opacity-0'} transition-opacity duration-100`}
        style={{ zIndex: 10 }}
      >
        <button
          className="p-[2px] hover:bg-[#ebebea] rounded-[3px] transition-colors"
          onClick={() => onAddBelow(block.id)}
        >
          <Plus className="h-[18px] w-[18px] text-[#9b9a97]" />
        </button>
        <button
          className="p-[2px] hover:bg-[#ebebea] rounded-[3px] cursor-pointer transition-colors"
          onClick={handleMenuClick}
        >
          <GripVertical className="h-[18px] w-[18px] text-[#9b9a97]" />
        </button>
      </div>

      {/* コンテキストメニュー */}
      {showContextMenu && (
        <BlockContextMenu
          position={contextMenuPosition}
          currentType={block.type}
          onChangeType={handleChangeType}
          onDelete={() => onDelete(block.id)}
          onDuplicate={() => onDuplicate(block.id)}
          onClose={() => setShowContextMenu(false)}
        />
      )}

      {/* ブロックコンテンツ */}
      <div className="flex-1 min-w-0">
        {block.type === 'todo' ? (
          <div className="flex items-start gap-[8px]">
            <div className="flex items-center h-[24px]">
              <input
                type="checkbox"
                checked={block.checked || false}
                onChange={(e) => onUpdate(block.id, { checked: e.target.checked })}
                className="h-[16px] w-[16px] rounded-[3px] border-[2px] border-[#37352f]/30 text-[#2eaadc] focus:ring-[#2eaadc] focus:ring-offset-0 cursor-pointer transition-colors"
              />
            </div>
            <textarea
              ref={inputRef}
              value={block.content}
              onChange={(e) => handleChange(e.target.value)}
              onInput={adjustHeight}
              onKeyDown={(e) => onKeyDown(block.id, e)}
              onFocus={() => onFocus(block.id)}
              placeholder="やることを入力..."
              className={`flex-1 resize-none border-0 bg-transparent p-0 focus:ring-0 focus:outline-none overflow-hidden ${baseTextStyle} placeholder:text-[#9b9a97] ${block.checked ? 'line-through text-[#9b9a97]' : 'text-[#37352f]'}`}
              rows={1}
              style={{ minHeight: '24px' }}
            />
          </div>
        ) : block.type === 'bullet' ? (
          <div className="flex items-start gap-[8px]">
            <div className="flex items-center h-[24px]">
              <span className="text-[#37352f] text-[1.5em] leading-none">•</span>
            </div>
            <textarea
              ref={inputRef}
              value={block.content}
              onChange={(e) => handleChange(e.target.value)}
              onInput={adjustHeight}
              onKeyDown={(e) => onKeyDown(block.id, e)}
              onFocus={() => onFocus(block.id)}
              placeholder="リスト"
              className={`flex-1 resize-none border-0 bg-transparent p-0 focus:ring-0 focus:outline-none overflow-hidden ${baseTextStyle} text-[#37352f] placeholder:text-[#9b9a97]`}
              rows={1}
              style={{ minHeight: '24px' }}
            />
          </div>
        ) : block.type === 'call_log' ? (
          <div className={getBlockStyle()}>
            <div className="flex items-center gap-[8px] mb-[8px]">
              <div className="flex items-center justify-center w-[22px] h-[22px] rounded-[3px] bg-[#448361]/20">
                <PhoneCall className="h-[14px] w-[14px] text-[#448361]" />
              </div>
              <span className="text-[14px] font-medium text-[#448361]">電話記録</span>
              {block.callDuration && (
                <span className="text-[12px] text-[#448361]/80">({formatDuration(block.callDuration)})</span>
              )}
              <span className="text-[12px] text-[#9b9a97] ml-auto">
                {new Date(block.createdAt).toLocaleString('ja-JP')}
              </span>
            </div>
            <textarea
              ref={inputRef}
              value={block.content}
              onChange={(e) => handleChange(e.target.value)}
              onInput={adjustHeight}
              onKeyDown={(e) => onKeyDown(block.id, e)}
              onFocus={() => onFocus(block.id)}
              placeholder="通話内容をメモ..."
              className={`w-full resize-none border-0 bg-transparent p-0 focus:ring-0 focus:outline-none overflow-hidden ${baseTextStyle} text-[#37352f] placeholder:text-[#9b9a97]`}
              rows={1}
              style={{ minHeight: '24px' }}
            />
          </div>
        ) : block.type === 'email_log' ? (
          <div className={getBlockStyle()}>
            <div className="flex items-center gap-[8px] mb-[8px]">
              <div className="flex items-center justify-center w-[22px] h-[22px] rounded-[3px] bg-[#337ea9]/20">
                <Mail className="h-[14px] w-[14px] text-[#337ea9]" />
              </div>
              <span className="text-[14px] font-medium text-[#337ea9]">メール記録</span>
              <span className="text-[12px] text-[#9b9a97] ml-auto">
                {new Date(block.createdAt).toLocaleString('ja-JP')}
              </span>
            </div>
            {block.emailSubject && (
              <div className="text-[13px] text-[#337ea9] mb-[4px]">件名: {block.emailSubject}</div>
            )}
            <textarea
              ref={inputRef}
              value={block.content}
              onChange={(e) => handleChange(e.target.value)}
              onInput={adjustHeight}
              onKeyDown={(e) => onKeyDown(block.id, e)}
              onFocus={() => onFocus(block.id)}
              placeholder="メール内容をメモ..."
              className={`w-full resize-none border-0 bg-transparent p-0 focus:ring-0 focus:outline-none overflow-hidden ${baseTextStyle} text-[#37352f] placeholder:text-[#9b9a97]`}
              rows={1}
              style={{ minHeight: '24px' }}
            />
          </div>
        ) : block.type === 'callout' ? (
          <div className={getBlockStyle()}>
            <div className="flex items-start gap-[8px]">
              <div className="flex items-center justify-center w-[24px] h-[24px] text-[18px]">
                💡
              </div>
              <textarea
                ref={inputRef}
                value={block.content}
                onChange={(e) => handleChange(e.target.value)}
                onInput={adjustHeight}
                onKeyDown={(e) => onKeyDown(block.id, e)}
                onFocus={() => onFocus(block.id)}
                placeholder="コールアウト"
                className={`flex-1 resize-none border-0 bg-transparent p-0 focus:ring-0 focus:outline-none overflow-hidden ${baseTextStyle} text-[#37352f] placeholder:text-[#9b9a97]`}
                rows={1}
                style={{ minHeight: '24px' }}
              />
            </div>
          </div>
        ) : block.type === 'quote' ? (
          <div className={getBlockStyle()}>
            <textarea
              ref={inputRef}
              value={block.content}
              onChange={(e) => handleChange(e.target.value)}
              onInput={adjustHeight}
              onKeyDown={(e) => onKeyDown(block.id, e)}
              onFocus={() => onFocus(block.id)}
              placeholder="引用"
              className={`w-full resize-none border-0 bg-transparent p-0 focus:ring-0 focus:outline-none overflow-hidden ${baseTextStyle} text-[#37352f] placeholder:text-[#9b9a97]`}
              rows={1}
              style={{ minHeight: '24px' }}
            />
          </div>
        ) : block.type === 'divider' ? (
          <div className="py-[8px]">
            <hr className="border-0 h-[1px] bg-[#e3e2e0]" />
          </div>
        ) : (
          <textarea
            ref={inputRef}
            value={block.content}
            onChange={(e) => handleChange(e.target.value)}
            onInput={adjustHeight}
            onKeyDown={(e) => onKeyDown(block.id, e)}
            onFocus={() => onFocus(block.id)}
            placeholder={
              block.type === 'heading1' ? '見出し1' :
              block.type === 'heading2' ? '見出し2' :
              block.type === 'heading3' ? '見出し3' :
              "「/」でコマンドを入力..."
            }
            className={`w-full resize-none border-0 bg-transparent p-0 focus:ring-0 focus:outline-none overflow-hidden ${baseTextStyle} ${getBlockStyle()} placeholder:text-[#9b9a97]`}
            rows={1}
            style={{ minHeight: '24px' }}
          />
        )}
      </div>
    </div>
  )
}

export default function CustomerDetailPage() {
  const params = useParams()
  const router = useRouter()
  const queryClient = useQueryClient()
  const customerId = params.id as string

  const [isEditing, setIsEditing] = useState(false)
  const [editedCustomer, setEditedCustomer] = useState<Customer | null>(null)
  const [showStatusDropdown, setShowStatusDropdown] = useState(false)
  const [showVehicleDropdown, setShowVehicleDropdown] = useState(false)
  const [showSalesRepDropdown, setShowSalesRepDropdown] = useState(false)
  const [localInterestedCars, setLocalInterestedCars] = useState<string[] | null>(null)
  const [localSalesRep, setLocalSalesRep] = useState<{ name: string; color: string } | null>(null)
  // 編集可能なフィールド
  const [editingBudget, setEditingBudget] = useState(false)
  const [localBudget, setLocalBudget] = useState<string>('')
  const [editingDesiredVehicleType, setEditingDesiredVehicleType] = useState(false)
  const [localDesiredVehicleType, setLocalDesiredVehicleType] = useState<string>('')
  const [editingPurchaseTiming, setEditingPurchaseTiming] = useState(false)
  const [localPurchaseTiming, setLocalPurchaseTiming] = useState<string>('')
  const { vehicleModels, salesReps } = useSettingsStore()
  const [activeBlockId, setActiveBlockId] = useState<string | null>(null)
  const [showBlockMenu, setShowBlockMenu] = useState(false)
  const [blockMenuPosition, setBlockMenuPosition] = useState({ top: 0, left: 0 })

  // Notionスタイルのブロック
  const [blocks, setBlocks] = useState<Block[]>([])

  // メール作成モーダル
  const [showEmailModal, setShowEmailModal] = useState(false)
  const [emailSubject, setEmailSubject] = useState('')
  const [emailBody, setEmailBody] = useState('')
  const [isSendingEmail, setIsSendingEmail] = useState(false)

  // 電話記録モーダル
  const [showCallModal, setShowCallModal] = useState(false)
  const [callDuration, setCallDuration] = useState({ mins: 0, secs: 0 })
  const [callContent, setCallContent] = useState('')

  // チャットパネル
  const [showChatPanel, setShowChatPanel] = useState(false)
  const [chatMessage, setChatMessage] = useState('')
  const chatContainerRef = useRef<HTMLDivElement>(null)

  // 連絡履歴ストア
  const {
    addContactRecord,
    getContactRecordsByCustomer,
    addChatMessage,
    getChatMessagesByCustomer,
    getLastContactDate,
  } = useContactStore()

  // 顧客ストア
  const { updateCustomerStatus, updateCustomer } = useCustomerStore()

  // 営業目標ストア
  const { addContract } = useSalesTargetStore()

  // 契約モーダル
  const [showContractModal, setShowContractModal] = useState(false)
  const [contractAmount, setContractAmount] = useState('')
  const [contractProfit, setContractProfit] = useState('')
  const [contractVehicle, setContractVehicle] = useState('')
  const [expectedDeliveryDate, setExpectedDeliveryDate] = useState('')
  // 入金予定日（3回分）
  const [paymentDate1, setPaymentDate1] = useState('')
  const [paymentAmount1, setPaymentAmount1] = useState('')
  const [paymentDate2, setPaymentDate2] = useState('')
  const [paymentAmount2, setPaymentAmount2] = useState('')
  const [paymentDate3, setPaymentDate3] = useState('')
  const [paymentAmount3, setPaymentAmount3] = useState('')
  // 残金支払方法と見積もり選択
  const [remainingPaymentMethod, setRemainingPaymentMethod] = useState<'cash' | 'loan' | ''>('')
  const [selectedEstimateId, setSelectedEstimateId] = useState('')
  // 家具変更有無
  const [hasFurnitureChange, setHasFurnitureChange] = useState<'yes' | 'no' | ''>('')

  // 連絡履歴データ
  const contactRecords = getContactRecordsByCustomer(customerId)
  const chatMessages = getChatMessagesByCustomer(customerId)
  const storeLastContactDate = getLastContactDate(customerId)

  // 見積もりストア
  const { estimates } = useEstimateStore()

  // キーポイント機能
  const [keypoints, setKeypoints] = useState<Keypoint[]>([
    { id: '1', content: 'キャンプが趣味で、毎月2回は家族でキャンプに行く', category: 'hobby', createdAt: '2024-02-15T10:00:00Z' },
    { id: '2', content: '奥さんと小学生の子供2人の4人家族', category: 'family', createdAt: '2024-02-10T14:30:00Z' },
  ])
  const [showKeypointsExpanded, setShowKeypointsExpanded] = useState(false)
  const [showAddKeypoint, setShowAddKeypoint] = useState(false)
  const [newKeypointContent, setNewKeypointContent] = useState('')
  const [newKeypointCategory, setNewKeypointCategory] = useState<Keypoint['category']>('other')

  // 録音・文字起こし機能
  const [isRecording, setIsRecording] = useState(false)
  const [recordingTime, setRecordingTime] = useState(0)
  const [transcript, setTranscript] = useState('')
  const [interimTranscript, setInterimTranscript] = useState('')
  const [speechSupported, setSpeechSupported] = useState(true)
  const recognitionRef = useRef<SpeechRecognition | null>(null)
  const recordingTimerRef = useRef<NodeJS.Timeout | null>(null)

  // Web Speech API の初期化チェック
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
      if (!SpeechRecognition) {
        setSpeechSupported(false)
      }
    }
  }, [])

  // 金額フォーマット
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('ja-JP', {
      style: 'currency',
      currency: 'JPY',
      minimumFractionDigits: 0,
    }).format(amount)
  }

  // 日付フォーマット
  const formatEstimateDate = (dateStr: string) => {
    const date = new Date(dateStr)
    return `${date.getFullYear()}/${date.getMonth() + 1}/${date.getDate()}`
  }

  // キーポイント追加
  const addKeypoint = () => {
    if (!newKeypointContent.trim()) return
    const newKeypoint: Keypoint = {
      id: Date.now().toString(),
      content: newKeypointContent.trim(),
      category: newKeypointCategory,
      createdAt: new Date().toISOString(),
    }
    setKeypoints(prev => [newKeypoint, ...prev])
    setNewKeypointContent('')
    setNewKeypointCategory('other')
    setShowAddKeypoint(false)
  }

  // キーポイント削除
  const deleteKeypoint = (id: string) => {
    setKeypoints(prev => prev.filter(k => k.id !== id))
  }

  // 録音開始
  const startRecording = () => {
    if (typeof window === 'undefined') return

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
    if (!SpeechRecognition) {
      alert('お使いのブラウザは音声認識に対応していません。Chrome または Edge をお使いください。')
      return
    }

    const recognition = new SpeechRecognition()
    recognition.lang = 'ja-JP'
    recognition.continuous = true
    recognition.interimResults = true

    recognition.onstart = () => {
      setIsRecording(true)
      setRecordingTime(0)
      // 録音タイマー開始
      recordingTimerRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1)
      }, 1000)
    }

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      let finalText = ''
      let interimText = ''

      for (let i = 0; i < event.results.length; i++) {
        const result = event.results[i]
        if (result.isFinal) {
          finalText += result[0].transcript
        } else {
          interimText += result[0].transcript
        }
      }

      if (finalText) {
        setTranscript(prev => prev + (prev ? '\n' : '') + finalText)
        setCallContent(prev => prev + (prev ? '\n' : '') + finalText)
      }
      setInterimTranscript(interimText)
    }

    recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      console.error('Speech recognition error:', event.error)
      if (event.error === 'not-allowed') {
        alert('マイクへのアクセスが拒否されました。ブラウザの設定でマイクを許可してください。')
      }
      stopRecording()
    }

    recognition.onend = () => {
      // continuous モードでも途中で終了することがあるので、録音中なら再開
      if (isRecording && recognitionRef.current) {
        try {
          recognitionRef.current.start()
        } catch (e) {
          // Already started エラーを無視
        }
      }
    }

    recognitionRef.current = recognition
    recognition.start()
  }

  // 録音停止
  const stopRecording = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop()
      recognitionRef.current = null
    }
    if (recordingTimerRef.current) {
      clearInterval(recordingTimerRef.current)
      recordingTimerRef.current = null
    }
    setIsRecording(false)
    setInterimTranscript('')
    // 録音時間を通話時間にセット
    const mins = Math.floor(recordingTime / 60)
    const secs = recordingTime % 60
    setCallDuration({ mins, secs })
  }

  // モーダルを閉じるときに録音も停止
  const handleCloseCallModal = () => {
    stopRecording()
    setShowCallModal(false)
    setTranscript('')
    setRecordingTime(0)
  }

  // 簡易連絡記録モーダル
  const [showQuickContactModal, setShowQuickContactModal] = useState(false)
  const [quickContactResult, setQuickContactResult] = useState<'good' | 'neutral' | 'bad' | ''>('')
  const [quickContactNote, setQuickContactNote] = useState('')

  // AIエージェントチャット
  const [showAIChat, setShowAIChat] = useState(false)
  const [aiMessages, setAiMessages] = useState<{ role: 'user' | 'assistant'; content: string }[]>([])
  const [aiInput, setAiInput] = useState('')
  const [isAiLoading, setIsAiLoading] = useState(false)

  // 最終連絡日（ブロックから計算）
  const lastContactDate = useMemo(() => {
    const contactBlocks = blocks.filter(b => b.type === 'call_log' || b.type === 'email_log')
    if (contactBlocks.length === 0) return null
    const sorted = contactBlocks.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    return new Date(sorted[0].createdAt)
  }, [blocks])

  // 2ヶ月以上連絡なしかチェック
  const needsFollowUp = useMemo(() => {
    if (!lastContactDate) return true // 連絡履歴なしは要フォロー
    const twoMonthsAgo = new Date()
    twoMonthsAgo.setMonth(twoMonthsAgo.getMonth() - 2)
    return lastContactDate < twoMonthsAgo
  }, [lastContactDate])

  // 次回連絡推奨日
  const nextContactDate = useMemo(() => {
    if (!lastContactDate) return new Date()
    const next = new Date(lastContactDate)
    next.setMonth(next.getMonth() + 2)
    return next
  }, [lastContactDate])

  // customer-storeから顧客を取得（新規作成された顧客用）
  const { getCustomer } = useCustomerStore()

  // 顧客データ取得
  const { data: customer, isLoading } = useQuery<Customer>({
    queryKey: ['customer', customerId],
    queryFn: async () => {
      // まずcustomer-storeから取得を試みる（見積もりから作成された新規顧客用）
      const storeCustomer = getCustomer(customerId)
      if (storeCustomer) return storeCustomer

      try {
        const response = await api.get(`/customers/${customerId}`)
        return response.data
      } catch (error) {
        const mockCustomer = mockCustomers.find(c => c.id === customerId)
        if (mockCustomer) return mockCustomer
        throw new Error('Customer not found')
      }
    },
  })

  // 顧客の見積もり一覧を取得
  const customerEstimates = useMemo(() => {
    return estimates.filter(e =>
      e.customerId === customerId ||
      e.customerName === customer?.name
    ).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
  }, [estimates, customerId, customer?.name])

  // 活動履歴取得してブロックに変換
  const { data: activities } = useQuery<Activity[]>({
    queryKey: ['activities', customerId],
    queryFn: async () => {
      try {
        const response = await api.get(`/customers/${customerId}/activities`)
        return response.data
      } catch (error) {
        return mockActivities.filter(a => a.customerId === customerId)
      }
    },
  })

  // 活動履歴をブロックに変換（初回のみ）
  useEffect(() => {
    if (activities && blocks.length === 0) {
      const initialBlocks: Block[] = activities.map(activity => ({
        id: activity.id,
        type: activity.type === ActivityType.CALL ? 'call_log' :
              activity.type === ActivityType.EMAIL ? 'email_log' : 'text',
        content: activity.content,
        callDuration: activity.callDuration,
        emailSubject: activity.emailSubject,
        createdAt: activity.createdAt,
        createdBy: activity.createdByName,
      }))
      // 初期ブロックがなければ空のテキストブロックを追加
      if (initialBlocks.length === 0) {
        initialBlocks.push({
          id: Date.now().toString(),
          type: 'text',
          content: '',
          createdAt: new Date().toISOString(),
        })
      }
      setBlocks(initialBlocks)
    }
  }, [activities])

  // 現在のステータス情報
  const currentStatus = useMemo(() => {
    return STATUS_OPTIONS.find(s => s.status === customer?.status) || STATUS_OPTIONS[0]
  }, [customer?.status])

  // ブロック操作
  const addBlock = (afterId?: string, type: BlockType = 'text') => {
    const newBlock: Block = {
      id: Date.now().toString(),
      type,
      content: '',
      createdAt: new Date().toISOString(),
    }

    setBlocks(prev => {
      if (!afterId) {
        return [...prev, newBlock]
      }
      const index = prev.findIndex(b => b.id === afterId)
      const newBlocks = [...prev]
      newBlocks.splice(index + 1, 0, newBlock)
      return newBlocks
    })

    setTimeout(() => setActiveBlockId(newBlock.id), 0)
  }

  const updateBlock = (id: string, updates: Partial<Block>) => {
    setBlocks(prev => prev.map(block =>
      block.id === id ? { ...block, ...updates } : block
    ))
  }

  const deleteBlock = (id: string) => {
    setBlocks(prev => {
      const newBlocks = prev.filter(b => b.id !== id)
      if (newBlocks.length === 0) {
        return [{
          id: Date.now().toString(),
          type: 'text' as BlockType,
          content: '',
          createdAt: new Date().toISOString(),
        }]
      }
      return newBlocks
    })
  }

  const duplicateBlock = (id: string) => {
    setBlocks(prev => {
      const index = prev.findIndex(b => b.id === id)
      if (index === -1) return prev
      const blockToDuplicate = prev[index]
      const newBlock: Block = {
        ...blockToDuplicate,
        id: Date.now().toString(),
        createdAt: new Date().toISOString(),
      }
      const newBlocks = [...prev]
      newBlocks.splice(index + 1, 0, newBlock)
      return newBlocks
    })
  }

  const handleBlockKeyDown = (id: string, e: KeyboardEvent<HTMLTextAreaElement | HTMLInputElement>) => {
    const block = blocks.find(b => b.id === id)
    if (!block) return

    // IME入力中（日本語変換中）は何もしない
    if (e.nativeEvent.isComposing || e.keyCode === 229) {
      return
    }

    const target = e.target as HTMLTextAreaElement
    const cursorPosition = target.selectionStart || 0
    const selectionEnd = target.selectionEnd || 0

    // Enterで新しいブロック追加（Notionスタイル：カーソル位置でテキストを分割）
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()

      // カーソル位置でテキストを分割
      const textBefore = block.content.substring(0, cursorPosition)
      const textAfter = block.content.substring(selectionEnd)

      // 現在のブロックを更新（カーソル前のテキストのみ）
      updateBlock(id, { content: textBefore })

      // 新しいブロックを作成（カーソル後のテキストを含む）
      const newBlockId = Date.now().toString()
      const newBlock: Block = {
        id: newBlockId,
        type: 'text', // 新しいブロックは常にテキストタイプ
        content: textAfter,
        createdAt: new Date().toISOString(),
      }

      setBlocks(prev => {
        const index = prev.findIndex(b => b.id === id)
        const newBlocks = [...prev]
        newBlocks.splice(index + 1, 0, newBlock)
        return newBlocks
      })

      // 新しいブロックにフォーカス
      setTimeout(() => setActiveBlockId(newBlockId), 0)
    }

    // Backspaceで空のブロックを削除、または前のブロックと結合
    if (e.key === 'Backspace' && cursorPosition === 0 && blocks.length > 1) {
      const index = blocks.findIndex(b => b.id === id)

      if (index > 0) {
        e.preventDefault()
        const prevBlock = blocks[index - 1]

        // 前のブロックが通話記録やメール記録の場合は結合しない
        if (prevBlock.type === 'call_log' || prevBlock.type === 'email_log' || prevBlock.type === 'divider') {
          // 現在のブロックが空の場合のみ削除
          if (block.content === '') {
            deleteBlock(id)
            setActiveBlockId(prevBlock.id)
          }
          return
        }

        // 前のブロックのテキスト末尾の位置を保存
        const prevContentLength = prevBlock.content.length

        // 前のブロックに現在のブロックのテキストを結合
        updateBlock(prevBlock.id, {
          content: prevBlock.content + block.content
        })

        // 現在のブロックを削除
        deleteBlock(id)

        // 前のブロックにフォーカスし、カーソルを結合位置に移動
        setActiveBlockId(prevBlock.id)
        setTimeout(() => {
          const prevTextarea = document.querySelector(`[data-block-id="${prevBlock.id}"] textarea`) as HTMLTextAreaElement
          if (prevTextarea) {
            prevTextarea.focus()
            prevTextarea.setSelectionRange(prevContentLength, prevContentLength)
          }
        }, 0)
      }
    }

    // Deleteで次のブロックと結合
    if (e.key === 'Delete' && cursorPosition === block.content.length) {
      const index = blocks.findIndex(b => b.id === id)

      if (index < blocks.length - 1) {
        const nextBlock = blocks[index + 1]

        // 次のブロックが通話記録やメール記録の場合は結合しない
        if (nextBlock.type === 'call_log' || nextBlock.type === 'email_log' || nextBlock.type === 'divider') {
          return
        }

        e.preventDefault()

        // 現在のブロックに次のブロックのテキストを結合
        updateBlock(id, {
          content: block.content + nextBlock.content
        })

        // 次のブロックを削除
        deleteBlock(nextBlock.id)
      }
    }

    // /でブロックメニュー表示（空のブロック、またはテキストの先頭で/を入力した場合）
    if (e.key === '/') {
      // 空のブロックか、テキストがない状態で/を入力した場合
      if (block.content === '' || cursorPosition === 0) {
        e.preventDefault()
        setShowBlockMenu(true)
      }
    }

    // Escapeでブロックメニューを閉じる
    if (e.key === 'Escape') {
      if (showBlockMenu) {
        e.preventDefault()
        setShowBlockMenu(false)
      }
    }

    // Tab でインデント（将来的な拡張用）
    if (e.key === 'Tab') {
      e.preventDefault()
      // TODO: インデント機能
    }

    // 矢印キーでブロック間を移動
    if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
      const isAtStart = cursorPosition === 0
      const isAtEnd = cursorPosition === block.content.length

      if ((e.key === 'ArrowUp' && isAtStart) || (e.key === 'ArrowDown' && isAtEnd)) {
        const currentIndex = blocks.findIndex(b => b.id === id)
        const nextIndex = e.key === 'ArrowUp' ? currentIndex - 1 : currentIndex + 1

        if (nextIndex >= 0 && nextIndex < blocks.length) {
          e.preventDefault()
          setActiveBlockId(blocks[nextIndex].id)
        }
      }
    }
  }

  // 電話記録追加
  const addCallLog = () => {
    if (!callContent.trim()) return

    const newBlock: Block = {
      id: Date.now().toString(),
      type: 'call_log',
      content: callContent,
      callDuration: callDuration.mins * 60 + callDuration.secs,
      createdAt: new Date().toISOString(),
    }

    setBlocks(prev => [...prev, newBlock])
    setCallContent('')
    setCallDuration({ mins: 0, secs: 0 })
    setShowCallModal(false)
  }

  // メール記録追加
  const addEmailLog = () => {
    if (!emailBody.trim()) return

    const newBlock: Block = {
      id: Date.now().toString(),
      type: 'email_log',
      content: emailBody,
      emailSubject: emailSubject,
      createdAt: new Date().toISOString(),
    }

    setBlocks(prev => [...prev, newBlock])
    setEmailSubject('')
    setEmailBody('')
    setShowEmailModal(false)
  }

  // 簡易連絡記録追加
  const addQuickContact = () => {
    const resultEmoji = quickContactResult === 'good' ? '👍' : quickContactResult === 'neutral' ? '😐' : quickContactResult === 'bad' ? '👎' : ''
    const resultLabel = quickContactResult === 'good' ? '良好' : quickContactResult === 'neutral' ? '普通' : quickContactResult === 'bad' ? '要フォロー' : ''

    const content = `${resultEmoji} 結果: ${resultLabel}\n${quickContactNote || '（メモなし）'}`

    const newBlock: Block = {
      id: Date.now().toString(),
      type: 'call_log',
      content,
      createdAt: new Date().toISOString(),
    }

    setBlocks(prev => [...prev, newBlock])
    setQuickContactResult('')
    setQuickContactNote('')
    setShowQuickContactModal(false)
  }

  // AIエージェントにメッセージ送信
  const sendAiMessage = async () => {
    if (!aiInput.trim() || isAiLoading) return

    const userMessage = aiInput.trim()
    setAiMessages(prev => [...prev, { role: 'user', content: userMessage }])
    setAiInput('')
    setIsAiLoading(true)

    // 顧客情報を含めたコンテキストを作成
    const customerContext = customer ? `
顧客情報:
- 名前: ${customer.name}
- ステータス: ${currentStatus?.label || '不明'}
- 予算: ${customer.budget || '未設定'}
- 希望車種: ${customer.desiredVehicleType?.join(', ') || '未設定'}
- 購入時期: ${customer.purchaseTiming || '未設定'}
- 最終連絡: ${lastContactDate ? lastContactDate.toLocaleDateString('ja-JP') : '記録なし'}
` : ''

    // シミュレートされたAI応答（実際にはAPIを呼び出す）
    setTimeout(() => {
      let response = ''

      if (userMessage.includes('挨拶') || userMessage.includes('話し方')) {
        response = `${customer?.name || 'お客様'}への挨拶例:\n\n「お世話になっております。katomotorの○○です。\nその後、キャンピングカーのご検討状況はいかがでしょうか？\n\n前回お話しいただいた${customer?.desiredVehicleType?.[0] || 'お車'}について、新しい情報がございましたのでご連絡いたしました。」`
      } else if (userMessage.includes('提案') || userMessage.includes('おすすめ')) {
        response = `${customer?.name || 'お客様'}への提案ポイント:\n\n1. **予算${customer?.budget || ''}**に合わせた最適なモデルをご紹介\n2. ${customer?.purchaseTiming || ''}というタイミングに合わせた納期のご提案\n3. 試乗のご案内\n\n「実際にご覧いただくと、サイズ感や使い勝手がよくわかりますよ」とお伝えすると効果的です。`
      } else if (userMessage.includes('クロージング') || userMessage.includes('成約')) {
        response = `成約に向けたアプローチ:\n\n1. 「現在、${customer?.desiredVehicleType?.[0] || 'このモデル'}は人気で在庫が限られております」\n2. 「今月中のご契約で特別価格をご用意できます」\n3. 「ご家族でのご試乗はいかがですか？週末の空き状況をお調べしましょうか」\n\n焦らせすぎず、お客様のペースに合わせることが大切です。`
      } else if (userMessage.includes('フォロー') || userMessage.includes('久しぶり')) {
        response = `久しぶりの連絡のコツ:\n\n「ご無沙汰しております。katomotorの○○です。\nその後、お変わりございませんでしょうか？\n\n以前ご興味をお持ちいただいていた${customer?.desiredVehicleType?.[0] || 'キャンピングカー'}ですが、最近新しいモデルが入荷いたしました。\n\nもしよろしければ、改めてご案内させていただけますか？」`
      } else {
        response = `ご質問ありがとうございます。\n\n${customer?.name || 'お客様'}との会話では、以下の点を意識してみてください：\n\n1. **傾聴**: お客様のニーズをしっかり聞く\n2. **共感**: 「なるほど、○○ですね」と相槌\n3. **提案**: お客様のニーズに合った提案\n\n具体的なシーン（挨拶、提案、クロージングなど）を教えていただければ、より詳しくアドバイスできます。`
      }

      setAiMessages(prev => [...prev, { role: 'assistant', content: response }])
      setIsAiLoading(false)
    }, 1000)
  }

  // 編集開始
  const handleEdit = () => {
    setEditedCustomer(customer || null)
    setIsEditing(true)
  }

  // 編集キャンセル
  const handleCancel = () => {
    setEditedCustomer(null)
    setIsEditing(false)
  }

  // 保存
  const handleSave = async () => {
    if (!editedCustomer) return
    console.log('Saving:', editedCustomer)
    setIsEditing(false)
  }

  // ステータス変更
  const handleStatusChange = async (newStatus: CustomerStatus) => {
    if (!customer) return
    console.log('Status changed to:', newStatus)
    setShowStatusDropdown(false)
    queryClient.setQueryData(['customer', customerId], { ...customer, status: newStatus })
  }

  // メールテンプレート適用
  const applyEmailTemplate = (template: 'followup' | 'thanks' | 'quote') => {
    const templates = {
      followup: {
        subject: '【katomotor】お問い合わせありがとうございます',
        body: `${customer?.name} 様

この度はkatomotorにお問い合わせいただき、誠にありがとうございます。

お問い合わせいただいた件について、ご案内させていただきます。

ご不明な点がございましたら、お気軽にお問い合わせください。

---
katomotor 営業担当`,
      },
      thanks: {
        subject: '【katomotor】ご来店ありがとうございました',
        body: `${customer?.name} 様

先日はkatomotorにご来店いただき、誠にありがとうございました。

ご検討中のキャンピングカーについて、ご質問やご要望がございましたら
お気軽にご連絡ください。

今後ともよろしくお願いいたします。

---
katomotor 営業担当`,
      },
      quote: {
        subject: '【katomotor】お見積書のご送付',
        body: `${customer?.name} 様

お世話になっております。
katomotorの営業担当でございます。

ご依頼いただいておりましたお見積書を添付にてお送りいたします。

ご不明な点がございましたら、お気軽にお問い合わせください。

---
katomotor 営業担当`,
      },
    }
    const t = templates[template]
    setEmailSubject(t.subject)
    setEmailBody(t.body)
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">読み込み中...</div>
      </div>
    )
  }

  if (!customer) {
    return (
      <div className="flex flex-col items-center justify-center h-64">
        <div className="text-[#9b9a97] mb-4">顧客が見つかりません</div>
        <Link href="/dashboard/customers">
          <Button variant="outline">
            <ArrowLeft className="mr-2 h-4 w-4" />
            戻る
          </Button>
        </Link>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-white font-[-apple-system,BlinkMacSystemFont,'Segoe_UI',Helvetica,Arial,sans-serif]">
      {/* Notion風ヘッダー */}
      <div className="sticky top-0 z-10 bg-white/80 backdrop-blur-sm">
        <div className="max-w-[900px] mx-auto px-[96px] py-[10px]">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-[6px] text-[14px]">
              <Link href="/dashboard/customers" className="flex items-center gap-[4px] text-[#9b9a97] hover:text-[#37352f] transition-colors">
                <ArrowLeft className="h-[14px] w-[14px]" />
              </Link>
              <span className="text-[#9b9a97]">/</span>
              <Link href="/dashboard/customers" className="text-[#9b9a97] hover:text-[#37352f] transition-colors hover:bg-[#ebebea] px-[6px] py-[2px] rounded-[3px]">
                顧客管理
              </Link>
              <span className="text-[#9b9a97]">/</span>
              <span className="text-[#37352f] font-medium">{customer.name}</span>
            </div>
            <div className="flex items-center gap-[8px]">
              <button className="p-[6px] hover:bg-[#ebebea] rounded-[3px] text-[#9b9a97] hover:text-[#37352f] transition-colors">
                <Star className="h-[16px] w-[16px]" />
              </button>
              <button className="p-[6px] hover:bg-[#ebebea] rounded-[3px] text-[#9b9a97] hover:text-[#37352f] transition-colors">
                <MessageCircle className="h-[16px] w-[16px]" />
              </button>
              <button className="p-[6px] hover:bg-[#ebebea] rounded-[3px] text-[#9b9a97] hover:text-[#37352f] transition-colors">
                <Clock className="h-[16px] w-[16px]" />
              </button>
              <button className="p-[6px] hover:bg-[#ebebea] rounded-[3px] text-[#9b9a97] hover:text-[#37352f] transition-colors">
                <MoreHorizontal className="h-[16px] w-[16px]" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Notion風メインコンテンツ */}
      <div className="max-w-[900px] mx-auto px-[96px] pt-[20px] pb-[30vh]">
        {/* ページアイコン */}
        <div className="group relative inline-block mb-[4px]">
          <div className="w-[78px] h-[78px] flex items-center justify-center text-[60px] hover:bg-[#ebebea] rounded-[3px] cursor-pointer transition-colors">
            👤
          </div>
        </div>

        {/* ページタイトル（Notion風） */}
        <div className="mb-[12px]">
          <h1 className="text-[40px] font-bold text-[#37352f] leading-[1.2] tracking-tight outline-none">
            {customer.name}
          </h1>
          {customer.nameKana && (
            <p className="text-[14px] text-[#9b9a97] mt-[4px]">{customer.nameKana}</p>
          )}
        </div>

        {/* 連絡セクション */}
        <div className="mb-[24px] border border-[#e3e2e0] rounded-[8px] overflow-hidden">
          {/* 連絡リマインダーアラート */}
          {needsFollowUp && (
            <div className="p-[16px] bg-[#fff8e6] border-b border-[#f5c542] flex items-start gap-[12px]">
              <div className="flex-shrink-0 w-[32px] h-[32px] bg-[#f5c542] rounded-full flex items-center justify-center">
                <Bell className="h-[18px] w-[18px] text-white" />
              </div>
              <div className="flex-1">
                <div className="text-[14px] font-medium text-[#37352f] mb-[4px]">
                  そろそろ連絡してみませんか？
                </div>
                <div className="text-[13px] text-[#9b9a97]">
                  {storeLastContactDate
                    ? `最終連絡から${Math.floor((Date.now() - storeLastContactDate.getTime()) / (1000 * 60 * 60 * 24))}日が経過しています。`
                    : lastContactDate
                    ? `最終連絡から${Math.floor((Date.now() - lastContactDate.getTime()) / (1000 * 60 * 60 * 24))}日が経過しています。`
                    : '連絡履歴がありません。'}
                  定期的なフォローアップで関係を維持しましょう。
                </div>
              </div>
            </div>
          )}

          {/* 連絡アクションボタン */}
          <div className="p-[16px] bg-white">
            <div className="flex items-center gap-[8px] mb-[16px]">
              <Phone className="h-[16px] w-[16px] text-[#9b9a97]" />
              <span className="text-[14px] font-medium text-[#37352f]">連絡する</span>
            </div>
            <div className="flex flex-wrap gap-[8px]">
              {/* 電話ボタン */}
              {customer.phone && (
                <a
                  href={`tel:${customer.phone}`}
                  onClick={() => {
                    addContactRecord({
                      customerId,
                      type: 'phone',
                      content: `${customer.phone}に電話発信`,
                    })
                  }}
                  className="inline-flex items-center gap-[6px] px-[14px] py-[8px] text-[13px] text-white bg-[#22c55e] hover:bg-[#16a34a] rounded-[6px] transition-colors font-medium shadow-sm"
                >
                  <Phone className="h-[14px] w-[14px]" />
                  電話をかける
                </a>
              )}

              {/* チャットボタン */}
              <button
                onClick={() => setShowChatPanel(!showChatPanel)}
                className={`inline-flex items-center gap-[6px] px-[14px] py-[8px] text-[13px] rounded-[6px] transition-colors font-medium shadow-sm ${
                  showChatPanel
                    ? 'text-white bg-[#337ea9] hover:bg-[#2a6a8f]'
                    : 'text-[#337ea9] bg-[#d3e5ef] hover:bg-[#c3d5df]'
                }`}
              >
                <MessageSquare className="h-[14px] w-[14px]" />
                チャット {chatMessages.length > 0 && `(${chatMessages.length})`}
              </button>

              {/* 電話記録ボタン */}
              <button
                onClick={() => setShowCallModal(true)}
                className="inline-flex items-center gap-[6px] px-[14px] py-[8px] text-[13px] text-[#37352f] bg-[#f7f6f5] hover:bg-[#ebebea] rounded-[6px] transition-colors border border-[#e3e2e0]"
              >
                <PhoneCall className="h-[14px] w-[14px]" />
                通話記録を追加
              </button>

              {/* 連絡しましたボタン */}
              <button
                onClick={() => {
                  addContactRecord({
                    customerId,
                    type: 'phone',
                    content: 'フォローアップ連絡完了',
                  })
                  setShowQuickContactModal(true)
                }}
                className="inline-flex items-center gap-[6px] px-[14px] py-[8px] text-[13px] text-white bg-[#f5c542] hover:bg-[#e5b532] rounded-[6px] transition-colors font-medium shadow-sm"
              >
                <CheckCircle2 className="h-[14px] w-[14px]" />
                連絡しました
              </button>

              {/* 契約ボタン */}
              <button
                onClick={() => {
                  // 金額を「100万」形式に変換するヘルパー関数
                  const formatPaymentAmount = (amount: number | undefined): string => {
                    if (!amount || amount === 0) return ''
                    const man = Math.round(amount / 10000)
                    if (man >= 100) return `${Math.round(man / 100) * 100}万`
                    return ''
                  }

                  // 最新の見積もりからデータを取得
                  const latestEstimate = customerEstimates[0]
                  if (latestEstimate) {
                    setSelectedEstimateId(latestEstimate.id)
                    setContractVehicle(latestEstimate.vehicleName || customer.interestedCars?.[0] || '')
                    setContractAmount(latestEstimate.totalAmount?.toString() || '')
                    // 支払条件があれば入金予定に反映
                    if (latestEstimate.paymentTerms) {
                      setPaymentAmount1(formatPaymentAmount(latestEstimate.paymentTerms.depositAmount))
                      setPaymentAmount2(formatPaymentAmount(latestEstimate.paymentTerms.interimAmount))
                      setPaymentAmount3(formatPaymentAmount(latestEstimate.paymentTerms.balanceAmount))
                    }
                  } else {
                    setSelectedEstimateId('')
                    setContractVehicle(customer.interestedCars?.[0] || '')
                  }
                  setRemainingPaymentMethod('')
                  setShowContractModal(true)
                }}
                className="inline-flex items-center gap-[8px] px-[20px] py-[10px] text-[14px] text-white bg-gradient-to-r from-[#10b981] to-[#059669] hover:from-[#059669] hover:to-[#047857] rounded-[8px] transition-all font-bold shadow-lg hover:shadow-xl transform hover:scale-105"
              >
                <Sparkles className="h-[18px] w-[18px]" />
                契約！
              </button>
            </div>
          </div>

          {/* チャットパネル */}
          {showChatPanel && (
            <div className="border-t border-[#e3e2e0] bg-[#f7f6f5]">
              <div className="p-[12px] border-b border-[#e3e2e0] bg-white flex items-center justify-between">
                <div className="flex items-center gap-[8px]">
                  <MessageSquare className="h-[16px] w-[16px] text-[#337ea9]" />
                  <span className="text-[14px] font-medium text-[#37352f]">{customer.name}さんとのチャット</span>
                </div>
                <button
                  onClick={() => setShowChatPanel(false)}
                  className="text-[#9b9a97] hover:text-[#37352f] p-[4px]"
                >
                  <X className="h-[16px] w-[16px]" />
                </button>
              </div>

              {/* チャットメッセージエリア */}
              <div
                ref={chatContainerRef}
                className="h-[300px] overflow-y-auto p-[16px] space-y-[12px]"
              >
                {chatMessages.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-center">
                    <MessageSquare className="h-[32px] w-[32px] text-[#c8c7c5] mb-[8px]" />
                    <p className="text-[13px] text-[#9b9a97]">まだメッセージがありません</p>
                    <p className="text-[12px] text-[#c8c7c5]">下のフォームからメッセージを送信してください</p>
                  </div>
                ) : (
                  chatMessages.map((msg) => (
                    <div
                      key={msg.id}
                      className={`flex ${msg.isFromCustomer ? 'justify-start' : 'justify-end'}`}
                    >
                      <div
                        className={`max-w-[80%] rounded-[12px] px-[14px] py-[10px] ${
                          msg.isFromCustomer
                            ? 'bg-white border border-[#e3e2e0] text-[#37352f]'
                            : 'bg-[#337ea9] text-white'
                        }`}
                      >
                        <p className="text-[13px] whitespace-pre-wrap">{msg.content}</p>
                        <p className={`text-[10px] mt-[4px] ${
                          msg.isFromCustomer ? 'text-[#9b9a97]' : 'text-white/70'
                        }`}>
                          {new Date(msg.createdAt).toLocaleString('ja-JP', {
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </p>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* メッセージ入力エリア */}
              <div className="p-[12px] border-t border-[#e3e2e0] bg-white">
                <div className="flex gap-[8px]">
                  <Input
                    value={chatMessage}
                    onChange={(e) => setChatMessage(e.target.value)}
                    placeholder="メッセージを入力..."
                    className="flex-1"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey && chatMessage.trim()) {
                        e.preventDefault()
                        addChatMessage(customerId, chatMessage.trim(), false)
                        setChatMessage('')
                        setTimeout(() => {
                          chatContainerRef.current?.scrollTo({
                            top: chatContainerRef.current.scrollHeight,
                            behavior: 'smooth'
                          })
                        }, 100)
                      }
                    }}
                  />
                  <Button
                    onClick={() => {
                      if (chatMessage.trim()) {
                        addChatMessage(customerId, chatMessage.trim(), false)
                        setChatMessage('')
                        setTimeout(() => {
                          chatContainerRef.current?.scrollTo({
                            top: chatContainerRef.current.scrollHeight,
                            behavior: 'smooth'
                          })
                        }, 100)
                      }
                    }}
                    disabled={!chatMessage.trim()}
                    className="bg-[#337ea9] hover:bg-[#2a6a8f]"
                  >
                    <Send className="h-[16px] w-[16px]" />
                  </Button>
                </div>
                <div className="flex gap-[8px] mt-[8px]">
                  <button
                    onClick={() => {
                      const response = prompt('顧客からの返信を入力:')
                      if (response?.trim()) {
                        addChatMessage(customerId, response.trim(), true)
                        setTimeout(() => {
                          chatContainerRef.current?.scrollTo({
                            top: chatContainerRef.current.scrollHeight,
                            behavior: 'smooth'
                          })
                        }, 100)
                      }
                    }}
                    className="text-[11px] text-[#9b9a97] hover:text-[#37352f] flex items-center gap-[4px]"
                  >
                    <Plus className="h-[12px] w-[12px]" />
                    顧客の返信を記録
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* 連絡履歴 */}
          {contactRecords.length > 0 && (
            <div className="border-t border-[#e3e2e0] bg-white">
              <div className="p-[12px] border-b border-[#e3e2e0] flex items-center gap-[8px]">
                <Clock className="h-[14px] w-[14px] text-[#9b9a97]" />
                <span className="text-[13px] font-medium text-[#37352f]">連絡履歴</span>
                <span className="text-[12px] text-[#9b9a97]">({contactRecords.length}件)</span>
              </div>
              <div className="max-h-[200px] overflow-y-auto">
                {contactRecords.slice(0, 10).map((record) => (
                  <div
                    key={record.id}
                    className="px-[16px] py-[10px] border-b border-[#f0efee] last:border-b-0 hover:bg-[#f7f6f5] flex items-start gap-[12px]"
                  >
                    <div className={`w-[28px] h-[28px] rounded-full flex items-center justify-center flex-shrink-0 ${
                      record.type === 'phone' ? 'bg-[#dcfce7] text-[#22c55e]' :
                      record.type === 'chat' ? 'bg-[#d3e5ef] text-[#337ea9]' :
                      record.type === 'email' ? 'bg-[#fdecc8] text-[#cb912f]' :
                      'bg-[#e8deee] text-[#9065b0]'
                    }`}>
                      {record.type === 'phone' && <Phone className="h-[14px] w-[14px]" />}
                      {record.type === 'chat' && <MessageSquare className="h-[14px] w-[14px]" />}
                      {record.type === 'email' && <Mail className="h-[14px] w-[14px]" />}
                      {record.type === 'meeting' && <Users className="h-[14px] w-[14px]" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[13px] text-[#37352f] truncate">{record.content}</p>
                      <p className="text-[11px] text-[#9b9a97] mt-[2px]">
                        {new Date(record.createdAt).toLocaleString('ja-JP', {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                        {record.duration && ` • ${Math.floor(record.duration / 60)}分${record.duration % 60}秒`}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* プロパティ（Notion風データベースプロパティ） */}
        <div className="mb-[32px]">
          {/* ステータス */}
          <div className="flex items-center min-h-[34px] text-[14px] group">
            <div className="w-[160px] flex items-center gap-[6px] text-[#9b9a97]">
              <Hash className="h-[14px] w-[14px]" />
              <span>ステータス</span>
            </div>
            <div className="flex-1 relative">
              <button
                onClick={() => setShowStatusDropdown(!showStatusDropdown)}
                className={`inline-flex items-center gap-[4px] px-[8px] py-[3px] rounded-[3px] text-[14px] ${currentStatus.bgColor} ${currentStatus.color} hover:opacity-90 transition-opacity`}
              >
                {currentStatus.label}
                <ChevronDown className="h-[12px] w-[12px]" />
              </button>
              {showStatusDropdown && (
                <div className="absolute top-full left-0 mt-[4px] w-[200px] bg-white rounded-[4px] shadow-[0_0_0_1px_rgba(15,15,15,0.05),0_3px_6px_rgba(15,15,15,0.1),0_9px_24px_rgba(15,15,15,0.2)] py-[6px] z-20">
                  <div className="px-[14px] py-[6px] text-[12px] text-[#9b9a97] font-medium">ステータスを選択</div>
                  {STATUS_OPTIONS.map((option) => (
                    <button
                      key={option.status}
                      onClick={() => handleStatusChange(option.status)}
                      className={`w-full text-left px-[14px] py-[6px] text-[14px] hover:bg-[#ebebea] flex items-center gap-[8px] ${
                        option.status === customer.status ? 'bg-[#ebebea]' : ''
                      }`}
                    >
                      <span className={`inline-flex items-center px-[6px] py-[2px] rounded-[3px] text-[12px] ${option.bgColor} ${option.color}`}>
                        {option.label}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* 電話番号 */}
          <div className="flex items-center min-h-[34px] text-[14px] group hover:bg-[#f7f6f5] -mx-[8px] px-[8px] rounded-[3px]">
            <div className="w-[160px] flex items-center gap-[6px] text-[#9b9a97]">
              <Phone className="h-[14px] w-[14px]" />
              <span>電話番号</span>
            </div>
            <div className="flex-1">
              {customer.phone ? (
                <a href={`tel:${customer.phone}`} className="text-[#37352f] hover:bg-[#ebebea] px-[6px] py-[2px] rounded-[3px] -mx-[6px] transition-colors">
                  {customer.phone}
                </a>
              ) : (
                <span className="text-[#c3c2c1] italic">空</span>
              )}
            </div>
          </div>

          {/* メール */}
          <div className="flex items-center min-h-[34px] text-[14px] group hover:bg-[#f7f6f5] -mx-[8px] px-[8px] rounded-[3px]">
            <div className="w-[160px] flex items-center gap-[6px] text-[#9b9a97]">
              <Mail className="h-[14px] w-[14px]" />
              <span>メール</span>
            </div>
            <div className="flex-1">
              {customer.email ? (
                <a href={`mailto:${customer.email}`} className="text-[#37352f] underline decoration-[#9b9a97]/50 hover:bg-[#ebebea] px-[6px] py-[2px] rounded-[3px] -mx-[6px] transition-colors">
                  {customer.email}
                </a>
              ) : (
                <span className="text-[#c3c2c1] italic">空</span>
              )}
            </div>
          </div>

          {/* 住所 */}
          <div className="flex items-center min-h-[34px] text-[14px] group hover:bg-[#f7f6f5] -mx-[8px] px-[8px] rounded-[3px]">
            <div className="w-[160px] flex items-center gap-[6px] text-[#9b9a97]">
              <MapPin className="h-[14px] w-[14px]" />
              <span>住所</span>
            </div>
            <div className="flex-1 text-[#37352f]">
              {customer.address ? (
                <span>{customer.postalCode && `〒${customer.postalCode} `}{customer.address}</span>
              ) : (
                <span className="text-[#c3c2c1] italic">空</span>
              )}
            </div>
          </div>

          {/* 予算 */}
          <div className="flex items-center min-h-[34px] text-[14px] group hover:bg-[#f7f6f5] -mx-[8px] px-[8px] rounded-[3px]">
            <div className="w-[160px] flex items-center gap-[6px] text-[#9b9a97]">
              <Wallet className="h-[14px] w-[14px]" />
              <span>予算</span>
            </div>
            <div className="flex-1">
              {editingBudget ? (
                <input
                  type="text"
                  value={localBudget}
                  onChange={(e) => setLocalBudget(e.target.value)}
                  onBlur={() => {
                    setEditingBudget(false)
                    if (localBudget !== (customer.budget || '')) {
                      updateCustomer(customerId, { budget: localBudget || undefined })
                    }
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      setEditingBudget(false)
                      if (localBudget !== (customer.budget || '')) {
                        updateCustomer(customerId, { budget: localBudget || undefined })
                      }
                    }
                    if (e.key === 'Escape') {
                      setEditingBudget(false)
                      setLocalBudget(customer.budget || '')
                    }
                  }}
                  autoFocus
                  className="w-full px-[6px] py-[2px] text-[12px] border border-[#10b981] rounded-[3px] focus:outline-none focus:ring-1 focus:ring-[#10b981]"
                  placeholder="例: 500万円〜700万円"
                />
              ) : (
                <button
                  onClick={() => {
                    setLocalBudget(customer.budget || '')
                    setEditingBudget(true)
                  }}
                  className="text-left hover:bg-[#ebebea] px-[6px] py-[2px] rounded-[3px] -mx-[6px] transition-colors cursor-text"
                >
                  {customer.budget ? (
                    <span className="inline-flex items-center px-[6px] py-[2px] rounded-[3px] text-[12px] bg-[#dbeddb] text-[#448361]">
                      {customer.budget}
                    </span>
                  ) : (
                    <span className="text-[#c3c2c1] italic">空</span>
                  )}
                </button>
              )}
            </div>
          </div>

          {/* 希望車種 */}
          <div className="flex items-center min-h-[34px] text-[14px] group hover:bg-[#f7f6f5] -mx-[8px] px-[8px] rounded-[3px]">
            <div className="w-[160px] flex items-center gap-[6px] text-[#9b9a97]">
              <Car className="h-[14px] w-[14px]" />
              <span>希望車種</span>
            </div>
            <div className="flex-1">
              {editingDesiredVehicleType ? (
                <input
                  type="text"
                  value={localDesiredVehicleType}
                  onChange={(e) => setLocalDesiredVehicleType(e.target.value)}
                  onBlur={() => {
                    setEditingDesiredVehicleType(false)
                    const newTypes = localDesiredVehicleType.split(',').map(t => t.trim()).filter(t => t)
                    const currentTypes = customer.desiredVehicleType || []
                    if (JSON.stringify(newTypes) !== JSON.stringify(currentTypes)) {
                      updateCustomer(customerId, { desiredVehicleType: newTypes.length > 0 ? newTypes : undefined })
                    }
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      setEditingDesiredVehicleType(false)
                      const newTypes = localDesiredVehicleType.split(',').map(t => t.trim()).filter(t => t)
                      const currentTypes = customer.desiredVehicleType || []
                      if (JSON.stringify(newTypes) !== JSON.stringify(currentTypes)) {
                        updateCustomer(customerId, { desiredVehicleType: newTypes.length > 0 ? newTypes : undefined })
                      }
                    }
                    if (e.key === 'Escape') {
                      setEditingDesiredVehicleType(false)
                      setLocalDesiredVehicleType((customer.desiredVehicleType || []).join(', '))
                    }
                  }}
                  autoFocus
                  className="w-full px-[6px] py-[2px] text-[12px] border border-[#10b981] rounded-[3px] focus:outline-none focus:ring-1 focus:ring-[#10b981]"
                  placeholder="例: バンコン, キャブコン（カンマ区切り）"
                />
              ) : (
                <button
                  onClick={() => {
                    setLocalDesiredVehicleType((customer.desiredVehicleType || []).join(', '))
                    setEditingDesiredVehicleType(true)
                  }}
                  className="text-left hover:bg-[#ebebea] px-[6px] py-[2px] rounded-[3px] -mx-[6px] transition-colors cursor-text"
                >
                  {customer.desiredVehicleType && customer.desiredVehicleType.length > 0 ? (
                    <div className="flex flex-wrap gap-[4px]">
                      {customer.desiredVehicleType.map((type, idx) => (
                        <span key={idx} className="inline-flex items-center px-[6px] py-[2px] rounded-[3px] text-[12px] bg-[#e3e2e0] text-[#37352f]">
                          {type}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <span className="text-[#c3c2c1] italic">空</span>
                  )}
                </button>
              )}
            </div>
          </div>

          {/* 担当者（プルダウン選択） */}
          <div className="flex items-center min-h-[34px] text-[14px] group hover:bg-[#f7f6f5] -mx-[8px] px-[8px] rounded-[3px]">
            <div className="w-[160px] flex items-center gap-[6px] text-[#9b9a97]">
              <User className="h-[14px] w-[14px]" />
              <span>担当者</span>
            </div>
            <div className="flex-1 relative">
              <button
                onClick={() => setShowSalesRepDropdown(!showSalesRepDropdown)}
                className="flex items-center gap-[4px] text-[14px] hover:bg-[#ebebea] px-[6px] py-[3px] rounded-[3px] -mx-[6px] transition-colors"
              >
                {(() => {
                  const currentRep = localSalesRep || (customer.assignedSalesRepName ? { name: customer.assignedSalesRepName, color: customer.assignedSalesRepColor || 'bg-gray-100 text-gray-700' } : null)
                  return currentRep ? (
                    <span className={`inline-flex items-center px-[6px] py-[2px] rounded-[3px] text-[12px] ${currentRep.color}`}>
                      {currentRep.name}
                    </span>
                  ) : (
                    <span className="text-[#c3c2c1] italic">担当者を選択...</span>
                  )
                })()}
                <ChevronDown className="h-[12px] w-[12px] text-[#9b9a97]" />
              </button>
              {showSalesRepDropdown && (
                <div className="absolute top-full left-0 mt-[4px] w-[240px] bg-white rounded-[4px] shadow-[0_0_0_1px_rgba(15,15,15,0.05),0_3px_6px_rgba(15,15,15,0.1),0_9px_24px_rgba(15,15,15,0.2)] py-[6px] z-20 max-h-[300px] overflow-y-auto">
                  <div className="px-[14px] py-[6px] text-[12px] text-[#9b9a97] font-medium">担当者を選択</div>
                  {/* 担当者なしオプション */}
                  <button
                    onClick={() => {
                      setLocalSalesRep(null)
                      setShowSalesRepDropdown(false)
                      console.log('担当者を解除')
                    }}
                    className={`w-full text-left px-[14px] py-[6px] text-[14px] hover:bg-[#ebebea] flex items-center gap-[8px] ${
                      !localSalesRep && !customer.assignedSalesRepName ? 'bg-[#ebebea]' : ''
                    }`}
                  >
                    <span className="text-[#9b9a97] italic">なし</span>
                  </button>
                  {salesReps.length === 0 ? (
                    <div className="px-[14px] py-[8px] text-[14px] text-[#9b9a97]">
                      担当者が登録されていません。設定から追加してください。
                    </div>
                  ) : (
                    salesReps.map((rep) => {
                      const currentRepName = localSalesRep?.name ?? customer.assignedSalesRepName
                      const isSelected = currentRepName === rep.name
                      return (
                        <button
                          key={rep.id}
                          onClick={() => {
                            setLocalSalesRep({ name: rep.name, color: rep.color })
                            setShowSalesRepDropdown(false)
                            console.log('担当者を更新:', rep.name)
                          }}
                          className={`w-full text-left px-[14px] py-[6px] text-[14px] hover:bg-[#ebebea] flex items-center gap-[8px] ${
                            isSelected ? 'bg-[#ebebea]' : ''
                          }`}
                        >
                          <span className={`inline-flex items-center px-[6px] py-[2px] rounded-[3px] text-[12px] ${rep.color}`}>
                            {rep.name}
                          </span>
                        </button>
                      )
                    })
                  )}
                </div>
              )}
            </div>
          </div>

          {/* 購入時期 */}
          <div className="flex items-center min-h-[34px] text-[14px] group hover:bg-[#f7f6f5] -mx-[8px] px-[8px] rounded-[3px]">
            <div className="w-[160px] flex items-center gap-[6px] text-[#9b9a97]">
              <CalendarClock className="h-[14px] w-[14px]" />
              <span>購入時期</span>
            </div>
            <div className="flex-1">
              {editingPurchaseTiming ? (
                <input
                  type="text"
                  value={localPurchaseTiming}
                  onChange={(e) => setLocalPurchaseTiming(e.target.value)}
                  onBlur={() => {
                    setEditingPurchaseTiming(false)
                    if (localPurchaseTiming !== (customer.purchaseTiming || '')) {
                      updateCustomer(customerId, { purchaseTiming: localPurchaseTiming || undefined })
                    }
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      setEditingPurchaseTiming(false)
                      if (localPurchaseTiming !== (customer.purchaseTiming || '')) {
                        updateCustomer(customerId, { purchaseTiming: localPurchaseTiming || undefined })
                      }
                    }
                    if (e.key === 'Escape') {
                      setEditingPurchaseTiming(false)
                      setLocalPurchaseTiming(customer.purchaseTiming || '')
                    }
                  }}
                  autoFocus
                  className="w-full px-[6px] py-[2px] text-[12px] border border-[#10b981] rounded-[3px] focus:outline-none focus:ring-1 focus:ring-[#10b981]"
                  placeholder="例: 3ヶ月以内、半年以内"
                />
              ) : (
                <button
                  onClick={() => {
                    setLocalPurchaseTiming(customer.purchaseTiming || '')
                    setEditingPurchaseTiming(true)
                  }}
                  className="text-left hover:bg-[#ebebea] px-[6px] py-[2px] rounded-[3px] -mx-[6px] transition-colors cursor-text"
                >
                  {customer.purchaseTiming ? (
                    <span className="inline-flex items-center px-[6px] py-[2px] rounded-[3px] text-[12px] bg-[#d3e5ef] text-[#337ea9]">
                      {customer.purchaseTiming}
                    </span>
                  ) : (
                    <span className="text-[#c3c2c1] italic">空</span>
                  )}
                </button>
              )}
            </div>
          </div>

          {/* 検討車種（プルダウン選択） */}
          <div className="flex items-start min-h-[34px] text-[14px] group hover:bg-[#f7f6f5] -mx-[8px] px-[8px] rounded-[3px] py-[4px]">
            <div className="w-[160px] flex items-center gap-[6px] text-[#9b9a97] pt-[4px]">
              <Car className="h-[14px] w-[14px]" />
              <span>検討車種</span>
            </div>
            <div className="flex-1 relative">
              <button
                onClick={() => setShowVehicleDropdown(!showVehicleDropdown)}
                className="flex items-center gap-[4px] text-[14px] hover:bg-[#ebebea] px-[6px] py-[3px] rounded-[3px] -mx-[6px] transition-colors"
              >
                {(() => {
                  const currentCars = localInterestedCars ?? customer.interestedCars ?? []
                  return currentCars.length > 0 ? (
                    <div className="flex flex-wrap gap-[4px]">
                      {currentCars.map((car, idx) => (
                        <span key={idx} className="inline-flex items-center px-[6px] py-[2px] rounded-[3px] text-[12px] bg-[#e8deee] text-[#9065b0]">
                          {car}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <span className="text-[#c3c2c1] italic">車種を選択...</span>
                  )
                })()}
                <ChevronDown className="h-[12px] w-[12px] text-[#9b9a97]" />
              </button>
              {showVehicleDropdown && (
                <div className="absolute top-full left-0 mt-[4px] w-[320px] bg-white rounded-[4px] shadow-[0_0_0_1px_rgba(15,15,15,0.05),0_3px_6px_rgba(15,15,15,0.1),0_9px_24px_rgba(15,15,15,0.2)] py-[6px] z-20 max-h-[300px] overflow-y-auto">
                  <div className="px-[14px] py-[6px] text-[12px] text-[#9b9a97] font-medium">検討車種を選択（複数可）</div>
                  {vehicleModels.length === 0 ? (
                    <div className="px-[14px] py-[8px] text-[14px] text-[#9b9a97]">
                      車種が登録されていません。設定から追加してください。
                    </div>
                  ) : (
                    vehicleModels.map((model) => {
                      const currentCars = localInterestedCars ?? customer.interestedCars ?? []
                      const isSelected = currentCars.includes(model.name)
                      return (
                        <button
                          key={model.id}
                          onClick={() => {
                            const newCars = isSelected
                              ? currentCars.filter(c => c !== model.name)
                              : [...currentCars, model.name]
                            setLocalInterestedCars(newCars)
                            // TODO: APIを呼び出して永続化
                            console.log('検討車種を更新:', newCars)
                          }}
                          className={`w-full text-left px-[14px] py-[6px] text-[14px] hover:bg-[#ebebea] flex items-center gap-[8px] ${
                            isSelected ? 'bg-[#ebebea]' : ''
                          }`}
                        >
                          <div className={`w-[16px] h-[16px] rounded-[3px] border ${isSelected ? 'bg-[#9065b0] border-[#9065b0]' : 'border-[#9b9a97]'} flex items-center justify-center`}>
                            {isSelected && <Check className="h-[12px] w-[12px] text-white" />}
                          </div>
                          <span>{model.name}</span>
                        </button>
                      )
                    })
                  )}
                  <div className="border-t border-[#ebebea] mt-[6px] pt-[6px] px-[14px]">
                    <button
                      onClick={() => setShowVehicleDropdown(false)}
                      className="w-full text-center py-[6px] text-[14px] text-[#337ea9] hover:bg-[#ebebea] rounded-[3px]"
                    >
                      完了
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* 登録日 */}
          <div className="flex items-center min-h-[34px] text-[14px] group hover:bg-[#f7f6f5] -mx-[8px] px-[8px] rounded-[3px]">
            <div className="w-[160px] flex items-center gap-[6px] text-[#9b9a97]">
              <Calendar className="h-[14px] w-[14px]" />
              <span>登録日</span>
            </div>
            <div className="flex-1 text-[#37352f]">
              {new Date(customer.createdAt).toLocaleDateString('ja-JP', { year: 'numeric', month: 'long', day: 'numeric' })}
            </div>
          </div>

          {/* キーポイント */}
          <div className="mt-[8px] -mx-[8px] px-[8px]">
            <div
              className="flex items-center min-h-[34px] text-[14px] cursor-pointer hover:bg-[#f7f6f5] rounded-[3px] px-[8px] -mx-[8px]"
              onClick={() => setShowKeypointsExpanded(!showKeypointsExpanded)}
            >
              <div className="w-[160px] flex items-center gap-[6px] text-[#9b9a97]">
                <Lightbulb className="h-[14px] w-[14px]" />
                <span>キーポイント</span>
              </div>
              <div className="flex-1 flex items-center gap-[8px]">
                <span className="text-[#37352f]">{keypoints.length}件</span>
                <ChevronDown className={`h-[14px] w-[14px] text-[#9b9a97] transition-transform ${showKeypointsExpanded ? 'rotate-180' : ''}`} />
              </div>
            </div>

            {/* 展開時のキーポイント一覧 */}
            {showKeypointsExpanded && (
              <div className="mt-[8px] ml-[8px] border-l-2 border-[#e3e2e0] pl-[16px]">
                {/* 追加ボタン */}
                <button
                  onClick={() => setShowAddKeypoint(true)}
                  className="flex items-center gap-[6px] text-[13px] text-[#9b9a97] hover:text-[#37352f] hover:bg-[#f7f6f5] rounded-[3px] px-[8px] py-[6px] mb-[8px] transition-colors"
                >
                  <Plus className="h-[14px] w-[14px]" />
                  <span>キーポイントを追加</span>
                </button>

                {/* 新規追加フォーム */}
                {showAddKeypoint && (
                  <div className="mb-[12px] p-[12px] bg-[#f7f6f5] rounded-[6px] border border-[#e3e2e0]">
                    <div className="flex gap-[8px] mb-[8px]">
                      {KEYPOINT_CATEGORIES.map((cat) => (
                        <button
                          key={cat.value}
                          onClick={() => setNewKeypointCategory(cat.value)}
                          className={`flex items-center gap-[4px] px-[8px] py-[4px] text-[12px] rounded-[4px] border transition-colors ${
                            newKeypointCategory === cat.value
                              ? 'bg-[#37352f] text-white border-[#37352f]'
                              : 'bg-white text-[#37352f] border-[#e3e2e0] hover:border-[#37352f]'
                          }`}
                        >
                          <span>{cat.icon}</span>
                          <span>{cat.label}</span>
                        </button>
                      ))}
                    </div>
                    <input
                      type="text"
                      value={newKeypointContent}
                      onChange={(e) => setNewKeypointContent(e.target.value)}
                      placeholder="キーポイントを入力..."
                      className="w-full px-[10px] py-[8px] text-[13px] border border-[#e3e2e0] rounded-[4px] outline-none focus:border-[#37352f] mb-[8px]"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.nativeEvent.isComposing) {
                          addKeypoint()
                        }
                      }}
                      autoFocus
                    />
                    <div className="flex justify-end gap-[8px]">
                      <button
                        onClick={() => {
                          setShowAddKeypoint(false)
                          setNewKeypointContent('')
                        }}
                        className="px-[12px] py-[6px] text-[12px] text-[#9b9a97] hover:text-[#37352f] transition-colors"
                      >
                        キャンセル
                      </button>
                      <button
                        onClick={addKeypoint}
                        disabled={!newKeypointContent.trim()}
                        className="px-[12px] py-[6px] text-[12px] bg-[#37352f] text-white rounded-[4px] hover:bg-[#2f2e2b] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      >
                        追加
                      </button>
                    </div>
                  </div>
                )}

                {/* キーポイント一覧（日付順） */}
                {keypoints
                  .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
                  .map((kp) => {
                    const category = KEYPOINT_CATEGORIES.find(c => c.value === kp.category)
                    return (
                      <div key={kp.id} className="group flex items-start gap-[8px] py-[8px] border-b border-[#f0efed] last:border-b-0">
                        <span className="text-[16px] flex-shrink-0 mt-[2px]">{category?.icon || '📝'}</span>
                        <div className="flex-1 min-w-0">
                          <p className="text-[13px] text-[#37352f]">{kp.content}</p>
                          <p className="text-[11px] text-[#9b9a97] mt-[2px]">
                            {new Date(kp.createdAt).toLocaleDateString('ja-JP', { year: 'numeric', month: 'short', day: 'numeric' })}
                          </p>
                        </div>
                        <button
                          onClick={() => deleteKeypoint(kp.id)}
                          className="opacity-0 group-hover:opacity-100 p-[4px] text-[#9b9a97] hover:text-[#d44c47] hover:bg-[#ebebea] rounded-[3px] transition-all"
                        >
                          <Trash2 className="h-[12px] w-[12px]" />
                        </button>
                      </div>
                    )
                  })}

                {keypoints.length === 0 && !showAddKeypoint && (
                  <p className="text-[13px] text-[#9b9a97] py-[12px]">
                    キーポイントがありません
                  </p>
                )}
              </div>
            )}
          </div>

          {/* 見積もり履歴 */}
          <div className="flex items-start min-h-[34px] text-[14px] group">
            <div className="w-[160px] flex items-center gap-[6px] text-[#9b9a97] pt-[6px]">
              <FileText className="h-[14px] w-[14px]" />
              <span>見積もり</span>
              {customerEstimates.length > 0 && (
                <span className="text-[12px]">({customerEstimates.length})</span>
              )}
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-[8px] mb-[8px]">
                <Link
                  href={`/dashboard/estimates?customerId=${customerId}&customerName=${encodeURIComponent(customer?.name || '')}`}
                  className="inline-flex items-center gap-[4px] px-[8px] py-[4px] text-[12px] text-[#37352f] bg-[#f7f6f5] hover:bg-[#ebebea] rounded-[4px] transition-colors"
                >
                  <Plus className="h-[12px] w-[12px]" />
                  新規作成
                </Link>
              </div>
              {customerEstimates.length > 0 ? (
                <div className="space-y-[4px]">
                  {customerEstimates.slice(0, 5).map((estimate) => (
                    <Link
                      key={estimate.id}
                      href={`/dashboard/estimates?edit=${estimate.id}`}
                      className="flex items-center gap-[12px] px-[10px] py-[8px] bg-[#f7f6f5] hover:bg-[#ebebea] rounded-[4px] transition-colors group"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-[8px]">
                          <span className="text-[13px] font-medium text-[#37352f]">{estimate.estimateNo}</span>
                          {estimate.rank && (
                            <span className={`px-[6px] py-[1px] text-[10px] font-medium rounded ${
                              estimate.rank === 'A' ? 'bg-[#fce4e4] text-[#d44c47]' :
                              estimate.rank === 'B' ? 'bg-[#fef3cd] text-[#cb912f]' :
                              'bg-[#dbeddb] text-[#448361]'
                            }`}>
                              {estimate.rank}
                            </span>
                          )}
                          {estimate.status === 'accepted' && (
                            <span className="px-[6px] py-[1px] text-[10px] font-medium rounded bg-[#dbeddb] text-[#448361]">
                              成約
                            </span>
                          )}
                        </div>
                        <p className="text-[12px] text-[#9b9a97] truncate">{estimate.vehicleName || '車両未選択'}</p>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <p className="text-[13px] font-bold text-[#337ea9]">{formatCurrency(estimate.totalAmount)}</p>
                        <p className="text-[11px] text-[#9b9a97]">{formatEstimateDate(estimate.createdAt)}</p>
                      </div>
                    </Link>
                  ))}
                  {customerEstimates.length > 5 && (
                    <p className="text-[12px] text-[#9b9a97] px-[10px] py-[4px]">
                      他 {customerEstimates.length - 5} 件の見積もり
                    </p>
                  )}
                </div>
              ) : (
                <p className="text-[13px] text-[#9b9a97] py-[4px]">見積もりがありません</p>
              )}
            </div>
          </div>
        </div>

        {/* Notion風アクションボタン */}
        <div className="flex gap-[8px] mb-[24px]">
          <button
            onClick={() => setShowCallModal(true)}
            className="inline-flex items-center gap-[6px] px-[12px] py-[6px] text-[14px] text-[#37352f] bg-white border border-[#e3e2e0] rounded-[4px] hover:bg-[#f7f6f5] transition-colors shadow-[0_1px_2px_rgba(0,0,0,0.04)]"
          >
            <PhoneCall className="h-[14px] w-[14px] text-[#448361]" />
            電話記録
          </button>
          <button
            onClick={() => setShowEmailModal(true)}
            disabled={!customer.email}
            className="inline-flex items-center gap-[6px] px-[12px] py-[6px] text-[14px] text-[#37352f] bg-white border border-[#e3e2e0] rounded-[4px] hover:bg-[#f7f6f5] transition-colors shadow-[0_1px_2px_rgba(0,0,0,0.04)] disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Mail className="h-[14px] w-[14px] text-[#337ea9]" />
            メール記録
          </button>
        </div>

        {/* 区切り線（Notion風） */}
        <div className="py-[8px] mb-[16px]">
          <hr className="border-0 h-[1px] bg-[#e3e2e0]" />
        </div>

        {/* Notion風ブロックエディタ */}
        <div className="min-h-[400px] pl-[60px] relative">
          {/* ブロック一覧 */}
          <div>
            {blocks.map((block) => (
              <NotionBlock
                key={block.id}
                block={block}
                onUpdate={updateBlock}
                onDelete={deleteBlock}
                onAddBelow={addBlock}
                onDuplicate={duplicateBlock}
                onKeyDown={handleBlockKeyDown}
                isActive={activeBlockId === block.id}
                onFocus={setActiveBlockId}
              />
            ))}
          </div>

          {/* 新規ブロック追加（Notion風） */}
          <button
            onClick={() => addBlock()}
            className="w-full mt-[4px] py-[6px] text-left text-[#c3c2c1] hover:text-[#9b9a97] rounded-[3px] flex items-center gap-[8px] transition-colors text-[15px]"
          >
            <span>新しいブロックを追加するには Enter を押すか、「/」でコマンドを入力...</span>
          </button>

          {/* ブロックタイプメニュー（Notion風） */}
          {showBlockMenu && (
            <>
              {/* 背景オーバーレイ */}
              <div
                className="fixed inset-0 z-40"
                onClick={() => setShowBlockMenu(false)}
              />
              {/* メニュー本体 */}
              <div className="absolute left-0 mt-2 z-50 bg-white rounded-[8px] shadow-[0_0_0_1px_rgba(15,15,15,0.05),0_3px_6px_rgba(15,15,15,0.1),0_9px_24px_rgba(15,15,15,0.2)] w-[320px] py-[8px] max-h-[350px] overflow-y-auto">
                <div className="px-[14px] py-[6px] text-[11px] text-[#9b9a97] font-medium uppercase tracking-wider">ベーシックブロック</div>
                {BLOCK_TYPES.map((bt) => (
                  <button
                    key={bt.type}
                    onClick={() => {
                      if (activeBlockId) {
                        updateBlock(activeBlockId, { type: bt.type })
                      }
                      setShowBlockMenu(false)
                    }}
                    className="w-full px-[14px] py-[6px] text-left hover:bg-[#f7f6f5] flex items-center gap-[10px] transition-colors"
                  >
                    <div className="w-[40px] h-[40px] bg-[#f7f6f5] border border-[#e3e2e0] rounded-[6px] flex items-center justify-center text-[#787774]">
                      {bt.icon}
                    </div>
                    <div className="flex-1">
                      <div className="text-[14px] text-[#37352f] font-medium">{bt.label}</div>
                      {bt.shortcut && (
                        <div className="text-[12px] text-[#9b9a97]">{bt.shortcut}</div>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {/* 電話記録モーダル（Notion風 + 文字起こし機能） */}
      {showCallModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center font-[-apple-system,BlinkMacSystemFont,'Segoe_UI',Helvetica,Arial,sans-serif]">
          <div className="fixed inset-0 bg-black/60" onClick={handleCloseCallModal} />
          <div className="relative bg-white rounded-[4px] shadow-[0_0_0_1px_rgba(15,15,15,0.05),0_3px_6px_rgba(15,15,15,0.1),0_9px_24px_rgba(15,15,15,0.2)] w-full max-w-[540px] mx-4 max-h-[90vh] overflow-hidden">
            <div className="flex items-center justify-between px-[16px] py-[12px]">
              <h2 className="text-[16px] font-semibold text-[#37352f] flex items-center gap-[8px]">
                <div className="flex items-center justify-center w-[24px] h-[24px] rounded-[4px] bg-[#dbeddb]">
                  <PhoneCall className="h-[14px] w-[14px] text-[#448361]" />
                </div>
                電話記録を追加
              </h2>
              <button onClick={handleCloseCallModal} className="p-[4px] hover:bg-[#ebebea] rounded-[4px] text-[#9b9a97] hover:text-[#37352f] transition-colors">
                <X className="h-[18px] w-[18px]" />
              </button>
            </div>
            <div className="px-[16px] pb-[16px] space-y-[16px] overflow-y-auto" style={{ maxHeight: 'calc(90vh - 140px)' }}>
              {/* 録音・文字起こしセクション */}
              {speechSupported && (
                <div className="p-[16px] bg-gradient-to-r from-[#f0f7ff] to-[#f5f0ff] rounded-[8px] border border-[#e3e2e0]">
                  <div className="flex items-center justify-between mb-[12px]">
                    <div className="flex items-center gap-[8px]">
                      <Volume2 className="h-[16px] w-[16px] text-[#9065b0]" />
                      <span className="text-[14px] font-medium text-[#37352f]">音声文字起こし</span>
                    </div>
                    {isRecording && (
                      <div className="flex items-center gap-[6px]">
                        <span className="relative flex h-[8px] w-[8px]">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-[8px] w-[8px] bg-red-500"></span>
                        </span>
                        <span className="text-[13px] font-mono text-[#d44c47]">
                          {String(Math.floor(recordingTime / 60)).padStart(2, '0')}:{String(recordingTime % 60).padStart(2, '0')}
                        </span>
                      </div>
                    )}
                  </div>

                  <div className="flex gap-[8px] mb-[12px]">
                    {!isRecording ? (
                      <button
                        onClick={startRecording}
                        className="flex-1 flex items-center justify-center gap-[8px] px-[16px] py-[10px] bg-[#9065b0] hover:bg-[#7d58a0] text-white rounded-[6px] transition-colors"
                      >
                        <Mic className="h-[18px] w-[18px]" />
                        <span className="text-[14px] font-medium">録音開始</span>
                      </button>
                    ) : (
                      <button
                        onClick={stopRecording}
                        className="flex-1 flex items-center justify-center gap-[8px] px-[16px] py-[10px] bg-[#d44c47] hover:bg-[#c43c37] text-white rounded-[6px] transition-colors"
                      >
                        <Square className="h-[16px] w-[16px]" />
                        <span className="text-[14px] font-medium">録音停止</span>
                      </button>
                    )}
                  </div>

                  {/* リアルタイム文字起こし表示 */}
                  {(isRecording || transcript) && (
                    <div className="bg-white rounded-[4px] border border-[#e3e2e0] p-[12px] min-h-[60px] max-h-[120px] overflow-y-auto">
                      {transcript && (
                        <p className="text-[14px] text-[#37352f] whitespace-pre-wrap">{transcript}</p>
                      )}
                      {interimTranscript && (
                        <p className="text-[14px] text-[#9b9a97] italic">{interimTranscript}</p>
                      )}
                      {isRecording && !transcript && !interimTranscript && (
                        <p className="text-[13px] text-[#9b9a97] flex items-center gap-[6px]">
                          <Loader2 className="h-[14px] w-[14px] animate-spin" />
                          話しかけてください...
                        </p>
                      )}
                    </div>
                  )}

                  <p className="text-[12px] text-[#9b9a97] mt-[8px]">
                    🎤 録音すると自動で文字起こしされ、通話内容に追加されます
                  </p>
                </div>
              )}

              {/* 通話時間 */}
              <div>
                <label className="block text-[14px] text-[#9b9a97] mb-[6px]">通話時間</label>
                <div className="flex items-center gap-[8px]">
                  <input
                    type="number"
                    min="0"
                    value={callDuration.mins}
                    onChange={(e) => setCallDuration({ ...callDuration, mins: parseInt(e.target.value) || 0 })}
                    className="w-[64px] px-[10px] py-[6px] text-[14px] border border-[#e3e2e0] rounded-[4px] focus:outline-none focus:ring-2 focus:ring-[#2eaadc] focus:border-transparent"
                    disabled={isRecording}
                  />
                  <span className="text-[14px] text-[#9b9a97]">分</span>
                  <input
                    type="number"
                    min="0"
                    max="59"
                    value={callDuration.secs}
                    onChange={(e) => setCallDuration({ ...callDuration, secs: parseInt(e.target.value) || 0 })}
                    className="w-[64px] px-[10px] py-[6px] text-[14px] border border-[#e3e2e0] rounded-[4px] focus:outline-none focus:ring-2 focus:ring-[#2eaadc] focus:border-transparent"
                    disabled={isRecording}
                  />
                  <span className="text-[14px] text-[#9b9a97]">秒</span>
                  {isRecording && (
                    <span className="text-[12px] text-[#9b9a97] ml-[8px]">（録音中は自動計測）</span>
                  )}
                </div>
              </div>

              {/* 通話内容 */}
              <div>
                <label className="block text-[14px] text-[#9b9a97] mb-[6px]">通話内容</label>
                <textarea
                  value={callContent}
                  onChange={(e) => setCallContent(e.target.value)}
                  placeholder="通話の内容をメモ...（録音すると自動入力されます）"
                  rows={6}
                  className="w-full px-[10px] py-[8px] text-[14px] border border-[#e3e2e0] rounded-[4px] focus:outline-none focus:ring-2 focus:ring-[#2eaadc] focus:border-transparent placeholder:text-[#c3c2c1] resize-none"
                />
              </div>
            </div>
            <div className="flex justify-end gap-[8px] px-[16px] py-[12px] border-t border-[#e3e2e0]">
              <button
                onClick={handleCloseCallModal}
                className="px-[12px] py-[6px] text-[14px] text-[#37352f] hover:bg-[#ebebea] rounded-[4px] transition-colors"
              >
                キャンセル
              </button>
              <button
                onClick={addCallLog}
                disabled={!callContent.trim() || isRecording}
                className="px-[12px] py-[6px] text-[14px] text-white bg-[#2eaadc] hover:bg-[#2eaadc]/90 rounded-[4px] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                追加
              </button>
            </div>
          </div>
        </div>
      )}

      {/* メール記録モーダル（Notion風） */}
      {showEmailModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center font-[-apple-system,BlinkMacSystemFont,'Segoe_UI',Helvetica,Arial,sans-serif]">
          <div className="fixed inset-0 bg-black/60" onClick={() => setShowEmailModal(false)} />
          <div className="relative bg-white rounded-[4px] shadow-[0_0_0_1px_rgba(15,15,15,0.05),0_3px_6px_rgba(15,15,15,0.1),0_9px_24px_rgba(15,15,15,0.2)] w-full max-w-[600px] mx-4 max-h-[90vh] overflow-hidden">
            <div className="flex items-center justify-between px-[16px] py-[12px]">
              <h2 className="text-[16px] font-semibold text-[#37352f] flex items-center gap-[8px]">
                <div className="flex items-center justify-center w-[24px] h-[24px] rounded-[4px] bg-[#d3e5ef]">
                  <Mail className="h-[14px] w-[14px] text-[#337ea9]" />
                </div>
                メール記録を追加
              </h2>
              <button onClick={() => setShowEmailModal(false)} className="p-[4px] hover:bg-[#ebebea] rounded-[4px] text-[#9b9a97] hover:text-[#37352f] transition-colors">
                <X className="h-[18px] w-[18px]" />
              </button>
            </div>
            <div className="px-[16px] pb-[16px] space-y-[16px] overflow-y-auto" style={{ maxHeight: 'calc(90vh - 120px)' }}>
              <div>
                <label className="block text-[14px] text-[#9b9a97] mb-[6px]">テンプレート</label>
                <div className="flex flex-wrap gap-[6px]">
                  <button
                    onClick={() => applyEmailTemplate('followup')}
                    className="px-[10px] py-[4px] text-[13px] text-[#37352f] bg-[#f7f6f5] hover:bg-[#ebebea] rounded-[4px] transition-colors"
                  >
                    お問い合わせ対応
                  </button>
                  <button
                    onClick={() => applyEmailTemplate('thanks')}
                    className="px-[10px] py-[4px] text-[13px] text-[#37352f] bg-[#f7f6f5] hover:bg-[#ebebea] rounded-[4px] transition-colors"
                  >
                    ご来店お礼
                  </button>
                  <button
                    onClick={() => applyEmailTemplate('quote')}
                    className="px-[10px] py-[4px] text-[13px] text-[#37352f] bg-[#f7f6f5] hover:bg-[#ebebea] rounded-[4px] transition-colors"
                  >
                    見積書送付
                  </button>
                </div>
              </div>
              <div>
                <label className="block text-[14px] text-[#9b9a97] mb-[6px]">件名</label>
                <input
                  type="text"
                  value={emailSubject}
                  onChange={(e) => setEmailSubject(e.target.value)}
                  placeholder="件名を入力..."
                  className="w-full px-[10px] py-[6px] text-[14px] border border-[#e3e2e0] rounded-[4px] focus:outline-none focus:ring-2 focus:ring-[#2eaadc] focus:border-transparent placeholder:text-[#c3c2c1]"
                />
              </div>
              <div>
                <label className="block text-[14px] text-[#9b9a97] mb-[6px]">本文</label>
                <textarea
                  value={emailBody}
                  onChange={(e) => setEmailBody(e.target.value)}
                  placeholder="メール本文を入力..."
                  rows={12}
                  className="w-full px-[10px] py-[8px] text-[14px] border border-[#e3e2e0] rounded-[4px] focus:outline-none focus:ring-2 focus:ring-[#2eaadc] focus:border-transparent placeholder:text-[#c3c2c1] resize-none font-mono"
                />
              </div>
            </div>
            <div className="flex justify-end gap-[8px] px-[16px] py-[12px] border-t border-[#e3e2e0]">
              <button
                onClick={() => setShowEmailModal(false)}
                className="px-[12px] py-[6px] text-[14px] text-[#37352f] hover:bg-[#ebebea] rounded-[4px] transition-colors"
              >
                キャンセル
              </button>
              <button
                onClick={addEmailLog}
                disabled={!emailBody.trim()}
                className="px-[12px] py-[6px] text-[14px] text-white bg-[#2eaadc] hover:bg-[#2eaadc]/90 rounded-[4px] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                記録を追加
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 簡易連絡記録モーダル */}
      {showQuickContactModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/20"
            onClick={() => setShowQuickContactModal(false)}
          />
          <div className="relative bg-white rounded-[8px] w-full max-w-[400px] mx-4 shadow-[0_8px_30px_rgba(0,0,0,0.12)]">
            <div className="flex items-center justify-between px-[16px] py-[12px]">
              <h2 className="text-[16px] font-semibold text-[#37352f] flex items-center gap-[8px]">
                <div className="flex items-center justify-center w-[24px] h-[24px] rounded-[4px] bg-[#dbeddb]">
                  <CheckCircle2 className="h-[14px] w-[14px] text-[#448361]" />
                </div>
                連絡記録
              </h2>
              <button
                onClick={() => setShowQuickContactModal(false)}
                className="p-[4px] hover:bg-[#ebebea] rounded-[4px] text-[#9b9a97] hover:text-[#37352f] transition-colors"
              >
                <X className="h-[18px] w-[18px]" />
              </button>
            </div>
            <div className="px-[16px] pb-[16px] space-y-[16px]">
              <div>
                <label className="block text-[14px] text-[#9b9a97] mb-[8px]">連絡結果</label>
                <div className="flex gap-[8px]">
                  <button
                    onClick={() => setQuickContactResult('good')}
                    className={`flex-1 flex items-center justify-center gap-[6px] px-[12px] py-[10px] rounded-[6px] border-2 transition-all ${
                      quickContactResult === 'good'
                        ? 'border-[#448361] bg-[#dbeddb] text-[#448361]'
                        : 'border-[#e3e2e0] text-[#9b9a97] hover:border-[#c3c2c1]'
                    }`}
                  >
                    <span className="text-[18px]">👍</span>
                    <span className="text-[13px] font-medium">良好</span>
                  </button>
                  <button
                    onClick={() => setQuickContactResult('neutral')}
                    className={`flex-1 flex items-center justify-center gap-[6px] px-[12px] py-[10px] rounded-[6px] border-2 transition-all ${
                      quickContactResult === 'neutral'
                        ? 'border-[#cb912f] bg-[#fdecc8] text-[#cb912f]'
                        : 'border-[#e3e2e0] text-[#9b9a97] hover:border-[#c3c2c1]'
                    }`}
                  >
                    <span className="text-[18px]">😐</span>
                    <span className="text-[13px] font-medium">普通</span>
                  </button>
                  <button
                    onClick={() => setQuickContactResult('bad')}
                    className={`flex-1 flex items-center justify-center gap-[6px] px-[12px] py-[10px] rounded-[6px] border-2 transition-all ${
                      quickContactResult === 'bad'
                        ? 'border-[#d44c47] bg-[#ffe2dd] text-[#d44c47]'
                        : 'border-[#e3e2e0] text-[#9b9a97] hover:border-[#c3c2c1]'
                    }`}
                  >
                    <span className="text-[18px]">👎</span>
                    <span className="text-[13px] font-medium">要注意</span>
                  </button>
                </div>
              </div>
              <div>
                <label className="block text-[14px] text-[#9b9a97] mb-[6px]">メモ（任意）</label>
                <textarea
                  value={quickContactNote}
                  onChange={(e) => setQuickContactNote(e.target.value)}
                  placeholder="話した内容を簡単にメモ..."
                  rows={3}
                  className="w-full px-[10px] py-[8px] text-[14px] border border-[#e3e2e0] rounded-[4px] focus:outline-none focus:ring-2 focus:ring-[#2eaadc] focus:border-transparent placeholder:text-[#c3c2c1] resize-none"
                />
              </div>
            </div>
            <div className="flex justify-end gap-[8px] px-[16px] py-[12px] border-t border-[#e3e2e0]">
              <button
                onClick={() => setShowQuickContactModal(false)}
                className="px-[12px] py-[6px] text-[14px] text-[#37352f] hover:bg-[#ebebea] rounded-[4px] transition-colors"
              >
                キャンセル
              </button>
              <button
                onClick={addQuickContact}
                disabled={!quickContactResult}
                className="px-[12px] py-[6px] text-[14px] text-white bg-[#448361] hover:bg-[#448361]/90 rounded-[4px] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                記録する
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 契約モーダル */}
      {showContractModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/30"
            onClick={() => setShowContractModal(false)}
          />
          <div className="relative bg-white rounded-[12px] w-full max-w-[480px] mx-4 shadow-[0_25px_50px_-12px_rgba(0,0,0,0.25)] overflow-hidden">
            {/* ヘッダー */}
            <div className="bg-gradient-to-r from-[#10b981] to-[#059669] px-[24px] py-[20px] text-white">
              <div className="flex items-center gap-[12px]">
                <div className="w-[48px] h-[48px] rounded-full bg-white/20 flex items-center justify-center">
                  <Sparkles className="h-[24px] w-[24px]" />
                </div>
                <div>
                  <h2 className="text-[20px] font-bold">契約おめでとうございます！</h2>
                  <p className="text-[14px] text-white/80">{customer.name}様との契約を記録します</p>
                </div>
              </div>
            </div>

            {/* フォーム */}
            <div className="p-[24px] space-y-[20px] max-h-[60vh] overflow-y-auto">
              {/* 見積もり選択 */}
              {customerEstimates.length > 0 && (
                <div>
                  <label className="block text-[14px] font-medium text-[#37352f] mb-[8px]">
                    <FileText className="inline h-[14px] w-[14px] mr-[6px] text-[#9b9a97]" />
                    契約元の見積もり
                  </label>
                  <select
                    value={selectedEstimateId}
                    onChange={(e) => {
                      const estId = e.target.value
                      setSelectedEstimateId(estId)
                      // 選択した見積もりのデータを反映
                      const selectedEst = customerEstimates.find(est => est.id === estId)
                      if (selectedEst) {
                        setContractVehicle(selectedEst.vehicleName || '')
                        setContractAmount(selectedEst.totalAmount?.toString() || '')
                        // 金額を「100万」形式に変換
                        const formatPaymentAmount = (amount: number | undefined): string => {
                          if (!amount || amount === 0) return ''
                          const man = Math.round(amount / 10000)
                          if (man >= 100) return `${Math.round(man / 100) * 100}万`
                          return ''
                        }
                        if (selectedEst.paymentTerms) {
                          setPaymentAmount1(formatPaymentAmount(selectedEst.paymentTerms.depositAmount))
                          setPaymentAmount2(formatPaymentAmount(selectedEst.paymentTerms.interimAmount))
                          setPaymentAmount3(formatPaymentAmount(selectedEst.paymentTerms.balanceAmount))
                        }
                      }
                    }}
                    className="w-full px-[12px] py-[10px] text-[14px] border border-[#e3e2e0] rounded-[6px] focus:outline-none focus:ring-2 focus:ring-[#10b981] focus:border-transparent bg-white"
                  >
                    <option value="">見積もりを選択してください</option>
                    {customerEstimates.map((est) => (
                      <option key={est.id} value={est.id}>
                        {new Date(est.createdAt).toLocaleDateString('ja-JP')} - {est.vehicleName || '車種未選択'} - ¥{(est.totalAmount || 0).toLocaleString()}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label className="block text-[14px] font-medium text-[#37352f] mb-[8px]">
                  <Car className="inline h-[14px] w-[14px] mr-[6px] text-[#9b9a97]" />
                  車種
                </label>
                <div className="w-full px-[12px] py-[10px] text-[14px] border border-[#e3e2e0] rounded-[6px] bg-[#f9f9f8] text-[#37352f]">
                  {contractVehicle || (selectedEstimateId ? '車種未選択' : '見積もりを選択してください')}
                </div>
              </div>

              {/* 家具変更有無 */}
              <div>
                <label className="block text-[14px] font-medium text-[#37352f] mb-[8px]">
                  <Sofa className="inline h-[14px] w-[14px] mr-[6px] text-[#9b9a97]" />
                  家具変更有無
                </label>
                <div className="flex gap-[8px]">
                  <button
                    type="button"
                    onClick={() => setHasFurnitureChange('yes')}
                    className={`flex-1 px-[16px] py-[10px] text-[14px] font-medium rounded-[6px] border transition-colors ${
                      hasFurnitureChange === 'yes'
                        ? 'bg-[#10b981] text-white border-[#10b981]'
                        : 'bg-white text-[#37352f] border-[#e3e2e0] hover:bg-[#f9f9f8]'
                    }`}
                  >
                    あり
                  </button>
                  <button
                    type="button"
                    onClick={() => setHasFurnitureChange('no')}
                    className={`flex-1 px-[16px] py-[10px] text-[14px] font-medium rounded-[6px] border transition-colors ${
                      hasFurnitureChange === 'no'
                        ? 'bg-[#6b7280] text-white border-[#6b7280]'
                        : 'bg-white text-[#37352f] border-[#e3e2e0] hover:bg-[#f9f9f8]'
                    }`}
                  >
                    なし
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-[14px] font-medium text-[#37352f] mb-[8px]">
                  <Wallet className="inline h-[14px] w-[14px] mr-[6px] text-[#9b9a97]" />
                  売上金額
                </label>
                <div className="relative">
                  <span className="absolute left-[12px] top-1/2 -translate-y-1/2 text-[14px] text-[#9b9a97]">¥</span>
                  <input
                    type="number"
                    value={contractAmount}
                    onChange={(e) => setContractAmount(e.target.value)}
                    placeholder="5,000,000"
                    className="w-full pl-[28px] pr-[12px] py-[10px] text-[14px] border border-[#e3e2e0] rounded-[6px] focus:outline-none focus:ring-2 focus:ring-[#10b981] focus:border-transparent"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[14px] font-medium text-[#37352f] mb-[8px]">
                  <Calendar className="inline h-[14px] w-[14px] mr-[6px] text-[#9b9a97]" />
                  納車予定日
                </label>
                <input
                  type="date"
                  value={expectedDeliveryDate}
                  onChange={(e) => setExpectedDeliveryDate(e.target.value)}
                  className="w-full px-[12px] py-[10px] text-[14px] border border-[#e3e2e0] rounded-[6px] focus:outline-none focus:ring-2 focus:ring-[#10b981] focus:border-transparent"
                />
              </div>

              {/* 入金予定（3回分） */}
              <div className="space-y-[12px]">
                <label className="block text-[14px] font-medium text-[#37352f]">
                  <Wallet className="inline h-[14px] w-[14px] mr-[6px] text-[#9b9a97]" />
                  入金予定
                </label>

                {/* 1回目（手付金） */}
                <div className="flex items-center gap-[12px] p-[12px] bg-[#f9f9f8] rounded-[6px]">
                  <span className="text-[13px] font-medium text-[#37352f] w-[60px]">1回目</span>
                  <div className="flex-1">
                    <input
                      type="date"
                      value={paymentDate1}
                      onChange={(e) => setPaymentDate1(e.target.value)}
                      className="w-full px-[10px] py-[8px] text-[13px] border border-[#e3e2e0] rounded-[4px] focus:outline-none focus:ring-2 focus:ring-[#10b981] focus:border-transparent"
                    />
                  </div>
                  <div className="relative w-[120px]">
                    <input
                      type="number"
                      value={paymentAmount1.replace('万', '')}
                      onChange={(e) => setPaymentAmount1(e.target.value ? `${e.target.value}万` : '')}
                      placeholder="0"
                      className="w-full px-[8px] py-[8px] pr-[28px] text-[13px] border border-[#e3e2e0] rounded-[4px] focus:outline-none focus:ring-2 focus:ring-[#10b981] focus:border-transparent text-right"
                    />
                    <span className="absolute right-[8px] top-1/2 -translate-y-1/2 text-[13px] text-[#9b9a97]">万</span>
                  </div>
                </div>

                {/* 2回目（中間金） */}
                <div className="flex items-center gap-[12px] p-[12px] bg-[#f9f9f8] rounded-[6px]">
                  <span className="text-[13px] font-medium text-[#37352f] w-[60px]">2回目</span>
                  <div className="flex-1">
                    <input
                      type="date"
                      value={paymentDate2}
                      onChange={(e) => setPaymentDate2(e.target.value)}
                      className="w-full px-[10px] py-[8px] text-[13px] border border-[#e3e2e0] rounded-[4px] focus:outline-none focus:ring-2 focus:ring-[#10b981] focus:border-transparent"
                    />
                  </div>
                  <div className="relative w-[120px]">
                    <input
                      type="number"
                      value={paymentAmount2.replace('万', '')}
                      onChange={(e) => setPaymentAmount2(e.target.value ? `${e.target.value}万` : '')}
                      placeholder="0"
                      className="w-full px-[8px] py-[8px] pr-[28px] text-[13px] border border-[#e3e2e0] rounded-[4px] focus:outline-none focus:ring-2 focus:ring-[#10b981] focus:border-transparent text-right"
                    />
                    <span className="absolute right-[8px] top-1/2 -translate-y-1/2 text-[13px] text-[#9b9a97]">万</span>
                  </div>
                </div>

                {/* 3回目（残金） */}
                <div className="flex items-center gap-[12px] p-[12px] bg-[#f9f9f8] rounded-[6px]">
                  <span className="text-[13px] font-medium text-[#37352f] w-[60px]">3回目</span>
                  <div className="flex-1">
                    <input
                      type="date"
                      value={paymentDate3}
                      onChange={(e) => setPaymentDate3(e.target.value)}
                      className="w-full px-[10px] py-[8px] text-[13px] border border-[#e3e2e0] rounded-[4px] focus:outline-none focus:ring-2 focus:ring-[#10b981] focus:border-transparent"
                    />
                  </div>
                  <div className="relative w-[120px]">
                    <input
                      type="number"
                      value={paymentAmount3.replace('万', '')}
                      onChange={(e) => setPaymentAmount3(e.target.value ? `${e.target.value}万` : '')}
                      placeholder="0"
                      className="w-full px-[8px] py-[8px] pr-[28px] text-[13px] border border-[#e3e2e0] rounded-[4px] focus:outline-none focus:ring-2 focus:ring-[#10b981] focus:border-transparent text-right"
                    />
                    <span className="absolute right-[8px] top-1/2 -translate-y-1/2 text-[13px] text-[#9b9a97]">万</span>
                  </div>
                </div>
              </div>

              {/* 残金支払方法 */}
              <div>
                <label className="block text-[14px] font-medium text-[#37352f] mb-[8px]">
                  <Wallet className="inline h-[14px] w-[14px] mr-[6px] text-[#9b9a97]" />
                  残金支払方法
                </label>
                <div className="flex gap-[12px]">
                  <button
                    type="button"
                    onClick={() => setRemainingPaymentMethod('cash')}
                    className={`flex-1 py-[10px] px-[16px] rounded-[6px] border-2 text-[14px] font-medium transition-all ${
                      remainingPaymentMethod === 'cash'
                        ? 'border-[#10b981] bg-[#d1fae5] text-[#059669]'
                        : 'border-[#e3e2e0] text-[#6b7280] hover:border-[#c3c2c1]'
                    }`}
                  >
                    現金
                  </button>
                  <button
                    type="button"
                    onClick={() => setRemainingPaymentMethod('loan')}
                    className={`flex-1 py-[10px] px-[16px] rounded-[6px] border-2 text-[14px] font-medium transition-all ${
                      remainingPaymentMethod === 'loan'
                        ? 'border-[#10b981] bg-[#d1fae5] text-[#059669]'
                        : 'border-[#e3e2e0] text-[#6b7280] hover:border-[#c3c2c1]'
                    }`}
                  >
                    ローン
                  </button>
                </div>
              </div>
            </div>

            {/* フッター */}
            <div className="flex justify-end gap-[12px] px-[24px] py-[16px] bg-[#f9f9f8] border-t border-[#e3e2e0]">
              <button
                onClick={() => {
                  setShowContractModal(false)
                  setContractAmount('')
                  setContractVehicle('')
                  setExpectedDeliveryDate('')
                  setPaymentDate1('')
                  setPaymentAmount1('')
                  setPaymentDate2('')
                  setPaymentAmount2('')
                  setPaymentDate3('')
                  setPaymentAmount3('')
                  setRemainingPaymentMethod('')
                  setSelectedEstimateId('')
                }}
                className="px-[16px] py-[10px] text-[14px] text-[#37352f] hover:bg-[#ebebea] rounded-[6px] transition-colors"
              >
                キャンセル
              </button>
              <button
                onClick={() => {
                  // 契約を記録
                  addContract({
                    customerId,
                    customerName: customer.name,
                    salesRepName: customer.assignedSalesRepName || '未割当',
                    contractDate: new Date().toISOString().split('T')[0],
                    saleAmount: parseInt(contractAmount) || 0,
                    profit: 0,
                    vehicleModel: contractVehicle,
                    isDelivered: false,
                    expectedDeliveryDate: expectedDeliveryDate || undefined,
                    // 入金予定（3回分）
                    payment1Date: paymentDate1 || undefined,
                    payment1Amount: paymentAmount1 || undefined,
                    payment2Date: paymentDate2 || undefined,
                    payment2Amount: paymentAmount2 || undefined,
                    payment3Date: paymentDate3 || undefined,
                    payment3Amount: paymentAmount3 || undefined,
                    // 残金支払方法
                    remainingPaymentMethod: remainingPaymentMethod === 'cash' ? PaymentMethod.CASH : remainingPaymentMethod === 'loan' ? PaymentMethod.LOAN : undefined,
                    // 見積もりID
                    estimateId: selectedEstimateId || undefined,
                    // 家具変更有無
                    hasFurnitureChange: hasFurnitureChange === 'yes' ? true : hasFurnitureChange === 'no' ? false : undefined,
                  })

                  // ステータスを契約に変更
                  updateCustomerStatus(customerId, CustomerStatus.CONTRACT)

                  // モーダルを閉じる
                  setShowContractModal(false)
                  setContractAmount('')
                  setContractVehicle('')
                  setExpectedDeliveryDate('')
                  setPaymentDate1('')
                  setPaymentAmount1('')
                  setPaymentDate2('')
                  setPaymentAmount2('')
                  setPaymentDate3('')
                  setPaymentAmount3('')
                  setRemainingPaymentMethod('')
                  setSelectedEstimateId('')
                  setHasFurnitureChange('')

                  // 契約登録後、原価計算ページへ遷移
                  router.push('/dashboard/quotes')
                }}
                disabled={!contractAmount}
                className="px-[20px] py-[10px] text-[14px] text-white bg-gradient-to-r from-[#10b981] to-[#059669] hover:from-[#059669] hover:to-[#047857] rounded-[6px] transition-all font-medium disabled:opacity-50 disabled:cursor-not-allowed shadow-md"
              >
                契約を記録する
              </button>
            </div>
          </div>
        </div>
      )}

      {/* AIエージェントチャット（右下フローティング） */}
      <div className="fixed bottom-[24px] right-[24px] z-40">
        {/* チャットウィンドウ */}
        {showAIChat && (
          <div className="absolute bottom-[64px] right-0 w-[380px] bg-white rounded-[12px] shadow-[0_8px_30px_rgba(0,0,0,0.12)] border border-[#e3e2e0] overflow-hidden">
            {/* ヘッダー */}
            <div className="flex items-center justify-between px-[16px] py-[12px] bg-gradient-to-r from-[#9065b0] to-[#c14c8a] text-white">
              <div className="flex items-center gap-[10px]">
                <div className="w-[32px] h-[32px] rounded-full bg-white/20 flex items-center justify-center">
                  <Sparkles className="h-[18px] w-[18px]" />
                </div>
                <div>
                  <div className="text-[14px] font-semibold">AIアシスタント</div>
                  <div className="text-[11px] text-white/80">会話のヒントをお伝えします</div>
                </div>
              </div>
              <button
                onClick={() => setShowAIChat(false)}
                className="p-[4px] hover:bg-white/20 rounded-[4px] transition-colors"
              >
                <ChevronUp className="h-[20px] w-[20px]" />
              </button>
            </div>

            {/* メッセージエリア */}
            <div className="h-[320px] overflow-y-auto p-[16px] space-y-[12px] bg-[#fafafa]">
              {aiMessages.length === 0 ? (
                <div className="text-center py-[40px]">
                  <div className="w-[48px] h-[48px] mx-auto mb-[12px] rounded-full bg-[#e8deee] flex items-center justify-center">
                    <Bot className="h-[24px] w-[24px] text-[#9065b0]" />
                  </div>
                  <p className="text-[14px] text-[#37352f] font-medium mb-[4px]">
                    こんにちは！
                  </p>
                  <p className="text-[13px] text-[#9b9a97] mb-[16px]">
                    {customer?.name}さんへの連絡で<br />お困りのことはありますか？
                  </p>
                  <div className="space-y-[8px]">
                    <button
                      onClick={() => {
                        setAiInput('どんな挨拶をすればいい？')
                        setTimeout(() => sendAiMessage(), 100)
                      }}
                      className="w-full px-[12px] py-[8px] text-[13px] text-[#37352f] bg-white hover:bg-[#ebebea] rounded-[6px] border border-[#e3e2e0] transition-colors text-left"
                    >
                      💬 どんな挨拶をすればいい？
                    </button>
                    <button
                      onClick={() => {
                        setAiInput('今の状況に合った提案は？')
                        setTimeout(() => sendAiMessage(), 100)
                      }}
                      className="w-full px-[12px] py-[8px] text-[13px] text-[#37352f] bg-white hover:bg-[#ebebea] rounded-[6px] border border-[#e3e2e0] transition-colors text-left"
                    >
                      💡 今の状況に合った提案は？
                    </button>
                    <button
                      onClick={() => {
                        setAiInput('キャンピングカーの話題は？')
                        setTimeout(() => sendAiMessage(), 100)
                      }}
                      className="w-full px-[12px] py-[8px] text-[13px] text-[#37352f] bg-white hover:bg-[#ebebea] rounded-[6px] border border-[#e3e2e0] transition-colors text-left"
                    >
                      🚐 キャンピングカーの話題は？
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  {aiMessages.map((msg, idx) => (
                    <div
                      key={idx}
                      className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                    >
                      <div
                        className={`max-w-[85%] px-[12px] py-[8px] rounded-[12px] text-[14px] leading-relaxed ${
                          msg.role === 'user'
                            ? 'bg-[#9065b0] text-white rounded-br-[4px]'
                            : 'bg-white text-[#37352f] border border-[#e3e2e0] rounded-bl-[4px]'
                        }`}
                      >
                        {msg.content}
                      </div>
                    </div>
                  ))}
                  {isAiLoading && (
                    <div className="flex justify-start">
                      <div className="bg-white px-[12px] py-[8px] rounded-[12px] rounded-bl-[4px] border border-[#e3e2e0]">
                        <Loader2 className="h-[16px] w-[16px] text-[#9065b0] animate-spin" />
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>

            {/* 入力エリア */}
            <div className="p-[12px] border-t border-[#e3e2e0] bg-white">
              <div className="flex gap-[8px]">
                <input
                  type="text"
                  value={aiInput}
                  onChange={(e) => setAiInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && sendAiMessage()}
                  placeholder="質問を入力..."
                  className="flex-1 px-[12px] py-[8px] text-[14px] border border-[#e3e2e0] rounded-[8px] focus:outline-none focus:ring-2 focus:ring-[#9065b0] focus:border-transparent placeholder:text-[#c3c2c1]"
                />
                <button
                  onClick={sendAiMessage}
                  disabled={!aiInput.trim() || isAiLoading}
                  className="px-[12px] py-[8px] bg-[#9065b0] hover:bg-[#9065b0]/90 text-white rounded-[8px] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Send className="h-[16px] w-[16px]" />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* フローティングボタン */}
        <button
          onClick={() => setShowAIChat(!showAIChat)}
          className={`w-[56px] h-[56px] rounded-full shadow-lg flex items-center justify-center transition-all ${
            showAIChat
              ? 'bg-[#9065b0] hover:bg-[#9065b0]/90'
              : 'bg-gradient-to-r from-[#9065b0] to-[#c14c8a] hover:shadow-xl hover:scale-105'
          }`}
        >
          {showAIChat ? (
            <X className="h-[24px] w-[24px] text-white" />
          ) : (
            <Bot className="h-[24px] w-[24px] text-white" />
          )}
        </button>
      </div>
    </div>
  )
}
