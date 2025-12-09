'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import {
  LayoutDashboard,
  Users,
  Calculator,
  Target,
  Settings,
  LogOut,
  ScanLine,
  List,
  Truck,
  UserCheck,
  ClipboardList,
  MessageSquare,
  MessagesSquare,
  Sparkles,
  Package,
  FileText,
  Car,
  Wrench,
  UserCog,
  GripVertical,
  RotateCcw,
  Minus,
  Plus,
  Calendar,
  CheckSquare,
  BarChart3,
  Search
} from 'lucide-react'
import { useAuthStore } from '@/stores/auth-store'
import { useUserPermissionsStore, PermissionKey, roleLabels } from '@/stores/user-permissions-store'
import { useSidebarOrderStore } from '@/stores/sidebar-order-store'
import { useRouter } from 'next/navigation'
import { UserRole } from '@/types'
import { useState, DragEvent } from 'react'

// ナビゲーション項目の型定義
interface NavItem {
  name: string
  href: string
  icon: React.ElementType
  permission: PermissionKey
}

// アイコンマッピング
const iconMap: Record<PermissionKey, React.ElementType> = {
  dashboard: LayoutDashboard,
  calendar: Calendar,
  customers: Users,
  customerList: List,
  contracts: Truck,
  owners: UserCheck,
  estimates: FileText,
  quotesNew: Calculator,
  quotesUsed: Calculator,
  results: BarChart3,
  targets: Target,
  chat: MessageSquare,
  showroomNew: Sparkles,
  showroomUsed: Package,
  adminVehicles: Car,
  adminEstimateSettings: Wrench,
  adminMarketPrice: Search,
  adminUserManagement: UserCog,
  settings: Settings,
}

// 名前マッピング
const nameMap: Record<PermissionKey, string> = {
  dashboard: 'ダッシュボード',
  calendar: 'カレンダー',
  customers: '顧客カンバン',
  customerList: '顧客管理リスト',
  contracts: '契約・納車待ち',
  owners: 'オーナーリスト',
  estimates: '見積もり作成',
  quotesNew: '新車原価計算',
  quotesUsed: '中古車原価計算',
  results: '営業結果',
  targets: '営業目標',
  chat: '社内チャット',
  showroomNew: '新車展示車ステータス',
  showroomUsed: '中古車ステータス',
  adminVehicles: '車両管理',
  adminEstimateSettings: '見積設定',
  adminMarketPrice: '相場検索',
  adminUserManagement: 'ユーザー管理',
  settings: '設定',
}

// URLマッピング
const hrefMap: Record<PermissionKey, string> = {
  dashboard: '/dashboard',
  calendar: '/dashboard/calendar',
  customers: '/dashboard/customers',
  customerList: '/dashboard/customer-list',
  contracts: '/dashboard/contracts',
  owners: '/dashboard/owners',
  estimates: '/dashboard/estimates',
  quotesNew: '/dashboard/quotes-new',
  quotesUsed: '/dashboard/quotes-used',
  results: '/dashboard/results',
  targets: '/dashboard/targets',
  chat: '/dashboard/chat',
  showroomNew: '/dashboard/showroom-new',
  showroomUsed: '/dashboard/showroom-used',
  adminVehicles: '/dashboard/admin/vehicles',
  adminEstimateSettings: '/dashboard/admin/estimate-settings',
  adminMarketPrice: '/dashboard/admin/market-price',
  adminUserManagement: '/dashboard/admin/users',
  settings: '/dashboard/settings',
}

