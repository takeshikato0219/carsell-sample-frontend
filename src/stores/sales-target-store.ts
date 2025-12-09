import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import { SalesTarget, Contract } from '@/types'

// 年度実績の手動調整データ
interface FiscalYearAdjustment {
  id: string
  salesRepName: string
  fiscalYear: number // 年度開始年
  adjustedContracts?: number // 契約台数調整
  adjustedSales?: number // 売上調整
  adjustedProfit?: number // 利益調整
  createdAt: string
  updatedAt: string
}

// CSVインポート用の契約データ型
export interface CSVContractData {
  salesRepName: string
  contractDate: string
  customerName: string
  vehicleModel: string
  saleAmount: number
  profit: number
  isMQ?: boolean
  vehicleType?: 'new' | 'used' | 'modification'  // 車両種別（新車/中古/改造）
}

interface SalesTargetStore {
  // 営業目標
  targets: SalesTarget[]
  // 契約実績
  contracts: Contract[]
  // 年度実績調整
  fiscalYearAdjustments: FiscalYearAdjustment[]
  // 期間設定（年度開始日）
  fiscalYearStart: string // 'MM-DD' 形式、デフォルトは '05-21'

  // 目標管理
  setTarget: (salesRepName: string, year: number, month: number, targetCount: number) => void
  getTarget: (salesRepName: string, year: number, month: number) => SalesTarget | undefined
  getTargetsBySalesRep: (salesRepName: string) => SalesTarget[]

  // 契約管理
  addContract: (contract: Omit<Contract, 'id' | 'createdAt' | 'updatedAt'>) => void
  updateContract: (id: string, updates: Partial<Contract>) => void
  deleteContract: (id: string) => void
  markAsDelivered: (id: string, deliveredDate: string) => void

  // 一括インポート
  importContracts: (contracts: CSVContractData[]) => { imported: number; skipped: number }
  clearAllContracts: () => void
  clearContractsByFiscalYear: (fiscalYear: number, fiscalYearStart: string) => number // 年度指定削除

  // 年度実績調整
  setFiscalYearAdjustment: (salesRepName: string, fiscalYear: number, field: 'contracts' | 'sales' | 'profit', value: number) => void
  getFiscalYearAdjustment: (salesRepName: string, fiscalYear: number) => FiscalYearAdjustment | undefined

  // 集計
  getAwaitingDeliveryCount: () => number
  getAwaitingDeliveryBySalesRep: (salesRepName: string) => Contract[]
  getAwaitingDeliveryTotal: () => number
  getContractsByMonth: (year: number, month: number) => Contract[]
  getContractsBySalesRepAndMonth: (salesRepName: string, year: number, month: number) => Contract[]
  getContractsInFiscalYear: (startDate: string) => Contract[]
  getContractsBySalesRepInFiscalYear: (salesRepName: string, startDate: string) => Contract[]

  // 設定
  setFiscalYearStart: (date: string) => void
}

// サンプルデータ
const sampleContracts: Contract[] = [
  {
    id: '1',
    customerId: '6',
    customerName: '山田花子',
    salesRepName: '野島',
    contractDate: '2025-06-15',
    saleAmount: 6500000,
    profit: 850000,
    vehicleModel: 'AtoZ アミティ',
    isDelivered: false,
    createdAt: '2025-06-15T10:00:00Z',
    updatedAt: '2025-06-15T10:00:00Z',
  },
  {
    id: '2',
    customerId: '10',
    customerName: '加藤健一',
    salesRepName: '目黒',
    contractDate: '2025-07-20',
    saleAmount: 7200000,
    profit: 920000,
    vehicleModel: 'トイファクトリー アルコーバ',
    isDelivered: false,
    createdAt: '2025-07-20T10:00:00Z',
    updatedAt: '2025-07-20T10:00:00Z',
  },
  {
    id: '3',
    customerId: '11',
    customerName: '小林真理',
    salesRepName: '目黒',
    contractDate: '2025-08-05',
    saleAmount: 5800000,
    profit: 720000,
    vehicleModel: 'レクビィ ホビクル',
    isDelivered: false,
    createdAt: '2025-08-05T10:00:00Z',
    updatedAt: '2025-08-05T10:00:00Z',
  },
  {
    id: '4',
    customerId: '12',
    customerName: '松本大輔',
    salesRepName: '野島',
    contractDate: '2025-09-10',
    saleAmount: 8500000,
    profit: 1100000,
    vehicleModel: 'バンテック ジル520',
    isDelivered: false,
    createdAt: '2025-09-10T10:00:00Z',
    updatedAt: '2025-09-10T10:00:00Z',
  },
  {
    id: '5',
    customerId: '13',
    customerName: '井上さやか',
    salesRepName: '目黒',
    contractDate: '2025-10-25',
    saleAmount: 4200000,
    profit: 550000,
    vehicleModel: '軽キャンパー',
    isDelivered: true,
    deliveredDate: '2025-11-15',
    createdAt: '2025-10-25T10:00:00Z',
    updatedAt: '2025-11-15T10:00:00Z',
  },
]

