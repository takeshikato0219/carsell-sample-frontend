'use client'

import { create } from 'zustand'
import { persist } from 'zustand/middleware'

// イベントの種類
export type EventType =
  | 'meeting'      // 商談・打ち合わせ
  | 'delivery'     // 納車
  | 'inspection'   // 車検・点検
  | 'showroom'     // 展示会
  | 'personal'     // 個人予定
  | 'email'        // メールから取り込んだ予定
  | 'other'        // その他

// イベントの繰り返し設定
export type RecurrenceType = 'none' | 'daily' | 'weekly' | 'monthly' | 'yearly'

// カレンダーイベント
export interface CalendarEvent {
  id: string
  title: string
  description?: string
  startDate: string        // YYYY-MM-DD形式
  startTime?: string       // HH:mm形式（終日の場合は未設定）
  endDate: string          // YYYY-MM-DD形式
  endTime?: string         // HH:mm形式
  isAllDay: boolean        // 終日イベント
  type: EventType
  color?: string           // カスタムカラー
  location?: string        // 場所

  // 担当者情報
  assignedTo?: string      // 担当者ID
  assignedToName?: string  // 担当者名
  assignedToColor?: string // 担当者の色

  // 顧客関連
  customerId?: string
  customerName?: string

  // メール取り込み情報
  emailId?: string
  emailSubject?: string
  emailFrom?: string

  // Google連携
  googleEventId?: string
  googleCalendarId?: string
  isSynced?: boolean

  // 繰り返し設定
  recurrence: RecurrenceType
  recurrenceEndDate?: string

  // 通知設定
  reminderMinutes?: number // 何分前に通知するか

  // メタ情報
  createdBy?: string
  createdByName?: string
  createdAt: string
  updatedAt: string
}

// メールからの予定取り込みデータ
export interface EmailEventImport {
  subject: string
  from: string
  date: string
  body: string
  extractedDate?: string
  extractedTime?: string
  extractedLocation?: string
}

// イベントタイプの設定
export const eventTypeConfig: Record<EventType, { label: string; color: string; bgColor: string }> = {
  meeting: { label: '商談・打ち合わせ', color: 'text-blue-700', bgColor: 'bg-blue-100' },
  delivery: { label: '納車', color: 'text-green-700', bgColor: 'bg-green-100' },
  inspection: { label: '車検・点検', color: 'text-orange-700', bgColor: 'bg-orange-100' },
  showroom: { label: '展示会', color: 'text-purple-700', bgColor: 'bg-purple-100' },
  personal: { label: '個人予定', color: 'text-gray-700', bgColor: 'bg-gray-100' },
  email: { label: 'メール取込', color: 'text-pink-700', bgColor: 'bg-pink-100' },
  other: { label: 'その他', color: 'text-slate-700', bgColor: 'bg-slate-100' },
}

// ストアの型定義
interface CalendarStore {
  events: CalendarEvent[]

  // Google連携設定
  googleConnected: boolean
  googleCalendarId?: string
  googleAccessToken?: string
  googleRefreshToken?: string
  lastSyncedAt?: string

  // イベント操作
  addEvent: (event: Omit<CalendarEvent, 'id' | 'createdAt' | 'updatedAt'>) => CalendarEvent
  updateEvent: (id: string, updates: Partial<CalendarEvent>) => void
  deleteEvent: (id: string) => void
  getEventsByDate: (date: string) => CalendarEvent[]
  getEventsByDateRange: (startDate: string, endDate: string) => CalendarEvent[]
  getEventsByUser: (userName: string) => CalendarEvent[]

  // メールからのインポート
  importFromEmail: (emailData: EmailEventImport) => CalendarEvent | null

  // Google連携
  setGoogleConnection: (connected: boolean, calendarId?: string, accessToken?: string, refreshToken?: string) => void
  syncWithGoogle: () => Promise<void>

  // ユーティリティ
  clearAllEvents: () => void
}

