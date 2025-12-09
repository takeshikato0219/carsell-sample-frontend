import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { Customer, CustomerStatus } from '@/types'
import { useSalesTargetStore } from './sales-target-store'

interface CustomerStore {
  customers: Customer[]
  isInitialized: boolean
  initializeCustomers: (customers: Customer[]) => void
  updateCustomerStatus: (id: string, status: CustomerStatus, contractInfo?: {
    saleAmount: number
    profit: number
    vehicleModel?: string
  }) => void
  updateCustomer: (id: string, updates: Partial<Customer>) => void
  updateCustomerFromEstimate: (customerId: string, estimateData: {
    salesRepName?: string
    salesRepColor?: string
    rank?: 'A' | 'B' | 'C'
    vehicleName?: string
  }) => void
  addCustomers: (newCustomers: Customer[]) => void
  deleteCustomers: (ids: string[]) => void
  getCustomers: () => Customer[]
  getCustomer: (id: string) => Customer | undefined
}

export const useCustomerStore = create<CustomerStore>()(
  persist(
    (set, get) => ({
  customers: [],
  isInitialized: false,

  initializeCustomers: (customers: Customer[]) => {
    const state = get()
    // 既に初期化済みの場合は何もしない（永続化されたデータを優先）
    if (!state.isInitialized || state.customers.length === 0) {
      set({ customers, isInitialized: true })
    }
  },

  updateCustomerStatus: (id: string, status: CustomerStatus, contractInfo?: {
    saleAmount: number
    profit: number
    vehicleModel?: string
  }) => {
    const state = get()
    const customer = state.customers.find(c => c.id === id)

    // ランクから納車待ちに変わった場合、契約を追加
    if (customer && status === CustomerStatus.AWAITING_DELIVERY) {
      const previousStatus = customer.status
      const isFromRank = previousStatus === CustomerStatus.RANK_A ||
                         previousStatus === CustomerStatus.RANK_B ||
                         previousStatus === CustomerStatus.RANK_C ||
                         previousStatus === CustomerStatus.RANK_N ||
                         previousStatus === CustomerStatus.NEW

      if (isFromRank) {
        // 契約情報がある場合は営業目標ストアに追加
        const salesTargetStore = useSalesTargetStore.getState()
        salesTargetStore.addContract({
          customerId: customer.id,
          customerName: customer.name,
          salesRepName: customer.assignedSalesRepName || '未割当',
          contractDate: new Date().toISOString().split('T')[0],
          saleAmount: contractInfo?.saleAmount || 0,
          profit: contractInfo?.profit || 0,
          vehicleModel: contractInfo?.vehicleModel || customer.interestedCars?.[0],
          isDelivered: false,
        })
      }
    }

    set((state) => ({
      customers: state.customers.map((c) =>
        c.id === id ? { ...c, status } : c
      ),
    }))
  },

  addCustomers: (newCustomers: Customer[]) => {
    set((state) => ({
      customers: [...state.customers, ...newCustomers],
    }))
  },

  deleteCustomers: (ids: string[]) => {
    const idSet = new Set(ids)
    set((state) => ({
      customers: state.customers.filter((c) => !idSet.has(c.id)),
    }))
  },

  getCustomers: () => get().customers,

  getCustomer: (id: string) => get().customers.find(c => c.id === id),

  updateCustomer: (id: string, updates: Partial<Customer>) => {
    set((state) => ({
      customers: state.customers.map((c) =>
        c.id === id ? { ...c, ...updates, updatedAt: new Date().toISOString() } : c
      ),
    }))
  },

  updateCustomerFromEstimate: (customerId: string, estimateData: {
    salesRepName?: string
    salesRepColor?: string
    rank?: 'A' | 'B' | 'C'
    vehicleName?: string
  }) => {
    const state = get()
    const customer = state.customers.find(c => c.id === customerId)
    if (!customer) return

    // ランクからステータスへのマッピング
    const rankToStatus: Record<string, CustomerStatus> = {
      'A': CustomerStatus.RANK_A,
      'B': CustomerStatus.RANK_B,
      'C': CustomerStatus.RANK_C,
    }

    const updates: Partial<Customer> = {
      updatedAt: new Date().toISOString(),
    }

    // 担当者情報を更新
    if (estimateData.salesRepName) {
      updates.assignedSalesRepName = estimateData.salesRepName
    }
    if (estimateData.salesRepColor) {
      updates.assignedSalesRepColor = estimateData.salesRepColor
    }

    // ランクからステータスを更新（現在のステータスがランク系または新規の場合のみ）
    if (estimateData.rank) {
      const currentStatus = customer.status
      const isRankStatus = currentStatus === CustomerStatus.NEW ||
                          currentStatus === CustomerStatus.RANK_A ||
                          currentStatus === CustomerStatus.RANK_B ||
                          currentStatus === CustomerStatus.RANK_C ||
                          currentStatus === CustomerStatus.RANK_N ||
                          !currentStatus
      if (isRankStatus) {
        updates.status = rankToStatus[estimateData.rank]
      }
    }

    // 検討車種を更新
    if (estimateData.vehicleName) {
      const currentCars = customer.interestedCars || []
      if (!currentCars.includes(estimateData.vehicleName)) {
        updates.interestedCars = [estimateData.vehicleName, ...currentCars]
      }
    }

    set((state) => ({
      customers: state.customers.map((c) =>
        c.id === customerId ? { ...c, ...updates } : c
      ),
    }))
  },
}),
    {
      name: 'customer-store',
      partialize: (state) => ({
        customers: state.customers,
        isInitialized: state.isInitialized,
      }),
    }
  )
)
