'use client'

import { useState, useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  TrendingUp,
  Truck,
  Target,
  DollarSign,
  Users,
  Calendar,
  Plus,
  Edit2,
  Check,
  X,
  ChevronLeft,
  ChevronRight,
  Lock,
  Upload,
  Download,
  FileText,
  AlertTriangle,
  Trash2,
  ChevronDown,
  ChevronUp,
  Car,
  ExternalLink
} from 'lucide-react'
import { useSalesTargetStore, CSVContractData } from '@/stores/sales-target-store'
import { useSettingsStore, COLORS } from '@/stores/settings-store'
import { useAuthStore } from '@/stores/auth-store'
import { Contract } from '@/types'
import { readCSVFile, importSalesTargetFromCSV, generateSalesTargetCSVTemplate, downloadCSV } from '@/lib/csv'

// 金額フォーマット（カンマ区切り）
function formatCurrency(amount: number): string {
  return `${amount.toLocaleString()}円`
}

// 日付フォーマット
function formatDate(dateString: string): string {
  const date = new Date(dateString)
  return `${date.getFullYear()}/${date.getMonth() + 1}/${date.getDate()}`
}

// 月の名前
const MONTH_NAMES = ['1月', '2月', '3月', '4月', '5月', '6月', '7月', '8月', '9月', '10月', '11月', '12月']

