import { createClient } from "@/utils/supabase/server"
import { redirect } from "next/navigation"
import { Database } from "@/types/supabase"
import Link from "next/link"
import {
  Users,
  Building2,
  Trophy,
  Clock,
  CheckCircle2,
  ArrowRight,
  FilePenLine,
} from "lucide-react"
import "@/app/(admin)/admin.css"
import { getPendingCollaborationInvites } from "@/app/(admin)/admin/collaboration-actions"
import { CollaborationInviteCard } from "./collaboration-invite-card"

type Profile = Database["public"]["Tables"]["profiles"]["Row"]
type PendingEdit = Database["public"]["Tables"]["challenge_pending_edits"]["Row"]

interface PendingEditWithChallenge extends PendingEdit {
  challenge: { title: string; id: string } | null
}

interface DashboardData {
  pendingChallenges: any[]
  pendingEdits: PendingEditWithChallenge[]
  stats: {
    totalUsers: number
    totalOrganizations: number
    totalChallenges: number
  }
  recentUsers: (Profile & { email?: string | null })[]
}

async function getAdminDashboardData(): Promise<DashboardData> {
  const supabase = await createClient()

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  if (userError || !user) redirect("/login")

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single()

  if (profileError || !profile || profile.role !== "admin") redirect("/dashboard")

  const { data: pendingChallenges, error: challengeError } = await supabase
    .from("challenges")
    .select(`*, organizations (name)`)
    .eq("status", "pending_approval")
    .order("created_at", { ascending: false })

  if (challengeError) console.error("Error fetching pending challenges:", challengeError)

  // Fetch pending challenge edits with the challenge title for display
  const { data: pendingEdits, error: editsError } = await supabase
    .from("challenge_pending_edits")
    .select(`*, challenge:challenges(id, title)`)
    .eq("status", "pending")
    .order("created_at", { ascending: false })

  if (editsError) console.error("Error fetching pending edits:", editsError)

  const { count: userCount } = await supabase
    .from("profiles")
    .select("*", { count: "exact", head: true })

  const { count: orgCount } = await supabase
    .from("organizations")
    .select("*", { count: "exact", head: true })

  const { count: challengeCount } = await supabase
    .from("challenges")
    .select("*", { count: "exact", head: true })

  const { data: recentProfiles } = await supabase
    .from("profiles")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(10)

  return {
    pendingChallenges: pendingChallenges || [],
    pendingEdits: (pendingEdits as PendingEditWithChallenge[]) || [],
    stats: {
      totalUsers: userCount || 0,
      totalOrganizations: orgCount || 0,
      totalChallenges: challengeCount || 0,
    },
    recentUsers: recentProfiles || [],
  }
}

const formatDate = (dateString: string | null) => {
  if (!dateString) return "N/A"
  return new Date(dateString).toLocaleDateString()
}

const getUserName = (user: Profile) => {
  return `${user.first_name || ""} ${user.last_name || ""}`.trim() || "Unnamed User"
}

