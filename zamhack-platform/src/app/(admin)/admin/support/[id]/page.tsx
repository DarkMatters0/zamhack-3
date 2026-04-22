import { createClient } from "@supabase/supabase-js"
import { redirect } from "next/navigation"
import { createClient as createSessionClient } from "@/utils/supabase/server"
import Link from "next/link"
import { ArrowLeft } from "lucide-react"
import TicketChat from "@/components/support/ticket-chat"
import "@/app/(admin)/admin.css"

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function AdminSupportDetailPage({ params }: PageProps) {
  const { id } = await params

  // Auth guard — session client only, to verify the caller is an admin
  const sessionClient = await createSessionClient()
  const { data: { user } } = await sessionClient.auth.getUser()
  if (!user) redirect("/login")

  const { data: profile } = await sessionClient
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single()

  if (profile?.role !== "admin") redirect("/admin/dashboard")

  // Service-role client — bypasses RLS, same pattern as the inbox page
  const serviceClient = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  // a. Fetch the conversation row
  const { data: conversation } = await (serviceClient as any)
    .from("conversations")
    .select("id, source, created_at, type")
    .eq("id", id)
    .single()

  if (!conversation || conversation.type !== "support") {
    redirect("/admin/support")
  }

  // b. Fetch all messages ordered oldest-first
  const { data: rawMessages } = await (serviceClient as any)
    .from("messages")
    .select("id, content, created_at, sender_id, is_read, conversation_id")
    .eq("conversation_id", id)
    .order("created_at", { ascending: true })

  const messages: any[] = rawMessages ?? []

  // c. Batch-fetch sender profiles for all unique senders in one query
  const senderIds = Array.from(
    new Set(messages.map((m: any) => m.sender_id).filter(Boolean))
  ) as string[]

  const profileMap: Record<string, {
    first_name: string | null
    last_name: string | null
    role: string | null
    avatar_url: string | null
  }> = {}

  if (senderIds.length > 0) {
    const { data: profiles } = await serviceClient
      .from("profiles")
      .select("id, first_name, last_name, role, avatar_url")
      .in("id", senderIds)
    ;(profiles ?? []).forEach((p: any) => { profileMap[p.id] = p })
  }

  // Subject extraction — same regex as the inbox page
  const firstContent: string = messages[0]?.content ?? ""
  const subjectMatch = firstContent.match(/^Subject: (.*)/)
  const subject = subjectMatch ? subjectMatch[1].trim() : "Support Ticket"

  // First-message sender for the metadata row
  const firstSenderId: string | undefined = messages[0]?.sender_id
  const firstSender = firstSenderId ? profileMap[firstSenderId] : null
  const senderName = firstSender
    ? `${firstSender.first_name ?? ""} ${firstSender.last_name ?? ""}`.trim() || "Unknown"
    : "Unknown"

  const dateSubmitted = conversation.created_at
    ? new Date(conversation.created_at).toLocaleString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    : "—"

  const source: string = conversation.source ?? "unknown"

  // Map to the shape TicketChat expects:
  // Database["public"]["Tables"]["messages"]["Row"] & { sender_profile?: {...} }
  const chatMessages = messages.map((m: any) => ({
    id: m.id as string,
    content: m.content as string,
    conversation_id: m.conversation_id as string | null,
    created_at: m.created_at as string | null,
    is_read: m.is_read as boolean | null,
    sender_id: m.sender_id as string | null,
    sender_profile:
      m.sender_id && profileMap[m.sender_id]
        ? profileMap[m.sender_id]
        : undefined,
  }))

  return (
    <div className="space-y-6" data-layout="admin">
      {/* Back link */}
      <div>
        <Link href="/admin/support" className="admin-btn admin-btn-outline admin-btn-sm">
          <ArrowLeft style={{ width: 14, height: 14 }} />
          Back to Support Inbox
        </Link>
      </div>

      {/* Conversation header */}
      <div className="admin-page-header" style={{ marginBottom: 0 }}>
        <h1 className="admin-page-title" style={{ fontSize: "1.5rem" }}>
          {subject}
        </h1>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "0.5rem",
            marginTop: "0.5rem",
            flexWrap: "wrap",
          }}
        >
          <span
            className={`admin-badge ${
              source === "student"
                ? "blue"
                : source === "company"
                ? "coral"
                : "gray"
            }`}
          >
            {source === "student"
              ? "Student"
              : source === "company"
              ? "Company"
              : "Unknown"}
          </span>
          <span style={{ fontSize: "0.8125rem", color: "var(--admin-gray-500)" }}>
            {senderName}
          </span>
          <span style={{ fontSize: "0.8125rem", color: "var(--admin-gray-500)" }}>
            ·
          </span>
          <span style={{ fontSize: "0.8125rem", color: "var(--admin-gray-500)" }}>
            {dateSubmitted}
          </span>
        </div>
      </div>

      {/* Thread + reply — TicketChat handles optimistic updates and sendMessage */}
      <TicketChat
        conversationId={id}
        initialMessages={chatMessages}
        currentUserId={user.id}
        currentUserRole="admin"
        title={subject}
      />
    </div>
  )
}
