import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'

// 展示車のステータス
export type VehicleStatus = 'on_display' | 'preparing' | 'maintenance' | 'sold'

// 展示車の型
export interface ShowroomVehicle {
  id: string
  name: string // 車名
  model: string // 型式
  year: number // 年式
  color: string // 色
  price: number // 価格
  location: string // 展示場所
  status: VehicleStatus
  mileage?: number // 走行距離
  notes?: string // メモ
  lastUpdated: string
}

// ストアの型
interface ShowroomStore {
  newVehicles: ShowroomVehicle[]
  usedVehicles: ShowroomVehicle[]
  addNewVehicle: (vehicle: Omit<ShowroomVehicle, 'id' | 'lastUpdated'>) => void
  addUsedVehicle: (vehicle: Omit<ShowroomVehicle, 'id' | 'lastUpdated'>) => void
  updateNewVehicleStatus: (id: string, status: VehicleStatus) => void
  updateUsedVehicleStatus: (id: string, status: VehicleStatus) => void
  removeNewVehicle: (id: string) => void
  removeUsedVehicle: (id: string) => void
}

// サンプル新車データ
const sampleNewVehicles: ShowroomVehicle[] = [
  {
    id: 'new-1',
    name: 'バンテック ジル520',
    model: 'ZIL520',
    year: 2024,
    color: 'ホワイト',
    price: 8500000,
    location: '新車展示場 A-1',
    status: 'on_display',
    lastUpdated: '2025-12-01T10:00:00Z',
  },
  {
    id: 'new-2',
    name: 'ナッツRV クレソン',
    model: 'CRESSON',
    year: 2024,
    color: 'シルバー',
    price: 7200000,
    location: '新車展示場 A-2',
    status: 'on_display',
    lastUpdated: '2025-12-02T14:00:00Z',
  },
  {
    id: 'new-3',
    name: 'トイファクトリー バーデン',
    model: 'BADEN',
    year: 2025,
    color: 'パールホワイト',
    price: 9800000,
    location: '納車待ち',
    status: 'preparing',
    notes: '1月入荷予定',
    lastUpdated: '2025-12-03T09:00:00Z',
  },
  {
    id: 'new-4',
    name: 'レクビィ ホビクル',
    model: 'HOBICLE',
    year: 2024,
    color: 'ブルー',
    price: 5500000,
    location: '整備工場',
    status: 'maintenance',
    notes: 'オプション取り付け中',
    lastUpdated: '2025-12-02T16:00:00Z',
  },
  {
    id: 'new-5',
    name: 'AtoZ アミティ',
    model: 'AMITY',
    year: 2024,
    color: 'アイボリー',
    price: 6800000,
    location: '新車展示場 B-1',
    status: 'sold',
    notes: '山田様ご成約',
    lastUpdated: '2025-12-01T11:00:00Z',
  },
]

// サンプル中古車データ
const sampleUsedVehicles: ShowroomVehicle[] = [
  {
    id: 'used-1',
    name: 'バンテック ジル480',
    model: 'ZIL480',
    year: 2020,
    color: 'ホワイト',
    price: 5800000,
    location: '中古車展示場 C-1',
    status: 'on_display',
    mileage: 25000,
    lastUpdated: '2025-12-01T10:00:00Z',
  },
  {
    id: 'used-2',
    name: 'ナッツRV クレア',
    model: 'CREA',
    year: 2019,
    color: 'シルバー',
    price: 4500000,
    location: '中古車展示場 C-2',
    status: 'on_display',
    mileage: 35000,
    lastUpdated: '2025-12-02T14:00:00Z',
  },
  {
    id: 'used-3',
    name: 'キャンピングカー広島 ポップコン',
    model: 'POPCON',
    year: 2018,
    color: 'ベージュ',
    price: 3200000,
    location: '整備工場',
    status: 'preparing',
    mileage: 48000,
    notes: '内装クリーニング中',
    lastUpdated: '2025-12-03T09:00:00Z',
  },
  {
    id: 'used-4',
    name: 'ケイワークス オーロラ',
    model: 'AURORA',
    year: 2021,
    color: 'ブラック',
    price: 6200000,
    location: '整備工場',
    status: 'maintenance',
    mileage: 18000,
    notes: 'エアコン修理中',
    lastUpdated: '2025-12-02T16:00:00Z',
  },
  {
    id: 'used-5',
    name: 'トイファクトリー ランドホーム',
    model: 'LANDHOME',
    year: 2017,
    color: 'グレー',
    price: 2800000,
    location: '中古車展示場 D-1',
    status: 'sold',
    mileage: 65000,
    notes: '鈴木様ご成約',
    lastUpdated: '2025-12-01T11:00:00Z',
  },
  {
    id: 'used-6',
    name: 'ホワイトハウス コンパス',
    model: 'COMPASS',
    year: 2022,
    color: 'ホワイト',
    price: 4800000,
    location: '中古車展示場 C-3',
    status: 'on_display',
    mileage: 12000,
    lastUpdated: '2025-11-30T15:00:00Z',
  },
]

export const useShowroomStore = create<ShowroomStore>()(
  persist(
    (set) => ({
      newVehicles: sampleNewVehicles,
      usedVehicles: sampleUsedVehicles,

      addNewVehicle: (vehicleData) => {
        const vehicle: ShowroomVehicle = {
          ...vehicleData,
          id: `new-${Date.now()}`,
          lastUpdated: new Date().toISOString(),
        }
        set((state) => ({
          newVehicles: [...state.newVehicles, vehicle],
        }))
      },

      addUsedVehicle: (vehicleData) => {
        const vehicle: ShowroomVehicle = {
          ...vehicleData,
          id: `used-${Date.now()}`,
          lastUpdated: new Date().toISOString(),
        }
        set((state) => ({
          usedVehicles: [...state.usedVehicles, vehicle],
        }))
      },

      updateNewVehicleStatus: (id, status) => {
        set((state) => ({
          newVehicles: state.newVehicles.map(v =>
            v.id === id ? { ...v, status, lastUpdated: new Date().toISOString() } : v
          ),
        }))
      },

      updateUsedVehicleStatus: (id, status) => {
        set((state) => ({
          usedVehicles: state.usedVehicles.map(v =>
            v.id === id ? { ...v, status, lastUpdated: new Date().toISOString() } : v
          ),
        }))
      },

      removeNewVehicle: (id) => {
        set((state) => ({
          newVehicles: state.newVehicles.filter(v => v.id !== id),
        }))
      },

      removeUsedVehicle: (id) => {
        set((state) => ({
          usedVehicles: state.usedVehicles.filter(v => v.id !== id),
        }))
      },
    }),
    {
      name: 'showroom-storage',
      storage: createJSONStorage(() => localStorage),
    }
  )
)
