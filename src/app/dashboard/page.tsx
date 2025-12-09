'use client'

import { useMemo, useEffect, useState } from 'react'
import { Users, FileText, TrendingUp, Bell, UserCheck, Phone, Target, Calendar, CheckSquare, AlertCircle, Sparkles } from 'lucide-react'
import Link from 'next/link'
import { useCustomerStore } from '@/stores/customer-store'
import { useSalesTargetStore } from '@/stores/sales-target-store'
import { useEstimateStore } from '@/stores/estimate-store'
import { useTodoStore } from '@/stores/todo-store'
import { useAuthStore } from '@/stores/auth-store'
import { CustomerStatus } from '@/types'

// 最終連絡日から経過した日数を計算
function getDaysSinceLastContact(lastContactedAt?: string, deliveredDate?: string): number {
  const referenceDate = lastContactedAt || deliveredDate
  if (!referenceDate) return 999
  const lastContact = new Date(referenceDate)
  const now = new Date()
  return Math.floor((now.getTime() - lastContact.getTime()) / (24 * 60 * 60 * 1000))
}

// 連絡が必要かどうか判定
function needsContact(lastContactedAt?: string, deliveredDate?: string): boolean {
  const daysSince = getDaysSinceLastContact(lastContactedAt, deliveredDate)
  return daysSince >= 90
}

// 今週の範囲を取得
function getWeekRange() {
  const now = new Date()
  const dayOfWeek = now.getDay()
  const startOfWeek = new Date(now)
  startOfWeek.setDate(now.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1)) // 月曜始まり
  startOfWeek.setHours(0, 0, 0, 0)

  const endOfWeek = new Date(startOfWeek)
  endOfWeek.setDate(startOfWeek.getDate() + 6)
  endOfWeek.setHours(23, 59, 59, 999)

  return { startOfWeek, endOfWeek }
}

// 今月の範囲を取得
function getMonthRange() {
  const now = new Date()
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
  const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999)
  return { startOfMonth, endOfMonth }
}

// AIコメント生成（簡易版）
function generateAIComment(achievement: number, todoCount: number, contactNeeded: number): string {
  if (achievement >= 100) {
    return "素晴らしい！目標達成です🎉 この調子で頑張りましょう！"
  } else if (achievement >= 80) {
    return "あと少しで目標達成です！残りのTodoをこなしていきましょう💪"
  } else if (achievement >= 50) {
    if (contactNeeded > 5) {
      return `要連絡のオーナーが${contactNeeded}名います。フォローアップで新規受注に繋げましょう📞`
    }
    return `目標まで${100 - Math.round(achievement)}%。商談を積極的に進めていきましょう🚀`
  } else {
    if (todoCount > 5) {
      return `Todoが${todoCount}件あります。優先順位をつけて対応しましょう📋`
    }
    return "目標達成に向けて、新規顧客の開拓と既存客のフォローを強化しましょう🎯"
  }
}

