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
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { UserActionsCell } from "./user-actions-cell"

export default async function AdminUsersPage() {
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

  // Fetch all profiles
  const { data: profiles, error } = await supabase
    .from("profiles")
    .select(`
      *,
      organization:organizations(name)
    `)
    .order("created_at", { ascending: false })

  if (error) console.error(error)

  const getInitials = (firstName: string | null, lastName: string | null) => {
    return `${firstName?.charAt(0) || ""}${lastName?.charAt(0) || ""}`.toUpperCase()
  }

  const getRoleBadgeVariant = (role: string | null) => {
    switch (role) {
      case 'admin': return 'default'
      case 'company_admin': return 'secondary'
      case 'student': return 'outline'
      default: return 'outline'
    }
  }

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-3xl font-bold">User Management</h1>
        <p className="text-muted-foreground">Manage students, company representatives, and admins.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Users ({profiles?.length || 0})</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[300px]">User</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Affiliation</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Joined</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {profiles?.map((profile) => {
                  // FIX: Cast profile to 'any' to access 'status' which isn't in your types file yet
                  const userProfile = profile as any;
                  
                  return (
                    <TableRow key={profile.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar className="h-9 w-9">
                            <AvatarImage src={profile.avatar_url || ""} />
                            <AvatarFallback>{getInitials(profile.first_name, profile.last_name)}</AvatarFallback>
                          </Avatar>
                          <div className="flex flex-col">
                            <span className="font-medium">
                              {profile.first_name} {profile.last_name}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              ID: {profile.id.slice(0, 8)}...
                            </span>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={getRoleBadgeVariant(profile.role) as any}>
                          {profile.role?.replace('_', ' ')}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {profile.role === 'student' ? (
                          <span className="text-sm">{profile.university || "N/A"}</span>
                        ) : (
                          <span className="text-sm font-medium text-primary">
                            {userProfile.organization?.name || "N/A"}
                          </span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant={userProfile.status === 'active' || !userProfile.status ? "outline" : "destructive"}>
                          {userProfile.status || 'active'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {/* FIX: Handle null date safely */}
                        {profile.created_at ? new Date(profile.created_at).toLocaleDateString() : "N/A"}
                      </TableCell>
                      <TableCell className="text-right">
                        <UserActionsCell userId={profile.id} status={userProfile.status} />
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}