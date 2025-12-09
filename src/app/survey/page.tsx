'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { CheckCircle, Send, Car } from 'lucide-react'
import {
  useSurveyStore,
  VISIT_PURPOSES,
  VEHICLE_TYPES,
  BUDGET_OPTIONS,
  PURCHASE_TIMING_OPTIONS,
  HOW_DID_YOU_KNOW_OPTIONS,
} from '@/stores/survey-store'
import { useSettingsStore } from '@/stores/settings-store'

export default function SurveyPage() {
  const { addResponse, eventName } = useSurveyStore()
  const { company } = useSettingsStore()
  const [isSubmitted, setIsSubmitted] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // フォームデータ
  const [formData, setFormData] = useState({
    name: '',
    nameKana: '',
    postalCode: '',
    address: '',
    phone: '',
    email: '',
    visitPurpose: [] as string[],
    interestedVehicleTypes: [] as string[],
    interestedModels: '',
    budget: '',
    purchaseTiming: '',
    currentVehicle: '',
    hasTradeIn: false,
    howDidYouKnow: [] as string[],
    questions: '',
  })

  // チェックボックスの切り替え
  const toggleArrayValue = (field: 'visitPurpose' | 'interestedVehicleTypes' | 'howDidYouKnow', value: string) => {
    setFormData((prev) => {
      const current = prev[field]
      if (current.includes(value)) {
        return { ...prev, [field]: current.filter((v) => v !== value) }
      } else {
        return { ...prev, [field]: [...current, value] }
      }
    })
  }

  // 送信処理
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.name.trim()) {
      alert('お名前を入力してください')
      return
    }

    setIsSubmitting(true)

    try {
      addResponse({
        name: formData.name.trim(),
        nameKana: formData.nameKana.trim() || undefined,
        postalCode: formData.postalCode.trim() || undefined,
        address: formData.address.trim() || undefined,
        phone: formData.phone.trim() || undefined,
        email: formData.email.trim() || undefined,
        eventName: eventName || undefined,
        visitPurpose: formData.visitPurpose.length > 0 ? formData.visitPurpose : undefined,
        interestedVehicleTypes: formData.interestedVehicleTypes.length > 0 ? formData.interestedVehicleTypes : undefined,
        interestedModels: formData.interestedModels.trim() ? [formData.interestedModels.trim()] : undefined,
        budget: formData.budget || undefined,
        purchaseTiming: formData.purchaseTiming || undefined,
        currentVehicle: formData.currentVehicle.trim() || undefined,
        hasTradeIn: formData.hasTradeIn,
        howDidYouKnow: formData.howDidYouKnow.length > 0 ? formData.howDidYouKnow : undefined,
        questions: formData.questions.trim() || undefined,
      })

      setIsSubmitted(true)
    } catch (error) {
      alert('送信に失敗しました。もう一度お試しください。')
    } finally {
      setIsSubmitting(false)
    }
  }

  // 送信完了画面
  if (isSubmitted) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full text-center">
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle className="h-12 w-12 text-green-500" />
          </div>
          <h1 className="text-2xl font-bold text-gray-800 mb-4">
            ありがとうございます！
          </h1>
          <p className="text-gray-600 mb-6">
            アンケートを送信しました。<br />
            スタッフがご案内いたしますので、<br />
            少々お待ちください。
          </p>
          <Button
            onClick={() => {
              setIsSubmitted(false)
              setFormData({
                name: '',
                nameKana: '',
                postalCode: '',
                address: '',
                phone: '',
                email: '',
                visitPurpose: [],
                interestedVehicleTypes: [],
                interestedModels: '',
                budget: '',
                purchaseTiming: '',
                currentVehicle: '',
                hasTradeIn: false,
                howDidYouKnow: [],
                questions: '',
              })
            }}
            variant="outline"
            className="w-full"
          >
            新しいアンケートを入力
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white">
      {/* ヘッダー */}
      <div className="bg-white shadow-sm">
        <div className="max-w-2xl mx-auto px-4 py-4">
          <div className="flex items-center justify-center gap-3">
            {company.logoUrl ? (
              <img src={company.logoUrl} alt="ロゴ" className="h-10 w-auto" />
            ) : (
              <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-blue-800 rounded-lg flex items-center justify-center">
                <Car className="h-6 w-6 text-white" />
              </div>
            )}
            <div>
              <h1 className="text-xl font-bold text-gray-800">{company.name || 'KATOMOTOR'}</h1>
              {eventName && (
                <p className="text-sm text-blue-600">{eventName}</p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* フォーム */}
      <div className="max-w-2xl mx-auto px-4 py-6">
        <div className="bg-white rounded-2xl shadow-lg p-6 mb-6">
          <h2 className="text-lg font-bold text-gray-800 mb-1">ご来場アンケート</h2>
          <p className="text-sm text-gray-500 mb-6">
            ご協力いただきありがとうございます。以下の項目にご記入ください。
          </p>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* 基本情報 */}
            <div className="space-y-4">
              <h3 className="font-medium text-gray-700 border-b pb-2">お客様情報</h3>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  お名前 <span className="text-red-500">*</span>
                </label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="山田 太郎"
                  className="text-lg"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  フリガナ
                </label>
                <Input
                  value={formData.nameKana}
                  onChange={(e) => setFormData({ ...formData, nameKana: e.target.value })}
                  placeholder="ヤマダ タロウ"
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    郵便番号
                  </label>
                  <Input
                    value={formData.postalCode}
                    onChange={(e) => setFormData({ ...formData, postalCode: e.target.value })}
                    placeholder="123-4567"
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    ご住所
                  </label>
                  <Input
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    placeholder="東京都渋谷区..."
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    電話番号
                  </label>
                  <Input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="090-1234-5678"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    メールアドレス
                  </label>
                  <Input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="example@email.com"
                  />
                </div>
              </div>
            </div>

            {/* ご来場目的 */}
            <div className="space-y-3">
              <h3 className="font-medium text-gray-700 border-b pb-2">ご来場目的（複数選択可）</h3>
              <div className="flex flex-wrap gap-2">
                {VISIT_PURPOSES.map((purpose) => (
                  <button
                    key={purpose}
                    type="button"
                    onClick={() => toggleArrayValue('visitPurpose', purpose)}
                    className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                      formData.visitPurpose.includes(purpose)
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {purpose}
                  </button>
                ))}
              </div>
            </div>

            {/* 興味のある車種タイプ */}
            <div className="space-y-3">
              <h3 className="font-medium text-gray-700 border-b pb-2">興味のある車種タイプ（複数選択可）</h3>
              <div className="flex flex-wrap gap-2">
                {VEHICLE_TYPES.map((type) => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => toggleArrayValue('interestedVehicleTypes', type)}
                    className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                      formData.interestedVehicleTypes.includes(type)
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {type}
                  </button>
                ))}
              </div>
            </div>

            {/* 気になる車種 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                気になる車種があればご記入ください
              </label>
              <Input
                value={formData.interestedModels}
                onChange={(e) => setFormData({ ...formData, interestedModels: e.target.value })}
                placeholder="例: クレソンジャーニー、リバティ52SP など"
              />
            </div>

            {/* 予算 */}
            <div className="space-y-3">
              <h3 className="font-medium text-gray-700 border-b pb-2">ご予算</h3>
              <div className="flex flex-wrap gap-2">
                {BUDGET_OPTIONS.map((option) => (
                  <button
                    key={option}
                    type="button"
                    onClick={() => setFormData({ ...formData, budget: formData.budget === option ? '' : option })}
                    className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                      formData.budget === option
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {option}
                  </button>
                ))}
              </div>
            </div>

            {/* 購入検討時期 */}
            <div className="space-y-3">
              <h3 className="font-medium text-gray-700 border-b pb-2">購入検討時期</h3>
              <div className="flex flex-wrap gap-2">
                {PURCHASE_TIMING_OPTIONS.map((option) => (
                  <button
                    key={option}
                    type="button"
                    onClick={() => setFormData({ ...formData, purchaseTiming: formData.purchaseTiming === option ? '' : option })}
                    className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                      formData.purchaseTiming === option
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {option}
                  </button>
                ))}
              </div>
            </div>

            {/* 現在のお車 */}
            <div className="space-y-3">
              <h3 className="font-medium text-gray-700 border-b pb-2">現在のお車について</h3>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  現在お乗りの車（任意）
                </label>
                <Input
                  value={formData.currentVehicle}
                  onChange={(e) => setFormData({ ...formData, currentVehicle: e.target.value })}
                  placeholder="例: トヨタ プリウス"
                />
              </div>
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.hasTradeIn}
                  onChange={(e) => setFormData({ ...formData, hasTradeIn: e.target.checked })}
                  className="w-5 h-5 rounded border-gray-300"
                />
                <span className="text-sm text-gray-700">下取りを希望する</span>
              </label>
            </div>

            {/* 知ったきっかけ */}
            <div className="space-y-3">
              <h3 className="font-medium text-gray-700 border-b pb-2">当店を知ったきっかけ（複数選択可）</h3>
              <div className="flex flex-wrap gap-2">
                {HOW_DID_YOU_KNOW_OPTIONS.map((option) => (
                  <button
                    key={option}
                    type="button"
                    onClick={() => toggleArrayValue('howDidYouKnow', option)}
                    className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                      formData.howDidYouKnow.includes(option)
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {option}
                  </button>
                ))}
              </div>
            </div>

            {/* ご質問・ご要望 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                ご質問・ご要望
              </label>
              <textarea
                value={formData.questions}
                onChange={(e) => setFormData({ ...formData, questions: e.target.value })}
                placeholder="何かご質問やご要望がございましたらご記入ください"
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 min-h-[100px]"
              />
            </div>

            {/* 送信ボタン */}
            <Button
              type="submit"
              disabled={isSubmitting}
              className="w-full h-14 text-lg bg-blue-600 hover:bg-blue-700"
            >
              <Send className="h-5 w-5 mr-2" />
              {isSubmitting ? '送信中...' : 'アンケートを送信'}
            </Button>
          </form>
        </div>

        <p className="text-center text-xs text-gray-400">
          ご記入いただいた情報は、お客様へのご案内のみに使用いたします。
        </p>
      </div>
    </div>
  )
}
