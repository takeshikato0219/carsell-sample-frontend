'use client'

import { useState, useMemo, useCallback, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Plus,
  X,
  Users,
  Mail,
  MapPin,
  Clock,
  Trash2,
  Edit2,
  RefreshCw,
  Filter,
  User,
  Car,
  Wrench,
  Building2,
  ExternalLink,
  Upload,
  CalendarDays,
  CalendarRange,
  CheckCircle2,
  Circle,
  AlertCircle,
  ListTodo
} from 'lucide-react'
import {
  useCalendarStore,
  CalendarEvent,
  EventType,
  RecurrenceType,
  eventTypeConfig,
  formatDateToISO,
  isSameDay
} from '@/stores/calendar-store'
import { useSettingsStore } from '@/stores/settings-store'
import { useUserPermissionsStore } from '@/stores/user-permissions-store'
import { useAuthStore } from '@/stores/auth-store'
import { useTodoStore, TodoItem, TodoType, TodoPriority, priorityConfig } from '@/stores/todo-store'

// 曜日名（月曜始まり）
const WEEKDAYS = ['月', '火', '水', '木', '金', '土', '日']
const WEEKDAY_COLORS = ['text-gray-700', 'text-gray-700', 'text-gray-700', 'text-gray-700', 'text-gray-700', 'text-blue-500', 'text-red-500']

// 表示モード
type ViewMode = 'month' | 'week'

// 複数日イベントの位置情報
interface EventPosition {
  event: CalendarEvent
  row: number
  startCol: number
  span: number
  isStart: boolean
  isEnd: boolean
}

// 月の日付を取得（月曜日始まり）
function getMonthDatesMondayStart(year: number, month: number): Date[][] {
  const weeks: Date[][] = []
  const firstDay = new Date(year, month, 1)
  const lastDay = new Date(year, month + 1, 0)

  const startDate = new Date(firstDay)
  const dayOfWeek = startDate.getDay()
  const daysToSubtract = dayOfWeek === 0 ? 6 : dayOfWeek - 1
  startDate.setDate(startDate.getDate() - daysToSubtract)

  let currentDate = new Date(startDate)

  while (currentDate <= lastDay || weeks.length < 6) {
    const week: Date[] = []
    for (let i = 0; i < 7; i++) {
      week.push(new Date(currentDate))
      currentDate.setDate(currentDate.getDate() + 1)
    }
    weeks.push(week)

    if (weeks.length >= 6) break
  }

  return weeks
}

// 週の日付を取得（月曜日始まり）
function getWeekDatesMondayStart(baseDate: Date): Date[] {
  const week: Date[] = []
  const date = new Date(baseDate)
  const dayOfWeek = date.getDay()
  const daysToSubtract = dayOfWeek === 0 ? 6 : dayOfWeek - 1
  date.setDate(date.getDate() - daysToSubtract)

  for (let i = 0; i < 7; i++) {
    week.push(new Date(date))
    date.setDate(date.getDate() + 1)
  }

  return week
}