// サンプルイベントデータ（2025年12月）
const sampleEvents: CalendarEvent[] = [
  {
    id: 'event-1',
    title: '田中様 商談',
    description: 'トヨタ アルファードの見積説明',
    startDate: '2025-12-12',
    startTime: '10:00',
    endDate: '2025-12-12',
    endTime: '11:00',
    isAllDay: false,
    type: 'meeting',
    location: '店舗',
    assignedToName: '目黒',
    assignedToColor: 'bg-red-100 text-red-700',
    customerName: '田中一郎',
    recurrence: 'none',
    createdAt: '2025-12-01T09:00:00Z',
    updatedAt: '2025-12-01T09:00:00Z',
  },
  {
    id: 'event-2',
    title: '山田様 納車',
    description: '日産 セレナの納車',
    startDate: '2025-12-13',
    startTime: '14:00',
    endDate: '2025-12-13',
    endTime: '15:30',
    isAllDay: false,
    type: 'delivery',
    location: '店舗',
    assignedToName: '野島',
    assignedToColor: 'bg-blue-100 text-blue-700',
    customerName: '山田花子',
    recurrence: 'none',
    createdAt: '2025-12-01T10:00:00Z',
    updatedAt: '2025-12-01T10:00:00Z',
  },
  {
    id: 'event-3',
    title: '鈴木様 車検',
    description: 'マツダ CX-5の定期車検',
    startDate: '2025-12-14',
    startTime: '09:00',
    endDate: '2025-12-14',
    endTime: '17:00',
    isAllDay: false,
    type: 'inspection',
    location: '整備工場',
    assignedToName: '田中',
    assignedToColor: 'bg-green-100 text-green-700',
    customerName: '鈴木美咲',
    recurrence: 'none',
    createdAt: '2025-12-01T11:00:00Z',
    updatedAt: '2025-12-01T11:00:00Z',
  },
  {
    id: 'event-4',
    title: '渡辺様 商談',
    description: 'ランドクルーザーの試乗予約',
    startDate: '2025-12-15',
    startTime: '13:00',
    endDate: '2025-12-15',
    endTime: '14:30',
    isAllDay: false,
    type: 'meeting',
    location: '店舗',
    assignedToName: '目黒',
    assignedToColor: 'bg-red-100 text-red-700',
    customerName: '渡辺直樹',
    recurrence: 'none',
    createdAt: '2025-12-02T09:00:00Z',
    updatedAt: '2025-12-02T09:00:00Z',
  },
  {
    id: 'event-5',
    title: '年末展示会',
    description: '新車展示イベント',
    startDate: '2025-12-21',
    startTime: '10:00',
    endDate: '2025-12-22',
    endTime: '18:00',
    isAllDay: false,
    type: 'showroom',
    location: '展示場',
    recurrence: 'none',
    createdAt: '2025-12-03T09:00:00Z',
    updatedAt: '2025-12-03T09:00:00Z',
  },
  {
    id: 'event-6',
    title: '伊藤様 点検',
    description: 'ホンダ フィットの6ヶ月点検',
    startDate: '2025-12-16',
    startTime: '10:00',
    endDate: '2025-12-16',
    endTime: '12:00',
    isAllDay: false,
    type: 'inspection',
    location: '整備工場',
    assignedToName: '佐藤',
    assignedToColor: 'bg-purple-100 text-purple-700',
    customerName: '伊藤麻衣',
    recurrence: 'none',
    createdAt: '2025-12-04T09:00:00Z',
    updatedAt: '2025-12-04T09:00:00Z',
  },
  {
    id: 'event-7',
    title: '高橋様 商談',
    description: 'レクサス ESの商談',
    startDate: '2025-12-17',
    startTime: '15:00',
    endDate: '2025-12-17',
    endTime: '16:30',
    isAllDay: false,
    type: 'meeting',
    location: '店舗',
    assignedToName: '野島',
    assignedToColor: 'bg-blue-100 text-blue-700',
    customerName: '高橋健太',
    recurrence: 'none',
    createdAt: '2025-12-05T09:00:00Z',
    updatedAt: '2025-12-05T09:00:00Z',
  },
  {
    id: 'event-8',
    title: '中村様 納車',
    description: 'ダイハツ タントの納車',
    startDate: '2025-12-18',
    startTime: '11:00',
    endDate: '2025-12-18',
    endTime: '12:00',
    isAllDay: false,
    type: 'delivery',
    location: '店舗',
    assignedToName: '田中',
    assignedToColor: 'bg-green-100 text-green-700',
    customerName: '中村次郎',
    recurrence: 'none',
    createdAt: '2025-12-06T09:00:00Z',
    updatedAt: '2025-12-06T09:00:00Z',
  },
  {
    id: 'event-9',
    title: '営業会議',
    description: '月次営業会議',
    startDate: '2025-12-19',
    startTime: '09:00',
    endDate: '2025-12-19',
    endTime: '10:30',
    isAllDay: false,
    type: 'other',
    location: '会議室',
    recurrence: 'monthly',
    createdAt: '2025-12-01T08:00:00Z',
    updatedAt: '2025-12-01T08:00:00Z',
  },
  {
    id: 'event-10',
    title: '佐藤様 商談',
    description: 'トヨタ プリウス下見',
    startDate: '2025-12-20',
    startTime: '14:00',
    endDate: '2025-12-20',
    endTime: '15:00',
    isAllDay: false,
    type: 'meeting',
    location: '店舗',
    assignedToName: '高橋',
    assignedToColor: 'bg-pink-100 text-pink-700',
    customerName: '佐藤太郎',
    recurrence: 'none',
    createdAt: '2025-12-07T09:00:00Z',
    updatedAt: '2025-12-07T09:00:00Z',
  },
]

