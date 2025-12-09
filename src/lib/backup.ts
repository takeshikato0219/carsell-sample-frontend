// バックアップ・リストアユーティリティ

// 自動バックアップ用のキー
const AUTO_BACKUP_KEY = 'katomo-auto-backup'
const AUTO_BACKUP_HISTORY_KEY = 'katomo-backup-history'
const MAX_AUTO_BACKUPS = 5 // 自動バックアップの最大保持数

// localStorageのキー一覧
const STORAGE_KEYS = [
  'customer-store',
  'sales-target-storage',
  'showroom-storage',
  'settings-storage',
  'chat-storage',
  'contact-storage',
  'auth-storage',
  'sidebar-order-storage',
  'estimate-storage',
  'contract-management-storage',
  'user-permissions-storage',
  'survey-storage',
] as const

export type StorageKey = typeof STORAGE_KEYS[number]

// ストアキーの日本語名
const STORAGE_KEY_NAMES: Record<string, string> = {
  'customer-store': '顧客データ',
  'sales-target-storage': '営業目標・契約',
  'showroom-storage': '展示車両',
  'settings-storage': 'アプリ設定',
  'chat-storage': 'チャット',
  'contact-storage': '連絡先',
  'auth-storage': '認証情報',
  'sidebar-order-storage': 'メニュー順序',
  'estimate-storage': '見積データ',
  'contract-management-storage': '契約管理',
  'user-permissions-storage': 'ユーザー権限',
  'survey-storage': 'アンケート',
}

// ストアキーの日本語名を取得
export function getStorageKeyName(key: string): string {
  return STORAGE_KEY_NAMES[key] || key
}

export interface BackupData {
  version: string
  createdAt: string
  data: Record<string, unknown>
}

// 全データをエクスポート
export function exportAllData(): BackupData {
  const data: Record<string, unknown> = {}

  STORAGE_KEYS.forEach((key) => {
    const value = localStorage.getItem(key)
    if (value) {
      try {
        data[key] = JSON.parse(value)
      } catch {
        data[key] = value
      }
    }
  })

  return {
    version: '1.0',
    createdAt: new Date().toISOString(),
    data,
  }
}

// バックアップファイルをダウンロード
export function downloadBackup(): void {
  const backup = exportAllData()
  const json = JSON.stringify(backup, null, 2)
  const blob = new Blob([json], { type: 'application/json' })
  const url = URL.createObjectURL(blob)

  const date = new Date()
  const dateStr = `${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, '0')}${String(date.getDate()).padStart(2, '0')}_${String(date.getHours()).padStart(2, '0')}${String(date.getMinutes()).padStart(2, '0')}`
  const filename = `katomo_backup_${dateStr}.json`

  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

// バックアップからリストア
export function restoreFromBackup(backupData: BackupData): { success: boolean; message: string } {
  try {
    // バージョンチェック
    if (!backupData.version || !backupData.data) {
      return { success: false, message: 'バックアップファイルの形式が正しくありません' }
    }

    // データをlocalStorageに復元
    Object.entries(backupData.data).forEach(([key, value]) => {
      if (STORAGE_KEYS.includes(key as typeof STORAGE_KEYS[number])) {
        localStorage.setItem(key, JSON.stringify(value))
      }
    })

    return { success: true, message: 'データを復元しました。ページを再読み込みして反映してください。' }
  } catch (error) {
    return { success: false, message: `復元に失敗しました: ${error}` }
  }
}

// ファイルからバックアップを読み込む
export function readBackupFile(file: File): Promise<BackupData> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const content = e.target?.result as string
        const data = JSON.parse(content) as BackupData
        resolve(data)
      } catch (error) {
        reject(new Error('ファイルの解析に失敗しました'))
      }
    }
    reader.onerror = () => reject(new Error('ファイルの読み込みに失敗しました'))
    reader.readAsText(file)
  })
}

// 全データをクリア
export function clearAllData(): void {
  STORAGE_KEYS.forEach((key) => {
    localStorage.removeItem(key)
  })
}

// ストレージの使用状況を取得
export function getStorageUsage(): { used: number; total: number; percentage: number } {
  let totalSize = 0

  STORAGE_KEYS.forEach((key) => {
    const value = localStorage.getItem(key)
    if (value) {
      totalSize += key.length + value.length
    }
  })

  // localStorageの一般的な上限は5MB
  const maxSize = 5 * 1024 * 1024
  const usedBytes = totalSize * 2 // UTF-16のため2倍

  return {
    used: usedBytes,
    total: maxSize,
    percentage: (usedBytes / maxSize) * 100,
  }
}

