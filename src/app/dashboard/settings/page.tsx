'use client'

import { useState, useRef, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Plus, Trash2, Edit2, Check, X, Car, User, Key, Eye, EyeOff, Power, Package, Download, Upload, AlertTriangle, Database, HardDrive, RefreshCw, FileSpreadsheet, Users, Building, Image, Calculator, Settings, ExternalLink, UserCog, Clock, History, Save, Cloud, CloudUpload, CloudDownload, Loader2 } from 'lucide-react'
import { useSettingsStore, SalesRep, VehicleModel, VehicleSupplier, CompanySettings, OptionGroupConfig, CostFormula, OptionGroupType } from '@/stores/settings-store'
import { useUserPermissionsStore, roleLabels } from '@/stores/user-permissions-store'
import Link from 'next/link'
import { downloadBackup, readBackupFile, restoreFromBackup, getStorageUsage, getDataCounts, BackupData, getStoreInfoList, StoreInfo, getStorageKeyName, downloadSingleStoreBackup, StorageKey, saveAutoBackup, getBackupHistory, BackupHistoryItem, restoreFromAutoBackup, deleteAutoBackup, downloadAutoBackup, getTimeSinceLastBackup, formatBytes as formatBackupBytes } from '@/lib/backup'
import { exportAllCustomersToCSV, exportOwnersToCSV, downloadCSV, readCSVFile, importCustomersFromCSV, DuplicateWarning } from '@/lib/csv'
import { useCustomerStore } from '@/stores/customer-store'
import { Customer, CustomerStatus } from '@/types'

const MAX_VEHICLE_MODELS = 30
const MAX_VEHICLE_SUPPLIERS = 30

// 利用可能な色オプション
const COLOR_OPTIONS = [
  { value: 'bg-red-100 text-red-700', label: '赤', dot: 'bg-red-500' },
  { value: 'bg-blue-100 text-blue-700', label: '青', dot: 'bg-blue-500' },
  { value: 'bg-green-100 text-green-700', label: '緑', dot: 'bg-green-500' },
  { value: 'bg-yellow-100 text-yellow-700', label: '黄', dot: 'bg-yellow-500' },
  { value: 'bg-purple-100 text-purple-700', label: '紫', dot: 'bg-purple-500' },
  { value: 'bg-pink-100 text-pink-700', label: 'ピンク', dot: 'bg-pink-500' },
  { value: 'bg-indigo-100 text-indigo-700', label: 'インディゴ', dot: 'bg-indigo-500' },
  { value: 'bg-orange-100 text-orange-700', label: 'オレンジ', dot: 'bg-orange-500' },
  { value: 'bg-teal-100 text-teal-700', label: 'ティール', dot: 'bg-teal-500' },
  { value: 'bg-cyan-100 text-cyan-700', label: 'シアン', dot: 'bg-cyan-500' },
]

function SalesRepRow({
  rep,
  onUpdate,
  onUpdateCredentials,
  onToggleActive,
  onDelete
}: {
  rep: SalesRep
  onUpdate: (id: string, name: string, color: string) => void
  onUpdateCredentials: (id: string, loginId: string, password: string) => void
  onToggleActive: (id: string) => void
  onDelete: (id: string) => void
}) {
  const [isEditing, setIsEditing] = useState(false)
  const [isEditingCredentials, setIsEditingCredentials] = useState(false)
  const [editName, setEditName] = useState(rep.name)
  const [editColor, setEditColor] = useState(rep.color)
  const [editLoginId, setEditLoginId] = useState(rep.loginId)
  const [editPassword, setEditPassword] = useState(rep.password)
  const [showPassword, setShowPassword] = useState(false)

  const handleSave = () => {
    if (editName.trim()) {
      onUpdate(rep.id, editName.trim(), editColor)
      setIsEditing(false)
    }
  }

  const handleSaveCredentials = () => {
    if (editLoginId.trim() && editPassword.trim()) {
      onUpdateCredentials(rep.id, editLoginId.trim(), editPassword.trim())
      setIsEditingCredentials(false)
    }
  }

  const handleCancel = () => {
    setEditName(rep.name)
    setEditColor(rep.color)
    setIsEditing(false)
  }

  const handleCancelCredentials = () => {
    setEditLoginId(rep.loginId)
    setEditPassword(rep.password)
    setIsEditingCredentials(false)
  }

  return (
    <div className={`p-4 bg-white border rounded-lg hover:bg-gray-50 ${!rep.isActive ? 'opacity-50' : ''}`}>
      {/* メイン情報行 */}
      <div className="flex items-center gap-3 mb-3">
        {isEditing ? (
          <>
            <Input
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              className="flex-1 max-w-[150px]"
              placeholder="担当者名"
            />
            <div className="flex gap-1">
              {COLOR_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  onClick={() => setEditColor(option.value)}
                  className={`w-5 h-5 rounded-full ${option.dot} ${editColor === option.value ? 'ring-2 ring-offset-1 ring-gray-400' : ''}`}
                  title={option.label}
                />
              ))}
            </div>
            <Button size="sm" variant="ghost" onClick={handleSave}>
              <Check className="h-4 w-4 text-green-600" />
            </Button>
            <Button size="sm" variant="ghost" onClick={handleCancel}>
              <X className="h-4 w-4 text-gray-500" />
            </Button>
          </>
        ) : (
          <>
            <span className={`px-3 py-1.5 rounded text-sm font-medium ${rep.color}`}>
              {rep.name}
            </span>
            <div className="flex-1" />
            <Button
              size="sm"
              variant="ghost"
              onClick={() => onToggleActive(rep.id)}
              title={rep.isActive ? '無効にする' : '有効にする'}
            >
              <Power className={`h-4 w-4 ${rep.isActive ? 'text-green-500' : 'text-gray-400'}`} />
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setIsEditing(true)}>
              <Edit2 className="h-4 w-4 text-gray-500" />
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => {
                if (confirm(`${rep.name}を削除しますか？`)) {
                  onDelete(rep.id)
                }
              }}
            >
              <Trash2 className="h-4 w-4 text-red-500" />
            </Button>
          </>
        )}
      </div>

      {/* ログイン情報行 */}
      <div className="flex items-center gap-3 text-sm bg-gray-50 rounded px-3 py-2">
        {isEditingCredentials ? (
          <>
            <User className="h-4 w-4 text-gray-400" />
            <Input
              value={editLoginId}
              onChange={(e) => setEditLoginId(e.target.value)}
              className="w-32 h-8 text-sm"
              placeholder="ログインID"
            />
            <Key className="h-4 w-4 text-gray-400" />
            <Input
              type={showPassword ? 'text' : 'password'}
              value={editPassword}
              onChange={(e) => setEditPassword(e.target.value)}
              className="w-32 h-8 text-sm"
              placeholder="パスワード"
            />
            <Button size="sm" variant="ghost" onClick={() => setShowPassword(!showPassword)}>
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </Button>
            <Button size="sm" variant="ghost" onClick={handleSaveCredentials}>
              <Check className="h-4 w-4 text-green-600" />
            </Button>
            <Button size="sm" variant="ghost" onClick={handleCancelCredentials}>
              <X className="h-4 w-4 text-gray-500" />
            </Button>
          </>
        ) : (
          <>
            <User className="h-4 w-4 text-gray-400" />
            <span className="text-gray-600">ID: <code className="bg-gray-200 px-1.5 py-0.5 rounded">{rep.loginId}</code></span>
            <Key className="h-4 w-4 text-gray-400 ml-4" />
            <span className="text-gray-600">
              PW: <code className="bg-gray-200 px-1.5 py-0.5 rounded">{showPassword ? rep.password : '••••••••'}</code>
            </span>
            <Button size="sm" variant="ghost" onClick={() => setShowPassword(!showPassword)}>
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setIsEditingCredentials(true)}>
              <Edit2 className="h-4 w-4 text-gray-400" />
            </Button>
          </>
        )}
      </div>

      {/* ステータス表示 */}
      {!rep.isActive && (
        <div className="mt-2 text-xs text-red-500">
          ※ 無効化されています（ログイン不可）
        </div>
      )}
    </div>
  )
}