export function Sidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const { user, logout } = useAuthStore()
  const { hasPermission } = useUserPermissionsStore()
  const {
    navigationOrder,
    adminNavigationOrder,
    setNavigationOrder,
    setAdminNavigationOrder,
    isEditMode,
    setEditMode,
    resetOrder,
    toggleSeparator,
    hasSeparator
  } = useSidebarOrderStore()

  // ドラッグ状態
  const [draggedItem, setDraggedItem] = useState<PermissionKey | null>(null)
  const [dragOverItem, setDragOverItem] = useState<PermissionKey | null>(null)
  const [dragSection, setDragSection] = useState<'main' | 'admin' | null>(null)

  const handleLogout = () => {
    logout()
    router.push('/login')
  }

  // ユーザーのロールを取得（デフォルトは管理者として全権限を持つ）
  const userRole = user?.role || UserRole.ADMIN
  const isAdmin = userRole === UserRole.ADMIN

  // 権限に基づいてナビゲーション項目をフィルタリング & 並び替え
  const filteredNavigation = navigationOrder
    .filter(permission => hasPermission(userRole, permission))
    .map(permission => ({
      name: nameMap[permission],
      href: hrefMap[permission],
      icon: iconMap[permission],
      permission,
    }))

  const filteredAdminNavigation = adminNavigationOrder
    .filter(permission => hasPermission(userRole, permission))
    .map(permission => ({
      name: nameMap[permission],
      href: hrefMap[permission],
      icon: iconMap[permission],
      permission,
    }))

  // ロールラベルを取得
  const roleLabel = roleLabels[userRole] || '不明'

  // ドラッグ開始
  const handleDragStart = (e: DragEvent<HTMLDivElement>, permission: PermissionKey, section: 'main' | 'admin') => {
    setDraggedItem(permission)
    setDragSection(section)
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('text/plain', permission)
  }

  // ドラッグオーバー
  const handleDragOver = (e: DragEvent<HTMLDivElement>, permission: PermissionKey) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    if (draggedItem !== permission) {
      setDragOverItem(permission)
    }
  }

  // ドラッグ終了
  const handleDragEnd = () => {
    setDraggedItem(null)
    setDragOverItem(null)
    setDragSection(null)
  }

  // ドロップ
  const handleDrop = (e: DragEvent<HTMLDivElement>, targetPermission: PermissionKey, section: 'main' | 'admin') => {
    e.preventDefault()

    if (!draggedItem || dragSection !== section) {
      handleDragEnd()
      return
    }

    const orderList = section === 'main' ? [...navigationOrder] : [...adminNavigationOrder]
    const setOrder = section === 'main' ? setNavigationOrder : setAdminNavigationOrder

    const draggedIndex = orderList.indexOf(draggedItem)
    const targetIndex = orderList.indexOf(targetPermission)

    if (draggedIndex !== -1 && targetIndex !== -1 && draggedIndex !== targetIndex) {
      orderList.splice(draggedIndex, 1)
      orderList.splice(targetIndex, 0, draggedItem)
      setOrder(orderList)
    }

    handleDragEnd()
  }

  // ナビゲーションアイテムのレンダリング
  const renderNavItem = (item: NavItem, section: 'main' | 'admin') => {
    const isActive = pathname === item.href || (section === 'admin' && pathname.startsWith(item.href + '/'))
    const isDragging = draggedItem === item.permission
    const isDragOver = dragOverItem === item.permission
    const showSeparator = hasSeparator(item.permission, section)

    if (isEditMode && isAdmin) {
      return (
        <div key={item.permission}>
          <div className="flex items-center gap-2">
            <div
              draggable
              onDragStart={(e) => handleDragStart(e, item.permission, section)}
              onDragOver={(e) => handleDragOver(e, item.permission)}
              onDrop={(e) => handleDrop(e, item.permission, section)}
              onDragEnd={handleDragEnd}
              className={cn(
                'group flex-1 min-w-0 flex items-center px-3 py-2.5 text-sm font-medium rounded-lg transition-all duration-150 cursor-grab active:cursor-grabbing',
                isDragging ? 'opacity-50 scale-95' : '',
                isDragOver ? 'border-t-2 border-slate-500' : '',
                isActive
                  ? 'bg-slate-100 text-slate-800'
                  : 'text-slate-700 hover:bg-slate-50'
              )}
            >
              <GripVertical className="mr-2 h-4 w-4 flex-shrink-0 text-slate-400" />
              <item.icon
                className={cn(
                  'mr-3 h-5 w-5 flex-shrink-0',
                  isActive ? 'text-slate-700' : 'text-slate-500'
                )}
              />
              <span className="flex-1 truncate text-xs">{item.name}</span>
            </div>
            {/* 区切り線追加/削除ボタン */}
            <button
              onClick={(e) => {
                e.stopPropagation()
                toggleSeparator(item.permission, section)
              }}
              className={cn(
                "flex-shrink-0 w-7 h-7 flex items-center justify-center rounded-md transition-colors duration-150",
                showSeparator
                  ? "bg-slate-700 text-white hover:bg-slate-800"
                  : "bg-slate-100 text-slate-500 hover:bg-slate-200"
              )}
              title={showSeparator ? "区切り線を削除" : "区切り線を追加"}
            >
              {showSeparator ? <Minus className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
            </button>
          </div>
          {/* 区切り線 */}
          {showSeparator && (
            <div className="my-2 border-t border-slate-200" />
          )}
        </div>
      )
    }

    return (
      <div key={item.permission}>
        <Link
          href={item.href as any}
          className={cn(
            'group flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-all duration-150',
            isActive
              ? 'bg-slate-800 text-white shadow-sm'
              : 'text-slate-700 hover:bg-slate-100'
          )}
        >
          <item.icon
            className={cn(
              'mr-3 h-5 w-5 flex-shrink-0 transition-colors duration-150',
              isActive ? 'text-white' : 'text-slate-500 group-hover:text-slate-700'
            )}
          />
          {item.name}
        </Link>
        {/* 区切り線 */}
        {showSeparator && (
          <div className="my-2 border-t border-slate-200" />
        )}
      </div>
    )
  }

  return (
    <div className="flex h-full w-60 flex-col bg-white border-r border-slate-200">
      {/* ヘッダー */}
      <div className="flex h-14 items-center px-5 border-b border-slate-200">
        <Link href="/dashboard" className="cursor-pointer">
          <h1 className="text-lg font-bold text-slate-800 tracking-tight hover:text-slate-600 transition-colors duration-150">
            CARSELL
          </h1>
        </Link>
      </div>

      {/* ユーザー情報 */}
      <div className="p-4 border-b border-slate-200">
        <div className="flex items-center space-x-3">
          <div className="h-10 w-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-700 font-medium shadow-sm">
            {user?.name?.charAt(0) || 'U'}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-slate-900 truncate">{user?.name}</p>
            <p className="text-xs text-slate-500 truncate">{user?.email}</p>
            <span className={cn(
              "inline-block mt-1 px-2 py-0.5 text-xs rounded-md-sm font-medium",
              userRole === UserRole.ADMIN ? "bg-red-50 text-red-700" :
              userRole === UserRole.MANAGER ? "bg-amber-50 text-amber-800" :
              "bg-slate-100 text-slate-700"
            )}>
              {roleLabel}
            </span>
          </div>
        </div>
      </div>

      {/* 管理者用：編集モードトグル */}
      {isAdmin && (
        <div className="px-3 py-2 border-b border-slate-200">
          <div className="flex items-center justify-between">
            <button
              onClick={() => setEditMode(!isEditMode)}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-full transition-all duration-150",
                isEditMode
                  ? "bg-slate-700 text-white"
                  : "bg-slate-100 text-slate-700 hover:bg-slate-200"
              )}
            >
              <GripVertical className="h-3 w-3" />
              {isEditMode ? '編集中' : 'メニュー並び替え'}
            </button>
            {isEditMode && (
              <button
                onClick={resetOrder}
                className="flex items-center gap-1 px-2 py-1.5 text-xs bg-slate-100 text-slate-700 rounded-full hover:bg-slate-200 transition-colors duration-150"
                title="初期順序に戻す"
              >
                <RotateCcw className="h-3 w-3" />
              </button>
            )}
          </div>
          {isEditMode && (
            <p className="mt-1 text-[10px] text-slate-500">
              ドラッグで並び替えできます
            </p>
          )}
        </div>
      )}

      {/* ナビゲーション */}
      <nav className="flex-1 px-3 py-4 overflow-y-auto">
        {/* 一般メニュー */}
        <div className="space-y-1">
          {filteredNavigation.map((item) => renderNavItem(item, 'main'))}
        </div>

        {/* 管理者ツールセクション（権限がある場合のみ表示） */}
        {filteredAdminNavigation.length > 0 && (
          <div className="mt-6 pt-6 border-t border-slate-200">
            <div className="px-4 mb-2">
              <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">
                管理者ツール
              </span>
            </div>
            <div className="space-y-1">
              {filteredAdminNavigation.map((item) => renderNavItem(item, 'admin'))}
            </div>
          </div>
        )}
      </nav>

      {/* ログアウトボタン */}
      <div className="p-4 border-t border-slate-200">
        <button
          onClick={handleLogout}
          className="group flex w-full items-center px-4 py-2.5 text-sm font-medium text-slate-700 rounded-lg hover:bg-slate-100 transition-all duration-150"
        >
          <LogOut className="mr-3 h-5 w-5 flex-shrink-0 text-slate-500 group-hover:text-slate-700" />
          ログアウト
        </button>
      </div>
    </div>
  )
}
