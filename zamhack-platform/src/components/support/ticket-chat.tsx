"use client"

import { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { ScrollArea } from "@/components/ui/scroll-area"
import { toast } from "sonner"
import { sendMessage } from "@/app/actions/ticket-actions"
import { Database } from "@/types/supabase"
import { cn } from "@/lib/utils"
import { Send } from "lucide-react"

type Message = Database["public"]["Tables"]["messages"]["Row"] & {
  sender_profile?: {
    first_name: string | null
    last_name: string | null
    role: string | null
    avatar_url: string | null
  }
}

interface TicketChatProps {
  conversationId: string
  initialMessages: Message[]
  currentUserId: string
  currentUserRole: string
  title?: string
}

export default function TicketChat({
  conversationId,
  initialMessages,
  currentUserId,
  title = "Support Ticket"
}: TicketChatProps) {
  const [messages, setMessages] = useState<Message[]>(initialMessages)
  const [newMessage, setNewMessage] = useState("")
  const [isSending, setIsSending] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)

  // Scroll to bottom on load and new messages
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollIntoView({ behavior: "smooth" })
    }
  }, [messages])

  const handleSend = async () => {
    if (!newMessage.trim()) return

    setIsSending(true)
    const tempId = Math.random().toString()
    
    // Optimistic UI update
    const optimisticMsg: Message = {
      id: tempId,
      conversation_id: conversationId,
      sender_id: currentUserId,
      content: newMessage,
      created_at: new Date().toISOString(),
      is_read: false,
      sender_profile: {
        first_name: "Me",
        last_name: "",
        role: "user",
        avatar_url: null
      }
    }
    
    setMessages((prev) => [...prev, optimisticMsg])
    const msgToSend = newMessage
    setNewMessage("")

    const result = await sendMessage(conversationId, msgToSend)

    if (result.error) {
      toast.error(result.error)
      // Revert optimistic update (simple filter for now)
      setMessages((prev) => prev.filter(m => m.id !== tempId))
      setNewMessage(msgToSend) // Restore text
    } else {
      // In a real app with Supabase subscription, we'd wait for the real row.
      // For now, refreshing the page or relying on the optimistic one is okay until next load.
    }
    
    setIsSending(false)
  }

  // Safe format time helper that handles nulls
  const formatTime = (dateString: string | null) => {
    if (!dateString) return "Just now"
    return new Date(dateString).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  }

  const getInitials = (firstName?: string | null, lastName?: string | null) => {
    return `${firstName?.charAt(0) || ""}${lastName?.charAt(0) || ""}`.toUpperCase()
  }

  return (
    <Card className="flex flex-col h-[600px]">
      <CardHeader className="border-b px-6 py-4">
        <CardTitle className="flex items-center gap-2">
          {title}
        </CardTitle>
      </CardHeader>
      
      <CardContent className="flex-1 p-0 overflow-hidden">
        <ScrollArea className="h-full p-6">
          <div className="flex flex-col gap-4">
            {messages.map((msg, index) => {
              const isMe = msg.sender_id === currentUserId
              const isFirstInGroup = index === 0 || messages[index - 1].sender_id !== msg.sender_id
              
              return (
                <div
                  key={msg.id}
                  className={cn(
                    "flex gap-3 max-w-[80%]",
                    isMe ? "ml-auto flex-row-reverse" : "mr-auto"
                  )}
                >
                  {isFirstInGroup && !isMe && (
                    <Avatar className="h-8 w-8 mt-1">
                      <AvatarImage src={msg.sender_profile?.avatar_url || ""} />
                      <AvatarFallback>
                        {getInitials(msg.sender_profile?.first_name, msg.sender_profile?.last_name)}
                      </AvatarFallback>
                    </Avatar>
                  )}
                  {isFirstInGroup && isMe && (
                    <div className="w-8" /> /* Spacer to align messages if avatar is missing on right */
                  )}
                  
                  <div className={cn("flex flex-col", isMe ? "items-end" : "items-start")}>
                    {!isMe && isFirstInGroup && (
                      <span className="text-xs text-muted-foreground mb-1 ml-1">
                        {msg.sender_profile?.first_name} {msg.sender_profile?.last_name}
                      </span>
                    )}
                    
                    <div
                      className={cn(
                        "px-4 py-2 rounded-2xl whitespace-pre-wrap text-sm",
                        isMe 
                          ? "bg-primary text-primary-foreground rounded-tr-none" 
                          : "bg-muted rounded-tl-none"
                      )}
                    >
                      {msg.content}
                    </div>
                    
                    <span className="text-[10px] text-muted-foreground mt-1 opacity-70 px-1">
                      {formatTime(msg.created_at)}
                    </span>
                  </div>
                </div>
              )
            })}
            <div ref={scrollRef} />
          </div>
        </ScrollArea>
      </CardContent>

      <CardFooter className="p-4 border-t bg-background">
        <div className="flex w-full gap-2 items-end">
          <Textarea
            placeholder="Type your message..."
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault()
                handleSend()
              }
            }}
            className="min-h-[60px] resize-none focus-visible:ring-1"
          />
          <Button 
            size="icon" 
            onClick={handleSend} 
            disabled={isSending || !newMessage.trim()}
            className="h-[60px] w-[60px]"
          >
            <Send className="h-5 w-5" />
          </Button>
        </div>
      </CardFooter>
    </Card>
  )
}