export default async function AdminDashboardPage() {
  const [{ pendingChallenges, pendingEdits, stats, recentUsers }, pendingCollabInvites] =
    await Promise.all([
      getAdminDashboardData(),
      getPendingCollaborationInvites().catch(() => [] as any[]),
    ])

  const totalPendingActions =
    pendingChallenges.length + pendingEdits.length + pendingCollabInvites.length

  return (
    <div className="space-y-6" data-layout="admin">

      {/* Page Header */}
      <div className="admin-page-header">
        <h1 className="admin-page-title">
          Super Admin <span>Dashboard</span>
        </h1>
        <p className="admin-page-subtitle">
          Manage organizations, users, and platform settings.
        </p>
      </div>

      {/* Stats Grid */}
      <div className="admin-stats-grid">
        <div className="admin-stat-card coral">
          <div className="admin-stat-header">
            <span className="admin-stat-label">Total Users</span>
            <div className="admin-stat-icon coral">
              <Users />
            </div>
          </div>
          <div className="admin-stat-value coral">{stats.totalUsers}</div>
          <p className="admin-stat-description">Registered accounts across all roles</p>
        </div>

        <div className="admin-stat-card blue">
          <div className="admin-stat-header">
            <span className="admin-stat-label">Organizations</span>
            <div className="admin-stat-icon blue">
              <Building2 />
            </div>
          </div>
          <div className="admin-stat-value blue">{stats.totalOrganizations}</div>
          <p className="admin-stat-description">Active company accounts</p>
        </div>

        <div className="admin-stat-card green">
          <div className="admin-stat-header">
            <span className="admin-stat-label">Challenges</span>
            <div className="admin-stat-icon green">
              <Trophy />
            </div>
          </div>
          <div className="admin-stat-value">{stats.totalChallenges}</div>
          <p className="admin-stat-description">Total created challenges</p>
        </div>

        <div className="admin-stat-card yellow">
          <div className="admin-stat-header">
            <span className="admin-stat-label">Pending Review</span>
            <div className="admin-stat-icon yellow">
              <Clock />
            </div>
          </div>
          {/* Now includes pending edits in the total */}
          <div className="admin-stat-value">{totalPendingActions}</div>
          <p className="admin-stat-description">Actions requiring your attention</p>
        </div>
      </div>

      {/* Pending Challenges */}
      <div className="admin-card">
        <div className="admin-card-header">
          <div>
            <div className="admin-card-title">Pending Challenges</div>
            <div className="admin-card-subtitle">Challenges awaiting approval</div>
          </div>
          {pendingChallenges.length > 0 && (
            <span className="admin-badge coral">
              <span className="admin-badge-dot" />
              {pendingChallenges.length} pending
            </span>
          )}
        </div>

        {pendingChallenges.length === 0 ? (
          <div className="admin-empty">
            <div className="admin-empty-icon">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <div className="admin-empty-title">All caught up!</div>
            <div className="admin-empty-text">No challenges awaiting approval</div>
          </div>
        ) : (
          <div>
            {pendingChallenges.slice(0, 5).map((challenge) => (
              <div key={challenge.id} className="admin-action-card">
                <div className="admin-action-card-info">
                  <div
                    className="admin-action-card-avatar"
                    style={{ background: "var(--admin-coral-glow)", color: "var(--admin-coral)" }}
                  >
                    <Trophy className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="admin-action-card-name">
                      {challenge.title || "Untitled Challenge"}
                    </div>
                    <div className="admin-action-card-meta">
                      {challenge.organizations?.name || "Unknown company"} · {formatDate(challenge.created_at)}
                    </div>
                  </div>
                </div>
                <div className="admin-action-card-actions">
                  <Link href={`/admin/challenges/${challenge.id}`}>
                    <button className="admin-btn admin-btn-coral admin-btn-sm">
                      Review
                    </button>
                  </Link>
                </div>
              </div>
            ))}
            {pendingChallenges.length > 5 && (
              <div className="p-4 text-center">
                <Link href="/admin/challenges" className="admin-btn admin-btn-outline admin-btn-sm">
                  View all {pendingChallenges.length} pending
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Pending Challenge Edits — full width row */}
      <div className="admin-card">
        <div className="admin-card-header">
          <div>
            <div className="admin-card-title">Pending Challenge Edits</div>
            <div className="admin-card-subtitle">
              Live challenges with edits submitted by companies for review
            </div>
          </div>
          {pendingEdits.length > 0 && (
            <span className="admin-badge yellow">
              <span className="admin-badge-dot" />
              {pendingEdits.length} pending
            </span>
          )}
        </div>

        {pendingEdits.length === 0 ? (
          <div className="admin-empty">
            <div className="admin-empty-icon">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <div className="admin-empty-title">All caught up!</div>
            <div className="admin-empty-text">No challenge edits awaiting review</div>
          </div>
        ) : (
          <div>
            {pendingEdits.slice(0, 5).map((edit) => (
              <div key={edit.id} className="admin-action-card">
                <div className="admin-action-card-info">
                  <div
                    className="admin-action-card-avatar"
                    style={{ background: "var(--admin-yellow-glow, #fef9c3)", color: "#854d0e" }}
                  >
                    <FilePenLine className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="admin-action-card-name">
                      {edit.challenge?.title || "Untitled Challenge"}
                    </div>
                    <div className="admin-action-card-meta">
                      Edit submitted · {formatDate(edit.created_at)}
                    </div>
                  </div>
                </div>
                <div className="admin-action-card-actions">
                  <Link href={`/admin/challenges/${edit.challenge_id}`}>
                    <button className="admin-btn admin-btn-coral admin-btn-sm">
                      Review Edit
                    </button>
                  </Link>
                </div>
              </div>
            ))}
            {pendingEdits.length > 5 && (
              <div className="p-4 text-center">
                <Link href="/admin/challenges" className="admin-btn admin-btn-outline admin-btn-sm">
                  View all {pendingEdits.length} pending edits
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Pending Collaboration Invites */}
      <CollaborationInviteCard invites={pendingCollabInvites as any} />

      {/* Recent Users */}
      <div className="admin-card">
        <div className="admin-card-header">
          <div>
            <div className="admin-card-title">Recent Users</div>
            <div className="admin-card-subtitle">Newest registrations on the platform</div>
          </div>
          <Link href="/admin/users">
            <button className="admin-btn admin-btn-outline admin-btn-sm">
              View all <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </Link>
        </div>

        {recentUsers.length === 0 ? (
          <div className="admin-empty">
            <div className="admin-empty-icon">
              <Users className="w-6 h-6" />
            </div>
            <div className="admin-empty-title">No users found</div>
          </div>
        ) : (
          <div className="admin-table-wrapper">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>User</th>
                  <th>Role</th>
                  <th>Email</th>
                  <th>Joined</th>
                </tr>
              </thead>
              <tbody>
                {recentUsers.map((user) => {
                  const name = getUserName(user)
                  const initials = name
                    .split(" ")
                    .map((n) => n[0])
                    .join("")
                    .slice(0, 2)
                    .toUpperCase()
                  return (
                    <tr key={user.id}>
                      <td>
                        <div className="flex items-center gap-2.5">
                          <div className="admin-avatar sm">{initials}</div>
                          <span
                            className="font-medium text-sm"
                            style={{ color: "var(--admin-gray-800)" }}
                          >
                            {name}
                          </span>
                        </div>
                      </td>
                      <td>
                        <span
                          className={`admin-badge ${
                            user.role === "admin" ? "red" :
                            user.role === "company_admin" ? "blue" :
                            user.role === "company_member" ? "coral" :
                            "gray"
                          }`}
                        >
                          {user.role || "student"}
                        </span>
                      </td>
                      <td style={{ color: "var(--admin-gray-500)", fontSize: "0.8rem" }}>
                        {(user as any).email || "Hidden"}
                      </td>
                      <td style={{ color: "var(--admin-gray-500)", fontSize: "0.8rem" }}>
                        {formatDate(user.created_at)}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

    </div>
  )
}