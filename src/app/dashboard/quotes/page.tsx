'use client'

import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Calculator,
  Check,
  TrendingUp,
  ChevronDown,
  ChevronUp,
  CheckCircle,
  AlertCircle,
  Car,
  Package,
  Receipt,
  FileText,
  Edit3
} from 'lucide-react'
import { useSalesTargetStore } from '@/stores/sales-target-store'
import { useEstimateStore, Estimate } from '@/stores/estimate-store'
import { vehicleOptions } from '@/data/options-data'
import { vehicles } from '@/data/vehicles-data'

// 数値をフォーマット（カンマ区切り）
function formatNumber(num: number): string {
  return num.toLocaleString('ja-JP')
}

// 見積もりから原価を計算するヘルパー関数
function calculateEstimateCost(estimate: Estimate): {
  vehicleCost: number
  vehicleCostSource: 'master' | 'fallback'
  optionsCost: number
  optionDetails: { name: string; price: number; cost: number }[]
  taxTotal: number
  totalCost: number
  salePrice: number
  profit: number
  profitMargin: number
} {
  // 車両原価（D欄）= 車両マスターのcostフィールドを使用
  let vehicleCost = 0
  let vehicleCostSource: 'master' | 'fallback' = 'fallback'

  if (estimate.vehicleId) {
    const vehicle = vehicles.find(v => v.id === estimate.vehicleId)
    if (vehicle && vehicle.cost && vehicle.cost > 0) {
      vehicleCost = vehicle.cost
      vehicleCostSource = 'master'
    }
  }

  // 車両マスターにcostが設定されていない場合はフォールバック（販売価格の80%）
  if (vehicleCost === 0 && estimate.vehiclePrice > 0) {
    vehicleCost = Math.round(estimate.vehiclePrice * 0.8)
    vehicleCostSource = 'fallback'
  }

  // オプション原価を計算
  const optionDetails = estimate.options.map(item => {
    const optionData = vehicleOptions.find(o => o.id === item.optionId)
    const cost = optionData?.cost || 0
    return {
      name: item.optionName,
      price: item.amount,
      cost: cost * item.quantity
    }
  })

  const optionsCost = optionDetails.reduce((sum, item) => sum + item.cost, 0)

  // 税金（環境性能割 + 重量税 + 自賠責 + リサイクル）
  const taxTotal = (estimate.taxEnv || 0) + (estimate.taxWeight || 0) +
                   (estimate.insurance || 0) + (estimate.recycleFee || 0)

  const totalCost = vehicleCost + optionsCost
  const salePrice = estimate.totalAmount
  // 利益 = 売上 - 車両原価 - オプション原価 - 税金
  const profit = salePrice - totalCost - taxTotal
  const profitMargin = salePrice > 0 ? (profit / salePrice) * 100 : 0

  return {
    vehicleCost,
    vehicleCostSource,
    optionsCost,
    optionDetails,
    taxTotal,
    totalCost,
    salePrice,
    profit,
    profitMargin
  }
}

