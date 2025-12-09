import { create } from 'zustand'
import { persist } from 'zustand/middleware'

// アンケート回答データ
export interface SurveyResponse {
  id: string
  createdAt: string
  // 基本情報
  name: string
  nameKana?: string
  postalCode?: string
  address?: string
  phone?: string
  email?: string
  // アンケート内容
  eventName?: string // 展示会名
  visitPurpose?: string[] // 来場目的
  interestedVehicleTypes?: string[] // 興味のある車種タイプ
  interestedModels?: string[] // 興味のある車種名
  budget?: string // 予算
  purchaseTiming?: string // 購入検討時期
  currentVehicle?: string // 現在の車
  hasTradeIn?: boolean // 下取り希望
  howDidYouKnow?: string[] // 知ったきっかけ
  questions?: string // 質問・要望
  // 処理状態
  isProcessed: boolean
  processedAt?: string
  processedBy?: string
}

interface SurveyState {
  responses: SurveyResponse[]
  eventName: string // 現在の展示会名
  addResponse: (response: Omit<SurveyResponse, 'id' | 'createdAt' | 'isProcessed'>) => string
  markAsProcessed: (id: string, processedBy?: string) => void
  deleteResponse: (id: string) => void
  clearAllResponses: () => void
  setEventName: (name: string) => void
  getUnprocessedCount: () => number
}

export const useSurveyStore = create<SurveyState>()(
  persist(
    (set, get) => ({
      responses: [],
      eventName: '',

      addResponse: (response) => {
        const id = `survey-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
        const newResponse: SurveyResponse = {
          ...response,
          id,
          createdAt: new Date().toISOString(),
          isProcessed: false,
        }
        set((state) => ({
          responses: [newResponse, ...state.responses],
        }))
        return id
      },

      markAsProcessed: (id, processedBy) => {
        set((state) => ({
          responses: state.responses.map((r) =>
            r.id === id
              ? { ...r, isProcessed: true, processedAt: new Date().toISOString(), processedBy }
              : r
          ),
        }))
      },

      deleteResponse: (id) => {
        set((state) => ({
          responses: state.responses.filter((r) => r.id !== id),
        }))
      },

      clearAllResponses: () => {
        set({ responses: [] })
      },

      setEventName: (name) => {
        set({ eventName: name })
      },

      getUnprocessedCount: () => {
        return get().responses.filter((r) => !r.isProcessed).length
      },
    }),
    {
      name: 'survey-storage',
    }
  )
)

// 来場目的の選択肢
export const VISIT_PURPOSES = [
  '購入検討',
  '情報収集',
  '見学のみ',
  'イベント参加',
  'その他',
]

// 興味のある車種タイプ
export const VEHICLE_TYPES = [
  'キャブコン',
  'バンコン',
  'バスコン',
  '軽キャンパー',
  'トレーラー',
  'その他',
]

// 予算の選択肢
export const BUDGET_OPTIONS = [
  '〜300万円',
  '300〜500万円',
  '500〜700万円',
  '700〜1000万円',
  '1000万円〜',
  '未定',
]

// 購入検討時期
export const PURCHASE_TIMING_OPTIONS = [
  '今すぐ',
  '3ヶ月以内',
  '半年以内',
  '1年以内',
  '未定',
]

// 知ったきっかけ
export const HOW_DID_YOU_KNOW_OPTIONS = [
  'インターネット検索',
  'SNS（Instagram/Facebook等）',
  'YouTube',
  '雑誌',
  '友人・知人の紹介',
  '以前から知っていた',
  '展示会で初めて知った',
  'その他',
]
