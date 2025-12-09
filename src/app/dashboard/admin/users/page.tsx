'use client'

import { useState, useMemo } from 'react'
import {
  UserCog,
  Plus,
  Edit2,
  Trash2,
  Save,
  X,
  Shield,
  ShieldCheck,
  User,
  Check,
  Eye,
  EyeOff,
  Users,
  AlertCircle,
  UserPlus,
  ArrowRight
} from 'lucide-react'
import {
  useUserPermissionsStore,
  ManagedUser,
  PermissionKey,
  permissionLabels,
  roleLabels
} from '@/stores/user-permissions-store'
import { useSettingsStore, SalesRep } from '@/stores/settings-store'
import { UserRole } from '@/types'

// Tailwindカラークラスを16進数カラーに変換
const tailwindColorToHex: Record<string, string> = {
  'bg-red-100 text-red-700': '#EF4444',
  'bg-blue-100 text-blue-700': '#3B82F6',
  'bg-green-100 text-green-700': '#22C55E',
  'bg-yellow-100 text-yellow-700': '#EAB308',
  'bg-purple-100 text-purple-700': '#A855F7',
  'bg-pink-100 text-pink-700': '#EC4899',
  'bg-indigo-100 text-indigo-700': '#6366F1',
  'bg-orange-100 text-orange-700': '#F97316',
  'bg-teal-100 text-teal-700': '#14B8A6',
  'bg-cyan-100 text-cyan-700': '#06B6D4',
}

