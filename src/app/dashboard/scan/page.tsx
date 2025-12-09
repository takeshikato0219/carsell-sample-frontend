'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Upload, Camera, FileText, Check, AlertCircle, RefreshCw, X, ChevronLeft, ChevronRight, Loader2, ClipboardList, ExternalLink, QrCode, Trash2, UserPlus, Settings, Copy } from 'lucide-react'
import { SurveyData, Customer, CustomerStatus } from '@/types'
import { useCustomerStore } from '@/stores/customer-store'
import { preprocessImage, type ImageQuality } from '@/lib/image-processing'
import { extractSurveyData, getFieldConfidence, type OCRResult } from '@/lib/ocr-service'
import { convertPDFToImage, isPDF } from '@/lib/pdf-to-image'
import { useSurveyStore, SurveyResponse } from '@/stores/survey-store'

// 処理対象のファイル情報
interface FileItem {
  id: string
  file: File
  imageDataUrl: string | null
  status: 'pending' | 'processing' | 'done' | 'error'
  ocrResult: OCRResult | null
  surveyData: SurveyData | null
  imageQuality: ImageQuality | null
  error?: string
}

export default function ScanPage() {
  const router = useRouter()
  const { addCustomers } = useCustomerStore()
  const [files, setFiles] = useState<FileItem[]>([])
  const [isProcessing, setIsProcessing] = useState(false)
  const [currentIndex, setCurrentIndex] = useState(0)
  const [step, setStep] = useState<'upload' | 'processing' | 'confirm' | 'complete'>('upload')
  const [isDragging, setIsDragging] = useState(false)
  const [processingProgress, setProcessingProgress] = useState({ current: 0, total: 0 })

  // ファイルをリストに追加
  const addFiles = async (newFiles: FileList | File[]) => {
    const fileArray = Array.from(newFiles)
    const newItems: FileItem[] = fileArray.map((file, idx) => ({
      id: `${Date.now()}-${idx}`,
      file,
      imageDataUrl: null,
      status: 'pending' as const,
      ocrResult: null,
      surveyData: null,
      imageQuality: null,
    }))
    setFiles(prev => [...prev, ...newItems])
  }

  // ファイルを削除
  const removeFile = (id: string) => {
    setFiles(prev => prev.filter(f => f.id !== id))
  }

  // 全ファイルをクリア
  const clearFiles = () => {
    setFiles([])
    setStep('upload')
    setCurrentIndex(0)
  }

  // 単一ファイルの処理
  const processFile = async (fileItem: FileItem): Promise<FileItem> => {
    const { file } = fileItem
    let imageDataUrl: string
    let imageQuality: ImageQuality | null = null

    try {
      // PDFの場合は画像に変換
      if (isPDF(file)) {
        const pdfResult = await convertPDFToImage(file)
        imageDataUrl = pdfResult.imageDataUrl
      } else if (file.type.startsWith('image/')) {
        // 画像の前処理
        const processed = await preprocessImage(file)
        imageQuality = processed.quality
        imageDataUrl = processed.processedDataUrl
      } else {
        throw new Error('未対応のファイル形式です')
      }

      // OCR処理
      const ocrResult = await extractSurveyData(imageDataUrl)

      return {
        ...fileItem,
        imageDataUrl,
        imageQuality,
        ocrResult,
        surveyData: ocrResult.data,
        status: 'done',
      }
    } catch (error) {
      console.error('Processing error:', error)
      return {
        ...fileItem,
        status: 'error',
        error: error instanceof Error ? error.message : 'エラーが発生しました',
      }
    }
  }

  // 全ファイルの一括処理
  const processAllFiles = async () => {
    if (files.length === 0) return

    setIsProcessing(true)
    setStep('processing')
    setProcessingProgress({ current: 0, total: files.length })

    const updatedFiles: FileItem[] = []

    for (let i = 0; i < files.length; i++) {
      const fileItem = files[i]
      setProcessingProgress({ current: i + 1, total: files.length })

      // ステータスを処理中に更新
      setFiles(prev => prev.map(f =>
        f.id === fileItem.id ? { ...f, status: 'processing' as const } : f
      ))

      const processed = await processFile(fileItem)
      updatedFiles.push(processed)

      // 処理結果を即座に反映
      setFiles(prev => prev.map(f =>
        f.id === fileItem.id ? processed : f
      ))
    }

    setIsProcessing(false)
    setStep('confirm')
    setCurrentIndex(0)
  }

  // ファイル選択ハンドラ
  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      await addFiles(e.target.files)
    }
    // inputをリセット（同じファイルを再選択可能に）
    e.target.value = ''
  }

  // ドラッグ＆ドロップハンドラ
  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(true)
  }

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)
  }

  const handleDrop = async (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      await addFiles(e.dataTransfer.files)
    }
  }

  // 現在の編集中ファイルのデータを更新
  const handleEdit = (field: keyof SurveyData, value: any) => {
    const currentFile = files[currentIndex]
    if (currentFile && currentFile.surveyData) {
      const updatedSurveyData = { ...currentFile.surveyData, [field]: value }
      setFiles(prev => prev.map((f, idx) =>
        idx === currentIndex ? { ...f, surveyData: updatedSurveyData } : f
      ))
    }
  }

  // 全顧客を一括登録
  const handleSaveAll = async () => {
    const successFiles = files.filter(f => f.status === 'done' && f.surveyData)
    console.log('Saving customers:', successFiles.map(f => f.surveyData))

    // SurveyDataからCustomerに変換
    const newCustomers: Customer[] = successFiles
      .filter(f => f.surveyData && f.surveyData.name)
      .map((f, idx) => {
        const surveyData = f.surveyData!
        const now = new Date().toISOString()
        const customerNumber = `SCAN-${Date.now()}-${idx}`

        return {
          id: `scan-${Date.now()}-${idx}`,
          customerNumber,
          name: surveyData.name || '名前未入力',
          nameKana: surveyData.nameKana,
          email: surveyData.email,
          phone: surveyData.phone,
          postalCode: surveyData.postalCode,
          address: surveyData.address,
          notes: `年齢: ${surveyData.age || '未入力'}, 職業: ${surveyData.occupation || '未入力'}, 予算: ${surveyData.budget || '未入力'}, 購入時期: ${surveyData.purchaseTiming || '未入力'}`,
          source: 'アンケートスキャン',
          status: CustomerStatus.NEW,
          createdAt: now,
          updatedAt: now,
        }
      })

    // 顧客ストアに保存
    if (newCustomers.length > 0) {
      addCustomers(newCustomers)
      console.log('Customers saved to store:', newCustomers)
    }

    setStep('complete')

    // 2秒後に顧客一覧（カンバンボード）へ遷移
    setTimeout(() => {
      router.push('/dashboard/customers')
    }, 2000)
  }

  // フィールドごとの信頼度に基づく背景色を取得
  const getFieldColorClass = (field: string, value: any): string => {
    const confidence = getFieldConfidence(field, value)
    if (confidence >= 85) return 'bg-green-50 border-green-300'
    if (confidence >= 70) return 'bg-yellow-50 border-yellow-300'
    return 'bg-red-50 border-red-300'
  }

  const currentFile = files[currentIndex]
  const successCount = files.filter(f => f.status === 'done').length
  const errorCount = files.filter(f => f.status === 'error').length

  // タブ状態
  const [activeTab, setActiveTab] = useState<'scan' | 'survey'>('scan')

  // アンケートストア
  const { responses: surveyResponses, markAsProcessed, deleteResponse, eventName, setEventName } = useSurveyStore()
  const unprocessedCount = surveyResponses.filter(r => !r.isProcessed).length

  // 展示会名設定モーダル
  const [showEventSettings, setShowEventSettings] = useState(false)
  const [tempEventName, setTempEventName] = useState(eventName)

  // QRコード用URL
  const [surveyUrl, setSurveyUrl] = useState('')
  useEffect(() => {
    if (typeof window !== 'undefined') {
      setSurveyUrl(`${window.location.origin}/survey`)
    }
  }, [])

  // アンケートから顧客を登録
  const registerFromSurvey = (survey: SurveyResponse) => {
    const now = new Date().toISOString()
    const newCustomer: Customer = {
      id: `survey-${survey.id}`,
      customerNumber: `S${String(Date.now()).slice(-8)}`,
      name: survey.name,
      nameKana: survey.nameKana,
      email: survey.email,
      phone: survey.phone,
      postalCode: survey.postalCode,
      address: survey.address,
      interestedCars: survey.interestedModels,
      notes: [
        survey.eventName ? `展示会: ${survey.eventName}` : '',
        survey.visitPurpose?.length ? `来場目的: ${survey.visitPurpose.join(', ')}` : '',
        survey.interestedVehicleTypes?.length ? `興味タイプ: ${survey.interestedVehicleTypes.join(', ')}` : '',
        survey.budget ? `予算: ${survey.budget}` : '',
        survey.purchaseTiming ? `購入時期: ${survey.purchaseTiming}` : '',
        survey.currentVehicle ? `現在車: ${survey.currentVehicle}` : '',
        survey.hasTradeIn ? '下取り希望あり' : '',
        survey.howDidYouKnow?.length ? `きっかけ: ${survey.howDidYouKnow.join(', ')}` : '',
        survey.questions ? `質問: ${survey.questions}` : '',
      ].filter(Boolean).join('\n'),
      source: survey.eventName || '展示会アンケート',
      status: CustomerStatus.NEW,
      createdAt: now,
      updatedAt: now,
    }

    addCustomers([newCustomer])
    markAsProcessed(survey.id, '手動登録')

    // 顧客詳細ページへ移動
    router.push(`/dashboard/customers/${newCustomer.id}`)
  }

  // URLをコピー
  const copyUrl = () => {
    navigator.clipboard.writeText(surveyUrl)
    alert('URLをコピーしました')
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">アンケートスキャン</h1>
          <p className="text-gray-600 mt-1">紙アンケートの読み取り・デジタルアンケートの受信</p>
        </div>
      </div>

      {/* タブ切り替え */}
      <div className="flex items-center gap-2 border-b">
        <button
          onClick={() => setActiveTab('scan')}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'scan'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          <Camera className="inline-block h-4 w-4 mr-2" />
          画像スキャン
        </button>
        <button
          onClick={() => setActiveTab('survey')}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors relative ${
            activeTab === 'survey'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          <ClipboardList className="inline-block h-4 w-4 mr-2" />
          デジタルアンケート
          {unprocessedCount > 0 && (
            <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
              {unprocessedCount}
            </span>
          )}
        </button>
      </div>

      {/* デジタルアンケートタブ */}
      {activeTab === 'survey' && (
        <div className="space-y-6">
          {/* アンケートURL・設定 */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <QrCode className="h-5 w-5" />
                アンケートフォーム
              </CardTitle>
              <CardDescription>
                iPadなどでお客様に直接入力してもらうためのフォームです
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-2">
                <div className="flex-1 bg-gray-100 px-4 py-2 rounded-lg text-sm font-mono text-gray-700">
                  {surveyUrl}
                </div>
                <Button variant="outline" size="sm" onClick={copyUrl}>
                  <Copy className="h-4 w-4 mr-1" />
                  コピー
                </Button>
                <a href={surveyUrl} target="_blank" rel="noopener noreferrer">
                  <Button variant="outline" size="sm">
                    <ExternalLink className="h-4 w-4 mr-1" />
                    開く
                  </Button>
                </a>
              </div>

              <div className="flex items-center gap-4 p-4 bg-blue-50 rounded-lg">
                <div className="flex-1">
                  <div className="text-sm font-medium text-blue-800">展示会名</div>
                  <div className="text-sm text-blue-600">
                    {eventName || '未設定（設定するとアンケートに表示されます）'}
                  </div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setTempEventName(eventName)
                    setShowEventSettings(true)
                  }}
                >
                  <Settings className="h-4 w-4 mr-1" />
                  設定
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* 受信したアンケート一覧 */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>受信したアンケート</span>
                <span className="text-sm font-normal text-gray-500">
                  未処理: {unprocessedCount}件 / 全{surveyResponses.length}件
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {surveyResponses.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  <ClipboardList className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                  <p>まだアンケートを受信していません</p>
                  <p className="text-sm mt-1">
                    上記のURLをiPadなどで開いて、お客様にアンケートを入力してもらってください
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {surveyResponses.map((survey) => {
                    const date = new Date(survey.createdAt)
                    const dateStr = `${date.getMonth() + 1}/${date.getDate()} ${date.getHours()}:${String(date.getMinutes()).padStart(2, '0')}`
                    return (
                      <div
                        key={survey.id}
                        className={`p-4 rounded-lg border ${
                          survey.isProcessed
                            ? 'bg-gray-50 border-gray-200'
                            : 'bg-white border-blue-200 shadow-sm'
                        }`}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-gray-900">{survey.name}</span>
                              {survey.isProcessed ? (
                                <span className="text-xs bg-gray-200 text-gray-600 px-2 py-0.5 rounded">
                                  登録済
                                </span>
                              ) : (
                                <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded">
                                  新規
                                </span>
                              )}
                            </div>
                            <div className="text-sm text-gray-500 mt-1">
                              {dateStr}
                              {survey.eventName && ` • ${survey.eventName}`}
                            </div>
                            <div className="text-sm text-gray-600 mt-2 space-y-0.5">
                              {survey.phone && <div>TEL: {survey.phone}</div>}
                              {survey.email && <div>Email: {survey.email}</div>}
                              {survey.address && <div>住所: {survey.address}</div>}
                              {survey.interestedVehicleTypes && survey.interestedVehicleTypes.length > 0 && (
                                <div>興味: {survey.interestedVehicleTypes.join(', ')}</div>
                              )}
                              {survey.budget && <div>予算: {survey.budget}</div>}
                              {survey.purchaseTiming && <div>時期: {survey.purchaseTiming}</div>}
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            {!survey.isProcessed && (
                              <Button
                                size="sm"
                                onClick={() => registerFromSurvey(survey)}
                              >
                                <UserPlus className="h-4 w-4 mr-1" />
                                顧客登録
                              </Button>
                            )}
                            <Button
                              size="sm"
                              variant="ghost"
                              className="text-red-600 hover:text-red-700 hover:bg-red-50"
                              onClick={() => {
                                if (confirm('このアンケートを削除しますか？')) {
                                  deleteResponse(survey.id)
                                }
                              }}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* 展示会名設定モーダル */}
      {showEventSettings && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md">
            <h3 className="text-lg font-bold mb-4">展示会名の設定</h3>
            <Input
              value={tempEventName}
              onChange={(e) => setTempEventName(e.target.value)}
              placeholder="例: 東京キャンピングカーショー2025"
              className="mb-4"
            />
            <p className="text-sm text-gray-500 mb-4">
              設定した展示会名がアンケートフォームに表示され、回答に自動で付与されます。
            </p>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowEventSettings(false)}>
                キャンセル
              </Button>
              <Button onClick={() => {
                setEventName(tempEventName)
                setShowEventSettings(false)
              }}>
                保存
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* 画像スキャンタブ */}
      {activeTab === 'scan' && (
        <>


      {/* アップロード画面 */}
      {step === 'upload' && (
        <Card>
          <CardHeader>
            <CardTitle>アンケート用紙をアップロード</CardTitle>
            <CardDescription>
              複数のファイルを選択、またはドラッグ＆ドロップしてください
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div
              className={`border-2 border-dashed rounded-lg p-12 text-center transition-all cursor-pointer ${
                isDragging
                  ? 'border-primary bg-primary/5 scale-[1.02]'
                  : 'border-gray-300 hover:border-primary hover:bg-gray-50'
              }`}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => document.getElementById('file-upload')?.click()}
            >
              <input
                type="file"
                id="file-upload"
                accept="image/*,.pdf,application/pdf"
                className="hidden"
                multiple
                onChange={handleFileSelect}
              />
              <Upload className={`mx-auto h-12 w-12 mb-4 transition-colors ${isDragging ? 'text-primary' : 'text-gray-400'}`} />
              <p className="text-lg font-medium text-gray-900 mb-2">
                {isDragging ? 'ここにドロップ！' : 'クリックまたはドラッグ＆ドロップ'}
              </p>
              <p className="text-sm text-gray-500">
                JPG, PNG, HEIC, PDF対応・複数選択可能
              </p>
            </div>

            {/* ファイルリスト */}
            {files.length > 0 && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-medium text-gray-900">
                    アップロード済み: {files.length}件
                  </h3>
                  <Button variant="ghost" size="sm" onClick={clearFiles}>
                    すべてクリア
                  </Button>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3 max-h-64 overflow-y-auto p-2">
                  {files.map((fileItem) => (
                    <div
                      key={fileItem.id}
                      className="relative group border rounded-lg p-2 bg-gray-50"
                    >
                      <button
                        onClick={() => removeFile(fileItem.id)}
                        className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity z-10"
                      >
                        <X className="h-3 w-3" />
                      </button>
                      <div className="aspect-square bg-gray-200 rounded flex items-center justify-center mb-2">
                        {isPDF(fileItem.file) ? (
                          <FileText className="h-8 w-8 text-gray-400" />
                        ) : (
                          <Camera className="h-8 w-8 text-gray-400" />
                        )}
                      </div>
                      <p className="text-xs text-gray-600 truncate">
                        {fileItem.file.name}
                      </p>
                    </div>
                  ))}
                </div>

                <div className="flex justify-center pt-4">
                  <Button
                    onClick={processAllFiles}
                    size="lg"
                    className="min-w-[300px]"
                  >
                    <RefreshCw className="mr-2 h-5 w-5" />
                    {files.length}件のファイルを一括処理
                  </Button>
                </div>
              </div>
            )}

            <div className="flex items-center justify-center space-x-4 text-sm text-gray-600">
              <Camera className="h-5 w-5" />
              <span>スマホのカメラで撮影した写真でもOK</span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* 処理中画面 */}
      {step === 'processing' && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Loader2 className="mr-2 h-5 w-5 animate-spin" />
              OCR処理中...
            </CardTitle>
            <CardDescription>
              {processingProgress.current} / {processingProgress.total} 件処理中
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {/* プログレスバー */}
              <div className="w-full bg-gray-200 rounded-full h-4">
                <div
                  className="bg-primary h-4 rounded-full transition-all duration-300"
                  style={{ width: `${(processingProgress.current / processingProgress.total) * 100}%` }}
                />
              </div>

              {/* ファイル処理状況リスト */}
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {files.map((fileItem, idx) => (
                  <div
                    key={fileItem.id}
                    className={`flex items-center justify-between p-3 rounded-lg ${
                      fileItem.status === 'processing' ? 'bg-blue-50 border border-blue-200' :
                      fileItem.status === 'done' ? 'bg-green-50 border border-green-200' :
                      fileItem.status === 'error' ? 'bg-red-50 border border-red-200' :
                      'bg-gray-50'
                    }`}
                  >
                    <div className="flex items-center space-x-3">
                      <span className="text-sm font-medium text-gray-500">#{idx + 1}</span>
                      <span className="text-sm truncate max-w-[200px]">{fileItem.file.name}</span>
                    </div>
                    <div>
                      {fileItem.status === 'pending' && (
                        <span className="text-xs text-gray-500">待機中</span>
                      )}
                      {fileItem.status === 'processing' && (
                        <span className="text-xs text-blue-600 flex items-center">
                          <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                          処理中
                        </span>
                      )}
                      {fileItem.status === 'done' && (
                        <span className="text-xs text-green-600 flex items-center">
                          <Check className="h-3 w-3 mr-1" />
                          完了
                        </span>
                      )}
                      {fileItem.status === 'error' && (
                        <span className="text-xs text-red-600 flex items-center">
                          <AlertCircle className="h-3 w-3 mr-1" />
                          エラー
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* 確認・編集画面 */}
      {step === 'confirm' && currentFile && (
        <div className="space-y-6">
          {/* ナビゲーションヘッダー */}
          <Card>
            <CardContent className="py-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentIndex(prev => Math.max(0, prev - 1))}
                    disabled={currentIndex === 0}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <span className="text-sm font-medium">
                    {currentIndex + 1} / {files.length} 件目
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentIndex(prev => Math.min(files.length - 1, prev + 1))}
                    disabled={currentIndex === files.length - 1}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
                <div className="flex items-center space-x-4">
                  <span className="text-sm text-green-600">✓ 成功: {successCount}件</span>
                  {errorCount > 0 && (
                    <span className="text-sm text-red-600">✗ エラー: {errorCount}件</span>
                  )}
                </div>
              </div>

              {/* サムネイルナビゲーション */}
              <div className="flex space-x-2 mt-4 overflow-x-auto pb-2">
                {files.map((fileItem, idx) => (
                  <button
                    key={fileItem.id}
                    onClick={() => setCurrentIndex(idx)}
                    className={`flex-shrink-0 w-16 h-16 rounded-lg border-2 transition-all ${
                      idx === currentIndex
                        ? 'border-primary ring-2 ring-primary/20'
                        : fileItem.status === 'done'
                        ? 'border-green-300 hover:border-green-400'
                        : fileItem.status === 'error'
                        ? 'border-red-300 hover:border-red-400'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    {fileItem.imageDataUrl ? (
                      <img
                        src={fileItem.imageDataUrl}
                        alt={`Preview ${idx + 1}`}
                        className="w-full h-full object-cover rounded-md"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-gray-100 rounded-md">
                        <span className="text-xs text-gray-400">#{idx + 1}</span>
                      </div>
                    )}
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* エラー表示 */}
          {currentFile.status === 'error' && (
            <Card className="border-red-300 bg-red-50">
              <CardContent className="py-6 text-center">
                <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-red-800 mb-2">処理エラー</h3>
                <p className="text-red-600">{currentFile.error}</p>
              </CardContent>
            </Card>
          )}

          {/* 成功時の編集フォーム */}
          {currentFile.status === 'done' && currentFile.surveyData && (
            <>
              {/* プレビュー画像 */}
              {currentFile.imageDataUrl && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">スキャン画像: {currentFile.file.name}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <img
                      src={currentFile.imageDataUrl}
                      alt="Scanned survey"
                      className="max-w-full max-h-64 object-contain rounded-lg shadow-md mx-auto"
                    />
                  </CardContent>
                </Card>
              )}

              {/* 読み取り結果 */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span>読み取り結果</span>
                    {currentFile.ocrResult && (
                      <span className="text-sm text-green-600 flex items-center">
                        <Check className="h-4 w-4 mr-1" />
                        信頼度: {currentFile.ocrResult.confidence}%
                      </span>
                    )}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* 基本情報 */}
                  <div>
                    <h3 className="text-lg font-semibold mb-4">基本情報</h3>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium mb-1">氏名</label>
                        <Input
                          value={currentFile.surveyData.name || ''}
                          onChange={(e) => handleEdit('name', e.target.value)}
                          className={getFieldColorClass('name', currentFile.surveyData.name)}
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-1">フリガナ</label>
                        <Input
                          value={currentFile.surveyData.nameKana || ''}
                          onChange={(e) => handleEdit('nameKana', e.target.value)}
                          className={getFieldColorClass('nameKana', currentFile.surveyData.nameKana)}
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-1">年齢</label>
                        <Input
                          type="number"
                          value={currentFile.surveyData.age || ''}
                          onChange={(e) => handleEdit('age', parseInt(e.target.value))}
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-1">職業</label>
                        <Input
                          value={currentFile.surveyData.occupation || ''}
                          onChange={(e) => handleEdit('occupation', e.target.value)}
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-1">郵便番号</label>
                        <Input
                          value={currentFile.surveyData.postalCode || ''}
                          onChange={(e) => handleEdit('postalCode', e.target.value)}
                          className={getFieldColorClass('postalCode', currentFile.surveyData.postalCode)}
                        />
                      </div>
                      <div className="col-span-2">
                        <label className="block text-sm font-medium mb-1">住所</label>
                        <Input
                          value={currentFile.surveyData.address || ''}
                          onChange={(e) => handleEdit('address', e.target.value)}
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-1">電話番号</label>
                        <Input
                          value={currentFile.surveyData.phone || ''}
                          onChange={(e) => handleEdit('phone', e.target.value)}
                          className={getFieldColorClass('phone', currentFile.surveyData.phone)}
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-1">メールアドレス</label>
                        <Input
                          value={currentFile.surveyData.email || ''}
                          onChange={(e) => handleEdit('email', e.target.value)}
                          className={getFieldColorClass('email', currentFile.surveyData.email)}
                        />
                      </div>
                    </div>
                  </div>

                  {/* 希望情報 */}
                  <div>
                    <h3 className="text-lg font-semibold mb-4">ご希望・詳細情報</h3>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium mb-1">ご予算</label>
                        <Input
                          value={currentFile.surveyData.budget || ''}
                          onChange={(e) => handleEdit('budget', e.target.value)}
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-1">購入時期</label>
                        <Input
                          value={currentFile.surveyData.purchaseTiming || ''}
                          onChange={(e) => handleEdit('purchaseTiming', e.target.value)}
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-1">乗車人数</label>
                        <Input
                          type="number"
                          value={currentFile.surveyData.familyMembers || ''}
                          onChange={(e) => handleEdit('familyMembers', parseInt(e.target.value))}
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-1">就寝人数</label>
                        <Input
                          type="number"
                          value={currentFile.surveyData.passengers || ''}
                          onChange={(e) => handleEdit('passengers', parseInt(e.target.value))}
                        />
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </>
          )}

          {/* アクションボタン */}
          <Card>
            <CardContent className="py-4">
              <div className="flex justify-between">
                <Button variant="outline" onClick={clearFiles}>
                  最初からやり直す
                </Button>
                <Button
                  onClick={handleSaveAll}
                  className="min-w-[200px]"
                  disabled={successCount === 0}
                >
                  <FileText className="mr-2 h-4 w-4" />
                  {successCount}件を一括登録
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* 完了画面 */}
      {step === 'complete' && (
        <Card>
          <CardContent className="py-12 text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 rounded-full mb-4">
              <Check className="h-8 w-8 text-green-600" />
            </div>
            <h3 className="text-2xl font-bold text-gray-900 mb-2">一括登録完了！</h3>
            <p className="text-gray-600 mb-6">
              {successCount}件のアンケート情報を顧客データとして登録しました
            </p>
            <p className="text-sm text-gray-500">
              まもなく顧客一覧ページに移動します...
            </p>
          </CardContent>
        </Card>
      )}
        </>
      )}
    </div>
  )
}
