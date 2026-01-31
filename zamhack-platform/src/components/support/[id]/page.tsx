import { createClient } from "@/utils/supabase/server"
import { redirect } from "next/navigation"
import TicketChat from "@/components/support/ticket-chat"

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function TicketDetailPage({ params }: PageProps) {
  const { id } = await params
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect("/login")

  // Verify access: Is the user a participant?
  const { data: participation } = await supabase
    .from("conversation_participants")
    .select("profile_id")
    .eq("conversation_id", id)
    .eq("profile_id", user.id)
    .single()

  if (!participation) {
    return <div className="p-6">Ticket not found or access denied.</div>
  }

  // Fetch messages with sender profiles
  const { data: messages, error } = await supabase
    .from("messages")
    .select(`
      *,
      sender_profile:profiles(
        first_name,
        last_name,
        role,
        avatar_url
      )
    `)
    .eq("conversation_id", id)
    .order("created_at", { ascending: true })

  if (error) {
    console.error("Error fetching messages:", error)
    return <div>Error loading messages.</div>
  }

  // Determine Title from first message
  const firstMsg = messages?.[0]?.content || ""
  const subjectMatch = firstMsg.match(/^Subject: (.*?)(\n|$)/)
  const title = subjectMatch ? subjectMatch[1] : "Support Request"

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <TicketChat 
        conversationId={id}
        // FIX: Cast messages to 'any' to resolve the null vs undefined mismatch from Supabase types
        initialMessages={(messages as any) || []}
        currentUserId={user.id}
        currentUserRole="company_member"
        title={title}
      />
    </div>
  )
}