import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'

// メッセージの型
export interface ChatMessage {
  id: string
  channelId: string
  senderId: string
  senderName: string
  senderColor: string
  content: string
  createdAt: string
  reactions?: { emoji: string; users: string[] }[]
}

// チャンネルの型
export interface Channel {
  id: string
  name: string
  type: 'public' | 'direct'
  members?: string[] // DMの場合のメンバー
  unreadCount?: number
  lastMessageAt?: string
}

interface ChatState {
  channels: Channel[]
  messages: ChatMessage[]

  // チャンネル操作
  addChannel: (name: string, type: 'public' | 'direct', members?: string[]) => Channel
  deleteChannel: (id: string) => void
  markChannelAsRead: (channelId: string) => void

  // メッセージ操作
  addMessage: (channelId: string, senderId: string, senderName: string, senderColor: string, content: string) => ChatMessage
  deleteMessage: (id: string) => void
  addReaction: (messageId: string, emoji: string, userName: string) => void
  removeReaction: (messageId: string, emoji: string, userName: string) => void

  // 取得
  getChannelMessages: (channelId: string) => ChatMessage[]
  getUnreadCount: (channelId: string) => number
}

// デフォルトチャンネル
const defaultChannels: Channel[] = [
  { id: '1', name: '全体連絡', type: 'public' },
  { id: '2', name: '営業チーム', type: 'public' },
  { id: '3', name: '事務連絡', type: 'public' },
  { id: '4', name: '雑談', type: 'public' },
]

// サンプルメッセージ
const defaultMessages: ChatMessage[] = [
  {
    id: '1',
    channelId: '1',
    senderId: '1',
    senderName: '目黒',
    senderColor: 'bg-red-100 text-red-700',
    content: 'おはようございます！今日も頑張りましょう！',
    createdAt: '2025-12-03T09:00:00Z',
    reactions: [{ emoji: '👍', users: ['野島', '田中'] }],
  },
  {
    id: '2',
    channelId: '1',
    senderId: '2',
    senderName: '野島',
    senderColor: 'bg-blue-100 text-blue-700',
    content: 'おはようございます！今日は来店予定が3件あります。',
    createdAt: '2025-12-03T09:05:00Z',
  },
  {
    id: '3',
    channelId: '1',
    senderId: '3',
    senderName: '田中',
    senderColor: 'bg-green-100 text-green-700',
    content: '了解です！私は午後から商談があります。',
    createdAt: '2025-12-03T09:10:00Z',
  },
  {
    id: '4',
    channelId: '1',
    senderId: '1',
    senderName: '目黒',
    senderColor: 'bg-red-100 text-red-700',
    content: '明日の展示会の準備お願いします！\n場所：メイン展示場\n時間：10:00〜',
    createdAt: '2025-12-03T10:00:00Z',
  },
  {
    id: '5',
    channelId: '2',
    senderId: '2',
    senderName: '野島',
    senderColor: 'bg-blue-100 text-blue-700',
    content: '今週の目標達成率はどうなってますか？',
    createdAt: '2025-12-03T11:00:00Z',
  },
  {
    id: '6',
    channelId: '2',
    senderId: '1',
    senderName: '目黒',
    senderColor: 'bg-red-100 text-red-700',
    content: '現在70%です。週末までにもう少し伸ばしたいですね。',
    createdAt: '2025-12-03T11:05:00Z',
  },
  {
    id: '7',
    channelId: '3',
    senderId: '4',
    senderName: '鈴木',
    senderColor: 'bg-yellow-100 text-yellow-700',
    content: '今月の経費精算の締め切りは12/10です。お忘れなく！',
    createdAt: '2025-12-03T14:00:00Z',
  },
  {
    id: '8',
    channelId: '4',
    senderId: '3',
    senderName: '田中',
    senderColor: 'bg-green-100 text-green-700',
    content: '今日のランチ、新しくできたラーメン屋行きませんか？',
    createdAt: '2025-12-03T11:30:00Z',
  },
  {
    id: '9',
    channelId: '4',
    senderId: '2',
    senderName: '野島',
    senderColor: 'bg-blue-100 text-blue-700',
    content: '行きます！12時でいいですか？',
    createdAt: '2025-12-03T11:32:00Z',
    reactions: [{ emoji: '🍜', users: ['田中'] }],
  },
]

export const useChatStore = create<ChatState>()(
  persist(
    (set, get) => ({
      channels: defaultChannels,
      messages: defaultMessages,

      addChannel: (name, type, members) => {
        const id = `channel-${Date.now()}`
        const newChannel: Channel = {
          id,
          name,
          type,
          members,
        }
        set((state) => ({
          channels: [...state.channels, newChannel],
        }))
        return newChannel
      },

      deleteChannel: (id) => {
        set((state) => ({
          channels: state.channels.filter((c) => c.id !== id),
          messages: state.messages.filter((m) => m.channelId !== id),
        }))
      },

      markChannelAsRead: (channelId) => {
        set((state) => ({
          channels: state.channels.map((c) =>
            c.id === channelId ? { ...c, unreadCount: 0 } : c
          ),
        }))
      },

      addMessage: (channelId, senderId, senderName, senderColor, content) => {
        const id = `msg-${Date.now()}`
        const newMessage: ChatMessage = {
          id,
          channelId,
          senderId,
          senderName,
          senderColor,
          content,
          createdAt: new Date().toISOString(),
        }
        set((state) => ({
          messages: [...state.messages, newMessage],
          channels: state.channels.map((c) =>
            c.id === channelId
              ? { ...c, lastMessageAt: newMessage.createdAt }
              : c
          ),
        }))
        return newMessage
      },

      deleteMessage: (id) => {
        set((state) => ({
          messages: state.messages.filter((m) => m.id !== id),
        }))
      },

      addReaction: (messageId, emoji, userName) => {
        set((state) => ({
          messages: state.messages.map((m) => {
            if (m.id !== messageId) return m
            const reactions = m.reactions || []
            const existingReaction = reactions.find((r) => r.emoji === emoji)
            if (existingReaction) {
              if (!existingReaction.users.includes(userName)) {
                existingReaction.users.push(userName)
              }
              return { ...m, reactions: [...reactions] }
            } else {
              return { ...m, reactions: [...reactions, { emoji, users: [userName] }] }
            }
          }),
        }))
      },

      removeReaction: (messageId, emoji, userName) => {
        set((state) => ({
          messages: state.messages.map((m) => {
            if (m.id !== messageId) return m
            const reactions = (m.reactions || []).map((r) => {
              if (r.emoji === emoji) {
                return { ...r, users: r.users.filter((u) => u !== userName) }
              }
              return r
            }).filter((r) => r.users.length > 0)
            return { ...m, reactions }
          }),
        }))
      },

      getChannelMessages: (channelId) => {
        return get().messages.filter((m) => m.channelId === channelId)
      },

      getUnreadCount: (channelId) => {
        const channel = get().channels.find((c) => c.id === channelId)
        return channel?.unreadCount || 0
      },
    }),
    {
      name: 'chat-storage',
      storage: createJSONStorage(() => localStorage),
    }
  )
)
