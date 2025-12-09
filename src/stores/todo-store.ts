'use client'

import { create } from 'zustand'
import { persist } from 'zustand/middleware'

// Todoの優先度
export type TodoPriority = 'low' | 'medium' | 'high' | 'urgent'

// Todoの種類
export type TodoType = 'request' | 'personal'

// Todoアイテム
export interface TodoItem {
  id: string
  title: string
  description?: string
  type: TodoType
  priority: TodoPriority
  dueDate?: string // YYYY-MM-DD形式
  dueTime?: string // HH:mm形式
  completed: boolean
  completedAt?: string

  // 依頼Todo用
  requestedBy?: string      // 依頼者名
  requestedById?: string    // 依頼者ID
  assignedTo?: string       // 担当者名
  assignedToId?: string     // 担当者ID

  // 関連情報
  relatedCustomerId?: string
  relatedCustomerName?: string
  relatedEventId?: string   // カレンダーイベントとの紐付け

  // タグ
  tags?: string[]

  // メタ情報
  createdBy: string
  createdAt: string
  updatedAt: string
}

// 優先度の設定
export const priorityConfig: Record<TodoPriority, { label: string; color: string; bgColor: string }> = {
  low: { label: '低', color: 'text-gray-600', bgColor: 'bg-gray-100' },
  medium: { label: '中', color: 'text-blue-600', bgColor: 'bg-blue-100' },
  high: { label: '高', color: 'text-orange-600', bgColor: 'bg-orange-100' },
  urgent: { label: '緊急', color: 'text-red-600', bgColor: 'bg-red-100' },
}

interface TodoStore {
  todos: TodoItem[]

  // Todo操作
  addTodo: (todo: Omit<TodoItem, 'id' | 'createdAt' | 'updatedAt'>) => TodoItem
  updateTodo: (id: string, updates: Partial<TodoItem>) => void
  deleteTodo: (id: string) => void
  toggleComplete: (id: string) => void

  // フィルター・検索
  getTodosByType: (type: TodoType) => TodoItem[]
  getTodosByUser: (userName: string) => TodoItem[]
  getRequestedTodos: (userName: string) => TodoItem[] // 自分が依頼したTodo
  getAssignedTodos: (userName: string) => TodoItem[]  // 自分に割り当てられたTodo
  getPersonalTodos: (userName: string) => TodoItem[]  // 自分の個人Todo
  getCompletedTodos: (userName: string) => TodoItem[]
  getOverdueTodos: (userName: string) => TodoItem[]

  // ユーティリティ
  clearCompletedTodos: (userName: string) => void
}

// サンプルTodoデータ
const sampleTodos: TodoItem[] = [
  {
    id: 'todo-1',
    title: '田中様へ見積書送付',
    description: 'トヨタ アルファードの見積書をメールで送付',
    type: 'personal',
    priority: 'high',
    dueDate: '2025-12-13',
    completed: false,
    createdBy: '目黒',
    relatedCustomerName: '田中一郎',
    createdAt: '2025-12-10T09:00:00Z',
    updatedAt: '2025-12-10T09:00:00Z',
  },
  {
    id: 'todo-2',
    title: '鈴木様の車検日程調整',
    description: 'マツダ CX-5の車検日程を確認してカレンダー登録',
    type: 'personal',
    priority: 'medium',
    dueDate: '2025-12-14',
    completed: false,
    createdBy: '野島',
    relatedCustomerName: '鈴木美咲',
    createdAt: '2025-12-10T10:00:00Z',
    updatedAt: '2025-12-10T10:00:00Z',
  },
  {
    id: 'todo-3',
    title: '新車展示会の準備',
    description: '展示車両の清掃とパンフレット準備',
    type: 'personal',
    priority: 'high',
    dueDate: '2025-12-20',
    completed: false,
    createdBy: '田中',
    createdAt: '2025-12-10T11:00:00Z',
    updatedAt: '2025-12-10T11:00:00Z',
  },
  {
    id: 'todo-4',
    title: '渡辺様へフォローアップ電話',
    description: 'ランドクルーザーの試乗後フォロー',
    type: 'personal',
    priority: 'urgent',
    dueDate: '2025-12-11',
    completed: false,
    createdBy: '目黒',
    relatedCustomerName: '渡辺直樹',
    createdAt: '2025-12-09T15:00:00Z',
    updatedAt: '2025-12-09T15:00:00Z',
  },
  {
    id: 'todo-5',
    title: '中古車在庫リスト更新',
    description: 'Webサイトの中古車在庫情報を最新に更新',
    type: 'personal',
    priority: 'medium',
    dueDate: '2025-12-15',
    completed: false,
    createdBy: '佐藤',
    createdAt: '2025-12-10T14:00:00Z',
    updatedAt: '2025-12-10T14:00:00Z',
  },
  {
    id: 'todo-6',
    title: '月次営業レポート作成',
    description: '11月の営業実績レポートを作成',
    type: 'personal',
    priority: 'low',
    dueDate: '2025-12-12',
    completed: true,
    completedAt: '2025-12-09T18:00:00Z',
    createdBy: '目黒',
    createdAt: '2025-12-05T09:00:00Z',
    updatedAt: '2025-12-09T18:00:00Z',
  },
  {
    id: 'todo-7',
    title: '高橋様への資料送付',
    description: 'レクサス ESのカタログと価格表を郵送',
    type: 'personal',
    priority: 'medium',
    dueDate: '2025-12-11',
    completed: true,
    completedAt: '2025-12-10T16:00:00Z',
    createdBy: '野島',
    relatedCustomerName: '高橋健太',
    createdAt: '2025-12-08T10:00:00Z',
    updatedAt: '2025-12-10T16:00:00Z',
  },
  {
    id: 'todo-8',
    title: '納車書類の準備',
    description: '山田様の納車書類一式を準備',
    type: 'personal',
    priority: 'high',
    dueDate: '2025-12-13',
    completed: true,
    completedAt: '2025-12-10T17:00:00Z',
    createdBy: '野島',
    relatedCustomerName: '山田花子',
    createdAt: '2025-12-09T09:00:00Z',
    updatedAt: '2025-12-10T17:00:00Z',
  },
]