// サンプル目標データ
const sampleTargets: SalesTarget[] = [
  { id: '1', salesRepName: '目黒', year: 2025, month: 5, targetCount: 3, createdAt: '2025-05-01T00:00:00Z', updatedAt: '2025-05-01T00:00:00Z' },
  { id: '2', salesRepName: '目黒', year: 2025, month: 6, targetCount: 3, createdAt: '2025-06-01T00:00:00Z', updatedAt: '2025-06-01T00:00:00Z' },
  { id: '3', salesRepName: '目黒', year: 2025, month: 7, targetCount: 4, createdAt: '2025-07-01T00:00:00Z', updatedAt: '2025-07-01T00:00:00Z' },
  { id: '4', salesRepName: '目黒', year: 2025, month: 8, targetCount: 3, createdAt: '2025-08-01T00:00:00Z', updatedAt: '2025-08-01T00:00:00Z' },
  { id: '5', salesRepName: '目黒', year: 2025, month: 9, targetCount: 3, createdAt: '2025-09-01T00:00:00Z', updatedAt: '2025-09-01T00:00:00Z' },
  { id: '6', salesRepName: '目黒', year: 2025, month: 10, targetCount: 4, createdAt: '2025-10-01T00:00:00Z', updatedAt: '2025-10-01T00:00:00Z' },
  { id: '7', salesRepName: '目黒', year: 2025, month: 11, targetCount: 3, createdAt: '2025-11-01T00:00:00Z', updatedAt: '2025-11-01T00:00:00Z' },
  { id: '8', salesRepName: '目黒', year: 2025, month: 12, targetCount: 3, createdAt: '2025-12-01T00:00:00Z', updatedAt: '2025-12-01T00:00:00Z' },
  { id: '9', salesRepName: '野島', year: 2025, month: 5, targetCount: 2, createdAt: '2025-05-01T00:00:00Z', updatedAt: '2025-05-01T00:00:00Z' },
  { id: '10', salesRepName: '野島', year: 2025, month: 6, targetCount: 3, createdAt: '2025-06-01T00:00:00Z', updatedAt: '2025-06-01T00:00:00Z' },
  { id: '11', salesRepName: '野島', year: 2025, month: 7, targetCount: 3, createdAt: '2025-07-01T00:00:00Z', updatedAt: '2025-07-01T00:00:00Z' },
  { id: '12', salesRepName: '野島', year: 2025, month: 8, targetCount: 2, createdAt: '2025-08-01T00:00:00Z', updatedAt: '2025-08-01T00:00:00Z' },
  { id: '13', salesRepName: '野島', year: 2025, month: 9, targetCount: 3, createdAt: '2025-09-01T00:00:00Z', updatedAt: '2025-09-01T00:00:00Z' },
  { id: '14', salesRepName: '野島', year: 2025, month: 10, targetCount: 3, createdAt: '2025-10-01T00:00:00Z', updatedAt: '2025-10-01T00:00:00Z' },
  { id: '15', salesRepName: '野島', year: 2025, month: 11, targetCount: 2, createdAt: '2025-11-01T00:00:00Z', updatedAt: '2025-11-01T00:00:00Z' },
  { id: '16', salesRepName: '野島', year: 2025, month: 12, targetCount: 3, createdAt: '2025-12-01T00:00:00Z', updatedAt: '2025-12-01T00:00:00Z' },
]