// 各ストアのデータ数を取得
export function getDataCounts(): Record<string, number | string> {
  const counts: Record<string, number | string> = {}

  STORAGE_KEYS.forEach((key) => {
    const value = localStorage.getItem(key)
    if (value) {
      try {
        const parsed = JSON.parse(value)
        if (parsed.state) {
          // Zustandの形式
          const state = parsed.state
          if (key === 'customer-store' && state.customers) {
            counts['顧客'] = state.customers.length
          } else if (key === 'sales-target-storage') {
            counts['契約'] = state.contracts?.length || 0
            counts['営業目標'] = state.targets?.length || 0
          } else if (key === 'showroom-storage') {
            counts['新車展示'] = state.newVehicles?.length || 0
            counts['中古車展示'] = state.usedVehicles?.length || 0
          } else if (key === 'settings-storage') {
            counts['担当者'] = state.salesReps?.length || 0
            counts['車種'] = state.vehicleModels?.length || 0
          } else if (key === 'chat-storage') {
            counts['チャットメッセージ'] = state.messages?.length || 0
          } else if (key === 'estimate-storage') {
            counts['見積'] = state.estimates?.length || 0
          } else if (key === 'contract-management-storage') {
            counts['契約管理'] = state.contracts?.length || 0
          }
        }
      } catch {
        counts[key] = '不明'
      }
    }
  })

  return counts
}

// 各ストアの詳細情報を取得
export interface StoreInfo {
  key: string
  name: string
  exists: boolean
  sizeBytes: number
  sizeFormatted: string
  itemCount?: number
  lastModified?: string
}

export function getStoreInfoList(): StoreInfo[] {
  return STORAGE_KEYS.map((key) => {
    const value = localStorage.getItem(key)
    const exists = !!value
    const sizeBytes = value ? new Blob([value]).size : 0

    let itemCount: number | undefined
    if (value) {
      try {
        const parsed = JSON.parse(value)
        if (parsed.state) {
          const state = parsed.state
          // 配列データのカウント
          const arrayFields = ['customers', 'contracts', 'targets', 'estimates', 'newVehicles', 'usedVehicles', 'salesReps', 'messages']
          for (const field of arrayFields) {
            if (Array.isArray(state[field])) {
              itemCount = (itemCount || 0) + state[field].length
            }
          }
        }
      } catch {
        // パースエラーは無視
      }
    }

    return {
      key,
      name: getStorageKeyName(key),
      exists,
      sizeBytes,
      sizeFormatted: formatBytes(sizeBytes),
      itemCount,
    }
  }).filter(info => info.exists)
}

// バイト数をフォーマット
export function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

// 特定のストアのみエクスポート
export function exportSingleStore(key: StorageKey): BackupData | null {
  const value = localStorage.getItem(key)
  if (!value) return null

  try {
    return {
      version: '1.0',
      createdAt: new Date().toISOString(),
      data: { [key]: JSON.parse(value) },
    }
  } catch {
    return null
  }
}

// 特定のストアのバックアップをダウンロード
export function downloadSingleStoreBackup(key: StorageKey): void {
  const backup = exportSingleStore(key)
  if (!backup) {
    alert('データが見つかりません')
    return
  }

  const json = JSON.stringify(backup, null, 2)
  const blob = new Blob([json], { type: 'application/json' })
  const url = URL.createObjectURL(blob)

  const date = new Date()
  const dateStr = `${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, '0')}${String(date.getDate()).padStart(2, '0')}`
  const filename = `katomo_${key}_${dateStr}.json`

  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

// =====================
// 自動バックアップ機能
// =====================

export interface BackupHistoryItem {
  id: string
  createdAt: string
  sizeBytes: number
  dataHash: string
}

// データのハッシュを生成（変更検出用）
function generateDataHash(data: Record<string, unknown>): string {
  const str = JSON.stringify(data)
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash = hash & hash
  }
  return Math.abs(hash).toString(16)
}

