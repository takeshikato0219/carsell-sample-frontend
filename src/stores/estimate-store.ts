import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { vehicles as vehicleData, Vehicle, getVehicleModels as getModels, getVehicleGrades as getGrades, getGradeDisplayName, vehicleCategories, getVehicleCategory, getCategoryName } from '@/data/vehicles-data'
import { vehicleOptions as optionData, VehicleOption, getOptionCategories, getOptionsByCategory } from '@/data/options-data'
import { useSettingsStore } from './settings-store'

// 再エクスポート
export type { Vehicle, VehicleOption }
export { getModels as getVehicleModels, getGrades as getVehicleGrades, getGradeDisplayName }
export { vehicleCategories, getVehicleCategory, getCategoryName }
export { getOptionCategories, getOptionsByCategory }

// 車両改造カテゴリ（ボディー改造）
export const MODIFICATION_CATEGORY = 'ボディー'

// 車両改造オプションを取得
export function getModificationOptions(): VehicleOption[] {
  return optionData.filter(o => o.category === MODIFICATION_CATEGORY)
}

// 見積書項目型
export interface EstimateItem {
  id: string
  optionId: string
  optionName: string
  quantity: number
  unitPrice: number
  amount: number
}

// 下取り車詳細情報
export interface TradeInVehicleDetails {
  name: string           // 車名
  equipment: string      // 装備
  year: string           // 年式
  mileage: string        // 走行距離
  driveType: string      // 駆動
  grade: string          // グレード
  color: string          // 色
  repairHistory: string  // 修復歴
}

// 支払条件
export interface PaymentTerms {
  depositPercentage: number      // 手付け申し込み金 %
  depositAmount: number          // 手付け申し込み金 金額
  interimPercentage: number      // 中間内金 %
  interimAmount: number          // 中間内金 金額
  balancePercentage: number      // 残金 %
  balanceAmount: number          // 残金 金額
}

// 見積もりランク
export type EstimateRank = 'A' | 'B' | 'C'

// 見積書型
export interface Estimate {
  id: string
  estimateNo: string
  createdAt: string
  updatedAt: string
  status: 'draft' | 'sent' | 'accepted' | 'rejected'

  // 担当者情報
  salesRepName?: string
  salesRepColor?: string

  // ランク（デフォルトはB）
  rank?: EstimateRank

  // 顧客情報
  customerId?: string
  customerName: string
  postalCode: string
  address: string
  phone: string
  email: string

  // 車両情報
  vehicleId?: string
  vehicleName: string
  vehicleBase: string
  vehicleDrive: string
  vehiclePrice: number
  vehicleCategory?: string  // 車両カテゴリ（中古車・ワンオフなど）
  isCustomVehicle?: boolean // 中古車・ワンオフなどの自由入力車両

  // 車両詳細情報（新規追加）
  bodyColor?: string           // ボディー色
  seatingCapacity?: number     // 乗車定員
  sleepingCapacity?: number    // 就寝定員
  desiredPlateNumber?: string  // 希望ナンバー
  seatFabric?: string          // 椅子生地
  curtainFabric?: string       // カーテン生地

  // オプション
  options: EstimateItem[]

  // 税金・諸費用
  taxEnv: number
  taxWeight: number
  insurance: number
  registrationFee: number
  garageRegistrationFee: number
  deliveryFee: number
  tradeInFee: number
  recycleFee: number

  // 追加の諸費用（動的項目）
  additionalFees?: { id: string; name: string; amount: number; isTaxable: boolean }[]

  // 支払条件・納期（新規追加）
  paymentTerms?: PaymentTerms
  deliveryTiming?: string          // 納車時期
  acceptanceConfirmation?: boolean // 承諾書受け取り確認

  // 下取り・値引き
  tradeInVehicle: string
  tradeInPrice: number
  tradeInDetails?: TradeInVehicleDetails  // 下取り車詳細情報（新規追加）
  discount: number

  // 計算値
  vehicleSubtotal: number
  optionsSubtotal: number
  feesSubtotal: number
  taxableAmount: number
  consumptionTax: number
  totalAmount: number

  // 備考
  notes: string
}

interface EstimateStore {
  estimates: Estimate[]
  vehicles: Vehicle[]
  options: VehicleOption[]

  addEstimate: (estimate: Estimate) => void
  updateEstimate: (id: string, estimate: Partial<Estimate>) => void
  deleteEstimate: (id: string) => void
  getEstimate: (id: string) => Estimate | undefined
  createNewEstimate: (customerId?: string, customerName?: string) => Estimate
  calculateEstimate: (estimate: Partial<Estimate>) => {
    vehicleSubtotal: number
    optionsSubtotal: number
    feesSubtotal: number
    taxableAmount: number
    consumptionTax: number
    totalAmount: number
  }
  generateEstimateNo: () => string
}

