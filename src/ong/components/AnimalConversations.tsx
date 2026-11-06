import { useEffect, useState } from 'react'
import type { AdoptionConversation } from '../types'

interface AnimalConversationsProps {
  animalId: string | undefined
  animalName: string
  conversations: AdoptionConversation[]
  error?: string | null
  onSendMessage: (conversationId: string, text: string) => Promise<void>
}

export function AnimalConversations({
  animalId,
  animalName,
  conversations,
  error,
  onSendMessage,
}: AnimalConversationsProps) {
  const animalConversations = conversations.filter((conversation) => conversation.animalId === animalId)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [messageText, setMessageText] = useState('')
  const [sending, setSending] = useState(false)
  const [readMessageIds, setReadMessageIds] = useState<Record<string, string[]>>({})
  const [pendingInitialReadId, setPendingInitialReadId] = useState<string | null>(null)

  const selectedConversation = animalConversations.find(({ id }) => id === selectedId) ?? animalConversations[0]

  function unreadCount(conversation: AdoptionConversation) {
    const readIds = new Set(readMessageIds[conversation.id] ?? [])
    return conversation.messages.filter((message) => (
      message.senderRole === 'user' && !readIds.has(message.id)
    )).length
  }

  function markAsRead(conversation: AdoptionConversation) {
    const receivedMessageIds = conversation.messages
      .filter((message) => message.senderRole === 'user')
      .map((message) => message.id)
    setReadMessageIds((current) => ({
      ...current,
      [conversation.id]: Array.from(new Set([
        ...(current[conversation.id] ?? []),
        ...receivedMessageIds,
      ])),
    }))
  }

  useEffect(() => {
    if (!selectedId) {
      const firstConversation = animalConversations[0]
      if (firstConversation) {
        setSelectedId(firstConversation.id)
        setPendingInitialReadId(firstConversation.id)
      }
      return
    }

    if (!animalConversations.some(({ id }) => id === selectedId)) {
      setSelectedId(null)
      setPendingInitialReadId(null)
      return
    }

    if (pendingInitialReadId === selectedId && selectedConversation?.messages.length) {
      markAsRead(selectedConversation)
      setPendingInitialReadId(null)
    }
  }, [animalConversations, pendingInitialReadId, selectedConversation, selectedId])

  const totalUnread = animalConversations.reduce((total, conversation) => total + unreadCount(conversation), 0)

  function selectConversation(id: string) {
    const conversation = animalConversations.find((item) => item.id === id)
    if (conversation) markAsRead(conversation)
    setPendingInitialReadId(null)
    setSelectedId(id)
  }

  async function sendMessage() {
    const text = messageText.trim()
    if (!text || !selectedConversation || sending) return
    setSending(true)
    try {
      await onSendMessage(selectedConversation.id, text)
      setMessageText('')
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="animal-conversations">
      <div className="animal-conversations-heading">
        <div>
          <strong>Conversas sobre {animalName}</strong>
          <span>Interessados neste animal</span>
        </div>
        <span className="animal-conversations-count">
          {animalConversations.length} conversa{animalConversations.length === 1 ? '' : 's'}
          {totalUnread > 0 ? ` · ${totalUnread} novas` : ''}
        </span>
      </div>

      {error ? (
        <div className="animal-conversations-empty error-state">
          <span className="animal-conversations-empty-icon">!</span>
          <strong>Não foi possível carregar as conversas</strong>
          <p>{error}</p>
        </div>
      ) : animalConversations.length === 0 ? (
        <div className="animal-conversations-empty">
          <span className="animal-conversations-empty-icon">💬</span>
          <strong>Nenhuma conversa ainda</strong>
          <p>Quando alguém demonstrar interesse em {animalName}, a conversa aparecerá aqui.</p>
        </div>
      ) : (
        <div className="animal-conversations-layout">
          <div className="animal-conversation-list">
            {animalConversations.map((conversation) => (
              <button
                key={conversation.id}
                type="button"
                className={`animal-conversation-item ${selectedConversation?.id === conversation.id ? 'selected' : ''}`}
                onClick={() => selectConversation(conversation.id)}
              >
                <span className="animal-conversation-avatar">{conversation.userName.charAt(0).toUpperCase()}</span>
                <span className="animal-conversation-copy">
                  <span className="animal-conversation-name">{conversation.userName}</span>
                  <span className="animal-conversation-last">{conversation.lastMessage}</span>
                </span>
                <span className="animal-conversation-meta">
                  <small>{conversation.lastMessageTime}</small>
                  {unreadCount(conversation) > 0 && <b>{unreadCount(conversation)}</b>}
                </span>
              </button>
            ))}
          </div>

          {selectedConversation && (
            <div className="animal-conversation-thread">
              <div className="animal-conversation-thread-header">
                <span className="animal-conversation-avatar">{selectedConversation.userName.charAt(0).toUpperCase()}</span>
                <div>
                  <strong>{selectedConversation.userName}</strong>
                  <span>Interessado em {animalName}</span>
                </div>
              </div>

              <div className="animal-conversation-messages">
                {selectedConversation.messages.map((message) => (
                  <div key={message.id} className={`animal-conversation-message-row ${message.senderRole === 'team' ? 'mine' : ''}`}>
                    <div className="animal-conversation-message">
                      <span>{message.text}</span>
                      <small>{message.timestamp}</small>
                    </div>
                  </div>
                ))}
              </div>

              <div className="animal-conversation-composer">
                <input
                  value={messageText}
                  onChange={(event) => setMessageText(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter') void sendMessage()
                  }}
                  placeholder="Escreva uma mensagem..."
                  aria-label="Mensagem para o interessado"
                  disabled={sending}
                />
                <button type="button" onClick={() => void sendMessage()} disabled={sending}>
                  {sending ? '...' : 'Enviar'}
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
