import { createClient } from "@/utils/supabase/server"
import { redirect } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import Link from "next/link"
import { Eye } from "lucide-react"

export default async function AdminChallengesPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/login")

  // Check Admin Role
  const { data: currentUserProfile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single()

  if (currentUserProfile?.role !== "admin") redirect("/dashboard")

  // Fetch all challenges
  const { data: challenges, error } = await supabase
    .from("challenges")
    .select(`
      *,
      organization:organizations(name)
    `)
    .order("created_at", { ascending: false })

  if (error) console.error(error)

  const getStatusColor = (status: string | null) => {
    switch (status) {
      case 'approved': return 'bg-green-100 text-green-800 border-green-200'
      case 'pending_approval': return 'bg-yellow-100 text-yellow-800 border-yellow-200'
      case 'draft': return 'bg-gray-100 text-gray-800 border-gray-200'
      case 'rejected': return 'bg-red-100 text-red-800 border-red-200'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-3xl font-bold">Challenge Management</h1>
        <p className="text-muted-foreground">Review, approve, or reject challenges submitted by companies.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Challenges ({challenges?.length || 0})</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[350px]">Title</TableHead>
                  <TableHead>Company</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {challenges?.map((challenge) => (
                  <TableRow key={challenge.id}>
                    <TableCell className="font-medium">
                      {challenge.title}
                    </TableCell>
                    <TableCell>
                      {challenge.organization?.name || "Unknown"}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={`font-normal ${getStatusColor(challenge.status)}`}>
                        {challenge.status?.replace('_', ' ')}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {/* FIX: Check if created_at exists before creating Date object */}
                      {challenge.created_at ? new Date(challenge.created_at).toLocaleDateString() : "N/A"}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="sm" asChild>
                        <Link href={`/admin/challenges/${challenge.id}`}>
                          <Eye className="mr-2 h-4 w-4" />
                          Review
                        </Link>
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
                {(!challenges || challenges.length === 0) && (
                  <TableRow>
                    <TableCell colSpan={5} className="h-24 text-center">
                      No challenges found.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}