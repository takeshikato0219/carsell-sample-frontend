import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'

// オプショングループタイプ
export type OptionGroupType = 'option1' | 'option2' | 'option3' | 'option4'

// 親グループタイプ（A/B）
export type OptionParentGroupType = 'A' | 'B'

// オプショングループ設定
export interface OptionGroupConfig {
  id: OptionGroupType
  name: string
  description: string
  categories: string[]
  parentGroup: OptionParentGroupType  // 親グループ（A または B）
}

// 原価計算式タイプ
export type CostFormulaType = 'fixed' | 'percentage' | 'margin'

// 原価計算式設定
export interface CostFormula {
  id: string
  name: string
  type: CostFormulaType
  // type='fixed': value = 固定原価
  // type='percentage': value = 販売価格の何% (0-100)
  // type='margin': value = 粗利率% (0-100), 原価 = 販売価格 × (1 - 粗利率)
  value: number
  description: string
}

// 会社設定
export interface CompanySettings {
  name: string
  zipCode: string
  address: string
  phone: string
  fax: string
  email: string
  website: string
  logoUrl: string // Base64 or URL
  bankName: string
  bankBranch: string
  accountType: string
  accountNumber: string
  accountName: string
}

export interface SalesRep {
  id: string
  name: string
  color: string // タグの色
  loginId: string // ログインID
  password: string // パスワード
  isActive: boolean // アクティブかどうか
}

export interface VehicleModel {
  id: string
  name: string
}

export interface VehicleSupplier {
  id: string
  name: string
}

// 諸費用項目の型
export interface FeeItem {
  id: string
  name: string
  defaultAmount: number
  isRequired: boolean
  isTaxable: boolean // 10%課税対象かどうか
}

// 車両ベース別必須オプション設定
export interface RequiredOptionConfig {
  vehicleBase: string     // 車両ベース名（例: "ハイエース スーパーロング"）
  optionIds: string[]     // 必須オプションのIDリスト
}

// 見積書/契約書レイアウト設定
export interface DocumentLayoutSettings {
  logoPosition: 'left' | 'center' | 'right'  // ロゴの位置
  logoSize: number           // ロゴサイズ（px）
  titleMarginTop: number     // タイトル上マージン（mm）
  contentMarginTop: number   // 本文上マージン（mm）
  pageMarginX: number        // 左右マージン（mm）
  pageMarginY: number        // 上下マージン（mm）
  showSubTitle: boolean      // サブタイトル（キャンピングカー専門店）表示
  subTitle: string           // サブタイトル文言
}

interface SettingsState {
  salesReps: SalesRep[]
  vehicleModels: VehicleModel[]
  vehicleSuppliers: VehicleSupplier[]

  // 会社設定
  company: CompanySettings

  // オプショングループ設定
  optionGroups: OptionGroupConfig[]

  // 原価計算式設定
  costFormulas: CostFormula[]
  defaultCostFormula: string

  // 諸費用設定
  feeItems: FeeItem[]

  // 車両ベース別必須オプション設定
  requiredOptions: RequiredOptionConfig[]

  // 見積書/契約書レイアウト設定
  documentLayout: DocumentLayoutSettings

  addSalesRep: (name: string, color: string) => SalesRep
  updateSalesRep: (id: string, name: string, color: string) => void
  updateSalesRepCredentials: (id: string, loginId: string, password: string) => void
  toggleSalesRepActive: (id: string) => void
  removeSalesRep: (id: string) => void
  clearAllSalesReps: () => void
  addVehicleModel: (name: string) => boolean
  updateVehicleModel: (id: string, name: string) => void
  removeVehicleModel: (id: string) => void
  addVehicleSupplier: (name: string) => boolean
  removeVehicleSupplier: (id: string) => void
  authenticateSalesRep: (loginId: string, password: string) => SalesRep | null

  // 会社設定
  updateCompany: (settings: Partial<CompanySettings>) => void
  setCompanyLogo: (logoUrl: string) => void

