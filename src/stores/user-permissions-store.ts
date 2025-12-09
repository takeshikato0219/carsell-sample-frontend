import { create } from 'zustand'
import { persist, createJSONStorage, StateStorage } from 'zustand/middleware'
import { UserRole } from '@/types'

// ストアのバージョン管理
const STORE_VERSION = 1

// 機能別の権限定義
export type PermissionKey =
  | 'dashboard'           // ダッシュボード
  | 'calendar'            // カレンダー
  | 'customers'           // 顧客カンバン
  | 'customerList'        // 顧客管理リスト
  | 'contracts'           // 契約・納車待ち
  | 'owners'              // オーナーリスト
  | 'estimates'           // 見積もり作成
  | 'quotesNew'           // 新車原価計算
  | 'quotesUsed'          // 中古車原価計算
  | 'results'             // 営業結果
  | 'targets'             // 営業目標
  | 'chat'                // 社内チャット
  | 'showroomNew'         // 新車展示車ステータス
  | 'showroomUsed'        // 中古車ステータス
  | 'adminVehicles'       // 車両管理（管理者）
  | 'adminEstimateSettings' // 見積設定（管理者）
  | 'adminMarketPrice'    // 相場検索（管理者）
  | 'adminUserManagement' // ユーザー管理（管理者）
  | 'settings'            // 設定

// ユーザー情報
export interface ManagedUser {
  id: string
  name: string
  email: string
  password: string      // ログインパスワード
  role: UserRole
  color?: string        // 担当者カラー
  isActive: boolean
  createdAt: string
  updatedAt: string
}

// 権限設定（ロールごと）
export interface RolePermissions {
  [key: string]: boolean
}

// デフォルトの権限設定
const defaultAdminPermissions: RolePermissions = {
  dashboard: true,
  calendar: true,
  customers: true,
  customerList: true,
  contracts: true,
  owners: true,
  estimates: true,
  quotesNew: true,
  quotesUsed: true,
  results: true,
  targets: true,
  chat: true,
  showroomNew: true,
  showroomUsed: true,
  adminVehicles: true,
  adminEstimateSettings: true,
  adminMarketPrice: true,
  adminUserManagement: true,
  settings: true,
}

const defaultManagerPermissions: RolePermissions = {
  dashboard: true,
  calendar: true,
  customers: true,
  customerList: true,
  contracts: true,
  owners: true,
  estimates: true,
  quotesNew: true,
  quotesUsed: true,
  results: true,
  targets: true,
  chat: true,
  showroomNew: true,
  showroomUsed: true,
  adminVehicles: false,
  adminEstimateSettings: true,
  adminMarketPrice: false,
  adminUserManagement: false,
  settings: true,
}

const defaultSalesPermissions: RolePermissions = {
  dashboard: true,
  calendar: true,
  customers: true,
  customerList: true,
  contracts: true,
  owners: true,
  estimates: true,
  quotesNew: false,
  quotesUsed: false,
  results: true,
  targets: true,
  chat: true,
  showroomNew: true,
  showroomUsed: true,
  adminVehicles: false,
  adminEstimateSettings: false,
  adminMarketPrice: false,
  adminUserManagement: false,
  settings: false,
}

// サンプルユーザーデータ
const sampleUsers: ManagedUser[] = [
  {
    id: 'user-1',
    name: '管理者',
    email: 'admin@katomo.jp',
    password: 'admin123',
    role: UserRole.ADMIN,
    color: '#3B82F6',
    isActive: true,
    createdAt: '2025-01-01T00:00:00Z',
    updatedAt: '2025-01-01T00:00:00Z',
  },
  {
    id: 'user-2',
    name: '目黒',
    email: 'meguro@katomo.jp',
    password: 'meguro123',
    role: UserRole.MANAGER,
    color: '#EF4444',
    isActive: true,
    createdAt: '2025-01-01T00:00:00Z',
    updatedAt: '2025-01-01T00:00:00Z',
  },
  {
    id: 'user-3',
    name: '野島',
    email: 'nojima@katomo.jp',
    password: 'nojima123',
    role: UserRole.SALES,
    color: '#22C55E',
    isActive: true,
    createdAt: '2025-01-01T00:00:00Z',
    updatedAt: '2025-01-01T00:00:00Z',
  },
  {
    id: 'user-4',
    name: '高野晴香',
    email: 'takano@katomo.jp',
    password: 'takano123',
    role: UserRole.SALES,
    color: '#F59E0B',
    isActive: true,
    createdAt: '2025-01-01T00:00:00Z',
    updatedAt: '2025-01-01T00:00:00Z',
  },
]

