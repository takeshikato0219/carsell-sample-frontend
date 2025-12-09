'use client'

import { useState, useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  TrendingUp,
  Truck,
  Target,
  DollarSign,
  Users,
  Calendar,
  ChevronLeft,
  ChevronRight,
  FileText,
  Check,
  Car,
  BarChart3
} from 'lucide-react'
import { useSalesTargetStore } from '@/stores/sales-target-store'
import { useSettingsStore } from '@/stores/settings-store'

// 金額フォーマット（カンマ区切り）
function formatCurrency(amount: number): string {
  return `${amount.toLocaleString()}円`
}

// 日付フォーマット
function formatDate(dateString: string): string {
  const date = new Date(dateString)
  return `${date.getFullYear()}/${date.getMonth() + 1}/${date.getDate()}`
}

export default function ResultsPage() {
  const [selectedYear, setSelectedYear] = useState(2025)
  const { salesReps } = useSettingsStore()
  const {
    contracts,
    fiscalYearStart,
    getContractsBySalesRepAndMonth,
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

  // 月次実績データの生成
  const monthlyResults = useMemo(() => {
    const months: { year: number; month: number }[] = []
    const [startMonth] = fiscalYearStart.split('-').map(Number)

    for (let i = 0; i < 12; i++) {
      const month = ((startMonth - 1 + i) % 12) + 1
      const year = month < startMonth ? selectedYear + 1 : selectedYear
      months.push({ year, month })
    }

    return months.map(({ year, month }) => {
      const monthData: Record<string, { actual: number; sales: number; profit: number }> = {}

      salesReps.forEach(rep => {
        const repContracts = getContractsBySalesRepAndMonth(rep.name, year, month)
        monthData[rep.name] = {
          actual: repContracts.length,
          sales: repContracts.reduce((sum, c) => sum + c.saleAmount, 0),
          profit: repContracts.reduce((sum, c) => sum + c.profit, 0),
        }
      })

      return {
        year,
        month,
        label: `${year}年${month}月`,
        data: monthData,
      }
    })
  }, [salesReps, selectedYear, fiscalYearStart, getContractsBySalesRepAndMonth])

  return (
    <div className="h-full overflow-auto p-6 bg-gray-50">
      {/* ヘッダー */}
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">営業結果</h1>
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
          </div>
        </div>
      </div>

      {/* サマリーカード */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
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
      </div>

      {/* 前年比カード */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
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

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">前年比売上</p>
                {(() => {
                  const totalLastSales = lastYearContracts.reduce((sum, c) => sum + c.saleAmount, 0)
                  const diff = totalSummary.totalSales - totalLastSales
                  const yoyRate = totalLastSales > 0 ? (totalSummary.totalSales / totalLastSales) * 100 : (totalSummary.totalSales > 0 ? 100 : 0)
                  return (
                    <>
                      <p className={`text-2xl font-bold ${diff >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                        {diff >= 0 ? '+' : ''}{formatCurrency(diff)}
                      </p>
                      <p className="text-sm text-gray-500 mt-2">
                        前年比: <span className={yoyRate >= 100 ? 'text-emerald-600 font-semibold' : 'text-rose-600 font-semibold'}>{yoyRate.toFixed(1)}%</span>
                      </p>
                    </>
                  )
                })()}
              </div>
              <DollarSign className="h-10 w-10 text-gray-400" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">前年比利益</p>
                {(() => {
                  const totalLastProfit = lastYearContracts.reduce((sum, c) => sum + c.profit, 0)
                  const diff = totalSummary.totalProfit - totalLastProfit
                  const yoyRate = totalLastProfit > 0 ? (totalSummary.totalProfit / totalLastProfit) * 100 : (totalSummary.totalProfit > 0 ? 100 : 0)
                  return (
                    <>
                      <p className={`text-2xl font-bold ${diff >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                        {diff >= 0 ? '+' : ''}{formatCurrency(diff)}
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
      </div>

      {/* 営業担当者別サマリー */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            営業担当者別 年度実績
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
                  <th className="text-right py-3 px-4 font-medium text-gray-600">平均売上単価</th>
                  <th className="text-right py-3 px-4 font-medium text-gray-600">平均利益</th>
                  <th className="text-right py-3 px-4 font-medium text-gray-600">利益率</th>
                </tr>
              </thead>
              <tbody>
                {salesRepSummary.map((rep) => {
                  const avgSales = rep.totalContracts > 0 ? rep.totalSales / rep.totalContracts : 0
                  const avgProfit = rep.totalContracts > 0 ? rep.totalProfit / rep.totalContracts : 0
                  const profitRate = rep.totalSales > 0 ? (rep.totalProfit / rep.totalSales) * 100 : 0
                  return (
                    <tr key={rep.name} className="border-b hover:bg-gray-50">
                      <td className="py-3 px-4">
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-sm font-medium ${rep.color}`}>
                          {rep.name}
                        </span>
                      </td>
                      <td className="text-right py-3 px-4 font-semibold">{rep.totalContracts}台</td>
                      <td className="text-right py-3 px-4 text-gray-700 font-semibold">{formatCurrency(rep.totalSales)}</td>
                      <td className="text-right py-3 px-4 text-gray-700 font-semibold">{formatCurrency(rep.totalProfit)}</td>
                      <td className="text-right py-3 px-4 text-gray-600">{formatCurrency(avgSales)}</td>
                      <td className="text-right py-3 px-4 text-gray-600">{formatCurrency(avgProfit)}</td>
                      <td className="text-right py-3 px-4 text-gray-600">{profitRate.toFixed(1)}%</td>
                    </tr>
                  )
                })}
                <tr className="bg-gray-100 font-bold">
                  <td className="py-3 px-4">合計</td>
                  <td className="text-right py-3 px-4">{totalSummary.totalContracts}台</td>
                  <td className="text-right py-3 px-4 text-gray-800">{formatCurrency(totalSummary.totalSales)}</td>
                  <td className="text-right py-3 px-4 text-gray-800">{formatCurrency(totalSummary.totalProfit)}</td>
                  <td className="text-right py-3 px-4 text-gray-700">
                    {formatCurrency(totalSummary.totalContracts > 0 ? totalSummary.totalSales / totalSummary.totalContracts : 0)}
                  </td>
                  <td className="text-right py-3 px-4 text-gray-700">
                    {formatCurrency(totalSummary.totalContracts > 0 ? totalSummary.totalProfit / totalSummary.totalContracts : 0)}
                  </td>
                  <td className="text-right py-3 px-4 text-gray-700">
                    {totalSummary.totalSales > 0 ? ((totalSummary.totalProfit / totalSummary.totalSales) * 100).toFixed(1) : '0.0'}%
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* 月次実績 */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            月次実績
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-2 px-3 font-medium text-gray-600 sticky left-0 bg-white">担当者</th>
                  {monthlyResults.map(({ year, month }) => (
                    <th key={`${year}-${month}`} className="text-center py-2 px-3 font-medium text-gray-600 min-w-[80px]">
                      {month}月
                    </th>
                  ))}
                  <th className="text-center py-2 px-3 font-medium text-gray-600">年度計</th>
                </tr>
              </thead>
              <tbody>
                {salesReps.map((rep) => {
                  const yearTotal = monthlyResults.reduce((sum, m) => sum + (m.data[rep.name]?.actual || 0), 0)

                  return (
                    <tr key={rep.name} className="border-b hover:bg-gray-50">
                      <td className="py-2 px-3 sticky left-0 bg-white">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${rep.color}`}>
                          {rep.name}
                        </span>
                      </td>
                      {monthlyResults.map(({ year, month, data }) => {
                        const repData = data[rep.name]
                        return (
                          <td key={`${year}-${month}`} className="py-2 px-3 text-center">
                            <div className="font-semibold text-gray-700">
                              {repData?.actual || 0}台
                            </div>
                            <div className="text-xs text-gray-500">
                              {formatCurrency(repData?.sales || 0)}
                            </div>
                          </td>
                        )
                      })}
                      <td className="py-2 px-3 text-center font-bold text-emerald-600">
                        {yearTotal}台
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
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
        </CardContent>
      </Card>
    </div>
  )
}
