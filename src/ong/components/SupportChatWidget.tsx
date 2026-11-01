import { useState, useEffect, useRef } from 'react'
import { useToast } from './ToastContext'

type Message = {
  id: string
  sender: 'ong' | 'admin'
  text: string
  time: string
}

type Conversation = {
  id: string
  name: string
  role: string
  avatar: string
  online: boolean
  lastMessage: string
  lastMessageTime: string
  messages: Message[]
}

interface SupportChatWidgetProps {
  organizationName: string
}

export function SupportChatWidget({ organizationName }: SupportChatWidgetProps) {
  const { showToast } = useToast()
  const [isOpen, setIsOpen] = useState(false)
  const [activeTab, setActiveTab] = useState<'Focused' | 'Other'>('Focused')
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedChatId, setSelectedChatId] = useState<string | null>(null)
  const [inputText, setInputText] = useState('')

  const chatRef = useRef<HTMLDivElement>(null)

  // Conversas iniciais simulando a moderação da plataforma e administradores gerais
  const [conversations, setConversations] = useState<Conversation[]>(() => {
    const saved = localStorage.getItem('weanimals_support_chats')
    if (saved) return JSON.parse(saved)
    return [
      {
        id: 'admin-1',
        name: 'Equipe de Moderação WeAnimals',
        role: 'Suporte Oficial & Verificação',
        avatar: '🛡️',
        online: true,
        lastMessage: 'Seus documentos foram aprovados com sucesso!',
        lastMessageTime: '10:42',
        messages: [
          { id: 'm1', sender: 'admin', text: 'Olá, ' + organizationName + '! Analisamos o seu CNPJ e comprovante de endereço.', time: '10:40' },
          { id: 'm2', sender: 'admin', text: 'Seus documentos foram aprovados com sucesso!', time: '10:42' },
        ],
      },
      {
        id: 'admin-2',
        name: 'Suporte Técnico TCC',
        role: 'Desenvolvimento da Plataforma',
        avatar: '💻',
        online: false,
        lastMessage: 'Qualquer dúvida sobre a integração com o Firestore, avise.',
        lastMessageTime: 'Ontem',
        messages: [
          { id: 'm3', sender: 'admin', text: 'Qualquer dúvida sobre a integração com o Firestore, avise.', time: 'Ontem' },
        ],
      },
    ]
  })

  useEffect(() => {
    localStorage.setItem('weanimals_support_chats', JSON.stringify(conversations))
  }, [conversations])

  const activeChat = conversations.find((c) => c.id === selectedChatId)

  function handleSendMessage() {
    if (!inputText.trim() || !selectedChatId) return
    const text = inputText.trim()
    const now = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })

    setConversations((prev) =>
      prev.map((conv) => {
        if (conv.id === selectedChatId) {
          return {
            ...conv,
            lastMessage: text,
            lastMessageTime: now,
            messages: [
              ...conv.messages,
              { id: `msg-${Date.now()}`, sender: 'ong', text, time: now },
            ],
          }
        }
        return conv
      }),
    )
    setInputText('')
    showToast('Mensagem enviada para os administradores!', '💬')
  }

  const filteredConversations = conversations.filter((c) =>
    c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.role.toLowerCase().includes(searchQuery.toLowerCase()),
  )

  return (
    <div style={{ position: 'fixed', bottom: 24, right: 24, zIndex: 9999 }} ref={chatRef}>
      {/* Botão Flutuante do Chat no Canto Inferior Direito */}
      {!isOpen && (
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          style={{
            background: 'var(--p7, #2d5a3c)',
            color: '#fff',
            border: 'none',
            borderRadius: '50px',
            padding: '12px 20px',
            fontSize: '14px',
            fontWeight: 700,
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            cursor: 'pointer',
            boxShadow: '0 8px 24px rgba(0,0,0,0.18)',
            transition: 'transform 0.2s ease',
          }}
        >
          <span style={{ fontSize: '18px' }}>💬</span> Suporte Admins
          <span
            style={{
              background: '#e53e3e',
              color: '#fff',
              fontSize: '11px',
              padding: '2px 6px',
              borderRadius: '10px',
              fontWeight: 700,
            }}
          >
            {conversations.length}
          </span>
        </button>
      )}

      {/* Janela Flutuante Estilo LinkedIn Messaging */}
      {isOpen && (
        <div
          style={{
            width: '360px',
            height: '480px',
            background: '#fff',
            borderRadius: '16px',
            boxShadow: '0 12px 36px rgba(0,0,0,0.22)',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            border: '1px solid var(--ln, #e2e8f0)',
            fontFamily: 'Inter, sans-serif',
          }}
        >
          {selectedChatId && activeChat ? (
            /* ECRÃ DE CONVERSA ABERTA */
            <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
              <div
                style={{
                  padding: '12px 16px',
                  background: 'var(--s0, #f8fafc)',
                  borderBottom: '1px solid var(--ln)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                }}
              >
                <button
                  type="button"
                  onClick={() => setSelectedChatId(null)}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '16px', fontWeight: 700 }}
                >
                  &larr;
                </button>
                <div style={{ fontSize: '24px' }}>{activeChat.avatar}</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 700, fontSize: '13.5px', color: '#1e293b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {activeChat.name}
                  </div>
                  <div style={{ fontSize: '11px', color: '#64748b' }}>{activeChat.role}</div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '16px', color: '#64748b' }}
                >
                  ✕
                </button>
              </div>

              {/* Mensagens */}
              <div style={{ flex: 1, padding: '16px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '10px', background: '#fdfdfd' }}>
                {activeChat.messages.map((m) => (
                  <div
                    key={m.id}
                    style={{
                      alignSelf: m.sender === 'ong' ? 'flex-end' : 'flex-start',
                      maxWidth: '80%',
                      background: m.sender === 'ong' ? 'var(--p7, #2d5a3c)' : '#f1f5f9',
                      color: m.sender === 'ong' ? '#fff' : '#1e293b',
                      padding: '10px 14px',
                      borderRadius: '12px',
                      fontSize: '13px',
                      boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
                    }}
                  >
                    <div>{m.text}</div>
                    <div style={{ fontSize: '10px', opacity: 0.7, textAlign: 'right', marginTop: '4px' }}>
                      {m.time}
                    </div>
                  </div>
                ))}
              </div>

              {/* Input de Envio */}
              <div style={{ padding: '10px 12px', borderTop: '1px solid var(--ln)', display: 'flex', gap: '8px', background: '#fff' }}>
                <input
                  type="text"
                  placeholder="Escreva uma mensagem..."
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleSendMessage()
                  }}
                  style={{
                    flex: 1,
                    padding: '8px 12px',
                    borderRadius: '8px',
                    border: '1px solid var(--ln)',
                    fontSize: '13px',
                    outline: 'none',
                    margin: 0,
                  }}
                />
                <button
                  type="button"
                  onClick={handleSendMessage}
                  style={{
                    background: 'var(--p7, #2d5a3c)',
                    color: '#fff',
                    border: 'none',
                    borderRadius: '8px',
                    padding: '8px 14px',
                    fontWeight: 700,
                    cursor: 'pointer',
                    fontSize: '13px',
                  }}
                >
                  Enviar
                </button>
              </div>
            </div>
          ) : (
            /* LISTA DE CONVERSAS (ESTILO LINKEDIN) */
            <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
              {/* Cabeçalho */}
              <div
                style={{
                  padding: '14px 16px',
                  borderBottom: '1px solid var(--ln)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  background: '#fff',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'var(--p7)', color: '#fff', display: 'grid', placeItems: 'center', fontWeight: 700, fontSize: '14px' }}>
                    {organizationName.charAt(0).toUpperCase()}
                  </div>
                  <strong style={{ fontSize: '15px', color: '#1e293b' }}>Suporte & Admins</strong>
                </div>
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '16px', color: '#64748b' }}
                >
                  ✕
                </button>
              </div>

              {/* Barra de Pesquisa */}
              <div style={{ padding: '10px 16px', borderBottom: '1px solid var(--ln)', background: '#fff' }}>
                <input
                  type="text"
                  placeholder="Pesquisar conversas..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: '8px',
                    border: '1px solid var(--ln)',
                    fontSize: '13px',
                    background: '#f8fafc',
                    outline: 'none',
                    margin: 0,
                  }}
                />
              </div>

              {/* Abas Focadas / Outras */}
              <div style={{ display: 'flex', borderBottom: '1px solid var(--ln)', background: '#fff' }}>
                <button
                  type="button"
                  onClick={() => setActiveTab('Focused')}
                  style={{
                    flex: 1,
                    padding: '10px',
                    background: 'none',
                    border: 'none',
                    borderBottom: activeTab === 'Focused' ? '2px solid var(--p7, #2d5a3c)' : '2px solid transparent',
                    fontWeight: 700,
                    fontSize: '13px',
                    color: activeTab === 'Focused' ? 'var(--p7, #2d5a3c)' : '#64748b',
                    cursor: 'pointer',
                  }}
                >
                  Focadas
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('Other')}
                  style={{
                    flex: 1,
                    padding: '10px',
                    background: 'none',
                    border: 'none',
                    borderBottom: activeTab === 'Other' ? '2px solid var(--p7, #2d5a3c)' : '2px solid transparent',
                    fontWeight: 700,
                    fontSize: '13px',
                    color: activeTab === 'Other' ? 'var(--p7, #2d5a3c)' : '#64748b',
                    cursor: 'pointer',
                  }}
                >
                  Outras
                </button>
              </div>

              {/* Lista de Chats */}
              <div style={{ flex: 1, overflowY: 'auto', background: '#fff' }}>
                {filteredConversations.length === 0 ? (
                  <div style={{ padding: '24px', textAlign: 'center', color: '#64748b', fontSize: '13px' }}>
                    Nenhuma conversa encontrada.
                  </div>
                ) : (
                  filteredConversations.map((chat) => (
                    <div
                      key={chat.id}
                      onClick={() => setSelectedChatId(chat.id)}
                      style={{
                        padding: '12px 16px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '12px',
                        borderBottom: '1px solid #f1f5f9',
                        cursor: 'pointer',
                        transition: 'background 0.15s ease',
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = '#f8fafc')}
                      onMouseLeave={(e) => (e.currentTarget.style.background = '#fff')}
                    >
                      <div style={{ fontSize: '28px', position: 'relative' }}>
                        {chat.avatar}
                        {chat.online && (
                          <span
                            style={{
                              position: 'absolute',
                              bottom: 2,
                              right: 2,
                              width: 8,
                              height: 8,
                              borderRadius: '50%',
                              background: '#22c55e',
                              border: '2px solid #fff',
                            }}
                          />
                        )}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2px' }}>
                          <strong style={{ fontSize: '13.5px', color: '#1e293b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {chat.name}
                          </strong>
                          <span style={{ fontSize: '11px', color: '#94a3b8', flexShrink: 0 }}>
                            {chat.lastMessageTime}
                          </span>
                        </div>
                        <div style={{ fontSize: '12.5px', color: '#64748b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {chat.lastMessage}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}