import { createClient } from "@/utils/supabase/server"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Database } from "@/types/supabase"
import { redirect } from "next/navigation"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { OrgApprovalActions } from "@/components/admin/org-approval-actions"
import { Users, Building2, Trophy } from "lucide-react"

type Organization = Database["public"]["Tables"]["organizations"]["Row"]
type Profile = Database["public"]["Tables"]["profiles"]["Row"]

interface DashboardData {
  pendingOrgs: Organization[]
  stats: {
    totalUsers: number
    totalOrganizations: number
    totalChallenges: number
  }
  recentUsers: (Profile & { email?: string | null })[]
}

async function getAdminDashboardData(): Promise<DashboardData> {
  const supabase = await createClient()

  // Check authentication
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  if (userError || !user) {
    redirect("/login")
  }

  // Check admin role
  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single()

  if (profileError || !profile || profile.role !== "admin") {
    redirect("/dashboard")
  }

  // Fetch pending organizations (Using 'status' column)
  const { data: pendingOrgs } = await supabase
    .from("organizations")
    .select("*")
    .eq("status", "pending") 
    .order("created_at", { ascending: false })

  // Fetch stats counts
  const { count: userCount } = await supabase
    .from("profiles")
    .select("*", { count: "exact", head: true })

  const { count: orgCount } = await supabase
    .from("organizations")
    .select("*", { count: "exact", head: true })

  const { count: challengeCount } = await supabase
    .from("challenges")
    .select("*", { count: "exact", head: true })

  // Fetch recent users
  const { data: recentProfiles } = await supabase
    .from("profiles")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(10)

  // Note: We can't join auth.users easily here to get emails without an Admin RPC function.
  // For now, we will return profiles.
  
  return {
    pendingOrgs: pendingOrgs || [],
    stats: {
      totalUsers: userCount || 0,
      totalOrganizations: orgCount || 0,
      totalChallenges: challengeCount || 0,
    },
    recentUsers: recentProfiles || [],
  }
}

// Helpers
const formatDate = (dateString: string | null) => {
  if (!dateString) return "N/A"
  return new Date(dateString).toLocaleDateString()
}

const getRoleBadgeVariant = (role: string | null) => {
  switch (role) {
    case "admin": return "destructive"
    case "company_admin": return "default"
    case "company_member": return "secondary"
    case "student": return "outline"
    default: return "outline"
  }
}

const getUserName = (user: Profile) => {
  return `${user.first_name || ""} ${user.last_name || ""}`.trim() || "Unnamed User"
}

export default async function AdminDashboardPage() {
  const { pendingOrgs, stats, recentUsers } = await getAdminDashboardData()

  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold">Super Admin Dashboard</h1>
        <p className="text-muted-foreground">
          Manage organizations, users, and platform settings.
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Users</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalUsers}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total Organizations
            </CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalOrganizations}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total Challenges
            </CardTitle>
            <Trophy className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalChallenges}</div>
          </CardContent>
        </Card>
      </div>

      {/* Section 1: Pending Approvals */}
      <div className="space-y-4">
        <h2 className="text-2xl font-semibold">Pending Organizations</h2>
        {pendingOrgs.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <p>No pending approvals.</p>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Organization Name</TableHead>
                  <TableHead>Industry</TableHead>
                  <TableHead>Created At</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pendingOrgs.map((org) => (
                  <TableRow key={org.id}>
                    <TableCell className="font-medium">{org.name}</TableCell>
                    <TableCell>{org.industry || "N/A"}</TableCell>
                    <TableCell>{formatDate(org.created_at)}</TableCell>
                    <TableCell className="text-right">
                      <OrgApprovalActions orgId={org.id} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        )}
      </div>

      {/* Section 2: Recent Users */}
      <div className="space-y-4">
        <h2 className="text-2xl font-semibold">Recent Users</h2>
        {recentUsers.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <p>No users found.</p>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Created At</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recentUsers.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell className="font-medium">{getUserName(user)}</TableCell>
                    <TableCell>
                      <Badge variant={getRoleBadgeVariant(user.role) as any}>
                        {user.role || "N/A"}
                      </Badge>
                    </TableCell>
                    <TableCell>{user.email || "Hidden"}</TableCell>
                    <TableCell>{formatDate(user.created_at)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        )}
      </div>
    </div>
  )
}