export const useCalendarStore = create<CalendarStore>()(
  persist(
    (set, get) => ({
      events: sampleEvents,
      googleConnected: false,

      addEvent: (eventData) => {
        const now = new Date().toISOString()
        const newEvent: CalendarEvent = {
          ...eventData,
          id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
          createdAt: now,
          updatedAt: now,
        }

        set((state) => ({
          events: [...state.events, newEvent]
        }))

        return newEvent
      },

      updateEvent: (id, updates) => {
        set((state) => ({
          events: state.events.map(event =>
            event.id === id
              ? { ...event, ...updates, updatedAt: new Date().toISOString() }
              : event
          )
        }))
      },

      deleteEvent: (id) => {
        set((state) => ({
          events: state.events.filter(event => event.id !== id)
        }))
      },

      getEventsByDate: (date) => {
        return get().events.filter(event => {
          // 開始日と終了日の間にdateが含まれるかチェック
          return event.startDate <= date && event.endDate >= date
        })
      },

      getEventsByDateRange: (startDate, endDate) => {
        return get().events.filter(event => {
          // イベントの期間と指定期間が重なるかチェック
          return event.startDate <= endDate && event.endDate >= startDate
        })
      },

      getEventsByUser: (userName) => {
        return get().events.filter(event => event.assignedToName === userName)
      },

      importFromEmail: (emailData) => {
        // メール本文から日付・時間・場所を抽出（簡易版）
        const { subject, from, body, extractedDate, extractedTime, extractedLocation } = emailData

        // 日付が抽出できなかった場合は今日の日付を使用
        const eventDate = extractedDate || new Date().toISOString().split('T')[0]

        const newEvent = get().addEvent({
          title: subject || 'メールからの予定',
          description: body.substring(0, 500),
          startDate: eventDate,
          endDate: eventDate,
          startTime: extractedTime || '10:00',
          endTime: extractedTime ? addHours(extractedTime, 1) : '11:00',
          isAllDay: !extractedTime,
          type: 'email',
          location: extractedLocation,
          emailSubject: subject,
          emailFrom: from,
          recurrence: 'none',
        })

        return newEvent
      },

      setGoogleConnection: (connected, calendarId, accessToken, refreshToken) => {
        set({
          googleConnected: connected,
          googleCalendarId: calendarId,
          googleAccessToken: accessToken,
          googleRefreshToken: refreshToken,
        })
      },

      syncWithGoogle: async () => {
        const state = get()
        if (!state.googleConnected || !state.googleAccessToken) {
          console.warn('Google Calendar not connected')
          return
        }

        // TODO: 実際のGoogle Calendar API連携を実装
        // 現在はプレースホルダー
        console.log('Syncing with Google Calendar...')

        set({ lastSyncedAt: new Date().toISOString() })
      },

      clearAllEvents: () => {
        set({ events: [] })
      },
    }),
    {
      name: 'calendar-storage',
      partialize: (state) => ({
        events: state.events,
        googleConnected: state.googleConnected,
        googleCalendarId: state.googleCalendarId,
        lastSyncedAt: state.lastSyncedAt,
      }),
    }
  )
)

// ヘルパー関数
function addHours(time: string, hours: number): string {
  const [h, m] = time.split(':').map(Number)
  const newHour = (h + hours) % 24
  return `${newHour.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`
}

// 日付ユーティリティ
export function formatDateForDisplay(dateStr: string): string {
  const date = new Date(dateStr)
  return `${date.getMonth() + 1}/${date.getDate()}`
}

export function formatTimeForDisplay(timeStr?: string): string {
  if (!timeStr) return ''
  return timeStr
}

export function getWeekDates(baseDate: Date): Date[] {
  const dates: Date[] = []
  const startOfWeek = new Date(baseDate)
  const day = startOfWeek.getDay()
  startOfWeek.setDate(startOfWeek.getDate() - day) // 日曜日始まり

  for (let i = 0; i < 7; i++) {
    const date = new Date(startOfWeek)
    date.setDate(startOfWeek.getDate() + i)
    dates.push(date)
  }

  return dates
}

export function getMonthDates(year: number, month: number): Date[][] {
  const weeks: Date[][] = []
  const firstDay = new Date(year, month, 1)
  const lastDay = new Date(year, month + 1, 0)

  // 月の最初の週の開始日（日曜日）
  const startDate = new Date(firstDay)
  startDate.setDate(startDate.getDate() - firstDay.getDay())

  let currentDate = new Date(startDate)

  while (currentDate <= lastDay || currentDate.getDay() !== 0) {
    const week: Date[] = []
    for (let i = 0; i < 7; i++) {
      week.push(new Date(currentDate))
      currentDate.setDate(currentDate.getDate() + 1)
    }
    weeks.push(week)

    // 6週間分を超えたら終了
    if (weeks.length >= 6) break
  }

  return weeks
}

export function isSameDay(date1: Date, date2: Date): boolean {
  return (
    date1.getFullYear() === date2.getFullYear() &&
    date1.getMonth() === date2.getMonth() &&
    date1.getDate() === date2.getDate()
  )
}

export function formatDateToISO(date: Date): string {
  return date.toISOString().split('T')[0]
}
