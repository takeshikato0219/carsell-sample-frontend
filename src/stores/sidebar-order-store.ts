import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import { PermissionKey } from './user-permissions-store'

// サイドバー項目の順序を管理するストア
// admin権限を持つユーザーのみが順序を変更できる

// デフォルトの一般ナビゲーション順序
const defaultNavigationOrder: PermissionKey[] = [
  'dashboard',
  'calendar',
  'customers',
  'customerList',
  'contracts',
  'owners',
  'estimates',
  'quotesNew',
  'quotesUsed',
  'results',
  'targets',
  'chat',
  'showroomNew',
  'showroomUsed',
]

// デフォルトの管理者ツールナビゲーション順序
const defaultAdminNavigationOrder: PermissionKey[] = [
  'adminVehicles',
  'adminEstimateSettings',
  'adminMarketPrice',
  'adminUserManagement',
  'settings',
]

// デフォルトの区切り線位置（空配列）
const defaultSeparators: PermissionKey[] = []
const defaultAdminSeparators: PermissionKey[] = []

interface SidebarOrderStore {
  // 一般ナビゲーションの順序
  navigationOrder: PermissionKey[]
  // 管理者ツールナビゲーションの順序
  adminNavigationOrder: PermissionKey[]

  // 区切り線の位置（この項目の後に区切り線を表示）
  separators: PermissionKey[]
  adminSeparators: PermissionKey[]

  // 順序を更新する（admin権限チェックは呼び出し側で行う）
  setNavigationOrder: (order: PermissionKey[]) => void
  setAdminNavigationOrder: (order: PermissionKey[]) => void

  // 区切り線の追加/削除
  toggleSeparator: (permission: PermissionKey, section: 'main' | 'admin') => void
  hasSeparator: (permission: PermissionKey, section: 'main' | 'admin') => boolean

  // 順序をリセット
  resetOrder: () => void

  // 編集モード
  isEditMode: boolean
  setEditMode: (enabled: boolean) => void
}

// 保存された順序に不足している項目を追加するヘルパー関数
function mergeWithDefaults(saved: PermissionKey[], defaults: PermissionKey[]): PermissionKey[] {
  const result = [...saved]
  // デフォルトにあって保存データにない項目を追加
  defaults.forEach((item, index) => {
    if (!result.includes(item)) {
      // dashboardの後ろに追加（calendarはdashboardの次）
      if (item === 'calendar') {
        const dashboardIndex = result.indexOf('dashboard')
        if (dashboardIndex !== -1) {
          result.splice(dashboardIndex + 1, 0, item)
        } else {
          result.unshift(item)
        }
      } else {
        result.push(item)
      }
    }
  })
  return result
}

export const useSidebarOrderStore = create<SidebarOrderStore>()(
  persist(
    (set, get) => ({
      navigationOrder: defaultNavigationOrder,
      adminNavigationOrder: defaultAdminNavigationOrder,
      separators: defaultSeparators,
      adminSeparators: defaultAdminSeparators,
      isEditMode: false,

      setNavigationOrder: (order) => set({ navigationOrder: order }),
      setAdminNavigationOrder: (order) => set({ adminNavigationOrder: order }),

      toggleSeparator: (permission, section) => {
        if (section === 'main') {
          const current = get().separators
          if (current.includes(permission)) {
            set({ separators: current.filter(p => p !== permission) })
          } else {
            set({ separators: [...current, permission] })
          }
        } else {
          const current = get().adminSeparators
          if (current.includes(permission)) {
            set({ adminSeparators: current.filter(p => p !== permission) })
          } else {
            set({ adminSeparators: [...current, permission] })
          }
        }
      },

      hasSeparator: (permission, section) => {
        if (section === 'main') {
          return get().separators.includes(permission)
        } else {
          return get().adminSeparators.includes(permission)
        }
      },

      resetOrder: () => set({
        navigationOrder: defaultNavigationOrder,
        adminNavigationOrder: defaultAdminNavigationOrder,
        separators: defaultSeparators,
        adminSeparators: defaultAdminSeparators,
      }),

      setEditMode: (enabled) => set({ isEditMode: enabled }),
    }),
    {
      name: 'sidebar-order-storage',
      storage: createJSONStorage(() => localStorage),
      // 保存データと新しいデフォルト値をマージ
      merge: (persistedState, currentState) => {
        const persisted = persistedState as Partial<SidebarOrderStore>
        return {
          ...currentState,
          ...persisted,
          // 新しい項目を追加
          navigationOrder: mergeWithDefaults(
            persisted.navigationOrder || [],
            defaultNavigationOrder
          ),
          adminNavigationOrder: mergeWithDefaults(
            persisted.adminNavigationOrder || [],
            defaultAdminNavigationOrder
          ),
        }
      },
    }
  )
)
