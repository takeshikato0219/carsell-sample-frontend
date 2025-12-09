'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Search,
  TrendingUp,
  TrendingDown,
  Minus,
  AlertCircle,
  CheckCircle,
  RefreshCw,
  ExternalLink,
  BarChart3
} from 'lucide-react'

// 金額フォーマット
function formatCurrency(amount: number): string {
  return `¥${amount.toLocaleString()}`
}

// 評価点の定義
const EVALUATION_GRADES = ['S', 'A+', 'A', 'B+', 'B', 'C', 'R', 'RA']

// メーカーリスト
const MANUFACTURERS = [
  'トヨタ', '日産', 'ホンダ', 'マツダ', 'スバル', '三菱', 'スズキ', 'ダイハツ',
  'レクサス', 'いすゞ', 'ベンツ', 'BMW', 'アウディ', 'フォルクスワーゲン', 'ボルボ',
  'ポルシェ', 'フェラーリ', 'ランボルギーニ', 'ジープ', 'テスラ', 'その他'
]

// 相場データ型
interface MarketData {
  source: string
  price: number
  year: number
  mileage: number
  grade: string
  url?: string
}

// 検索結果型
interface SearchResult {
  averagePrice: number
  minPrice: number
  maxPrice: number
  dataCount: number
  marketData: MarketData[]
  priceJudgment: 'high' | 'fair' | 'low'
  recommendation: string
}

