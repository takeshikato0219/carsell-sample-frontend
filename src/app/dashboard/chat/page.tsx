'use client'

import { useState, useRef, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Send, Users, Hash, Plus, MoreHorizontal, Search, Smile, X, Trash2 } from 'lucide-react'
import { useSettingsStore } from '@/stores/settings-store'
import { useAuthStore } from '@/stores/auth-store'
import { useChatStore, Channel } from '@/stores/chat-store'

// 絵文字リスト
const emojiList = ['👍', '❤️', '😂', '😮', '😢', '👏', '🎉', '🔥', '✅', '👀']

export default function ChatPage() {
  const { channels, messages, addChannel, addMessage, deleteMessage, addReaction, removeReaction, getChannelMessages, markChannelAsRead } = useChatStore()
  const { salesReps } = useSettingsStore()
  const { user } = useAuthStore()

  const [selectedChannel, setSelectedChannel] = useState<Channel | null>(null)
  const [newMessage, setNewMessage] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [showNewChannelModal, setShowNewChannelModal] = useState(false)
  const [showNewDMModal, setShowNewDMModal] = useState(false)
  const [newChannelName, setNewChannelName] = useState('')
  const [showEmojiPicker, setShowEmojiPicker] = useState<string | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // 初期選択
  useEffect(() => {
    if (!selectedChannel && channels.length > 0) {
      setSelectedChannel(channels[0])
    }
  }, [channels, selectedChannel])

  // 選択したチャンネルのメッセージ
  const channelMessages = selectedChannel ? getChannelMessages(selectedChannel.id) : []

  // スクロール
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [channelMessages])

  // チャンネル選択時に既読にする
  useEffect(() => {
    if (selectedChannel) {
      markChannelAsRead(selectedChannel.id)
    }
  }, [selectedChannel, markChannelAsRead])

  // ログインユーザー情報
  const currentUserName = user?.name || salesReps[0]?.name || 'ユーザー'
  const currentUserColor = salesReps.find(r => r.name === currentUserName)?.color || 'bg-gray-100 text-gray-700'
  const currentUserId = user?.id || '1'

  // メッセージ送信
  const handleSendMessage = () => {
    if (!newMessage.trim() || !selectedChannel) return

    addMessage(
      selectedChannel.id,
      currentUserId,
      currentUserName,
      currentUserColor,
      newMessage
    )
    setNewMessage('')
  }

  // チャンネル作成
  const handleCreateChannel = () => {
    if (!newChannelName.trim()) return
    const newChannel = addChannel(newChannelName, 'public')
    setSelectedChannel(newChannel)
    setNewChannelName('')
    setShowNewChannelModal(false)
  }

  // DM作成
  const handleCreateDM = (repName: string) => {
    // 既存のDMチャンネルを探す
    const existingDM = channels.find(
      c => c.type === 'direct' && c.members?.includes(repName)
    )
    if (existingDM) {
      setSelectedChannel(existingDM)
    } else {
      const newDM = addChannel(repName, 'direct', [currentUserName, repName])
      setSelectedChannel(newDM)
    }
    setShowNewDMModal(false)
  }

  // リアクション追加/削除
  const handleReaction = (messageId: string, emoji: string) => {
    const message = messages.find(m => m.id === messageId)
    const existingReaction = message?.reactions?.find(r => r.emoji === emoji)

    if (existingReaction?.users.includes(currentUserName)) {
      removeReaction(messageId, emoji, currentUserName)
    } else {
      addReaction(messageId, emoji, currentUserName)
    }
    setShowEmojiPicker(null)
  }

  // メッセージ削除
  const handleDeleteMessage = (messageId: string) => {
    if (confirm('このメッセージを削除しますか？')) {
      deleteMessage(messageId)
    }
  }

  // 時間フォーマット
  const formatTime = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' })
  }

  // 日付フォーマット
  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    const today = new Date()
    if (date.toDateString() === today.toDateString()) return '今日'
    const yesterday = new Date(today)
    yesterday.setDate(yesterday.getDate() - 1)
    if (date.toDateString() === yesterday.toDateString()) return '昨日'
    return date.toLocaleDateString('ja-JP', { month: 'long', day: 'numeric' })
  }

  // チャンネル検索フィルタ
  const filteredChannels = channels.filter(c =>
    c.name.toLowerCase().includes(searchQuery.toLowerCase())
  )

  return (
    <div className="h-full flex">
      {/* サイドバー - チャンネル一覧 */}
      <div className="w-64 bg-slate-600 flex flex-col">
        {/* ヘッダー */}
        <div className="p-4 border-b border-slate-500">
          <h2 className="text-white font-bold text-lg">社内チャット</h2>
        </div>

        {/* 検索 */}
        <div className="p-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-300" />
            <input
              type="text"
              placeholder="検索..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-500 text-white pl-9 pr-3 py-2 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder:text-slate-300"
            />
          </div>
        </div>

        {/* チャンネル一覧 */}
        <div className="flex-1 overflow-y-auto px-2">
          <div className="mb-4">
            <div className="flex items-center justify-between px-2 py-1">
              <span className="text-xs font-medium text-slate-300 uppercase">チャンネル</span>
              <button
                className="text-slate-300 hover:text-white"
                onClick={() => setShowNewChannelModal(true)}
              >
                <Plus className="h-4 w-4" />
              </button>
            </div>
            {filteredChannels.filter(c => c.type === 'public').map(channel => (
              <button
                key={channel.id}
                onClick={() => setSelectedChannel(channel)}
                className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-sm transition-colors ${
                  selectedChannel?.id === channel.id
                    ? 'bg-blue-500 text-white'
                    : 'text-slate-200 hover:bg-slate-500 hover:text-white'
                }`}
              >
                <Hash className="h-4 w-4" />
                <span className="flex-1 text-left truncate">{channel.name}</span>
                {channel.unreadCount && channel.unreadCount > 0 && (
                  <span className="bg-red-500 text-white text-xs px-1.5 py-0.5 rounded-full">
                    {channel.unreadCount}
                  </span>
                )}
              </button>
            ))}
          </div>

          <div className="mb-4">
            <div className="flex items-center justify-between px-2 py-1">
              <span className="text-xs font-medium text-slate-300 uppercase">ダイレクトメッセージ</span>
              <button
                className="text-slate-300 hover:text-white"
                onClick={() => setShowNewDMModal(true)}
              >
                <Plus className="h-4 w-4" />
              </button>
            </div>
            {filteredChannels.filter(c => c.type === 'direct').map(channel => (
              <button
                key={channel.id}
                onClick={() => setSelectedChannel(channel)}
                className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-sm transition-colors ${
                  selectedChannel?.id === channel.id
                    ? 'bg-blue-500 text-white'
                    : 'text-slate-200 hover:bg-slate-500 hover:text-white'
                }`}
              >
                <div className="w-2 h-2 rounded-full bg-green-400"></div>
                <span className="truncate">{channel.name}</span>
              </button>
            ))}
            {salesReps.filter(rep => !channels.some(c => c.type === 'direct' && c.name === rep.name)).slice(0, 5).map(rep => (
              <button
                key={rep.id}
                onClick={() => handleCreateDM(rep.name)}
                className="w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-sm text-slate-200 hover:bg-slate-500 hover:text-white transition-colors"
              >
                <div className="w-2 h-2 rounded-full bg-slate-400"></div>
                <span className="truncate">{rep.name}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* メインエリア */}
      <div className="flex-1 flex flex-col bg-white">
        {/* チャンネルヘッダー */}
        <div className="flex items-center justify-between px-6 py-3 border-b">
          <div className="flex items-center gap-2">
            {selectedChannel?.type === 'public' ? (
              <Hash className="h-5 w-5 text-gray-400" />
            ) : (
              <div className="w-2 h-2 rounded-full bg-green-500"></div>
            )}
            <h2 className="font-semibold text-gray-900">{selectedChannel?.name || 'チャンネルを選択'}</h2>
          </div>
          <div className="flex items-center gap-2">
            <button className="p-2 hover:bg-gray-100 rounded-md text-gray-500">
              <Users className="h-5 w-5" />
            </button>
            <button className="p-2 hover:bg-gray-100 rounded-md text-gray-500">
              <MoreHorizontal className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* メッセージ一覧 */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          {!selectedChannel ? (
            <div className="flex flex-col items-center justify-center h-full text-gray-500">
              <Hash className="h-12 w-12 mb-4 text-gray-300" />
              <p className="text-lg font-medium">チャンネルを選択してください</p>
            </div>
          ) : channelMessages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-gray-500">
              <Hash className="h-12 w-12 mb-4 text-gray-300" />
              <p className="text-lg font-medium">#{selectedChannel.name}</p>
              <p className="text-sm">このチャンネルの始まりです</p>
            </div>
          ) : (
            <div className="space-y-4">
              {channelMessages.map((message, index) => {
                const showDate = index === 0 ||
                  formatDate(message.createdAt) !== formatDate(channelMessages[index - 1].createdAt)
                const isOwnMessage = message.senderName === currentUserName

                return (
                  <div key={message.id}>
                    {showDate && (
                      <div className="flex items-center gap-4 my-6">
                        <div className="flex-1 border-t border-gray-200"></div>
                        <span className="text-xs text-gray-500 font-medium">{formatDate(message.createdAt)}</span>
                        <div className="flex-1 border-t border-gray-200"></div>
                      </div>
                    )}
                    <div className="flex gap-3 group hover:bg-gray-50 -mx-2 px-2 py-1 rounded-md relative">
                      <div className={`w-9 h-9 rounded-md flex items-center justify-center text-sm font-medium flex-shrink-0 ${message.senderColor}`}>
                        {message.senderName.charAt(0)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-baseline gap-2">
                          <span className="font-medium text-gray-900">{message.senderName}</span>
                          <span className="text-xs text-gray-400">{formatTime(message.createdAt)}</span>
                        </div>
                        <p className="text-gray-700 whitespace-pre-wrap">{message.content}</p>
                        {message.reactions && message.reactions.length > 0 && (
                          <div className="flex gap-1 mt-1 flex-wrap">
                            {message.reactions.map((reaction, i) => (
                              <button
                                key={i}
                                onClick={() => handleReaction(message.id, reaction.emoji)}
                                className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-xs transition-colors ${
                                  reaction.users.includes(currentUserName)
                                    ? 'bg-blue-100 border border-blue-300'
                                    : 'bg-gray-100 hover:bg-gray-200'
                                }`}
                              >
                                <span>{reaction.emoji}</span>
                                <span className="text-gray-600">{reaction.users.length}</span>
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                      {/* アクションボタン */}
                      <div className="absolute right-0 top-0 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1 bg-white shadow-sm rounded-md border p-1">
                        <button
                          onClick={() => setShowEmojiPicker(showEmojiPicker === message.id ? null : message.id)}
                          className="p-1 hover:bg-gray-100 rounded text-gray-500"
                        >
                          <Smile className="h-4 w-4" />
                        </button>
                        {isOwnMessage && (
                          <button
                            onClick={() => handleDeleteMessage(message.id)}
                            className="p-1 hover:bg-gray-100 rounded text-red-500"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                      {/* 絵文字ピッカー */}
                      {showEmojiPicker === message.id && (
                        <div className="absolute right-0 top-8 bg-white shadow-lg rounded-lg border p-2 z-10">
                          <div className="flex gap-1 flex-wrap max-w-[200px]">
                            {emojiList.map(emoji => (
                              <button
                                key={emoji}
                                onClick={() => handleReaction(message.id, emoji)}
                                className="p-1 hover:bg-gray-100 rounded text-lg"
                              >
                                {emoji}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {/* メッセージ入力 */}
        {selectedChannel && (
          <div className="px-6 py-4 border-t">
            <div className="flex items-end gap-2 bg-gray-100 rounded-lg p-2">
              <div className="flex-1">
                <Input
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  placeholder={`${selectedChannel.type === 'public' ? '#' : ''}${selectedChannel.name} にメッセージを送信`}
                  className="border-0 bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault()
                      handleSendMessage()
                    }
                  }}
                />
              </div>
              <Button
                onClick={handleSendMessage}
                disabled={!newMessage.trim()}
                size="sm"
                className="rounded-md"
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* 新規チャンネル作成モーダル */}
      {showNewChannelModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-96">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">新規チャンネル作成</h3>
              <button onClick={() => setShowNewChannelModal(false)} className="text-gray-500 hover:text-gray-700">
                <X className="h-5 w-5" />
              </button>
            </div>
            <Input
              value={newChannelName}
              onChange={(e) => setNewChannelName(e.target.value)}
              placeholder="チャンネル名"
              className="mb-4"
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handleCreateChannel()
                }
              }}
            />
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowNewChannelModal(false)}>
                キャンセル
              </Button>
              <Button onClick={handleCreateChannel} disabled={!newChannelName.trim()}>
                作成
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* 新規DM作成モーダル */}
      {showNewDMModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-96">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">ダイレクトメッセージを開始</h3>
              <button onClick={() => setShowNewDMModal(false)} className="text-gray-500 hover:text-gray-700">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {salesReps.filter(rep => rep.name !== currentUserName).map(rep => (
                <button
                  key={rep.id}
                  onClick={() => handleCreateDM(rep.name)}
                  className="w-full flex items-center gap-3 p-3 hover:bg-gray-100 rounded-md transition-colors"
                >
                  <div className={`w-8 h-8 rounded-md flex items-center justify-center text-sm font-medium ${rep.color}`}>
                    {rep.name.charAt(0)}
                  </div>
                  <span className="font-medium">{rep.name}</span>
                </button>
              ))}
            </div>
            <div className="flex justify-end mt-4">
              <Button variant="outline" onClick={() => setShowNewDMModal(false)}>
                キャンセル
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