export const useEstimateStore = create<EstimateStore>()(
  persist(
    (set, get) => ({
      estimates: [],
      vehicles: vehicleData,
      options: optionData,

      addEstimate: (estimate) => {
        set((state) => ({
          estimates: [...state.estimates, estimate]
        }))
      },

      updateEstimate: (id, updates) => {
        set((state) => ({
          estimates: state.estimates.map((e) =>
            e.id === id ? { ...e, ...updates, updatedAt: new Date().toISOString() } : e
          )
        }))
      },

      deleteEstimate: (id) => {
        set((state) => ({
          estimates: state.estimates.filter((e) => e.id !== id)
        }))
      },

      getEstimate: (id) => {
        return get().estimates.find((e) => e.id === id)
      },

      createNewEstimate: (customerId, customerName) => {
        // 設定ストアから諸費用設定を取得
        const settingsState = useSettingsStore.getState()

        // デフォルトの諸費用項目（feeItemsが未設定の場合のフォールバック）
        const defaultFeeItems = [
          { id: 'fee1', name: '登録代行費用', defaultAmount: 0, isRequired: false, isTaxable: true },
          { id: 'fee2', name: '車庫証明代行費用', defaultAmount: 0, isRequired: false, isTaxable: true },
          { id: 'fee3', name: '納車費用', defaultAmount: 0, isRequired: false, isTaxable: true },
          { id: 'fee4', name: '下取り諸費用', defaultAmount: 0, isRequired: false, isTaxable: true },
        ]

        // feeItemsが空またはundefinedの場合はデフォルト値を使用
        const feeItems = (settingsState.feeItems && settingsState.feeItems.length > 0)
          ? settingsState.feeItems
          : defaultFeeItems

        // 諸費用設定から各項目のデフォルト値を取得
        const getFeeAmount = (name: string, defaultValue: number) => {
          const item = feeItems.find(f => f.name === name)
          return item ? item.defaultAmount : defaultValue
        }

        // 標準の諸費用項目以外を追加の諸費用として取得
        const standardFeeNames = ['登録代行費用', '車庫証明代行費用', '納車費用', '下取り諸費用']
        const additionalFees = feeItems
          .filter(f => !standardFeeNames.includes(f.name))
          .map(f => ({ id: f.id, name: f.name, amount: f.defaultAmount, isTaxable: f.isTaxable ?? true }))

        const newEstimate: Estimate = {
          id: `est-${Date.now()}`,
          estimateNo: get().generateEstimateNo(),
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          status: 'draft',
          salesRepName: '',
          salesRepColor: '',
          rank: 'B', // デフォルトでランクB
          customerId: customerId || '',
          customerName: customerName || '',
          postalCode: '',
          address: '',
          phone: '',
          email: '',
          vehicleId: '',
          vehicleName: '',
          vehicleBase: '',
          vehicleDrive: '',
          vehiclePrice: 0,
          // 車両詳細情報
          bodyColor: '',
          seatingCapacity: undefined,
          sleepingCapacity: undefined,
          desiredPlateNumber: '',
          seatFabric: '',
          curtainFabric: '',
          options: [],
          taxEnv: 0,
          taxWeight: 0,
          insurance: 0,
          registrationFee: getFeeAmount('登録代行費用', 0),
          garageRegistrationFee: getFeeAmount('車庫証明代行費用', 0),
          deliveryFee: getFeeAmount('納車費用', 0),
          tradeInFee: getFeeAmount('下取り諸費用', 0),
          recycleFee: 0,
          additionalFees: additionalFees.length > 0 ? additionalFees : undefined,
          // 支払条件・納期
          paymentTerms: {
            depositPercentage: 0,
            depositAmount: 0,
            interimPercentage: 0,
            interimAmount: 0,
            balancePercentage: 0,
            balanceAmount: 0,
          },
          deliveryTiming: '',
          acceptanceConfirmation: false,
          tradeInVehicle: '',
          tradeInPrice: 0,
          // 下取り車詳細情報
          tradeInDetails: {
            name: '',
            equipment: '',
            year: '',
            mileage: '',
            driveType: '',
            grade: '',
            color: '',
            repairHistory: '',
          },
          discount: 0,
          vehicleSubtotal: 0,
          optionsSubtotal: 0,
          feesSubtotal: 0,
          taxableAmount: 0,
          consumptionTax: 0,
          totalAmount: 0,
          notes: '',
        }
        return newEstimate
      },

      calculateEstimate: (estimate) => {
        const vehicleSubtotal = estimate.vehiclePrice || 0
        const optionsSubtotal = (estimate.options || []).reduce((sum, item) => sum + item.amount, 0)

        // 追加の諸費用を課税/非課税で分類
        const additionalFees = estimate.additionalFees || []
        const additionalTaxableFees = additionalFees
          .filter(item => item.isTaxable !== false)
          .reduce((sum, item) => sum + item.amount, 0)
        const additionalNonTaxableFees = additionalFees
          .filter(item => item.isTaxable === false)
          .reduce((sum, item) => sum + item.amount, 0)

        // 法定費用（非課税）
        const legalFees =
          (estimate.taxEnv || 0) +
          (estimate.taxWeight || 0) +
          (estimate.insurance || 0) +
          (estimate.recycleFee || 0)

        // 代行手数料（課税対象）
        const agencyFees =
          (estimate.registrationFee || 0) +
          (estimate.garageRegistrationFee || 0) +
          (estimate.deliveryFee || 0) +
          (estimate.tradeInFee || 0)

        // 諸費用合計（税抜き）
        const feesSubtotal = legalFees + agencyFees + additionalTaxableFees + additionalNonTaxableFees

        // 課税対象額（車両本体 + オプション + 代行手数料 + 課税対象の追加諸費用）
        const taxableAmount = vehicleSubtotal + optionsSubtotal + agencyFees + additionalTaxableFees

        // 消費税
        const consumptionTax = Math.round(taxableAmount * 0.1)

        // 総合計
        const totalAmount =
          vehicleSubtotal +
          optionsSubtotal +
          consumptionTax +
          legalFees +
          agencyFees +
          additionalTaxableFees +
          additionalNonTaxableFees -
          (estimate.tradeInPrice || 0) -
          (estimate.discount || 0)

        return { vehicleSubtotal, optionsSubtotal, feesSubtotal, taxableAmount, consumptionTax, totalAmount }
      },

      generateEstimateNo: () => {
        const date = new Date()
        const dateStr = `${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, '0')}${String(date.getDate()).padStart(2, '0')}`
        const random = String(Math.floor(Math.random() * 1000)).padStart(3, '0')
        return `K-${dateStr}-${random}`
      },
    }),
    { name: 'estimate-storage' }
  )
)