interface UserPermissionsStore {
  // バージョン管理
  version: number

  // ユーザー管理
  users: ManagedUser[]
  addUser: (user: Omit<ManagedUser, 'id' | 'createdAt' | 'updatedAt'>) => void
  updateUser: (id: string, updates: Partial<ManagedUser>) => void
  deleteUser: (id: string) => void
  getUser: (id: string) => ManagedUser | undefined
  getUserByEmail: (email: string) => ManagedUser | undefined

  // 権限設定（ロールベース）
  rolePermissions: {
    admin: RolePermissions
    manager: RolePermissions
    sales: RolePermissions
  }
  updateRolePermissions: (role: UserRole, permissions: RolePermissions) => void

  // 権限チェック
  hasPermission: (role: UserRole, permission: PermissionKey) => boolean
  getPermissionsForRole: (role: UserRole) => RolePermissions

  // 担当者リスト（見積もり等で使用）
  getSalesReps: () => ManagedUser[]
}

export const useUserPermissionsStore = create<UserPermissionsStore>()(
  persist(
    (set, get) => ({
      version: STORE_VERSION,
      users: sampleUsers,

      rolePermissions: {
        admin: defaultAdminPermissions,
        manager: defaultManagerPermissions,
        sales: defaultSalesPermissions,
      },

      addUser: (userData) => {
        const now = new Date().toISOString()
        const newUser: ManagedUser = {
          ...userData,
          id: `user-${Date.now()}`,
          createdAt: now,
          updatedAt: now,
        }
        set((state) => ({
          users: [...state.users, newUser],
        }))
      },

      updateUser: (id, updates) => {
        set((state) => ({
          users: state.users.map((user) =>
            user.id === id
              ? { ...user, ...updates, updatedAt: new Date().toISOString() }
              : user
          ),
        }))
      },

      deleteUser: (id) => {
        set((state) => ({
          users: state.users.filter((user) => user.id !== id),
        }))
      },

      getUser: (id) => {
        return get().users.find((user) => user.id === id)
      },

      getUserByEmail: (email) => {
        return get().users.find((user) => user.email === email)
      },

      updateRolePermissions: (role, permissions) => {
        set((state) => ({
          rolePermissions: {
            ...state.rolePermissions,
            [role]: permissions,
          },
        }))
      },

      hasPermission: (role, permission) => {
        const permissions = get().rolePermissions[role]
        return permissions?.[permission] ?? false
      },

      getPermissionsForRole: (role) => {
        return get().rolePermissions[role] || {}
      },

      getSalesReps: () => {
        return get().users.filter((user) => user.isActive)
      },
    }),
    {
      name: 'user-permissions-storage',
      version: STORE_VERSION,
      storage: createJSONStorage(() => localStorage),
      migrate: (persistedState: any, version: number) => {
        // バージョン0から1へのマイグレーション
        if (version === 0) {
          console.log('Migrating user-permissions-storage from version 0 to 1')

          // バージョンフィールドがない場合は追加
          if (!persistedState.version) {
            persistedState.version = 1
          }

          // usersが空またはundefinedの場合、サンプルユーザーで初期化
          if (!persistedState.users || persistedState.users.length === 0) {
            persistedState.users = sampleUsers
          }

          // rolePermissionsが空またはundefinedの場合、デフォルト権限で初期化
          if (!persistedState.rolePermissions) {
            persistedState.rolePermissions = {
              admin: defaultAdminPermissions,
              manager: defaultManagerPermissions,
              sales: defaultSalesPermissions,
            }
          }

          console.log('Migration completed. Users:', persistedState.users.length)
        }

        return persistedState
      },
    }
  )
)

// 権限名の日本語ラベル
export const permissionLabels: Record<PermissionKey, string> = {
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

// ロール名の日本語ラベル
export const roleLabels: Record<UserRole, string> = {
  [UserRole.ADMIN]: '管理者',
  [UserRole.MANAGER]: '準管理者',
  [UserRole.SALES]: '一般ユーザー',
}

// 権限キーとURLパスのマッピング
export const permissionToPath: Record<PermissionKey, string> = {
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

// URLパスから権限キーを取得
export function getPermissionKeyFromPath(path: string): PermissionKey | null {
  for (const [key, value] of Object.entries(permissionToPath)) {
    if (path === value || path.startsWith(value + '/')) {
      return key as PermissionKey
    }
  }
  return null
}
