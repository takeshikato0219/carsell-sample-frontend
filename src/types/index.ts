// User types
export enum UserRole {
  ADMIN = 'admin',
  MANAGER = 'manager',
  SALES = 'sales',
}

export interface User {
  id: string
  email: string
  name: string
  role: UserRole
  avatarUrl?: string
  isActive: boolean
  createdAt: string
  updatedAt: string
}

// Customer status (ランク分け)
export enum CustomerStatus {
  NEW = 'new',                    // 新規
  OWNER = 'owner',                // オーナー（成約済み）
  AWAITING_DELIVERY = 'awaiting_delivery', // 納車待ち
  RANK_A = 'rank_a',              // ランクA（カンバン表示対象）
  RANK_B = 'rank_b',              // ランクB（カンバン表示対象）
  RANK_C = 'rank_c',              // ランクC
  RANK_N = 'rank_n',              // ランクN（見込み薄）
  CONTRACT = 'contract',          // 契約
}

// Customer types
export interface Customer {
  id: string
  customerNumber: string
  name: string
  nameKana?: string
  email?: string
  phone?: string
  mobile?: string
  postalCode?: string
  address?: string
  address2?: string              // 住所２
  region?: string                // 地区（北海道、関東、九州など）
  companyName?: string
  department?: string
  position?: string
  birthdate?: string
  notes?: string
  source?: string                // どこの展示会でファーストコンタクトか
  status?: CustomerStatus        // カンバンボード用ステータス
  assignedSalesRepId?: string
  assignedSalesRepName?: string  // 担当者名（設定で管理）
  assignedSalesRepColor?: string // 担当者の色
  assignedSalesRep?: User
  createdBy?: string
  createdAt: string
  updatedAt: string
  lastContactedAt?: string  // 最終連絡日
  contractDate?: string     // 契約日

  // アンケート項目
  age?: number
  occupation?: string
  preferredContactDay?: string
  preferredContactTime?: string
  familyMembers?: number
  passengers?: number
  hasPets?: boolean
  budget?: string
  interestedCars?: string[]
  desiredVehicleType?: string[]
  purchaseTiming?: string
  howDidYouKnow?: string[]
  surveyImageUrl?: string
}

// アンケートスキャン結果
export interface SurveyData {
  // 基本情報
  name?: string
  nameKana?: string
  age?: number
  occupation?: string
  postalCode?: string
  address?: string
  phone?: string
  email?: string

  // 希望情報
  preferredContactDay?: string
  preferredContactTime?: string
  familyMembers?: number
  passengers?: number
  hasPets?: boolean
  budget?: string
  interestedCars?: string[]
  desiredVehicleType?: string[]
  purchaseTiming?: string
  howDidYouKnow?: string[]
  feedback?: string

  // メタ情報
  imageUrl?: string
  scannedAt?: string
  confidence?: number
}

// Deal types
export enum DealStage {
  INITIAL_CONTACT = 'initial_contact',
  HEARING = 'hearing',
  QUOTE_SENT = 'quote_sent',
  NEGOTIATION = 'negotiation',
  CONTRACT = 'contract',
  AWAITING_DELIVERY = 'awaiting_delivery',
  DELIVERED = 'delivered',
  LOST = 'lost',
}

export enum DealPriority {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  URGENT = 'urgent',
}

export interface Deal {
  id: string
  customerId: string
  customer?: Customer
  title: string
  description?: string
  stage: DealStage
  priority: DealPriority
  estimatedAmount?: number
  probability?: number
  expectedCloseDate?: string
  lostReason?: string
  assignedToId?: string
  assignedTo?: User
  createdBy?: string
  createdAt: string
  updatedAt: string
  closedAt?: string
}

// Activity types (活動履歴)
export enum ActivityType {
  NOTE = 'note',           // メモ
  CALL = 'call',           // 電話
  EMAIL = 'email',         // メール
  MEETING = 'meeting',     // 面談
  STATUS_CHANGE = 'status_change', // ステータス変更
}

export interface Activity {
  id: string
  customerId: string
  type: ActivityType
  title?: string
  content: string
  callDuration?: number     // 電話の場合の通話時間（秒）
  emailSubject?: string     // メールの場合の件名
  previousStatus?: CustomerStatus
  newStatus?: CustomerStatus
  createdBy?: string
  createdByName?: string
  createdAt: string
  updatedAt: string
}

// Contact types
export interface Contact {
  id: string
  customerId: string
  contactType: string
  subject?: string
  content?: string
  audioFileUrl?: string
  memoFileUrl?: string
  nextAction?: string
  nextContactDate?: string
  contactedAt: string
  createdBy?: string
  createdAt: string
  updatedAt: string
}