// 車種行コンポーネント
function VehicleModelRow({
  model,
  onUpdate,
  onDelete
}: {
  model: VehicleModel
  onUpdate: (id: string, name: string) => void
  onDelete: (id: string) => void
}) {
  const [isEditing, setIsEditing] = useState(false)
  const [editName, setEditName] = useState(model.name)

  const handleSave = () => {
    if (editName.trim()) {
      onUpdate(model.id, editName.trim())
      setIsEditing(false)
    }
  }

  const handleCancel = () => {
    setEditName(model.name)
    setIsEditing(false)
  }

  if (isEditing) {
    return (
      <div className="flex items-center gap-3 p-2 bg-gray-50 rounded-lg">
        <Input
          value={editName}
          onChange={(e) => setEditName(e.target.value)}
          className="flex-1"
          placeholder="車種名"
        />
        <Button size="sm" variant="ghost" onClick={handleSave}>
          <Check className="h-4 w-4 text-green-600" />
        </Button>
        <Button size="sm" variant="ghost" onClick={handleCancel}>
          <X className="h-4 w-4 text-gray-500" />
        </Button>
      </div>
    )
  }

  return (
    <div className="flex items-center gap-3 p-2 bg-white border rounded-lg hover:bg-gray-50">
      <Car className="h-4 w-4 text-gray-400" />
      <span className="flex-1 text-sm text-gray-700">{model.name}</span>
      <Button size="sm" variant="ghost" onClick={() => setIsEditing(true)}>
        <Edit2 className="h-4 w-4 text-gray-500" />
      </Button>
      <Button size="sm" variant="ghost" onClick={() => onDelete(model.id)}>
        <Trash2 className="h-4 w-4 text-red-500" />
      </Button>
    </div>
  )
}

// 仕入れ先行コンポーネント
function VehicleSupplierRow({
  supplier,
  onDelete
}: {
  supplier: VehicleSupplier
  onDelete: (id: string) => void
}) {
  return (
    <div className="flex items-center gap-3 p-2 bg-white border rounded-lg hover:bg-gray-50">
      <Package className="h-4 w-4 text-gray-400" />
      <span className="flex-1 text-sm text-gray-700">{supplier.name}</span>
      <Button
        size="sm"
        variant="ghost"
        onClick={() => {
          if (confirm(`「${supplier.name}」を削除しますか？`)) {
            onDelete(supplier.id)
          }
        }}
      >
        <Trash2 className="h-4 w-4 text-red-500" />
      </Button>
    </div>
  )
}

