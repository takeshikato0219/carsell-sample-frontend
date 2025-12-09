import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'

export type ContactType = 'phone' | 'chat' | 'email' | 'meeting'

export interface ContactRecord {
  id: string
  customerId: string
  type: ContactType
  content: string
  duration?: number // 電話の場合の通話時間（秒）
  createdAt: string
  createdBy?: string
}

export interface ChatMessage {
  id: string
  customerId: string
  content: string
  isFromCustomer: boolean // true: 顧客から, false: 営業から
  createdAt: string
}

interface ContactState {
  contactRecords: ContactRecord[]
  chatMessages: ChatMessage[]

  // 連絡記録の操作
  addContactRecord: (record: Omit<ContactRecord, 'id' | 'createdAt'>) => void
  getContactRecordsByCustomer: (customerId: string) => ContactRecord[]

  // チャットメッセージの操作
  addChatMessage: (customerId: string, content: string, isFromCustomer: boolean) => void
  getChatMessagesByCustomer: (customerId: string) => ChatMessage[]

  // 最終連絡日時を取得
  getLastContactDate: (customerId: string) => Date | null
}

export const useContactStore = create<ContactState>()(
  persist(
    (set, get) => ({
      contactRecords: [],
      chatMessages: [],

      addContactRecord: (record) => {
        const newRecord: ContactRecord = {
          ...record,
          id: Date.now().toString(),
          createdAt: new Date().toISOString(),
        }
        set((state) => ({
          contactRecords: [newRecord, ...state.contactRecords]
        }))
      },

      getContactRecordsByCustomer: (customerId) => {
        return get().contactRecords
          .filter(r => r.customerId === customerId)
          .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      },

      addChatMessage: (customerId, content, isFromCustomer) => {
        const newMessage: ChatMessage = {
          id: Date.now().toString(),
          customerId,
          content,
          isFromCustomer,
          createdAt: new Date().toISOString(),
        }
        set((state) => ({
          chatMessages: [...state.chatMessages, newMessage]
        }))

        // チャットメッセージも連絡記録として追加
        if (!isFromCustomer) {
          get().addContactRecord({
            customerId,
            type: 'chat',
            content,
          })
        }
      },

      getChatMessagesByCustomer: (customerId) => {
        return get().chatMessages
          .filter(m => m.customerId === customerId)
          .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
      },

      getLastContactDate: (customerId) => {
        const records = get().contactRecords.filter(r => r.customerId === customerId)
        if (records.length === 0) return null
        const sorted = records.sort((a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        )
        return new Date(sorted[0].createdAt)
      },
    }),
    {
      name: 'contact-storage',
      storage: createJSONStorage(() => localStorage),
    }
  )
)