export const useSalesTargetStore = create<SalesTargetStore>()(
  persist(
    (set, get) => ({
      targets: sampleTargets,
      contracts: sampleContracts,
      fiscalYearAdjustments: [],
      fiscalYearStart: '05-21',

      setTarget: (salesRepName, year, month, targetCount) => {
        set((state) => {
          const existingIndex = state.targets.findIndex(
            t => t.salesRepName === salesRepName && t.year === year && t.month === month
          )
          const now = new Date().toISOString()

          if (existingIndex >= 0) {
            const newTargets = [...state.targets]
            newTargets[existingIndex] = {
              ...newTargets[existingIndex],
              targetCount,
              updatedAt: now,
            }
            return { targets: newTargets }
          } else {
            const newTarget: SalesTarget = {
              id: `target-${Date.now()}`,
              salesRepName,
              year,
              month,
              targetCount,
              createdAt: now,
              updatedAt: now,
            }
            return { targets: [...state.targets, newTarget] }
          }
        })
      },

      getTarget: (salesRepName, year, month) => {
        return get().targets.find(
          t => t.salesRepName === salesRepName && t.year === year && t.month === month
        )
      },

      getTargetsBySalesRep: (salesRepName) => {
        return get().targets.filter(t => t.salesRepName === salesRepName)
      },

      addContract: (contract) => {
        const now = new Date().toISOString()
        const newContract: Contract = {
          ...contract,
          id: `contract-${Date.now()}`,
          createdAt: now,
          updatedAt: now,
        }
        set((state) => ({ contracts: [...state.contracts, newContract] }))
      },

      updateContract: (id, updates) => {
        set((state) => ({
          contracts: state.contracts.map(c =>
            c.id === id ? { ...c, ...updates, updatedAt: new Date().toISOString() } : c
          ),
        }))
      },

      deleteContract: (id) => {
        set((state) => ({
          contracts: state.contracts.filter(c => c.id !== id),
        }))
      },

      markAsDelivered: (id, deliveredDate) => {
        set((state) => ({
          contracts: state.contracts.map(c =>
            c.id === id ? { ...c, isDelivered: true, deliveredDate, updatedAt: new Date().toISOString() } : c
          ),
        }))
      },

      importContracts: (csvContracts) => {
        const now = new Date().toISOString()
        let imported = 0
        let skipped = 0

        set((state) => {
          const newContracts: Contract[] = []

          for (const csvContract of csvContracts) {
            // 重複チェック（同じ担当者、日付、顧客名の組み合わせ）
            const isDuplicate = state.contracts.some(
              c => c.salesRepName === csvContract.salesRepName &&
                   c.contractDate === csvContract.contractDate &&
                   c.customerName === csvContract.customerName
            )

            if (isDuplicate) {
              skipped++
              continue
            }

            const newContract: Contract = {
              id: `contract-${Date.now()}-${imported}`,
              customerId: '',
              customerName: csvContract.customerName,
              salesRepName: csvContract.salesRepName,
              contractDate: csvContract.contractDate,
              saleAmount: csvContract.saleAmount,
              profit: csvContract.profit,
              vehicleModel: csvContract.vehicleModel,
              isDelivered: false,
              isMQ: csvContract.isMQ,
              createdAt: now,
              updatedAt: now,
            }
            newContracts.push(newContract)
            imported++
          }

          return { contracts: [...state.contracts, ...newContracts] }
        })

        return { imported, skipped }
      },

      clearAllContracts: () => {
        set({ contracts: [] })
      },

      clearContractsByFiscalYear: (fiscalYear, fiscalYearStart) => {
        const [startMonth, startDay] = fiscalYearStart.split('-').map(Number)
        const startDate = new Date(fiscalYear, startMonth - 1, startDay)
        const endDate = new Date(fiscalYear + 1, startMonth - 1, startDay - 1)

        let deletedCount = 0
        set((state) => {
          const remainingContracts = state.contracts.filter(c => {
            const contractDate = new Date(c.contractDate)
            const isInFiscalYear = contractDate >= startDate && contractDate <= endDate
            if (isInFiscalYear) {
              deletedCount++
              return false
            }
            return true
          })
          return { contracts: remainingContracts }
        })
        return deletedCount
      },

      setFiscalYearAdjustment: (salesRepName, fiscalYear, field, value) => {
        set((state) => {
          const existingIndex = state.fiscalYearAdjustments.findIndex(
            a => a.salesRepName === salesRepName && a.fiscalYear === fiscalYear
          )
          const now = new Date().toISOString()

          if (existingIndex >= 0) {
            const newAdjustments = [...state.fiscalYearAdjustments]
            const fieldKey = field === 'contracts' ? 'adjustedContracts' : field === 'sales' ? 'adjustedSales' : 'adjustedProfit'
            newAdjustments[existingIndex] = {
              ...newAdjustments[existingIndex],
              [fieldKey]: value,
              updatedAt: now,
            }
            return { fiscalYearAdjustments: newAdjustments }
          } else {
            const fieldKey = field === 'contracts' ? 'adjustedContracts' : field === 'sales' ? 'adjustedSales' : 'adjustedProfit'
            const newAdjustment: FiscalYearAdjustment = {
              id: `adjustment-${Date.now()}`,
              salesRepName,
              fiscalYear,
              [fieldKey]: value,
              createdAt: now,
              updatedAt: now,
            }
            return { fiscalYearAdjustments: [...state.fiscalYearAdjustments, newAdjustment] }
          }
        })
      },

      getFiscalYearAdjustment: (salesRepName, fiscalYear) => {
        return get().fiscalYearAdjustments.find(
          a => a.salesRepName === salesRepName && a.fiscalYear === fiscalYear
        )
      },

      getAwaitingDeliveryCount: () => {
        return get().contracts.filter(c => !c.isDelivered).length
      },

      getAwaitingDeliveryBySalesRep: (salesRepName) => {
        return get().contracts.filter(c => c.salesRepName === salesRepName && !c.isDelivered)
      },

      getAwaitingDeliveryTotal: () => {
        return get().contracts
          .filter(c => !c.isDelivered)
          .reduce((sum, c) => sum + c.saleAmount, 0)
      },

      getContractsByMonth: (year, month) => {
        return get().contracts.filter(c => {
          const date = new Date(c.contractDate)
          return date.getFullYear() === year && date.getMonth() + 1 === month
        })
      },

      getContractsBySalesRepAndMonth: (salesRepName, year, month) => {
        return get().contracts.filter(c => {
          const date = new Date(c.contractDate)
          return c.salesRepName === salesRepName &&
            date.getFullYear() === year &&
            date.getMonth() + 1 === month
        })
      },

      getContractsInFiscalYear: (startDate) => {
        const [startMonth, startDay] = startDate.split('-').map(Number)
        const now = new Date()
        const currentYear = now.getFullYear()

        // 年度開始日を計算
        let fiscalYearStartDate = new Date(currentYear, startMonth - 1, startDay)
        if (now < fiscalYearStartDate) {
          fiscalYearStartDate = new Date(currentYear - 1, startMonth - 1, startDay)
        }

        // 年度終了日
        const fiscalYearEndDate = new Date(fiscalYearStartDate)
        fiscalYearEndDate.setFullYear(fiscalYearEndDate.getFullYear() + 1)

        return get().contracts.filter(c => {
          const contractDate = new Date(c.contractDate)
          return contractDate >= fiscalYearStartDate && contractDate < fiscalYearEndDate
        })
      },

      getContractsBySalesRepInFiscalYear: (salesRepName, startDate) => {
        return get().getContractsInFiscalYear(startDate).filter(c => c.salesRepName === salesRepName)
      },

      setFiscalYearStart: (date) => {
        set({ fiscalYearStart: date })
      },
    }),
    {
      name: 'sales-target-storage',
      storage: createJSONStorage(() => localStorage),
    }
  )
)
