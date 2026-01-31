import { createClient } from "@/utils/supabase/server"
import { redirect } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { CreateTicketDialog } from "@/components/support/create-ticket-dialog"
import { MessageSquare, Clock } from "lucide-react"

export default async function CompanySupportPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect("/login")

  // Fetch conversations for this user
  const { data: conversations, error } = await supabase
    .from("conversations")
    .select(`
      id, 
      created_at,
      messages (
        content,
        created_at
      ),
      conversation_participants!inner (
        profile_id
      )
    `)
    .eq("type", "support")
    .eq("conversation_participants.profile_id", user.id)
    .order("created_at", { ascending: false })

  if (error) {
    console.error("Error fetching tickets:", error)
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Support Tickets</h1>
          <p className="text-muted-foreground">
            Track your support requests and admin responses.
          </p>
        </div>
        <CreateTicketDialog />
      </div>

      <div className="grid gap-4">
        {(!conversations || conversations.length === 0) ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <MessageSquare className="h-12 w-12 mb-4 opacity-20" />
              <p>You haven't submitted any tickets yet.</p>
            </CardContent>
          </Card>
        ) : (
          conversations.map((ticket) => {
            // FIX: Safely handle null dates during sort
            const sortedMessages = (ticket.messages || []).sort((a, b) => {
              const dateA = new Date(a.created_at ?? 0).getTime()
              const dateB = new Date(b.created_at ?? 0).getTime()
              return dateA - dateB
            })
            
            const firstMessage = sortedMessages[0]?.content || "No content"
            const lastMessage = sortedMessages[sortedMessages.length - 1]
            
            // Extract subject if it starts with "Subject:"
            const subjectMatch = firstMessage.match(/^Subject: (.*?)(\n|$)/)
            const title = subjectMatch ? subjectMatch[1] : firstMessage.slice(0, 50) + "..."

            // FIX: Determine valid date string or fallback to ticket creation time
            const lastActiveDate = lastMessage?.created_at ?? ticket.created_at ?? new Date().toISOString()

            return (
              <Link key={ticket.id} href={`/company/support/${ticket.id}`}>
                <Card className="hover:bg-muted/50 transition-colors">
                  <CardContent className="p-4 flex items-center justify-between">
                    <div className="space-y-1">
                      <h3 className="font-semibold text-lg">{title}</h3>
                      <p className="text-sm text-muted-foreground line-clamp-1">
                        Latest: {lastMessage?.content.slice(0, 100)}...
                      </p>
                    </div>
                    <div className="text-right text-xs text-muted-foreground flex flex-col items-end gap-1">
                      <div className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {new Date(lastActiveDate).toLocaleDateString()}
                      </div>
                      <Button variant="ghost" size="sm">View Ticket</Button>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            )
          })
        )}
      </div>
    </div>
  )
}