export default function MarketPricePage() {
  const [searching, setSearching] = useState(false)
  const [searchResult, setSearchResult] = useState<SearchResult | null>(null)

  // 検索フォーム
  const [manufacturer, setManufacturer] = useState('')
  const [model, setModel] = useState('')
  const [year, setYear] = useState('')
  const [mileage, setMileage] = useState('')
  const [grade, setGrade] = useState('')
  const [targetPrice, setTargetPrice] = useState('')

  // 相場検索を実行（現在はダミーデータ）
  const handleSearch = async () => {
    if (!manufacturer || !model || !targetPrice) {
      alert('メーカー、車種、査定価格は必須です')
      return
    }

    setSearching(true)

    // TODO: 実際のスクレイピング処理を実装
    // 現在はダミーデータを生成
    setTimeout(() => {
      const target = parseInt(targetPrice)
      const dummyData: MarketData[] = [
        {
          source: 'カーセンサー',
          price: target * 0.95,
          year: parseInt(year) || 2020,
          mileage: parseInt(mileage) || 50000,
          grade: grade || 'A',
          url: 'https://www.carsensor.net/'
        },
        {
          source: 'グーネット',
          price: target * 1.05,
          year: parseInt(year) || 2020,
          mileage: parseInt(mileage) || 48000,
          grade: grade || 'A',
          url: 'https://www.goo-net.com/'
        },
        {
          source: 'オークション相場',
          price: target * 0.92,
          year: parseInt(year) || 2020,
          mileage: parseInt(mileage) || 52000,
          grade: grade || 'A+',
        },
        {
          source: '中古車情報誌',
          price: target * 1.08,
          year: parseInt(year) || 2020,
          mileage: parseInt(mileage) || 45000,
          grade: grade || 'B+',
        },
      ]

      const avgPrice = dummyData.reduce((sum, d) => sum + d.price, 0) / dummyData.length
      const minPrice = Math.min(...dummyData.map(d => d.price))
      const maxPrice = Math.max(...dummyData.map(d => d.price))

      // 適正価格判定
      let priceJudgment: 'high' | 'fair' | 'low'
      let recommendation: string

      const diffPercent = ((target - avgPrice) / avgPrice) * 100

      if (diffPercent > 10) {
        priceJudgment = 'high'
        recommendation = '相場より高めの価格設定です。価格を見直すことをお勧めします。'
      } else if (diffPercent < -10) {
        priceJudgment = 'low'
        recommendation = '相場より低めの価格設定です。利益率を改善できる可能性があります。'
      } else {
        priceJudgment = 'fair'
        recommendation = '相場に沿った適正な価格設定です。'
      }

      setSearchResult({
        averagePrice: avgPrice,
        minPrice,
        maxPrice,
        dataCount: dummyData.length,
        marketData: dummyData,
        priceJudgment,
        recommendation,
      })

      setSearching(false)
    }, 2000)
  }

  // 検索条件をリセット
  const handleReset = () => {
    setManufacturer('')
    setModel('')
    setYear('')
    setMileage('')
    setGrade('')
    setTargetPrice('')
    setSearchResult(null)
  }

  return (
    <div className="h-full overflow-auto p-6 bg-gray-50">
      {/* ヘッダー */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <Search className="h-6 w-6" />
          相場検索
        </h1>
        <p className="text-sm text-gray-600 mt-1">
          車両情報を入力して市場相場を検索し、適正価格を判断します
        </p>
      </div>

      {/* 検索フォーム */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>車両情報入力</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                メーカー *
              </label>
              <select
                value={manufacturer}
                onChange={(e) => setManufacturer(e.target.value)}
                className="w-full border border-gray-300 rounded-md px-3 py-2"
              >
                <option value="">選択してください</option>
                {MANUFACTURERS.map((m) => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                車種 *
              </label>
              <Input
                value={model}
                onChange={(e) => setModel(e.target.value)}
                placeholder="例: アルファード"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                年式
              </label>
              <Input
                type="number"
                value={year}
                onChange={(e) => setYear(e.target.value)}
                placeholder="例: 2020"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                走行距離（km）
              </label>
              <Input
                type="number"
                value={mileage}
                onChange={(e) => setMileage(e.target.value)}
                placeholder="例: 50000"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                評価点
              </label>
              <select
                value={grade}
                onChange={(e) => setGrade(e.target.value)}
                className="w-full border border-gray-300 rounded-md px-3 py-2"
              >
                <option value="">選択してください</option>
                {EVALUATION_GRADES.map((g) => (
                  <option key={g} value={g}>{g}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                査定価格 *
              </label>
              <Input
                type="number"
                value={targetPrice}
                onChange={(e) => setTargetPrice(e.target.value)}
                placeholder="例: 3500000"
              />
            </div>
          </div>

          <div className="flex gap-3 mt-6">
            <Button
              onClick={handleSearch}
              disabled={searching || !manufacturer || !model || !targetPrice}
              className="flex items-center gap-2"
            >
              {searching ? (
                <>
                  <RefreshCw className="h-4 w-4 animate-spin" />
                  検索中...
                </>
              ) : (
                <>
                  <Search className="h-4 w-4" />
                  相場を検索
                </>
              )}
            </Button>
            <Button variant="outline" onClick={handleReset}>
              リセット
            </Button>
          </div>

          <p className="text-xs text-gray-500 mt-4">
            ※ 現在はサンプルデータを表示しています。実際のスクレイピング機能は今後実装予定です。
          </p>
        </CardContent>
      </Card>

      {/* 検索結果 */}
      {searchResult && (
        <>
          {/* 総合判定 */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                価格判定結果
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0">
                  {searchResult.priceJudgment === 'high' && (
                    <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center">
                      <TrendingUp className="h-8 w-8 text-red-600" />
                    </div>
                  )}
                  {searchResult.priceJudgment === 'fair' && (
                    <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center">
                      <CheckCircle className="h-8 w-8 text-green-600" />
                    </div>
                  )}
                  {searchResult.priceJudgment === 'low' && (
                    <div className="w-16 h-16 rounded-full bg-blue-100 flex items-center justify-center">
                      <TrendingDown className="h-8 w-8 text-blue-600" />
                    </div>
                  )}
                </div>
                <div className="flex-1">
                  <h3 className={`text-xl font-bold mb-2 ${
                    searchResult.priceJudgment === 'high' ? 'text-red-600' :
                    searchResult.priceJudgment === 'fair' ? 'text-green-600' :
                    'text-blue-600'
                  }`}>
                    {searchResult.priceJudgment === 'high' && '相場より高い'}
                    {searchResult.priceJudgment === 'fair' && '適正価格'}
                    {searchResult.priceJudgment === 'low' && '相場より低い'}
                  </h3>
                  <p className="text-gray-700">{searchResult.recommendation}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* 相場統計 */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <Card>
              <CardContent className="pt-6">
                <div className="text-sm text-gray-500 mb-1">平均相場</div>
                <div className="text-2xl font-bold text-gray-900">
                  {formatCurrency(Math.round(searchResult.averagePrice))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="text-sm text-gray-500 mb-1">最低価格</div>
                <div className="text-2xl font-bold text-blue-600">
                  {formatCurrency(Math.round(searchResult.minPrice))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="text-sm text-gray-500 mb-1">最高価格</div>
                <div className="text-2xl font-bold text-red-600">
                  {formatCurrency(Math.round(searchResult.maxPrice))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="text-sm text-gray-500 mb-1">データ件数</div>
                <div className="text-2xl font-bold text-gray-900">
                  {searchResult.dataCount}件
                </div>
              </CardContent>
            </Card>
          </div>

          {/* 相場データ一覧 */}
          <Card>
            <CardHeader>
              <CardTitle>相場データ詳細</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="text-left py-3 px-4 font-medium text-gray-600">情報元</th>
                      <th className="text-right py-3 px-4 font-medium text-gray-600">価格</th>
                      <th className="text-center py-3 px-4 font-medium text-gray-600">年式</th>
                      <th className="text-right py-3 px-4 font-medium text-gray-600">走行距離</th>
                      <th className="text-center py-3 px-4 font-medium text-gray-600">評価点</th>
                      <th className="text-center py-3 px-4 font-medium text-gray-600">リンク</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {searchResult.marketData.map((data, index) => (
                      <tr key={index} className="hover:bg-gray-50">
                        <td className="py-3 px-4 font-medium">{data.source}</td>
                        <td className="py-3 px-4 text-right font-semibold text-gray-900">
                          {formatCurrency(Math.round(data.price))}
                        </td>
                        <td className="py-3 px-4 text-center text-gray-700">{data.year}年</td>
                        <td className="py-3 px-4 text-right text-gray-700">
                          {data.mileage.toLocaleString()}km
                        </td>
                        <td className="py-3 px-4 text-center">
                          <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-blue-100 text-blue-800">
                            {data.grade}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-center">
                          {data.url ? (
                            <a
                              href={data.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-blue-600 hover:text-blue-800"
                            >
                              <ExternalLink className="h-4 w-4 inline" />
                            </a>
                          ) : (
                            <span className="text-gray-400">-</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </>
      )}

      {/* 説明 */}
      {!searchResult && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5" />
              機能について
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 text-sm text-gray-700">
              <p>
                <strong>相場検索機能</strong>は、車両情報を元に市場相場を検索し、査定価格が適正かどうかを判断します。
              </p>
              <div>
                <p className="font-medium mb-2">今後実装予定の機能:</p>
                <ul className="list-disc list-inside space-y-1 ml-2">
                  <li>カーセンサー、グーネット等の中古車サイトからのスクレイピング</li>
                  <li>オークション相場データの取得</li>
                  <li>複数メーカーの一括検索</li>
                  <li>相場データの履歴管理</li>
                  <li>価格推移グラフの表示</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