export default function CalendarPage() {
  const [currentDate, setCurrentDate] = useState(new Date())
  const [viewMode, setViewMode] = useState<ViewMode>('month')
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
  const [showEventModal, setShowEventModal] = useState(false)
  const [showEmailImportModal, setShowEmailImportModal] = useState(false)
  const [editingEvent, setEditingEvent] = useState<CalendarEvent | null>(null)
  const [selectedUserFilter, setSelectedUserFilter] = useState<string>('all')
  const [selectedTypeFilter, setSelectedTypeFilter] = useState<EventType | 'all'>('all')

  // Todo関連のstate
  const [showTodoModal, setShowTodoModal] = useState(false)
  const [editingTodo, setEditingTodo] = useState<TodoItem | null>(null)
  const [todoType, setTodoType] = useState<'request' | 'personal'>('request')
  const [showCompletedTodos, setShowCompletedTodos] = useState(false)
  const [todoForm, setTodoForm] = useState({
    title: '',
    description: '',
    priority: 'medium' as TodoPriority,
    dueDate: '',
    dueTime: '',
    assignedTo: '',
  })

  // ストア
  const {
    events,
    addEvent,
    updateEvent,
    deleteEvent,
    googleConnected,
    syncWithGoogle,
    importFromEmail
  } = useCalendarStore()
  const { salesReps } = useSettingsStore()
  const { users } = useUserPermissionsStore()
  const { user } = useAuthStore()
  const {
    todos,
    addTodo,
    updateTodo,
    deleteTodo,
    toggleComplete,
    getRequestedTodos,
    getAssignedTodos,
    getPersonalTodos,
  } = useTodoStore()

  // クライアント側でのマウント状態を追跡
  const [isMounted, setIsMounted] = useState(false)
  useEffect(() => {
    setIsMounted(true)
  }, [])

  // 現在の月の日付を取得（月曜始まり）
  const monthDates = useMemo(() => {
    return getMonthDatesMondayStart(currentDate.getFullYear(), currentDate.getMonth())
  }, [currentDate])

  // 現在の週の日付を取得（月曜始まり）
  const weekDates = useMemo(() => {
    return getWeekDatesMondayStart(currentDate)
  }, [currentDate])

  // 日数の差を計算
  const getDaysDiff = useCallback((start: string, end: string): number => {
    const s = new Date(start)
    const e = new Date(end)
    return Math.ceil((e.getTime() - s.getTime()) / (1000 * 60 * 60 * 24))
  }, [])

  // 表示期間のイベントを取得
  const visibleEvents = useMemo(() => {
    if (!isMounted || !events) return []

    let startDate: string, endDate: string

    if (viewMode === 'month') {
      if (monthDates.length === 0) return []
      startDate = formatDateToISO(monthDates[0][0])
      endDate = formatDateToISO(monthDates[monthDates.length - 1][6])
    } else {
      startDate = formatDateToISO(weekDates[0])
      endDate = formatDateToISO(weekDates[6])
    }

    let filteredEvents = (events || []).filter(event => {
      return event.startDate <= endDate && event.endDate >= startDate
    })

    // ユーザーフィルター（「全員」担当も含める）
    if (selectedUserFilter !== 'all') {
      filteredEvents = filteredEvents.filter(e =>
        e.assignedToName === selectedUserFilter || e.assignedToName === '全員'
      )
    }

    // タイプフィルター
    if (selectedTypeFilter !== 'all') {
      filteredEvents = filteredEvents.filter(e => e.type === selectedTypeFilter)
    }

    return filteredEvents.sort((a, b) => {
      const aDays = getDaysDiff(a.startDate, a.endDate)
      const bDays = getDaysDiff(b.startDate, b.endDate)
      if (aDays !== bDays) return bDays - aDays
      if (a.startDate !== b.startDate) return a.startDate.localeCompare(b.startDate)
      if (a.isAllDay !== b.isAllDay) return a.isAllDay ? -1 : 1
      return (a.startTime || '').localeCompare(b.startTime || '')
    })
  }, [isMounted, monthDates, weekDates, events, selectedUserFilter, selectedTypeFilter, getDaysDiff, viewMode])

  // 複数日または終日イベントかどうか判定
  const isMultiDayOrAllDay = (event: CalendarEvent): boolean => {
    return event.isAllDay || event.startDate !== event.endDate
  }

  // 週ごとのイベント配置を計算（複数日/終日イベント用）
  const getWeekEventPositions = useCallback((week: Date[]): EventPosition[] => {
    const weekStart = formatDateToISO(week[0])
    const weekEnd = formatDateToISO(week[6])
    const positions: EventPosition[] = []
    const rowUsage: Map<number, Set<number>> = new Map()

    const weekEvents = visibleEvents.filter(event => {
      if (!isMultiDayOrAllDay(event)) return false
      return event.startDate <= weekEnd && event.endDate >= weekStart
    })

    weekEvents.forEach(event => {
      const eventStart = event.startDate < weekStart ? weekStart : event.startDate
      const eventEnd = event.endDate > weekEnd ? weekEnd : event.endDate

      const startCol = week.findIndex(d => formatDateToISO(d) === eventStart)
      const endCol = week.findIndex(d => formatDateToISO(d) === eventEnd)

      if (startCol === -1) return

      const span = (endCol === -1 ? 6 : endCol) - startCol + 1
      const isStart = event.startDate >= weekStart
      const isEnd = event.endDate <= weekEnd

      let row = 0
      while (true) {
        if (!rowUsage.has(row)) {
          rowUsage.set(row, new Set())
        }
        const usedCols = rowUsage.get(row)!
        let canPlace = true
        for (let col = startCol; col < startCol + span; col++) {
          if (usedCols.has(col)) {
            canPlace = false
            break
          }
        }
        if (canPlace) {
          for (let col = startCol; col < startCol + span; col++) {
            usedCols.add(col)
          }
          break
        }
        row++
        if (row > 10) break
      }

      positions.push({
        event,
        row,
        startCol,
        span,
        isStart,
        isEnd
      })
    })

    return positions
  }, [visibleEvents])

  // 日付ごとの単日イベントを取得（時間指定あり、終日でない）
  const getTimedEventsForDate = useCallback((date: Date): CalendarEvent[] => {
    const dateStr = formatDateToISO(date)
    return visibleEvents.filter(event => {
      return event.startDate === dateStr &&
             event.endDate === dateStr &&
             !event.isAllDay &&
             event.startTime
    }).sort((a, b) => (a.startTime || '').localeCompare(b.startTime || ''))
  }, [visibleEvents])

  // ナビゲーション
  const navigate = (direction: number) => {
    const newDate = new Date(currentDate)
    if (viewMode === 'month') {
      newDate.setMonth(newDate.getMonth() + direction)
    } else {
      newDate.setDate(newDate.getDate() + (direction * 7))
    }
    setCurrentDate(newDate)
  }

  const goToToday = () => {
    setCurrentDate(new Date())
  }

  // ヘッダータイトル
  const getHeaderTitle = () => {
    if (viewMode === 'month') {
      return `${currentDate.getFullYear()}年 ${currentDate.getMonth() + 1}月`
    } else {
      const start = weekDates[0]
      const end = weekDates[6]
      if (start.getMonth() === end.getMonth()) {
        return `${start.getFullYear()}年 ${start.getMonth() + 1}月 ${start.getDate()}日 - ${end.getDate()}日`
      } else {
        return `${start.getMonth() + 1}/${start.getDate()} - ${end.getMonth() + 1}/${end.getDate()}`
      }
    }
  }

  // イベント追加/編集モーダルの状態
  const [eventForm, setEventForm] = useState<{
    title: string
    description: string
    startDate: string
    startTime: string
    endDate: string
    endTime: string
    isAllDay: boolean
    type: EventType
    location: string
    assignedToName: string
    assignedToColor: string
    customerName: string
    recurrence: RecurrenceType
    reminderMinutes: number
  }>({
    title: '',
    description: '',
    startDate: '',
    startTime: '',
    endDate: '',
    endTime: '',
    isAllDay: false,
    type: 'meeting',
    location: '',
    assignedToName: '',
    assignedToColor: '',
    customerName: '',
    recurrence: 'none',
    reminderMinutes: 30,
  })

  // Todoモーダルを開く
  const openTodoModal = (type: 'request' | 'personal', todo?: TodoItem) => {
    setTodoType(type)
    if (todo) {
      setEditingTodo(todo)
      setTodoForm({
        title: todo.title,
        description: todo.description || '',
        priority: todo.priority,
        dueDate: todo.dueDate || '',
        dueTime: todo.dueTime || '',
        assignedTo: todo.assignedTo || '',
      })
    } else {
      setEditingTodo(null)
      setTodoForm({
        title: '',
        description: '',
        priority: 'medium',
        dueDate: '',
        dueTime: '',
        assignedTo: '',
      })
    }
    setShowTodoModal(true)
  }

  // Todo保存
  const handleSaveTodo = () => {
    if (!todoForm.title.trim()) {
      alert('タイトルを入力してください')
      return
    }

    if (todoType === 'request' && !todoForm.assignedTo) {
      alert('担当者を選択してください')
      return
    }

    const todoData = {
      title: todoForm.title,
      description: todoForm.description,
      type: todoType,
      priority: todoForm.priority,
      dueDate: todoForm.dueDate || undefined,
      dueTime: todoForm.dueTime || undefined,
      completed: false,
      ...(todoType === 'request' ? {
        requestedBy: user?.name,
        requestedById: user?.id,
        assignedTo: todoForm.assignedTo,
      } : {}),
      createdBy: user?.name || 'Unknown',
    }

    if (editingTodo) {
      updateTodo(editingTodo.id, todoData)
    } else {
      addTodo(todoData)
    }

    setShowTodoModal(false)
  }

  // モーダルを開く
  const openEventModal = (date?: Date, event?: CalendarEvent) => {
    if (event) {
      setEditingEvent(event)
      setEventForm({
        title: event.title,
        description: event.description || '',
        startDate: event.startDate,
        startTime: event.startTime || '',
        endDate: event.endDate,
        endTime: event.endTime || '',
        isAllDay: event.isAllDay,
        type: event.type,
        location: event.location || '',
        assignedToName: event.assignedToName || '',
        assignedToColor: event.assignedToColor || '',
        customerName: event.customerName || '',
        recurrence: event.recurrence,
        reminderMinutes: event.reminderMinutes || 30,
      })
    } else {
      setEditingEvent(null)
      const dateStr = date ? formatDateToISO(date) : formatDateToISO(new Date())
      setEventForm({
        title: '',
        description: '',
        startDate: dateStr,
        startTime: '10:00',
        endDate: dateStr,
        endTime: '11:00',
        isAllDay: false,
        type: 'meeting',
        location: '',
        assignedToName: user?.name || '',
        assignedToColor: '',
        customerName: '',
        recurrence: 'none',
        reminderMinutes: 30,
      })
    }
    setShowEventModal(true)
  }

  // イベント保存
  const handleSaveEvent = () => {
    console.log('handleSaveEvent called')
    console.log('eventForm:', eventForm)

    if (!eventForm.title.trim()) {
      alert('タイトルを入力してください')
      return
    }

    const eventData = {
      title: eventForm.title,
      description: eventForm.description,
      startDate: eventForm.startDate,
      startTime: eventForm.isAllDay ? undefined : eventForm.startTime,
      endDate: eventForm.endDate || eventForm.startDate,
      endTime: eventForm.isAllDay ? undefined : eventForm.endTime,
      isAllDay: eventForm.isAllDay,
      type: eventForm.type,
      location: eventForm.location,
      assignedToName: eventForm.assignedToName,
      assignedToColor: eventForm.assignedToColor,
      customerName: eventForm.customerName,
      recurrence: eventForm.recurrence,
      reminderMinutes: eventForm.reminderMinutes,
      createdByName: user?.name,
    }

    console.log('eventData:', eventData)
    console.log('editingEvent:', editingEvent)

    if (editingEvent) {
      console.log('Updating event')
      updateEvent(editingEvent.id, eventData)
    } else {
      console.log('Adding new event')
      const result = addEvent(eventData)
      console.log('Added event result:', result)
    }

    console.log('All events after save:', events)
    setShowEventModal(false)
  }

  // イベント削除
  const handleDeleteEvent = (id: string) => {
    if (confirm('この予定を削除しますか？')) {
      deleteEvent(id)
      setShowEventModal(false)
    }
  }

  // メールインポートモーダル
  const [emailImportText, setEmailImportText] = useState('')

  const handleEmailImport = () => {
    if (!emailImportText.trim()) {
      alert('メール本文を貼り付けてください')
      return
    }

    const datePatterns = [
      /(\d{4})[-\/](\d{1,2})[-\/](\d{1,2})/,
      /(\d{1,2})月(\d{1,2})日/,
    ]

    let extractedDate = ''
    for (const pattern of datePatterns) {
      const match = emailImportText.match(pattern)
      if (match) {
        if (match.length === 4) {
          extractedDate = `${match[1]}-${match[2].padStart(2, '0')}-${match[3].padStart(2, '0')}`
        } else if (match.length === 3) {
          const year = new Date().getFullYear()
          extractedDate = `${year}-${match[1].padStart(2, '0')}-${match[2].padStart(2, '0')}`
        }
        break
      }
    }

    const timeMatch = emailImportText.match(/(\d{1,2})[時:](\d{2})/)
    const extractedTime = timeMatch ? `${timeMatch[1].padStart(2, '0')}:${timeMatch[2]}` : undefined

    const locationMatch = emailImportText.match(/場所[:：]?\s*(.+?)[\n\r]/)
    const extractedLocation = locationMatch ? locationMatch[1].trim() : undefined

    const firstLine = emailImportText.split('\n')[0].trim()

    const result = importFromEmail({
      subject: firstLine.substring(0, 50),
      from: '',
      date: new Date().toISOString(),
      body: emailImportText,
      extractedDate,
      extractedTime,
      extractedLocation,
    })

    if (result) {
      alert(`予定「${result.title}」を追加しました`)
      setEmailImportText('')
      setShowEmailImportModal(false)
    }
  }

  // イベントの背景色を取得
  const getEventBgColor = (event: CalendarEvent): string => {
    if (event.assignedToColor) {
      return event.assignedToColor
    }
    return eventTypeConfig[event.type]?.bgColor || 'bg-blue-100'
  }

  // イベントのボーダー色を取得
  const getEventBorderColor = (event: CalendarEvent): string => {
    const type = event.type
    switch (type) {
      case 'meeting': return 'border-l-blue-500'
      case 'delivery': return 'border-l-green-500'
      case 'inspection': return 'border-l-orange-500'
      case 'showroom': return 'border-l-purple-500'
      case 'personal': return 'border-l-gray-500'
      case 'email': return 'border-l-pink-500'
      default: return 'border-l-slate-500'
    }
  }

  // 今日かどうか
  const isToday = (date: Date): boolean => {
    return isSameDay(date, new Date())
  }

  // 現在の月かどうか
  const isCurrentMonth = (date: Date): boolean => {
    return date.getMonth() === currentDate.getMonth()
  }

  // 曜日インデックスから色を取得（月曜始まり）
  const getWeekdayColor = (dayIndex: number): string => {
    return WEEKDAY_COLORS[dayIndex]
  }

  // 時間スロットを生成（7:00〜21:00）
  const generateTimeSlots = () => {
    const slots = []
    for (let hour = 7; hour <= 21; hour++) {
      slots.push(`${hour.toString().padStart(2, '0')}:00`)
    }
    return slots
  }

  // イベントの時間から位置とサイズを計算
  const calculateEventPosition = (startTime: string, endTime: string) => {
    const [startHour, startMin] = startTime.split(':').map(Number)
    const [endHour, endMin] = endTime.split(':').map(Number)

    const startMinutes = (startHour - 7) * 60 + startMin
    const endMinutes = (endHour - 7) * 60 + endMin
    const duration = endMinutes - startMinutes

    const hourHeight = 60 // 1時間あたりのピクセル高さ
    const top = (startMinutes / 60) * hourHeight
    const height = Math.max((duration / 60) * hourHeight, 30) // 最小30px

    return { top, height }
  }

  // 週表示用のレンダリング
  const renderWeekView = () => {
    const eventPositions = getWeekEventPositions(weekDates)
    const maxRow = Math.max(-1, ...eventPositions.map(p => p.row))
    const multiDayRowCount = Math.min(maxRow + 1, 6)
    const multiDayHeight = multiDayRowCount * 28
    const timeSlots = generateTimeSlots()

    return (
      <Card className="overflow-hidden">
        <CardContent className="p-0">
          {/* 曜日ヘッダー */}
          <div className="grid grid-cols-[60px_repeat(7,1fr)] border-b bg-gray-50">
            <div className="border-r" /> {/* 時間軸の空白 */}
            {weekDates.map((date, index) => {
              const isTodayDate = isToday(date)
              return (
                <div
                  key={index}
                  className={`py-2 text-center border-r last:border-r-0`}
                >
                  <div className={`text-xs ${WEEKDAY_COLORS[index]}`}>{WEEKDAYS[index]}</div>
                  <div className={`text-lg font-semibold mt-1 w-8 h-8 mx-auto flex items-center justify-center rounded-full ${
                    isTodayDate ? 'bg-blue-600 text-white' : WEEKDAY_COLORS[index]
                  }`}>
                    {date.getDate()}
                  </div>
                </div>
              )
            })}
          </div>

          {/* 複数日/終日イベント表示エリア */}
          {multiDayRowCount > 0 && (
            <div className="grid grid-cols-[60px_repeat(7,1fr)]">
              <div className="border-r bg-gray-50 text-xs text-gray-500 p-2">終日</div>
              <div
                className="relative grid grid-cols-7 border-b col-span-7"
                style={{ height: multiDayHeight }}
              >
                {weekDates.map((date, dayIndex) => (
                  <div
                    key={`bg-${dayIndex}`}
                    className="border-r last:border-r-0"
                  />
                ))}

                {eventPositions.map(pos => {
                  const leftPercent = (pos.startCol / 7) * 100
                  const widthPercent = (pos.span / 7) * 100

                  return (
                    <div
                      key={`${pos.event.id}`}
                      className={`absolute h-6 text-xs cursor-pointer
                        ${getEventBgColor(pos.event)}
                        ${pos.isStart ? 'rounded-l-md ml-1' : 'ml-0'}
                        ${pos.isEnd ? 'rounded-r-md mr-1' : 'mr-0'}
                        ${pos.isStart ? 'border-l-2' : ''} ${pos.isStart ? getEventBorderColor(pos.event) : ''}
                        hover:brightness-95 transition-all shadow-sm
                        flex items-center overflow-hidden`}
                      style={{
                        top: pos.row * 28 + 2,
                        left: `calc(${leftPercent}% + ${pos.isStart ? 0 : 0}px)`,
                        width: `calc(${widthPercent}% - ${(pos.isStart ? 4 : 0) + (pos.isEnd ? 4 : 0)}px)`,
                        zIndex: 10 + pos.row
                      }}
                      onClick={(e) => {
                        e.stopPropagation()
                        openEventModal(weekDates[pos.startCol], pos.event)
                      }}
                    >
                      <span className="px-1.5 truncate font-medium text-gray-800">
                        {pos.isStart && !pos.event.isAllDay && pos.event.startTime && (
                          <span className="text-gray-600 mr-1">{pos.event.startTime}</span>
                        )}
                        {pos.event.title}
                      </span>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* 時間軸付きイベントグリッド */}
          <div className="grid grid-cols-[60px_repeat(7,1fr)] border-t">
            {/* 時間スロット */}
            <div className="border-r">
              {timeSlots.map((time, index) => (
                <div
                  key={time}
                  className="h-[60px] border-b text-xs text-gray-500 pr-2 pt-1 text-right bg-gray-50"
                >
                  {time}
                </div>
              ))}
            </div>

            {/* 各曜日の列 */}
            {weekDates.map((date, dayIndex) => {
              const timedEvents = getTimedEventsForDate(date)

              return (
                <div key={dayIndex} className="relative border-r last:border-r-0">
                  {/* 時間スロットの背景 */}
                  {timeSlots.map((time, timeIndex) => (
                    <div
                      key={`${dayIndex}-${time}`}
                      className="h-[60px] border-b hover:bg-blue-50/20 cursor-pointer"
                      onClick={() => {
                        const hour = time.split(':')[0]
                        setSelectedDate(date)
                        openEventModal(date)
                      }}
                    />
                  ))}

                  {/* イベント */}
                  {timedEvents.map(event => {
                    const { top, height } = calculateEventPosition(
                      event.startTime || '09:00',
                      event.endTime || '10:00'
                    )

                    return (
                      <div
                        key={event.id}
                        className={`absolute left-1 right-1 text-xs px-2 py-1 rounded cursor-pointer
                          hover:brightness-95 transition-all border-l-2 shadow-sm overflow-hidden
                          ${getEventBgColor(event)} ${getEventBorderColor(event)}`}
                        style={{
                          top: `${top}px`,
                          height: `${height}px`,
                          zIndex: 10
                        }}
                        onClick={(e) => {
                          e.stopPropagation()
                          openEventModal(date, event)
                        }}
                      >
                        <div className="font-semibold text-gray-800 text-[11px] leading-tight">
                          {event.startTime}
                          {event.endTime && ` - ${event.endTime}`}
                        </div>
                        <div className="font-medium text-gray-900 text-xs leading-tight mt-0.5 line-clamp-2">
                          {event.title}
                        </div>
                        {event.location && height > 50 && (
                          <div className="text-gray-600 text-[10px] truncate mt-0.5 flex items-center gap-0.5">
                            <MapPin className="h-2.5 w-2.5" />
                            {event.location}
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>
    )
  }

  // 月表示用のレンダリング
  const renderMonthView = () => {
    return (
      <Card className="overflow-hidden">
        <CardContent className="p-0">
          {/* 曜日ヘッダー */}
          <div className="grid grid-cols-7 border-b bg-gray-50">
            {WEEKDAYS.map((day, index) => (
              <div
                key={day}
                className={`py-3 text-center text-sm font-medium ${WEEKDAY_COLORS[index]}`}
              >
                {day}
              </div>
            ))}
          </div>

          {/* 週ごとのグリッド */}
          {monthDates.map((week, weekIndex) => {
            const eventPositions = getWeekEventPositions(week)
            const maxRow = Math.max(-1, ...eventPositions.map(p => p.row))
            const multiDayRowCount = Math.min(maxRow + 1, 6)
            const multiDayHeight = multiDayRowCount * 22

            return (
              <div key={weekIndex} className="relative">
                {/* 日付ヘッダー行 */}
                <div className="grid grid-cols-7 border-b">
                  {week.map((date, dayIndex) => {
                    const isCurrentMonthDay = isCurrentMonth(date)
                    const isTodayDate = isToday(date)

                    return (
                      <div
                        key={formatDateToISO(date)}
                        className={`py-1 text-center border-r last:border-r-0 ${
                          !isCurrentMonthDay ? 'bg-gray-50/50' : ''
                        }`}
                      >
                        <span
                          className={`text-sm font-medium w-7 h-7 inline-flex items-center justify-center rounded-full ${
                            isTodayDate
                              ? 'bg-blue-600 text-white'
                              : isCurrentMonthDay
                                ? getWeekdayColor(dayIndex)
                                : 'text-gray-400'
                          }`}
                        >
                          {date.getDate()}
                        </span>
                      </div>
                    )
                  })}
                </div>

                {/* 複数日/終日イベント表示エリア */}
                {multiDayRowCount > 0 && (
                  <div
                    className="relative grid grid-cols-7"
                    style={{ height: multiDayHeight }}
                  >
                    {week.map((date, dayIndex) => (
                      <div
                        key={`bg-${formatDateToISO(date)}`}
                        className={`border-r last:border-r-0 ${
                          !isCurrentMonth(date) ? 'bg-gray-50/50' : ''
                        }`}
                      />
                    ))}

                    {eventPositions.slice(0, 18).map(pos => {
                      const leftPercent = (pos.startCol / 7) * 100
                      const widthPercent = (pos.span / 7) * 100

                      return (
                        <div
                          key={`${pos.event.id}-${weekIndex}`}
                          className={`absolute h-[18px] text-xs cursor-pointer
                            ${getEventBgColor(pos.event)}
                            ${pos.isStart ? 'rounded-l-md ml-1' : 'ml-0'}
                            ${pos.isEnd ? 'rounded-r-md mr-1' : 'mr-0'}
                            ${pos.isStart ? 'border-l-2' : ''} ${pos.isStart ? getEventBorderColor(pos.event) : ''}
                            hover:brightness-95 transition-all shadow-sm
                            flex items-center overflow-hidden`}
                          style={{
                            top: pos.row * 22 + 2,
                            left: `calc(${leftPercent}% + ${pos.isStart ? 0 : 0}px)`,
                            width: `calc(${widthPercent}% - ${(pos.isStart ? 4 : 0) + (pos.isEnd ? 4 : 0)}px)`,
                            zIndex: 10 + pos.row
                          }}
                          onClick={(e) => {
                            e.stopPropagation()
                            openEventModal(week[pos.startCol], pos.event)
                          }}
                        >
                          <span className="px-1.5 truncate font-medium text-gray-800">
                            {pos.isStart && !pos.event.isAllDay && pos.event.startTime && (
                              <span className="text-gray-600 mr-1">{pos.event.startTime}</span>
                            )}
                            {pos.event.title}
                          </span>
                        </div>
                      )
                    })}
                  </div>
                )}

                {/* 時間指定の単日イベント行 */}
                <div className="grid grid-cols-7 border-b">
                  {week.map((date, dayIndex) => {
                    const dateStr = formatDateToISO(date)
                    const isCurrentMonthDay = isCurrentMonth(date)
                    const timedEvents = getTimedEventsForDate(date)

                    return (
                      <div
                        key={dateStr}
                        className={`min-h-[90px] border-r last:border-r-0 p-0.5 cursor-pointer transition-colors hover:bg-blue-50/30 ${
                          !isCurrentMonthDay ? 'bg-gray-50/50' : ''
                        }`}
                        onClick={() => {
                          setSelectedDate(date)
                          openEventModal(date)
                        }}
                      >
                        <div className="space-y-0.5">
                          {timedEvents.slice(0, 6).map(event => (
                            <div
                              key={event.id}
                              onClick={(e) => {
                                e.stopPropagation()
                                openEventModal(date, event)
                              }}
                              className={`text-xs px-1 py-0.5 rounded truncate cursor-pointer
                                hover:brightness-95 transition-all border-l-2 shadow-sm
                                ${getEventBgColor(event)} ${getEventBorderColor(event)}`}
                            >
                              <span className="text-gray-600 mr-0.5">{event.startTime}</span>
                              <span className="font-medium text-gray-800">{event.title}</span>
                            </div>
                          ))}
                          {timedEvents.length > 6 && (
                            <div className="text-xs text-gray-500 px-1">
                              他 {timedEvents.length - 6} 件
                            </div>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="p-6 max-w-full">
      {/* ヘッダー */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <CalendarIcon className="h-6 w-6" />
            カレンダー
          </h1>

          {/* 表示切替ボタン */}
          <div className="flex items-center bg-gray-100 rounded-lg p-1">
            <button
              onClick={() => setViewMode('month')}
              className={`px-3 py-1.5 text-sm font-medium rounded-md flex items-center gap-1 transition-colors ${
                viewMode === 'month' ? 'bg-white shadow-sm text-blue-600' : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <CalendarDays className="h-4 w-4" />
              月
            </button>
            <button
              onClick={() => setViewMode('week')}
              className={`px-3 py-1.5 text-sm font-medium rounded-md flex items-center gap-1 transition-colors ${
                viewMode === 'week' ? 'bg-white shadow-sm text-blue-600' : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <CalendarRange className="h-4 w-4" />
              週
            </button>
          </div>

          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => navigate(-1)}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="sm" onClick={goToToday}>
              今日
            </Button>
            <Button variant="outline" size="sm" onClick={() => navigate(1)}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
          <h2 className="text-xl font-semibold text-gray-700">
            {getHeaderTitle()}
          </h2>
        </div>

        <div className="flex items-center gap-2">
          {/* フィルター */}
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-gray-400" />
            <select
              value={selectedUserFilter}
              onChange={(e) => setSelectedUserFilter(e.target.value)}
              className="h-9 px-3 py-1 rounded-md border border-gray-200 text-sm"
            >
              <option value="all">全員</option>
              {salesReps.map(rep => (
                <option key={rep.id} value={rep.name}>{rep.name}</option>
              ))}
              {users.map(u => (
                <option key={u.id} value={u.name}>{u.name}</option>
              ))}
            </select>
            <select
              value={selectedTypeFilter}
              onChange={(e) => setSelectedTypeFilter(e.target.value as EventType | 'all')}
              className="h-9 px-3 py-1 rounded-md border border-gray-200 text-sm"
            >
              <option value="all">全種類</option>
              {Object.entries(eventTypeConfig).map(([key, config]) => (
                <option key={key} value={key}>{config.label}</option>
              ))}
            </select>
          </div>

          {/* Google連携ボタン */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => syncWithGoogle()}
            className="gap-1"
          >
            <RefreshCw className={`h-4 w-4 ${googleConnected ? 'text-green-600' : 'text-gray-400'}`} />
            {googleConnected ? 'Google同期' : 'Google連携'}
          </Button>

          {/* メールインポート */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowEmailImportModal(true)}
            className="gap-1"
          >
            <Mail className="h-4 w-4" />
            メール取込
          </Button>

          {/* 予定追加 */}
          <Button
            onClick={() => openEventModal()}
            className="gap-1"
          >
            <Plus className="h-4 w-4" />
            予定を追加
          </Button>
        </div>
      </div>

      {/* チーム表示 */}
      <div className="mb-4 flex items-center gap-2 flex-wrap">
        <span className="text-sm text-gray-500 flex items-center gap-1">
          <Users className="h-4 w-4" />
          チームメンバー:
        </span>
        {/* 全員ボタン */}
        <button
          onClick={() => setSelectedUserFilter(selectedUserFilter === '全員' ? 'all' : '全員')}
          className={`px-2 py-1 rounded-full text-xs font-medium transition-all bg-gray-200 text-gray-700 ${
            selectedUserFilter === '全員'
              ? 'ring-2 ring-offset-1 ring-blue-500'
              : ''
          }`}
        >
          全員共有
        </button>
        {salesReps.map(rep => (
          <button
            key={rep.id}
            onClick={() => setSelectedUserFilter(selectedUserFilter === rep.name ? 'all' : rep.name)}
            className={`px-2 py-1 rounded-full text-xs font-medium transition-all ${
              selectedUserFilter === rep.name
                ? 'ring-2 ring-offset-1 ring-blue-500'
                : ''
            } ${rep.color}`}
          >
            {rep.name}
          </button>
        ))}
      </div>

      {/* カレンダー表示 */}
      {viewMode === 'month' ? renderMonthView() : renderWeekView()}

      {/* イベント凡例 */}
      <div className="mt-4 flex items-center gap-4 flex-wrap">
        <span className="text-sm text-gray-500">凡例:</span>
        {Object.entries(eventTypeConfig).map(([key, config]) => (
          <div key={key} className="flex items-center gap-1">
            <div className={`w-3 h-3 rounded ${config.bgColor}`} />
            <span className="text-xs text-gray-600">{config.label}</span>
          </div>
        ))}
      </div>

      {/* Todoセクション */}
      <div className="mt-8 grid grid-cols-2 gap-6">
        {/* Todo依頼リスト */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg font-semibold flex items-center gap-2">
                <ListTodo className="h-5 w-5 text-blue-600" />
                Todo依頼リスト
              </CardTitle>
              <Button
                size="sm"
                onClick={() => openTodoModal('request')}
              >
                <Plus className="h-4 w-4 mr-1" />
                依頼
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {user && getRequestedTodos(user.name).filter(t => !t.completed).length === 0 &&
               user && getAssignedTodos(user.name).filter(t => !t.completed).length === 0 ? (
                <div className="text-center py-8 text-gray-400 text-sm">
                  <ListTodo className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  Todo依頼はありません
                </div>
              ) : (
                <>
                  {user && getRequestedTodos(user.name).filter(t => !t.completed).map(todo => (
                    <div
                      key={todo.id}
                      className="flex items-start gap-3 p-3 rounded-lg border hover:bg-gray-50 transition-colors"
                    >
                      <button
                        onClick={() => toggleComplete(todo.id)}
                        className="mt-0.5"
                      >
                        <Circle className="h-5 w-5 text-gray-400 hover:text-blue-600" />
                      </button>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1">
                            <p className="font-medium text-gray-900">{todo.title}</p>
                            {todo.description && (
                              <p className="text-sm text-gray-500 mt-1">{todo.description}</p>
                            )}
                            <div className="flex items-center gap-2 mt-2">
                              <span className={`text-xs px-2 py-0.5 rounded ${priorityConfig[todo.priority].bgColor} ${priorityConfig[todo.priority].color}`}>
                                {priorityConfig[todo.priority].label}
                              </span>
                              {todo.assignedTo && (
                                <span className="text-xs text-gray-600">→ {todo.assignedTo}</span>
                              )}
                              {todo.dueDate && (
                                <span className="text-xs text-gray-500 flex items-center gap-1">
                                  <Clock className="h-3 w-3" />
                                  {todo.dueDate}
                                </span>
                              )}
                            </div>
                          </div>
                          <button
                            onClick={() => deleteTodo(todo.id)}
                            className="text-gray-400 hover:text-red-600"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                  {user && getAssignedTodos(user.name).filter(t => !t.completed).map(todo => (
                    <div
                      key={todo.id}
                      className="flex items-start gap-3 p-3 rounded-lg border border-blue-200 bg-blue-50/30 hover:bg-blue-50 transition-colors"
                    >
                      <button
                        onClick={() => toggleComplete(todo.id)}
                        className="mt-0.5"
                      >
                        <Circle className="h-5 w-5 text-blue-400 hover:text-blue-600" />
                      </button>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1">
                            <p className="font-medium text-gray-900">{todo.title}</p>
                            {todo.description && (
                              <p className="text-sm text-gray-500 mt-1">{todo.description}</p>
                            )}
                            <div className="flex items-center gap-2 mt-2">
                              <span className={`text-xs px-2 py-0.5 rounded ${priorityConfig[todo.priority].bgColor} ${priorityConfig[todo.priority].color}`}>
                                {priorityConfig[todo.priority].label}
                              </span>
                              {todo.requestedBy && (
                                <span className="text-xs text-gray-600">From: {todo.requestedBy}</span>
                              )}
                              {todo.dueDate && (
                                <span className="text-xs text-gray-500 flex items-center gap-1">
                                  <Clock className="h-3 w-3" />
                                  {todo.dueDate}
                                </span>
                              )}
                            </div>
                          </div>
                          <button
                            onClick={() => openTodoModal('request', todo)}
                            className="text-gray-400 hover:text-blue-600"
                          >
                            <Edit2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </>
              )}

              {/* 完了済みを表示 */}
              {showCompletedTodos && user && (
                <div className="mt-4 pt-4 border-t space-y-2">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-gray-500">完了済み</span>
                    <button
                      onClick={() => setShowCompletedTodos(false)}
                      className="text-xs text-gray-400 hover:text-gray-600"
                    >
                      非表示
                    </button>
                  </div>
                  {[...getRequestedTodos(user.name), ...getAssignedTodos(user.name)]
                    .filter(t => t.completed)
                    .map(todo => (
                      <div
                        key={todo.id}
                        className="flex items-start gap-3 p-3 rounded-lg bg-gray-50 opacity-60"
                      >
                        <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5" />
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-gray-500 line-through">{todo.title}</p>
                        </div>
                      </div>
                    ))}
                </div>
              )}
              {!showCompletedTodos && user &&
               [...getRequestedTodos(user.name), ...getAssignedTodos(user.name)].filter(t => t.completed).length > 0 && (
                <button
                  onClick={() => setShowCompletedTodos(true)}
                  className="w-full text-center text-sm text-gray-400 hover:text-gray-600 py-2"
                >
                  完了済みを表示 ({[...getRequestedTodos(user.name), ...getAssignedTodos(user.name)].filter(t => t.completed).length}件)
                </button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* 個人Todoリスト */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg font-semibold flex items-center gap-2">
                <ListTodo className="h-5 w-5 text-gray-600" />
                個人Todoリスト
              </CardTitle>
              <Button
                size="sm"
                variant="outline"
                onClick={() => openTodoModal('personal')}
              >
                <Plus className="h-4 w-4 mr-1" />
                追加
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {user && getPersonalTodos(user.name).filter(t => !t.completed).length === 0 ? (
                <div className="text-center py-8 text-gray-400 text-sm">
                  <ListTodo className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  個人Todoはありません
                </div>
              ) : (
                user && getPersonalTodos(user.name).filter(t => !t.completed).map(todo => (
                  <div
                    key={todo.id}
                    className="flex items-start gap-3 p-3 rounded-lg border hover:bg-gray-50 transition-colors"
                  >
                    <button
                      onClick={() => toggleComplete(todo.id)}
                      className="mt-0.5"
                    >
                      <Circle className="h-5 w-5 text-gray-400 hover:text-green-600" />
                    </button>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1">
                          <p className="font-medium text-gray-900">{todo.title}</p>
                          {todo.description && (
                            <p className="text-sm text-gray-500 mt-1">{todo.description}</p>
                          )}
                          <div className="flex items-center gap-2 mt-2">
                            <span className={`text-xs px-2 py-0.5 rounded ${priorityConfig[todo.priority].bgColor} ${priorityConfig[todo.priority].color}`}>
                              {priorityConfig[todo.priority].label}
                            </span>
                            {todo.dueDate && (
                              <span className="text-xs text-gray-500 flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                {todo.dueDate}
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => openTodoModal('personal', todo)}
                            className="text-gray-400 hover:text-blue-600"
                          >
                            <Edit2 className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => deleteTodo(todo.id)}
                            className="text-gray-400 hover:text-red-600"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              )}

              {/* 完了済み個人Todo */}
              {user && getPersonalTodos(user.name).filter(t => t.completed).length > 0 && (
                <div className="mt-4 pt-4 border-t">
                  <details className="group">
                    <summary className="text-sm text-gray-500 cursor-pointer hover:text-gray-700 list-none flex items-center justify-between">
                      <span>完了済み ({getPersonalTodos(user.name).filter(t => t.completed).length}件)</span>
                      <ChevronRight className="h-4 w-4 group-open:rotate-90 transition-transform" />
                    </summary>
                    <div className="mt-2 space-y-2">
                      {getPersonalTodos(user.name).filter(t => t.completed).map(todo => (
                        <div
                          key={todo.id}
                          className="flex items-start gap-3 p-3 rounded-lg bg-gray-50 opacity-60"
                        >
                          <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5" />
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-gray-500 line-through">{todo.title}</p>
                          </div>
                          <button
                            onClick={() => deleteTodo(todo.id)}
                            className="text-gray-400 hover:text-red-600"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </details>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 予定追加/編集モーダル */}
      {showEventModal && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setShowEventModal(false)
            }
          }}
        >
          <div
            className="bg-white rounded-lg shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-4 border-b flex items-center justify-between">
              <h2 className="text-lg font-semibold">
                {editingEvent ? '予定を編集' : '新しい予定'}
              </h2>
              <button
                type="button"
                onClick={() => setShowEventModal(false)}
                className="p-1 hover:bg-gray-100 rounded"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-4 space-y-4">
              {/* タイトル */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  タイトル <span className="text-red-500">*</span>
                </label>
                <Input
                  value={eventForm.title}
                  onChange={(e) => setEventForm(prev => ({ ...prev, title: e.target.value }))}
                  placeholder="予定のタイトル"
                />
              </div>

              {/* 種類 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">種類</label>
                <div className="grid grid-cols-4 gap-2">
                  {Object.entries(eventTypeConfig).map(([key, config]) => (
                    <button
                      type="button"
                      key={key}
                      onClick={() => setEventForm(prev => ({ ...prev, type: key as EventType }))}
                      className={`px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                        eventForm.type === key
                          ? `${config.bgColor} ${config.color} ring-2 ring-offset-1 ring-blue-500`
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                    >
                      {config.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* 終日チェック */}
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="isAllDay"
                  checked={eventForm.isAllDay}
                  onChange={(e) => setEventForm(prev => ({ ...prev, isAllDay: e.target.checked }))}
                  className="h-4 w-4 rounded border-gray-300"
                />
                <label htmlFor="isAllDay" className="text-sm text-gray-700">終日</label>
              </div>

              {/* 日時 */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">開始日</label>
                  <Input
                    type="date"
                    value={eventForm.startDate}
                    onChange={(e) => setEventForm(prev => ({
                      ...prev,
                      startDate: e.target.value,
                      endDate: prev.endDate < e.target.value ? e.target.value : prev.endDate
                    }))}
                  />
                </div>
                {!eventForm.isAllDay && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">開始時間</label>
                    <Input
                      type="time"
                      value={eventForm.startTime}
                      onChange={(e) => setEventForm(prev => ({ ...prev, startTime: e.target.value }))}
                    />
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">終了日</label>
                  <Input
                    type="date"
                    value={eventForm.endDate}
                    min={eventForm.startDate}
                    onChange={(e) => setEventForm(prev => ({ ...prev, endDate: e.target.value }))}
                  />
                </div>
                {!eventForm.isAllDay && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">終了時間</label>
                    <Input
                      type="time"
                      value={eventForm.endTime}
                      onChange={(e) => setEventForm(prev => ({ ...prev, endTime: e.target.value }))}
                    />
                  </div>
                )}
              </div>

              {/* 場所 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  <MapPin className="inline h-4 w-4 mr-1" />
                  場所
                </label>
                <Input
                  value={eventForm.location}
                  onChange={(e) => setEventForm(prev => ({ ...prev, location: e.target.value }))}
                  placeholder="場所を入力"
                />
              </div>

              {/* 担当者 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  <User className="inline h-4 w-4 mr-1" />
                  担当者
                </label>
                <select
                  value={eventForm.assignedToName}
                  onChange={(e) => {
                    const rep = salesReps.find(r => r.name === e.target.value)
                    setEventForm(prev => ({
                      ...prev,
                      assignedToName: e.target.value,
                      assignedToColor: rep?.color || ''
                    }))
                  }}
                  className="w-full h-10 px-3 rounded-md border border-gray-200"
                >
                  <option value="">選択してください</option>
                  <option value="全員">全員（全員に表示）</option>
                  {salesReps.map(rep => (
                    <option key={rep.id} value={rep.name}>{rep.name}</option>
                  ))}
                  {users.map(u => (
                    <option key={u.id} value={u.name}>{u.name}</option>
                  ))}
                </select>
              </div>

              {/* 顧客名 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  <Building2 className="inline h-4 w-4 mr-1" />
                  顧客名（任意）
                </label>
                <Input
                  value={eventForm.customerName}
                  onChange={(e) => setEventForm(prev => ({ ...prev, customerName: e.target.value }))}
                  placeholder="顧客名を入力"
                />
              </div>

              {/* 説明 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">メモ</label>
                <textarea
                  value={eventForm.description}
                  onChange={(e) => setEventForm(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="メモを入力"
                  rows={3}
                  className="w-full px-3 py-2 rounded-md border border-gray-200 text-sm"
                />
              </div>
            </div>

            {/* フッター */}
            <div className="p-4 border-t flex items-center justify-between">
              <div>
                {editingEvent && (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => handleDeleteEvent(editingEvent.id)}
                    className="text-red-600 hover:text-red-700 hover:bg-red-50"
                  >
                    <Trash2 className="h-4 w-4 mr-1" />
                    削除
                  </Button>
                )}
              </div>
              <div className="flex gap-2">
                <Button type="button" variant="outline" onClick={() => setShowEventModal(false)}>
                  キャンセル
                </Button>
                <Button type="button" onClick={handleSaveEvent}>
                  {editingEvent ? '更新' : '追加'}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* メールインポートモーダル */}
      {showEmailImportModal && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setShowEmailImportModal(false)
            }
          }}
        >
          <div
            className="bg-white rounded-lg shadow-xl w-full max-w-lg"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-4 border-b flex items-center justify-between">
              <h2 className="text-lg font-semibold flex items-center gap-2">
                <Mail className="h-5 w-5" />
                メールから予定を取り込む
              </h2>
              <button
                type="button"
                onClick={() => setShowEmailImportModal(false)}
                className="p-1 hover:bg-gray-100 rounded"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-4 space-y-4">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm text-blue-700">
                <p className="font-medium mb-1">使い方</p>
                <ul className="list-disc list-inside space-y-1 text-xs">
                  <li>メール本文をコピーして貼り付けてください</li>
                  <li>日付（2024年1月15日、2024/01/15など）を自動抽出します</li>
                  <li>時間（10:00、10時30分など）を自動抽出します</li>
                  <li>「場所:」の後に続くテキストを場所として取得します</li>
                </ul>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  メール本文
                </label>
                <textarea
                  value={emailImportText}
                  onChange={(e) => setEmailImportText(e.target.value)}
                  placeholder="メール本文を貼り付けてください..."
                  rows={10}
                  className="w-full px-3 py-2 rounded-md border border-gray-200 text-sm font-mono"
                />
              </div>
            </div>

            <div className="p-4 border-t flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setShowEmailImportModal(false)}>
                キャンセル
              </Button>
              <Button type="button" onClick={handleEmailImport}>
                <Upload className="h-4 w-4 mr-1" />
                取り込む
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Todo追加/編集モーダル */}
      {showTodoModal && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setShowTodoModal(false)
            }
          }}
        >
          <div
            className="bg-white rounded-lg shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-4 border-b flex items-center justify-between">
              <h2 className="text-lg font-semibold">
                {editingTodo ? 'Todoを編集' : todoType === 'request' ? 'Todo依頼を追加' : '個人Todoを追加'}
              </h2>
              <button
                type="button"
                onClick={() => setShowTodoModal(false)}
                className="p-1 hover:bg-gray-100 rounded"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-4 space-y-4">
              {/* タイトル */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  タイトル <span className="text-red-500">*</span>
                </label>
                <Input
                  value={todoForm.title}
                  onChange={(e) => setTodoForm(prev => ({ ...prev, title: e.target.value }))}
                  placeholder="Todoのタイトル"
                />
              </div>

              {/* 説明 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">説明</label>
                <textarea
                  value={todoForm.description}
                  onChange={(e) => setTodoForm(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="詳細な説明（任意）"
                  rows={3}
                  className="w-full px-3 py-2 rounded-md border border-gray-200 text-sm"
                />
              </div>

              {/* 優先度 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">優先度</label>
                <div className="grid grid-cols-4 gap-2">
                  {Object.entries(priorityConfig).map(([key, config]) => (
                    <button
                      type="button"
                      key={key}
                      onClick={() => setTodoForm(prev => ({ ...prev, priority: key as TodoPriority }))}
                      className={`px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                        todoForm.priority === key
                          ? `${config.bgColor} ${config.color} ring-2 ring-offset-1 ring-blue-500`
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                    >
                      {config.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* 担当者（依頼Todoの場合のみ） */}
              {todoType === 'request' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    担当者 <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={todoForm.assignedTo}
                    onChange={(e) => setTodoForm(prev => ({ ...prev, assignedTo: e.target.value }))}
                    className="w-full h-10 px-3 rounded-md border border-gray-200"
                  >
                    <option value="">選択してください</option>
                    {salesReps.map(rep => (
                      <option key={rep.id} value={rep.name}>{rep.name}</option>
                    ))}
                    {users.map(u => (
                      <option key={u.id} value={u.name}>{u.name}</option>
                    ))}
                  </select>
                </div>
              )}

              {/* 期限日 */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">期限日</label>
                  <Input
                    type="date"
                    value={todoForm.dueDate}
                    onChange={(e) => setTodoForm(prev => ({ ...prev, dueDate: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">期限時刻</label>
                  <Input
                    type="time"
                    value={todoForm.dueTime}
                    onChange={(e) => setTodoForm(prev => ({ ...prev, dueTime: e.target.value }))}
                  />
                </div>
              </div>

              {/* フッター */}
              <div className="flex justify-end gap-2 pt-4">
                <Button type="button" variant="outline" onClick={() => setShowTodoModal(false)}>
                  キャンセル
                </Button>
                <Button type="button" onClick={handleSaveTodo}>
                  {editingTodo ? '更新' : '追加'}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