// ランダムパスワード生成
function generateRandomPassword(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789'
  let password = ''
  for (let i = 0; i < 8; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return password
}

export default function UserManagementPage() {
  const [activeTab, setActiveTab] = useState<'users' | 'permissions' | 'salesCandidates'>('users')
  const {
    users,
    addUser,
    updateUser,
    deleteUser,
    rolePermissions,
    updateRolePermissions,
    getPermissionsForRole
  } = useUserPermissionsStore()

  // 旧担当者データ（営業ユーザー候補）
  const { salesReps, removeSalesRep, clearAllSalesReps } = useSettingsStore()

  // ユーザー管理用の状態
  const [showAddModal, setShowAddModal] = useState(false)
  const [editingUser, setEditingUser] = useState<ManagedUser | null>(null)
  const [newUser, setNewUser] = useState({
    name: '',
    email: '',
    password: '',
    role: UserRole.SALES as UserRole,
    color: '#3B82F6',
    isActive: true,
  })
  const [showPassword, setShowPassword] = useState<Record<string, boolean>>({})
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [showEditPassword, setShowEditPassword] = useState(false)

  // 権限設定用の状態
  const [selectedRole, setSelectedRole] = useState<UserRole>(UserRole.ADMIN)

  // 営業候補の選択状態
  const [selectedCandidates, setSelectedCandidates] = useState<Set<string>>(new Set())

  // 営業候補からユーザーを登録
  const registerCandidateAsUser = (rep: SalesRep) => {
    // 既に同じ名前のユーザーがいるかチェック
    const existingUser = users.find(u => u.name === rep.name)
    if (existingUser) {
      alert(`「${rep.name}」は既にユーザー一覧に登録されています。`)
      return
    }

    const hexColor = tailwindColorToHex[rep.color] || '#3B82F6'
    const password = rep.password || generateRandomPassword()

    addUser({
      name: rep.name,
      email: `${rep.loginId}@katomotor.com`,
      password: password,
      role: UserRole.SALES,
      color: hexColor,
      isActive: rep.isActive,
    })

    // 登録後、旧データから削除
    removeSalesRep(rep.id)

    alert(`「${rep.name}」をユーザー一覧に登録しました。\n\nメール: ${rep.loginId}@katomotor.com\nパスワード: ${password}`)
  }

  // 選択した営業候補を一括登録
  const registerSelectedCandidates = () => {
    if (selectedCandidates.size === 0) {
      alert('登録する担当者を選択してください。')
      return
    }

    const selectedReps = salesReps.filter(rep => selectedCandidates.has(rep.id))
    const results: string[] = []
    let registered = 0
    let skipped = 0

    selectedReps.forEach(rep => {
      const existingUser = users.find(u => u.name === rep.name)
      if (existingUser) {
        skipped++
        return
      }

      const hexColor = tailwindColorToHex[rep.color] || '#3B82F6'
      const password = rep.password || generateRandomPassword()

      addUser({
        name: rep.name,
        email: `${rep.loginId}@katomotor.com`,
        password: password,
        role: UserRole.SALES,
        color: hexColor,
        isActive: rep.isActive,
      })

      removeSalesRep(rep.id)
      registered++
      results.push(`${rep.name}: ${rep.loginId}@katomotor.com / ${password}`)
    })

    setSelectedCandidates(new Set())

    if (results.length > 0) {
      alert(`${registered}名をユーザー一覧に登録しました。${skipped > 0 ? `\n（${skipped}名は既に登録済みのためスキップ）` : ''}\n\n登録内容:\n${results.join('\n')}`)
    } else {
      alert('選択した担当者は既にユーザー一覧に登録されています。')
    }
  }

  // 営業候補の選択切り替え
  const toggleCandidateSelection = (id: string) => {
    setSelectedCandidates(prev => {
      const newSet = new Set(prev)
      if (newSet.has(id)) {
        newSet.delete(id)
      } else {
        newSet.add(id)
      }
      return newSet
    })
  }

  // 全選択/全解除
  const toggleAllCandidates = () => {
    if (selectedCandidates.size === salesReps.length) {
      setSelectedCandidates(new Set())
    } else {
      setSelectedCandidates(new Set(salesReps.map(rep => rep.id)))
    }
  }

  // ロールアイコンを取得
  const getRoleIcon = (role: UserRole) => {
    switch (role) {
      case UserRole.ADMIN:
        return <ShieldCheck className="h-5 w-5 text-red-500" />
      case UserRole.MANAGER:
        return <Shield className="h-5 w-5 text-yellow-500" />
      default:
        return <User className="h-5 w-5 text-gray-500" />
    }
  }

  // ユーザー追加
  const handleAddUser = () => {
    if (newUser.name && newUser.email && newUser.password) {
      addUser(newUser)
      setNewUser({
        name: '',
        email: '',
        password: '',
        role: UserRole.SALES,
        color: '#3B82F6',
        isActive: true,
      })
      setShowAddModal(false)
      setShowNewPassword(false)
    }
  }

  // パスワード表示切り替え
  const togglePasswordVisibility = (userId: string) => {
    setShowPassword(prev => ({
      ...prev,
      [userId]: !prev[userId]
    }))
  }

  // ユーザー更新
  const handleUpdateUser = () => {
    if (editingUser) {
      updateUser(editingUser.id, editingUser)
      setEditingUser(null)
      setShowEditPassword(false)
    }
  }

  // ユーザー削除
  const handleDeleteUser = (id: string) => {
    if (confirm('このユーザーを削除しますか？')) {
      deleteUser(id)
    }
  }

  // 権限トグル
  const togglePermission = (permission: PermissionKey) => {
    const currentPermissions = getPermissionsForRole(selectedRole)
    const newPermissions = {
      ...currentPermissions,
      [permission]: !currentPermissions[permission],
    }
    updateRolePermissions(selectedRole, newPermissions)
  }

  // 権限グループ
  const permissionGroups = useMemo(() => ({
    general: [
      'dashboard', 'scan', 'customers', 'customerList', 'contracts',
      'owners', 'estimates', 'quotes', 'targets', 'requests',
      'chat', 'externalChat', 'showroomNew', 'showroomUsed'
    ] as PermissionKey[],
    admin: [
      'adminVehicles', 'adminEstimateSettings', 'adminCostSettings',
      'adminUserManagement', 'settings'
    ] as PermissionKey[],
  }), [])

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <UserCog className="h-8 w-8 text-blue-600" />
          <div>
            <h1 className="text-2xl font-bold text-gray-900">ユーザー管理</h1>
            <p className="text-sm text-gray-600">ユーザーと権限の管理</p>
          </div>
        </div>
      </div>

      {/* タブ */}
      <div className="border-b border-gray-200 mb-6">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab('users')}
            className={`py-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'users'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            ユーザー一覧
          </button>
          <button
            onClick={() => setActiveTab('salesCandidates')}
            className={`py-4 px-1 border-b-2 font-medium text-sm flex items-center gap-2 ${
              activeTab === 'salesCandidates'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            営業ユーザー候補
            {salesReps.length > 0 && (
              <span className="bg-amber-100 text-amber-700 text-xs px-2 py-0.5 rounded-full">
                {salesReps.length}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab('permissions')}
            className={`py-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'permissions'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            権限設定
          </button>
        </nav>
      </div>

      {/* ユーザー一覧タブ */}
      {activeTab === 'users' && (
        <div className="bg-white rounded-lg shadow">
          <div className="p-4 border-b border-gray-200 flex justify-between items-center">
            <h2 className="text-lg font-semibold text-gray-900">ユーザー一覧</h2>
            <button
              onClick={() => setShowAddModal(true)}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
            >
              <Plus className="h-5 w-5" />
              ユーザー追加
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    ユーザー
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    メールアドレス
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    パスワード
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    権限
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    カラー
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    ステータス
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    操作
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {users.map((user) => (
                  <tr key={user.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div
                          className="h-10 w-10 rounded-full flex items-center justify-center text-white font-semibold"
                          style={{ backgroundColor: user.color || '#3B82F6' }}
                        >
                          {user.name.charAt(0)}
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900">{user.name}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {user.email}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-gray-600 font-mono">
                          {showPassword[user.id] ? user.password : '••••••••'}
                        </span>
                        <button
                          onClick={() => togglePasswordVisibility(user.id)}
                          className="p-1 text-gray-400 hover:text-gray-600"
                          title={showPassword[user.id] ? 'パスワードを隠す' : 'パスワードを表示'}
                        >
                          {showPassword[user.id] ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        {getRoleIcon(user.role)}
                        <span className={`px-2 py-1 text-xs rounded-full ${
                          user.role === UserRole.ADMIN ? 'bg-red-100 text-red-800' :
                          user.role === UserRole.MANAGER ? 'bg-yellow-100 text-yellow-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {roleLabels[user.role]}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div
                        className="h-6 w-6 rounded-full border border-gray-300"
                        style={{ backgroundColor: user.color || '#3B82F6' }}
                      />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 text-xs rounded-full ${
                        user.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                      }`}>
                        {user.isActive ? '有効' : '無効'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <button
                        onClick={() => setEditingUser(user)}
                        className="p-2 text-blue-600 hover:text-blue-800"
                        title="編集"
                      >
                        <Edit2 className="h-5 w-5" />
                      </button>
                      <button
                        onClick={() => handleDeleteUser(user.id)}
                        className="p-2 text-red-600 hover:text-red-800"
                        title="削除"
                      >
                        <Trash2 className="h-5 w-5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 営業ユーザー候補タブ */}
      {activeTab === 'salesCandidates' && (
        <div className="bg-white rounded-lg shadow">
          <div className="p-4 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Users className="h-5 w-5 text-amber-600" />
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">営業ユーザー候補（旧担当者データ）</h2>
                  <p className="text-sm text-gray-600">
                    チェックを入れて「ユーザー一覧に登録」で統合できます
                  </p>
                </div>
              </div>
              {salesReps.length > 0 && (
                <div className="flex items-center gap-2">
                  <button
                    onClick={toggleAllCandidates}
                    className="px-3 py-1.5 text-sm text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50"
                  >
                    {selectedCandidates.size === salesReps.length ? '全解除' : '全選択'}
                  </button>
                  <button
                    onClick={registerSelectedCandidates}
                    disabled={selectedCandidates.size === 0}
                    className="px-4 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 text-sm"
                  >
                    <UserPlus className="h-4 w-4" />
                    選択をユーザー一覧に登録（{selectedCandidates.size}名）
                  </button>
                </div>
              )}
            </div>
          </div>

          {salesReps.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              <Users className="h-12 w-12 mx-auto mb-3 text-gray-300" />
              <p>旧担当者データはありません</p>
            </div>
          ) : (
            <div className="p-4">
              {/* 説明メッセージ */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4 flex items-start gap-3">
                <ArrowRight className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
                <div className="text-sm text-blue-800">
                  <p className="font-medium mb-1">ユーザー一覧への統合</p>
                  <ul className="list-disc list-inside space-y-1 text-blue-700">
                    <li>チェックを入れて「ユーザー一覧に登録」をクリックすると、正式なユーザーとして登録されます</li>
                    <li>登録時にメールアドレス（ログインID@katomotor.com）とパスワードが自動生成されます</li>
                    <li>登録後、旧データは自動的に削除されます</li>
                  </ul>
                </div>
              </div>

              {/* 担当者リスト */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {salesReps.map((rep) => {
                  const isSelected = selectedCandidates.has(rep.id)
                  const existingUser = users.find(u => u.name === rep.name)
                  return (
                    <div
                      key={rep.id}
                      className={`flex items-center justify-between p-3 border rounded-lg transition-colors ${
                        isSelected ? 'bg-blue-50 border-blue-300' : 'hover:bg-gray-50'
                      } ${existingUser ? 'opacity-60' : ''}`}
                    >
                      <div className="flex items-center gap-3">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleCandidateSelection(rep.id)}
                          disabled={!!existingUser}
                          className="h-4 w-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                        />
                        <div
                          className={`h-10 w-10 rounded-full flex items-center justify-center text-sm font-semibold ${rep.color}`}
                        >
                          {rep.name.charAt(0)}
                        </div>
                        <div>
                          <div className="font-medium text-gray-900">{rep.name}</div>
                          <div className="text-xs text-gray-500">
                            {existingUser ? (
                              <span className="text-green-600">✓ 登録済み</span>
                            ) : (
                              <>ID: {rep.loginId}</>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        {!existingUser && (
                          <button
                            onClick={() => registerCandidateAsUser(rep)}
                            className="p-2 text-blue-500 hover:text-blue-700 hover:bg-blue-50 rounded"
                            title="ユーザー一覧に登録"
                          >
                            <UserPlus className="h-4 w-4" />
                          </button>
                        )}
                        <button
                          onClick={() => {
                            if (confirm(`「${rep.name}」を削除しますか？\n\n削除すると、この担当者名は見積書の担当者選択に表示されなくなります。`)) {
                              removeSalesRep(rep.id)
                              setSelectedCandidates(prev => {
                                const newSet = new Set(prev)
                                newSet.delete(rep.id)
                                return newSet
                              })
                            }
                          }}
                          className="p-2 text-red-500 hover:text-red-700 hover:bg-red-50 rounded"
                          title="削除"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>

              {/* 一括削除ボタン */}
              <div className="mt-6 pt-4 border-t border-gray-200 flex items-center justify-between">
                <button
                  onClick={() => {
                    if (confirm(`すべての旧担当者データ（${salesReps.length}名）を削除しますか？\n\nこの操作は取り消せません。`)) {
                      clearAllSalesReps()
                      setSelectedCandidates(new Set())
                    }
                  }}
                  className="px-4 py-2 text-red-600 border border-red-300 rounded-lg hover:bg-red-50 flex items-center gap-2"
                >
                  <Trash2 className="h-4 w-4" />
                  すべて削除（{salesReps.length}名）
                </button>
                <p className="text-sm text-gray-500">
                  選択中: {selectedCandidates.size}名
                </p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* 権限設定タブ */}
      {activeTab === 'permissions' && (
        <div className="bg-white rounded-lg shadow p-6">
          <div className="mb-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-2">ロール別権限設定</h2>
            <p className="text-sm text-gray-600">
              各ロールがアクセスできる機能を設定します
            </p>
          </div>

          {/* ロール選択 */}
          <div className="flex gap-4 mb-6">
            {Object.values(UserRole).map((role) => (
              <button
                key={role}
                onClick={() => setSelectedRole(role)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg border transition-colors ${
                  selectedRole === role
                    ? 'bg-blue-50 border-blue-500 text-blue-700'
                    : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
                }`}
              >
                {getRoleIcon(role)}
                <span className="font-medium">{roleLabels[role]}</span>
              </button>
            ))}
          </div>

          {/* 一般機能 */}
          <div className="mb-8">
            <h3 className="text-md font-medium text-gray-800 mb-4">一般機能</h3>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
              {permissionGroups.general.map((permission) => {
                const isEnabled = rolePermissions[selectedRole]?.[permission] ?? false
                return (
                  <button
                    key={permission}
                    onClick={() => togglePermission(permission)}
                    className={`flex items-center gap-2 p-3 rounded-lg border transition-colors ${
                      isEnabled
                        ? 'bg-green-50 border-green-500 text-green-700'
                        : 'bg-gray-50 border-gray-300 text-gray-600'
                    }`}
                  >
                    <div className={`h-5 w-5 rounded flex items-center justify-center ${
                      isEnabled ? 'bg-green-500' : 'bg-gray-300'
                    }`}>
                      {isEnabled && <Check className="h-4 w-4 text-white" />}
                    </div>
                    <span className="text-sm font-medium">{permissionLabels[permission]}</span>
                  </button>
                )
              })}
            </div>
          </div>

          {/* 管理者機能 */}
          <div>
            <h3 className="text-md font-medium text-gray-800 mb-4">管理者機能</h3>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
              {permissionGroups.admin.map((permission) => {
                const isEnabled = rolePermissions[selectedRole]?.[permission] ?? false
                return (
                  <button
                    key={permission}
                    onClick={() => togglePermission(permission)}
                    className={`flex items-center gap-2 p-3 rounded-lg border transition-colors ${
                      isEnabled
                        ? 'bg-green-50 border-green-500 text-green-700'
                        : 'bg-gray-50 border-gray-300 text-gray-600'
                    }`}
                  >
                    <div className={`h-5 w-5 rounded flex items-center justify-center ${
                      isEnabled ? 'bg-green-500' : 'bg-gray-300'
                    }`}>
                      {isEnabled && <Check className="h-4 w-4 text-white" />}
                    </div>
                    <span className="text-sm font-medium">{permissionLabels[permission]}</span>
                  </button>
                )
              })}
            </div>
          </div>

          <div className="mt-6 pt-6 border-t border-gray-200">
            <p className="text-sm text-gray-500">
              ※ 変更は即座に反映されます。ページをリロードしても設定は保持されます。
            </p>
          </div>
        </div>
      )}

      {/* ユーザー追加モーダル */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900">新規ユーザー追加</h2>
              <button
                onClick={() => setShowAddModal(false)}
                className="p-2 text-gray-400 hover:text-gray-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  名前 <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={newUser.name}
                  onChange={(e) => setNewUser({ ...newUser, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="例: 山田太郎"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  メールアドレス <span className="text-red-500">*</span>
                </label>
                <input
                  type="email"
                  value={newUser.email}
                  onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="例: yamada@katomo.jp"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  パスワード <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type={showNewPassword ? 'text' : 'password'}
                    value={newUser.password}
                    onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent pr-10"
                    placeholder="ログイン用パスワード"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showNewPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  権限
                </label>
                <select
                  value={newUser.role}
                  onChange={(e) => setNewUser({ ...newUser, role: e.target.value as UserRole })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  {Object.values(UserRole).map((role) => (
                    <option key={role} value={role}>
                      {roleLabels[role]}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  担当者カラー
                </label>
                <div className="flex items-center gap-4">
                  <input
                    type="color"
                    value={newUser.color}
                    onChange={(e) => setNewUser({ ...newUser, color: e.target.value })}
                    className="h-10 w-20 cursor-pointer"
                  />
                  <span className="text-sm text-gray-600">{newUser.color}</span>
                </div>
              </div>

              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="isActive"
                  checked={newUser.isActive}
                  onChange={(e) => setNewUser({ ...newUser, isActive: e.target.checked })}
                  className="h-4 w-4 text-blue-600 rounded"
                />
                <label htmlFor="isActive" className="ml-2 text-sm text-gray-700">
                  有効なユーザー
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
                onClick={handleAddUser}
                disabled={!newUser.name || !newUser.email || !newUser.password}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                追加
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ユーザー編集モーダル */}
      {editingUser && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900">ユーザー編集</h2>
              <button
                onClick={() => setEditingUser(null)}
                className="p-2 text-gray-400 hover:text-gray-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  名前 <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={editingUser.name}
                  onChange={(e) => setEditingUser({ ...editingUser, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  メールアドレス <span className="text-red-500">*</span>
                </label>
                <input
                  type="email"
                  value={editingUser.email}
                  onChange={(e) => setEditingUser({ ...editingUser, email: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  パスワード <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type={showEditPassword ? 'text' : 'password'}
                    value={editingUser.password}
                    onChange={(e) => setEditingUser({ ...editingUser, password: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent pr-10"
                    placeholder="ログイン用パスワード"
                  />
                  <button
                    type="button"
                    onClick={() => setShowEditPassword(!showEditPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showEditPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  権限
                </label>
                <select
                  value={editingUser.role}
                  onChange={(e) => setEditingUser({ ...editingUser, role: e.target.value as UserRole })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  {Object.values(UserRole).map((role) => (
                    <option key={role} value={role}>
                      {roleLabels[role]}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  担当者カラー
                </label>
                <div className="flex items-center gap-4">
                  <input
                    type="color"
                    value={editingUser.color || '#3B82F6'}
                    onChange={(e) => setEditingUser({ ...editingUser, color: e.target.value })}
                    className="h-10 w-20 cursor-pointer"
                  />
                  <span className="text-sm text-gray-600">{editingUser.color || '#3B82F6'}</span>
                </div>
              </div>

              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="editIsActive"
                  checked={editingUser.isActive}
                  onChange={(e) => setEditingUser({ ...editingUser, isActive: e.target.checked })}
                  className="h-4 w-4 text-blue-600 rounded"
                />
                <label htmlFor="editIsActive" className="ml-2 text-sm text-gray-700">
                  有効なユーザー
                </label>
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-3">
              <button
                onClick={() => setEditingUser(null)}
                className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
              >
                キャンセル
              </button>
              <button
                onClick={handleUpdateUser}
                disabled={!editingUser.name || !editingUser.email || !editingUser.password}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                保存
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
