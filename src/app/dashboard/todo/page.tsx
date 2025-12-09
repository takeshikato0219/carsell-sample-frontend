'use client'

import { useState, useMemo } from 'react'
import { useAuthStore } from '@/stores/auth-store'
import { useTodoStore, TodoItem, TodoPriority, priorityConfig } from '@/stores/todo-store'
import { useUserPermissionsStore } from '@/stores/user-permissions-store'
import { Plus, Calendar as CalendarIcon, Clock, User, X, Check, Trash2, ChevronDown, ChevronUp, ClipboardList } from 'lucide-react'
import { cn } from '@/lib/utils'

export default function TodoPage() {
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

  const { getSalesReps } = useUserPermissionsStore()
  const salesReps = getSalesReps()

  // モーダル表示状態
  const [showTodoModal, setShowTodoModal] = useState(false)
  const [editingTodo, setEditingTodo] = useState<TodoItem | null>(null)
  const [todoType, setTodoType] = useState<'request' | 'personal'>('request')

  // フィルター状態
  const [showCompleted, setShowCompleted] = useState(false)

  // フォーム状態
  const [todoForm, setTodoForm] = useState({
    title: '',
    description: '',
    priority: 'medium' as TodoPriority,
    dueDate: '',
    dueTime: '',
    assignedTo: '',
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

  // Todoを保存
  const handleSaveTodo = () => {
    if (!todoForm.title.trim() || !user) return

    const todoData = {
      title: todoForm.title,
      description: todoForm.description,
      type: todoType,
      priority: todoForm.priority,
      dueDate: todoForm.dueDate || undefined,
      dueTime: todoForm.dueTime || undefined,
      createdBy: user.name,
      ...(todoType === 'request' && {
        requestedBy: user.name,
        requestedById: user.id,
        assignedTo: todoForm.assignedTo,
        assignedToId: salesReps.find(rep => rep.name === todoForm.assignedTo)?.id,
      }),
      completed: false,
    }

    if (editingTodo) {
      updateTodo(editingTodo.id, todoData)
    } else {
      addTodo(todoData)
    }

    setShowTodoModal(false)
    setEditingTodo(null)
  }

  // Todoを削除
  const handleDeleteTodo = (id: string) => {
    if (window.confirm('このTodoを削除してもよろしいですか？')) {
      deleteTodo(id)
    }
  }

  // 自分が依頼したTodo
  const requestedTodos = useMemo(() => {
    if (!user) return []
    const todos = getRequestedTodos(user.name)
    return showCompleted ? todos : todos.filter(t => !t.completed)
  }, [user, getRequestedTodos, showCompleted])

  // 自分に割り当てられたTodo
  const assignedTodos = useMemo(() => {
    if (!user) return []
    const todos = getAssignedTodos(user.name)
    return showCompleted ? todos : todos.filter(t => !t.completed)
  }, [user, getAssignedTodos, showCompleted])

  // 自分の個人Todo
  const personalTodos = useMemo(() => {
    if (!user) return []
    const todos = getPersonalTodos(user.name)
    return showCompleted ? todos : todos.filter(t => !t.completed)
  }, [user, getPersonalTodos, showCompleted])

  // Todoカードのレンダリング
  const renderTodoCard = (todo: TodoItem) => {
    const priorityStyle = priorityConfig[todo.priority]
    const isOverdue = todo.dueDate && todo.dueDate < new Date().toISOString().split('T')[0] && !todo.completed

    return (
      <div
        key={todo.id}
        className={cn(
          'p-4 bg-white border rounded-lg shadow-sm hover:shadow-md transition-shadow',
          isOverdue && 'border-red-300 bg-red-50',
          todo.completed && 'opacity-60'
        )}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3 flex-1 min-w-0">
            {/* 完了チェックボックス */}
            <button
              onClick={() => toggleComplete(todo.id)}
              className={cn(
                'mt-1 flex-shrink-0 w-5 h-5 rounded border-2 flex items-center justify-center transition-colors',
                todo.completed
                  ? 'bg-green-500 border-green-500'
                  : 'border-gray-300 hover:border-green-500'
              )}
            >
              {todo.completed && <Check className="w-3 h-3 text-white" />}
            </button>

            {/* Todo内容 */}
            <div className="flex-1 min-w-0">
              <div className="flex items-start gap-2 mb-1">
                <h3
                  className={cn(
                    'font-medium text-gray-900 break-words flex-1',
                    todo.completed && 'line-through text-gray-500'
                  )}
                >
                  {todo.title}
                </h3>
                <span className={cn('px-2 py-0.5 text-xs rounded-full whitespace-nowrap flex-shrink-0', priorityStyle.bgColor, priorityStyle.color)}>
                  {priorityStyle.label}
                </span>
              </div>

              {todo.description && (
                <p className="text-sm text-gray-600 mb-2 break-words">{todo.description}</p>
              )}

              {/* メタ情報 */}
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-gray-500">
                {todo.dueDate && (
                  <div className={cn('flex items-center gap-1 whitespace-nowrap', isOverdue && 'text-red-600 font-medium')}>
                    <CalendarIcon className="w-3 h-3 flex-shrink-0" />
                    <span>{todo.dueDate}</span>
                    {todo.dueTime && (
                      <>
                        <Clock className="w-3 h-3 ml-1 flex-shrink-0" />
                        <span>{todo.dueTime}</span>
                      </>
                    )}
                  </div>
                )}
                {todo.assignedTo && (
                  <div className="flex items-center gap-1 whitespace-nowrap">
                    <User className="w-3 h-3 flex-shrink-0" />
                    <span>担当: {todo.assignedTo}</span>
                  </div>
                )}
                {todo.requestedBy && (
                  <div className="flex items-center gap-1 whitespace-nowrap">
                    <User className="w-3 h-3 flex-shrink-0" />
                    <span>依頼者: {todo.requestedBy}</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* アクションボタン */}
          <div className="flex items-center gap-1 flex-shrink-0">
            <button
              onClick={() => openTodoModal(todo.type, todo)}
              className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
              title="編集"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
            </button>
            <button
              onClick={() => handleDeleteTodo(todo.id)}
              className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
              title="削除"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* ヘッダー */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <h1 className="text-2xl font-bold text-gray-900">Todoリスト</h1>
          <button
            onClick={() => setShowCompleted(!showCompleted)}
            className="flex items-center gap-2 px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
          >
            {showCompleted ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            {showCompleted ? '完了を非表示' : '完了を表示'}
          </button>
        </div>
        <p className="text-sm text-gray-500">タスクを管理して生産性を向上させましょう</p>
      </div>

      {/* Todoリスト */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 依頼Todo */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">
              依頼Todo <span className="text-sm text-gray-500 font-normal">({requestedTodos.length + assignedTodos.length}件)</span>
            </h2>
            <button
              onClick={() => openTodoModal('request')}
              className="flex items-center gap-1 px-3 py-1.5 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Plus className="w-4 h-4" />
              依頼を作成
            </button>
          </div>

          {/* 自分が依頼したTodo */}
          {requestedTodos.length > 0 && (
            <div>
              <h3 className="text-sm font-medium text-gray-700 mb-2">自分が依頼したTodo</h3>
              <div className="space-y-2">
                {requestedTodos.map(renderTodoCard)}
              </div>
            </div>
          )}

          {/* 自分に割り当てられたTodo */}
          {assignedTodos.length > 0 && (
            <div className={requestedTodos.length > 0 ? 'mt-6' : ''}>
              <h3 className="text-sm font-medium text-gray-700 mb-2">自分に割り当てられたTodo</h3>
              <div className="space-y-2">
                {assignedTodos.map(renderTodoCard)}
              </div>
            </div>
          )}

          {requestedTodos.length === 0 && assignedTodos.length === 0 && (
            <div className="p-8 text-center text-gray-400 border-2 border-dashed border-gray-200 rounded-lg">
              <ClipboardList className="w-12 h-12 mx-auto mb-2 opacity-50" />
              <p className="text-sm">依頼Todoはありません</p>
            </div>
          )}
        </div>

        {/* 個人Todo */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">
              個人Todo <span className="text-sm text-gray-500 font-normal">({personalTodos.length}件)</span>
            </h2>
            <button
              onClick={() => openTodoModal('personal')}
              className="flex items-center gap-1 px-3 py-1.5 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700 transition-colors"
            >
              <Plus className="w-4 h-4" />
              Todoを追加
            </button>
          </div>

          <div className="space-y-2">
            {personalTodos.length > 0 ? (
              personalTodos.map(renderTodoCard)
            ) : (
              <div className="p-8 text-center text-gray-400 border-2 border-dashed border-gray-200 rounded-lg">
                <Check className="w-12 h-12 mx-auto mb-2 opacity-50" />
                <p className="text-sm">個人Todoはありません</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Todoモーダル */}
      {showTodoModal && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 overflow-y-auto"
          onClick={() => setShowTodoModal(false)}
        >
          <div
            className="bg-white rounded-lg shadow-xl max-w-md w-full max-h-[90vh] flex flex-col my-4"
            onClick={(e) => e.stopPropagation()}
          >
            {/* ヘッダー */}
            <div className="flex items-center justify-between p-4 border-b flex-shrink-0">
              <h3 className="text-lg font-semibold text-gray-900">
                {editingTodo ? 'Todoを編集' : todoType === 'request' ? '依頼Todoを作成' : '個人Todoを作成'}
              </h3>
              <button
                type="button"
                onClick={() => setShowTodoModal(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* フォーム */}
            <div className="p-4 space-y-4 overflow-y-auto flex-1">
              {/* タイトル */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  タイトル <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={todoForm.title}
                  onChange={(e) => setTodoForm({ ...todoForm, title: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Todoのタイトルを入力"
                />
              </div>

              {/* 説明 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">説明</label>
                <textarea
                  value={todoForm.description}
                  onChange={(e) => setTodoForm({ ...todoForm, description: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
                  rows={3}
                  placeholder="詳細な説明を入力（任意）"
                />
              </div>

              {/* 優先度 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">優先度</label>
                <select
                  value={todoForm.priority}
                  onChange={(e) => setTodoForm({ ...todoForm, priority: e.target.value as TodoPriority })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="low">低</option>
                  <option value="medium">中</option>
                  <option value="high">高</option>
                  <option value="urgent">緊急</option>
                </select>
              </div>

              {/* 期限 */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">期限日</label>
                  <input
                    type="date"
                    value={todoForm.dueDate}
                    onChange={(e) => setTodoForm({ ...todoForm, dueDate: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">期限時刻</label>
                  <input
                    type="time"
                    value={todoForm.dueTime}
                    onChange={(e) => setTodoForm({ ...todoForm, dueTime: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>

              {/* 担当者（依頼Todoの場合のみ） */}
              {todoType === 'request' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">担当者</label>
                  <select
                    value={todoForm.assignedTo}
                    onChange={(e) => setTodoForm({ ...todoForm, assignedTo: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">選択してください</option>
                    {salesReps.map((rep) => (
                      <option key={rep.id} value={rep.name}>
                        {rep.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            {/* フッター */}
            <div className="flex items-center justify-end gap-2 p-4 border-t bg-gray-50 flex-shrink-0">
              <button
                type="button"
                onClick={() => setShowTodoModal(false)}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                キャンセル
              </button>
              <button
                type="button"
                onClick={handleSaveTodo}
                disabled={!todoForm.title.trim()}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {editingTodo ? '更新' : '作成'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
