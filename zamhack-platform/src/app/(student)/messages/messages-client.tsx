"use client"

import { useState, useRef, useEffect } from "react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { toast } from "sonner"
import { Send, MessageCircle, ArrowLeft } from "lucide-react"
import { sendDirectMessage, markConversationAsRead } from "@/app/actions/message-actions"

const sessionReadIds = new Set<string>()

interface Profile {
  id: string
  first_name: string | null
  last_name: string | null
  avatar_url: string | null
  role: string | null
  organization_id: string | null
  organizations?: { name: string } | null
}

interface ConversationItem {
  id: string
  otherProfile: Profile | null
  lastMessage: {
    content: string
    created_at: string | null
    sender_id: string | null
    is_read: boolean | null
  } | null
  unreadCount: number
}

interface Message {
  id: string
  conversation_id: string | null
  sender_id: string | null
  content: string
  created_at: string | null
  is_read: boolean | null
  sender_profile?: {
    first_name: string | null
    last_name: string | null
    role: string | null
    avatar_url: string | null
  }
}

interface MessagesClientProps {
  conversations: ConversationItem[]
  activeConversationId: string | null
  activeMessages: Message[]
  activeOtherProfile: Profile | null
  currentUserId: string
}

export function MessagesClient({
  conversations,
  activeConversationId,
  activeMessages,
  activeOtherProfile,
  currentUserId,
}: MessagesClientProps) {
  const [messages, setMessages]     = useState<Message[]>(activeMessages)
  const [text, setText]             = useState("")
  const [sending, setSending]       = useState(false)
  const [mobileView, setMobileView] = useState<"list" | "chat">(
    activeConversationId ? "chat" : "list"
  )

  const markedReadRef = useRef<Set<string>>(new Set())
  const scrollRef     = useRef<HTMLDivElement>(null)

  const [unreadMap, setUnreadMap] = useState<Record<string, number>>(
    () => Object.fromEntries(
      conversations.map((c) => [c.id, sessionReadIds.has(c.id) ? 0 : c.unreadCount])
    )
  )

  useEffect(() => {
    setUnreadMap((prev) => {
      const next = { ...prev }
      for (const conv of conversations) {
        if (!markedReadRef.current.has(conv.id) && !sessionReadIds.has(conv.id)) {
          next[conv.id] = conv.unreadCount
        } else {
          next[conv.id] = 0
        }
      }
      return next
    })
  }, [conversations])

  useEffect(() => { setMessages(activeMessages) }, [activeMessages])

  useEffect(() => {
    if (!activeConversationId) return
    if (markedReadRef.current.has(activeConversationId)) return
    markedReadRef.current.add(activeConversationId)
    sessionReadIds.add(activeConversationId)
    setUnreadMap((prev) => ({ ...prev, [activeConversationId]: 0 }))
    markConversationAsRead(activeConversationId).then(() => {
      window.dispatchEvent(new Event("messages-read"))
    })
  }, [activeConversationId])

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  const handleSelectConversation = (id: string) => {
    setMobileView("chat")
    setUnreadMap((prev) => ({ ...prev, [id]: 0 }))
    window.location.href = `/messages?conversation=${id}`
  }

  const handleSend = async () => {
    if (!text.trim() || !activeConversationId) return
    setSending(true)
    const tempId = `temp-${Date.now()}`
    const optimistic: Message = {
      id: tempId,
      conversation_id: activeConversationId,
      sender_id: currentUserId,
      content: text.trim(),
      created_at: new Date().toISOString(),
      is_read: false,
      sender_profile: { first_name: "Me", last_name: "", role: null, avatar_url: null },
    }
    setMessages((prev) => [...prev, optimistic])
    const sent = text
    setText("")
    const result = await sendDirectMessage(activeConversationId, sent)
    if (result.error) {
      toast.error(result.error)
      setMessages((prev) => prev.filter((m) => m.id !== tempId))
      setText(sent)
    }
    setSending(false)
  }

  const formatTime = (dateStr: string | null) => {
    if (!dateStr) return ""
    const d = new Date(dateStr)
    const now = new Date()
    return d.toDateString() === now.toDateString()
      ? d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
      : d.toLocaleDateString([], { month: "short", day: "numeric" })
  }

  const getInitials = (p: Profile | null) =>
    `${p?.first_name?.[0] ?? ""}${p?.last_name?.[0] ?? ""}`.toUpperCase() || "?"
  const getName = (p: Profile | null) =>
    [p?.first_name, p?.last_name].filter(Boolean).join(" ") || "Unknown"
  const getCompany = (p: Profile | null) =>
    (p as any)?.organizations?.name ?? null

  // ── Height fills the available space below the portal header.
  //    Mobile: header=64px, padding=p-4 (16px top+bottom = 32px) → 96px = 6rem
  //    md+:    header=64px, padding=p-6 (24px top+bottom = 48px) → but p-6 is 1.5rem each side
  //    We use dvh so iOS browser chrome doesn't cause overflow.
  const containerCls =
    "flex h-[calc(100dvh-6.5rem)] md:h-[calc(100dvh-8.5rem)] overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm"

  return (
    <div className={containerCls}>

      {/* ── Conversation List ─────────────────────────────────────────
           Mobile:  full width, hidden when chat is open
           Desktop: fixed 300px sidebar always visible               */}
      <div
        className={`
          flex flex-col border-r border-gray-100 bg-white
          w-full md:w-[300px] md:flex-shrink-0
          ${mobileView === "chat" ? "hidden md:flex" : "flex"}
        `}
      >
        {/* List header */}
        <div className="flex-shrink-0 border-b border-gray-100 px-4 py-4 md:px-5">
          <h1 className="text-lg font-bold text-[#2c3e50]">Messages</h1>
          <p className="text-xs text-gray-400 mt-0.5">
            {conversations.length} conversation{conversations.length !== 1 ? "s" : ""}
          </p>
        </div>

        {/* Conversation rows */}
        <div className="flex-1 overflow-y-auto">
          {conversations.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-3 px-6 py-16 text-center">
              <MessageCircle size={40} className="text-gray-200" />
              <p className="text-sm font-medium text-gray-400">No messages yet</p>
              <p className="text-xs text-gray-300">
                Companies will appear here when they message you
              </p>
            </div>
          ) : (
            conversations.map((conv) => {
              const isActive = conv.id === activeConversationId
              const unread   = unreadMap[conv.id] ?? 0
              const name     = getName(conv.otherProfile)
              const company  = getCompany(conv.otherProfile)
              const initials = getInitials(conv.otherProfile)

              return (
                <button
                  key={conv.id}
                  onClick={() => handleSelectConversation(conv.id)}
                  className="w-full text-left transition-colors active:bg-gray-50"
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "0.75rem",
                    // min 64px touch target on mobile
                    padding: "0.875rem 1.25rem",
                    minHeight: 64,
                    background: isActive ? "rgba(255,155,135,0.08)" : "transparent",
                    border: "none",
                    borderLeft: isActive ? "3px solid #ff9b87" : "3px solid transparent",
                    cursor: "pointer",
                  }}
                >
                  <div className="relative flex-shrink-0">
                    <Avatar style={{ width: 44, height: 44 }}>
                      <AvatarImage src={conv.otherProfile?.avatar_url ?? undefined} />
                      <AvatarFallback
                        style={{
                          background: "linear-gradient(135deg,#ff9b87,#e8836f)",
                          color: "#fff",
                          fontSize: "0.8rem",
                          fontWeight: 700,
                        }}
                      >
                        {initials}
                      </AvatarFallback>
                    </Avatar>
                  

                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <p
                        className="truncate text-sm font-semibold"
                        style={{ color: "#2c3e50" }}
                      >
                        {company ?? name}
                      </p>
                      {conv.lastMessage?.created_at && (
                        <span className="flex-shrink-0 text-xs text-gray-400">
                          {formatTime(conv.lastMessage.created_at)}
                        </span>
                      )}
                    </div>
                    <p
                      className="truncate text-xs mt-0.5"
                      style={{
                        color: unread > 0 ? "#4b5563" : "#9ca3af",
                        fontWeight: unread > 0 ? 500 : 400,
                      }}
                    >
                      {conv.lastMessage
                        ? (conv.lastMessage.sender_id === currentUserId ? "You: " : "") +
                          conv.lastMessage.content
                        : "No messages yet"}
                    </p>
                  </div>

                  {unread > 0 && (
                    <span
                      className="flex-shrink-0 rounded-full px-1.5 py-0.5 text-[10px] font-bold text-white"
                      style={{ background: "#e8836f" }}
                    >
                      {unread}
                    </span>
                  )}
                </button>
              )
            })
          )}
        </div>
      </div>

      {/* ── Chat Panel ───────────────────────────────────────────────
           Mobile:  full width, hidden when list is showing
           Desktop: fills remaining width                            */}
      <div
        className={`
          flex flex-col flex-1 min-w-0 bg-white
          ${mobileView === "list" ? "hidden md:flex" : "flex"}
        `}
      >
        {!activeConversationId ? (
          /* Empty state — desktop only (mobile stays on list) */
          <div className="flex flex-1 flex-col items-center justify-center gap-4 p-8 text-center text-gray-400">
            <div
              className="flex h-16 w-16 items-center justify-center rounded-2xl"
              style={{ background: "rgba(255,155,135,0.1)" }}
            >
              <MessageCircle size={28} style={{ color: "#ff9b87" }} />
            </div>
            <div>
              <p className="font-semibold text-gray-600">Select a conversation</p>
              <p className="mt-1 text-sm">Choose from your messages on the left</p>
            </div>
          </div>
        ) : (
          <>
            {/* Chat header */}
            <div
              className="flex flex-shrink-0 items-center gap-3 border-b border-gray-100 bg-white px-4 py-3 md:px-5 md:py-4"
            >
              {/* Back button — mobile only */}
              <button
                className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl text-gray-500 transition-colors hover:bg-gray-100 md:hidden"
                onClick={() => setMobileView("list")}
                aria-label="Back to conversations"
              >
                <ArrowLeft size={20} />
              </button>

              <Avatar style={{ width: 40, height: 40, flexShrink: 0 }}>
                <AvatarImage src={activeOtherProfile?.avatar_url ?? undefined} />
                <AvatarFallback
                  style={{
                    background: "linear-gradient(135deg,#ff9b87,#e8836f)",
                    color: "#fff",
                    fontSize: "0.8rem",
                    fontWeight: 700,
                  }}
                >
                  {getInitials(activeOtherProfile)}
                </AvatarFallback>
              </Avatar>

              <div className="min-w-0">
                <p className="truncate text-sm font-bold" style={{ color: "#2c3e50" }}>
                  {getCompany(activeOtherProfile) ?? getName(activeOtherProfile)}
                </p>
                {getCompany(activeOtherProfile) && (
                  <p className="truncate text-xs text-gray-400">
                    {getName(activeOtherProfile)}
                  </p>
                )}
              </div>
            </div>

            {/* Messages scroll area */}
            <div className="flex-1 overflow-y-auto px-4 py-4 md:px-5">
              <div className="flex flex-col gap-3">
                {messages.length === 0 && (
                  <div className="py-12 text-center text-sm text-gray-400">
                    No messages yet. Say hello! 👋
                  </div>
                )}
                {messages.map((msg, index) => {
                  const isMe = msg.sender_id === currentUserId
                  const isFirstInGroup =
                    index === 0 || messages[index - 1].sender_id !== msg.sender_id

                  return (
                    <div
                      key={msg.id}
                      className="flex flex-col"
                      style={{ alignItems: isMe ? "flex-end" : "flex-start" }}
                    >
                      {!isMe && isFirstInGroup && (
                        <span className="mb-1 pl-2 text-xs text-gray-400">
                          {msg.sender_profile?.first_name} {msg.sender_profile?.last_name}
                        </span>
                      )}
                      <div
                        className="max-w-[78%] px-3 py-2 text-sm leading-relaxed break-words whitespace-pre-wrap md:max-w-[65%]"
                        style={{
                          borderRadius: isMe
                            ? "18px 18px 4px 18px"
                            : "18px 18px 18px 4px",
                          background: isMe
                            ? "linear-gradient(135deg,#ff9b87,#e8836f)"
                            : "#f3f4f6",
                          color: isMe ? "#fff" : "#2c3e50",
                        }}
                      >
                        {msg.content}
                      </div>
                      <span className="mt-1 px-1 text-[11px] text-gray-400">
                        {formatTime(msg.created_at)}
                      </span>
                    </div>
                  )
                })}
                <div ref={scrollRef} />
              </div>
            </div>

            {/* Input bar — padding-bottom accounts for iOS home indicator */}
            <div
              className="flex flex-shrink-0 items-end gap-2 border-t border-gray-100 bg-white px-3 py-3 pb-safe md:px-5 md:py-4"
            >
              <textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault()
                    handleSend()
                  }
                }}
                placeholder="Type a message…"
                rows={1}
                className="flex-1 resize-none rounded-2xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm leading-relaxed outline-none transition-colors focus:border-[#ff9b87] focus:bg-white"
                style={{ maxHeight: 120, overflowY: "auto", fontFamily: "inherit" }}
              />
              <button
                onClick={handleSend}
                disabled={!text.trim() || sending}
                className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-2xl border-none transition-all active:scale-95 disabled:cursor-not-allowed"
                style={{
                  background:
                    text.trim() && !sending
                      ? "linear-gradient(135deg,#ff9b87,#e8836f)"
                      : "#f3f4f6",
                  color: text.trim() && !sending ? "#fff" : "#9ca3af",
                }}
                aria-label="Send message"
              >
                <Send size={16} />
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}