export default function SettingsPage() {
  const {
    salesReps, addSalesRep, updateSalesRep, updateSalesRepCredentials, toggleSalesRepActive, removeSalesRep,
    vehicleModels, addVehicleModel, updateVehicleModel, removeVehicleModel,
    vehicleSuppliers, addVehicleSupplier, removeVehicleSupplier,
    company, updateCompany, setCompanyLogo,
    optionGroups, updateOptionGroups,
    costFormulas, updateCostFormulas, defaultCostFormula, setDefaultCostFormula
  } = useSettingsStore()
  const { customers, addCustomers } = useCustomerStore()
  const { users: managedUsers } = useUserPermissionsStore()
  const [newName, setNewName] = useState('')
  const [newColor, setNewColor] = useState(COLOR_OPTIONS[0].value)
  const [isAdding, setIsAdding] = useState(false)
  const [newVehicleName, setNewVehicleName] = useState('')
  const [isAddingVehicle, setIsAddingVehicle] = useState(false)
  const [newSupplierName, setNewSupplierName] = useState('')
  const [isAddingSupplier, setIsAddingSupplier] = useState(false)
  const [newRepInfo, setNewRepInfo] = useState<SalesRep | null>(null)

  // バックアップ関連の状態
  const fileInputRef = useRef<HTMLInputElement>(null)
  const csvInputRef = useRef<HTMLInputElement>(null)
  const [storageUsage, setStorageUsage] = useState({ used: 0, total: 0, percentage: 0 })
  const [dataCounts, setDataCounts] = useState<Record<string, number | string>>({})
  const [storeInfoList, setStoreInfoList] = useState<StoreInfo[]>([])
  const [backupMessage, setBackupMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [isRestoring, setIsRestoring] = useState(false)
  const [showStoreDetails, setShowStoreDetails] = useState(false)
  const [backupHistory, setBackupHistory] = useState<BackupHistoryItem[]>([])
  const [lastBackupTime, setLastBackupTime] = useState<string | null>(null)
  const [showBackupHistory, setShowBackupHistory] = useState(false)

  // クラウドバックアップ関連
  const [cloudBackups, setCloudBackups] = useState<Array<{
    id: string
    created_at: string
    size_bytes: number
    data_hash?: string
    metadata?: Record<string, number>
  }>>([])
  const [isCloudSaving, setIsCloudSaving] = useState(false)
  const [isCloudLoading, setIsCloudLoading] = useState(false)
  const [cloudMessage, setCloudMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [showCloudBackups, setShowCloudBackups] = useState(false)
  const [autoCloudBackup, setAutoCloudBackup] = useState(false)
  const [lastCloudBackupTime, setLastCloudBackupTime] = useState<string | null>(null)

  // ストレージ情報を更新
  const refreshStorageInfo = () => {
    setStorageUsage(getStorageUsage())
    setDataCounts(getDataCounts())
    setStoreInfoList(getStoreInfoList())
    setBackupHistory(getBackupHistory())
    setLastBackupTime(getTimeSinceLastBackup())
  }

  // クラウドバックアップ一覧を取得
  const fetchCloudBackups = async () => {
    setIsCloudLoading(true)
    try {
      const res = await fetch('/api/backup')
      const data = await res.json()
      if (data.success) {
        const backups = data.backups || []
        setCloudBackups(backups)
        // 最新バックアップの時間を設定
        if (backups.length > 0) {
          const lastBackup = new Date(backups[0].created_at)
          const now = new Date()
          const diffMs = now.getTime() - lastBackup.getTime()
          const minutes = Math.floor(diffMs / (1000 * 60))
          const hours = Math.floor(diffMs / (1000 * 60 * 60))
          const days = Math.floor(diffMs / (1000 * 60 * 60 * 24))
          if (days > 0) setLastCloudBackupTime(`${days}日前`)
          else if (hours > 0) setLastCloudBackupTime(`${hours}時間前`)
          else if (minutes > 0) setLastCloudBackupTime(`${minutes}分前`)
          else setLastCloudBackupTime('たった今')
        }
      } else {
        console.error('Cloud backup fetch error:', data.error)
      }
    } catch (error) {
      console.error('Cloud backup fetch error:', error)
    } finally {
      setIsCloudLoading(false)
    }
  }

  // クラウドにバックアップを保存
  const saveToCloud = async (skipIfSame = false) => {
    setIsCloudSaving(true)
    if (!skipIfSame) setCloudMessage(null)
    try {
      // 全データをエクスポート
      const allData: Record<string, unknown> = {}
      const keys = [
        'customer-store', 'sales-target-storage', 'showroom-storage', 'settings-storage',
        'chat-storage', 'contact-storage', 'auth-storage', 'sidebar-order-storage',
        'estimate-storage', 'contract-management-storage', 'user-permissions-storage', 'survey-storage'
      ]
      keys.forEach((key) => {
        const value = localStorage.getItem(key)
        if (value) {
          try {
            allData[key] = JSON.parse(value)
          } catch {
            allData[key] = value
          }
        }
      })

      const backupData = {
        version: '1.0',
        createdAt: new Date().toISOString(),
        data: allData
      }

      const res = await fetch('/api/backup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ data: backupData, skipIfSame })
      })

      const result = await res.json()
      if (result.success) {
        if (result.skipped) {
          console.log('クラウドバックアップ: データに変更がないためスキップ')
        } else {
          if (!skipIfSame) {
            setCloudMessage({ type: 'success', text: `クラウドにバックアップしました (${formatBackupBytes(result.sizeBytes)})` })
          }
          fetchCloudBackups()
        }
      } else {
        if (!skipIfSame) {
          setCloudMessage({ type: 'error', text: result.error || 'バックアップに失敗しました' })
        }
      }
    } catch (error) {
      if (!skipIfSame) {
        setCloudMessage({ type: 'error', text: 'クラウドへの接続に失敗しました' })
      }
      console.error('Cloud backup error:', error)
    } finally {
      setIsCloudSaving(false)
      if (!skipIfSame) {
        setTimeout(() => setCloudMessage(null), 5000)
      }
    }
  }

  // クラウドバックアップをダウンロード
  const downloadCloudBackup = async (backupId: string) => {
    try {
      const res = await fetch(`/api/backup/${encodeURIComponent(backupId)}?format=download`)
      if (!res.ok) throw new Error('Download failed')

      const blob = await res.blob()
      const contentDisposition = res.headers.get('Content-Disposition')
      const filenameMatch = contentDisposition?.match(/filename="(.+)"/)
      const filename = filenameMatch ? filenameMatch[1] : `backup_${backupId}.json`

      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = filename
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)

      setCloudMessage({ type: 'success', text: 'バックアップをダウンロードしました' })
      setTimeout(() => setCloudMessage(null), 3000)
    } catch (error) {
      setCloudMessage({ type: 'error', text: 'ダウンロードに失敗しました' })
      setTimeout(() => setCloudMessage(null), 3000)
    }
  }

  // クラウドからバックアップを復元
  const restoreFromCloud = async (backupId: string) => {
    if (!confirm('クラウドバックアップから復元しますか？\n現在のデータは上書きされます。')) return

    setIsCloudLoading(true)
    try {
      const res = await fetch(`/api/backup/${encodeURIComponent(backupId)}`)
      const result = await res.json()

      if (result.success && result.backup?.data) {
        const backupData = result.backup.data
        // データを復元
        if (backupData.data) {
          Object.entries(backupData.data).forEach(([key, value]) => {
            localStorage.setItem(key, JSON.stringify(value))
          })
        }
        setCloudMessage({ type: 'success', text: '復元しました。ページを再読み込みします。' })
        setTimeout(() => window.location.reload(), 2000)
      } else {
        setCloudMessage({ type: 'error', text: result.error || '復元に失敗しました' })
      }
    } catch (error) {
      setCloudMessage({ type: 'error', text: 'クラウドへの接続に失敗しました' })
    } finally {
      setIsCloudLoading(false)
    }
  }

  // クラウドバックアップを削除
  const deleteCloudBackup = async (backupId: string) => {
    if (!confirm('このバックアップを削除しますか？')) return

    try {
      const res = await fetch(`/api/backup/${encodeURIComponent(backupId)}`, { method: 'DELETE' })
      const result = await res.json()

      if (result.success) {
        setCloudMessage({ type: 'success', text: 'バックアップを削除しました' })
        fetchCloudBackups()
      } else {
        setCloudMessage({ type: 'error', text: result.error || '削除に失敗しました' })
      }
    } catch (error) {
      setCloudMessage({ type: 'error', text: 'クラウドへの接続に失敗しました' })
    }
    setTimeout(() => setCloudMessage(null), 3000)
  }

  useEffect(() => {
    refreshStorageInfo()
    // クラウドバックアップ一覧を取得
    fetchCloudBackups()

    // 5分ごとに自動バックアップを実行（ローカル）
    const autoBackupInterval = setInterval(() => {
      const result = saveAutoBackup()
      if (result.saved) {
        console.log('自動バックアップ:', result.message)
        refreshStorageInfo()
      }
    }, 5 * 60 * 1000) // 5分

    // 初回の自動バックアップ（ページ読み込み時）
    const initialBackup = saveAutoBackup()
    if (initialBackup.saved) {
      console.log('初回バックアップ:', initialBackup.message)
      refreshStorageInfo()
    }

    return () => clearInterval(autoBackupInterval)
  }, [])

  // 自動クラウドバックアップ（10分ごと）
  useEffect(() => {
    if (!autoCloudBackup) return

    const cloudBackupInterval = setInterval(() => {
      console.log('自動クラウドバックアップを実行中...')
      saveToCloud(true) // skipIfSame=true で変更があるときだけ保存
    }, 10 * 60 * 1000) // 10分

    return () => clearInterval(cloudBackupInterval)
  }, [autoCloudBackup])

  // バックアップをダウンロード
  const handleDownloadBackup = () => {
    try {
      downloadBackup()
      setBackupMessage({ type: 'success', text: 'バックアップファイルをダウンロードしました' })
      setTimeout(() => setBackupMessage(null), 3000)
    } catch (error) {
      setBackupMessage({ type: 'error', text: 'バックアップに失敗しました' })
    }
  }

  // バックアップファイルを選択
  const handleSelectBackupFile = () => {
    fileInputRef.current?.click()
  }

  // バックアップファイルを読み込んで復元
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setIsRestoring(true)
    try {
      const backupData = await readBackupFile(file)

      // 確認ダイアログ
      const confirmMessage = `バックアップファイル情報:
作成日時: ${new Date(backupData.createdAt).toLocaleString('ja-JP')}
バージョン: ${backupData.version}

現在のデータを上書きします。よろしいですか？`

      if (!confirm(confirmMessage)) {
        setIsRestoring(false)
        if (fileInputRef.current) fileInputRef.current.value = ''
        return
      }

      const result = restoreFromBackup(backupData)
      if (result.success) {
        setBackupMessage({ type: 'success', text: result.message })
        // 3秒後にページをリロード
        setTimeout(() => {
          window.location.reload()
        }, 2000)
      } else {
        setBackupMessage({ type: 'error', text: result.message })
      }
    } catch (error) {
      setBackupMessage({ type: 'error', text: 'バックアップファイルの読み込みに失敗しました' })
    } finally {
      setIsRestoring(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  // ストレージ使用量のフォーマット
  const formatBytes = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`
  }

  // CSV関連の状態
  const [csvMessage, setCsvMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [isImportingCsv, setIsImportingCsv] = useState(false)

  // CSVエクスポート（全顧客）
  const handleExportAllCsv = () => {
    try {
      const date = new Date()
      const dateStr = `${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, '0')}${String(date.getDate()).padStart(2, '0')}`
      const csv = exportAllCustomersToCSV(customers)
      downloadCSV(csv, `顧客データ_全件_${dateStr}.csv`)
      setCsvMessage({ type: 'success', text: `全顧客データ（${customers.length}件）をエクスポートしました` })
      setTimeout(() => setCsvMessage(null), 3000)
    } catch (error) {
      setCsvMessage({ type: 'error', text: 'CSVエクスポートに失敗しました' })
    }
  }

  // CSVエクスポート（オーナーのみ）
  const handleExportOwnersCsv = () => {
    try {
      const owners = customers.filter(c => c.status === CustomerStatus.OWNER)
      const date = new Date()
      const dateStr = `${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, '0')}${String(date.getDate()).padStart(2, '0')}`
      const csv = exportOwnersToCSV(customers)
      downloadCSV(csv, `オーナーデータ_${dateStr}.csv`)
      setCsvMessage({ type: 'success', text: `オーナーデータ（${owners.length}件）をエクスポートしました` })
      setTimeout(() => setCsvMessage(null), 3000)
    } catch (error) {
      setCsvMessage({ type: 'error', text: 'CSVエクスポートに失敗しました' })
    }
  }

  // CSVインポート
  const handleSelectCsvFile = () => {
    console.log('CSVインポートボタンがクリックされました')
    console.log('csvInputRef.current:', csvInputRef.current)
    csvInputRef.current?.click()
  }

  const handleCsvFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    console.log('handleCsvFileChange called')
    const file = e.target.files?.[0]
    console.log('Selected file:', file?.name, file?.size)
    if (!file) return

    setIsImportingCsv(true)
    try {
      console.log('Reading CSV file...')
      const csvText = await readCSVFile(file)
      console.log('CSV text length:', csvText.length)

      // ユーザー情報を渡して担当名から自動紐づけ
      // 既存顧客リストを渡して重複チェック
      const userList = managedUsers.map(u => ({ id: u.id, name: u.name }))
      const existingCustomerList = customers.map(c => ({ id: c.id, name: c.name, address: c.address }))
      const { customers: importedCustomers, errors, duplicateWarnings } = importCustomersFromCSV(csvText, userList, existingCustomerList)
      console.log('Import result:', importedCustomers.length, 'customers,', errors.length, 'errors,', duplicateWarnings.length, 'duplicates')

      if (importedCustomers.length === 0) {
        setCsvMessage({ type: 'error', text: errors.length > 0 ? errors.join('\n') : 'インポートできるデータがありませんでした' })
        return
      }

      // 重複警告がある場合は先に表示
      if (duplicateWarnings.length > 0) {
        const warningMessage = duplicateWarnings.map(w =>
          `行${w.csvRow}: ${w.name}（${w.prefecture}）`
        ).join('\n')

        const proceed = confirm(
          `⚠️ 重複の可能性がある顧客が${duplicateWarnings.length}件見つかりました：\n\n` +
          warningMessage +
          `\n\n※ 名前と県が一致しています。\n\nそのままインポートしますか？`
        )

        if (!proceed) {
          setIsImportingCsv(false)
          if (csvInputRef.current) csvInputRef.current.value = ''
          return
        }
      }

      // 紐づけされた件数をカウント
      const linkedCount = importedCustomers.filter(c => c.assignedSalesRepId).length

      // 確認ダイアログ
      let confirmMessage = `${importedCustomers.length}件の顧客データをインポートします。`
      if (linkedCount > 0) {
        confirmMessage += `\n（${linkedCount}件の担当者を自動紐づけ）`
      }
      if (duplicateWarnings.length > 0) {
        confirmMessage += `\n（${duplicateWarnings.length}件の重複の可能性あり）`
      }
      if (errors.length > 0) {
        confirmMessage += `\n（${errors.length}件のエラーがありました）`
      }
      confirmMessage += `\n\nA列のステータスが反映されます。よろしいですか？`

      if (!confirm(confirmMessage)) {
        setIsImportingCsv(false)
        if (csvInputRef.current) csvInputRef.current.value = ''
        return
      }

      // 顧客データを追加
      addCustomers(importedCustomers as Customer[])

      let successMessage = `${importedCustomers.length}件の顧客データをインポートしました`
      if (linkedCount > 0) {
        successMessage += `（${linkedCount}件の担当者を自動紐づけ）`
      }
      if (duplicateWarnings.length > 0) {
        successMessage += `（${duplicateWarnings.length}件の重複の可能性あり）`
      }
      setCsvMessage({ type: 'success', text: successMessage })
      refreshStorageInfo()
    } catch (error) {
      setCsvMessage({ type: 'error', text: 'CSVファイルの読み込みに失敗しました' })
    } finally {
      setIsImportingCsv(false)
      if (csvInputRef.current) csvInputRef.current.value = ''
    }
  }

  const handleAdd = () => {
    if (newName.trim()) {
      const newRep = addSalesRep(newName.trim(), newColor)
      setNewRepInfo(newRep)
      setNewName('')
      setNewColor(COLOR_OPTIONS[0].value)
      setIsAdding(false)
    }
  }

  const handleAddVehicle = () => {
    if (newVehicleName.trim()) {
      const success = addVehicleModel(newVehicleName.trim())
      if (success) {
        setNewVehicleName('')
        setIsAddingVehicle(false)
      } else {
        alert(`車種は最大${MAX_VEHICLE_MODELS}件まで登録できます`)
      }
    }
  }

  const handleAddSupplier = () => {
    if (newSupplierName.trim()) {
      const success = addVehicleSupplier(newSupplierName.trim())
      if (success) {
        setNewSupplierName('')
        setIsAddingSupplier(false)
      } else {
        alert(`仕入れ先は最大${MAX_VEHICLE_SUPPLIERS}件まで登録できます`)
      }
    }
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">設定</h1>
        <p className="text-sm text-gray-600 mt-1">担当者やカテゴリを管理します</p>
      </div>

      {/* 新規担当者追加通知 */}
      {newRepInfo && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="flex items-start justify-between">
            <div>
              <h3 className="font-medium text-green-800">担当者を追加しました</h3>
              <p className="text-sm text-green-700 mt-1">
                以下のログイン情報が自動生成されました：
              </p>
              <div className="mt-2 bg-white rounded p-3 text-sm">
                <div className="flex items-center gap-2 mb-1">
                  <span className={`px-2 py-1 rounded ${newRepInfo.color}`}>{newRepInfo.name}</span>
                </div>
                <div className="text-gray-600">
                  <div>ログインID: <code className="bg-gray-100 px-1.5 py-0.5 rounded">{newRepInfo.loginId}</code></div>
                  <div>パスワード: <code className="bg-gray-100 px-1.5 py-0.5 rounded">{newRepInfo.password}</code></div>
                </div>
              </div>
            </div>
            <Button size="sm" variant="ghost" onClick={() => setNewRepInfo(null)}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* 担当者管理（ユーザー管理へのリンク） */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <UserCog className="h-5 w-5" />
              <span>担当者・ユーザー管理</span>
            </div>
            <Link href="/dashboard/admin/users">
              <Button size="sm" className="bg-blue-600 hover:bg-blue-700">
                <ExternalLink className="h-4 w-4 mr-1" />
                ユーザー管理を開く
              </Button>
            </Link>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-gray-600">
            担当者はユーザー管理画面で追加・編集できます。メールアドレスでログインするため、担当者＝ユーザーとして管理されます。
          </p>

          {/* ユーザー（担当者）リスト */}
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-3">
              <Users className="h-4 w-4 text-gray-500" />
              <span className="text-sm font-medium text-gray-700">登録済み担当者</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
              {managedUsers.filter(u => u.isActive).map((user) => (
                <div key={user.id} className="flex items-center gap-2 p-2 bg-white rounded-lg border">
                  <div
                    className="h-8 w-8 rounded-full flex items-center justify-center text-white text-sm font-medium"
                    style={{ backgroundColor: user.color || '#3B82F6' }}
                  >
                    {user.name.charAt(0)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-gray-900 truncate">{user.name}</div>
                    <div className="text-xs text-gray-500 truncate">{user.email}</div>
                  </div>
                  <span className={`px-1.5 py-0.5 text-xs rounded ${
                    user.role === 'admin' ? 'bg-red-100 text-red-700' :
                    user.role === 'manager' ? 'bg-yellow-100 text-yellow-700' :
                    'bg-gray-100 text-gray-700'
                  }`}>
                    {roleLabels[user.role]}
                  </span>
                </div>
              ))}
              {managedUsers.filter(u => u.isActive).length === 0 && (
                <div className="col-span-full text-center py-4 text-gray-500 text-sm">
                  アクティブな担当者がいません
                </div>
              )}
            </div>
          </div>

          {/* 旧担当者データとの連携 */}
          {salesReps.length > 0 && (
            <div className="bg-yellow-50 rounded-lg p-4 border border-yellow-200">
              <div className="flex items-start gap-2">
                <AlertTriangle className="h-5 w-5 text-yellow-600 mt-0.5 flex-shrink-0" />
                <div className="text-sm text-yellow-700">
                  <div className="font-medium mb-1">旧担当者データ（{salesReps.length}人）</div>
                  <p className="text-xs mb-2">
                    以前の担当者データが残っています。見積もりの担当者選択では、こちらのデータも引き続き使用できます。
                  </p>
                  <div className="flex flex-wrap gap-1">
                    {salesReps.filter(r => r.isActive).slice(0, 8).map((rep) => (
                      <span key={rep.id} className={`px-2 py-0.5 rounded text-xs ${rep.color}`}>
                        {rep.name}
                      </span>
                    ))}
                    {salesReps.filter(r => r.isActive).length > 8 && (
                      <span className="px-2 py-0.5 text-xs text-gray-500">
                        +{salesReps.filter(r => r.isActive).length - 8}人
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 車種管理 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span>車種管理</span>
              <span className="text-sm font-normal text-gray-500">
                ({vehicleModels.length}/{MAX_VEHICLE_MODELS})
              </span>
            </div>
            {!isAddingVehicle && vehicleModels.length < MAX_VEHICLE_MODELS && (
              <Button size="sm" onClick={() => setIsAddingVehicle(true)}>
                <Plus className="h-4 w-4 mr-1" />
                追加
              </Button>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {/* 新規追加フォーム */}
          {isAddingVehicle && (
            <div className="flex items-center gap-3 p-2 bg-blue-50 rounded-lg border border-blue-200">
              <Input
                value={newVehicleName}
                onChange={(e) => setNewVehicleName(e.target.value)}
                className="flex-1"
                placeholder="車種名を入力（例：トイファクトリー アルコーバ）"
                autoFocus
              />
              <Button size="sm" onClick={handleAddVehicle}>
                <Check className="h-4 w-4" />
              </Button>
              <Button size="sm" variant="ghost" onClick={() => { setIsAddingVehicle(false); setNewVehicleName(''); }}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          )}

          {/* 車種リスト */}
          {vehicleModels.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              車種が登録されていません
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {vehicleModels.map((model) => (
                <VehicleModelRow
                  key={model.id}
                  model={model}
                  onUpdate={updateVehicleModel}
                  onDelete={removeVehicleModel}
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* 仕入れ先管理 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Package className="h-5 w-5" />
              <span>仕入れ先管理</span>
              <span className="text-sm font-normal text-gray-500">
                ({vehicleSuppliers.length}/{MAX_VEHICLE_SUPPLIERS})
              </span>
            </div>
            {!isAddingSupplier && vehicleSuppliers.length < MAX_VEHICLE_SUPPLIERS && (
              <Button size="sm" onClick={() => setIsAddingSupplier(true)}>
                <Plus className="h-4 w-4 mr-1" />
                追加
              </Button>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {/* 新規追加フォーム */}
          {isAddingSupplier && (
            <div className="flex items-center gap-3 p-2 bg-blue-50 rounded-lg border border-blue-200">
              <Input
                value={newSupplierName}
                onChange={(e) => setNewSupplierName(e.target.value)}
                className="flex-1"
                placeholder="仕入れ先名を入力（例：トイファクトリー）"
                autoFocus
              />
              <Button size="sm" onClick={handleAddSupplier}>
                <Check className="h-4 w-4" />
              </Button>
              <Button size="sm" variant="ghost" onClick={() => { setIsAddingSupplier(false); setNewSupplierName(''); }}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          )}

          {/* 仕入れ先リスト */}
          {vehicleSuppliers.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              仕入れ先が登録されていません
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {vehicleSuppliers.map((supplier) => (
                <VehicleSupplierRow
                  key={supplier.id}
                  supplier={supplier}
                  onDelete={removeVehicleSupplier}
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* CSVエクスポート・インポート */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5" />
            <span>CSV エクスポート・インポート</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* 通知メッセージ */}
          {csvMessage && (
            <div className={`p-3 rounded-lg flex items-center gap-2 ${
              csvMessage.type === 'success'
                ? 'bg-green-50 text-green-700 border border-green-200'
                : 'bg-red-50 text-red-700 border border-red-200'
            }`}>
              {csvMessage.type === 'error' && <AlertTriangle className="h-4 w-4" />}
              {csvMessage.text}
            </div>
          )}

          {/* 現在のデータ件数 */}
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <Users className="h-4 w-4 text-gray-500" />
              <span className="text-sm font-medium text-gray-700">現在の顧客データ</span>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              <div className="bg-white rounded px-3 py-2 text-center">
                <div className="text-lg font-bold text-blue-600">{customers.length}</div>
                <div className="text-xs text-gray-500">全顧客</div>
              </div>
              <div className="bg-white rounded px-3 py-2 text-center">
                <div className="text-lg font-bold text-green-600">
                  {customers.filter(c => c.status === CustomerStatus.OWNER).length}
                </div>
                <div className="text-xs text-gray-500">オーナー</div>
              </div>
              <div className="bg-white rounded px-3 py-2 text-center">
                <div className="text-lg font-bold text-yellow-600">
                  {customers.filter(c => c.status === CustomerStatus.RANK_C).length}
                </div>
                <div className="text-xs text-gray-500">Cランク</div>
              </div>
              <div className="bg-white rounded px-3 py-2 text-center">
                <div className="text-lg font-bold text-purple-600">
                  {customers.filter(c =>
                    c.status !== CustomerStatus.OWNER && c.status !== CustomerStatus.RANK_C
                  ).length}
                </div>
                <div className="text-xs text-gray-500">その他</div>
              </div>
            </div>
          </div>

          {/* エクスポート */}
          <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
            <div className="flex items-center gap-2 mb-2">
              <Download className="h-5 w-5 text-blue-600" />
              <span className="font-medium text-blue-800">CSVエクスポート</span>
            </div>
            <p className="text-sm text-blue-600 mb-3">
              顧客データをCSV形式でダウンロードします。Excel等で開けます。
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              <Button
                onClick={handleExportAllCsv}
                className="bg-blue-600 hover:bg-blue-700"
              >
                <Download className="h-4 w-4 mr-2" />
                全顧客をエクスポート
              </Button>
              <Button
                onClick={handleExportOwnersCsv}
                variant="outline"
                className="border-blue-300 text-blue-700 hover:bg-blue-100"
              >
                <Download className="h-4 w-4 mr-2" />
                オーナーのみエクスポート
              </Button>
            </div>
          </div>

          {/* インポート */}
          <div className="bg-purple-50 rounded-lg p-4 border border-purple-200">
            <div className="flex items-center gap-2 mb-2">
              <Upload className="h-5 w-5 text-purple-600" />
              <span className="font-medium text-purple-800">CSVインポート</span>
            </div>
            <p className="text-sm text-purple-600 mb-3">
              CSVファイルから顧客データをインポートします。
              インポートされた顧客は全てCランクとして登録されます。
            </p>
            <input
              ref={csvInputRef}
              type="file"
              accept=".csv"
              onChange={handleCsvFileChange}
              className="hidden"
            />
            <Button
              onClick={handleSelectCsvFile}
              variant="outline"
              className="w-full border-purple-300 text-purple-700 hover:bg-purple-100"
              disabled={isImportingCsv}
            >
              <Upload className="h-4 w-4 mr-2" />
              {isImportingCsv ? 'インポート中...' : 'CSVファイルを選択してインポート'}
            </Button>
          </div>

          {/* CSV形式の説明 */}
          <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
            <div className="text-sm text-gray-700">
              <div className="font-medium mb-2">CSVファイルの形式（A〜U列）</div>
              <div className="text-xs text-gray-600 space-y-1">
                <div className="grid grid-cols-2 gap-1">
                  <span>A〜C列: (空欄)</span>
                  <span>D列: 担当名</span>
                  <span>E列: お客様名 ★必須</span>
                  <span>F列: フリガナ</span>
                  <span>G列: 郵便番号</span>
                  <span>H列: 住所</span>
                  <span>I列: 住所２</span>
                  <span>J列: 地区名（自動判定）</span>
                  <span>K列: 電話番号１</span>
                  <span>L列: 電話番号２</span>
                  <span>M列: ファーストコンタクト</span>
                  <span>N列: ファーストコンタクト２</span>
                  <span>O列: いつの展示会か</span>
                  <span>P〜T列: (空欄)</span>
                  <span>U列: いつ契約したか</span>
                </div>
                <div className="mt-2 p-2 bg-yellow-50 rounded text-yellow-700">
                  ★ E列（お客様名）は必須です。空欄の行はスキップされます。
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* データバックアップ・復元 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            <span>データバックアップ・復元</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* 通知メッセージ */}
          {backupMessage && (
            <div className={`p-3 rounded-lg flex items-center gap-2 ${
              backupMessage.type === 'success'
                ? 'bg-green-50 text-green-700 border border-green-200'
                : 'bg-red-50 text-red-700 border border-red-200'
            }`}>
              {backupMessage.type === 'error' && <AlertTriangle className="h-4 w-4" />}
              {backupMessage.text}
            </div>
          )}

          {/* ストレージ使用量 */}
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <HardDrive className="h-4 w-4 text-gray-500" />
                <span className="text-sm font-medium text-gray-700">ローカルストレージ使用量</span>
              </div>
              <Button size="sm" variant="ghost" onClick={refreshStorageInfo}>
                <RefreshCw className="h-4 w-4" />
              </Button>
            </div>
            <div className="mb-2">
              <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                <div
                  className={`h-full transition-all ${
                    storageUsage.percentage > 80 ? 'bg-red-500' : storageUsage.percentage > 50 ? 'bg-yellow-500' : 'bg-green-500'
                  }`}
                  style={{ width: `${Math.min(storageUsage.percentage, 100)}%` }}
                />
              </div>
            </div>
            <div className="flex justify-between text-xs text-gray-500">
              <span>{formatBytes(storageUsage.used)} 使用中</span>
              <span>{formatBytes(storageUsage.total)} 中</span>
            </div>
          </div>

          {/* 保存されているデータ件数 */}
          <div className="bg-blue-50 rounded-lg p-4">
            <div className="text-sm font-medium text-blue-700 mb-2">保存されているデータ</div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              {Object.entries(dataCounts).map(([key, value]) => (
                <div key={key} className="bg-white rounded px-3 py-2 text-center">
                  <div className="text-lg font-bold text-blue-600">{value}</div>
                  <div className="text-xs text-gray-500">{key}</div>
                </div>
              ))}
            </div>
          </div>

          {/* バックアップ・復元ボタン */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-green-50 rounded-lg p-4 border border-green-200">
              <div className="flex items-center gap-2 mb-2">
                <Download className="h-5 w-5 text-green-600" />
                <span className="font-medium text-green-800">バックアップ</span>
              </div>
              <p className="text-sm text-green-600 mb-3">
                全データをJSONファイルとしてダウンロードします。
                定期的なバックアップをお勧めします。
              </p>
              <Button
                onClick={handleDownloadBackup}
                className="w-full bg-green-600 hover:bg-green-700"
              >
                <Download className="h-4 w-4 mr-2" />
                バックアップをダウンロード
              </Button>
            </div>

            <div className="bg-orange-50 rounded-lg p-4 border border-orange-200">
              <div className="flex items-center gap-2 mb-2">
                <Upload className="h-5 w-5 text-orange-600" />
                <span className="font-medium text-orange-800">復元</span>
              </div>
              <p className="text-sm text-orange-600 mb-3">
                バックアップファイルからデータを復元します。
                現在のデータは上書きされます。
              </p>
              <input
                ref={fileInputRef}
                type="file"
                accept=".json"
                onChange={handleFileChange}
                className="hidden"
              />
              <Button
                onClick={handleSelectBackupFile}
                variant="outline"
                className="w-full border-orange-300 text-orange-700 hover:bg-orange-100"
                disabled={isRestoring}
              >
                <Upload className="h-4 w-4 mr-2" />
                {isRestoring ? '復元中...' : 'バックアップから復元'}
              </Button>
            </div>
          </div>

          {/* 自動バックアップ履歴 */}
          <div className="bg-purple-50 rounded-lg p-4 border border-purple-200">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <History className="h-5 w-5 text-purple-600" />
                <span className="font-medium text-purple-800">自動バックアップ履歴</span>
                {lastBackupTime && (
                  <span className="text-xs text-purple-500 bg-purple-100 px-2 py-0.5 rounded">
                    最終: {lastBackupTime}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    const result = saveAutoBackup()
                    if (result.saved) {
                      setBackupMessage({ type: 'success', text: result.message })
                      refreshStorageInfo()
                    } else {
                      setBackupMessage({ type: 'error', text: result.message })
                    }
                    setTimeout(() => setBackupMessage(null), 3000)
                  }}
                  className="border-purple-300 text-purple-700 hover:bg-purple-100"
                >
                  <Save className="h-4 w-4 mr-1" />
                  今すぐバックアップ
                </Button>
                <button
                  onClick={() => setShowBackupHistory(!showBackupHistory)}
                  className="text-purple-600 hover:text-purple-800"
                >
                  <span className={`transform transition-transform inline-block ${showBackupHistory ? 'rotate-180' : ''}`}>▼</span>
                </button>
              </div>
            </div>
            <p className="text-xs text-purple-600 mb-2">
              5分ごとにデータ変更を検知して自動バックアップを作成します（最大5件保持）
            </p>

            {showBackupHistory && (
              <div className="mt-3 space-y-2">
                {backupHistory.length === 0 ? (
                  <div className="text-sm text-purple-500 py-2 text-center">
                    バックアップ履歴がありません
                  </div>
                ) : (
                  backupHistory.map((item, index) => {
                    const date = new Date(item.createdAt)
                    const dateStr = `${date.getFullYear()}/${date.getMonth() + 1}/${date.getDate()} ${date.getHours()}:${String(date.getMinutes()).padStart(2, '0')}`
                    return (
                      <div
                        key={item.id}
                        className={`flex items-center justify-between p-3 rounded-lg border ${
                          index === 0 ? 'bg-purple-100 border-purple-300' : 'bg-white border-purple-200'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <Clock className="h-4 w-4 text-purple-400" />
                          <div>
                            <div className="text-sm font-medium text-purple-700">
                              {dateStr}
                              {index === 0 && <span className="ml-2 text-xs bg-purple-600 text-white px-1.5 py-0.5 rounded">最新</span>}
                            </div>
                            <div className="text-xs text-purple-500">
                              {formatBackupBytes(item.sizeBytes)}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-1">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => {
                              downloadAutoBackup(item.id)
                              setBackupMessage({ type: 'success', text: 'バックアップをダウンロードしました' })
                              setTimeout(() => setBackupMessage(null), 3000)
                            }}
                            title="ダウンロード"
                            className="text-purple-600 hover:text-purple-800 hover:bg-purple-100"
                          >
                            <Download className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => {
                              if (confirm(`${dateStr}のバックアップから復元しますか？\n現在のデータは上書きされます。`)) {
                                const result = restoreFromAutoBackup(item.id)
                                if (result.success) {
                                  setBackupMessage({ type: 'success', text: result.message })
                                  setTimeout(() => window.location.reload(), 2000)
                                } else {
                                  setBackupMessage({ type: 'error', text: result.message })
                                }
                              }
                            }}
                            title="復元"
                            className="text-orange-600 hover:text-orange-800 hover:bg-orange-100"
                          >
                            <Upload className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => {
                              if (confirm(`このバックアップを削除しますか？`)) {
                                deleteAutoBackup(item.id)
                                refreshStorageInfo()
                                setBackupMessage({ type: 'success', text: 'バックアップを削除しました' })
                                setTimeout(() => setBackupMessage(null), 3000)
                              }
                            }}
                            title="削除"
                            className="text-red-600 hover:text-red-800 hover:bg-red-100"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    )
                  })
                )}
              </div>
            )}
          </div>

          {/* クラウドバックアップ（MySQL） */}
          <div className="bg-cyan-50 rounded-lg p-4 border border-cyan-200">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Cloud className="h-5 w-5 text-cyan-600" />
                <span className="font-medium text-cyan-800">クラウドバックアップ（MySQL）</span>
                {lastCloudBackupTime && (
                  <span className="text-xs text-cyan-500 bg-cyan-100 px-2 py-0.5 rounded">
                    最終: {lastCloudBackupTime}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  onClick={() => saveToCloud(false)}
                  disabled={isCloudSaving}
                  className="bg-cyan-600 hover:bg-cyan-700"
                >
                  {isCloudSaving ? (
                    <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                  ) : (
                    <CloudUpload className="h-4 w-4 mr-1" />
                  )}
                  クラウドに保存
                </Button>
                <button
                  onClick={() => {
                    setShowCloudBackups(!showCloudBackups)
                    if (!showCloudBackups) fetchCloudBackups()
                  }}
                  className="text-cyan-600 hover:text-cyan-800"
                >
                  <span className={`transform transition-transform inline-block ${showCloudBackups ? 'rotate-180' : ''}`}>▼</span>
                </button>
              </div>
            </div>

            {/* 自動クラウドバックアップ設定 */}
            <div className="flex items-center justify-between mb-3 py-2 px-3 bg-white rounded-lg border border-cyan-200">
              <div className="flex items-center gap-2">
                <RefreshCw className="h-4 w-4 text-cyan-500" />
                <span className="text-sm text-cyan-700">自動クラウドバックアップ（10分ごと）</span>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={autoCloudBackup}
                  onChange={(e) => setAutoCloudBackup(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-cyan-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-cyan-600"></div>
              </label>
            </div>

            <p className="text-xs text-cyan-600 mb-2">
              Railway MySQL にデータを保存します。ブラウザを変えても復元可能です（最大10件保持）
            </p>

            {/* クラウドメッセージ */}
            {cloudMessage && (
              <div className={`mb-3 p-2 rounded text-sm ${
                cloudMessage.type === 'success' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
              }`}>
                {cloudMessage.text}
              </div>
            )}

            {showCloudBackups && (
              <div className="mt-3 space-y-2">
                {isCloudLoading ? (
                  <div className="text-sm text-cyan-500 py-2 text-center flex items-center justify-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    読み込み中...
                  </div>
                ) : cloudBackups.length === 0 ? (
                  <div className="text-sm text-cyan-500 py-2 text-center">
                    クラウドバックアップがありません
                  </div>
                ) : (
                  cloudBackups.map((item, index) => {
                    const date = new Date(item.created_at)
                    const dateStr = `${date.getFullYear()}/${date.getMonth() + 1}/${date.getDate()} ${date.getHours()}:${String(date.getMinutes()).padStart(2, '0')}`
                    const metadata = item.metadata
                    return (
                      <div
                        key={item.id}
                        className={`p-3 rounded-lg border ${
                          index === 0 ? 'bg-cyan-100 border-cyan-300' : 'bg-white border-cyan-200'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <Cloud className="h-4 w-4 text-cyan-400" />
                            <div>
                              <div className="text-sm font-medium text-cyan-700">
                                {dateStr}
                                {index === 0 && <span className="ml-2 text-xs bg-cyan-600 text-white px-1.5 py-0.5 rounded">最新</span>}
                              </div>
                              <div className="text-xs text-cyan-500">
                                {formatBackupBytes(item.size_bytes)}
                                {item.data_hash && <span className="ml-2">ID: {item.data_hash.slice(0, 8)}</span>}
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-1">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => downloadCloudBackup(item.id)}
                              title="ダウンロード"
                              className="text-cyan-600 hover:text-cyan-800 hover:bg-cyan-100"
                            >
                              <Download className="h-4 w-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => restoreFromCloud(item.id)}
                              title="復元"
                              className="text-orange-600 hover:text-orange-800 hover:bg-orange-100"
                            >
                              <Upload className="h-4 w-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => deleteCloudBackup(item.id)}
                              title="削除"
                              className="text-red-600 hover:text-red-800 hover:bg-red-100"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                        {/* メタデータ（データ件数）表示 */}
                        {metadata && Object.keys(metadata).length > 0 && (
                          <div className="mt-2 pt-2 border-t border-cyan-200">
                            <div className="flex flex-wrap gap-2">
                              {metadata.customers !== undefined && (
                                <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded">
                                  顧客: {metadata.customers}
                                </span>
                              )}
                              {metadata.contracts !== undefined && (
                                <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded">
                                  契約: {metadata.contracts}
                                </span>
                              )}
                              {metadata.estimates !== undefined && (
                                <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded">
                                  見積: {metadata.estimates}
                                </span>
                              )}
                              {metadata.targets !== undefined && (
                                <span className="text-xs bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded">
                                  目標: {metadata.targets}
                                </span>
                              )}
                              {(metadata.newVehicles !== undefined || metadata.usedVehicles !== undefined) && (
                                <span className="text-xs bg-orange-100 text-orange-700 px-2 py-0.5 rounded">
                                  展示車: {(metadata.newVehicles || 0) + (metadata.usedVehicles || 0)}
                                </span>
                              )}
                              {metadata.surveyResponses !== undefined && (
                                <span className="text-xs bg-pink-100 text-pink-700 px-2 py-0.5 rounded">
                                  アンケート: {metadata.surveyResponses}
                                </span>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    )
                  })
                )}
              </div>
            )}
          </div>

          {/* ストア詳細情報 */}
          <div className="border-t pt-4">
            <button
              onClick={() => setShowStoreDetails(!showStoreDetails)}
              className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900"
            >
              <Database className="h-4 w-4" />
              <span>保存データの詳細を{showStoreDetails ? '隠す' : '表示'}</span>
              <span className={`transform transition-transform ${showStoreDetails ? 'rotate-180' : ''}`}>▼</span>
            </button>

            {showStoreDetails && (
              <div className="mt-3 space-y-2">
                {storeInfoList.length === 0 ? (
                  <div className="text-sm text-gray-500 py-4 text-center">
                    保存されているデータがありません
                  </div>
                ) : (
                  storeInfoList.map((info) => (
                    <div
                      key={info.key}
                      className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border"
                    >
                      <div className="flex items-center gap-3">
                        <Database className="h-4 w-4 text-gray-400" />
                        <div>
                          <div className="text-sm font-medium text-gray-700">{info.name}</div>
                          <div className="text-xs text-gray-500">
                            {info.sizeFormatted}
                            {info.itemCount !== undefined && ` • ${info.itemCount}件`}
                          </div>
                        </div>
                      </div>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          downloadSingleStoreBackup(info.key as StorageKey)
                          setBackupMessage({ type: 'success', text: `${info.name}のバックアップをダウンロードしました` })
                          setTimeout(() => setBackupMessage(null), 3000)
                        }}
                        title="個別バックアップ"
                      >
                        <Download className="h-4 w-4" />
                      </Button>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>

          {/* 注意事項 */}
          <div className="bg-yellow-50 rounded-lg p-4 border border-yellow-200">
            <div className="flex items-start gap-2">
              <AlertTriangle className="h-5 w-5 text-yellow-600 mt-0.5 flex-shrink-0" />
              <div className="text-sm text-yellow-700">
                <div className="font-medium mb-1">データ保存について</div>
                <ul className="list-disc list-inside space-y-1 text-xs">
                  <li>データはブラウザのローカルストレージに保存されています</li>
                  <li>ブラウザのキャッシュを削除するとデータが消える可能性があります</li>
                  <li>別のブラウザやデバイスではデータが共有されません</li>
                  <li>重要なデータは定期的にバックアップを取ることをお勧めします</li>
                </ul>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 会社情報設定 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building className="h-5 w-5" />
            <span>会社情報設定（見積書用）</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* ロゴ設定 */}
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="flex items-center gap-4">
              <div className="flex-shrink-0">
                {company.logoUrl ? (
                  <img
                    src={company.logoUrl}
                    alt="会社ロゴ"
                    className="h-16 w-auto object-contain border rounded"
                  />
                ) : (
                  <div className="h-16 w-16 bg-gradient-to-br from-blue-600 to-blue-800 rounded-lg flex items-center justify-center">
                    <span className="text-white font-bold text-2xl">K</span>
                  </div>
                )}
              </div>
              <div className="flex-1">
                <label className="block text-sm font-medium text-gray-700 mb-2">会社ロゴ</label>
                <div className="flex gap-2">
                  <label className="cursor-pointer">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => {
                        const file = e.target.files?.[0]
                        if (file) {
                          const reader = new FileReader()
                          reader.onloadend = () => {
                            setCompanyLogo(reader.result as string)
                          }
                          reader.readAsDataURL(file)
                        }
                      }}
                      className="hidden"
                    />
                    <span className="inline-flex items-center px-3 py-1.5 text-sm border border-gray-300 rounded-md hover:bg-gray-50 cursor-pointer">
                      <Image className="h-4 w-4 mr-2" />
                      画像を選択
                    </span>
                  </label>
                  {company.logoUrl && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCompanyLogo('')}
                      className="text-red-600"
                    >
                      <Trash2 className="h-4 w-4 mr-1" />
                      削除
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* 会社基本情報 */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">会社名</label>
              <Input
                value={company.name}
                onChange={(e) => updateCompany({ name: e.target.value })}
                placeholder="株式会社○○"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">電話番号</label>
              <Input
                value={company.phone}
                onChange={(e) => updateCompany({ phone: e.target.value })}
                placeholder="XX-XXXX-XXXX"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">郵便番号</label>
              <Input
                value={company.zipCode}
                onChange={(e) => updateCompany({ zipCode: e.target.value })}
                placeholder="XXX-XXXX"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">FAX番号</label>
              <Input
                value={company.fax}
                onChange={(e) => updateCompany({ fax: e.target.value })}
                placeholder="XX-XXXX-XXXX"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">住所</label>
              <Input
                value={company.address}
                onChange={(e) => updateCompany({ address: e.target.value })}
                placeholder="○○県○○市○○町X-X-X"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">メールアドレス</label>
              <Input
                type="email"
                value={company.email}
                onChange={(e) => updateCompany({ email: e.target.value })}
                placeholder="info@example.com"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Webサイト</label>
              <Input
                value={company.website}
                onChange={(e) => updateCompany({ website: e.target.value })}
                placeholder="www.example.com"
              />
            </div>
          </div>

          {/* 銀行口座情報 */}
          <div className="border-t pt-4">
            <h4 className="font-medium text-gray-900 mb-3">振込先銀行口座</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">銀行名</label>
                <Input
                  value={company.bankName}
                  onChange={(e) => updateCompany({ bankName: e.target.value })}
                  placeholder="○○銀行"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">支店名</label>
                <Input
                  value={company.bankBranch}
                  onChange={(e) => updateCompany({ bankBranch: e.target.value })}
                  placeholder="○○支店"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">口座種別</label>
                <select
                  value={company.accountType}
                  onChange={(e) => updateCompany({ accountType: e.target.value })}
                  className="w-full p-2 border rounded-md"
                >
                  <option value="普通">普通</option>
                  <option value="当座">当座</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">口座番号</label>
                <Input
                  value={company.accountNumber}
                  onChange={(e) => updateCompany({ accountNumber: e.target.value })}
                  placeholder="XXXXXXX"
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">口座名義</label>
                <Input
                  value={company.accountName}
                  onChange={(e) => updateCompany({ accountName: e.target.value })}
                  placeholder="カ）○○○○"
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* オプショングループ設定 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            <span>オプショングループ設定</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-gray-600">
            見積書のオプション選択時に表示されるグループ分けを設定します。
          </p>
          {optionGroups.map((group, index) => (
            <div key={group.id} className="bg-gray-50 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <span className={`px-2 py-1 rounded text-sm font-medium ${
                  group.id === 'option1' ? 'bg-blue-100 text-blue-700' :
                  group.id === 'option2' ? 'bg-green-100 text-green-700' :
                  'bg-purple-100 text-purple-700'
                }`}>
                  {group.name}
                </span>
                <span className="text-sm text-gray-500">{group.description}</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {group.categories.map((cat) => (
                  <span key={cat} className="px-2 py-1 bg-white border rounded text-xs text-gray-600">
                    {cat}
                  </span>
                ))}
              </div>
            </div>
          ))}
          <p className="text-xs text-gray-500">
            ※ カテゴリの割り当てを変更するには、コードの修正が必要です。
          </p>
        </CardContent>
      </Card>

      {/* 原価計算式設定 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calculator className="h-5 w-5" />
            <span>原価計算式設定</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-gray-600">
            オプションや車両の原価を計算する方法を設定します。
          </p>

          {/* デフォルト計算式 */}
          <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
            <label className="block text-sm font-medium text-blue-800 mb-2">デフォルトの計算式</label>
            <select
              value={defaultCostFormula}
              onChange={(e) => setDefaultCostFormula(e.target.value)}
              className="w-full p-2 border rounded-md"
            >
              {costFormulas.map((formula) => (
                <option key={formula.id} value={formula.id}>
                  {formula.name} - {formula.description}
                </option>
              ))}
            </select>
          </div>

          {/* 計算式一覧 */}
          <div className="space-y-3">
            {costFormulas.map((formula) => (
              <div
                key={formula.id}
                className={`p-4 rounded-lg border ${
                  formula.id === defaultCostFormula
                    ? 'bg-blue-50 border-blue-200'
                    : 'bg-white border-gray-200'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium text-gray-900">{formula.name}</div>
                    <div className="text-sm text-gray-500">{formula.description}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm text-gray-600">
                      {formula.type === 'fixed' && '固定値'}
                      {formula.type === 'percentage' && `販売価格の${formula.value}%`}
                      {formula.type === 'margin' && `粗利率${formula.value}%`}
                    </div>
                    {formula.id === defaultCostFormula && (
                      <span className="text-xs bg-blue-500 text-white px-2 py-0.5 rounded">デフォルト</span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>

          <p className="text-xs text-gray-500">
            ※ 新しい計算式を追加するには、コードの修正が必要です。
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