  // オプショングループ設定
  updateOptionGroups: (groups: OptionGroupConfig[]) => void

  // 原価計算式設定
  updateCostFormulas: (formulas: CostFormula[]) => void
  setDefaultCostFormula: (formulaId: string) => void
  calculateCost: (sellingPrice: number, formulaId?: string) => number

  // 諸費用設定
  updateFeeItems: (items: FeeItem[]) => void
  addFeeItem: (item: Omit<FeeItem, 'id'>) => void
  removeFeeItem: (id: string) => void

  // 車両ベース別必須オプション設定
  updateRequiredOptions: (configs: RequiredOptionConfig[]) => void
  getRequiredOptionsForVehicle: (vehicleBase: string) => string[]

  // 見積書/契約書レイアウト設定
  updateDocumentLayout: (layout: Partial<DocumentLayoutSettings>) => void
}

// ランダムパスワード生成
function generatePassword(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789'
  let password = ''
  for (let i = 0; i < 8; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return password
}

// ログインID生成（名前のローマ字＋連番）
function generateLoginId(name: string, existingIds: string[]): string {
  // 簡易的なローマ字変換マップ
  const romajiMap: Record<string, string> = {
    '目黒': 'meguro',
    '野島': 'nojima',
    '田中': 'tanaka',
    '鈴木': 'suzuki',
    '佐藤': 'sato',
    '高橋': 'takahashi',
    '渡辺': 'watanabe',
    '伊藤': 'ito',
    '山本': 'yamamoto',
    '中村': 'nakamura',
    '小林': 'kobayashi',
    '加藤': 'kato',
    '吉田': 'yoshida',
    '山田': 'yamada',
    '斎藤': 'saito',
    '松本': 'matsumoto',
    '井上': 'inoue',
    '木村': 'kimura',
    '林': 'hayashi',
    '清水': 'shimizu',
  }

  let baseId = romajiMap[name] || name.toLowerCase().replace(/\s+/g, '')

  // IDが既に存在する場合は連番を付ける
  let loginId = baseId
  let counter = 1
  while (existingIds.includes(loginId)) {
    loginId = `${baseId}${counter}`
    counter++
  }

  return loginId
}

// 色の配列
const COLORS = [
  'bg-red-100 text-red-700',
  'bg-blue-100 text-blue-700',
  'bg-green-100 text-green-700',
  'bg-yellow-100 text-yellow-700',
  'bg-purple-100 text-purple-700',
  'bg-pink-100 text-pink-700',
  'bg-indigo-100 text-indigo-700',
  'bg-orange-100 text-orange-700',
  'bg-teal-100 text-teal-700',
  'bg-cyan-100 text-cyan-700',
]

// デフォルトの担当者リスト（8人）
const defaultSalesReps: SalesRep[] = [
  { id: '1', name: '目黒', color: 'bg-red-100 text-red-700', loginId: 'meguro', password: 'meguro123', isActive: true },
  { id: '2', name: '野島', color: 'bg-blue-100 text-blue-700', loginId: 'nojima', password: 'nojima123', isActive: true },
  { id: '3', name: '田中', color: 'bg-green-100 text-green-700', loginId: 'tanaka', password: 'tanaka123', isActive: true },
  { id: '4', name: '鈴木', color: 'bg-yellow-100 text-yellow-700', loginId: 'suzuki', password: 'suzuki123', isActive: true },
  { id: '5', name: '佐藤', color: 'bg-purple-100 text-purple-700', loginId: 'sato', password: 'sato123', isActive: true },
  { id: '6', name: '高橋', color: 'bg-pink-100 text-pink-700', loginId: 'takahashi', password: 'takahashi123', isActive: true },
  { id: '7', name: '渡辺', color: 'bg-indigo-100 text-indigo-700', loginId: 'watanabe', password: 'watanabe123', isActive: true },
  { id: '8', name: '伊藤', color: 'bg-orange-100 text-orange-700', loginId: 'ito', password: 'ito123', isActive: true },
]

// デフォルトの車種リスト
const defaultVehicleModels: VehicleModel[] = [
  { id: '1', name: 'トイファクトリー アルコーバ' },
  { id: '2', name: 'レクビィ ホビクル' },
  { id: '3', name: 'オートステージ STAGE21' },
  { id: '4', name: 'インディアナRV インディ727' },
  { id: '5', name: 'バンテック ジル520' },
  { id: '6', name: 'ナッツRV クレソン' },
  { id: '7', name: 'AtoZ アミティ' },
  { id: '8', name: 'キャンピングカー広島 ポップコン' },
  { id: '9', name: 'ホワイトハウス コンパス' },
  { id: '10', name: 'ケイワークス オーロラ' },
]

const MAX_VEHICLE_MODELS = 30
const MAX_VEHICLE_SUPPLIERS = 30

// デフォルトの会社設定
const defaultCompany: CompanySettings = {
  name: 'KATOMOTOR',
  zipCode: 'XXX-XXXX',
  address: '○○県○○市○○町X-X-X',
  phone: 'XX-XXXX-XXXX',
  fax: '',
  email: '',
  website: 'www.katomotor.com',
  logoUrl: '',
  bankName: '○○銀行',
  bankBranch: '○○支店',
  accountType: '普通',
  accountNumber: 'XXXXXXX',
  accountName: 'カ）カトモーター',
}

// デフォルトのオプショングループ設定
// グループA: オプション1, 2 / グループB: オプション3, 4
const defaultOptionGroups: OptionGroupConfig[] = [
  {
    id: 'option1',
    name: 'オプション1',
    description: 'メーカーオプション',
    categories: ['メーカーＯＰ'],
    parentGroup: 'A',
  },
  {
    id: 'option2',
    name: 'オプション2',
    description: 'ディーラーオプション',
    categories: ['ディーラーＯＰ', 'ボディー'],
    parentGroup: 'A',
  },
  {
    id: 'option3',
    name: 'オプション3',
    description: '外装・電装',
    categories: ['一般', '外装', '電装'],
    parentGroup: 'B',
  },
  {
    id: 'option4',
    name: 'オプション4',
    description: '装備・内装',
    categories: ['装備', 'オーディオ', '縫製', 'テーブル', '家具'],
    parentGroup: 'B',
  },
]

// デフォルトの原価計算式
const defaultCostFormulas: CostFormula[] = [
  {
    id: 'fixed',
    name: '固定原価',
    type: 'fixed',
    value: 0,
    description: '原価を直接設定します',
  },
  {
    id: 'percentage-70',
    name: '仕入率70%',
    type: 'percentage',
    value: 70,
    description: '販売価格の70%を原価とします',
  },
  {
    id: 'percentage-80',
    name: '仕入率80%',
    type: 'percentage',
    value: 80,
    description: '販売価格の80%を原価とします',
  },
  {
    id: 'margin-20',
    name: '粗利20%',
    type: 'margin',
    value: 20,
    description: '粗利率20%で原価を計算します',
  },
  {
    id: 'margin-30',
    name: '粗利30%',
    type: 'margin',
    value: 30,
    description: '粗利率30%で原価を計算します',
  },
]

// デフォルトの仕入れ先リスト
const defaultVehicleSuppliers: VehicleSupplier[] = [
  { id: '1', name: 'トイファクトリー' },
  { id: '2', name: 'レクビィ' },
  { id: '3', name: 'バンテック' },
  { id: '4', name: 'ナッツRV' },
  { id: '5', name: 'AtoZ' },
  { id: '6', name: 'ケイワークス' },
]

// デフォルトの諸費用設定
const defaultFeeItems: FeeItem[] = [
  { id: 'fee1', name: '登録代行費用', defaultAmount: 0, isRequired: false, isTaxable: true },
  { id: 'fee2', name: '車庫証明代行費用', defaultAmount: 0, isRequired: false, isTaxable: true },
  { id: 'fee3', name: '納車費用', defaultAmount: 0, isRequired: false, isTaxable: true },
  { id: 'fee4', name: '下取り諸費用', defaultAmount: 0, isRequired: false, isTaxable: true },
]

// デフォルトの見積書/契約書レイアウト設定
const defaultDocumentLayout: DocumentLayoutSettings = {
  logoPosition: 'left',
  logoSize: 48,
  titleMarginTop: 6,
  contentMarginTop: 6,
  pageMarginX: 20,
  pageMarginY: 15,
  showSubTitle: true,
  subTitle: 'キャンピングカー専門店',
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set, get) => ({
      salesReps: defaultSalesReps,
      vehicleModels: defaultVehicleModels,
      vehicleSuppliers: defaultVehicleSuppliers,
      company: defaultCompany,
      optionGroups: defaultOptionGroups,
      costFormulas: defaultCostFormulas,
      defaultCostFormula: 'fixed',
      feeItems: defaultFeeItems,
      requiredOptions: [],
      documentLayout: defaultDocumentLayout,

      addSalesRep: (name, color) => {
        const state = get()

        // 同じ名前の担当者が既に存在する場合は追加しない
        const existingRep = state.salesReps.find(rep => rep.name === name)
        if (existingRep) {
          return existingRep
        }

        const existingIds = state.salesReps.map(rep => rep.loginId)
        const loginId = generateLoginId(name, existingIds)
        const password = generatePassword()
        const id = Date.now().toString()

        const newRep: SalesRep = {
          id,
          name,
          color,
          loginId,
          password,
          isActive: true,
        }

        set((state) => ({
          salesReps: [...state.salesReps, newRep]
        }))

        return newRep
      },

      updateSalesRep: (id, name, color) => {
        set((state) => ({
          salesReps: state.salesReps.map(rep =>
            rep.id === id ? { ...rep, name, color } : rep
          )
        }))
      },

      updateSalesRepCredentials: (id, loginId, password) => {
        set((state) => ({
          salesReps: state.salesReps.map(rep =>
            rep.id === id ? { ...rep, loginId, password } : rep
          )
        }))
      },

      toggleSalesRepActive: (id) => {
        set((state) => ({
          salesReps: state.salesReps.map(rep =>
            rep.id === id ? { ...rep, isActive: !rep.isActive } : rep
          )
        }))
      },

      removeSalesRep: (id) => {
        set((state) => ({
          salesReps: state.salesReps.filter(rep => rep.id !== id)
        }))
      },

      clearAllSalesReps: () => {
        set({ salesReps: [] })
      },

      addVehicleModel: (name) => {
        const state = get()
        if (state.vehicleModels.length >= MAX_VEHICLE_MODELS) {
          return false
        }
        const id = Date.now().toString()
        set((state) => ({
          vehicleModels: [...state.vehicleModels, { id, name }]
        }))
        return true
      },

      updateVehicleModel: (id, name) => {
        set((state) => ({
          vehicleModels: state.vehicleModels.map(model =>
            model.id === id ? { ...model, name } : model
          )
        }))
      },

      removeVehicleModel: (id) => {
        set((state) => ({
          vehicleModels: state.vehicleModels.filter(model => model.id !== id)
        }))
      },

      addVehicleSupplier: (name) => {
        const state = get()
        if (state.vehicleSuppliers.length >= MAX_VEHICLE_SUPPLIERS) {
          return false
        }
        const id = Date.now().toString()
        set((state) => ({
          vehicleSuppliers: [...state.vehicleSuppliers, { id, name }]
        }))
        return true
      },

      removeVehicleSupplier: (id) => {
        set((state) => ({
          vehicleSuppliers: state.vehicleSuppliers.filter(supplier => supplier.id !== id)
        }))
      },

      authenticateSalesRep: (loginId, password) => {
        const state = get()
        const rep = state.salesReps.find(
          r => r.loginId === loginId && r.password === password && r.isActive
        )
        return rep || null
      },

      // 会社設定
      updateCompany: (settings) => {
        set((state) => ({
          company: { ...state.company, ...settings },
        }))
      },

      setCompanyLogo: (logoUrl) => {
        set((state) => ({
          company: { ...state.company, logoUrl },
        }))
      },

      // オプショングループ設定
      updateOptionGroups: (groups) => {
        set({ optionGroups: groups })
      },

      // 原価計算式設定
      updateCostFormulas: (formulas) => {
        set({ costFormulas: formulas })
      },

      setDefaultCostFormula: (formulaId) => {
        set({ defaultCostFormula: formulaId })
      },

      calculateCost: (sellingPrice, formulaId) => {
        const state = get()
        const formula = state.costFormulas.find(f => f.id === (formulaId || state.defaultCostFormula))

        if (!formula) return 0

        switch (formula.type) {
          case 'fixed':
            return formula.value
          case 'percentage':
            return Math.round(sellingPrice * (formula.value / 100))
          case 'margin':
            return Math.round(sellingPrice * (1 - formula.value / 100))
          default:
            return 0
        }
      },

      // 諸費用設定
      updateFeeItems: (items) => {
        set({ feeItems: items })
      },

      addFeeItem: (item) => {
        const id = `fee${Date.now()}`
        set((state) => ({
          feeItems: [...state.feeItems, { ...item, id }],
        }))
      },

      removeFeeItem: (id) => {
        set((state) => ({
          feeItems: state.feeItems.filter((item) => item.id !== id),
        }))
      },

      // 車両ベース別必須オプション設定
      updateRequiredOptions: (configs) => {
        set({ requiredOptions: configs })
      },

      getRequiredOptionsForVehicle: (vehicleBase) => {
        const state = get()
        const config = state.requiredOptions.find(c => c.vehicleBase === vehicleBase)
        return config?.optionIds || []
      },

      // 見積書/契約書レイアウト設定
      updateDocumentLayout: (layout) => {
        set((state) => ({
          documentLayout: { ...state.documentLayout, ...layout },
        }))
      },
    }),
    {
      name: 'settings-storage',
      storage: createJSONStorage(() => localStorage),
      merge: (persistedState, currentState) => {
        const persisted = persistedState as Partial<SettingsState>
        return {
          ...currentState,
          ...persisted,
          // feeItemsがundefinedまたは空の場合はデフォルト値を使用
          feeItems: persisted.feeItems && persisted.feeItems.length > 0
            ? persisted.feeItems
            : defaultFeeItems,
          // documentLayoutがundefinedの場合はデフォルト値を使用
          documentLayout: persisted.documentLayout
            ? { ...defaultDocumentLayout, ...persisted.documentLayout }
            : defaultDocumentLayout,
        }
      },
    }
  )
)

// 色の配列をエクスポート
export { COLORS }

// オプショングループごとのカテゴリを取得するヘルパー関数
export function getOptionGroupCategories(groupId: OptionGroupType): string[] {
  const groups = useSettingsStore.getState().optionGroups
  const group = groups.find(g => g.id === groupId)
  return group?.categories || []
}

// カテゴリからオプショングループを取得するヘルパー関数
export function getOptionGroupByCategory(category: string): OptionGroupType | null {
  const groups = useSettingsStore.getState().optionGroups
  for (const group of groups) {
    if (group.categories.includes(category)) {
      return group.id
    }
  }
  return null
}

// 親グループ（A/B）のオプショングループを取得するヘルパー関数
export function getOptionGroupsByParent(parentGroup: OptionParentGroupType): OptionGroupConfig[] {
  const groups = useSettingsStore.getState().optionGroups
  return groups.filter(g => g.parentGroup === parentGroup)
}

// 親グループ設定
export const PARENT_GROUP_CONFIG = {
  A: { name: 'オプションA', description: 'メーカー・ディーラーオプション' },
  B: { name: 'オプションB', description: 'その他オプション' },
}