// Quote types
export enum QuoteStatus {
  DRAFT = 'draft',
  SENT = 'sent',
  APPROVED = 'approved',
  REJECTED = 'rejected',
}

export interface Quote {
  id: string
  customerId: string
  quoteNumber: string
  title?: string
  vehicleModel?: string
  vehicleGrade?: string
  vehicleColor?: string
  totalAmount?: number
  discountAmount?: number
  finalAmount?: number
  excelFileUrl?: string
  pdfFileUrl?: string
  status: QuoteStatus
  validUntil?: string
  sentAt?: string
  approvedAt?: string
  createdBy?: string
  createdAt: string
  updatedAt: string
}

// Auth types
export interface LoginRequest {
  email: string
  password: string
}

export interface LoginResponse {
  access_token: string
  user: User
}

export interface RegisterRequest {
  email: string
  password: string
  name: string
  role?: string
}

// API response types
export interface PaginatedResponse<T> {
  data: T[]
  total: number
  page: number
  pageSize: number
}

// 営業目標関連の型
export interface SalesTarget {
  id: string
  salesRepName: string           // 担当者名
  year: number                   // 年
  month: number                  // 月
  targetCount: number            // 契約目標台数
  createdAt: string
  updatedAt: string
}

// 納車方法
export enum DeliveryMethod {
  DELIVERY = 'delivery',         // 納車（お届け）
  PICKUP = 'pickup',             // 引き取り（来店）
}

// 残金支払方法
export enum PaymentMethod {
  CASH = 'cash',                 // 残金現金
  LOAN = 'loan',                 // 残金ローン
}

// 契約実績（納車待ちに変わったときに記録）
export interface Contract {
  id: string
  customerId: string
  customerName: string
  salesRepName: string           // 担当者名
  contractDate: string           // 契約日
  saleAmount: number             // 売上金額
  profit: number                 // 利益
  vehicleModel?: string          // 車種
  isDelivered: boolean           // 納車済みかどうか
  deliveredDate?: string         // 納車日
  expectedDeliveryDate?: string  // 納車予定日
  inspectionDate?: string        // 予備検（車検）予定日
  desiredPlateNumber?: string    // 希望ナンバー
  deliveryMethod?: DeliveryMethod // 納車方法（納車 or 引き取り）
  desiredDeliveryDate?: string   // 希望納車日
  inspectionCompleted?: boolean  // 予備検完了かどうか
  plateNumberRegistered?: boolean // 希望ナンバー登録済みかどうか
  registrationPrefecture?: string // 登録県（納車する県）

  // 入金関連（3回まで）
  payment1Date?: string          // 1回目入金予定日
  payment1Amount?: string        // 1回目入金額（100万, 200万など）
  payment1Received?: boolean     // 1回目入金済み
  payment1ReceivedDate?: string  // 1回目入金日

  payment2Date?: string          // 2回目入金予定日
  payment2Amount?: string        // 2回目入金額
  payment2Received?: boolean     // 2回目入金済み
  payment2ReceivedDate?: string  // 2回目入金日

  payment3Date?: string          // 3回目入金予定日
  payment3Amount?: string        // 3回目入金額
  payment3Received?: boolean     // 3回目入金済み
  payment3ReceivedDate?: string  // 3回目入金日

  remainingPaymentMethod?: PaymentMethod // 残金支払方法（現金 or ローン）

  // 見積もり連携
  estimateId?: string            // 契約元の見積もりID
  hasFurnitureChange?: boolean   // 家具変更有無

  // 車両仕入れ関連
  vehicleSupplier?: string       // 車両仕入れ先
  supplierBilled?: boolean       // 仕入れ先への請求済み
  supplierBilledDate?: string    // 請求日

  // 旧フィールド（互換性のため残す）
  expectedPaymentDate?: string   // 入金予定日（旧）
  paymentReceived?: boolean      // 入金済みかどうか（旧）
  paymentReceivedDate?: string   // 入金日（旧）

  notes?: string                 // 備考
  isMQ?: boolean                 // MQ（見込み顧客からの契約）かどうか

  // 契約書追加フィールド（見積もりにないもの）
  bodyColor?: string             // ボディー色
  passengerCapacity?: number     // 乗車定員
  sleepingCapacity?: number      // 就寝定員
  seatFabric?: string            // 椅子生地
  curtainFabric?: string         // カーテン生地
  hasTradeIn?: boolean           // 下取り車有無
  tradeInVehicle?: string        // 下取り車情報（車種・年式など）
  tradeInHasRepairHistory?: boolean // 下取り車修復歴有無
  deliveryPeriod?: string        // 納車時期
  meetingNotes?: string          // 打合せ事項

  createdAt: string
  updatedAt: string
}