// 自動バックアップを保存
export function saveAutoBackup(): { saved: boolean; message: string } {
  try {
    const backup = exportAllData()
    const dataHash = generateDataHash(backup.data)

    // 履歴を取得
    const history = getBackupHistory()

    // 最新のバックアップと同じ場合はスキップ
    if (history.length > 0 && history[0].dataHash === dataHash) {
      return { saved: false, message: 'データに変更がないためスキップしました' }
    }

    // 新しいバックアップIDを生成
    const backupId = `backup-${Date.now()}`
    const backupData = JSON.stringify(backup)

    // バックアップを保存
    localStorage.setItem(`${AUTO_BACKUP_KEY}-${backupId}`, backupData)

    // 履歴に追加
    const newHistoryItem: BackupHistoryItem = {
      id: backupId,
      createdAt: backup.createdAt,
      sizeBytes: new Blob([backupData]).size,
      dataHash,
    }

    history.unshift(newHistoryItem)

    // 古いバックアップを削除
    while (history.length > MAX_AUTO_BACKUPS) {
      const oldItem = history.pop()
      if (oldItem) {
        localStorage.removeItem(`${AUTO_BACKUP_KEY}-${oldItem.id}`)
      }
    }

    // 履歴を保存
    localStorage.setItem(AUTO_BACKUP_HISTORY_KEY, JSON.stringify(history))

    return { saved: true, message: `バックアップを保存しました (${formatBytes(newHistoryItem.sizeBytes)})` }
  } catch (error) {
    return { saved: false, message: `バックアップに失敗しました: ${error}` }
  }
}

// バックアップ履歴を取得
export function getBackupHistory(): BackupHistoryItem[] {
  try {
    const historyStr = localStorage.getItem(AUTO_BACKUP_HISTORY_KEY)
    if (!historyStr) return []
    return JSON.parse(historyStr)
  } catch {
    return []
  }
}

// 特定のバックアップを取得
export function getAutoBackup(backupId: string): BackupData | null {
  try {
    const backupStr = localStorage.getItem(`${AUTO_BACKUP_KEY}-${backupId}`)
    if (!backupStr) return null
    return JSON.parse(backupStr)
  } catch {
    return null
  }
}

// 特定のバックアップから復元
export function restoreFromAutoBackup(backupId: string): { success: boolean; message: string } {
  const backup = getAutoBackup(backupId)
  if (!backup) {
    return { success: false, message: 'バックアップが見つかりません' }
  }
  return restoreFromBackup(backup)
}

// 特定のバックアップを削除
export function deleteAutoBackup(backupId: string): void {
  localStorage.removeItem(`${AUTO_BACKUP_KEY}-${backupId}`)

  const history = getBackupHistory()
  const newHistory = history.filter(item => item.id !== backupId)
  localStorage.setItem(AUTO_BACKUP_HISTORY_KEY, JSON.stringify(newHistory))
}

// 全てのバックアップ履歴をクリア
export function clearBackupHistory(): void {
  const history = getBackupHistory()
  history.forEach(item => {
    localStorage.removeItem(`${AUTO_BACKUP_KEY}-${item.id}`)
  })
  localStorage.removeItem(AUTO_BACKUP_HISTORY_KEY)
}

// 最新のバックアップからの経過時間を取得
export function getTimeSinceLastBackup(): string | null {
  const history = getBackupHistory()
  if (history.length === 0) return null

  const lastBackup = new Date(history[0].createdAt)
  const now = new Date()
  const diffMs = now.getTime() - lastBackup.getTime()

  const minutes = Math.floor(diffMs / (1000 * 60))
  const hours = Math.floor(diffMs / (1000 * 60 * 60))
  const days = Math.floor(diffMs / (1000 * 60 * 60 * 24))

  if (days > 0) return `${days}日前`
  if (hours > 0) return `${hours}時間前`
  if (minutes > 0) return `${minutes}分前`
  return 'たった今'
}

// 特定のバックアップをファイルとしてダウンロード
export function downloadAutoBackup(backupId: string): void {
  const backup = getAutoBackup(backupId)
  if (!backup) {
    alert('バックアップが見つかりません')
    return
  }

  const json = JSON.stringify(backup, null, 2)
  const blob = new Blob([json], { type: 'application/json' })
  const url = URL.createObjectURL(blob)

  const date = new Date(backup.createdAt)
  const dateStr = `${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, '0')}${String(date.getDate()).padStart(2, '0')}_${String(date.getHours()).padStart(2, '0')}${String(date.getMinutes()).padStart(2, '0')}`
  const filename = `katomo_backup_${dateStr}.json`

  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  document.body.appendChild(anchor)
  anchor.click()
  document.body.removeChild(anchor)
  URL.revokeObjectURL(url)
}