export default function CostCalculationPage() {
  const router = useRouter()
  const { contracts, addContract } = useSalesTargetStore()
  const { estimates, updateEstimate } = useEstimateStore()

  // 契約済み（accepted）のみ表示
  const allEstimates = useMemo(() => {
    return estimates
      .filter(e => e.status === 'accepted') // 契約済みのみ
      .map(e => {
        const costCalc = calculateEstimateCost(e)
        const existingContract = contracts.find(c => c.estimateId === e.id)
        return {
          estimate: e,
          costCalculation: costCalc,
          contract: existingContract
        }
      })
      .sort((a, b) => new Date(b.estimate.updatedAt).getTime() - new Date(a.estimate.updatedAt).getTime())
  }, [estimates, contracts])

  // 選択中の見積もりID
  const [selectedEstimateId, setSelectedEstimateId] = useState<string | null>(null)
  const selectedEstimateData = useMemo(() => {
    return allEstimates.find(e => e.estimate.id === selectedEstimateId)
  }, [allEstimates, selectedEstimateId])

  // 手動原価入力の状態
  const [manualCosts, setManualCosts] = useState<Record<string, {
    vehicleCost: string
    optionsCost: string
  }>>({})

  // 手動入力で原価を上書き
  const getAdjustedCost = (estimateId: string, calc: ReturnType<typeof calculateEstimateCost>) => {
    const manual = manualCosts[estimateId]
    if (!manual) return calc

    const vehicleCost = manual.vehicleCost ? parseInt(manual.vehicleCost.replace(/,/g, '')) || calc.vehicleCost : calc.vehicleCost
    const optionsCost = manual.optionsCost ? parseInt(manual.optionsCost.replace(/,/g, '')) || calc.optionsCost : calc.optionsCost
    const totalCost = vehicleCost + optionsCost
    const profit = calc.salePrice - totalCost - calc.taxTotal
    const profitMargin = calc.salePrice > 0 ? (profit / calc.salePrice) * 100 : 0

    return {
      ...calc,
      vehicleCost,
      optionsCost,
      totalCost,
      profit,
      profitMargin,
      vehicleCostSource: manual.vehicleCost ? 'manual' as const : calc.vehicleCostSource
    }
  }

  // 原価・利益確定処理（営業目標に登録）
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const handleConfirmContract = (estimateData: { estimate: Estimate; costCalculation: any; contract: typeof contracts[0] | undefined }) => {
    const est = estimateData.estimate
    const calc = estimateData.costCalculation

    // 確認ダイアログ
    const confirmed = confirm(
      `「${est.customerName || '未入力'}」の原価・利益を確定しますか？\n\n` +
      `売上: ¥${formatNumber(calc.salePrice)}\n` +
      `原価: ¥${formatNumber(calc.totalCost)}\n` +
      `税金: ¥${formatNumber(calc.taxTotal)}\n` +
      `利益: ¥${formatNumber(calc.profit)}\n\n` +
      `確定すると営業目標の実績に反映されます。`
    )

    if (!confirmed) return

    // 契約データを営業目標ストアに登録
    addContract({
      customerId: est.customerId || '',
      customerName: est.customerName || '',
      salesRepName: est.salesRepName || '未割当',
      contractDate: new Date().toISOString().split('T')[0],
      saleAmount: calc.salePrice,
      profit: calc.profit,
      vehicleModel: est.vehicleName || '',
      isDelivered: false,
      estimateId: est.id,
    })

    alert(`原価・利益を確定しました。\n\n売上: ¥${formatNumber(calc.salePrice)}\n利益: ¥${formatNumber(calc.profit)}\n\n営業目標と契約・納車待ちに反映されます。`)
    setSelectedEstimateId(null)
  }

  // サマリー計算
  const summary = useMemo(() => {
    return {
      totalEstimates: allEstimates.length,
      totalSales: allEstimates.reduce((sum, e) => sum + e.costCalculation.salePrice, 0),
      totalProfit: allEstimates.reduce((sum, e) => sum + e.costCalculation.profit, 0),
      totalCost: allEstimates.reduce((sum, e) => sum + e.costCalculation.totalCost, 0),
    }
  }, [allEstimates])

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <Calculator className="h-7 w-7" />
          原価計算
        </h1>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => router.push('/dashboard/targets')}
            className="gap-2"
          >
            <TrendingUp className="h-4 w-4" />
            営業目標へ
          </Button>
          <Button
            onClick={() => router.push('/dashboard/contracts')}
            className="gap-2 bg-green-600 hover:bg-green-700"
          >
            <CheckCircle className="h-4 w-4" />
            契約・納車待ちへ
          </Button>
        </div>
      </div>

      {/* サマリーカード */}
      <div className="grid grid-cols-3 gap-4">
        <Card className="bg-blue-50 border-blue-200">
          <CardContent className="py-4 text-center">
            <div className="text-2xl font-bold text-blue-600">{summary.totalEstimates}</div>
            <div className="text-sm text-blue-600">契約件数</div>
          </CardContent>
        </Card>
        <Card className="bg-green-50 border-green-200">
          <CardContent className="py-4 text-center">
            <div className="text-2xl font-bold text-green-600">
              ¥{formatNumber(summary.totalProfit)}
            </div>
            <div className="text-sm text-green-600">総利益</div>
          </CardContent>
        </Card>
        <Card className="bg-yellow-50 border-yellow-200">
          <CardContent className="py-4 text-center">
            <div className="text-2xl font-bold text-yellow-600">
              ¥{formatNumber(summary.totalSales)}
            </div>
            <div className="text-sm text-yellow-600">総売上</div>
          </CardContent>
        </Card>
      </div>

      {/* フォールバック使用の警告 */}
      {allEstimates.filter(e => e.costCalculation.vehicleCostSource === 'fallback').length > 0 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 flex items-center gap-3">
          <AlertCircle className="h-5 w-5 text-yellow-600 flex-shrink-0" />
          <div className="text-sm text-yellow-800">
            <span className="font-medium">
              {allEstimates.filter(e => e.costCalculation.vehicleCostSource === 'fallback').length}件
            </span>
            の見積もりで車両原価が未設定のため、販売価格の80%を仮原価として計算しています。
            正確な利益計算には<a href="/dashboard/admin/vehicles" className="underline font-medium hover:text-yellow-900">車両管理</a>で原価（D欄）を設定してください。
          </div>
        </div>
      )}

      {/* 契約一覧 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Receipt className="h-5 w-5" />
            契約一覧（原価計算）
          </CardTitle>
        </CardHeader>
        <CardContent>
          {allEstimates.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <FileText className="h-12 w-12 mx-auto mb-4 text-gray-300" />
              <p>契約がありません</p>
              <p className="text-sm mt-2">見積もりページで契約ボタン（✓）を押すと、ここに表示されます</p>
              <Button
                className="mt-4"
                onClick={() => router.push('/dashboard/estimates')}
              >
                見積もり作成へ
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left font-medium text-gray-600">顧客名</th>
                    <th className="px-4 py-3 text-left font-medium text-gray-600">車両</th>
                    <th className="px-4 py-3 text-left font-medium text-gray-600">担当</th>
                    <th className="px-4 py-3 text-right font-medium text-gray-600">売上価格</th>
                    <th className="px-4 py-3 text-right font-medium text-gray-600">原価</th>
                    <th className="px-4 py-3 text-right font-medium text-gray-600">利益</th>
                    <th className="px-4 py-3 text-right font-medium text-gray-600">利益率</th>
                    <th className="px-4 py-3 text-center font-medium text-gray-600">確定</th>
                    <th className="px-4 py-3 text-center font-medium text-gray-600">詳細</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {allEstimates.map(({ estimate, costCalculation, contract }) => {
                    const adjustedCost = getAdjustedCost(estimate.id, costCalculation)
                    return (
                      <tr key={estimate.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 font-medium">{estimate.customerName || '未入力'}</td>
                        <td className="px-4 py-3 text-gray-600">{estimate.vehicleName || '-'}</td>
                        <td className="px-4 py-3">
                          {estimate.salesRepName && (
                            <span className={`px-2 py-0.5 rounded text-xs ${estimate.salesRepColor || 'bg-gray-100'}`}>
                              {estimate.salesRepName}
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right">¥{formatNumber(adjustedCost.salePrice)}</td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex items-center justify-end gap-1">
                            {costCalculation.vehicleCostSource === 'fallback' && (
                              <span className="text-xs bg-yellow-100 text-yellow-700 px-1 rounded" title="車両原価が未設定のため80%で計算">仮</span>
                            )}
                            <span className="text-red-600">¥{formatNumber(adjustedCost.totalCost)}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <span className={`font-medium ${adjustedCost.profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                            ¥{formatNumber(adjustedCost.profit)}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <span className={adjustedCost.profitMargin >= 20 ? 'text-green-600' : adjustedCost.profitMargin >= 10 ? 'text-yellow-600' : 'text-red-600'}>
                            {adjustedCost.profitMargin.toFixed(1)}%
                          </span>
                        </td>
                        <td className="px-4 py-3 text-center">
                          {contract ? (
                            <span className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs bg-green-100 text-green-700">
                              <CheckCircle className="h-3 w-3" />
                              確定済
                            </span>
                          ) : (
                            <Button
                              size="sm"
                              onClick={() => handleConfirmContract({ estimate, costCalculation: adjustedCost, contract })}
                              className="bg-blue-600 hover:bg-blue-700 text-white gap-1"
                            >
                              <Check className="h-3 w-3" />
                              確定
                            </Button>
                          )}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setSelectedEstimateId(selectedEstimateId === estimate.id ? null : estimate.id)}
                          >
                            {selectedEstimateId === estimate.id ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                          </Button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* 選択した見積もりの詳細 */}
          {selectedEstimateData && (
            <div className="mt-4 p-4 bg-gray-50 rounded-lg border">
              <h4 className="font-medium text-gray-900 mb-4 flex items-center gap-2">
                <Package className="h-5 w-5" />
                原価計算内訳: {selectedEstimateData.estimate.customerName || '未入力'}
              </h4>

              <div className="grid grid-cols-2 gap-6">
                {/* 車両原価 */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-sm font-medium text-gray-700">
                    <Car className="h-4 w-4" />
                    車両原価（D欄）
                  </div>
                  <div className="bg-white rounded p-3 border">
                    <div className="flex justify-between text-sm">
                      <span>車両本体価格（売価）</span>
                      <span>¥{formatNumber(selectedEstimateData.estimate.vehiclePrice)}</span>
                    </div>
                    <div className="flex justify-between text-sm text-gray-500 mt-1">
                      <span className="flex items-center gap-1">
                        自動計算原価
                        {selectedEstimateData.costCalculation.vehicleCostSource === 'master' ? (
                          <span className="text-xs bg-green-100 text-green-700 px-1 rounded">マスター</span>
                        ) : (
                          <span className="text-xs bg-yellow-100 text-yellow-700 px-1 rounded">仮80%</span>
                        )}
                      </span>
                      <span className="text-red-600">¥{formatNumber(selectedEstimateData.costCalculation.vehicleCost)}</span>
                    </div>
                    {/* 手動入力 */}
                    <div className="mt-3 pt-3 border-t">
                      <label className="text-xs text-gray-500 flex items-center gap-1">
                        <Edit3 className="h-3 w-3" />
                        手動で原価を上書き
                      </label>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-sm">¥</span>
                        <Input
                          value={manualCosts[selectedEstimateData.estimate.id]?.vehicleCost || ''}
                          onChange={(e) => setManualCosts(prev => ({
                            ...prev,
                            [selectedEstimateData.estimate.id]: {
                              ...prev[selectedEstimateData.estimate.id],
                              vehicleCost: e.target.value
                            }
                          }))}
                          placeholder={formatNumber(selectedEstimateData.costCalculation.vehicleCost)}
                          className="flex-1 text-right text-sm"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* オプション原価 */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-sm font-medium text-gray-700">
                    <Package className="h-4 w-4" />
                    オプション原価
                  </div>
                  <div className="bg-white rounded p-3 border max-h-48 overflow-y-auto">
                    {selectedEstimateData.costCalculation.optionDetails.length === 0 ? (
                      <p className="text-sm text-gray-500">オプションなし</p>
                    ) : (
                      <div className="space-y-2">
                        {selectedEstimateData.costCalculation.optionDetails.map((opt, idx) => (
                          <div key={idx} className="flex justify-between text-sm">
                            <span className="truncate flex-1 mr-2" title={opt.name}>{opt.name}</span>
                            <div className="text-right whitespace-nowrap">
                              <span className="text-gray-500 mr-2">売価¥{formatNumber(opt.price)}</span>
                              <span className="text-red-600">原価¥{formatNumber(opt.cost)}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                    <div className="border-t mt-2 pt-2 flex justify-between font-medium">
                      <span>オプション原価合計</span>
                      <span className="text-red-600">¥{formatNumber(selectedEstimateData.costCalculation.optionsCost)}</span>
                    </div>
                    {/* 手動入力 */}
                    <div className="mt-3 pt-3 border-t">
                      <label className="text-xs text-gray-500 flex items-center gap-1">
                        <Edit3 className="h-3 w-3" />
                        手動で原価を上書き
                      </label>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-sm">¥</span>
                        <Input
                          value={manualCosts[selectedEstimateData.estimate.id]?.optionsCost || ''}
                          onChange={(e) => setManualCosts(prev => ({
                            ...prev,
                            [selectedEstimateData.estimate.id]: {
                              ...prev[selectedEstimateData.estimate.id],
                              optionsCost: e.target.value
                            }
                          }))}
                          placeholder={formatNumber(selectedEstimateData.costCalculation.optionsCost)}
                          className="flex-1 text-right text-sm"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* 税金・諸費用 */}
              <div className="mt-4 bg-white rounded p-3 border">
                <div className="text-sm font-medium text-gray-700 mb-2">税金・法定費用（経費として控除）</div>
                <div className="grid grid-cols-4 gap-4 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-500">環境性能割</span>
                    <span>¥{formatNumber(selectedEstimateData.estimate.taxEnv || 0)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">重量税</span>
                    <span>¥{formatNumber(selectedEstimateData.estimate.taxWeight || 0)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">自賠責保険</span>
                    <span>¥{formatNumber(selectedEstimateData.estimate.insurance || 0)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">リサイクル</span>
                    <span>¥{formatNumber(selectedEstimateData.estimate.recycleFee || 0)}</span>
                  </div>
                </div>
                <div className="border-t mt-2 pt-2 flex justify-between font-medium">
                  <span>税金・法定費用合計</span>
                  <span className="text-orange-600">¥{formatNumber(selectedEstimateData.costCalculation.taxTotal)}</span>
                </div>
              </div>

              {/* 計算結果サマリー */}
              {(() => {
                const adjusted = getAdjustedCost(selectedEstimateData.estimate.id, selectedEstimateData.costCalculation)
                return (
                  <div className="mt-4 bg-white rounded-lg p-4 border-2 border-blue-200">
                    <div className="grid grid-cols-5 gap-4 text-center">
                      <div>
                        <div className="text-sm text-gray-500">売上価格</div>
                        <div className="text-lg font-bold">¥{formatNumber(adjusted.salePrice)}</div>
                      </div>
                      <div>
                        <div className="text-sm text-gray-500">車両+オプション原価</div>
                        <div className="text-lg font-bold text-red-600">¥{formatNumber(adjusted.totalCost)}</div>
                      </div>
                      <div>
                        <div className="text-sm text-gray-500">税金・法定費用</div>
                        <div className="text-lg font-bold text-orange-600">¥{formatNumber(adjusted.taxTotal)}</div>
                      </div>
                      <div>
                        <div className="text-sm text-gray-500">利益</div>
                        <div className={`text-lg font-bold ${adjusted.profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                          ¥{formatNumber(adjusted.profit)}
                        </div>
                      </div>
                      <div>
                        <div className="text-sm text-gray-500">利益率</div>
                        <div className={`text-lg font-bold ${adjusted.profitMargin >= 20 ? 'text-green-600' : adjusted.profitMargin >= 10 ? 'text-yellow-600' : 'text-red-600'}`}>
                          {adjusted.profitMargin.toFixed(1)}%
                        </div>
                      </div>
                    </div>
                    <div className="mt-2 text-center text-xs text-gray-500">
                      計算式: 売上 - 車両原価 - オプション原価 - 税金・法定費用 = 利益
                    </div>
                  </div>
                )
              })()}

              {/* 原価・利益確定ボタン */}
              <div className="mt-4 flex justify-end gap-2">
                {selectedEstimateData.contract ? (
                  <div className="flex items-center gap-2 text-green-600">
                    <CheckCircle className="h-5 w-5" />
                    <span className="font-medium">確定済み（営業目標に反映済み）</span>
                  </div>
                ) : (
                  <Button
                    onClick={() => {
                      const adjusted = getAdjustedCost(selectedEstimateData.estimate.id, selectedEstimateData.costCalculation)
                      handleConfirmContract({
                        estimate: selectedEstimateData.estimate,
                        costCalculation: adjusted,
                        contract: selectedEstimateData.contract
                      })
                    }}
                    className="bg-blue-600 hover:bg-blue-700 text-white gap-2"
                  >
                    <Check className="h-4 w-4" />
                    原価・利益確定（営業目標に反映）
                  </Button>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