export const useTodoStore = create<TodoStore>()(
  persist(
    (set, get) => ({
      todos: sampleTodos,

      addTodo: (todoData) => {
        const now = new Date().toISOString()
        const newTodo: TodoItem = {
          ...todoData,
          id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
          completed: false,
          createdAt: now,
          updatedAt: now,
        }

        set((state) => ({
          todos: [...state.todos, newTodo]
        }))

        return newTodo
      },

      updateTodo: (id, updates) => {
        set((state) => ({
          todos: state.todos.map(todo =>
            todo.id === id
              ? { ...todo, ...updates, updatedAt: new Date().toISOString() }
              : todo
          )
        }))
      },

      deleteTodo: (id) => {
        set((state) => ({
          todos: state.todos.filter(todo => todo.id !== id)
        }))
      },

      toggleComplete: (id) => {
        set((state) => ({
          todos: state.todos.map(todo =>
            todo.id === id
              ? {
                  ...todo,
                  completed: !todo.completed,
                  completedAt: !todo.completed ? new Date().toISOString() : undefined,
                  updatedAt: new Date().toISOString()
                }
              : todo
          )
        }))
      },

      getTodosByType: (type) => {
        return get().todos.filter(todo => todo.type === type)
      },

      getTodosByUser: (userName) => {
        return get().todos.filter(todo =>
          todo.createdBy === userName ||
          todo.assignedTo === userName ||
          todo.requestedBy === userName
        )
      },

      getRequestedTodos: (userName) => {
        return get().todos.filter(todo =>
          todo.type === 'request' && todo.requestedBy === userName
        )
      },

      getAssignedTodos: (userName) => {
        return get().todos.filter(todo =>
          todo.type === 'request' && todo.assignedTo === userName
        )
      },

      getPersonalTodos: (userName) => {
        return get().todos.filter(todo =>
          todo.type === 'personal' && todo.createdBy === userName
        )
      },

      getCompletedTodos: (userName) => {
        return get().todos.filter(todo =>
          todo.completed &&
          (todo.createdBy === userName || todo.assignedTo === userName)
        )
      },

      getOverdueTodos: (userName) => {
        const today = new Date().toISOString().split('T')[0]
        return get().todos.filter(todo =>
          !todo.completed &&
          todo.dueDate &&
          todo.dueDate < today &&
          (todo.createdBy === userName || todo.assignedTo === userName)
        )
      },

      clearCompletedTodos: (userName) => {
        set((state) => ({
          todos: state.todos.filter(todo =>
            !(todo.completed && (todo.createdBy === userName || todo.assignedTo === userName))
          )
        }))
      },
    }),
    {
      name: 'todo-storage',
    }
  )
)