export default function DashboardPage() {
  const { user } = useAuthStore()
  const { customers } = useCustomerStore()
  const { contracts, targets } = useSalesTargetStore()
  const { estimates } = useEstimateStore()
  const { todos, getAssignedTodos } = useTodoStore()

  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  // 納車済み契約
  const deliveredContracts = useMemo(() => {
    return contracts.filter(c => c.isDelivered)
  }, [contracts])

  // 要連絡のオーナー
  const ownersNeedingContact = useMemo(() => {
    if (!customers) return []

    const owners = customers.filter(c => c.status === CustomerStatus.OWNER)
    return owners.filter(owner => {
      const contract = deliveredContracts.find(c => c.customerId === owner.id)
      return needsContact(owner.lastContactedAt, contract?.deliveredDate)
    }).map(owner => {
      const contract = deliveredContracts.find(c => c.customerId === owner.id)
      const daysSince = getDaysSinceLastContact(owner.lastContactedAt, contract?.deliveredDate)
      return { ...owner, daysSinceContact: daysSince, contract }
    }).sort((a, b) => b.daysSinceContact - a.daysSinceContact)
  }, [customers, deliveredContracts])

  // 今週・今月の商談数（見積もり数）
  const dealStats = useMemo(() => {
    const { startOfWeek, endOfWeek } = getWeekRange()
    const { startOfMonth, endOfMonth } = getMonthRange()

    // 今週の見積もり
    const thisWeekEstimates = estimates.filter(e => {
      const createdAt = new Date(e.createdAt)
      return createdAt >= startOfWeek && createdAt <= endOfWeek
    })

    // 今月の見積もり
    const thisMonthEstimates = estimates.filter(e => {
      const createdAt = new Date(e.createdAt)
      return createdAt >= startOfMonth && createdAt <= endOfMonth
    })

    // ランク別集計（今月）
    const rankA = thisMonthEstimates.filter(e => e.rank === 'A').length
    const rankB = thisMonthEstimates.filter(e => e.rank === 'B').length
    const rankC = thisMonthEstimates.filter(e => e.rank === 'C').length

    return {
      thisWeek: thisWeekEstimates.length,
      thisMonth: thisMonthEstimates.length,
      rankA,
      rankB,
      rankC,
    }
  }, [estimates])

  // 自分に割り当てられたTodo数
  const myTodoCount = useMemo(() => {
    if (!user || !mounted) return 0
    return getAssignedTodos(user.name).filter(t => !t.completed).length
  }, [user, getAssignedTodos, mounted])

  // 営業目標と達成率
  const targetStats = useMemo(() => {
    if (!user) return { monthly: 0, achievement: 0, remaining: 0, achieved: 0 }

    const now = new Date()
    const currentYear = now.getFullYear()
    const currentMonth = now.getMonth() + 1

    const userTarget = targets.find(t =>
      t.salesRepName === user.name &&
      t.year === currentYear &&
      t.month === currentMonth
    )

    if (!userTarget) return { monthly: 0, achievement: 0, remaining: 0, achieved: 0 }

    const { startOfMonth, endOfMonth } = getMonthRange()
    const thisMonthContracts = contracts.filter(c => {
      const contractDate = new Date(c.contractDate)
      return contractDate >= startOfMonth &&
             contractDate <= endOfMonth &&
             c.salesRepName === user.name
    })

    const achieved = thisMonthContracts.length
    const achievement = userTarget.targetCount > 0
      ? Math.round((achieved / userTarget.targetCount) * 100)
      : 0

    return {
      monthly: userTarget.targetCount,
      achievement,
      remaining: Math.max(0, userTarget.targetCount - achieved),
      achieved,
    }
  }, [user, targets, contracts])

  // AIコメント
  const aiComment = useMemo(() => {
    if (!mounted) return ""
    return generateAIComment(
      targetStats.achievement,
      myTodoCount,
      ownersNeedingContact.length
    )
  }, [targetStats.achievement, myTodoCount, ownersNeedingContact.length, mounted])

  // 統計カード
  const stats = useMemo(() => {
    return [
      {
        title: '今週の商談数',
        value: dealStats.thisWeek.toString(),
        icon: Calendar,
        trend: '見積もり作成数',
        color: 'text-blue-600',
        bgColor: 'bg-blue-50',
        link: '/dashboard/estimates',
      },
      {
        title: '今月の商談数',
        value: dealStats.thisMonth.toString(),
        icon: FileText,
        trend: `A:${dealStats.rankA} B:${dealStats.rankB} C:${dealStats.rankC}`,
        color: 'text-emerald-600',
        bgColor: 'bg-emerald-50',
        link: '/dashboard/estimates',
      },
      {
        title: '未完了Todo',
        value: myTodoCount.toString(),
        icon: CheckSquare,
        trend: '自分に割り当てられたタスク',
        color: 'text-purple-600',
        bgColor: 'bg-purple-50',
        link: '/dashboard/todo',
      },
      {
        title: '要連絡オーナー',
        value: ownersNeedingContact.length.toString(),
        icon: Phone,
        trend: '3ヶ月以上連絡なし',
        color: ownersNeedingContact.length > 0 ? 'text-red-600' : 'text-gray-600',
        bgColor: ownersNeedingContact.length > 0 ? 'bg-red-50' : 'bg-gray-50',
        link: '/dashboard/owners',
      },
    ]
  }, [dealStats, myTodoCount, ownersNeedingContact.length])

  if (!mounted) {
    return (
      <div className="space-y-5">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">ダッシュボード</h1>
          <p className="text-sm text-slate-500 mt-1">読み込み中...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">ダッシュボード</h1>
        <p className="text-sm text-slate-500 mt-1">営業活動の概要</p>
      </div>

      {/* AIコメント */}
      <div className="bg-gradient-to-r from-blue-50 to-purple-50 border border-blue-200 rounded-xl p-4">
        <div className="flex items-start gap-3">
          <div className="bg-white p-2 rounded-lg shadow-sm">
            <Sparkles className="h-5 w-5 text-purple-600" />
          </div>
          <div className="flex-1">
            <h3 className="text-sm font-medium text-gray-800 mb-1">AIアシスタントからのメッセージ</h3>
            <p className="text-sm text-gray-700">{aiComment}</p>
          </div>
        </div>
      </div>

      {/* 営業目標カード */}
      {targetStats.monthly > 0 && (
        <div className="bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-200 rounded-xl p-5">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Target className="h-5 w-5 text-amber-600" />
              <h3 className="text-base font-semibold text-amber-900">今月の営業目標</h3>
            </div>
            <Link
              href="/dashboard/targets"
              className="text-sm text-amber-700 hover:text-amber-800 hover:underline font-medium transition-colors"
            >
              詳細を見る →
            </Link>
          </div>

          <div className="grid grid-cols-3 gap-4 mb-3">
            <div>
              <p className="text-xs text-amber-600 mb-1">目標</p>
              <p className="text-2xl font-bold text-amber-900">{targetStats.monthly}<span className="text-sm font-normal ml-1">件</span></p>
            </div>
            <div>
              <p className="text-xs text-amber-600 mb-1">達成</p>
              <p className="text-2xl font-bold text-amber-900">{targetStats.achieved}<span className="text-sm font-normal ml-1">件</span></p>
            </div>
            <div>
              <p className="text-xs text-amber-600 mb-1">残り</p>
              <p className="text-2xl font-bold text-amber-900">{targetStats.remaining}<span className="text-sm font-normal ml-1">件</span></p>
            </div>
          </div>

          {/* プログレスバー */}
          <div className="mt-3">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs text-amber-700">達成率</span>
              <span className="text-sm font-bold text-amber-900">{targetStats.achievement}%</span>
            </div>
            <div className="w-full bg-amber-100 rounded-full h-3 overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  targetStats.achievement >= 100
                    ? 'bg-green-500'
                    : targetStats.achievement >= 80
                    ? 'bg-amber-500'
                    : 'bg-amber-400'
                }`}
                style={{ width: `${Math.min(100, targetStats.achievement)}%` }}
              />
            </div>
          </div>
        </div>
      )}

      {/* 要連絡オーナーアラート */}
      {ownersNeedingContact.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-red-600 mt-0.5 flex-shrink-0" />
            <div className="flex-1">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-medium text-red-700 flex items-center gap-2">
                  <Bell className="h-4 w-4" />
                  要連絡のオーナーが {ownersNeedingContact.length} 名います
                </h3>
                <Link
                  href="/dashboard/owners"
                  className="text-sm text-red-600 hover:text-red-700 hover:underline font-medium transition-colors"
                >
                  オーナーリストを見る →
                </Link>
              </div>
              <p className="text-xs text-red-600 mt-1">
                3ヶ月以上連絡していないオーナー様がいます。定期的なフォローアップをお願いします。
              </p>
              <div className="mt-3 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                {ownersNeedingContact.slice(0, 6).map(owner => (
                  <Link
                    key={owner.id}
                    href={`/dashboard/customers/${owner.id}`}
                    className="flex items-center justify-between bg-white rounded-md p-2 border border-red-100 hover:bg-red-50 transition-all duration-150"
                  >
                    <div className="flex items-center gap-2">
                      <UserCheck className="h-4 w-4 text-red-500" />
                      <span className="text-sm font-medium text-red-700">{owner.name}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      {owner.assignedSalesRepName && (
                        <span className={`text-xs px-1.5 py-0.5 rounded ${owner.assignedSalesRepColor || 'bg-slate-100 text-slate-700'}`}>
                          {owner.assignedSalesRepName}
                        </span>
                      )}
                      <span className="text-xs text-red-600 whitespace-nowrap">
                        {owner.daysSinceContact >= 999 ? '履歴なし' : `${owner.daysSinceContact}日`}
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
              {ownersNeedingContact.length > 6 && (
                <p className="text-xs text-red-600 text-center mt-2">
                  他 {ownersNeedingContact.length - 6} 名...
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 統計カード */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat) => (
          <Link key={stat.title} href={stat.link as any}>
            <div className="bg-white rounded-xl p-5 border border-slate-200 hover:shadow-md transition-all duration-200 cursor-pointer">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-medium text-slate-600">
                  {stat.title}
                </span>
                <div className={`${stat.bgColor} p-2 rounded-lg`}>
                  <stat.icon className={`h-5 w-5 ${stat.color}`} />
                </div>
              </div>
              <div className="text-2xl font-bold text-slate-900">{stat.value}</div>
              <p className="text-xs text-slate-500 mt-1">{stat.trend}</p>
            </div>
          </Link>
        ))}
      </div>

      {/* 営業先（最近の商談） */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-white rounded-xl p-5 border border-slate-200">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-base font-semibold text-slate-800">営業先（進行中の商談）</h3>
            <Link
              href="/dashboard/customers"
              className="text-sm text-blue-600 hover:text-blue-700 hover:underline transition-colors"
            >
              全て見る →
            </Link>
          </div>
          <div className="space-y-3">
            {customers?.filter(c =>
              c.status === CustomerStatus.RANK_A ||
              c.status === CustomerStatus.RANK_B
            ).slice(0, 5).map((customer) => (
              <Link
                key={customer.id}
                href={`/dashboard/customers/${customer.id}`}
                className="flex items-center justify-between py-3 border-b border-slate-100 last:border-0 hover:bg-slate-50 -mx-2 px-2 rounded-md transition-all duration-150"
              >
                <div>
                  <p className="font-medium text-slate-900">{customer.name}</p>
                  <p className="text-sm text-slate-600">
                    {customer.interestedCars?.[0] || '車種未定'}
                  </p>
                </div>
                <div className="text-right">
                  <span className={`text-xs px-2 py-1 rounded ${
                    customer.status === CustomerStatus.RANK_A
                      ? 'bg-red-100 text-red-700'
                      : 'bg-blue-50 text-blue-700'
                  }`}>
                    {customer.status === CustomerStatus.RANK_A ? 'ランクA' : 'ランクB'}
                  </span>
                  {customer.assignedSalesRepName && (
                    <span className={`ml-2 text-xs px-1.5 py-0.5 rounded ${customer.assignedSalesRepColor || 'bg-slate-100 text-slate-700'}`}>
                      {customer.assignedSalesRepName}
                    </span>
                  )}
                </div>
              </Link>
            )) || (
              <p className="text-slate-500 text-sm text-center py-8">進行中の商談はありません</p>
            )}
          </div>
        </div>

        {/* 最近の見積もり */}
        <div className="bg-white rounded-xl p-5 border border-slate-200">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-base font-semibold text-slate-800">最近の見積もり</h3>
            <Link
              href="/dashboard/estimates"
              className="text-sm text-blue-600 hover:text-blue-700 hover:underline transition-colors"
            >
              全て見る →
            </Link>
          </div>
          <div className="space-y-3">
            {estimates.slice(0, 5).map((estimate) => (
              <Link
                key={estimate.id}
                href={`/dashboard/estimates?id=${estimate.id}`}
                className="flex items-center justify-between py-3 border-b border-slate-100 last:border-0 hover:bg-slate-50 -mx-2 px-2 rounded-md transition-all duration-150"
              >
                <div>
                  <p className="font-medium text-slate-900">{estimate.customerName}</p>
                  <p className="text-sm text-slate-600">{estimate.vehicleName || '車両未設定'}</p>
                </div>
                <div className="text-right">
                  <span className={`text-xs px-2 py-1 rounded ${
                    estimate.rank === 'A'
                      ? 'bg-red-100 text-red-700'
                      : estimate.rank === 'B'
                      ? 'bg-blue-50 text-blue-700'
                      : 'bg-gray-100 text-gray-700'
                  }`}>
                    ランク{estimate.rank}
                  </span>
                  <p className="text-xs text-slate-500 mt-1">
                    {new Date(estimate.createdAt).toLocaleDateString('ja-JP')}
                  </p>
                </div>
              </Link>
            ))}
            {estimates.length === 0 && (
              <p className="text-slate-500 text-sm text-center py-8">見積もりがありません</p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