export default function TargetsPage() {
  const [selectedYear, setSelectedYear] = useState(2025)
  const [editingTarget, setEditingTarget] = useState<{ salesRep: string; month: number } | null>(null)
  const [editValue, setEditValue] = useState('')
  const [showContractForm, setShowContractForm] = useState(false)
  const [newContract, setNewContract] = useState({
    customerName: '',
    salesRepName: '',
    contractDate: new Date().toISOString().split('T')[0],
    saleAmount: '',
    profit: '',
    vehicleModel: '',
  })

  // CSVインポート関連
  const [showCSVImportModal, setShowCSVImportModal] = useState(false)
  const [csvImportResult, setCsvImportResult] = useState<{
    contracts: CSVContractData[]
    errors: string[]
    warnings: string[]
    newSalesReps: string[]  // 新規担当者リスト
  } | null>(null)
  const [isImporting, setIsImporting] = useState(false)
  const [importTargetYear, setImportTargetYear] = useState(selectedYear) // インポート先年度

  const { salesReps, addSalesRep } = useSettingsStore()
  const { isManager, user } = useAuthStore()
  const canEditTargets = isManager() // 管理者またはマネージャーのみ編集可能
  const {
    contracts,
    fiscalYearStart,
    setTarget,
    getTarget,
    addContract,
    getContractsBySalesRepAndMonth,
    importContracts,
    clearAllContracts,
    clearContractsByFiscalYear,
  } = useSalesTargetStore()

  // 年度期間の計算（5/21〜翌年5/20）
  const fiscalYearPeriod = useMemo(() => {
    const [startMonth, startDay] = fiscalYearStart.split('-').map(Number)
    const startDate = new Date(selectedYear, startMonth - 1, startDay)
    const endDate = new Date(selectedYear + 1, startMonth - 1, startDay - 1)
    return {
      start: startDate,
      end: endDate,
      label: `${selectedYear}/${startMonth}/${startDay} 〜 ${selectedYear + 1}/${startMonth}/${startDay - 1}`,
    }
  }, [selectedYear, fiscalYearStart])

  // 年度内の契約を取得
  const fiscalYearContracts = useMemo(() => {
    return contracts.filter(c => {
      const contractDate = new Date(c.contractDate)
      return contractDate >= fiscalYearPeriod.start && contractDate <= fiscalYearPeriod.end
    })
  }, [contracts, fiscalYearPeriod])

  // 前年度の期間計算
  const lastYearFiscalPeriod = useMemo(() => {
    const [startMonth, startDay] = fiscalYearStart.split('-').map(Number)
    const startDate = new Date(selectedYear - 1, startMonth - 1, startDay)
    const endDate = new Date(selectedYear, startMonth - 1, startDay - 1)
    return { start: startDate, end: endDate }
  }, [selectedYear, fiscalYearStart])

  // 前年度の契約を取得
  const lastYearContracts = useMemo(() => {
    return contracts.filter(c => {
      const contractDate = new Date(c.contractDate)
      return contractDate >= lastYearFiscalPeriod.start && contractDate <= lastYearFiscalPeriod.end
    })
  }, [contracts, lastYearFiscalPeriod])

  // 営業担当者ごとの年度集計（契約データから自動計算）
  const salesRepSummary = useMemo(() => {
    return salesReps.map(rep => {
      const repContracts = fiscalYearContracts.filter(c => c.salesRepName === rep.name)
      const awaitingDelivery = contracts.filter(c => c.salesRepName === rep.name && !c.isDelivered)

      // 契約データから自動計算
      const totalContracts = repContracts.length
      const totalSales = repContracts.reduce((sum, c) => sum + c.saleAmount, 0)
      const totalProfit = repContracts.reduce((sum, c) => sum + c.profit, 0)

      return {
        name: rep.name,
        color: rep.color,
        totalContracts,
        totalSales,
        totalProfit,
        awaitingDeliveryCount: awaitingDelivery.length,
        awaitingDeliveryTotal: awaitingDelivery.reduce((sum, c) => sum + c.saleAmount, 0),
        contracts: repContracts, // 詳細表示用
      }
    })
  }, [salesReps, fiscalYearContracts, contracts])

  // 全体集計（salesRepSummaryから合計）
  const totalSummary = useMemo(() => {
    const awaitingDelivery = contracts.filter(c => !c.isDelivered)
    return {
      totalContracts: salesRepSummary.reduce((sum, rep) => sum + rep.totalContracts, 0),
      totalSales: salesRepSummary.reduce((sum, rep) => sum + rep.totalSales, 0),
      totalProfit: salesRepSummary.reduce((sum, rep) => sum + rep.totalProfit, 0),
      awaitingDeliveryCount: awaitingDelivery.length,
      awaitingDeliveryTotal: awaitingDelivery.reduce((sum, c) => sum + c.saleAmount, 0),
    }
  }, [salesRepSummary, contracts])

  // 月次進捗データの生成
  const monthlyProgress = useMemo(() => {
    const months: { year: number; month: number }[] = []
    const [startMonth] = fiscalYearStart.split('-').map(Number)

    for (let i = 0; i < 12; i++) {
      const month = ((startMonth - 1 + i) % 12) + 1
      const year = month < startMonth ? selectedYear + 1 : selectedYear
      months.push({ year, month })
    }

    return months.map(({ year, month }) => {
      const monthData: Record<string, { target: number; actual: number; contracts: Contract[] }> = {}

      salesReps.forEach(rep => {
        const target = getTarget(rep.name, year, month)
        const repContracts = getContractsBySalesRepAndMonth(rep.name, year, month)
        monthData[rep.name] = {
          target: target?.targetCount || 0,
          actual: repContracts.length,
          contracts: repContracts,
        }
      })

      return {
        year,
        month,
        label: `${year}年${month}月`,
        data: monthData,
      }
    })
  }, [salesReps, selectedYear, fiscalYearStart, getTarget, getContractsBySalesRepAndMonth])

  // 目標編集開始
  const startEditTarget = (salesRep: string, month: number, year: number) => {
    if (!canEditTargets) return // 権限がない場合は編集不可
    const target = getTarget(salesRep, year, month)
    setEditingTarget({ salesRep, month })
    setEditValue(target?.targetCount?.toString() || '0')
  }

  // 目標保存
  const saveTarget = (year: number) => {
    if (!editingTarget) return
    const value = parseInt(editValue) || 0
    setTarget(editingTarget.salesRep, year, editingTarget.month, value)
    setEditingTarget(null)
    setEditValue('')
  }

  // 契約追加
  const handleAddContract = () => {
    if (!newContract.customerName || !newContract.salesRepName || !newContract.saleAmount) return

    addContract({
      customerId: `manual-${Date.now()}`,
      customerName: newContract.customerName,
      salesRepName: newContract.salesRepName,
      contractDate: newContract.contractDate,
      saleAmount: parseInt(newContract.saleAmount) || 0,
      profit: parseInt(newContract.profit) || 0,
      vehicleModel: newContract.vehicleModel,
      isDelivered: false,
    })

    setNewContract({
      customerName: '',
      salesRepName: '',
      contractDate: new Date().toISOString().split('T')[0],
      saleAmount: '',
      profit: '',
      vehicleModel: '',
    })
    setShowContractForm(false)
  }

  // CSVファイル選択処理
  const handleCSVFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    try {
      setIsImporting(true)
      const csvText = await readCSVFile(file)
      const validSalesRepNames = salesReps.map(rep => rep.name)
      const result = importSalesTargetFromCSV(csvText, validSalesRepNames)
      setCsvImportResult(result)
    } catch (error) {
      console.error('CSVファイル読み込みエラー:', error)
      setCsvImportResult({
        contracts: [],
        errors: ['CSVファイルの読み込みに失敗しました: ' + String(error)],
        warnings: [],
        newSalesReps: []
      })
    } finally {
      setIsImporting(false)
      e.target.value = ''
    }
  }

  // CSVインポート実行
  const executeCSVImport = () => {
    if (!csvImportResult || csvImportResult.contracts.length === 0) return

    // 新しい担当者を自動追加（ランダムな色を割り当て）
    if (csvImportResult.newSalesReps && csvImportResult.newSalesReps.length > 0) {
      csvImportResult.newSalesReps.forEach((name, index) => {
        const color = COLORS[index % COLORS.length]
        addSalesRep(name, color)
      })
    }

    const result = importContracts(csvImportResult.contracts)
    const messages: string[] = []
    messages.push(`${result.imported}件をインポートしました。`)
    if (result.skipped > 0) {
      messages.push(`${result.skipped}件は重複のためスキップされました。`)
    }
    if (csvImportResult.newSalesReps && csvImportResult.newSalesReps.length > 0) {
      messages.push(`新しい担当者を${csvImportResult.newSalesReps.length}名追加しました: ${csvImportResult.newSalesReps.join(', ')}`)
    }
    alert(messages.join('\n'))
    setCsvImportResult(null)
    setShowCSVImportModal(false)
  }

  // CSVテンプレートダウンロード
  const handleDownloadTemplate = () => {
    const template = generateSalesTargetCSVTemplate()
    downloadCSV(template, '営業目標テンプレート.csv')
  }

  // 全契約データ削除
  const handleClearAllContracts = () => {
    if (confirm('全ての契約データを削除しますか？この操作は取り消せません。')) {
      clearAllContracts()
      alert('全ての契約データを削除しました。')
    }
  }

  // 年度指定で契約データ削除
  const handleClearFiscalYearContracts = (year: number) => {
    const [startMonth, startDay] = fiscalYearStart.split('-').map(Number)
    if (confirm(`${year}年度（${year}/${startMonth}/${startDay}〜${year + 1}/${startMonth}/${startDay - 1}）の契約データを削除しますか？\nこの操作は取り消せません。`)) {
      const deletedCount = clearContractsByFiscalYear(year, fiscalYearStart)
      alert(`${deletedCount}件の契約データを削除しました。`)
    }
  }

  // インポート先年度の期間を計算
  const importTargetPeriod = useMemo(() => {
    const [startMonth, startDay] = fiscalYearStart.split('-').map(Number)
    return `${importTargetYear}/${startMonth}/${startDay}〜${importTargetYear + 1}/${startMonth}/${startDay - 1}`
  }, [importTargetYear, fiscalYearStart])

  // 年度選択肢を生成（現在年度から過去5年、未来1年）
  const fiscalYearOptions = useMemo(() => {
    const currentYear = new Date().getFullYear()
    const years: number[] = []
    for (let y = currentYear - 5; y <= currentYear + 1; y++) {
      years.push(y)
    }
    return years
  }, [])

  return (
    <div className="h-full overflow-auto p-6 bg-gray-50">
      {/* ヘッダー */}
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">営業目標</h1>
            <p className="text-sm text-gray-600 mt-0.5">
              年度期間: {fiscalYearPeriod.label}
            </p>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSelectedYear(y => y - 1)}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="text-lg font-semibold w-24 text-center">{selectedYear}年度</span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSelectedYear(y => y + 1)}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
            <Button variant="outline" onClick={() => setShowCSVImportModal(true)}>
              <Upload className="mr-2 h-4 w-4" />
              CSVインポート
            </Button>
            <Button onClick={() => setShowContractForm(true)}>
              <Plus className="mr-2 h-4 w-4" />
              契約追加
            </Button>
          </div>
        </div>
      </div>

      {/* サマリーカード */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">納車待ち台数</p>
                <p className="text-3xl font-bold text-gray-800">{totalSummary.awaitingDeliveryCount}台</p>
              </div>
              <Truck className="h-10 w-10 text-gray-400" />
            </div>
            <p className="text-sm text-gray-500 mt-2">
              総額: {formatCurrency(totalSummary.awaitingDeliveryTotal)}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">年度契約台数</p>
                <p className="text-3xl font-bold text-gray-800">{totalSummary.totalContracts}台</p>
              </div>
              <Target className="h-10 w-10 text-gray-400" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">年度売上合計</p>
                <p className="text-3xl font-bold text-gray-800">{formatCurrency(totalSummary.totalSales)}</p>
              </div>
              <DollarSign className="h-10 w-10 text-gray-400" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">年度利益合計</p>
                <p className="text-3xl font-bold text-gray-800">{formatCurrency(totalSummary.totalProfit)}</p>
              </div>
              <TrendingUp className="h-10 w-10 text-gray-400" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 4つのサマリーカード（2段目） */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {/* 年度目標台数 */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">年度目標台数</p>
                {(() => {
                  const totalTarget = salesReps.reduce((sum, rep) =>
                    sum + monthlyProgress.reduce((s, m) => s + (m.data[rep.name]?.target || 0), 0), 0)
                  const achievementRate = totalTarget > 0 ? (totalSummary.totalContracts / totalTarget) * 100 : 0
                  return (
                    <>
                      <p className="text-3xl font-bold text-gray-800">{totalTarget}台</p>
                      <p className="text-sm text-gray-500 mt-2">
                        達成率: <span className={achievementRate >= 100 ? 'text-emerald-600 font-semibold' : achievementRate >= 50 ? 'text-amber-600 font-semibold' : 'text-rose-600 font-semibold'}>{achievementRate.toFixed(1)}%</span>
                      </p>
                    </>
                  )
                })()}
              </div>
              <Target className="h-10 w-10 text-gray-400" />
            </div>
          </CardContent>
        </Card>

        {/* 前年比契約台数 */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">前年比契約台数</p>
                {(() => {
                  const totalLast = lastYearContracts.length
                  const diff = totalSummary.totalContracts - totalLast
                  const yoyRate = totalLast > 0 ? (totalSummary.totalContracts / totalLast) * 100 : (totalSummary.totalContracts > 0 ? 100 : 0)
                  return (
                    <>
                      <p className={`text-3xl font-bold ${diff >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                        {diff >= 0 ? '+' : ''}{diff}台
                      </p>
                      <p className="text-sm text-gray-500 mt-2">
                        前年比: <span className={yoyRate >= 100 ? 'text-emerald-600 font-semibold' : 'text-rose-600 font-semibold'}>{yoyRate.toFixed(1)}%</span>
                      </p>
                    </>
                  )
                })()}
              </div>
              <TrendingUp className="h-10 w-10 text-gray-400" />
            </div>
          </CardContent>
        </Card>

        {/* 去年比契約台数 */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">去年比成長率</p>
                {(() => {
                  const totalLast = lastYearContracts.length
                  const growth = totalLast > 0 ? ((totalSummary.totalContracts / totalLast) - 1) * 100 : 0
                  return (
                    <>
                      <p className={`text-3xl font-bold ${growth >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                        {growth >= 0 ? '+' : ''}{growth.toFixed(1)}%
                      </p>
                      <p className="text-sm text-gray-500 mt-2">
                        今年: {totalSummary.totalContracts}台 / 去年: {totalLast}台
                      </p>
                    </>
                  )
                })()}
              </div>
              <Users className="h-10 w-10 text-gray-400" />
            </div>
          </CardContent>
        </Card>

        {/* 昨年車両売上高 */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">昨年車両売上高</p>
                {(() => {
                  const totalLastSales = lastYearContracts.reduce((sum, c) => sum + c.saleAmount, 0)
                  const totalLastCount = lastYearContracts.length
                  const avgPrice = totalLastCount > 0 ? totalLastSales / totalLastCount : 0
                  return (
                    <>
                      <p className="text-3xl font-bold text-gray-800">{formatCurrency(totalLastSales)}</p>
                      <p className="text-sm text-gray-500 mt-2">
                        平均単価: {formatCurrency(avgPrice)}
                      </p>
                    </>
                  )
                })()}
              </div>
              <DollarSign className="h-10 w-10 text-gray-400" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 営業担当者別サマリー */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            営業担当者別 年度実績（{selectedYear}/5/21 〜 {selectedYear + 1}/5/20）
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-3 px-4 font-medium text-gray-600">担当者</th>
                  <th className="text-right py-3 px-4 font-medium text-gray-600">契約台数</th>
                  <th className="text-right py-3 px-4 font-medium text-gray-600">売上合計</th>
                  <th className="text-right py-3 px-4 font-medium text-gray-600">利益合計</th>
                  <th className="text-right py-3 px-4 font-medium text-gray-600">納車待ち</th>
                  <th className="text-right py-3 px-4 font-medium text-gray-600">納車待ち金額</th>
                </tr>
              </thead>
              <tbody>
                {salesRepSummary.map((rep) => (
                  <tr key={rep.name} className="border-b hover:bg-gray-50">
                    <td className="py-3 px-4">
                      <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-sm font-medium ${rep.color}`}>
                        {rep.name}
                      </span>
                    </td>
                    <td className="text-right py-3 px-4 font-semibold">{rep.totalContracts}台</td>
                    <td className="text-right py-3 px-4 text-gray-700 font-semibold">{formatCurrency(rep.totalSales)}</td>
                    <td className="text-right py-3 px-4 text-gray-700 font-semibold">{formatCurrency(rep.totalProfit)}</td>
                    <td className="text-right py-3 px-4 text-gray-700 font-semibold">{rep.awaitingDeliveryCount}台</td>
                    <td className="text-right py-3 px-4 text-gray-600">{formatCurrency(rep.awaitingDeliveryTotal)}</td>
                  </tr>
                ))}
                <tr className="bg-gray-100 font-bold">
                  <td className="py-3 px-4">合計</td>
                  <td className="text-right py-3 px-4">{totalSummary.totalContracts}台</td>
                  <td className="text-right py-3 px-4 text-gray-800">{formatCurrency(totalSummary.totalSales)}</td>
                  <td className="text-right py-3 px-4 text-gray-800">{formatCurrency(totalSummary.totalProfit)}</td>
                  <td className="text-right py-3 px-4 text-gray-800">{totalSummary.awaitingDeliveryCount}台</td>
                  <td className="text-right py-3 px-4 text-gray-700">{formatCurrency(totalSummary.awaitingDeliveryTotal)}</td>
                </tr>
              </tbody>
            </table>
          </div>
          <p className="text-xs text-gray-500 mt-2">
            ※ 「契約追加」ボタンで追加した契約データから自動集計されます
          </p>
        </CardContent>
      </Card>

      {/* 月次目標・進捗 */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            月次目標・進捗
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-2 px-3 font-medium text-gray-600 sticky left-0 bg-white">担当者</th>
                  {monthlyProgress.map(({ year, month, label }) => (
                    <th key={`${year}-${month}`} className="text-center py-2 px-3 font-medium text-gray-600 min-w-[80px]">
                      {month}月
                    </th>
                  ))}
                  <th className="text-center py-2 px-3 font-medium text-gray-600">年度計</th>
                </tr>
              </thead>
              <tbody>
                {salesReps.map((rep) => {
                  const yearTotal = monthlyProgress.reduce((sum, m) => sum + (m.data[rep.name]?.actual || 0), 0)
                  const yearTargetTotal = monthlyProgress.reduce((sum, m) => sum + (m.data[rep.name]?.target || 0), 0)

                  return (
                    <tr key={rep.name} className="border-b hover:bg-gray-50">
                      <td className="py-2 px-3 sticky left-0 bg-white">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${rep.color}`}>
                          {rep.name}
                        </span>
                      </td>
                      {monthlyProgress.map(({ year, month, data }) => {
                        const repData = data[rep.name]
                        const isEditing = editingTarget?.salesRep === rep.name && editingTarget?.month === month
                        const progressPercent = repData?.target > 0 ? (repData.actual / repData.target) * 100 : 0

                        return (
                          <td key={`${year}-${month}`} className="py-2 px-3 text-center">
                            {isEditing ? (
                              <div className="flex items-center gap-1 justify-center">
                                <Input
                                  type="number"
                                  value={editValue}
                                  onChange={(e) => setEditValue(e.target.value)}
                                  className="w-12 h-6 text-xs text-center p-1"
                                />
                                <button onClick={() => saveTarget(year)} className="text-green-600">
                                  <Check className="h-3 w-3" />
                                </button>
                                <button onClick={() => setEditingTarget(null)} className="text-red-600">
                                  <X className="h-3 w-3" />
                                </button>
                              </div>
                            ) : (
                              <div
                                className={`rounded p-1 ${canEditTargets ? 'cursor-pointer hover:bg-gray-100' : ''}`}
                                onClick={() => startEditTarget(rep.name, month, year)}
                              >
                                <div className={`font-semibold ${
                                  progressPercent >= 100 ? 'text-emerald-600' :
                                  progressPercent >= 50 ? 'text-amber-600' : 'text-gray-700'
                                }`}>
                                  {repData?.actual || 0}/{repData?.target || 0}
                                </div>
                                {repData?.target > 0 && (
                                  <div className="w-full bg-gray-200 rounded-full h-1 mt-1">
                                    <div
                                      className={`h-1 rounded-full ${
                                        progressPercent >= 100 ? 'bg-emerald-500' :
                                        progressPercent >= 50 ? 'bg-amber-400' : 'bg-gray-400'
                                      }`}
                                      style={{ width: `${Math.min(progressPercent, 100)}%` }}
                                    />
                                  </div>
                                )}
                              </div>
                            )}
                          </td>
                        )
                      })}
                      <td className="py-2 px-3 text-center font-bold">
                        <span className={yearTotal >= yearTargetTotal ? 'text-emerald-600' : 'text-gray-700'}>
                          {yearTotal}/{yearTargetTotal}
                        </span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
          <p className="text-xs text-gray-500 mt-2 flex items-center gap-1">
            {canEditTargets ? (
              '※ 数字をクリックして目標を編集できます'
            ) : (
              <>
                <Lock className="h-3 w-3" />
                目標の編集は管理者またはマネージャーのみ可能です
              </>
            )}
          </p>
        </CardContent>
      </Card>

      {/* 年度契約一覧 */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            年度契約一覧（{selectedYear}年度）
            <span className="text-sm font-normal text-gray-500">
              {fiscalYearContracts.length}件
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {fiscalYearContracts.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <FileText className="h-12 w-12 mx-auto mb-4 text-gray-300" />
              <p>この年度の契約データがありません</p>
              <p className="text-sm mt-2">原価計算ページで「確定」ボタンを押すと、ここに表示されます</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="text-left py-3 px-4 font-medium text-gray-600">契約日</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-600">顧客名</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-600">車両</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-600">担当</th>
                    <th className="text-right py-3 px-4 font-medium text-gray-600">売上</th>
                    <th className="text-right py-3 px-4 font-medium text-gray-600">利益</th>
                    <th className="text-center py-3 px-4 font-medium text-gray-600">納車</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {fiscalYearContracts
                    .sort((a, b) => new Date(b.contractDate).getTime() - new Date(a.contractDate).getTime())
                    .map((contract) => {
                      const rep = salesReps.find(r => r.name === contract.salesRepName)
                      return (
                        <tr key={contract.id} className="hover:bg-gray-50">
                          <td className="py-3 px-4">{formatDate(contract.contractDate)}</td>
                          <td className="py-3 px-4 font-medium">{contract.customerName}</td>
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-1 text-gray-600">
                              <Car className="h-3 w-3" />
                              {contract.vehicleModel || '-'}
                            </div>
                          </td>
                          <td className="py-3 px-4">
                            {rep ? (
                              <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${rep.color}`}>
                                {contract.salesRepName}
                              </span>
                            ) : (
                              <span className="text-gray-500">{contract.salesRepName}</span>
                            )}
                          </td>
                          <td className="py-3 px-4 text-right text-gray-700 font-medium">
                            {formatCurrency(contract.saleAmount)}
                          </td>
                          <td className="py-3 px-4 text-right text-gray-700 font-medium">
                            {formatCurrency(contract.profit)}
                          </td>
                          <td className="py-3 px-4 text-center">
                            {contract.isDelivered ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs bg-gray-100 text-gray-600">
                                <Check className="h-3 w-3" />
                                済
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs bg-amber-50 text-amber-700 border border-amber-200">
                                <Truck className="h-3 w-3" />
                                待ち
                              </span>
                            )}
                          </td>
                        </tr>
                      )
                    })}
                </tbody>
              </table>
            </div>
          )}
          <div className="mt-4 pt-4 border-t flex items-center justify-between text-sm">
            <div className="flex gap-4 text-gray-500">
              <span>合計売上: <span className="font-semibold text-gray-800">{formatCurrency(fiscalYearContracts.reduce((sum, c) => sum + c.saleAmount, 0))}</span></span>
              <span>合計利益: <span className="font-semibold text-gray-800">{formatCurrency(fiscalYearContracts.reduce((sum, c) => sum + c.profit, 0))}</span></span>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => window.location.href = '/dashboard/quotes'}
              className="gap-1"
            >
              <ExternalLink className="h-3 w-3" />
              原価計算ページへ
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* 契約追加モーダル */}
      {showContractForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h2 className="text-lg font-bold mb-4">契約追加</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">顧客名 *</label>
                <Input
                  value={newContract.customerName}
                  onChange={(e) => setNewContract({ ...newContract, customerName: e.target.value })}
                  placeholder="顧客名を入力"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">担当者 *</label>
                <select
                  value={newContract.salesRepName}
                  onChange={(e) => setNewContract({ ...newContract, salesRepName: e.target.value })}
                  className="w-full border rounded-md px-3 py-2"
                >
                  <option value="">選択してください</option>
                  {salesReps.map((rep) => (
                    <option key={rep.id} value={rep.name}>{rep.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">契約日</label>
                <Input
                  type="date"
                  value={newContract.contractDate}
                  onChange={(e) => setNewContract({ ...newContract, contractDate: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">車種</label>
                <Input
                  value={newContract.vehicleModel}
                  onChange={(e) => setNewContract({ ...newContract, vehicleModel: e.target.value })}
                  placeholder="車種を入力"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">売上金額 *</label>
                <Input
                  type="number"
                  value={newContract.saleAmount}
                  onChange={(e) => setNewContract({ ...newContract, saleAmount: e.target.value })}
                  placeholder="例: 6500000"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">利益</label>
                <Input
                  type="number"
                  value={newContract.profit}
                  onChange={(e) => setNewContract({ ...newContract, profit: e.target.value })}
                  placeholder="例: 850000"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-6">
              <Button variant="outline" onClick={() => setShowContractForm(false)}>
                キャンセル
              </Button>
              <Button onClick={handleAddContract}>
                追加
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* CSVインポートモーダル */}
      {showCSVImportModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold flex items-center gap-2">
                <Upload className="h-5 w-5" />
                CSVインポート
              </h2>
              <button
                onClick={() => {
                  setShowCSVImportModal(false)
                  setCsvImportResult(null)
                }}
                className="text-gray-500 hover:text-gray-700"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* 年度選択 */}
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mb-4">
              <h3 className="font-medium text-gray-800 mb-2">インポート先年度を選択</h3>
              <div className="flex items-center gap-4">
                <select
                  value={importTargetYear}
                  onChange={(e) => setImportTargetYear(Number(e.target.value))}
                  className="border rounded-md px-3 py-2 bg-white"
                >
                  {fiscalYearOptions.map((year) => (
                    <option key={year} value={year}>{year}年度</option>
                  ))}
                </select>
                <span className="text-sm text-gray-600">
                  期間: {importTargetPeriod}
                </span>
              </div>
              <p className="text-xs text-gray-500 mt-2">
                ※ CSVの契約日がこの年度内に収まっているか確認してください
              </p>
              {fiscalYearContracts.length > 0 && importTargetYear === selectedYear && (
                <div className="mt-2 flex items-center gap-2">
                  <span className="text-sm text-orange-600">
                    現在 {fiscalYearContracts.length}件 のデータがあります
                  </span>
                  <Button
                    size="sm"
                    variant="outline"
                    className="text-red-600 border-red-300 hover:bg-red-50"
                    onClick={() => handleClearFiscalYearContracts(importTargetYear)}
                  >
                    <Trash2 className="mr-1 h-3 w-3" />
                    {importTargetYear}年度データを削除
                  </Button>
                </div>
              )}
            </div>

            {/* 説明 */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
              <h3 className="font-medium text-blue-800 mb-2">CSVフォーマット</h3>
              <p className="text-sm text-blue-700 mb-2">
                以下の2つのフォーマットに対応しています（自動判定）：
              </p>
              <div className="space-y-3">
                <div>
                  <p className="text-xs text-blue-700 font-medium mb-1">フォーマット1（シンプル）:</p>
                  <div className="text-xs text-blue-600 font-mono bg-blue-100 p-2 rounded">
                    担当名, 契約日, 顧客名, 車種, 売上金額, 利益, MQ
                  </div>
                </div>
                <div>
                  <p className="text-xs text-blue-700 font-medium mb-1">フォーマット2（新車/中古/改造）:</p>
                  <div className="text-xs text-blue-600 font-mono bg-blue-100 p-2 rounded">
                    A:担当, B:契約日, C:顧客名, D:車種, E:空, F:新車(1), G:中古(1), H:改造(1), I:新車売上, J:新車利益, K:利益率, L:中古売上, M:中古利益, N:空, O:改造売上, P:改造利益
                  </div>
                </div>
              </div>
              <ul className="text-xs text-blue-600 mt-2 space-y-1">
                <li>• 契約日: YYYY-MM-DD, YYYY/MM/DD, YYYY年MM月DD日 形式に対応</li>
                <li>• 売上金額/利益: 「650万」「6500000」「6,500,000円」形式に対応</li>
                <li>• F/G/H列: 1が入っていれば該当（新車/中古/改造）として集計</li>
              </ul>
              <div className="mt-3 flex gap-2">
                <Button size="sm" variant="outline" onClick={handleDownloadTemplate}>
                  <Download className="mr-1 h-3 w-3" />
                  テンプレートダウンロード
                </Button>
              </div>
            </div>

            {/* ファイル選択 */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                CSVファイルを選択
              </label>
              <input
                type="file"
                accept=".csv,.txt"
                onChange={handleCSVFileSelect}
                disabled={isImporting}
                className="block w-full text-sm text-gray-500
                  file:mr-4 file:py-2 file:px-4
                  file:rounded-md file:border-0
                  file:text-sm file:font-medium
                  file:bg-blue-50 file:text-blue-700
                  hover:file:bg-blue-100
                  cursor-pointer"
              />
            </div>

            {/* インポート結果プレビュー */}
            {csvImportResult && (
              <div className="space-y-4">
                {/* エラー */}
                {csvImportResult.errors.length > 0 && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                    <div className="flex items-center gap-2 text-red-800 font-medium mb-2">
                      <AlertTriangle className="h-4 w-4" />
                      エラー ({csvImportResult.errors.length}件)
                    </div>
                    <ul className="text-sm text-red-700 space-y-1">
                      {csvImportResult.errors.map((error, i) => (
                        <li key={i}>• {error}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* 警告 */}
                {csvImportResult.warnings.length > 0 && (
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                    <div className="flex items-center gap-2 text-yellow-800 font-medium mb-2">
                      <AlertTriangle className="h-4 w-4" />
                      警告 ({csvImportResult.warnings.length}件)
                    </div>
                    <ul className="text-sm text-yellow-700 space-y-1 max-h-32 overflow-y-auto">
                      {csvImportResult.warnings.map((warning, i) => (
                        <li key={i}>• {warning}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* 新しい担当者 */}
                {csvImportResult.newSalesReps && csvImportResult.newSalesReps.length > 0 && (
                  <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                    <div className="flex items-center gap-2 text-green-800 font-medium mb-2">
                      <Users className="h-4 w-4" />
                      新しい担当者を追加します ({csvImportResult.newSalesReps.length}名)
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {csvImportResult.newSalesReps.map((name, i) => (
                        <span key={i} className="px-2 py-1 bg-green-100 text-green-800 rounded-md text-sm">
                          {name}
                        </span>
                      ))}
                    </div>
                    <p className="text-xs text-green-600 mt-2">
                      ※ インポート実行時に自動で担当者として登録されます
                    </p>
                  </div>
                )}

                {/* プレビュー */}
                {csvImportResult.contracts.length > 0 && (
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="font-medium text-gray-800">
                        インポートプレビュー ({csvImportResult.contracts.length}件)
                      </h3>
                    </div>
                    <div className="border rounded-lg overflow-hidden">
                      <div className="max-h-64 overflow-y-auto">
                        <table className="w-full text-sm">
                          <thead className="bg-gray-50 sticky top-0">
                            <tr>
                              <th className="text-left py-2 px-3 font-medium text-gray-600">担当</th>
                              <th className="text-left py-2 px-3 font-medium text-gray-600">契約日</th>
                              <th className="text-left py-2 px-3 font-medium text-gray-600">顧客名</th>
                              <th className="text-left py-2 px-3 font-medium text-gray-600">車種</th>
                              <th className="text-center py-2 px-3 font-medium text-gray-600">種別</th>
                              <th className="text-right py-2 px-3 font-medium text-gray-600">売上</th>
                              <th className="text-right py-2 px-3 font-medium text-gray-600">利益</th>
                            </tr>
                          </thead>
                          <tbody>
                            {csvImportResult.contracts.slice(0, 20).map((contract, i) => (
                              <tr key={i} className="border-t hover:bg-gray-50">
                                <td className="py-2 px-3">{contract.salesRepName}</td>
                                <td className="py-2 px-3">{contract.contractDate}</td>
                                <td className="py-2 px-3">{contract.customerName}</td>
                                <td className="py-2 px-3">{contract.vehicleModel}</td>
                                <td className="py-2 px-3 text-center">
                                  {contract.vehicleType === 'new' && <span className="px-1.5 py-0.5 bg-blue-100 text-blue-700 rounded text-xs">新車</span>}
                                  {contract.vehicleType === 'used' && <span className="px-1.5 py-0.5 bg-green-100 text-green-700 rounded text-xs">中古</span>}
                                  {contract.vehicleType === 'modification' && <span className="px-1.5 py-0.5 bg-amber-100 text-amber-700 rounded text-xs">改造</span>}
                                  {!contract.vehicleType && (contract.isMQ ? <span className="text-gray-400">MQ</span> : '-')}
                                </td>
                                <td className="py-2 px-3 text-right text-gray-700">{formatCurrency(contract.saleAmount)}</td>
                                <td className="py-2 px-3 text-right text-gray-700">{formatCurrency(contract.profit)}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                      {csvImportResult.contracts.length > 20 && (
                        <div className="bg-gray-50 px-3 py-2 text-sm text-gray-500 text-center">
                          他 {csvImportResult.contracts.length - 20} 件...
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* アクションボタン */}
            <div className="flex justify-between items-center mt-6 pt-4 border-t">
              <div className="flex gap-2">
                {contracts.length > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-red-600 hover:text-red-700 hover:bg-red-50"
                    onClick={handleClearAllContracts}
                  >
                    <Trash2 className="mr-1 h-4 w-4" />
                    全データ削除
                  </Button>
                )}
              </div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => {
                  setShowCSVImportModal(false)
                  setCsvImportResult(null)
                }}>
                  キャンセル
                </Button>
                <Button
                  onClick={executeCSVImport}
                  disabled={!csvImportResult || csvImportResult.contracts.length === 0}
                >
                  <Upload className="mr-2 h-4 w-4" />
                  {csvImportResult?.contracts.length || 0}件をインポート
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
